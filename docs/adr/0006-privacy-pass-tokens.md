# ADR 0006: Privacy Pass tokens via RFC 9578 type 2 (spike findings)

- Status: Proposed (spike; waiting for project owner approval and the external cryptographic review at the phase 1 gate)
- Date: 2026-10-08
- PRD sections: 5.4, 5.6, 7.1, 8.1

## Context

PRD 5.4 needs anonymous rate-limit tokens: the issuer signs blinded tokens and cannot recognise them when they are spent. The PRD allows blind RSA or VOPRF (RFC 9578). The phone side has no React Native implementation.

## Spike

`packages/crypto/spikes/tokens/` prototypes the flow behind a small `TokenClient` / `TokenIssuer` / `TokenVerifier` interface, using `@cloudflare/privacypass-ts` 0.9.0. That library is maintained by Cloudflare under Apache-2.0 and implements RFC 9578 and RFC 9474 through `@cloudflare/blindrsa-ts`. It is a dev-only dependency for now. The tests (Node 22) show:

- issue → blind → sign → unblind → verify works with token type 0x0002 (Blind RSA 2048, RSABSSA-SHA384-PSS-Deterministic);
- **purpose separation:** each purpose (vote, flag, post, comment) has its own `origin_info`, which is bound into the challenge digest, so a vote token is rejected as a flag token;
- a token signed by another issuer key, or a modified token, is rejected;
- each token has a unique 32-byte client nonce, which the intake stores as the spent-token key (PRD 8.2 `spent_tokens`);
- the redemption context is empty, so nothing in a token ties it to its issuance time.

## Findings

1. **Publicly verifiable (blind RSA) beats VOPRF for Facto.** With blind RSA the intake service verifies tokens with only the issuer's public key, so the issuer's private key and database stay isolated from content (PRD 8.1). VOPRF tokens can only be verified by the private-key holder, which would couple the issuer to intake.
2. **The phone runtime is the blocker.** The libraries call WebCrypto (`crypto.subtle`: `importKey`, `exportKey`, `digest`, `verify`, and `sign` and `generateKey` on the issuer). Hermes provides no `crypto.subtle`. The client side needs `importKey`, `exportKey` and `digest`, plus the big-integer blinding, which the library does in JavaScript with `sjcl`. Candidates for the phone:
   - a WebCrypto polyfill backed by a native module (for example `react-native-quick-crypto`, whose `subtle` coverage of RSA-PSS must be verified, and which must pass the dependency gate); or
   - a small native module that wraps a Rust implementation (for example the `blind-rsa-signatures` crate by libsodium's author) behind the `TokenClient` interface.
   Either path must reproduce the Node results byte for byte through shared test vectors, and is a Phase 3 task.
3. **Network code:** `privacypass-ts` ships optional `fetch` helpers. If adopted, Facto calls only the token functions and talks to its own issuer through its own client; the release network-traffic test (PRD 7.5) enforces this.
4. **Key rotation and expiry:** issuer keys rotate on a fixed schedule signed by the offline root key (PRD 7.1). The token key ID inside each token lets the intake reject tokens from retired keys, which also bounds how long `spent_tokens` rows must be kept (PRD 11.1).
5. Costs: 2048-bit tokens are about 300 bytes each; a day of 50 vote + 10 flag + 10 post + 100 comment tokens means about 170 issuance round trips. Batched issuance (supported by the library) should be evaluated to reduce timing signals.

## Proposed decision

Adopt RFC 9578 type 2 (blind RSA) through `@cloudflare/privacypass-ts`, with one `origin_info` per purpose. The phone implementation (polyfill or native) is chosen in Phase 3 under the dependency gate. Platform attestation versus proof-of-work (PRD 5.6) remains open and goes to the external review.
