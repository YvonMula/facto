# ADR 0008: Per-case root key and ASCII-only HKDF info

- Status: Accepted (owner chose the per-case root, 2026-10-08); NEEDS-CRYPTO-REVIEW
- Date: 2026-10-08
- PRD sections: 4.7, 5.0–5.4; supersedes the derivation details of ADR 0005 point 4

## Context

1. PRD 4.7 asks for a short **per-case recovery code** that restores one case and nothing else. With the author key and the identity key each derived directly from the device secret, the code would have to carry both 32-byte seeds.
2. `react-native-libsodium` 1.7 passes HKDF-Expand `info` as a **JavaScript string**, which its native code encodes as UTF-8. Our previous `info` held 16 raw UUID bytes, so bytes ≥ 0x80 would have been encoded differently on the phone and on the server.

## Decision

```
case_root      = HKDF-SHA256(ikm = device_secret, salt = "", info = "facto/case-root/v1/"  + case_id)
author_seed    = HKDF-SHA256(ikm = case_root,     salt = "", info = "facto/case-author/v1")
identity_seed  = HKDF-SHA256(ikm = case_root,     salt = "", info = "facto/case-identity/v1")
author_key     = Ed25519 seed key pair(author_seed)
identity_key   = Ed25519 seed key pair(identity_seed)
nullifier      = HMAC-SHA256(device_secret, "facto/vote/v1/" + target_id)   (or "facto/flag/v1/")
```

- `case_id` and `target_id` are the 36-character lowercase UUID text. Every `info` string is ASCII, and the code rejects any scope ID that is not a lowercase UUID.
- A per-case recovery code carries `case_id + case_root` (48 bytes). It restores that case's author key and username, and nothing else.
- Nullifiers stay derived from the device secret, not from a case root, so a recovery code never restores voting or flagging credentials (PRD 4.7).

## Consequences

- `test-vectors.json` was regenerated; earlier vectors are void. Nothing derived with the old scheme was ever published.
- New label `facto/case-root/v1` in `labels.ts` and in the skill's registry.
- Anyone holding a case root can sign as that case's author and commenter. That is exactly the power PRD 4.7 gives a per-case code, and the app must show it with the same care as other recovery material.
