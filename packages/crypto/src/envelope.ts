import { dayNumber, ENVELOPE_VERSION, EnvelopeV1, PADDING_BUCKET } from '@facto/schema';
import type { SodiumBackend } from './backend.js';
import { concat, fromBase64Url, toBase64Url } from './encoding.js';
import type { ReplayCache } from './replay.js';

/**
 * Sealed submission envelope v1 (PRD 5.8, ADR 0002).
 *
 * Sealed plaintext layout:
 *   u8  envelope version
 *   16  message ID (repeated from outside, so it cannot be swapped)
 *   u32 expiry day (repeated from outside, so it cannot be extended)
 *   u32 payload length
 *   ... payload
 *   ... zero padding to a multiple of PADDING_BUCKET
 */
const HEADER = 1 + 16 + 4 + 4;

export class EnvelopeError extends Error {
  constructor(readonly reason: 'malformed' | 'expired' | 'tampered' | 'replayed' | 'too-far-in-future') {
    super(`envelope rejected: ${reason}`);
  }
}

const u32 = (n: number) => Uint8Array.of((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255);
const readU32 = (b: Uint8Array, o: number) => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;

export function paddedLength(payloadLength: number): number {
  return Math.ceil((HEADER + payloadLength) / PADDING_BUCKET) * PADDING_BUCKET;
}

export interface SealOptions {
  /** Days the envelope stays valid (PRD 5.8 defaults: 7 for cases, 2 for votes and comments). */
  ttlDays: number;
  /** Current Unix time in seconds; only its day is used. */
  now: number;
}

export function sealEnvelope(b: SodiumBackend, payload: Uint8Array, intakePublicKey: Uint8Array, opts: SealOptions): EnvelopeV1 {
  if (!Number.isInteger(opts.ttlDays) || opts.ttlDays < 1 || opts.ttlDays > 30) throw new Error('ttlDays out of range');
  const id = b.randomBytes(16);
  const exp = dayNumber(opts.now) + opts.ttlDays;
  const plain = new Uint8Array(paddedLength(payload.length));
  plain.set(concat(Uint8Array.of(ENVELOPE_VERSION), id, u32(exp), u32(payload.length), payload));
  try {
    return { v: ENVELOPE_VERSION, id: toBase64Url(id), exp, box: toBase64Url(b.boxSeal(plain, intakePublicKey)) };
  } finally {
    b.memzero(plain);
  }
}

export interface OpenOptions {
  now: number;
  replay: ReplayCache;
  /** Longest TTL the intake accepts; protects against envelopes claiming a far-future expiry. */
  maxTtlDays?: number;
}

/** Opens an envelope in the intake service's memory. Plaintext must never be logged (PRD 5.8). */
export function openEnvelope(
  b: SodiumBackend,
  input: unknown,
  intake: { publicKey: Uint8Array; privateKey: Uint8Array },
  opts: OpenOptions,
): Uint8Array {
  const parsed = EnvelopeV1.safeParse(input);
  if (!parsed.success) throw new EnvelopeError('malformed');
  const env = parsed.data;
  const today = dayNumber(opts.now);
  if (env.exp < today) throw new EnvelopeError('expired');
  if (env.exp > today + (opts.maxTtlDays ?? 7)) throw new EnvelopeError('too-far-in-future');

  let plain: Uint8Array;
  try {
    plain = b.boxSealOpen(fromBase64Url(env.box), intake.publicKey, intake.privateKey);
  } catch {
    throw new EnvelopeError('tampered');
  }
  if (plain.length < HEADER || plain.length % PADDING_BUCKET !== 0 || plain[0] !== ENVELOPE_VERSION) throw new EnvelopeError('tampered');
  const innerId = plain.subarray(1, 17);
  const innerExp = readU32(plain, 17);
  const len = readU32(plain, 21);
  if (!b.memcmp(innerId, fromBase64Url(env.id)) || innerExp !== env.exp || HEADER + len > plain.length) {
    b.memzero(plain);
    throw new EnvelopeError('tampered');
  }
  // Only remember the ID once the envelope is proven authentic, so junk cannot fill the cache.
  if (!opts.replay.remember(env.id, env.exp)) {
    b.memzero(plain);
    throw new EnvelopeError('replayed');
  }
  const payload = plain.slice(HEADER, HEADER + len);
  b.memzero(plain);
  return payload;
}
