#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("failed to derive key: {0}")]
    Kdf(String),
    #[error("encryption failed")]
    Encrypt,
    #[error("failed to unlock vault: incorrect password or corrupt data")]
    Decrypt,
    #[error("vault file is not a recognized password-manager vault")]
    InvalidMagic,
    #[error("unsupported vault format version: {0}")]
    UnsupportedVersion(u32),
    #[error("unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),
    #[error("invalid base64 data: {0}")]
    Base64(#[from] base64::DecodeError),
    #[error("invalid vault json: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
}

/// Errors surfaced to the frontend over Tauri IPC. Serialized as
/// `{"kind": "...", "message"?: "..."}` so the frontend can branch on `kind`
/// without parsing free-text messages.
#[derive(Debug, thiserror::Error, serde::Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("vault is locked")]
    Locked,
    #[error("a vault already exists")]
    AlreadyExists,
    #[error("no vault exists yet")]
    NotFound,
    #[error("{0}")]
    Crypto(String),
    #[error("{0}")]
    Io(String),
}

impl From<CryptoError> for AppError {
    fn from(err: CryptoError) -> Self {
        AppError::Crypto(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Crypto(err.to_string())
    }
}
