use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

use zeroize::Zeroizing;

use crate::crypto::kdf::KEY_LEN;
use crate::crypto::VaultFile;
use crate::error::AppError;
use crate::model::entry::{Entry, EntrySummary, NewEntryInput, UpdateEntryInput};
use crate::model::vault_data::VaultData;

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_secs() as i64
}

pub enum VaultSession {
    Locked,
    Unlocked {
        key: Zeroizing<[u8; KEY_LEN]>,
        vault_file: Box<VaultFile>,
        data: VaultData,
    },
}

pub struct AppState {
    session: Mutex<VaultSession>,
    vault_path: PathBuf,
    last_activity: Mutex<Instant>,
    clipboard_generation: AtomicU64,
}

impl AppState {
    pub fn new(vault_path: PathBuf) -> Self {
        Self {
            session: Mutex::new(VaultSession::Locked),
            vault_path,
            last_activity: Mutex::new(Instant::now()),
            clipboard_generation: AtomicU64::new(0),
        }
    }

    pub fn vault_exists(&self) -> bool {
        self.vault_path.exists()
    }

    pub fn vault_path(&self) -> &std::path::Path {
        &self.vault_path
    }

    pub fn is_unlocked(&self) -> bool {
        matches!(*self.session.lock().unwrap(), VaultSession::Unlocked { .. })
    }

    pub fn touch_activity(&self) {
        *self.last_activity.lock().unwrap() = Instant::now();
    }

    pub fn seconds_since_activity(&self) -> u64 {
        self.last_activity.lock().unwrap().elapsed().as_secs()
    }

    /// Returns a fresh generation number for a new clipboard write. A
    /// scheduled clear only applies if this is still the current generation
    /// when it fires — otherwise a newer copy has already superseded it.
    pub fn bump_clipboard_generation(&self) -> u64 {
        self.clipboard_generation.fetch_add(1, Ordering::SeqCst) + 1
    }

    pub fn clipboard_generation_matches(&self, generation: u64) -> bool {
        self.clipboard_generation.load(Ordering::SeqCst) == generation
    }

    pub fn create_vault(&self, master_password: &str) -> Result<(), AppError> {
        self.touch_activity();
        if self.vault_path.exists() {
            return Err(AppError::AlreadyExists);
        }
        let data = VaultData::default();
        let plaintext = serde_json::to_vec(&data)?;
        let (vault_file, key) = VaultFile::create(master_password, &plaintext)?;
        vault_file.save_to_path(&self.vault_path)?;
        *self.session.lock().unwrap() = VaultSession::Unlocked {
            key,
            vault_file: Box::new(vault_file),
            data,
        };
        Ok(())
    }

    pub fn unlock_vault(&self, master_password: &str) -> Result<(), AppError> {
        self.touch_activity();
        if !self.vault_path.exists() {
            return Err(AppError::NotFound);
        }
        let vault_file = VaultFile::load_from_path(&self.vault_path)?;
        let (key, plaintext) = vault_file.unlock(master_password)?;
        let data: VaultData = serde_json::from_slice(&plaintext)?;
        *self.session.lock().unwrap() = VaultSession::Unlocked {
            key,
            vault_file: Box::new(vault_file),
            data,
        };
        Ok(())
    }

    pub fn lock(&self) {
        *self.session.lock().unwrap() = VaultSession::Locked;
    }

    pub fn change_master_password(
        &self,
        current_password: &str,
        new_password: &str,
    ) -> Result<(), AppError> {
        self.touch_activity();
        let mut session = self.session.lock().unwrap();
        match &mut *session {
            VaultSession::Locked => Err(AppError::Locked),
            VaultSession::Unlocked {
                vault_file,
                data,
                key,
            } => {
                // Verify the caller actually knows the current password before
                // allowing a change, even though the session is already unlocked.
                vault_file.unlock(current_password)?;
                let plaintext = serde_json::to_vec(data)?;
                let (new_vault_file, new_key) = VaultFile::create(new_password, &plaintext)?;
                new_vault_file.save_to_path(&self.vault_path)?;
                **vault_file = new_vault_file;
                *key = new_key;
                Ok(())
            }
        }
    }

    fn persist(
        &self,
        vault_file: &mut VaultFile,
        key: &[u8; KEY_LEN],
        data: &VaultData,
    ) -> Result<(), AppError> {
        let plaintext = serde_json::to_vec(data)?;
        vault_file.reencrypt(key, &plaintext)?;
        vault_file.save_to_path(&self.vault_path)?;
        Ok(())
    }

