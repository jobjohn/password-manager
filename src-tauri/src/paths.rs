use std::path::PathBuf;

use tauri::{AppHandle, Manager};

pub fn vault_file_path(app: &AppHandle) -> std::io::Result<PathBuf> {
    let dir = app.path().app_data_dir().map_err(std::io::Error::other)?;
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("vault.pwvault"))
}
