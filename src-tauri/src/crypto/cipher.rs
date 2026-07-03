use aes_gcm::aead::{Aead, Payload};
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use zeroize::Zeroizing;

use crate::error::CryptoError;

pub const NONCE_LEN: usize = 12;

pub fn generate_nonce() -> [u8; NONCE_LEN] {
    let mut nonce = [0u8; NONCE_LEN];
    getrandom::getrandom(&mut nonce).expect("OS RNG failure while generating nonce");
    nonce
}

pub fn encrypt(
    key: &[u8; 32],
    nonce: &[u8; NONCE_LEN],
    aad: &[u8],
    plaintext: &[u8],
) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    cipher
        .encrypt(
            Nonce::from_slice(nonce),
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .map_err(|_| CryptoError::Encrypt)
}

pub fn decrypt(
    key: &[u8; 32],
    nonce: &[u8; NONCE_LEN],
    aad: &[u8],
    ciphertext: &[u8],
) -> Result<Zeroizing<Vec<u8>>, CryptoError> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let plaintext = cipher
        .decrypt(
            Nonce::from_slice(nonce),
            Payload {
                msg: ciphertext,
                aad,
            },
        )
        .map_err(|_| CryptoError::Decrypt)?;
    Ok(Zeroizing::new(plaintext))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_plaintext() {
        let key = [0x42u8; 32];
        let nonce = generate_nonce();
        let aad = b"header-v1";
        let plaintext = b"top secret entries json";

        let ciphertext = encrypt(&key, &nonce, aad, plaintext).unwrap();
        let decrypted = decrypt(&key, &nonce, aad, &ciphertext).unwrap();
        assert_eq!(&*decrypted, plaintext);
    }

    #[test]
    fn rejects_tampered_ciphertext() {
        let key = [0x42u8; 32];
        let nonce = generate_nonce();
        let aad = b"header-v1";
        let mut ciphertext = encrypt(&key, &nonce, aad, b"secret").unwrap();
        let last = ciphertext.len() - 1;
        ciphertext[last] ^= 0x01;
        assert!(decrypt(&key, &nonce, aad, &ciphertext).is_err());
    }

    #[test]
    fn rejects_tampered_aad() {
        let key = [0x42u8; 32];
        let nonce = generate_nonce();
        let ciphertext = encrypt(&key, &nonce, b"header-v1", b"secret").unwrap();
        assert!(decrypt(&key, &nonce, b"header-v2", &ciphertext).is_err());
    }

    #[test]
    fn rejects_wrong_key() {
        let key = [0x42u8; 32];
        let wrong_key = [0x24u8; 32];
        let nonce = generate_nonce();
        let ciphertext = encrypt(&key, &nonce, b"", b"secret").unwrap();
        assert!(decrypt(&wrong_key, &nonce, b"", &ciphertext).is_err());
    }

    #[test]
    fn generates_unique_nonces() {
        assert_ne!(generate_nonce(), generate_nonce());
    }
}