    pub fn list_entries(&self) -> Result<Vec<EntrySummary>, AppError> {
        self.touch_activity();
        let session = self.session.lock().unwrap();
        match &*session {
            VaultSession::Locked => Err(AppError::Locked),
            VaultSession::Unlocked { data, .. } => {
                Ok(data.entries.iter().map(EntrySummary::from).collect())
            }
        }
    }

    pub fn get_entry(&self, id: &str) -> Result<Entry, AppError> {
        self.touch_activity();
        let session = self.session.lock().unwrap();
        match &*session {
            VaultSession::Locked => Err(AppError::Locked),
            VaultSession::Unlocked { data, .. } => data
                .entries
                .iter()
                .find(|e| e.id == id)
                .cloned()
                .ok_or(AppError::NotFound),
        }
    }

    pub fn add_entry(&self, input: NewEntryInput) -> Result<EntrySummary, AppError> {
        self.touch_activity();
        let mut session = self.session.lock().unwrap();
        match &mut *session {
            VaultSession::Locked => Err(AppError::Locked),
            VaultSession::Unlocked {
                data,
                vault_file,
                key,
            } => {
                let now = now_unix();
                let entry = Entry {
                    id: uuid::Uuid::new_v4().to_string(),
                    title: input.title,
                    username: input.username,
                    password: input.password,
                    url: input.url,
                    notes: input.notes,
                    tags: input.tags,
                    created_at: now,
                    updated_at: now,
                };
                let summary = EntrySummary::from(&entry);
                data.entries.push(entry);
                self.persist(vault_file, key, data)?;
                Ok(summary)
            }
        }
    }

    pub fn update_entry(
        &self,
        id: &str,
        input: UpdateEntryInput,
    ) -> Result<EntrySummary, AppError> {
        self.touch_activity();
        let mut session = self.session.lock().unwrap();
        match &mut *session {
            VaultSession::Locked => Err(AppError::Locked),
            VaultSession::Unlocked {
                data,
                vault_file,
                key,
            } => {
                let entry = data
                    .entries
                    .iter_mut()
                    .find(|e| e.id == id)
                    .ok_or(AppError::NotFound)?;
                entry.title = input.title;
                entry.username = input.username;
                entry.password = input.password;
                entry.url = input.url;
                entry.notes = input.notes;
                entry.tags = input.tags;
                entry.updated_at = now_unix();
                let summary = EntrySummary::from(&*entry);
                self.persist(vault_file, key, data)?;
                Ok(summary)
            }
        }
    }

