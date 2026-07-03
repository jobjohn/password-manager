use std::time::Duration;

use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::error::AppError;
use crate::model::entry::ClipboardField;
use crate::state::AppState;

const CLIPBOARD_CLEAR_DELAY_SECS: u64 = 25;

fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())
}

/// Copies a secret field straight from backend state to the OS clipboard —
/// the plaintext never crosses into the webview/JS for this action (unlike
/// "reveal on screen", which inherently requires it). Schedules an
/// auto-clear that only fires if this copy is still the most recent one and
/// the clipboard still holds exactly what we wrote.
#[tauri::command]
pub fn copy_entry_field_to_clipboard(
    app: AppHandle,
    state: State<AppState>,
    id: String,
    field: ClipboardField,
) -> Result<(), AppError> {
    let entry = state.get_entry(&id)?;
    let value = match field {
        ClipboardField::Username => entry.username,
        ClipboardField::Password => entry.password,
    };

    app.clipboard()
        .write_text(value.clone())
        .map_err(|e| AppError::Io(e.to_string()))?;

    let expected_hash = sha256_hex(&value);
    let generation = state.bump_clipboard_generation();
    let app_handle = app.clone();

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(CLIPBOARD_CLEAR_DELAY_SECS)).await;
        let state = app_handle.state::<AppState>();
        if !state.clipboard_generation_matches(generation) {
            return;
        }
        if let Ok(current) = app_handle.clipboard().read_text() {
            if sha256_hex(&current) == expected_hash {
                let _ = app_handle.clipboard().write_text(String::new());
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub fn report_activity(state: State<AppState>) {
    state.touch_activity();
}
