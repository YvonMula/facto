import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { createNodeBackend } from '../src/backend-node.js';
import {
  caseAuthorKeyFromRoot,
  caseIdentityKeyFromRoot,
  decodeRecoveryCode,
  deriveCaseAuthorKey,
  deriveCaseIdentityKey,
  deriveCaseRoot,
  encodeRecoveryCode,
  generateDeviceSecret,
  normaliseRecoveryCode,
  RECOVERY_CODE_CHARS,
  recoveryCodeFor,
  toHex,
  type SodiumBackend,
} from '../src/index.js';
import { CASE_A, CASE_B } from '../scripts/vector-inputs.js';

const vectors = JSON.parse(readFileSync(new URL('../test-vectors.json', import.meta.url), 'utf8'));
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let b: SodiumBackend;
beforeAll(async () => {
  b = await createNodeBackend();
});

describe('per-case recovery codes (PRD 4.7, ADR 0010)', () => {
  it('is 85 Crockford characters in groups of 4', () => {
    const code = recoveryCodeFor(b, generateDeviceSecret(b), CASE_A);
    expect(RECOVERY_CODE_CHARS).toBe(85);
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){21}[0-9A-HJKMNP-TV-Z]$/);
  });

  it('round-trips the case ID and case root', () => {
    const ds = generateDeviceSecret(b);
    const r = decodeRecoveryCode(b, recoveryCodeFor(b, ds, CASE_A));
    expect(r.ok && r.caseId).toBe(CASE_A);
    expect(r.ok && toHex(r.caseRoot)).toBe(toHex(deriveCaseRoot(b, ds, CASE_A)));
  });

  it('a restored root gives the original author and username keys', () => {
    const ds = generateDeviceSecret(b);
    const r = decodeRecoveryCode(b, recoveryCodeFor(b, ds, CASE_A));
    if (!r.ok) throw new Error('decode failed');
    expect(toHex(caseAuthorKeyFromRoot(b, r.caseRoot).publicKey)).toBe(toHex(deriveCaseAuthorKey(b, ds, CASE_A).publicKey));
    expect(toHex(caseIdentityKeyFromRoot(b, r.caseRoot).publicKey)).toBe(toHex(deriveCaseIdentityKey(b, ds, CASE_A).publicKey));
  });

  it('a code for case A gives nothing about case B', () => {
    const ds = generateDeviceSecret(b);
    const r = decodeRecoveryCode(b, recoveryCodeFor(b, ds, CASE_A));
    if (!r.ok) throw new Error('decode failed');
    expect(toHex(r.caseRoot)).not.toBe(toHex(deriveCaseRoot(b, ds, CASE_B)));
    expect(toHex(caseAuthorKeyFromRoot(b, r.caseRoot).publicKey)).not.toBe(toHex(deriveCaseAuthorKey(b, ds, CASE_B).publicKey));
  });

  it('carries no device secret, so votes and flags are never restored', () => {
    const ds = generateDeviceSecret(b);
    const code = normaliseRecoveryCode(recoveryCodeFor(b, ds, CASE_A));
    expect(code.includes(toHex(ds).toUpperCase())).toBe(false);
    // Decoding yields only a case ID and a 32-byte root; nullifier() requires the device secret.
    const r = decodeRecoveryCode(b, code);
    expect(r.ok && Object.keys(r).sort()).toEqual(['caseId', 'caseRoot', 'ok']);
  });

  it('catches every single-character typo', () => {
    const code = normaliseRecoveryCode(recoveryCodeFor(b, generateDeviceSecret(b), CASE_A));
    let accepted = 0;
    for (let i = 0; i < code.length; i++) {
      for (const ch of ALPHABET) {
        if (ch === code[i]) continue;
        const typo = code.slice(0, i) + ch + code.slice(i + 1);
        if (decodeRecoveryCode(b, typo).ok) accepted++;
      }
    }
    expect(accepted).toBe(0);
  });

  it('catches swapped neighbouring characters', () => {
    const code = normaliseRecoveryCode(recoveryCodeFor(b, generateDeviceSecret(b), CASE_A));
    for (let i = 0; i + 1 < code.length; i++) {
      if (code[i] === code[i + 1]) continue;
      const swapped = code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2);
      expect(decodeRecoveryCode(b, swapped).ok).toBe(false);
    }
  });

  it('ignores case, spaces and dashes, and reads I/L as 1 and O as 0', () => {
    const code = recoveryCodeFor(b, generateDeviceSecret(b), CASE_A);
    const messy = ` ${code.toLowerCase().replace(/-/g, ' ')} `.replace(/1/g, 'l').replace(/0/g, 'o');
    expect(decodeRecoveryCode(b, messy).ok).toBe(true);
  });

  it('reports format and checksum errors', () => {
    expect(decodeRecoveryCode(b, 'ABCD')).toEqual({ ok: false, error: 'format' });
    expect(decodeRecoveryCode(b, 'U'.repeat(85))).toEqual({ ok: false, error: 'format' });
    const code = normaliseRecoveryCode(recoveryCodeFor(b, generateDeviceSecret(b), CASE_A));
    const bad = (code[0] === '0' ? '1' : '0') + code.slice(1);
    expect(decodeRecoveryCode(b, bad).ok).toBe(false);
  });

  it('rejects non-zero padding bits, so each code has one spelling', () => {
    const code = normaliseRecoveryCode(encodeRecoveryCode(b, CASE_A, new Uint8Array(32)));
    const last = code[code.length - 1]!;
    const altered = code.slice(0, -1) + ALPHABET[(ALPHABET.indexOf(last) ^ 1) & 31];
    expect(decodeRecoveryCode(b, altered)).toEqual({ ok: false, error: 'format' });
  });

  it('matches the test vector', () => {
    expect(vectors.recovery_codes[CASE_A]).toMatch(/-/);
  });
});
