use tauri::State;

use crate::error::AppError;
use crate::model::entry::{Entry, EntrySummary, NewEntryInput, UpdateEntryInput};
use crate::state::AppState;

#[tauri::command]
pub fn list_entries(state: State<AppState>) -> Result<Vec<EntrySummary>, AppError> {
    state.list_entries()
}

#[tauri::command]
pub fn get_entry(state: State<AppState>, id: String) -> Result<Entry, AppError> {
    state.get_entry(&id)
}

#[tauri::command]
pub fn add_entry(state: State<AppState>, input: NewEntryInput) -> Result<EntrySummary, AppError> {
    state.add_entry(input)
}

#[tauri::command]
pub fn update_entry(
    state: State<AppState>,
    id: String,
    input: UpdateEntryInput,
) -> Result<EntrySummary, AppError> {
    state.update_entry(&id, input)
}

#[tauri::command]
pub fn delete_entry(state: State<AppState>, id: String) -> Result<(), AppError> {
    state.delete_entry(&id)
}
