import type { SodiumBackend } from './backend.js';
import { concat, toHex, utf8, uuidBytes } from './encoding.js';
import { CASE_ROOT_BYTES, deriveCaseRoot } from './keys.js';
import { LABELS } from './labels.js';

/**
 * Per-case recovery codes (PRD 4.7, ADR 0010).
 *
 * Payload, 53 bytes: version (1) ‖ case_id (16) ‖ case_root (32) ‖ checksum (4)
 *   checksum = first 4 bytes of HMAC-SHA256(key = "facto/case-recovery/v1", version ‖ case_id ‖ case_root)
 * The checksum only catches typing mistakes; it is not a secret. The code itself is secret
 * material: it gives that one case's author and username keys, and nothing else.
 *
 * Text: Crockford base32 (no I, L, O, U), 85 characters, shown in groups of 4.
 */
export const RECOVERY_VERSION = 1;
const PAYLOAD_BYTES = 1 + 16 + CASE_ROOT_BYTES;
const CHECKSUM_BYTES = 4;
const TOTAL_BYTES = PAYLOAD_BYTES + CHECKSUM_BYTES;
export const RECOVERY_CODE_CHARS = Math.ceil((TOTAL_BYTES * 8) / 5);

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export type RecoveryError = 'format' | 'checksum' | 'version';
export type DecodedRecovery = { ok: true; caseId: string; caseRoot: Uint8Array } | { ok: false; error: RecoveryError };

function checksum(b: SodiumBackend, payload: Uint8Array): Uint8Array {
  return b.hmacSha256(utf8(LABELS.caseRecovery), payload).slice(0, CHECKSUM_BYTES);
}

function toBase32(bytes: Uint8Array): string {
  let out = '';
  let acc = 0;
  let bits = 0;
  for (const x of bytes) {
    acc = (acc << 8) | x;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(acc >>> (bits - 5)) & 31];
      bits -= 5;
    }
    acc &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(acc << (5 - bits)) & 31];
  return out;
}

function fromBase32(text: string, byteLength: number): Uint8Array | null {
  const out = new Uint8Array(byteLength);
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const ch of text) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    acc = (acc << 5) | v;
    bits += 5;
    if (bits >= 8) {
      if (o >= byteLength) return null;
      out[o++] = (acc >>> (bits - 8)) & 255;
      bits -= 8;
    }
    acc &= (1 << bits) - 1;
  }
  // Leftover padding bits must be zero, so each code has exactly one valid spelling.
  if (o !== byteLength || acc !== 0) return null;
  return out;
}

const uuidString = (b: Uint8Array) => {
  const h = toHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export function encodeRecoveryCode(b: SodiumBackend, caseId: string, caseRoot: Uint8Array): string {
  if (caseRoot.length !== CASE_ROOT_BYTES) throw new Error('case root must be 32 bytes');
  const payload = concat(Uint8Array.of(RECOVERY_VERSION), uuidBytes(caseId), caseRoot);
  const all = concat(payload, checksum(b, payload));
  const text = toBase32(all);
  b.memzero(payload);
  b.memzero(all);
  return text.match(/.{1,4}/g)!.join('-');
}

/** Accepts any case, spaces and dashes; reads I and L as 1, O as 0 (Crockford). */
export function normaliseRecoveryCode(text: string): string {
  return text
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0');
}

export function decodeRecoveryCode(b: SodiumBackend, text: string): DecodedRecovery {
  const clean = normaliseRecoveryCode(text);
  if (clean.length !== RECOVERY_CODE_CHARS) return { ok: false, error: 'format' };
  const all = fromBase32(clean, TOTAL_BYTES);
  if (!all) return { ok: false, error: 'format' };
  const payload = all.subarray(0, PAYLOAD_BYTES);
  if (!b.memcmp(checksum(b, payload), all.subarray(PAYLOAD_BYTES))) return { ok: false, error: 'checksum' };
  if (payload[0] !== RECOVERY_VERSION) return { ok: false, error: 'version' };
  const caseId = uuidString(payload.subarray(1, 17));
  const caseRoot = payload.slice(17, 17 + CASE_ROOT_BYTES);
  b.memzero(all);
  return { ok: true, caseId, caseRoot };
}

/** The code for one case created on this device. */
export function recoveryCodeFor(b: SodiumBackend, deviceSecret: Uint8Array, caseId: string): string {
  const root = deriveCaseRoot(b, deviceSecret, caseId);
  try {
    return encodeRecoveryCode(b, caseId, root);
  } finally {
    b.memzero(root);
  }
}
