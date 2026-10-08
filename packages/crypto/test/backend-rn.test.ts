import { readFileSync } from 'node:fs';
import sodium from 'libsodium-wrappers-sumo';
import { beforeAll, describe, expect, it } from 'vitest';
import { createNodeBackend } from '../src/backend-node.js';
import { createReactNativeBackend, type ReactNativeSodium } from '../src/backend-rn.js';
import {
  fromHex,
  generateLocalKey,
  InMemoryReplayCache,
  isDuressPin,
  makeDuressVerifier,
  openEnvelope,
  sealEnvelope,
  toHex,
  unwrapKey,
  utf8,
  wrapKey,
  type SodiumBackend,
} from '../src/index.js';
import { computeDeterministicVectors } from '../scripts/compute-vectors.js';

const vectors = JSON.parse(readFileSync(new URL('../test-vectors.json', import.meta.url), 'utf8'));

/**
 * Stand-in with the exact react-native-libsodium 1.7 signatures, backed by libsodium on Node.
 * It mirrors the native quirks the adapter must handle: HKDF info arrives as a string and is
 * UTF-8 encoded (as the C++ binding does), and AEAD associated data is a string.
 */
async function standIn(): Promise<ReactNativeSodium> {
  await sodium.ready;
  const node = await createNodeBackend();
  return {
    randombytes_buf: (n) => sodium.randombytes_buf(n),
    _unstable_crypto_kdf_hkdf_sha256_extract: (key, salt) => node.hkdfExtract(salt, key),
    _unstable_crypto_kdf_hkdf_sha256_expand: (key, info, length) => node.hkdfExpand(key, new TextEncoder().encode(info), length),
    crypto_sign_seed_keypair: (seed) => sodium.crypto_sign_seed_keypair(seed),
    crypto_sign_detached: (m, sk) => sodium.crypto_sign_detached(m, sk),
    crypto_sign_verify_detached: (sig, m, pk) => sodium.crypto_sign_verify_detached(sig, m, pk),
    crypto_box_keypair: () => sodium.crypto_box_keypair(),
    crypto_box_seal: (m, pk) => sodium.crypto_box_seal(m, pk),
    crypto_box_seal_open: (c, pk, sk) => sodium.crypto_box_seal_open(c, pk, sk),
    crypto_pwhash: (len, pw, salt, ops, mem, alg) => sodium.crypto_pwhash(len, pw, salt, ops, mem, alg),
    crypto_pwhash_ALG_ARGON2ID13: sodium.crypto_pwhash_ALG_ARGON2ID13,
    crypto_aead_xchacha20poly1305_ietf_encrypt: (m, ad, nsec, npub, k) => sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(m, ad, nsec, npub, k),
    crypto_aead_xchacha20poly1305_ietf_decrypt: (nsec, c, ad, npub, k) => sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(nsec, c, ad, npub, k),
  };
}

let rn: SodiumBackend;
let node: SodiumBackend;
beforeAll(async () => {
  rn = createReactNativeBackend(await standIn());
  node = await createNodeBackend();
});

describe('phone backend adapter reproduces the vectors byte for byte', () => {
  it('RFC 5869 HKDF and RFC 4231 HMAC (HMAC computed through HKDF-Extract)', () => {
    const h = vectors.rfc.hkdf;
    const prk = rn.hkdfExtract(fromHex(h.salt), fromHex(h.ikm));
    expect(toHex(prk)).toBe(h.prk);
    // RFC info f0..f9 is not ASCII: the phone binding cannot take it, and the adapter must refuse.
    expect(() => rn.hkdfExpand(prk, fromHex(h.info), h.length)).toThrow(/ASCII/);
    const m = vectors.rfc.hmac;
    expect(toHex(rn.hmacSha256(fromHex(m.key), fromHex(m.data)))).toBe(m.mac);
  });
  it('keys, nullifiers and signatures', () => {
    const fresh = computeDeterministicVectors(rn);
    expect(fresh.keys).toEqual(vectors.keys);
    expect(fresh.nullifiers).toEqual(vectors.nullifiers);
    expect(fresh.signatures).toEqual(vectors.signatures);
  });
  it('opens the stored vector envelope', () => {
    const e = vectors.envelope;
    const out = openEnvelope(rn, e.envelope, { publicKey: fromHex(e.intake_public_key), privateKey: fromHex(e.intake_private_key) }, { now: e.now, replay: new InMemoryReplayCache() });
    expect(toHex(out)).toBe(e.payload);
  });
});

describe('cross-runtime interoperability', () => {
  it('an envelope sealed on the phone opens on the server', () => {
    const intake = node.boxKeypair();
    const env = sealEnvelope(rn, utf8('{"kind":"vote"}'), intake.publicKey, { ttlDays: 2, now: 1_791_100_000 });
    expect(toHex(openEnvelope(node, env, intake, { now: 1_791_100_000, replay: new InMemoryReplayCache() }))).toBe(toHex(utf8('{"kind":"vote"}')));
  });
  it('a key wrapped on one runtime unwraps on the other, and duress verifiers agree', () => {
    const key = generateLocalKey(rn);
    expect(toHex(unwrapKey(node, wrapKey(rn, key, '482913'), '482913')!)).toBe(toHex(key));
    expect(isDuressPin(rn, makeDuressVerifier(node, '999111'), '999111')).toBe(true);
  });
  it('constant-time memcmp and memzero', () => {
    expect(rn.memcmp(utf8('abc'), utf8('abc'))).toBe(true);
    expect(rn.memcmp(utf8('abc'), utf8('abd'))).toBe(false);
    expect(rn.memcmp(utf8('abc'), utf8('ab'))).toBe(false);
    const buf = utf8('secret');
    rn.memzero(buf);
    expect([...buf].every((x) => x === 0)).toBe(true);
  });
});
