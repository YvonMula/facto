/**
 * The libsodium operations Facto uses (PRD 7.1). One implementation per runtime:
 * Node (`libsodium-wrappers-sumo`, this package) and the phone (`react-native-libsodium`,
 * in apps/mobile). Both must produce identical bytes; test-vectors.json proves it.
 * Nothing in Facto calls a crypto primitive except through this interface.
 */
export interface SodiumBackend {
  randomBytes(length: number): Uint8Array;
  /** HKDF-SHA256 extract (RFC 5869): PRK = HMAC-SHA256(salt, ikm). */
  hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Uint8Array;
  /** HKDF-SHA256 expand (RFC 5869). */
  hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Uint8Array;
  hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array;
  signSeedKeypair(seed: Uint8Array): { publicKey: Uint8Array; privateKey: Uint8Array };
  signDetached(message: Uint8Array, privateKey: Uint8Array): Uint8Array;
  verifyDetached(signature: Uint8Array, message: Uint8Array, publicKey: Uint8Array): boolean;
  boxKeypair(): { publicKey: Uint8Array; privateKey: Uint8Array };
  boxSeal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
  /** Throws if the ciphertext was modified or is not for this key pair. */
  boxSealOpen(ciphertext: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array;
  /** Argon2id13 (crypto_pwhash, ALG_ARGON2ID13). Salt is 16 bytes. */
  pwhashArgon2id(outLength: number, password: Uint8Array, salt: Uint8Array, opsLimit: number, memLimit: number): Uint8Array;
  /**
   * XChaCha20-Poly1305 IETF. Associated data is an ASCII string, because the phone binding only
   * accepts a string there; Facto uses purpose labels as associated data.
   */
  aeadEncrypt(message: Uint8Array, associatedData: string, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  /** Throws if the ciphertext, nonce, key or associated data do not match. */
  aeadDecrypt(ciphertext: Uint8Array, associatedData: string, nonce: Uint8Array, key: Uint8Array): Uint8Array;
  /** Constant-time equality. */
  memcmp(a: Uint8Array, b: Uint8Array): boolean;
  memzero(buffer: Uint8Array): void;
}

/** libsodium constants shared by every backend (identical across bindings). */
export const PWHASH_SALT_BYTES = 16;
/** crypto_pwhash_OPSLIMIT_INTERACTIVE / MEMLIMIT_INTERACTIVE: fits 2 GB phones (PRD 9.6). */
export const PWHASH_OPS_INTERACTIVE = 2;
export const PWHASH_MEM_INTERACTIVE = 67_108_864;
export const AEAD_KEY_BYTES = 32;
export const AEAD_NONCE_BYTES = 24;
