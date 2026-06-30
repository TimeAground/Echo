pub mod audio;
pub mod history;
pub mod models;
pub mod transcription;

use std::collections::HashMap;

use crate::settings::{get_settings, write_settings, AppSettings, LogLevel};
use crate::utils::cancel_current_operation;
use crate::{managers::audio::AudioRecordingManager, managers::transcription::TranscriptionManager};
use serde_json::json;
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

// #region debug-point C:floating-runtime-issues
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

#[tauri::command]
#[specta::specta]
pub fn cancel_operation(app: AppHandle) {
    cancel_current_operation(&app);
}

#[tauri::command]
#[specta::specta]
pub fn get_floating_result() -> Option<String> {
    crate::utils::get_floating_result()
}

#[tauri::command]
#[specta::specta]
pub fn get_floating_selection_context() -> bool {
    crate::utils::floating_result_has_selection_context()
}

#[tauri::command]
#[specta::specta]
pub fn close_floating_window(app: AppHandle) {
    crate::utils::hide_floating_window(&app);
}

#[tauri::command]
#[specta::specta]
pub fn apply_floating_result(app: AppHandle) -> Result<(), String> {
    let text = crate::utils::get_floating_result()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "No floating result available".to_string())?;

    crate::utils::hide_floating_window(&app);
    std::thread::sleep(std::time::Duration::from_millis(60));
    crate::utils::paste(text, app)
}

#[tauri::command]
#[specta::specta]
pub fn floating_window_ready(app: AppHandle) -> Result<(), String> {
    crate::utils::floating_window_ready(&app)
}

#[tauri::command]
#[specta::specta]
pub async fn run_floating_follow_up(app: AppHandle, instruction: String) -> Result<String, String> {
    let source_text = crate::utils::get_floating_result()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "NO_FLOATING_RESULT".to_string())?;

    let has_selection_context = crate::utils::floating_result_has_selection_context();
    // #region debug-point C:run-floating-followup-enter
    __dbg_report(
        "C",
        "src-tauri/src/commands/mod.rs:run_floating_follow_up:enter",
        "Running floating follow-up command",
        json!({
            "instruction": instruction.trim(),
            "instructionLength": instruction.trim().len(),
            "sourceTextLength": source_text.trim().len(),
            "sourceTextPreview": source_text.chars().take(120).collect::<String>(),
            "hasSelectionContext": has_selection_context,
        }),
    );
    // #endregion
    let result =
        crate::actions::run_floating_follow_up_prompt(
            &app,
            &source_text,
            &instruction,
            has_selection_context,
        )
        .await?;

    // #region debug-point C:run-floating-followup-ok
    __dbg_report(
        "C",
        "src-tauri/src/commands/mod.rs:run_floating_follow_up:ok",
        "Floating follow-up command returned result",
        json!({
            "resultLength": result.trim().len(),
            "resultPreview": result.chars().take(120).collect::<String>(),
            "hasSelectionContext": has_selection_context,
        }),
    );
    // #endregion
    crate::utils::set_floating_result(&result, has_selection_context);
    Ok(result)
}

const FLOATING_VOICE_BINDING_ID: &str = "floating_voice";

#[tauri::command]
#[specta::specta]
pub fn start_floating_voice_recording(app: AppHandle) -> Result<(), String> {
    let audio_manager = app.state::<Arc<AudioRecordingManager>>();
    audio_manager.try_start_recording(FLOATING_VOICE_BINDING_ID)
}

#[tauri::command]
#[specta::specta]
pub fn stop_floating_voice_recording(app: AppHandle) -> Result<String, String> {
    let audio_manager = app.state::<Arc<AudioRecordingManager>>();
    let samples = audio_manager
        .stop_recording(FLOATING_VOICE_BINDING_ID)
        .ok_or_else(|| "NOT_RECORDING".to_string())?;

    let transcription_manager = app.state::<Arc<TranscriptionManager>>();
    transcription_manager
        .transcribe(samples)
        .map_err(|e| format!("{e}"))
}

#[tauri::command]
#[specta::specta]
pub fn cancel_floating_voice_recording(app: AppHandle) {
    let audio_manager = app.state::<Arc<AudioRecordingManager>>();
    let _ = audio_manager.stop_recording(FLOATING_VOICE_BINDING_ID);
}

#[tauri::command]
#[specta::specta]
pub fn is_portable() -> bool {
    crate::portable::is_portable()
}

