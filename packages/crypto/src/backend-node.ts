import { createRequire } from 'node:module';
import sodium from 'libsodium-wrappers-sumo';
import type { SodiumBackend } from './backend.js';

/**
 * Raw Emscripten exports of the libsodium build that libsodium-wrappers-sumo loads.
 * The wrappers do not expose HKDF-SHA256, so we call libsodium's own compiled
 * crypto_kdf_hkdf_sha256_* functions directly. Only memory marshalling happens here;
 * the HKDF itself is libsodium's (NEEDS-CRYPTO-REVIEW).
 */
interface RawModule {
  ready: Promise<unknown>;
  HEAPU8: Uint8Array;
  _malloc(n: number): number;
  _free(p: number): void;
  _crypto_kdf_hkdf_sha256_extract(prk: number, salt: number, saltLen: number, ikm: number, ikmLen: number): number;
  _crypto_kdf_hkdf_sha256_expand(out: number, outLen: number, ctx: number, ctxLen: number, prk: number): number;
}

const HKDF_PRK_BYTES = 32;

/** The CommonJS build exposes the initialised module instance (the ESM build only exports a factory). */
async function loadRaw(): Promise<RawModule> {
  const raw = createRequire(import.meta.url)('libsodium-sumo') as RawModule;
  await raw.ready;
  return raw;
}

function withHeap(raw: RawModule, inputs: Uint8Array[], outLen: number, fn: (ptrs: number[], out: number) => number): Uint8Array {
  const ptrs = inputs.map((b) => {
    const p = raw._malloc(Math.max(1, b.length));
    raw.HEAPU8.set(b, p);
    return p;
  });
  const out = raw._malloc(outLen);
  try {
    if (fn(ptrs, out) !== 0) throw new Error('libsodium HKDF call failed');
    return raw.HEAPU8.slice(out, out + outLen);
  } finally {
    // Inputs include secrets (device secret, PRK); clear the heap copies.
    ptrs.forEach((p, i) => {
      raw.HEAPU8.fill(0, p, p + Math.max(1, inputs[i]!.length));
      raw._free(p);
    });
    raw.HEAPU8.fill(0, out, out + outLen);
    raw._free(out);
  }
}

export async function createNodeBackend(): Promise<SodiumBackend> {
  await sodium.ready;
  const raw = await loadRaw();
  return {
    randomBytes: (n) => sodium.randombytes_buf(n),
    hkdfExtract: (salt, ikm) =>
      withHeap(raw, [salt, ikm], HKDF_PRK_BYTES, ([s, i], out) => raw._crypto_kdf_hkdf_sha256_extract(out, s!, salt.length, i!, ikm.length)),
    hkdfExpand: (prk, info, length) => {
      if (prk.length !== HKDF_PRK_BYTES) throw new Error('PRK must be 32 bytes');
      return withHeap(raw, [prk, info], length, ([p, c], out) => raw._crypto_kdf_hkdf_sha256_expand(out, length, c!, info.length, p!));
    },
    // The streaming API accepts any key length (RFC 2104); the one-shot call only takes 32-byte keys.
    hmacSha256: (key, message) => {
      const state = sodium.crypto_auth_hmacsha256_init(key);
      sodium.crypto_auth_hmacsha256_update(state, message);
      return sodium.crypto_auth_hmacsha256_final(state);
    },
    signSeedKeypair: (seed) => {
      const kp = sodium.crypto_sign_seed_keypair(seed);
      return { publicKey: kp.publicKey, privateKey: kp.privateKey };
    },
    signDetached: (message, privateKey) => sodium.crypto_sign_detached(message, privateKey),
    verifyDetached: (signature, message, publicKey) => {
      try {
        return sodium.crypto_sign_verify_detached(signature, message, publicKey);
      } catch {
        return false;
      }
    },
    boxKeypair: () => {
      const kp = sodium.crypto_box_keypair();
      return { publicKey: kp.publicKey, privateKey: kp.privateKey };
    },
    boxSeal: (message, publicKey) => sodium.crypto_box_seal(message, publicKey),
    boxSealOpen: (ciphertext, publicKey, privateKey) => sodium.crypto_box_seal_open(ciphertext, publicKey, privateKey),
    pwhashArgon2id: (outLength, password, salt, opsLimit, memLimit) =>
      sodium.crypto_pwhash(outLength, password, salt, opsLimit, memLimit, sodium.crypto_pwhash_ALG_ARGON2ID13),
    aeadEncrypt: (message, ad, nonce, key) => sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(message, sodium.from_string(ad), null, nonce, key),
    aeadDecrypt: (ciphertext, ad, nonce, key) => sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, sodium.from_string(ad), nonce, key),
    memcmp: (a, b) => a.length === b.length && sodium.memcmp(a, b),
    memzero: (b) => sodium.memzero(b),
  };
}
