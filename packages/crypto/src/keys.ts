import type { SodiumBackend } from './backend.js';
import { utf8 } from './encoding.js';
import { LABELS, type Label } from './labels.js';

export const DEVICE_SECRET_BYTES = 32;
export const CASE_ROOT_BYTES = 32;

/** PRD 5.1: 256 random bits, generated on the phone and never sent anywhere. */
export function generateDeviceSecret(b: SodiumBackend): Uint8Array {
  return b.randomBytes(DEVICE_SECRET_BYTES);
}

/** Random UUIDv4 from libsodium randomness (PRD 5.3, 5.7). */
export function randomUuidV4(b: SodiumBackend): string {
  const r = b.randomBytes(16);
  r[6] = (r[6]! & 0x0f) | 0x40;
  r[8] = (r[8]! & 0x3f) | 0x80;
  const h = Array.from(r, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * HKDF info strings are ASCII only (ADR 0008): the phone binding passes `info` as a JS string,
 * so ASCII guarantees both runtimes hash identical bytes. Scoped labels are `label + "/" + uuid`.
 */
function scopedInfo(label: Label, scopeId: string): Uint8Array {
  if (!UUID.test(scopeId)) throw new Error('scope ID must be a lowercase UUID');
  return utf8(`${label}/${scopeId}`);
}

function assertLength(key: Uint8Array, n: number, what: string) {
  if (key.length !== n) throw new Error(`${what} must be ${n} bytes`);
}

/** HKDF-SHA256(ikm, salt = empty, info) → 32 bytes. Intermediate PRK is wiped. */
function hkdf(b: SodiumBackend, ikm: Uint8Array, info: Uint8Array): Uint8Array {
  const prk = b.hkdfExtract(new Uint8Array(0), ikm);
  try {
    return b.hkdfExpand(prk, info, 32);
  } finally {
    b.memzero(prk);
  }
}

/**
 * ADR 0008: case_root = HKDF(device secret, "facto/case-root/v1/<case id>").
 * Holding a case root gives the keys of that one case only; it is what a per-case recovery code carries (PRD 4.7).
 */
export function deriveCaseRoot(b: SodiumBackend, deviceSecret: Uint8Array, caseId: string): Uint8Array {
  assertLength(deviceSecret, DEVICE_SECRET_BYTES, 'device secret');
  return hkdf(b, deviceSecret, scopedInfo(LABELS.caseRoot, caseId));
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

function keyPairFromRoot(b: SodiumBackend, caseRoot: Uint8Array, label: typeof LABELS.caseAuthor | typeof LABELS.caseIdentity): KeyPair {
  assertLength(caseRoot, CASE_ROOT_BYTES, 'case root');
  const seed = hkdf(b, caseRoot, utf8(label));
  try {
    return b.signSeedKeypair(seed);
  } finally {
    b.memzero(seed);
  }
}

/** PRD 5.3: owns, edits and deletes one case. author seed = HKDF(case root, "facto/case-author/v1"). */
export const caseAuthorKeyFromRoot = (b: SodiumBackend, caseRoot: Uint8Array): KeyPair => keyPairFromRoot(b, caseRoot, LABELS.caseAuthor);

/** PRD 5.2: comments under one username inside one case. identity seed = HKDF(case root, "facto/case-identity/v1"). */
export const caseIdentityKeyFromRoot = (b: SodiumBackend, caseRoot: Uint8Array): KeyPair => keyPairFromRoot(b, caseRoot, LABELS.caseIdentity);

function fromDeviceSecret(b: SodiumBackend, deviceSecret: Uint8Array, caseId: string, derive: (b: SodiumBackend, root: Uint8Array) => KeyPair): KeyPair {
  const root = deriveCaseRoot(b, deviceSecret, caseId);
  try {
    return derive(b, root);
  } finally {
    b.memzero(root);
  }
}

export const deriveCaseAuthorKey = (b: SodiumBackend, deviceSecret: Uint8Array, caseId: string): KeyPair =>
  fromDeviceSecret(b, deviceSecret, caseId, caseAuthorKeyFromRoot);

export const deriveCaseIdentityKey = (b: SodiumBackend, deviceSecret: Uint8Array, caseId: string): KeyPair =>
  fromDeviceSecret(b, deviceSecret, caseId, caseIdentityKeyFromRoot);

/**
 * PRD 5.4: nullifier = HMAC-SHA256(device secret, "facto/<purpose>/v1/<target id>").
 * One per (device, target, purpose); unlinkable across targets without the device secret.
 * Derived from the device secret, not a case root, so a recovery code never restores votes (PRD 4.7).
 */
export function nullifier(b: SodiumBackend, deviceSecret: Uint8Array, purpose: 'vote' | 'flag', targetId: string): Uint8Array {
  assertLength(deviceSecret, DEVICE_SECRET_BYTES, 'device secret');
  return b.hmacSha256(deviceSecret, scopedInfo(LABELS[purpose], targetId));
}