#[tauri::command]
#[specta::specta]
pub fn get_app_dir_path(app: AppHandle) -> Result<String, String> {
    let app_data_dir = crate::portable::app_data_dir(&app)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    Ok(app_data_dir.to_string_lossy().to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    Ok(get_settings(&app))
}

#[tauri::command]
#[specta::specta]
pub fn get_post_process_api_key_statuses(app: AppHandle) -> Result<HashMap<String, bool>, String> {
    let settings = get_settings(&app);
    let mut statuses = HashMap::new();

    for provider in &settings.post_process_providers {
        let has_api_key = crate::secrets::has_post_process_api_key(
            &provider.id,
            Some(&settings.post_process_api_keys),
        )?;
        statuses.insert(provider.id.clone(), has_api_key);
    }

    Ok(statuses)
}

#[tauri::command]
#[specta::specta]
pub fn get_default_settings() -> Result<AppSettings, String> {
    Ok(crate::settings::get_default_settings())
}

#[tauri::command]
#[specta::specta]
pub fn get_log_dir_path(app: AppHandle) -> Result<String, String> {
    let log_dir = crate::portable::app_log_dir(&app)
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    Ok(log_dir.to_string_lossy().to_string())
}

#[specta::specta]
#[tauri::command]
pub fn set_log_level(app: AppHandle, level: LogLevel) -> Result<(), String> {
    let tauri_log_level: tauri_plugin_log::LogLevel = level.into();
    let log_level: log::Level = tauri_log_level.into();
    // Update the file log level atomic so the filter picks up the new level
    crate::FILE_LOG_LEVEL.store(
        log_level.to_level_filter() as u8,
        std::sync::atomic::Ordering::Relaxed,
    );

    let mut settings = get_settings(&app);
    settings.log_level = level;
    write_settings(&app, settings);

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_recordings_folder(app: AppHandle) -> Result<(), String> {
    let app_data_dir = crate::portable::app_data_dir(&app)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let recordings_dir = app_data_dir.join("recordings");

    let path = recordings_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open recordings folder: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_log_dir(app: AppHandle) -> Result<(), String> {
    let log_dir = crate::portable::app_log_dir(&app)
        .map_err(|e| format!("Failed to get log directory: {}", e))?;

    let path = log_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open log directory: {}", e))?;

    Ok(())
}

#[specta::specta]
#[tauri::command]
pub fn open_app_data_dir(app: AppHandle) -> Result<(), String> {
    let app_data_dir = crate::portable::app_data_dir(&app)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let path = app_data_dir.to_string_lossy().as_ref().to_string();
    app.opener()
        .open_path(path, None::<String>)
        .map_err(|e| format!("Failed to open app data directory: {}", e))?;

    Ok(())
}

/// Check if Apple Intelligence is available on this device.
/// Called by the frontend when the user selects Apple Intelligence provider.
#[specta::specta]
#[tauri::command]
pub fn check_apple_intelligence_available() -> bool {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        crate::apple_intelligence::check_apple_intelligence_availability()
    }
    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    {
        false
    }
}

/// Try to initialize Enigo (keyboard/mouse simulation).
/// On macOS, this will return an error if accessibility permissions are not granted.
#[specta::specta]
#[tauri::command]
pub fn initialize_enigo(app: AppHandle) -> Result<(), String> {
    use crate::input::EnigoState;

    // Check if already initialized
    if app.try_state::<EnigoState>().is_some() {
        log::debug!("Enigo already initialized");
        return Ok(());
    }

    // Try to initialize
    match EnigoState::new() {
        Ok(enigo_state) => {
            app.manage(enigo_state);
            log::info!("Enigo initialized successfully after permission grant");
            Ok(())
        }
        Err(e) => {
            if cfg!(target_os = "macos") {
                log::warn!(
                    "Failed to initialize Enigo: {} (accessibility permissions may not be granted)",
                    e
                );
            } else {
                log::warn!("Failed to initialize Enigo: {}", e);
            }
            Err(format!("Failed to initialize input system: {}", e))
        }
    }
}

/// Marker state to track if shortcuts have been initialized.
pub struct ShortcutsInitialized;

/// Initialize keyboard shortcuts.
/// On macOS, this should be called after accessibility permissions are granted.
/// This is idempotent - calling it multiple times is safe.
#[specta::specta]
#[tauri::command]
pub fn initialize_shortcuts(app: AppHandle) -> Result<(), String> {
    // Check if already initialized
    if app.try_state::<ShortcutsInitialized>().is_some() {
        log::debug!("Shortcuts already initialized");
        return Ok(());
    }

    // Initialize shortcuts
    crate::shortcut::init_shortcuts(&app);

    // Mark as initialized
    app.manage(ShortcutsInitialized);

    log::info!("Shortcuts initialized successfully");
    Ok(())
}
