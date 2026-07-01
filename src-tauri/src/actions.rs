#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
use crate::apple_intelligence;
use crate::audio_feedback::{play_feedback_sound, play_feedback_sound_blocking, SoundType};
use crate::audio_toolkit::{is_microphone_access_denied, is_no_input_device_error};
use crate::managers::audio::AudioRecordingManager;
use crate::managers::history::HistoryManager;
use crate::managers::transcription::TranscriptionManager;
use crate::secrets;
use crate::settings::{get_settings, AppSettings, APPLE_INTELLIGENCE_PROVIDER_ID};
use crate::shortcut;
use crate::tray::{change_tray_icon, TrayIconState};
use crate::utils::{self, show_recording_overlay};
use crate::TranscriptionCoordinator;
use ferrous_opencc::{config::BuiltinConfig, OpenCC};
use log::{debug, error, warn};
use once_cell::sync::Lazy;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tauri::Manager;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct RecordingErrorEvent {
    error_type: String,
    detail: Option<String>,
}

#[derive(Clone, serde::Serialize)]
struct PostProcessConfigErrorEvent {
    error_type: String,
    provider_label: Option<String>,
}

// #region debug-point A:floating-runtime-issues
fn __dbg_report(
    hypothesis_id: &str,
    location: &str,
    msg: &str,
    data: serde_json::Value,
) {
    let payload = json!({
        "sessionId": "floating-runtime-issues",
        "runId": "pre-fix",
        "hypothesisId": hypothesis_id,
        "location": location,
        "msg": format!("[DEBUG] {}", msg),
        "data": data,
    });

    tauri::async_runtime::spawn(async move {
        let _ = reqwest::Client::new()
            .post("http://127.0.0.1:7778/event")
            .json(&payload)
            .send()
            .await;
    });
}
// #endregion

enum PostProcessConfigError {
    NoProvider,
    NoModel { provider_label: String },
    NoPrompt,
    MissingApiKey { provider_label: String },
}

/// Drop guard that notifies the [`TranscriptionCoordinator`] when the
/// transcription pipeline finishes — whether it completes normally or panics.
struct FinishGuard(AppHandle);
impl Drop for FinishGuard {
    fn drop(&mut self) {
        if let Some(c) = self.0.try_state::<TranscriptionCoordinator>() {
            c.notify_processing_finished();
        }
    }
}

// Shortcut Action Trait
pub trait ShortcutAction: Send + Sync {
    fn start(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str);
    fn stop(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str);
}

// Transcribe Action
struct TranscribeAction {
    post_process: bool,
}

/// Field name for structured output JSON schema
const TRANSCRIPTION_FIELD: &str = "transcription";

/// Strip invisible Unicode characters that some LLMs may insert
fn strip_invisible_chars(s: &str) -> String {
    s.replace(['\u{200B}', '\u{200C}', '\u{200D}', '\u{FEFF}'], "")
}

/// Build a system prompt from the user's prompt template.
/// Removes `${output}` placeholder since the transcription is sent as the user message.
fn build_system_prompt(prompt_template: &str) -> String {
    prompt_template.replace("${output}", "").trim().to_string()
}

fn build_post_process_input(transcription: &str, selected_text: Option<&str>) -> String {
    match selected_text.map(str::trim).filter(|text| !text.is_empty()) {
        Some(selected_text) => format!(
            "选中文本：\n{}\n\n语音指令或新增内容：\n{}",
            selected_text, transcription
        ),
        None => transcription.to_string(),
    }
}

fn selected_post_process_prompt(settings: &AppSettings) -> Option<String> {
    let selected_prompt_id = settings.post_process_selected_prompt_id.as_ref()?;
    let prompt = settings
        .post_process_prompts
        .iter()
        .find(|prompt| &prompt.id == selected_prompt_id)?;

    if prompt.prompt.trim().is_empty() {
        return None;
    }

    Some(prompt.prompt.clone())
}

