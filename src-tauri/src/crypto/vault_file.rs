use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::error::CryptoError;

use super::cipher;
use super::kdf::{self, KdfParams, KEY_LEN};

const MAGIC: &str = "PWMGRVAULT";
const FORMAT_VERSION: u32 = 1;

type UnlockedVault = (Zeroizing<[u8; KEY_LEN]>, Zeroizing<Vec<u8>>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KdfHeader {
    pub algorithm: String,
    pub salt: String,
    pub memory_kib: u32,
    pub iterations: u32,
    pub parallelism: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CipherHeader {
    pub algorithm: String,
    pub nonce: String,
}

#[derive(Debug, Clone, Serialize)]
struct AadHeader<'a> {
    magic: &'a str,
    format_version: u32,
    kdf: &'a KdfHeader,
    cipher: &'a CipherHeader,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultFile {
    pub magic: String,
    pub format_version: u32,
    pub kdf: KdfHeader,
    pub cipher: CipherHeader,
    pub created_at: i64,
    pub modified_at: i64,
    pub ciphertext: String,
}

fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock before unix epoch")
        .as_secs() as i64
}

impl VaultFile {
    /// Creates a brand-new vault: derives a fresh key from `password` with a
    /// new random salt, encrypts `plaintext`, and returns the vault together
    /// with the derived key (so the caller can keep it in the unlocked session
    /// without re-deriving it).
    pub fn create(
        password: &str,
        plaintext: &[u8],
    ) -> Result<(Self, Zeroizing<[u8; KEY_LEN]>), CryptoError> {
        let params = KdfParams::default();
        let salt = kdf::generate_salt();
        let key = kdf::derive_key(password, &salt, &params)?;

        let mut vault = Self {
            magic: MAGIC.to_string(),
            format_version: FORMAT_VERSION,
            kdf: KdfHeader {
                algorithm: "argon2id".to_string(),
                salt: B64.encode(salt),
                memory_kib: params.memory_kib,
                iterations: params.iterations,
                parallelism: params.parallelism,
            },
            cipher: CipherHeader {
                algorithm: "aes-256-gcm".to_string(),
                nonce: String::new(),
            },
            created_at: now_unix(),
            modified_at: now_unix(),
            ciphertext: String::new(),
        };
        vault.reencrypt(&key, plaintext)?;
        Ok((vault, key))
    }

    /// Derives the key from `password` using the vault's stored KDF params and
    /// attempts to decrypt. Returns a generic error on either a wrong password
    /// or corrupted/tampered data — never distinguishes the two, since AEAD
    /// authentication failure is the only signal we get either way.
    pub fn unlock(&self, password: &str) -> Result<UnlockedVault, CryptoError> {
        if self.magic != MAGIC {
            return Err(CryptoError::InvalidMagic);
        }
        if self.format_version != FORMAT_VERSION {
            return Err(CryptoError::UnsupportedVersion(self.format_version));
        }
        if self.kdf.algorithm != "argon2id" {
            return Err(CryptoError::UnsupportedAlgorithm(
                self.kdf.algorithm.clone(),
            ));
        }
        if self.cipher.algorithm != "aes-256-gcm" {
            return Err(CryptoError::UnsupportedAlgorithm(
                self.cipher.algorithm.clone(),
            ));
        }

        let salt: [u8; kdf::SALT_LEN] = B64
            .decode(&self.kdf.salt)?
            .try_into()
            .map_err(|_| CryptoError::Decrypt)?;
        let params = KdfParams {
            memory_kib: self.kdf.memory_kib,
            iterations: self.kdf.iterations,
            parallelism: self.kdf.parallelism,
        };
        let key = kdf::derive_key(password, &salt, &params)?;
        let plaintext = self.decrypt_with_key(&key)?;
        Ok((key, plaintext))
    }

