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
  /** Constant-time equality. */
  memcmp(a: Uint8Array, b: Uint8Array): boolean;
  memzero(buffer: Uint8Array): void;
}