    pub fn delete_entry(&self, id: &str) -> Result<(), AppError> {
        self.touch_activity();
        let mut session = self.session.lock().unwrap();
        match &mut *session {
            VaultSession::Locked => Err(AppError::Locked),
            VaultSession::Unlocked {
                data,
                vault_file,
                key,
            } => {
                let before = data.entries.len();
                data.entries.retain(|e| e.id != id);
                if data.entries.len() == before {
                    return Err(AppError::NotFound);
                }
                self.persist(vault_file, key, data)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn state_with_temp_path() -> (AppState, tempfile::TempDir) {
        let dir = tempdir().unwrap();
        let path = dir.path().join("vault.pwvault");
        (AppState::new(path), dir)
    }

    #[test]
    fn create_then_unlock_round_trips_across_simulated_restart() {
        let (state, dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        assert!(state.is_unlocked());

        // Simulate an app restart: a fresh AppState pointed at the same file
        // starts locked and must unlock using only what's persisted on disk.
        let fresh = AppState::new(dir.path().join("vault.pwvault"));
        assert!(!fresh.is_unlocked());
        assert!(fresh.vault_exists());
        fresh.unlock_vault("hunter2").unwrap();
        assert!(fresh.is_unlocked());
    }

    #[test]
    fn unlock_rejects_wrong_password() {
        let (state, dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        let fresh = AppState::new(dir.path().join("vault.pwvault"));
        assert!(fresh.unlock_vault("wrong-password").is_err());
        assert!(!fresh.is_unlocked());
    }

    #[test]
    fn create_vault_fails_if_already_exists() {
        let (state, dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        let other = AppState::new(dir.path().join("vault.pwvault"));
        assert!(matches!(
            other.create_vault("anything"),
            Err(AppError::AlreadyExists)
        ));
    }

    #[test]
    fn unlock_fails_when_vault_missing() {
        let (state, _dir) = state_with_temp_path();
        assert!(matches!(
            state.unlock_vault("hunter2"),
            Err(AppError::NotFound)
        ));
    }

    #[test]
    fn lock_clears_unlocked_session() {
        let (state, _dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        assert!(state.is_unlocked());
        state.lock();
        assert!(!state.is_unlocked());
    }

    #[test]
    fn change_master_password_allows_unlock_with_new_password_only() {
        let (state, dir) = state_with_temp_path();
        state.create_vault("old-pass").unwrap();
        state
            .change_master_password("old-pass", "new-pass")
            .unwrap();

        let fresh = AppState::new(dir.path().join("vault.pwvault"));
        assert!(fresh.unlock_vault("old-pass").is_err());
        assert!(fresh.unlock_vault("new-pass").is_ok());
    }

    #[test]
    fn change_master_password_fails_when_locked() {
        let (state, _dir) = state_with_temp_path();
        assert!(matches!(
            state.change_master_password("a", "b"),
            Err(AppError::Locked)
        ));
    }

    fn sample_entry_input(title: &str) -> NewEntryInput {
        NewEntryInput {
            title: title.to_string(),
            username: "alice".to_string(),
            password: "s3cret".to_string(),
            url: "https://example.com".to_string(),
            notes: "".to_string(),
            tags: vec!["work".to_string()],
        }
    }

    #[test]
    fn add_entry_then_list_and_get() {
        let (state, _dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();

        let summary = state.add_entry(sample_entry_input("GitHub")).unwrap();
        assert_eq!(summary.title, "GitHub");

        let list = state.list_entries().unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, summary.id);

        let full = state.get_entry(&summary.id).unwrap();
        assert_eq!(full.password, "s3cret");
    }

    #[test]
    fn entry_commands_fail_when_locked() {
        let (state, _dir) = state_with_temp_path();
        assert!(matches!(state.list_entries(), Err(AppError::Locked)));
        assert!(matches!(
            state.add_entry(sample_entry_input("X")),
            Err(AppError::Locked)
        ));
    }

    #[test]
    fn update_entry_persists_change_across_restart() {
        let (state, dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        let summary = state.add_entry(sample_entry_input("GitHub")).unwrap();

        let update = UpdateEntryInput {
            title: "GitHub (work)".to_string(),
            username: "alice2".to_string(),
            password: "new-secret".to_string(),
            url: "https://github.com".to_string(),
            notes: "rotated".to_string(),
            tags: vec![],
        };
        state.update_entry(&summary.id, update).unwrap();

        let fresh = AppState::new(dir.path().join("vault.pwvault"));
        fresh.unlock_vault("hunter2").unwrap();
        let entry = fresh.get_entry(&summary.id).unwrap();
        assert_eq!(entry.title, "GitHub (work)");
        assert_eq!(entry.password, "new-secret");
    }

    #[test]
    fn update_entry_fails_for_unknown_id() {
        let (state, _dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        assert!(matches!(
            state.update_entry("nonexistent", sample_entry_input("X").into()),
            Err(AppError::NotFound)
        ));
    }

    #[test]
    fn delete_entry_removes_and_persists() {
        let (state, dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        let summary = state.add_entry(sample_entry_input("GitHub")).unwrap();

        state.delete_entry(&summary.id).unwrap();
        assert!(state.list_entries().unwrap().is_empty());

        let fresh = AppState::new(dir.path().join("vault.pwvault"));
        fresh.unlock_vault("hunter2").unwrap();
        assert!(fresh.list_entries().unwrap().is_empty());
    }

    #[test]
    fn delete_entry_fails_for_unknown_id() {
        let (state, _dir) = state_with_temp_path();
        state.create_vault("hunter2").unwrap();
        assert!(matches!(
            state.delete_entry("nonexistent"),
            Err(AppError::NotFound)
        ));
    }

    impl From<NewEntryInput> for UpdateEntryInput {
        fn from(input: NewEntryInput) -> Self {
            Self {
                title: input.title,
                username: input.username,
                password: input.password,
                url: input.url,
                notes: input.notes,
                tags: input.tags,
            }
        }
    }
}
