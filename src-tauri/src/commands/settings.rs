use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

use crate::error::AppError;

const STORE_FILE: &str = "settings.json";
const SETTINGS_KEY: &str = "settings";

/// Non-secret UI preferences only — never store vault entries or the master
/// password here. `tauri-plugin-store` persists this as plaintext JSON.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: Theme,
    pub always_on_top: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    System,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            always_on_top: false,
        }
    }
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Settings, AppError> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| AppError::Io(e.to_string()))?;
    let settings = store
        .get(SETTINGS_KEY)
        .and_then(|value| serde_json::from_value(value).ok())
        .unwrap_or_default();
    Ok(settings)
}

#[tauri::command]
pub fn update_settings(app: AppHandle, settings: Settings) -> Result<(), AppError> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| AppError::Io(e.to_string()))?;
    store.set(SETTINGS_KEY, serde_json::to_value(&settings)?);
    store.save().map_err(|e| AppError::Io(e.to_string()))?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(settings.always_on_top);
    }
    Ok(())
}