    fn decrypt_with_key(&self, key: &[u8; KEY_LEN]) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
        let nonce: [u8; cipher::NONCE_LEN] = B64
            .decode(&self.cipher.nonce)?
            .try_into()
            .map_err(|_| CryptoError::Decrypt)?;
        let ciphertext = B64.decode(&self.ciphertext)?;
        let aad = self.build_aad();
        cipher::decrypt(key, &nonce, &aad, &ciphertext)
    }

    /// Re-encrypts `plaintext` under the already-derived `key` with a fresh
    /// nonce, without re-running the (expensive) KDF. Used for every save
    /// after the initial unlock/create.
    pub fn reencrypt(&mut self, key: &[u8; KEY_LEN], plaintext: &[u8]) -> Result<(), CryptoError> {
        let nonce = cipher::generate_nonce();
        self.cipher.nonce = B64.encode(nonce);
        let aad = self.build_aad();
        let ciphertext = cipher::encrypt(key, &nonce, &aad, plaintext)?;
        self.ciphertext = B64.encode(ciphertext);
        self.modified_at = now_unix();
        Ok(())
    }

    fn build_aad(&self) -> Vec<u8> {
        let header = AadHeader {
            magic: &self.magic,
            format_version: self.format_version,
            kdf: &self.kdf,
            cipher: &self.cipher,
        };
        serde_json::to_vec(&header).expect("AadHeader serialization cannot fail")
    }

    pub fn load_from_path(path: &Path) -> Result<Self, CryptoError> {
        let bytes = fs::read(path)?;
        let vault: Self = serde_json::from_slice(&bytes)?;
        if vault.magic != MAGIC {
            return Err(CryptoError::InvalidMagic);
        }
        Ok(vault)
    }

    /// Atomically writes the vault to `path` via write-to-temp-then-rename, so
    /// a crash mid-write never leaves a truncated/corrupt vault file behind.
    pub fn save_to_path(&self, path: &Path) -> Result<(), CryptoError> {
        let bytes = serde_json::to_vec_pretty(self)?;
        let tmp_path = path.with_extension("tmp");
        fs::write(&tmp_path, &bytes)?;
        fs::rename(&tmp_path, path)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn round_trips_create_and_unlock() {
        let plaintext = br#"{"entries":[]}"#;
        let (vault, _key) = VaultFile::create("hunter2", plaintext).unwrap();
        let (_key2, decrypted) = vault.unlock("hunter2").unwrap();
        assert_eq!(&*decrypted, plaintext);
    }

    #[test]
    fn rejects_wrong_password() {
        let (vault, _key) = VaultFile::create("correct-password", b"secret data").unwrap();
        assert!(vault.unlock("wrong-password").is_err());
    }

    #[test]
    fn detects_tampered_ciphertext() {
        let (mut vault, _key) = VaultFile::create("hunter2", b"secret data").unwrap();
        let mut raw = B64.decode(&vault.ciphertext).unwrap();
        let last = raw.len() - 1;
        raw[last] ^= 0x01;
        vault.ciphertext = B64.encode(raw);
        assert!(vault.unlock("hunter2").is_err());
    }

    #[test]
    fn detects_tampered_header() {
        let (mut vault, _key) = VaultFile::create("hunter2", b"secret data").unwrap();
        vault.kdf.iterations += 1; // header field is bound into AAD
        assert!(vault.unlock("hunter2").is_err());
    }

    #[test]
    fn reencrypt_uses_fresh_nonce_and_preserves_plaintext() {
        let (mut vault, key) = VaultFile::create("hunter2", b"v1").unwrap();
        let nonce_before = vault.cipher.nonce.clone();
        vault.reencrypt(&key, b"v2").unwrap();
        assert_ne!(vault.cipher.nonce, nonce_before);
        let (_key2, decrypted) = vault.unlock("hunter2").unwrap();
        assert_eq!(&*decrypted, b"v2");
    }

    #[test]
    fn round_trips_through_file_on_disk() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("vault.pwvault");

        let (vault, _key) = VaultFile::create("hunter2", b"persisted secret").unwrap();
        vault.save_to_path(&path).unwrap();

        let loaded = VaultFile::load_from_path(&path).unwrap();
        let (_key2, decrypted) = loaded.unlock("hunter2").unwrap();
        assert_eq!(&*decrypted, b"persisted secret");
    }

    #[test]
    fn rejects_corrupt_file_on_disk() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("vault.pwvault");
        fs::write(&path, b"not a valid vault file").unwrap();
        assert!(VaultFile::load_from_path(&path).is_err());
    }
}
