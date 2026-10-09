import { beforeAll, describe, expect, it } from 'vitest';
import {
  fromBase64Url,
  generateLocalKey,
  isDuressPin,
  makeDuressVerifier,
  parseWrap,
  serialiseWrap,
  toBase64Url,
  toHex,
  unwrapKey,
  wrapKey,
  type SodiumBackend,
} from '../src/index.js';
import { createNodeBackend } from '../src/backend-node.js';

let b: SodiumBackend;
beforeAll(async () => {
  b = await createNodeBackend();
});

describe('local key wrapping (PRD 7.2)', () => {
  it('round-trips with the right PIN and fails with a wrong one', () => {
    const key = generateLocalKey(b);
    const w = wrapKey(b, key, '482913');
    expect(toHex(unwrapKey(b, w, '482913')!)).toBe(toHex(key));
    expect(unwrapKey(b, w, '482914')).toBeNull();
  });
  it('rejects tampered wraps', () => {
    const w = wrapKey(b, generateLocalKey(b), '482913');
    const ct = w.ct.slice();
    ct[0]! ^= 1;
    expect(unwrapKey(b, { ...w, ct }, '482913')).toBeNull();
    const salt = w.salt.slice();
    salt[0]! ^= 1;
    expect(unwrapKey(b, { ...w, salt }, '482913')).toBeNull();
  });
  it('rejects PINs that are not 6 to 12 digits', () => {
    expect(() => wrapKey(b, generateLocalKey(b), '1234')).toThrow();
    expect(() => wrapKey(b, generateLocalKey(b), '12345a')).toThrow();
  });
  it('the stored form contains neither the key nor the PIN', () => {
    const key = generateLocalKey(b);
    const stored = serialiseWrap(wrapKey(b, key, '482913'), toBase64Url);
    for (const enc of [toHex(key), toBase64Url(key), '482913']) expect(stored.includes(enc)).toBe(false);
    expect(toHex(unwrapKey(b, parseWrap(stored, fromBase64Url)!, '482913')!)).toBe(toHex(key));
  });
  it('rejects malformed stored wraps', () => {
    expect(parseWrap('{}', fromBase64Url)).toBeNull();
    expect(parseWrap('not json', fromBase64Url)).toBeNull();
  });
});

describe('duress PIN (PRD 4.8)', () => {
  it('recognises the duress PIN and nothing else', () => {
    const v = makeDuressVerifier(b, '999111');
    expect(isDuressPin(b, v, '999111')).toBe(true);
    expect(isDuressPin(b, v, '482913')).toBe(false);
  });
  it('a database-key wrap never counts as a duress verifier, and the reverse', () => {
    const w = wrapKey(b, generateLocalKey(b), '482913');
    expect(isDuressPin(b, w, '482913')).toBe(false);
    expect(unwrapKey(b, makeDuressVerifier(b, '482913'), '482913')).toBeNull();
  });
  it('a dummy verifier has the same shape as a real one', () => {
    const real = serialiseWrap(makeDuressVerifier(b, '999111'), toBase64Url);
    const dummy = serialiseWrap(makeDuressVerifier(b, null), toBase64Url);
    expect(dummy.length).toBe(real.length);
    expect(isDuressPin(b, makeDuressVerifier(b, null), '999111')).toBe(false);
  });
});
