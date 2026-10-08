# Crypto review queue

Every change marked `NEEDS-CRYPTO-REVIEW` is listed here until a human approves it. The protocol is not locked until the external cryptographic review at the phase 1 gate (PRD 10.2).

| Date | Change | Status |
| --- | --- | --- |
| 2026-10-08 | ADR 0001: signed payloads carry only coarse time buckets | Approved by owner; external review pending |
| 2026-10-08 | ADR 0002: envelopes use standard `crypto_box_seal` | Approved by owner; external review pending |
| 2026-10-08 | ADR 0003: canonical length-prefixed signing input with purpose label | Accepted by owner; external review pending |
| 2026-10-08 | ADR 0005: `SodiumBackend`; raw libsodium HKDF exports on Node; HMAC via HKDF-Extract on the phone | Accepted by owner; external review pending |
| 2026-10-08 | `packages/crypto`: device secret, HKDF seeds, case author/identity keys, nullifiers, payload signing, envelope v1 with inner ID/expiry binding and 4 KB padding, replay cache, test vectors | Proposed |
| 2026-10-08 | ADR 0006 spike: RFC 9578 type 2 tokens via `@cloudflare/privacypass-ts`, purpose bound through `origin_info` (`packages/crypto/spikes/tokens`) | Direction accepted by owner; spike only; external review pending |
| 2026-10-08 | ADR 0008: per-case root key (author and identity keys derive from it) and ASCII-only HKDF info; vectors regenerated | Accepted by owner; external review pending |
| 2026-10-08 | `local-keys.ts`: SQLCipher key wrapped with Argon2id(PIN, INTERACTIVE) + XChaCha20-Poly1305, purpose-bound AD; duress verifier always stored (dummy when unset) | Proposed |
