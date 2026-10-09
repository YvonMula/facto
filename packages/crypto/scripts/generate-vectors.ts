import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createNodeBackend } from '../src/backend-node.js';
import { toHex, utf8 } from '../src/encoding.js';
import { sealEnvelope } from '../src/envelope.js';
import { computeDeterministicVectors } from './compute-vectors.js';
import { DEVICE_SECRET_HEX, RFC } from './vector-inputs.js';

/**
 * Writes test-vectors.json. Deterministic sections are recomputed by the tests on every
 * runtime; the sealed envelope is random, so it is generated once here and must keep opening.
 * Regenerating vectors is a crypto change (facto-crypto-change skill).
 */
const b = await createNodeBackend();
const file = fileURLToPath(new URL('../test-vectors.json', import.meta.url));
// Keep the existing random envelope so regenerating does not churn it; it only needs to keep opening.
const previous = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as { envelope?: unknown }).envelope : undefined;
const intake = b.boxKeypair();
const now = 1_791_100_000;
const envelopePayload = utf8('{"kind":"vote","test":true}');
const vectors = {
  note: 'Public test values only. Regenerate with `pnpm --filter @facto/crypto vectors`; every change needs crypto review.',
  inputs: { device_secret: DEVICE_SECRET_HEX },
  rfc: RFC,
  ...computeDeterministicVectors(b),
  envelope: previous ?? {
    intake_public_key: toHex(intake.publicKey),
    intake_private_key: toHex(intake.privateKey),
    now,
    payload: toHex(envelopePayload),
    envelope: sealEnvelope(b, envelopePayload, intake.publicKey, { ttlDays: 2, now }),
  },
};
writeFileSync(file, `${JSON.stringify(vectors, null, 2)}\n`);
console.log('wrote test-vectors.json');
