import { describe, expect, it } from 'vitest';
import { CaseV1, CommentV1, EnvelopeV1, hourBucket, tenMinuteBucket } from '../src/index.js';

const uuid = '3f0b8c2e-1d4a-4b6f-9a7c-2e5d8f1a0b3c';
const pk = 'A'.repeat(43);

const validCase = {
  kind: 'case',
  v: 1,
  case_id: uuid,
  version: 1,
  content_type: 'community',
  category_id: uuid,
  region_id: uuid,
  lang: 'fr',
  title: 'Coupure d’eau',
  body: 'Pas d’eau depuis lundi.',
  created_hour: 1_791_000_000 - (1_791_000_000 % 3600),
  author_pubkey: pk,
};

describe('coarse time', () => {
  it('rounds down to the hour and to 10 minutes', () => {
    expect(hourBucket(7199)).toBe(3600);
    expect(tenMinuteBucket(1199)).toBe(600);
  });
  it('rejects an exact timestamp on a case', () => {
    expect(CaseV1.safeParse({ ...validCase, created_hour: validCase.created_hour + 17 }).success).toBe(false);
  });
  it('rejects an exact timestamp on a comment', () => {
    const c = { kind: 'comment', v: 1, comment_id: uuid, case_id: uuid, parent_id: null, version: 1, body: 'ok', created_10min: 601, author_pubkey: pk };
    expect(CommentV1.safeParse(c).success).toBe(false);
    expect(CommentV1.safeParse({ ...c, created_10min: 600 }).success).toBe(true);
  });
});

describe('CaseV1', () => {
  it('accepts a valid case', () => {
    expect(CaseV1.safeParse(validCase).success).toBe(true);
  });
  it('rejects unknown fields, such as a location', () => {
    expect(CaseV1.safeParse({ ...validCase, lat: -4.3 }).success).toBe(false);
  });
  it('rejects non-v4 IDs', () => {
    expect(CaseV1.safeParse({ ...validCase, case_id: '3f0b8c2e-1d4a-1b6f-9a7c-2e5d8f1a0b3c' }).success).toBe(false);
  });
  it('rejects invisible characters and non-NFC text', () => {
    expect(CaseV1.safeParse({ ...validCase, body: 'a​b' }).success).toBe(false);
    expect(CaseV1.safeParse({ ...validCase, title: 'é' }).success).toBe(false);
  });
});

describe('EnvelopeV1', () => {
  it('has no room for sender, device or location fields', () => {
    const env = { v: 1, id: 'A'.repeat(22), exp: 20_000, box: 'abc' };
    expect(EnvelopeV1.safeParse(env).success).toBe(true);
    expect(EnvelopeV1.safeParse({ ...env, device: 'x' }).success).toBe(false);
  });
});
