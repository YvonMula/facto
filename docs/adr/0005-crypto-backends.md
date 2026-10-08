# ADR 0005: One crypto interface, two libsodium backends

- Status: Proposed (waiting for project owner approval; NEEDS-CRYPTO-REVIEW)
- Date: 2026-10-08
- PRD sections: 5.1–5.4, 7.1

## Context

The phone and the servers must compute identical keys, nullifiers and signatures (PRD 5). The two libsodium bindings expose different subsets of libsodium:

| Operation | `libsodium-wrappers-sumo` (Node) | `react-native-libsodium` 1.7 (phone) |
| --- | --- | --- |
| HKDF-SHA256 extract/expand | Compiled into the module, but not wrapped | Wrapped |
| HMAC-SHA256 | Wrapped | Not exposed (`crypto_auth` is HMAC-SHA512-256) |
| Ed25519, `crypto_box_seal`, randombytes, memcmp, memzero | Wrapped | Wrapped |

## Decision

1. All Facto crypto code calls a single `SodiumBackend` interface (`packages/crypto/src/backend.ts`), never a binding directly.
2. **Node backend:** HKDF calls libsodium's own compiled `crypto_kdf_hkdf_sha256_extract` and `_expand` exports from `libsodium-sumo`. Our code only copies bytes in and out of the WebAssembly heap and zeroes the copies afterwards. HMAC-SHA256 uses the streaming `crypto_auth_hmacsha256_*` API, which accepts keys of any length.
3. **Phone backend (Phase 3, in `apps/mobile`):** HKDF uses the wrapped functions. HMAC-SHA256 is computed as `crypto_kdf_hkdf_sha256_extract(salt = key, ikm = message)`. RFC 5869 defines HKDF-Extract as exactly `HMAC-SHA256(salt, ikm)`, so this is a libsodium call, not a new construction. A test in `packages/crypto` checks the equality on every run.
4. Key derivation: `seed = HKDF-SHA256(ikm = device secret, salt = empty, info = label ‖ 0x00 ‖ 16-byte scope ID)`, then `crypto_sign_seed_keypair(seed)`. Nullifier: `HMAC-SHA256(device secret, label ‖ 0x00 ‖ 16-byte target ID)`. The 0x00 separator and the fixed-length raw UUID keep every info string unambiguous.
5. Both backends must pass `packages/crypto/test-vectors.json`, which also pins RFC 5869 A.1 (HKDF) and RFC 4231 case 2 (HMAC).

## Consequences

- No hand-written primitive anywhere; base64url, hex and the length-prefixed encoder are plain byte formatting.
- The phone backend can only be verified on a device or emulator build. Until then, the vectors are proven on Node only. Phase 3 gate: run the vector suite on Hermes.
- If a future `libsodium-wrappers` release wraps HKDF, the raw calls are replaced and the vectors must not change.
