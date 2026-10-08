import { readFileSync } from 'node:fs';
import { CaseV1, CommentV1 } from '@facto/schema';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  deriveCaseAuthorKey,
  deriveCaseIdentityKey,
  EnvelopeError,
  fromBase64Url,
  fromHex,
  generateDeviceSecret,
  InMemoryReplayCache,
  nullifier,
  openEnvelope,
  paddedLength,
  randomUuidV4,
  sealEnvelope,
  signPayload,
  toBase64Url,
  toHex,
  utf8,
  verifyPayload,
  type SodiumBackend,
} from '../src/index.js';
import { createNodeBackend } from '../src/backend-node.js';
import { computeDeterministicVectors } from '../scripts/compute-vectors.js';
import { CASE_A, CASE_B, vectorCase, vectorComment } from '../scripts/vector-inputs.js';

const vectors = JSON.parse(readFileSync(new URL('../test-vectors.json', import.meta.url), 'utf8'));
const NOW = 1_791_100_000;
let b: SodiumBackend;
beforeAll(async () => {
  b = await createNodeBackend();
});

describe('primitives match their RFC test vectors', () => {
  it('HKDF-SHA256 (RFC 5869 A.1) through libsodium', () => {
    const r = vectors.rfc.hkdf;
    const prk = b.hkdfExtract(fromHex(r.salt), fromHex(r.ikm));
    expect(toHex(prk)).toBe(r.prk);
    expect(toHex(b.hkdfExpand(prk, fromHex(r.info), r.length))).toBe(r.okm);
  });
  it('HMAC-SHA256 (RFC 4231 case 2)', () => {
    const r = vectors.rfc.hmac;
    expect(toHex(b.hmacSha256(fromHex(r.key), fromHex(r.data)))).toBe(r.mac);
  });
  it('HMAC-SHA256 equals HKDF-Extract with the key as salt, so the phone can compute nullifiers with HKDF only', () => {
    const key = b.randomBytes(32);
    const msg = b.randomBytes(40);
    expect(toHex(b.hkdfExtract(key, msg))).toBe(toHex(b.hmacSha256(key, msg)));
  });
});

describe('test vectors', () => {
  it('reproduce byte for byte', () => {
    const fresh = computeDeterministicVectors(b);
    expect(fresh.keys).toEqual(vectors.keys);
    expect(fresh.nullifiers).toEqual(vectors.nullifiers);
    expect(fresh.signatures).toEqual(vectors.signatures);
  });
  it('the stored envelope still opens', () => {
    const e = vectors.envelope;
    const out = openEnvelope(
      b,
      e.envelope,
      { publicKey: fromHex(e.intake_public_key), privateKey: fromHex(e.intake_private_key) },
      { now: e.now, replay: new InMemoryReplayCache() },
    );
    expect(toHex(out)).toBe(e.payload);
  });
});

