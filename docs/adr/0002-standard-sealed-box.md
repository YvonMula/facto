# ADR 0002: Envelopes use libsodium's standard sealed box

- Status: Accepted (approved by the project owner, 2026-10-08)
- Date: 2026-10-08
- PRD sections: 5.8, 7.1

## Context

PRD 5.8 and 7.1 describe the envelope as an "X25519 + XChaCha20-Poly1305 sealed box". libsodium's sealed box, `crypto_box_seal`, is X25519 + XSalsa20-Poly1305, with the nonce derived from the ephemeral and recipient public keys. libsodium has no XChaCha20 sealed-box function, so meeting the PRD text literally would require building our own construction (ephemeral X25519, key derivation, then the XChaCha20-Poly1305 AEAD). That conflicts with "no custom cryptography" (PRD 7.1).

## Decision

Envelopes use `crypto_box_seal` and `crypto_box_seal_open`, unchanged, on both the phone (`react-native-libsodium`) and the server (`libsodium-wrappers-sumo`).

XChaCha20's advantage over XSalsa20 is a long random nonce for many messages under one key. A sealed box uses a fresh ephemeral key per message and a derived nonce, so that advantage does not apply here.

## Consequences

- PRD 5.8 "Sealed payload" row now reads: "libsodium sealed box (`crypto_box_seal`: X25519 + XSalsa20-Poly1305) to the current intake public key".
- PRD 7.1 primitives now list "X25519 + XSalsa20-Poly1305 sealed boxes (libsodium `crypto_box_seal`)". XChaCha20-Poly1305 remains available for local encryption.
- Listed in `docs/crypto-review-queue.md` for the external review.
