use serde::{Deserialize, Serialize};

use super::entry::Entry;

pub const CURRENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultData {
    pub schema_version: u32,
    pub entries: Vec<Entry>,
}

impl Default for VaultData {
    fn default() -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            entries: Vec::new(),
        }
    }
}