describe('unlinkability (PRD 5.0, 5.2)', () => {
  const ds = () => generateDeviceSecret(b);

  it('author and identity keys differ per case and per purpose', () => {
    const s = ds();
    const keys = [
      deriveCaseAuthorKey(b, s, CASE_A),
      deriveCaseAuthorKey(b, s, CASE_B),
      deriveCaseIdentityKey(b, s, CASE_A),
      deriveCaseIdentityKey(b, s, CASE_B),
    ].map((k) => toHex(k.publicKey));
    expect(new Set(keys).size).toBe(4);
  });
  it('the same case gives the same key on the same device (continuity inside one case)', () => {
    const s = ds();
    expect(toHex(deriveCaseIdentityKey(b, s, CASE_A).publicKey)).toBe(toHex(deriveCaseIdentityKey(b, s, CASE_A).publicKey));
  });
  it('different devices get different keys for the same case', () => {
    expect(toHex(deriveCaseIdentityKey(b, ds(), CASE_A).publicKey)).not.toBe(toHex(deriveCaseIdentityKey(b, ds(), CASE_A).publicKey));
  });
  it('vote and flag nullifiers differ per target and per purpose', () => {
    const s = ds();
    const n = [nullifier(b, s, 'vote', CASE_A), nullifier(b, s, 'vote', CASE_B), nullifier(b, s, 'flag', CASE_A)].map(toHex);
    expect(new Set(n).size).toBe(3);
  });
  it('derived keys for two cases share no aligned bytes beyond chance', () => {
    const s = ds();
    let same = 0;
    for (let i = 0; i < 200; i++) {
      const id1 = randomUuidV4(b);
      const id2 = randomUuidV4(b);
      const a = deriveCaseIdentityKey(b, s, id1).publicKey;
      const c = deriveCaseIdentityKey(b, s, id2).publicKey;
      for (let j = 0; j < 32; j++) if (a[j] === c[j]) same++;
    }
    // Expected about 200 * 32 / 256 = 25 matching positions by chance.
    expect(same).toBeLessThan(60);
  });
  it('random UUIDs are version 4', () => {
    expect(randomUuidV4(b)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('signatures', () => {
  const setup = () => {
    const s = generateDeviceSecret(b);
    const author = deriveCaseAuthorKey(b, s, CASE_A);
    const c = { kind: 'case' as const, payload: vectorCase(toBase64Url(author.publicKey)) };
    return { s, author, c, sig: signPayload(b, c, author.privateKey) };
  };
  it('payloads used for signing are valid schema payloads', () => {
    const { c } = setup();
    expect(CaseV1.safeParse(c.payload).success).toBe(true);
    expect(CommentV1.safeParse(vectorComment(c.payload.author_pubkey)).success).toBe(true);
  });
  it('verifies an untouched case', () => {
    const { c, sig } = setup();
    expect(verifyPayload(b, c, sig)).toBe(true);
  });
  it.each([
    ['title', { title: 'Autre titre' }],
    ['body', { body: 'Texte modifié' }],
    ['region', { region_id: CASE_B }],
    ['time bucket', { created_hour: 1_791_100_800 }],
    ['version', { version: 2 }],
  ])('rejects a case with a modified %s', (_, change) => {
    const { c, sig } = setup();
    expect(verifyPayload(b, { kind: 'case', payload: { ...c.payload, ...change } }, sig)).toBe(false);
  });
  it('rejects a signature replayed as another payload type', () => {
    const { author } = setup();
    const comment = { kind: 'comment' as const, payload: vectorComment(toBase64Url(author.publicKey)) };
    const sig = signPayload(b, comment, author.privateKey);
    expect(verifyPayload(b, comment, sig)).toBe(true);
    // Same key, same signature, presented as a case: the purpose label differs, so it fails.
    expect(verifyPayload(b, { kind: 'case', payload: vectorCase(toBase64Url(author.publicKey)) }, sig)).toBe(false);
  });
  it('refuses to sign with a key that does not match the payload', () => {
    const { c } = setup();
    const other = deriveCaseAuthorKey(b, generateDeviceSecret(b), CASE_A);
    expect(() => signPayload(b, c, other.privateKey)).toThrow();
  });
  it('rejects malformed signatures without throwing', () => {
    const { c } = setup();
    expect(verifyPayload(b, c, 'not-base64!')).toBe(false);
    expect(verifyPayload(b, c, 'AAAA')).toBe(false);
  });
  it('rejects non-NFC text before signing', () => {
    const { c, author } = setup();
    expect(() => signPayload(b, { kind: 'case', payload: { ...c.payload, title: 'é' } }, author.privateKey)).toThrow(/NFC/);
  });
});

describe('sealed envelopes (PRD 5.8)', () => {
  const intake = () => b.boxKeypair();
  const payload = utf8('{"kind":"comment"}');

  it('round-trips and pads to fixed 4 KB buckets', () => {
    const k = intake();
    const small = sealEnvelope(b, payload, k.publicKey, { ttlDays: 2, now: NOW });
    const larger = sealEnvelope(b, new Uint8Array(3000), k.publicKey, { ttlDays: 2, now: NOW });
    expect(fromBase64Url(small.box).length).toBe(fromBase64Url(larger.box).length);
    expect(paddedLength(5000)).toBe(8192);
    expect(toHex(openEnvelope(b, small, k, { now: NOW, replay: new InMemoryReplayCache() }))).toBe(toHex(payload));
  });
  it('uses a fresh random message ID every time', () => {
    const k = intake();
    const ids = new Set(Array.from({ length: 50 }, () => sealEnvelope(b, payload, k.publicKey, { ttlDays: 2, now: NOW }).id));
    expect(ids.size).toBe(50);
  });
  it('rejects a replayed message ID', () => {
    const k = intake();
    const env = sealEnvelope(b, payload, k.publicKey, { ttlDays: 2, now: NOW });
    const replay = new InMemoryReplayCache();
    openEnvelope(b, env, k, { now: NOW, replay });
    expect(() => openEnvelope(b, env, k, { now: NOW, replay })).toThrow(new EnvelopeError('replayed'));
  });
  it('rejects a relay that swaps the outer message ID to dodge replay protection', () => {
    const k = intake();
    const env = sealEnvelope(b, payload, k.publicKey, { ttlDays: 2, now: NOW });
    const swapped = { ...env, id: toBase64Url(b.randomBytes(16)) };
    expect(() => openEnvelope(b, swapped, k, { now: NOW, replay: new InMemoryReplayCache() })).toThrow(new EnvelopeError('tampered'));
  });
  it('rejects an extended expiry', () => {
    const k = intake();
    const env = sealEnvelope(b, payload, k.publicKey, { ttlDays: 2, now: NOW });
    expect(() => openEnvelope(b, { ...env, exp: env.exp + 1 }, k, { now: NOW, replay: new InMemoryReplayCache() })).toThrow(
      new EnvelopeError('tampered'),
    );
  });
  it('rejects a modified ciphertext', () => {
    const k = intake();
    const env = sealEnvelope(b, payload, k.publicKey, { ttlDays: 2, now: NOW });
    const box = fromBase64Url(env.box);
    box[100] = box[100]! ^ 1;
    expect(() => openEnvelope(b, { ...env, box: toBase64Url(box) }, k, { now: NOW, replay: new InMemoryReplayCache() })).toThrow(
      new EnvelopeError('tampered'),
    );
  });
  it('rejects an envelope sealed to another intake key', () => {
    const env = sealEnvelope(b, payload, intake().publicKey, { ttlDays: 2, now: NOW });
    expect(() => openEnvelope(b, env, intake(), { now: NOW, replay: new InMemoryReplayCache() })).toThrow(new EnvelopeError('tampered'));
  });
  it('rejects expired envelopes and extra fields', () => {
    const k = intake();
    const env = sealEnvelope(b, payload, k.publicKey, { ttlDays: 2, now: NOW });
    expect(() => openEnvelope(b, env, k, { now: NOW + 3 * 86400, replay: new InMemoryReplayCache() })).toThrow(new EnvelopeError('expired'));
    expect(() => openEnvelope(b, { ...env, sender: 'x' }, k, { now: NOW, replay: new InMemoryReplayCache() })).toThrow(
      new EnvelopeError('malformed'),
    );
  });
  it('does not remember IDs of forged envelopes', () => {
    const k = intake();
    const replay = new InMemoryReplayCache();
    const forged = { v: 1, id: toBase64Url(b.randomBytes(16)), exp: 20_725, box: toBase64Url(b.randomBytes(4200)) };
    expect(() => openEnvelope(b, forged, k, { now: NOW, replay })).toThrow();
    expect(replay.size).toBe(0);
  });
  it('purges replay entries after expiry', () => {
    const replay = new InMemoryReplayCache();
    replay.remember('a', 10);
    replay.remember('b', 12);
    replay.purge(11);
    expect(replay.size).toBe(1);
  });
});

describe('secrets never leave in outbound data (CLAUDE.md invariant 6)', () => {
  it('an envelope carrying a signed case contains no secret material in any encoding', () => {
    const s = generateDeviceSecret(b);
    const author = deriveCaseAuthorKey(b, s, CASE_A);
    const c = { kind: 'case' as const, payload: vectorCase(toBase64Url(author.publicKey)) };
    const body = utf8(JSON.stringify({ ...c, sig: signPayload(b, c, author.privateKey) }));
    const k = b.boxKeypair();

    // Everything that would go to the network or a log.
    const sent: string[] = [];
    const fakeFetch = (_url: string, init: { body: string }) => sent.push(init.body);
    const fakeLog = (...args: unknown[]) => sent.push(args.map(String).join(' '));
    const env = sealEnvelope(b, body, k.publicKey, { ttlDays: 7, now: NOW });
    fakeFetch('https://intake.example/submit', { body: JSON.stringify(env) });
    fakeLog('submitted', env.id);
    sent.push(new TextDecoder().decode(body)); // even the plaintext payload must hold no secret

    const secrets = [s, author.privateKey, author.privateKey.subarray(0, 32)];
    for (const secret of secrets) {
      for (const encoded of [toHex(secret), toBase64Url(secret), Buffer.from(secret).toString('base64')]) {
        for (const out of sent) expect(out.includes(encoded)).toBe(false);
      }
    }
  });
});
