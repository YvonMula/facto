import { z } from 'zod';

/**
 * Sealed submission envelope v1 (PRD 5.8). Only these fields exist: no sender, device, route or location.
 * `id` and `exp` are repeated inside the sealed plaintext so a relay cannot change them undetected.
 */
export const ENVELOPE_VERSION = 1;
/** Plaintext is padded to a multiple of this size before sealing (PRD 5.8: 4 KB buckets for text). */
export const PADDING_BUCKET = 4096;
export const DEFAULT_TTL_DAYS = { case: 7, comment: 2, vote: 2 } as const;

export const EnvelopeV1 = z
  .object({
    v: z.literal(ENVELOPE_VERSION),
    /** Random 128-bit message ID, base64url. */
    id: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
    /** Expiry as a day number (days since the Unix epoch). */
    exp: z.number().int().nonnegative(),
    /** crypto_box_seal ciphertext (ADR 0002), base64url. */
    box: z.string().regex(/^[A-Za-z0-9_-]+$/),
  })
  .strict();
export type EnvelopeV1 = z.infer<typeof EnvelopeV1>;