async fn validate_post_process_config(
    _app: &AppHandle,
    settings: &AppSettings,
) -> Result<(), PostProcessConfigError> {
    let provider = settings
        .active_post_process_provider()
        .ok_or(PostProcessConfigError::NoProvider)?;

    let model = settings
        .post_process_models
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();
    if model.trim().is_empty() {
        return Err(PostProcessConfigError::NoModel {
            provider_label: provider.label.clone(),
        });
    }

    let selected_prompt_id = settings
        .post_process_selected_prompt_id
        .as_ref()
        .ok_or(PostProcessConfigError::NoPrompt)?;
    let prompt = settings
        .post_process_prompts
        .iter()
        .find(|prompt| &prompt.id == selected_prompt_id)
        .ok_or(PostProcessConfigError::NoPrompt)?;
    if prompt.prompt.trim().is_empty() {
        return Err(PostProcessConfigError::NoPrompt);
    }

    let provider_requires_api_key =
        provider.id != "custom" && provider.id != APPLE_INTELLIGENCE_PROVIDER_ID;
    let api_key = secrets::read_post_process_api_key(&provider.id, Some(&settings.post_process_api_keys))
        .map_err(|_| PostProcessConfigError::MissingApiKey {
            provider_label: provider.label.clone(),
        })?;
    if provider_requires_api_key && api_key.trim().is_empty() {
        return Err(PostProcessConfigError::MissingApiKey {
            provider_label: provider.label.clone(),
        });
    }

    Ok(())
}

fn emit_post_process_config_error(app: &AppHandle, error: PostProcessConfigError) {
    let payload = match error {
        PostProcessConfigError::NoProvider => PostProcessConfigErrorEvent {
            error_type: "no_provider".to_string(),
            provider_label: None,
        },
        PostProcessConfigError::NoModel { provider_label } => PostProcessConfigErrorEvent {
            error_type: "no_model".to_string(),
            provider_label: Some(provider_label),
        },
        PostProcessConfigError::NoPrompt => PostProcessConfigErrorEvent {
            error_type: "no_prompt".to_string(),
            provider_label: None,
        },
        PostProcessConfigError::MissingApiKey { provider_label } => PostProcessConfigErrorEvent {
            error_type: "missing_api_key".to_string(),
            provider_label: Some(provider_label),
        },
    };

    let _ = app.emit("post-process-config-error", payload);
}

async fn post_process_transcription(
    app: &AppHandle,
    settings: &AppSettings,
    transcription: &str,
    selected_text: Option<&str>,
) -> Option<String> {
    let Some(prompt) = selected_post_process_prompt(settings) else {
        debug!("Post-processing skipped because the selected prompt is empty");
        return None;
    };

    post_process_transcription_with_prompt(app, settings, &prompt, transcription, selected_text).await
}

pub(crate) async fn run_floating_follow_up_prompt(
    app: &AppHandle,
    source_text: &str,
    instruction: &str,
    has_selection_context: bool,
) -> Result<String, String> {
    if source_text.trim().is_empty() {
        return Err("NO_FLOATING_RESULT".to_string());
    }

    if instruction.trim().is_empty() {
        return Err("EMPTY_INSTRUCTION".to_string());
    }

    let settings = get_settings(app);
    if let Err(config_error) = validate_post_process_config(app, &settings).await {
        emit_post_process_config_error(app, config_error);
        return Err("POST_PROCESS_CONFIG_INVALID".to_string());
    }

    let assistant_prompt = r#"你是 Echo 的中文文本助理。用户会提供一段“当前内容”，并给出新的编辑、追问或改写要求。

请遵守以下规则：
1. 优先根据“新的编辑、追问或改写要求”处理“当前内容”；
2. 如果当前内容是用户原先选中的一段文本，就优先输出适合替换该段文本的最终版本；
3. 如果当前内容是 Echo 刚生成的识别或改写结果，也要把它视为可继续编辑的当前内容，而不是要求用户再次提供选中文本；
4. 如果用户要求润色、压缩、改写、整理，请直接输出处理后的最终文本；
5. 如果用户是在基于当前内容提问，请直接给出简洁、准确、有帮助的中文回答；
6. 不要解释你的思路，不要输出分析过程，不要添加多余前缀；
7. 用户已经提供了完整的当前内容和新的要求，严禁回复“请提供当前内容”“请提供编辑要求”之类的索取信息话术；
8. 除非指令明确要求，否则保持中文输出。"#;

    let user_content_preview = if has_selection_context {
        format!(
            "当前选中文本：\n{}\n\n新的编辑、追问或改写要求：\n{}",
            source_text.trim(),
            instruction.trim()
        )
    } else {
        format!(
            "当前内容：\n{}\n\n新的编辑、追问或改写要求：\n{}",
            source_text.trim(),
            instruction.trim()
        )
    };
    // #region debug-point C:floating-followup-prompt-input
    __dbg_report(
        "C",
        "src-tauri/src/actions.rs:run_floating_follow_up_prompt",
        "Built floating follow-up input",
        json!({
            "sourceTextLength": source_text.trim().len(),
            "sourceTextPreview": source_text.chars().take(120).collect::<String>(),
            "instruction": instruction.trim(),
            "instructionLength": instruction.trim().len(),
            "hasSelectionContext": has_selection_context,
            "floatingInputPreview": user_content_preview.chars().take(220).collect::<String>(),
        }),
    );
    // #endregion

    let result =
        post_process_transcription_with_prompt(
            app,
            &settings,
            assistant_prompt,
            &user_content_preview,
            None,
        )
            .await
            .filter(|value| !value.trim().is_empty())
            .ok_or_else(|| "FOLLOW_UP_FAILED".to_string())?;

    // #region debug-point C:floating-followup-prompt-result
    __dbg_report(
        "C",
        "src-tauri/src/actions.rs:run_floating_follow_up_prompt:result",
        "Floating follow-up prompt produced result",
        json!({
            "resultLength": result.trim().len(),
            "resultPreview": result.chars().take(120).collect::<String>(),
        }),
    );
    // #endregion

    Ok(result)
}

