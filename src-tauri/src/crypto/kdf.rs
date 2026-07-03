use argon2::{Algorithm, Argon2, Params, Version};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use crate::error::CryptoError;

pub const SALT_LEN: usize = 16;
pub const KEY_LEN: usize = 32;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KdfParams {
    pub memory_kib: u32,
    pub iterations: u32,
    pub parallelism: u32,
}

impl Default for KdfParams {
    fn default() -> Self {
        Self {
            memory_kib: 65536,
            iterations: 3,
            parallelism: 4,
        }
    }
}

pub fn generate_salt() -> [u8; SALT_LEN] {
    let mut salt = [0u8; SALT_LEN];
    getrandom::getrandom(&mut salt).expect("OS RNG failure while generating salt");
    salt
}

pub fn derive_key(
    password: &str,
    salt: &[u8; SALT_LEN],
    params: &KdfParams,
) -> Result<Zeroizing<[u8; KEY_LEN]>, CryptoError> {
    let argon2_params = Params::new(
        params.memory_kib,
        params.iterations,
        params.parallelism,
        Some(KEY_LEN),
    )
    .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, argon2_params);

    let mut key = Zeroizing::new([0u8; KEY_LEN]);
    argon2
        .hash_password_into(password.as_bytes(), salt, key.as_mut())
        .map_err(|e| CryptoError::Kdf(e.to_string()))?;
    Ok(key)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Fast params for tests — production parameters (KdfParams::default) are
    // deliberately expensive (~500ms-1s) and would make the whole suite slow.
    fn test_params() -> KdfParams {
        KdfParams {
            memory_kib: 8,
            iterations: 1,
            parallelism: 1,
        }
    }

    #[test]
    fn derives_same_key_for_same_password_and_salt() {
        let salt = generate_salt();
        let params = test_params();
        let key1 = derive_key("correct horse battery staple", &salt, &params).unwrap();
        let key2 = derive_key("correct horse battery staple", &salt, &params).unwrap();
        assert_eq!(*key1, *key2);
    }

    #[test]
    fn derives_different_keys_for_different_passwords() {
        let salt = generate_salt();
        let params = test_params();
        let key1 = derive_key("password-one", &salt, &params).unwrap();
        let key2 = derive_key("password-two", &salt, &params).unwrap();
        assert_ne!(*key1, *key2);
    }

    #[test]
    fn derives_different_keys_for_different_salts() {
        let params = test_params();
        let key1 = derive_key("same-password", &generate_salt(), &params).unwrap();
        let key2 = derive_key("same-password", &generate_salt(), &params).unwrap();
        assert_ne!(*key1, *key2);
    }

    #[test]
    fn generates_unique_salts() {
        let salt1 = generate_salt();
        let salt2 = generate_salt();
        assert_ne!(salt1, salt2);
    }
}
