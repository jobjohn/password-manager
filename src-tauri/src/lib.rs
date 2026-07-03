pub mod autolock;
pub mod commands;
pub mod crypto;
pub mod error;
pub mod model;
pub mod paths;
pub mod state;
pub mod tray;

use tauri::{Emitter, Manager};

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let vault_path = paths::vault_file_path(app.handle())?;
            app.manage(AppState::new(vault_path));

            tray::setup_tray(app.handle())?;
            autolock::spawn_autolock_watcher(app.handle().clone());

            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Hide to tray instead of quitting, and lock the vault —
                        // a password vault shouldn't sit unlocked in the background.
                        api.prevent_close();
                        app_handle.state::<AppState>().lock();
                        let _ = app_handle.emit("vault-locked", ());
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_lifecycle::vault_exists,
            commands::vault_lifecycle::is_unlocked,
            commands::vault_lifecycle::create_vault,
            commands::vault_lifecycle::unlock_vault,
            commands::vault_lifecycle::lock_vault,
            commands::vault_lifecycle::change_master_password,
            commands::entry_crud::list_entries,
            commands::entry_crud::get_entry,
            commands::entry_crud::add_entry,
            commands::entry_crud::update_entry,
            commands::entry_crud::delete_entry,
            commands::clipboard::copy_entry_field_to_clipboard,
            commands::clipboard::report_activity,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::export_import::export_vault_encrypted,
            commands::export_import::import_vault_encrypted,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
