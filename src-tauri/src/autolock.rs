use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;

/// Locks the vault after this many seconds of inactivity. A short default is
/// intentional for a WinAuth-style utility that should not stay unlocked in
/// the background; see the plan's open decisions for making this
/// user-configurable in a future settings screen.
pub const DEFAULT_TIMEOUT_SECS: u64 = 300;

pub fn spawn_autolock_watcher(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let state = app.state::<AppState>();
            if state.is_unlocked() && state.seconds_since_activity() >= DEFAULT_TIMEOUT_SECS {
                state.lock();
                let _ = app.emit("vault-locked", ());
            }
        }
    });
}
