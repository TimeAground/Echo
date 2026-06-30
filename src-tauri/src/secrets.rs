use crate::settings::SecretMap;
use log::warn;

const ECHO_SECRET_SERVICE: &str = "Echo";
const POST_PROCESS_USERNAME_PREFIX: &str = "post_process:";

fn post_process_entry(provider_id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(
        ECHO_SECRET_SERVICE,
        &format!("{POST_PROCESS_USERNAME_PREFIX}{provider_id}"),
    )
    .map_err(|error| format!("Failed to open system credential store: {error}"))
}

pub fn store_post_process_api_key(provider_id: &str, api_key: &str) -> Result<(), String> {
    let entry = post_process_entry(provider_id)?;
    let trimmed = api_key.trim();

    if trimmed.is_empty() {
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!("Failed to clear API key: {error}")),
        }
    } else {
        entry
            .set_password(trimmed)
            .map_err(|error| format!("Failed to save API key: {error}"))
    }
}

pub fn read_post_process_api_key(
    provider_id: &str,
    legacy_keys: Option<&SecretMap>,
) -> Result<String, String> {
    let entry = post_process_entry(provider_id)?;

    match entry.get_password() {
        Ok(value) => Ok(value),
        Err(keyring::Error::NoEntry) => Ok(legacy_keys
            .and_then(|keys| keys.get(provider_id))
            .cloned()
            .unwrap_or_default()),
        Err(error) => {
            warn!(
                "Failed to read API key for provider '{}' from system credential store: {}",
                provider_id, error
            );
            Ok(legacy_keys
                .and_then(|keys| keys.get(provider_id))
                .cloned()
                .unwrap_or_default())
        }
    }
}

pub fn has_post_process_api_key(
    provider_id: &str,
    legacy_keys: Option<&SecretMap>,
) -> Result<bool, String> {
    Ok(!read_post_process_api_key(provider_id, legacy_keys)?
        .trim()
        .is_empty())
}

pub fn migrate_post_process_api_keys(settings: &mut crate::settings::AppSettings) -> bool {
    let mut changed = false;
    let provider_ids: Vec<String> = settings.post_process_api_keys.keys().cloned().collect();

    for provider_id in provider_ids {
        let legacy_value = settings
            .post_process_api_keys
            .get(&provider_id)
            .cloned()
            .unwrap_or_default();
        if legacy_value.trim().is_empty() {
            continue;
        }

        match store_post_process_api_key(&provider_id, &legacy_value) {
            Ok(()) => {
                settings
                    .post_process_api_keys
                    .insert(provider_id, String::new());
                changed = true;
            }
            Err(error) => {
                warn!(
                    "Failed to migrate stored API key for provider '{}' to system credential store: {}",
                    provider_id, error
                );
            }
        }
    }

    changed
}

pub fn scrub_post_process_api_keys(settings: &mut crate::settings::AppSettings) -> bool {
    let mut changed = false;
    let provider_ids: Vec<String> = settings.post_process_api_keys.keys().cloned().collect();

    for provider_id in provider_ids {
        let current = settings
            .post_process_api_keys
            .get(&provider_id)
            .cloned()
            .unwrap_or_default();
        if !current.is_empty() {
            settings
                .post_process_api_keys
                .insert(provider_id, String::new());
            changed = true;
        }
    }

    changed
}
