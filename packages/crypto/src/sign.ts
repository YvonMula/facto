import type { CaseV1, CommentV1, IdentityClaimV1 } from '@facto/schema';
import type { SodiumBackend } from './backend.js';
import { signingInput, type Field } from './canonical.js';
import { fromBase64Url, toBase64Url, uuidBytes } from './encoding.js';
import { LABELS, type Label } from './labels.js';

/**
 * Field order for each payload type (ADR 0003). Changing an order or adding a field
 * requires a new payload version; test vectors pin these.
 */
export const caseFields = (p: CaseV1): Field[] => [
  p.v,
  uuidBytes(p.case_id),
  p.version,
  p.content_type,
  uuidBytes(p.category_id),
  uuidBytes(p.region_id),
  p.lang,
  p.title,
  p.body,
  p.created_hour,
  fromBase64Url(p.author_pubkey),
];

export const identityClaimFields = (p: IdentityClaimV1): Field[] => [p.v, uuidBytes(p.case_id), p.display_name, fromBase64Url(p.pubkey)];

export const commentFields = (p: CommentV1): Field[] => [
  p.v,
  uuidBytes(p.comment_id),
  uuidBytes(p.case_id),
  p.parent_id === null ? null : uuidBytes(p.parent_id),
  p.version,
  p.body,
  p.created_10min,
  fromBase64Url(p.author_pubkey),
];

type Signable =
  | { kind: 'case'; payload: CaseV1 }
  | { kind: 'identity-claim'; payload: IdentityClaimV1 }
  | { kind: 'comment'; payload: CommentV1 };

function describe(s: Signable): { label: Label; fields: Field[]; pubkey: string } {
  switch (s.kind) {
    case 'case':
      return { label: LABELS.sigCase, fields: caseFields(s.payload), pubkey: s.payload.author_pubkey };
    case 'identity-claim':
      return { label: LABELS.sigIdentityClaim, fields: identityClaimFields(s.payload), pubkey: s.payload.pubkey };
    case 'comment':
      return { label: LABELS.sigComment, fields: commentFields(s.payload), pubkey: s.payload.author_pubkey };
  }
}

export function signingBytes(s: Signable): Uint8Array {
  const d = describe(s);
  return signingInput(d.label, d.fields);
}

/** Signs a payload. The private key must belong to the payload's own public key field. */
export function signPayload(b: SodiumBackend, s: Signable, privateKey: Uint8Array): string {
  const d = describe(s);
  const sig = b.signDetached(signingInput(d.label, d.fields), privateKey);
  if (!b.verifyDetached(sig, signingInput(d.label, d.fields), fromBase64Url(d.pubkey))) {
    throw new Error('private key does not match the payload public key');
  }
  return toBase64Url(sig);
}

/** Verifies a payload against the public key it carries (PRD 2: readers verify before display). */
export function verifyPayload(b: SodiumBackend, s: Signable, signature: string): boolean {
  const d = describe(s);
  let sig: Uint8Array;
  let pk: Uint8Array;
  try {
    sig = fromBase64Url(signature);
    pk = fromBase64Url(d.pubkey);
  } catch {
    return false;
  }
  if (sig.length !== 64 || pk.length !== 32) return false;
  return b.verifyDetached(sig, signingInput(d.label, d.fields), pk);
}
