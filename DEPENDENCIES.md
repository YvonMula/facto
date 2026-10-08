# Reviewed dependencies

Every direct dependency of every workspace must have a row here before it is added (CLAUDE.md invariant 12, `facto-security-review` skill section 4). The `deps-reviewed` gate fails the build on any missing row, and on any row whose verdict is `NEEDS-HUMAN-REVIEW`.

Verdicts: `APPROVED`, `APPROVED-DEV` (development and CI only, never shipped in an app or service build), `NEEDS-HUMAN-REVIEW`, `REJECTED`.

| Package | Version | Workspace | Purpose | Network activity | Permissions added | Verdict | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| typescript | ~6.0.3 | root (dev) | Type checking | None | None | APPROVED-DEV | 2026-10-08 |
| vitest | 4.1.11 | root (dev) | Unit tests | None (local test runner; no telemetry) | None | APPROVED-DEV | 2026-10-08 |
| tsx | 4.23.15 | root (dev) | Runs TypeScript gate scripts in CI | None | None | APPROVED-DEV | 2026-10-08 |
| @types/node | 22.20.5 | tools/gates (dev) | Node type definitions | None (types only) | None | APPROVED-DEV | 2026-10-08 |
| zod | 4.6.5 | packages/schema | Runtime validation of envelopes and signed payloads | None (pure validation, no network code) | None | APPROVED | 2026-10-08 |
| libsodium-wrappers-sumo | 0.8.4 | packages/crypto | Audited libsodium (Ed25519, sealed boxes, HMAC-SHA256) on Node servers and tests (PRD 7.1) | None (WebAssembly build of libsodium; no network code). By Frank Denis, upstream libsodium author | None | APPROVED | 2026-10-08 |
| libsodium-sumo | 0.8.4 | packages/crypto | The libsodium WebAssembly module behind the wrappers; imported directly only for its compiled `crypto_kdf_hkdf_sha256_*` exports, which the wrappers do not expose (NEEDS-CRYPTO-REVIEW of the glue code) | None | None | APPROVED | 2026-10-08 |
| @types/libsodium-wrappers-sumo | 0.8.2 | packages/crypto (dev) | Type definitions | None (types only) | None | APPROVED-DEV | 2026-10-08 |
| @cloudflare/privacypass-ts | 0.9.0 | packages/crypto (dev, token spike only) | RFC 9578 Privacy Pass token issuance and verification, prototyped in `packages/crypto/spikes/tokens` (ADR 0006). Not shipped until the external crypto review. Transitive: `@cloudflare/blindrsa-ts` (RFC 9474), `@cloudflare/voprf-ts`, `sjcl`, `asn1js`, `rfc4648`, `quicvarint`, `asn1-parser` | Contains optional `fetch` helpers (`issuance.js`: `fetchToken`, issuer directory) that contact a URL only when called; the spike never calls them, and they must stay unused if adopted. No telemetry | None | APPROVED-DEV | 2026-10-08 |
