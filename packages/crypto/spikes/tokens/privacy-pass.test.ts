import { describe, expect, it } from 'vitest';
import { createPrivacyPassClient, createPrivacyPassIssuer, createPrivacyPassVerifier } from './privacy-pass.js';

describe('Privacy Pass spike (RFC 9578 type 2, blind RSA)', () => {
  it('issues, finalizes and verifies a vote token; the issuer never sees the token', async () => {
    const issuer = await createPrivacyPassIssuer();
    const client = createPrivacyPassClient(await issuer.publicKey());
    const verifier = createPrivacyPassVerifier(issuer.keyPair.publicKey);

    const pending = await client.createRequest('vote');
    const response = await issuer.issue(pending.request);
    const token = await pending.finalize(response);

    const result = await verifier.verify(token, 'vote');
    expect(result?.spendKey).toMatch(/^[0-9a-f]{64}$/);

    // Unlinkability smoke check: no 32-byte window of the blinded request appears in the token.
    const hex = (b: Uint8Array) => Buffer.from(b).toString('hex');
    const tokenHex = hex(token);
    for (let i = 0; i + 32 <= pending.request.length; i += 16) {
      expect(tokenHex.includes(hex(pending.request.subarray(i, i + 32)))).toBe(false);
    }
  }, 30_000);

  it('a vote token does not verify as a flag token', async () => {
    const issuer = await createPrivacyPassIssuer();
    const pending = await createPrivacyPassClient(await issuer.publicKey()).createRequest('vote');
    const token = await pending.finalize(await issuer.issue(pending.request));
    expect(await createPrivacyPassVerifier(issuer.keyPair.publicKey).verify(token, 'flag')).toBeNull();
  }, 30_000);

  it('rejects a token signed by another issuer key and a tampered token', async () => {
    const issuer = await createPrivacyPassIssuer();
    const other = await createPrivacyPassIssuer();
    const pending = await createPrivacyPassClient(await issuer.publicKey()).createRequest('vote');
    const token = await pending.finalize(await issuer.issue(pending.request));
    expect(await createPrivacyPassVerifier(other.keyPair.publicKey).verify(token, 'vote')).toBeNull();
    const tampered = token.slice();
    tampered[tampered.length - 1]! ^= 1;
    expect(await createPrivacyPassVerifier(issuer.keyPair.publicKey).verify(tampered, 'vote')).toBeNull();
  }, 30_000);

  it('two tokens from one device have different spend keys', async () => {
    const issuer = await createPrivacyPassIssuer();
    const client = createPrivacyPassClient(await issuer.publicKey());
    const verifier = createPrivacyPassVerifier(issuer.keyPair.publicKey);
    const keys = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const p = await client.createRequest('vote');
      const r = await verifier.verify(await p.finalize(await issuer.issue(p.request)), 'vote');
      keys.add(r!.spendKey);
    }
    expect(keys.size).toBe(3);
  }, 30_000);
});
