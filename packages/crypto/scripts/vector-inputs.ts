import type { CaseV1, CommentV1, IdentityClaimV1 } from '@facto/schema';

/** Fixed inputs for test-vectors.json. These are public test values, never real secrets. */
export const DEVICE_SECRET_HEX = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
export const CASE_A = '3f0b8c2e-1d4a-4b6f-9a7c-2e5d8f1a0b3c';
export const CASE_B = '9d1e7a40-5c2b-4e8f-b3a6-7f0c1d2e3a4b';
export const CATEGORY = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
export const REGION = '5e6f7a8b-9c0d-4e1f-a2b3-c4d5e6f7a8b9';
export const COMMENT_ID = 'c0ffee00-1234-4abc-8def-0123456789ab';

export const vectorCase = (authorPubkey: string): CaseV1 => ({
  kind: 'case',
  v: 1,
  case_id: CASE_A,
  version: 1,
  content_type: 'community',
  category_id: CATEGORY,
  region_id: REGION,
  lang: 'fr',
  title: 'Coupure d’eau à Bandalungwa',
  body: 'Pas d’eau depuis lundi matin. Les bornes-fontaines sont à sec.',
  created_hour: 1_791_097_200,
  author_pubkey: authorPubkey,
});

export const vectorClaim = (pubkey: string): IdentityClaimV1 => ({
  kind: 'identity-claim',
  v: 1,
  case_id: CASE_A,
  display_name: 'KivuVoice',
  pubkey,
});

export const vectorComment = (pubkey: string): CommentV1 => ({
  kind: 'comment',
  v: 1,
  comment_id: COMMENT_ID,
  case_id: CASE_A,
  parent_id: null,
  version: 1,
  body: 'Même chose à Kintambo.',
  created_10min: 1_791_098_400,
  author_pubkey: pubkey,
});

/** RFC 5869 appendix A.1 and RFC 4231 test case 2, to pin each backend's primitives. */
export const RFC = {
  hkdf: {
    ikm: '0b'.repeat(22),
    salt: '000102030405060708090a0b0c',
    info: 'f0f1f2f3f4f5f6f7f8f9',
    length: 42,
    prk: '077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5',
    okm: '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865',
  },
  hmac: {
    key: '4a656665',
    data: '7768617420646f2079612077616e7420666f72206e6f7468696e673f',
    mac: '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
  },
};