async fn post_process_transcription_with_prompt(
    _app: &AppHandle,
    settings: &AppSettings,
    prompt: &str,
    transcription: &str,
    selected_text: Option<&str>,
) -> Option<String> {
    let provider = match settings.active_post_process_provider().cloned() {
        Some(provider) => provider,
        None => {
            debug!("Post-processing enabled but no provider is selected");
            return None;
        }
    };

    let model = settings
        .post_process_models
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();

    if model.trim().is_empty() {
        debug!(
            "Post-processing skipped because provider '{}' has no model configured",
            provider.id
        );
        return None;
    }

    if prompt.trim().is_empty() {
        debug!("Post-processing skipped because the prompt is empty");
        return None;
    }

    debug!(
        "Starting LLM post-processing with provider '{}' (model: {})",
        provider.id, model
    );

    let api_key = match secrets::read_post_process_api_key(&provider.id, Some(&settings.post_process_api_keys)) {
        Ok(value) => value,
        Err(error) => {
            warn!(
                "Post-processing skipped because API key for provider '{}' could not be loaded: {}",
                provider.id, error
            );
            String::new()
        }
    };

    // Disable reasoning for providers where post-processing rarely benefits from it.
    // - custom: top-level reasoning_effort (works for local OpenAI-compat servers)
    // - openrouter: nested reasoning object; exclude:true also keeps reasoning text
    //   out of the response so it can't pollute structured-output JSON parsing
    let (reasoning_effort, reasoning) = match provider.id.as_str() {
        "custom" => (Some("none".to_string()), None),
        "openrouter" => (
            None,
            Some(crate::llm_client::ReasoningConfig {
                effort: Some("none".to_string()),
                exclude: Some(true),
            }),
        ),
        _ => (None, None),
    };

    if provider.supports_structured_output {
        debug!("Using structured outputs for provider '{}'", provider.id);

        let system_prompt = build_system_prompt(prompt);
        let user_content = build_post_process_input(transcription, selected_text);

        // Handle Apple Intelligence separately since it uses native Swift APIs
        if provider.id == APPLE_INTELLIGENCE_PROVIDER_ID {
            #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
            {
                if !apple_intelligence::check_apple_intelligence_availability() {
                    debug!(
                        "Apple Intelligence selected but not currently available on this device"
                    );
                    return None;
                }

                let token_limit = model.trim().parse::<i32>().unwrap_or(0);
                return match apple_intelligence::process_text_with_system_prompt(
                    &system_prompt,
                    &user_content,
                    token_limit,
                ) {
                    Ok(result) => {
                        if result.trim().is_empty() {
                            debug!("Apple Intelligence returned an empty response");
                            None
                        } else {
                            let result = strip_invisible_chars(&result);
                            debug!(
                                "Apple Intelligence post-processing succeeded. Output length: {} chars",
                                result.len()
                            );
                            Some(result)
                        }
                    }
                    Err(err) => {
                        error!("Apple Intelligence post-processing failed: {}", err);
                        None
                    }
                };
            }

            #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
            {
                debug!("Apple Intelligence provider selected on unsupported platform");
                return None;
            }
        }

        let json_schema = serde_json::json!({
            "type": "object",
            "properties": {
                (TRANSCRIPTION_FIELD): {
                    "type": "string",
                    "description": "The cleaned and processed transcription text"
                }
            },
            "required": [TRANSCRIPTION_FIELD],
            "additionalProperties": false
        });

        match crate::llm_client::send_chat_completion_with_schema(
            &provider,
            api_key.clone(),
            &model,
            user_content,
            Some(system_prompt),
            Some(json_schema),
            reasoning_effort.clone(),
            reasoning.clone(),
        )
        .await
        {
            Ok(Some(content)) => {
                match serde_json::from_str::<serde_json::Value>(&content) {
                    Ok(json) => {
                        if let Some(transcription_value) =
                            json.get(TRANSCRIPTION_FIELD).and_then(|t| t.as_str())
                        {
                            let result = strip_invisible_chars(transcription_value);
                            debug!(
                                "Structured output post-processing succeeded for provider '{}'. Output length: {} chars",
                                provider.id,
                                result.len()
                            );
                            return Some(result);
                        } else {
                            error!("Structured output response missing 'transcription' field");
                            return Some(strip_invisible_chars(&content));
                        }
                    }
                    Err(e) => {
                        error!(
                            "Failed to parse structured output JSON: {}. Returning raw content.",
                            e
                        );
                        return Some(strip_invisible_chars(&content));
                    }
                }
            }
            Ok(None) => {
                error!("LLM API response has no content");
                return None;
            }
            Err(e) => {
                warn!(
                    "Structured output failed for provider '{}': {}. Falling back to legacy mode.",
                    provider.id, e
                );
            }
        }
    }

    let user_content = build_post_process_input(transcription, selected_text);
    let processed_prompt = if prompt.contains("${output}") {
        prompt.replace("${output}", &user_content)
    } else {
        format!("{}\n\n{}", prompt, user_content)
    };
    debug!("Processed prompt length: {} chars", processed_prompt.len());

    match crate::llm_client::send_chat_completion(
        &provider,
        api_key,
        &model,
        processed_prompt,
        reasoning_effort,
        reasoning,
    )
    .await
    {
        Ok(Some(content)) => {
            let content = strip_invisible_chars(&content);
            debug!(
                "LLM post-processing succeeded for provider '{}'. Output length: {} chars",
                provider.id,
                content.len()
            );
            Some(content)
        }
        Ok(None) => {
            error!("LLM API response has no content");
            None
        }
        Err(e) => {
            error!(
                "LLM post-processing failed for provider '{}': {}. Falling back to original transcription.",
                provider.id,
                e
            );
            None
        }
    }
}

