import type { SodiumBackend } from './backend.js';
import { concat, utf8, uuidBytes } from './encoding.js';
import { LABELS, type Label } from './labels.js';

export const DEVICE_SECRET_BYTES = 32;

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

/** HKDF info: purpose label, a 0x00 separator, then the 16 raw bytes of the scope ID. */
const info = (label: Label, scopeId: string) => concat(utf8(label), Uint8Array.of(0), uuidBytes(scopeId));

function assertSecret(deviceSecret: Uint8Array) {
  if (deviceSecret.length !== DEVICE_SECRET_BYTES) throw new Error('device secret must be 32 bytes');
}

/** seed = HKDF-SHA256(ikm = device secret, salt = empty, info = label ‖ 0x00 ‖ scope ID). */
export function deriveSeed(b: SodiumBackend, deviceSecret: Uint8Array, label: Label, scopeId: string): Uint8Array {
  assertSecret(deviceSecret);
  const prk = b.hkdfExtract(new Uint8Array(0), deviceSecret);
  try {
    return b.hkdfExpand(prk, info(label, scopeId), 32);
  } finally {
    b.memzero(prk);
  }
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

function keyPairFor(b: SodiumBackend, deviceSecret: Uint8Array, label: Label, caseId: string): KeyPair {
  const seed = deriveSeed(b, deviceSecret, label, caseId);
  try {
    return b.signSeedKeypair(seed);
  } finally {
    b.memzero(seed);
  }
}

/** PRD 5.3: owns, edits and deletes one case. */
export const deriveCaseAuthorKey = (b: SodiumBackend, deviceSecret: Uint8Array, caseId: string): KeyPair =>
  keyPairFor(b, deviceSecret, LABELS.caseAuthor, caseId);

/** PRD 5.2: comments under one username inside one case. */
export const deriveCaseIdentityKey = (b: SodiumBackend, deviceSecret: Uint8Array, caseId: string): KeyPair =>
  keyPairFor(b, deviceSecret, LABELS.caseIdentity, caseId);

/**
 * PRD 5.4: nullifier = HMAC-SHA256(device secret, label ‖ 0x00 ‖ target ID).
 * One per (device, target, purpose); unlinkable across targets without the device secret.
 */
export function nullifier(b: SodiumBackend, deviceSecret: Uint8Array, purpose: 'vote' | 'flag', targetId: string): Uint8Array {
  assertSecret(deviceSecret);
  return b.hmacSha256(deviceSecret, info(LABELS[purpose], targetId));
}
