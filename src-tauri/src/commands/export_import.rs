use std::fs;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;
use crate::state::AppState;

/// Exports the already-encrypted vault file as-is (a plain byte copy) to a
/// user-chosen destination — no re-encryption needed since the file on disk
/// is never plaintext. Returns `false` if the user cancelled the dialog.
#[tauri::command]
pub fn export_vault_encrypted(
    app: AppHandle,
    state: tauri::State<AppState>,
) -> Result<bool, AppError> {
    let Some(destination) = app
        .dialog()
        .file()
        .set_file_name("vault-backup.pwvault")
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let destination_path = destination
        .into_path()
        .map_err(|e| AppError::Io(e.to_string()))?;
    fs::copy(state.vault_path(), &destination_path)?;
    Ok(true)
}

/// Replaces the active vault with a chosen encrypted vault file — a full
/// switch, not a merge of entries. Locks any currently-unlocked session
/// first, since swapping the file out from under it (whose key was derived
/// from the old file's salt) would leave it in an invalid state; the
/// frontend sends the user back to the unlock screen after this returns.
#[tauri::command]
pub fn import_vault_encrypted(
    app: AppHandle,
    state: tauri::State<AppState>,
) -> Result<bool, AppError> {
    let Some(source) = app.dialog().file().blocking_pick_file() else {
        return Ok(false);
    };
    let source_path = source
        .into_path()
        .map_err(|e| AppError::Io(e.to_string()))?;
    state.lock();
    fs::copy(source_path, state.vault_path())?;
    Ok(true)
}
