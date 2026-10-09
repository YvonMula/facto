import { AEAD_KEY_BYTES, AEAD_NONCE_BYTES, PWHASH_MEM_INTERACTIVE, PWHASH_OPS_INTERACTIVE, PWHASH_SALT_BYTES, type SodiumBackend } from './backend.js';
import { utf8 } from './encoding.js';
import { LABELS } from './labels.js';

/**
 * Local key wrapping (PRD 7.2): the SQLCipher database key is stored wrapped under a key
 * derived from the app PIN with Argon2id. The wrap is itself kept in the Keystore/Keychain,
 * so an attacker needs both the unlocked hardware store and the PIN.
 *
 * Limit (stated in the threat model): a 6-digit PIN has 10^6 values. If the hardware store is
 * extracted, an offline attacker can try them all; Argon2id only slows each guess.
 */
export const LOCAL_KEY_BYTES = 32;
export const WRAP_VERSION = 1;

export interface WrappedKey {
  v: typeof WRAP_VERSION;
  salt: Uint8Array;
  nonce: Uint8Array;
  ct: Uint8Array;
}

/** Associated data binds each wrap to its purpose, so a duress verifier can never unwrap as a database key. */
const AD_DB_KEY = `${LABELS.localDb}/db-key`;
const AD_DURESS = `${LABELS.localDb}/duress`;
/** What a duress verifier encrypts. Its content is not secret; only who can decrypt it matters. */
const DURESS_MARKER = utf8('facto-duress-v1');

export function normalisePin(pin: string): Uint8Array {
  if (!/^[0-9]{6,12}$/.test(pin)) throw new Error('PIN must be 6 to 12 digits');
  return utf8(pin);
}

function pinKey(b: SodiumBackend, pin: string, salt: Uint8Array): Uint8Array {
  const pw = normalisePin(pin);
  try {
    return b.pwhashArgon2id(AEAD_KEY_BYTES, pw, salt, PWHASH_OPS_INTERACTIVE, PWHASH_MEM_INTERACTIVE);
  } finally {
    b.memzero(pw);
  }
}

function seal(b: SodiumBackend, plaintext: Uint8Array, pin: string, ad: string): WrappedKey {
  const salt = b.randomBytes(PWHASH_SALT_BYTES);
  const nonce = b.randomBytes(AEAD_NONCE_BYTES);
  const k = pinKey(b, pin, salt);
  try {
    return { v: WRAP_VERSION, salt, nonce, ct: b.aeadEncrypt(plaintext, ad, nonce, k) };
  } finally {
    b.memzero(k);
  }
}

function open(b: SodiumBackend, w: WrappedKey, pin: string, ad: string): Uint8Array | null {
  if (w.v !== WRAP_VERSION) return null;
  let k: Uint8Array;
  try {
    k = pinKey(b, pin, w.salt);
  } catch {
    return null;
  }
  try {
    return b.aeadDecrypt(w.ct, ad, w.nonce, k);
  } catch {
    return null;
  } finally {
    b.memzero(k);
  }
}

export function generateLocalKey(b: SodiumBackend): Uint8Array {
  return b.randomBytes(LOCAL_KEY_BYTES);
}

export function wrapKey(b: SodiumBackend, key: Uint8Array, pin: string): WrappedKey {
  if (key.length !== LOCAL_KEY_BYTES) throw new Error('local key must be 32 bytes');
  return seal(b, key, pin, AD_DB_KEY);
}

/** Returns the key, or null for a wrong PIN or a damaged wrap. */
export function unwrapKey(b: SodiumBackend, w: WrappedKey, pin: string): Uint8Array | null {
  const k = open(b, w, pin, AD_DB_KEY);
  return k && k.length === LOCAL_KEY_BYTES ? k : null;
}

/**
 * Duress PIN (PRD 4.8, 7.2). A verifier is always stored: with a real duress PIN, or with a
 * random one nobody knows, so the stored data never reveals whether a duress PIN was set.
 */
export function makeDuressVerifier(b: SodiumBackend, duressPin: string | null): WrappedKey {
  const pin = duressPin ?? randomPin(b);
  return seal(b, DURESS_MARKER, pin, AD_DURESS);
}

export function isDuressPin(b: SodiumBackend, verifier: WrappedKey, pin: string): boolean {
  const m = open(b, verifier, pin, AD_DURESS);
  return m !== null && b.memcmp(m, DURESS_MARKER);
}

/** A random 12-digit PIN from libsodium randomness (rejection sampling avoids modulo bias). */
function randomPin(b: SodiumBackend): string {
  let out = '';
  while (out.length < 12) {
    const x = b.randomBytes(1)[0]!;
    if (x < 250) out += String(x % 10);
  }
  return out;
}

/** Serialisation for the hardware-backed store: base64url fields in a small JSON object. */
export function serialiseWrap(w: WrappedKey, encode: (b: Uint8Array) => string): string {
  return JSON.stringify({ v: w.v, salt: encode(w.salt), nonce: encode(w.nonce), ct: encode(w.ct) });
}

export function parseWrap(text: string, decode: (s: string) => Uint8Array): WrappedKey | null {
  try {
    const j = JSON.parse(text) as { v?: unknown; salt?: unknown; nonce?: unknown; ct?: unknown };
    if (j.v !== WRAP_VERSION || typeof j.salt !== 'string' || typeof j.nonce !== 'string' || typeof j.ct !== 'string') return null;
    const w = { v: WRAP_VERSION, salt: decode(j.salt), nonce: decode(j.nonce), ct: decode(j.ct) } as const;
    if (w.salt.length !== PWHASH_SALT_BYTES || w.nonce.length !== AEAD_NONCE_BYTES) return null;
    return w;
  } catch {
    return null;
  }
}