async fn maybe_convert_chinese_variant(
    settings: &AppSettings,
    transcription: &str,
) -> Option<String> {
    // Check if language is set to Simplified or Traditional Chinese
    let is_simplified = settings.selected_language == "zh-Hans";
    let is_traditional = settings.selected_language == "zh-Hant";

    if !is_simplified && !is_traditional {
        debug!("selected_language is not Simplified or Traditional Chinese; skipping translation");
        return None;
    }

    debug!(
        "Starting Chinese translation using OpenCC for language: {}",
        settings.selected_language
    );

    // Use OpenCC to convert based on selected language
    let config = if is_simplified {
        // Convert Traditional Chinese to Simplified Chinese
        BuiltinConfig::Tw2sp
    } else {
        // Convert Simplified Chinese to Traditional Chinese
        BuiltinConfig::S2tw
    };

    match OpenCC::from_config(config) {
        Ok(converter) => {
            let converted = converter.convert(transcription);
            debug!(
                "OpenCC translation completed. Input length: {}, Output length: {}",
                transcription.len(),
                converted.len()
            );
            Some(converted)
        }
        Err(e) => {
            error!("Failed to initialize OpenCC converter: {}. Falling back to original transcription.", e);
            None
        }
    }
}

pub(crate) struct ProcessedTranscription {
    pub final_text: String,
    pub post_processed_text: Option<String>,
    pub post_process_prompt: Option<String>,
    pub has_selection_context: bool,
}

