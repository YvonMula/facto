import type { SodiumBackend } from '../src/backend.js';
import { fromHex, toBase64Url, toHex } from '../src/encoding.js';
import { deriveCaseAuthorKey, deriveCaseIdentityKey, nullifier } from '../src/keys.js';
import { signingBytes, signPayload } from '../src/sign.js';
import { CASE_A, CASE_B, COMMENT_ID, DEVICE_SECRET_HEX, vectorCase, vectorClaim, vectorComment } from './vector-inputs.js';

/** Everything deterministic that both runtimes must reproduce byte for byte. */
export function computeDeterministicVectors(b: SodiumBackend) {
  const ds = fromHex(DEVICE_SECRET_HEX);
  const authorA = deriveCaseAuthorKey(b, ds, CASE_A);
  const authorB = deriveCaseAuthorKey(b, ds, CASE_B);
  const identityA = deriveCaseIdentityKey(b, ds, CASE_A);
  const identityB = deriveCaseIdentityKey(b, ds, CASE_B);
  const c = { kind: 'case' as const, payload: vectorCase(toBase64Url(authorA.publicKey)) };
  const claim = { kind: 'identity-claim' as const, payload: vectorClaim(toBase64Url(identityA.publicKey)) };
  const comment = { kind: 'comment' as const, payload: vectorComment(toBase64Url(identityA.publicKey)) };
  return {
    keys: {
      case_author: { [CASE_A]: toHex(authorA.publicKey), [CASE_B]: toHex(authorB.publicKey) },
      case_identity: { [CASE_A]: toHex(identityA.publicKey), [CASE_B]: toHex(identityB.publicKey) },
    },
    nullifiers: {
      vote: { [CASE_A]: toHex(nullifier(b, ds, 'vote', CASE_A)), [COMMENT_ID]: toHex(nullifier(b, ds, 'vote', COMMENT_ID)) },
      flag: { [CASE_A]: toHex(nullifier(b, ds, 'flag', CASE_A)) },
    },
    signatures: {
      case: { signing_input: toHex(signingBytes(c)), signature: signPayload(b, c, authorA.privateKey) },
      identity_claim: { signing_input: toHex(signingBytes(claim)), signature: signPayload(b, claim, identityA.privateKey) },
      comment: { signing_input: toHex(signingBytes(comment)), signature: signPayload(b, comment, identityA.privateKey) },
    },
  };
}
