use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

#[tauri::command]
pub fn vault_exists(state: State<AppState>) -> bool {
    state.vault_exists()
}

#[tauri::command]
pub fn is_unlocked(state: State<AppState>) -> bool {
    state.is_unlocked()
}

#[tauri::command]
pub fn create_vault(state: State<AppState>, master_password: String) -> Result<(), AppError> {
    state.create_vault(&master_password)
}

#[tauri::command]
pub fn unlock_vault(state: State<AppState>, master_password: String) -> Result<(), AppError> {
    state.unlock_vault(&master_password)
}

#[tauri::command]
pub fn lock_vault(state: State<AppState>) {
    state.lock();
}

#[tauri::command]
pub fn change_master_password(
    state: State<AppState>,
    current_password: String,
    new_password: String,
) -> Result<(), AppError> {
    state.change_master_password(&current_password, &new_password)
}