pub(crate) async fn process_transcription_output(
    app: &AppHandle,
    transcription: &str,
    post_process: bool,
) -> ProcessedTranscription {
    let settings = get_settings(app);
    let mut final_text = transcription.to_string();
    let mut post_processed_text: Option<String> = None;
    let mut post_process_prompt: Option<String> = None;
    let selected_text = if post_process && settings.post_process_include_selected_text {
        utils::get_selected_text(app)
    } else {
        None
    };
    let has_selection_context = selected_text
        .as_ref()
        .map(|text| !text.trim().is_empty())
        .unwrap_or(false);

    if let Some(converted_text) = maybe_convert_chinese_variant(&settings, transcription).await {
        final_text = converted_text;
    }

    if post_process {
        match validate_post_process_config(app, &settings).await {
            Ok(()) => {
                if let Some(processed_text) =
                    post_process_transcription(app, &settings, &final_text, selected_text.as_deref())
                        .await
                {
                    post_processed_text = Some(processed_text.clone());
                    final_text = processed_text;

                    if let Some(prompt_id) = &settings.post_process_selected_prompt_id {
                        if let Some(prompt) = settings
                            .post_process_prompts
                            .iter()
                            .find(|prompt| &prompt.id == prompt_id)
                        {
                            post_process_prompt = Some(prompt.prompt.clone());
                        }
                    }
                }
            }
            Err(config_error) => {
                emit_post_process_config_error(app, config_error);
                final_text.clear();
            }
        }
    } else if final_text != transcription {
        post_processed_text = Some(final_text.clone());
    }

    ProcessedTranscription {
        final_text,
        post_processed_text,
        post_process_prompt,
        has_selection_context,
    }
}

