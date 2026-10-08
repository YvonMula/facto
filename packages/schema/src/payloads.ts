import { z } from 'zod';
import { HOUR, TEN_MINUTES } from './time.js';

/** Random UUIDv4 only (PRD 5.7): no time-based or sequential IDs. */
export const UuidV4 = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'must be a lowercase random UUIDv4');

const b64url = (bytes: number) =>
  z.string().regex(new RegExp(`^[A-Za-z0-9_-]{${Math.ceil((bytes * 4) / 3)}}$`), `must be ${bytes} bytes, base64url without padding`);

export const PublicKey = b64url(32);
export const Signature = b64url(64);

const bucket = (size: number) => z.number().int().nonnegative().refine((n) => n % size === 0, `must be a multiple of ${size} seconds (coarse time only)`);
export const CreatedHour = bucket(HOUR);
export const Created10Min = bucket(TEN_MINUTES);

export const ContentType = z.enum(['whistleblowing', 'community', 'news']);
export const Lang = z.enum(['fr', 'en']);

/** Text is NFC-normalised with invisible characters removed on the phone (PRD 5.7); the schema rejects anything else. */
const CleanText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((s) => s === s.normalize('NFC'), 'must be Unicode NFC')
    .refine((s) => !/[​-‏‪-‮⁠-⁤﻿]/.test(s), 'must not contain invisible characters');

/** The fields a case author signs. Field order for signing is fixed in @facto/crypto (ADR 0003). */
export const CaseV1 = z
  .object({
    kind: z.literal('case'),
    v: z.literal(1),
    case_id: UuidV4,
    version: z.number().int().min(1),
    content_type: ContentType,
    category_id: UuidV4,
    region_id: UuidV4,
    lang: Lang,
    title: CleanText(200),
    body: CleanText(10_000),
    created_hour: CreatedHour,
    author_pubkey: PublicKey,
  })
  .strict();
export type CaseV1 = z.infer<typeof CaseV1>;

/** Claiming a case-scoped username (PRD 4.4, 5.2). */
export const IdentityClaimV1 = z
  .object({
    kind: z.literal('identity-claim'),
    v: z.literal(1),
    case_id: UuidV4,
    display_name: CleanText(32),
    pubkey: PublicKey,
  })
  .strict();
export type IdentityClaimV1 = z.infer<typeof IdentityClaimV1>;

export const CommentV1 = z
  .object({
    kind: z.literal('comment'),
    v: z.literal(1),
    comment_id: UuidV4,
    case_id: UuidV4,
    parent_id: UuidV4.nullable(),
    version: z.number().int().min(1),
    body: CleanText(4_000),
    created_10min: Created10Min,
    author_pubkey: PublicKey,
  })
  .strict();
export type CommentV1 = z.infer<typeof CommentV1>;

export const SignedPayload = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('case'), payload: CaseV1, sig: Signature }).strict(),
  z.object({ kind: z.literal('identity-claim'), payload: IdentityClaimV1, sig: Signature }).strict(),
  z.object({ kind: z.literal('comment'), payload: CommentV1, sig: Signature }).strict(),
]);
export type SignedPayload = z.infer<typeof SignedPayload>;
