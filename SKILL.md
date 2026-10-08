---
name: facto-crypto-change
description: Use whenever Facto code touches packages/crypto, key derivation, signatures, anonymous tokens, nullifiers, sealed envelopes, recovery, local encryption or panic wipe.
---

# Facto crypto changes

Cryptography is where a small mistake silently breaks every anonymity promise. Follow these rules exactly. The design is fixed by `docs/PRD.md` sections 5, 5.8 and 7.1; do not invent new mechanisms.

## Rules

1. **Audited libraries only.** `react-native-libsodium` on the phone, `libsodium-wrappers` on servers, and the Privacy Pass implementation recorded in `DEPENDENCIES.md`. No hand-written primitives, no Node `crypto` for anything libsodium covers, no `Math.random`.
2. **Randomness** comes from `randombytes_buf` only.
3. **Primitives:** Ed25519 signatures, X25519 + XChaCha20-Poly1305 sealed boxes, HKDF-SHA256, HMAC-SHA256, Argon2id for the PIN. Anything else needs an ADR and human approval.
4. **Purpose labels.** Every derivation and signature uses a versioned purpose label from the registry below. A new label must be added to the registry in the same change. Never reuse a label for a different purpose.
5. **Credential separation.** Author keys, case identity keys, vote and flag nullifiers, and staff keys never derive from or sign for each other (PRD 5.0). The only exception is the optional Author label in comments.
6. **Nothing leaves the phone.** The device secret, seeds and private keys are never serialised into a network request, log, crash report or analytics event. Recovery material is only shown to the user.
7. **Constant-time comparison** (`sodium.memcmp`) for any secret or MAC comparison.
8. **Wipe secrets** from memory (`sodium.memzero`) once they are no longer needed, where the platform allows.
9. **Panic wipe destroys keys first, then data.**
10. **Every wire format is versioned** (envelope, signed payloads, tokens).

## Purpose label registry

Keep this table in sync with `packages/crypto/labels.ts`.

| Label | Use |
| --- | --- |
| `facto/case-author/v1` | Case author key from device secret + case ID |
| `facto/case-identity/v1` | Case-scoped commenter key from device secret + case ID |
| `facto/vote/v1` | Vote nullifier from device secret + target ID |
| `facto/flag/v1` | Flag nullifier from device secret + target ID |
| `facto/local-db/v1` | Local database key wrapping |
| `facto/case-recovery/v1` | Per-case recovery code encoding |

## Tests required with every crypto change

- **Test vectors** in `packages/crypto/test-vectors.json`, run identically on the phone runtime and on Node, so both sides agree byte for byte.
- **Unlinkability tests:** keys derived for two different cases or targets share no bytes and cannot be matched without the device secret.
- **Tamper tests:** a modified envelope or signed payload is rejected.
- **Replay tests:** a repeated message ID or spent token is rejected.
- **Leak tests:** network and log mocks assert no secret material is ever emitted.

## Review flag

Every crypto change is marked `NEEDS-CRYPTO-REVIEW` in its commit message and added to `docs/crypto-review-queue.md` with a one-line summary. It is not considered final until the human approves it, and the protocol is not locked until the external cryptographic review at the phase 1 gate.
