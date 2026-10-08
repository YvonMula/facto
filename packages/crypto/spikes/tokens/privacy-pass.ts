import { publicVerif, TOKEN_TYPES, TokenChallenge, Token } from '@cloudflare/privacypass-ts';
import { toHex } from '../../src/encoding.js';
import type { PendingToken, TokenClient, TokenIssuer, TokenPurpose, TokenVerifier } from './token-scheme.js';

/**
 * RFC 9578 publicly verifiable tokens (token type 0x0002, Blind RSA 2048, RSABSSA-SHA384-PSS-Deterministic)
 * via @cloudflare/privacypass-ts. Purpose separation: each purpose has its own origin_info, which is
 * bound into the token's challenge digest, so a vote token never verifies as a flag token.
 * The redemption context is empty, so a token carries nothing that ties it to the moment of issuance.
 */
const { BlindRSAMode, Client, Issuer, Origin, getPublicKeyBytes } = publicVerif;
const MODE = BlindRSAMode.PSS;
export const ISSUER_NAME = 'issuer.facto.invalid';

const originInfo = (purpose: TokenPurpose) => [`facto-${purpose}`];
const challengeFor = (purpose: TokenPurpose) => new Origin(MODE, originInfo(purpose)).createTokenChallenge(ISSUER_NAME, new Uint8Array(0));

export async function createPrivacyPassIssuer(): Promise<TokenIssuer & { keyPair: CryptoKeyPair }> {
  const keyPair = await Issuer.generateKey(MODE, { modulusLength: 2048, publicExponent: Uint8Array.from([1, 0, 1]) });
  const issuer = new Issuer(MODE, ISSUER_NAME, keyPair.privateKey, keyPair.publicKey);
  return {
    keyPair,
    async issue(request) {
      const req = publicVerif.TokenRequest.deserialize(TOKEN_TYPES.BLIND_RSA, request);
      return (await issuer.issue(req)).serialize();
    },
    publicKey: () => getPublicKeyBytes(keyPair.publicKey),
  };
}

export function createPrivacyPassClient(issuerPublicKey: Uint8Array): TokenClient {
  return {
    async createRequest(purpose): Promise<PendingToken> {
      const client = new Client(MODE);
      const request = await client.createTokenRequest(challengeFor(purpose), issuerPublicKey);
      return {
        request: request.serialize(),
        finalize: async (response) => (await client.finalize(client.deserializeTokenResponse(response))).serialize(),
      };
    },
  };
}

export function createPrivacyPassVerifier(issuerPublicKey: CryptoKey): TokenVerifier {
  return {
    async verify(bytes, purpose) {
      let token: Token;
      try {
        token = Token.deserialize(TOKEN_TYPES.BLIND_RSA, bytes);
      } catch {
        return null;
      }
      // The token must have been requested for this purpose's challenge.
      const expected = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(challengeFor(purpose).serialize())));
      const digest = token.authInput.challengeDigest;
      if (digest.length !== expected.length || digest.some((x, i) => x !== expected[i])) return null;
      const ok = await new Origin(MODE, originInfo(purpose)).verify(token, issuerPublicKey).catch(() => false);
      // The 32-byte client nonce is unique per token; the intake stores it as the spent-token key.
      return ok ? { spendKey: toHex(token.authInput.nonce) } : null;
    },
  };
}

// TokenChallenge is re-exported for tests that inspect challenge bytes.
export { TokenChallenge };