impl ShortcutAction for TranscribeAction {
    fn start(&self, app: &AppHandle, binding_id: &str, _shortcut_str: &str) {
        let start_time = Instant::now();
        debug!("TranscribeAction::start called for binding: {}", binding_id);

        // Load model in the background
        let tm = app.state::<Arc<TranscriptionManager>>();
        let rm = app.state::<Arc<AudioRecordingManager>>();

        // Load ASR model and VAD model in parallel
        tm.initiate_model_load();
        let rm_clone = Arc::clone(&rm);
        std::thread::spawn(move || {
            if let Err(e) = rm_clone.preload_vad() {
                debug!("VAD pre-load failed: {}", e);
            }
        });

        let binding_id = binding_id.to_string();
        change_tray_icon(app, TrayIconState::Recording);
        show_recording_overlay(app);
        utils::hide_floating_window(app);

        // Get the microphone mode to determine audio feedback timing
        let settings = get_settings(app);
        let is_always_on = settings.always_on_microphone;
        debug!("Microphone mode - always_on: {}", is_always_on);

        let mut recording_error: Option<String> = None;
        if is_always_on {
            // Always-on mode: Play audio feedback immediately, then apply mute after sound finishes
            debug!("Always-on mode: Playing audio feedback immediately");
            let rm_clone = Arc::clone(&rm);
            let app_clone = app.clone();
            // The blocking helper exits immediately if audio feedback is disabled,
            // so we can always reuse this thread to ensure mute happens right after playback.
            std::thread::spawn(move || {
                play_feedback_sound_blocking(&app_clone, SoundType::Start);
                rm_clone.apply_mute();
            });

            if let Err(e) = rm.try_start_recording(&binding_id) {
                debug!("Recording failed: {}", e);
                recording_error = Some(e);
            }
        } else {
            // On-demand mode: Start recording first, then play audio feedback, then apply mute
            // This allows the microphone to be activated before playing the sound
            debug!("On-demand mode: Starting recording first, then audio feedback");
            let recording_start_time = Instant::now();
            match rm.try_start_recording(&binding_id) {
                Ok(()) => {
                    debug!("Recording started in {:?}", recording_start_time.elapsed());
                    // Small delay to ensure microphone stream is active
                    let app_clone = app.clone();
                    let rm_clone = Arc::clone(&rm);
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                        debug!("Handling delayed audio feedback/mute sequence");
                        // Helper handles disabled audio feedback by returning early, so we reuse it
                        // to keep mute sequencing consistent in every mode.
                        play_feedback_sound_blocking(&app_clone, SoundType::Start);
                        rm_clone.apply_mute();
                    });
                }
                Err(e) => {
                    debug!("Failed to start recording: {}", e);
                    recording_error = Some(e);
                }
            }
        }

        if recording_error.is_none() {
            // Dynamically register the cancel shortcut in a separate task to avoid deadlock
            shortcut::register_cancel_shortcut(app);
        } else {
            // Starting failed (for example due to blocked microphone permissions).
            // Revert UI state so we don't stay stuck in the recording overlay.
            utils::hide_recording_overlay(app);
            change_tray_icon(app, TrayIconState::Idle);
            if let Some(err) = recording_error {
                let error_type = if is_microphone_access_denied(&err) {
                    "microphone_permission_denied"
                } else if is_no_input_device_error(&err) {
                    "no_input_device"
                } else {
                    "unknown"
                };
                let _ = app.emit(
                    "recording-error",
                    RecordingErrorEvent {
                        error_type: error_type.to_string(),
                        detail: Some(err),
                    },
                );
            }
        }

        debug!(
            "TranscribeAction::start completed in {:?}",
            start_time.elapsed()
        );
    }

    fn stop(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str) {
        // Unregister the cancel shortcut when transcription stops
        shortcut::unregister_cancel_shortcut(app);

        let stop_time = Instant::now();
        debug!("TranscribeAction::stop called for binding: {}", binding_id);

        let ah = app.clone();
        let rm = Arc::clone(&app.state::<Arc<AudioRecordingManager>>());
        let tm = Arc::clone(&app.state::<Arc<TranscriptionManager>>());
        let hm = Arc::clone(&app.state::<Arc<HistoryManager>>());

        change_tray_icon(app, TrayIconState::Transcribing);
        utils::hide_recording_overlay(app);

        // Unmute before playing audio feedback so the stop sound is audible
        rm.remove_mute();

        // Play audio feedback for recording stop
        play_feedback_sound(app, SoundType::Stop);

        let binding_id = binding_id.to_string(); // Clone binding_id for the async task
        let post_process = self.post_process;
        let shortcut_uses_alt = shortcut_str.to_ascii_lowercase().contains("alt");

        tauri::async_runtime::spawn(async move {
            let _guard = FinishGuard(ah.clone());
            debug!(
                "Starting async transcription task for binding: {}",
                binding_id
            );

            let stop_recording_time = Instant::now();
            if let Some(samples) = rm.stop_recording(&binding_id) {
                debug!(
                    "Recording stopped and samples retrieved in {:?}, sample count: {}",
                    stop_recording_time.elapsed(),
                    samples.len()
                );

                if samples.is_empty() {
                    debug!("Recording produced no audio samples; skipping persistence");
                    utils::hide_recording_overlay(&ah);
                    change_tray_icon(&ah, TrayIconState::Idle);
                } else {
                    // Save WAV concurrently with transcription
                    let sample_count = samples.len();
                    let file_name = format!("echo-{}.wav", chrono::Utc::now().timestamp());
                    let wav_path = hm.recordings_dir().join(&file_name);
                    let wav_path_for_verify = wav_path.clone();
                    let samples_for_wav = samples.clone();
                    let wav_handle = tauri::async_runtime::spawn_blocking(move || {
                        crate::audio_toolkit::save_wav_file(&wav_path, &samples_for_wav)
                    });

                    // Transcribe concurrently with WAV save
                    let transcription_time = Instant::now();
                    let transcription_result = tm.transcribe(samples);

                    // Await WAV save and verify
                    let wav_saved = match wav_handle.await {
                        Ok(Ok(())) => {
                            match crate::audio_toolkit::verify_wav_file(
                                &wav_path_for_verify,
                                sample_count,
                            ) {
                                Ok(()) => true,
                                Err(e) => {
                                    error!("WAV verification failed: {}", e);
                                    false
                                }
                            }
                        }
                        Ok(Err(e)) => {
                            error!("Failed to save WAV file: {}", e);
                            false
                        }
                        Err(e) => {
                            error!("WAV save task panicked: {}", e);
                            false
                        }
                    };

                    match transcription_result {
                        Ok(transcription) => {
                            debug!(
                                "Transcription completed in {:?}: '{}'",
                                transcription_time.elapsed(),
                                transcription
                            );

                            // 方案 A: For post-processing mode, immediately show the
                            // floating window with the raw transcription so the user
                            // gets instant feedback. The LLM result will replace it.
                            // We pass has_selection_context=false to avoid a Ctrl+C call
                            // here (which would conflict with clipboard operations in
                            // process_transcription_output below).
                            if post_process {
                                let _ = crate::utils::show_floating_processing(
                                    &ah,
                                    &transcription,
                                    false,
                                );
                            }

                            let processed =
                                process_transcription_output(&ah, &transcription, post_process)
                                    .await;

                            // Save to history if WAV was saved
                            if wav_saved {
                                if let Err(err) = hm.save_entry(
                                    file_name,
                                    transcription,
                                    post_process,
                                    processed.post_processed_text.clone(),
                                    processed.post_process_prompt.clone(),
                                ) {
                                    error!("Failed to save history entry: {}", err);
                                }
                            }

                            if processed.final_text.is_empty() {
                                utils::hide_recording_overlay(&ah);
                                change_tray_icon(&ah, TrayIconState::Idle);
                            } else {
                                let ah_clone = ah.clone();
                                let final_text = processed.final_text;
                                let has_selection_context = processed.has_selection_context;
                                ah.run_on_main_thread(move || {
                                    if post_process {
                                        let has_focus = utils::has_editable_focus(&ah_clone);
                                        // #region debug-point A:post-process-output-branch
                                        __dbg_report(
                                            "A",
                                            "src-tauri/src/actions.rs:post_process_output",
                                            "Post-process output deciding between paste and floating window",
                                            json!({
                                                "hasFocus": has_focus,
                                                "finalTextLength": final_text.len(),
                                                "finalTextPreview": final_text.chars().take(120).collect::<String>(),
                                                "hasSelectionContext": has_selection_context,
                                            }),
                                        );
                                        // #endregion

                                        if has_focus {
                                            let paste_time = Instant::now();
                                            if shortcut_uses_alt {
                                                let _ = utils::dismiss_windows_alt_menu(&ah_clone);
                                            }
                                            match utils::paste(final_text.clone(), ah_clone.clone()) {
                                                Ok(()) => {
                                                    // Update the floating window (which is showing the
                                                    // raw transcription in processing state) with the
                                                    // final AI-optimized result.
                                                    let _ = utils::update_floating_result(
                                                        &ah_clone,
                                                        &final_text,
                                                        has_selection_context,
                                                    );
                                                    // #region debug-point A:post-process-paste-ok
                                                    __dbg_report(
                                                        "A",
                                                        "src-tauri/src/actions.rs:post_process_output:paste_ok",
                                                        "Post-process output pasted successfully",
                                                        json!({
                                                            "elapsedMs": paste_time.elapsed().as_millis(),
                                                        }),
                                                    );
                                                    // #endregion
                                                    debug!(
                                                        "AI result pasted successfully in {:?}",
                                                        paste_time.elapsed()
                                                    )
                                                }
                                                Err(e) => {
                                                    // #region debug-point A:post-process-paste-error
                                                    __dbg_report(
                                                        "A",
                                                        "src-tauri/src/actions.rs:post_process_output:paste_error",
                                                        "Post-process paste failed and will fall back to floating window",
                                                        json!({
                                                            "error": e,
                                                        }),
                                                    );
                                                    // #endregion
                                                    warn!(
                                                        "Failed to paste AI result, falling back to floating window: {}",
                                                        e
                                                    );
                                                    let _ = utils::show_floating_result(
                                                        &ah_clone,
                                                        &final_text,
                                                        has_selection_context,
                                                    );
                                                }
                                            }
                                        } else {
                                            // #region debug-point A:post-process-show-floating
                                            __dbg_report(
                                                "A",
                                                "src-tauri/src/actions.rs:post_process_output:show_floating",
                                                "Editable focus not detected; showing floating window",
                                                json!({
                                                    "finalTextLength": final_text.len(),
                                                    "hasSelectionContext": has_selection_context,
                                                }),
                                            );
                                            // #endregion
                                            let _ = utils::show_floating_result(
                                                &ah_clone,
                                                &final_text,
                                                has_selection_context,
                                            );
                                        }
                                        utils::hide_recording_overlay(&ah_clone);
                                        change_tray_icon(&ah_clone, TrayIconState::Idle);
                                    } else {
                                        // Normal dictation mode: paste directly
                                        let paste_time = Instant::now();
                                        if shortcut_uses_alt {
                                            let _ = utils::dismiss_windows_alt_menu(&ah_clone);
                                        }
                                        // #region debug-point A:normal-dictation-paste-attempt
                                        __dbg_report(
                                            "A",
                                            "src-tauri/src/actions.rs:normal_dictation_output",
                                            "Normal dictation attempting paste",
                                            json!({
                                                "finalTextLength": final_text.len(),
                                                "finalTextPreview": final_text.chars().take(120).collect::<String>(),
                                            }),
                                        );
                                        // #endregion
                                        match utils::paste(final_text, ah_clone.clone()) {
                                            Ok(()) => {
                                                // #region debug-point A:normal-dictation-paste-ok
                                                __dbg_report(
                                                    "A",
                                                    "src-tauri/src/actions.rs:normal_dictation_output:paste_ok",
                                                    "Normal dictation paste succeeded",
                                                    json!({
                                                        "elapsedMs": paste_time.elapsed().as_millis(),
                                                    }),
                                                );
                                                // #endregion
                                                debug!(
                                                    "Text pasted successfully in {:?}",
                                                    paste_time.elapsed()
                                                )
                                            }
                                            Err(e) => {
                                                // #region debug-point A:normal-dictation-paste-error
                                                __dbg_report(
                                                    "A",
                                                    "src-tauri/src/actions.rs:normal_dictation_output:paste_error",
                                                    "Normal dictation paste failed",
                                                    json!({
                                                        "error": e,
                                                    }),
                                                );
                                                // #endregion
                                                error!("Failed to paste transcription: {}", e);
                                                let _ = ah_clone.emit("paste-error", ());
                                            }
                                        }
                                        utils::hide_recording_overlay(&ah_clone);
                                        change_tray_icon(&ah_clone, TrayIconState::Idle);
                                    }
                                })
                                .unwrap_or_else(|e| {
                                    error!("Failed to run paste on main thread: {:?}", e);
                                    utils::hide_recording_overlay(&ah);
                                    change_tray_icon(&ah, TrayIconState::Idle);
                                });
                            }
                        }
                        Err(err) => {
                            debug!("Global Shortcut Transcription error: {}", err);
                            // Save entry with empty text so user can retry
                            if wav_saved {
                                if let Err(save_err) = hm.save_entry(
                                    file_name,
                                    String::new(),
                                    post_process,
                                    None,
                                    None,
                                ) {
                                    error!("Failed to save failed history entry: {}", save_err);
                                }
                            }
                            utils::hide_recording_overlay(&ah);
                            change_tray_icon(&ah, TrayIconState::Idle);
                        }
                    }
                }
            } else {
                debug!("No samples retrieved from recording stop");
                utils::hide_recording_overlay(&ah);
                change_tray_icon(&ah, TrayIconState::Idle);
            }
        });

        debug!(
            "TranscribeAction::stop completed in {:?}",
            stop_time.elapsed()
        );
    }
}

