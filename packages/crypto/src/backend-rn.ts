import type { SodiumBackend } from './backend.js';

/**
 * The subset of `react-native-libsodium` (1.7) Facto uses, with its exact signatures.
 * Injected rather than imported so this file has no React Native dependency and the
 * vector suite can run it on Node against a stand-in (test/backend-rn.test.ts).
 */
export interface ReactNativeSodium {
  randombytes_buf(length: number): Uint8Array;
  /** Native order: (ikm, salt). */
  _unstable_crypto_kdf_hkdf_sha256_extract(key: Uint8Array, salt: Uint8Array): Uint8Array;
  /** `info` is a JS string; the native side hashes its UTF-8 bytes. */
  _unstable_crypto_kdf_hkdf_sha256_expand(key: Uint8Array, info: string, length: number): Uint8Array;
  crypto_sign_seed_keypair(seed: Uint8Array): { publicKey: Uint8Array; privateKey: Uint8Array };
  crypto_sign_detached(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
  crypto_sign_verify_detached(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  crypto_box_keypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
  crypto_box_seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  crypto_box_seal_open(ciphertext: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array;
  crypto_pwhash(keyLength: number, password: Uint8Array, salt: Uint8Array, opsLimit: number, memLimit: number, algorithm: number): Uint8Array;
  crypto_pwhash_ALG_ARGON2ID13: number;
  /** Additional data must be a string in this binding. */
  crypto_aead_xchacha20poly1305_ietf_encrypt(message: Uint8Array, additionalData: string, secretNonce: null, publicNonce: Uint8Array, key: Uint8Array): Uint8Array;
  crypto_aead_xchacha20poly1305_ietf_decrypt(secretNonce: null, ciphertext: Uint8Array, additionalData: string, publicNonce: Uint8Array, key: Uint8Array): Uint8Array;
}

const ASCII = /^[\x20-\x7e]*$/;

function asciiString(bytes: Uint8Array): string {
  let s = '';
  for (const x of bytes) {
    if (x < 0x20 || x > 0x7e) throw new Error('HKDF info and AEAD associated data must be printable ASCII on the phone binding (ADR 0008)');
    s += String.fromCharCode(x);
  }
  return s;
}

/**
 * Phone backend (ADR 0005, 0008). Gaps in the binding and how they are covered:
 * - HMAC-SHA256 is not exposed: computed as HKDF-Extract(salt = key, ikm = message), which RFC 5869 defines as HMAC-SHA256(key, message).
 * - `memcmp` / `memzero` are not exposed: a constant-time XOR comparison and `fill(0)` in JS.
 *   JS cannot guarantee that no copy of a secret remains in the engine's heap; this is a known limit.
 */
export function createReactNativeBackend(lib: ReactNativeSodium): SodiumBackend {
  return {
    randomBytes: (n) => lib.randombytes_buf(n),
    hkdfExtract: (salt, ikm) => lib._unstable_crypto_kdf_hkdf_sha256_extract(ikm, salt),
    hkdfExpand: (prk, info, length) => lib._unstable_crypto_kdf_hkdf_sha256_expand(prk, asciiString(info), length),
    hmacSha256: (key, message) => lib._unstable_crypto_kdf_hkdf_sha256_extract(message, key),
    signSeedKeypair: (seed) => {
      const kp = lib.crypto_sign_seed_keypair(seed);
      return { publicKey: kp.publicKey, privateKey: kp.privateKey };
    },
    signDetached: (message, privateKey) => lib.crypto_sign_detached(message, privateKey),
    verifyDetached: (signature, message, publicKey) => {
      try {
        return lib.crypto_sign_verify_detached(signature, message, publicKey);
      } catch {
        return false;
      }
    },
    boxKeypair: () => {
      const kp = lib.crypto_box_keypair();
      return { publicKey: kp.publicKey, privateKey: kp.privateKey };
    },
    boxSeal: (message, publicKey) => lib.crypto_box_seal(message, publicKey),
    boxSealOpen: (ciphertext, publicKey, privateKey) => lib.crypto_box_seal_open(ciphertext, publicKey, privateKey),
    pwhashArgon2id: (outLength, password, salt, opsLimit, memLimit) =>
      lib.crypto_pwhash(outLength, password, salt, opsLimit, memLimit, lib.crypto_pwhash_ALG_ARGON2ID13),
    aeadEncrypt: (message, ad, nonce, key) => {
      if (!ASCII.test(ad)) throw new Error('associated data must be ASCII');
      return lib.crypto_aead_xchacha20poly1305_ietf_encrypt(message, ad, null, nonce, key);
    },
    aeadDecrypt: (ciphertext, ad, nonce, key) => {
      if (!ASCII.test(ad)) throw new Error('associated data must be ASCII');
      return lib.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, ad, nonce, key);
    },
    memcmp: (a, b) => {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
      return diff === 0;
    },
    memzero: (buffer) => buffer.fill(0),
  };
}