// Cancel Action
struct CancelAction;

impl ShortcutAction for CancelAction {
    fn start(&self, app: &AppHandle, _binding_id: &str, _shortcut_str: &str) {
        utils::cancel_current_operation(app);
    }

    fn stop(&self, _app: &AppHandle, _binding_id: &str, _shortcut_str: &str) {
        // Nothing to do on stop for cancel
    }
}

// Test Action
struct TestAction;

impl ShortcutAction for TestAction {
    fn start(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str) {
        log::info!(
            "Shortcut ID '{}': Started - {} (App: {})", // Changed "Pressed" to "Started" for consistency
            binding_id,
            shortcut_str,
            app.package_info().name
        );
    }

    fn stop(&self, app: &AppHandle, binding_id: &str, shortcut_str: &str) {
        log::info!(
            "Shortcut ID '{}': Stopped - {} (App: {})", // Changed "Released" to "Stopped" for consistency
            binding_id,
            shortcut_str,
            app.package_info().name
        );
    }
}

// Static Action Map
pub static ACTION_MAP: Lazy<HashMap<String, Arc<dyn ShortcutAction>>> = Lazy::new(|| {
    let mut map = HashMap::new();
    map.insert(
        "transcribe".to_string(),
        Arc::new(TranscribeAction {
            post_process: false,
        }) as Arc<dyn ShortcutAction>,
    );
    map.insert(
        "transcribe_with_post_process".to_string(),
        Arc::new(TranscribeAction { post_process: true }) as Arc<dyn ShortcutAction>,
    );
    map.insert(
        "cancel".to_string(),
        Arc::new(CancelAction) as Arc<dyn ShortcutAction>,
    );
    map.insert(
        "test".to_string(),
        Arc::new(TestAction) as Arc<dyn ShortcutAction>,
    );
    map
});
