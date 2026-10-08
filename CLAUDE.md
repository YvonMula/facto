# Facto — instructions for Claude Code

Facto is an anonymous community platform for the DRC: whistleblowing (50%), community information (30%) and local news (20%), with no accounts. Its core promise: **Facto's servers, database and operator hold nothing that identifies a poster, commenter or voter.**

**Source of truth: `docs/PRD.md`.** If this file and the PRD disagree, the PRD wins. If the PRD is unclear or silent on something security-relevant, stop and ask; never guess.

> If a security property cannot be verified by a test, audit, schema constraint, cryptographic proof or reproducible inspection, it is not a Facto requirement yet — only an intention. Every invariant below must have an automated check.

## Non-negotiable invariants

Each one is a CI check. A failing check blocks the merge. Never weaken, skip or delete a check to make a build pass; fix the code or ask.

1. **No location, ever.** No location permission, SDK or API call in any app (`ACCESS_*_LOCATION`, `NSLocation*`, `expo-location`, `Geolocation`, `getCurrentPosition`). Areas are chosen from the administrative list.
2. **No accounts or identifiers.** No `users`, `devices` or `sessions` table. No IP address, user agent, device ID, advertising ID, install ID, email or phone number stored or logged anywhere.
3. **No third-party telemetry.** No Firebase, Google Analytics, Sentry SaaS, Amplitude, Mixpanel, PostHog, OneSignal, ad SDKs or push notifications in V1. Expo telemetry and `expo-updates` / EAS Update are disabled. The app talks only to Facto's own domains and onion service.
4. **Separated credentials.** Case author keys, case identity keys, vote/flag tokens with nullifiers, and staff keys are derived and used separately (PRD 5.0). No reuse across functions unless the PRD says so.
5. **Sealed envelopes.** Every write leaves the phone as a sealed envelope (PRD 5.8). Plaintext exists only on the phone and in the intake service's memory.
6. **Secrets stay on the phone.** The device secret, private keys and recovery material are never sent to any server, whatever a server response asks for.
7. **Signed content.** Every case, comment and version is signed by its author key; the app verifies before display.
8. **Unpublished content is never public.** All public reads go through a single published-only path, with tests proving held, rejected and removed content never leaves it.
9. **Append-only history.** Content changes create new versions; moderation events are append-only and hash-chained.
10. **Coarse time only.** Cases store the hour; comments store 10-minute buckets. No exact timestamps.
11. **Permissions match the matrix** in PRD 7.2 exactly; checked against the built Android manifest and iOS `Info.plist`.
12. **Every dependency is reviewed** and recorded in `DEPENDENCIES.md` before it is added (see the `facto-security-review` skill).

## Repository layout

```
apps/mobile          Expo (React Native) app, TypeScript, Expo Router, dev builds
apps/dashboard       Moderator web dashboard (React + Vite); hold-queue decryption in the browser only
services/api         Public API + intake (Fastify, Zod)
services/issuer      Token issuer — separate service, separate database
services/workers     Moderation checks and retention jobs (pg-boss)
packages/crypto      Shared crypto: key derivation, signatures, envelopes, test vectors
packages/schema      Shared types and Zod schemas (envelope format, API contracts)
db/migrations        Plain SQL migrations for the main database
db/issuer-migrations Plain SQL migrations for the issuer database
docs/PRD.md          Product requirements (source of truth)
docs/adr/            Architecture decision records
DEPENDENCIES.md      Reviewed dependency list
```

pnpm workspaces. TypeScript strict mode everywhere.

## How to work

- **Follow the PRD phases in order** (PRD 10.2). Use plan mode at the start of each phase and confirm the plan before writing code.
- **Gates before features.** The CI checks for invariants 1–3, 11 and 12 exist before any feature code is written.
- **Small, reviewable changes.** One concern per change, with tests.
- **Crypto, schema and security changes** follow the `facto-crypto-change`, `facto-schema-change` and `facto-security-review` skills. Run `facto-security-review` before every commit.
- **Never invent security mechanisms.** Use the ones the PRD names; anything new goes into an ADR in `docs/adr/` and waits for human approval.
- **Record decisions.** Any choice the PRD leaves open becomes an ADR.
- **Keep "Project status" current.** Any commit that changes the project's state (phase step done, ADR proposed/accepted/rejected, dependency added, spike finished, new blocker or open question) updates the "Project status" section below in the same commit. Before ending a session, check the section still matches the repo.

## Language and wording

- Every user-facing string lives in the i18next translation files, in **both French and English**. No hard-coded text in components; CI fails on a missing key in either language.
- Claims policy (PRD 1): never write "100% anonymous", "untraceable", "impossible to track", "100 % anonyme", "intraçable" or any promise of protection from surveillance. Describe what Facto does not collect.
- Code, comments and commit messages in English.

## Commands

Set `EXPO_NO_TELEMETRY=1` in your shell before running any Expo command.

```sh
pnpm install                                # install all workspaces (Node 22, pnpm 10)
pnpm typecheck                              # tsc --noEmit in every workspace
pnpm test                                   # Vitest in every workspace
pnpm --filter @facto/mobile prebuild        # generate apps/mobile/android and ios (needed by the permissions gate)
pnpm gates                                  # run every invariant gate; `pnpm gates no-location claims` runs a subset
pnpm --filter @facto/crypto vectors         # regenerate packages/crypto/test-vectors.json (a crypto change)
pnpm --filter @facto/mobile start           # Metro for a development build (expo-dev-client, Phase 3)
cd spikes/arti && cargo build --release     # Arti spike (ADR 0007)
```

CI (`.github/workflows/ci.yml`) runs install, typecheck, test, prebuild and gates on every push.

Spikes live in `packages/crypto/spikes/` and `spikes/`. They are not exported or shipped until their ADR is accepted.

## Project status

_Last updated: 2026-10-08 · working branch `claude/new-session-2dnc6z` (no PR yet)._

### Phases (PRD 10.2)

| Phase | State | Notes |
| --- | --- | --- |
| CI gates (before features) | ✅ Done | 7 gates in `tools/gates`: no-location, no-telemetry, no-identifiers, deps-reviewed, permissions, i18n, claims |
| 1. Foundation | 🟡 In progress | Done: `packages/schema`, `packages/crypto` (Node backend). Missing: phone `SodiumBackend`, SQLCipher store, panic wipe with key destruction, per-case recovery codes, external crypto review (gate) |
| 2. Backend core | ⬜ Not started | |
| 3. App V1 | 🟡 Shell only | `apps/mobile` shell built early on request; no feature code |
| 4–8. Dashboard, pilot, audit, launch, after launch | ⬜ Not started | |

### What exists

| Path | Content | Tests |
| --- | --- | --- |
| `tools/gates` | Invariant gates + fixture tests | 49 |
| `packages/schema` | Zod: envelope v1, case / identity-claim / comment v1 (coarse time only) | 8 |
| `packages/crypto` | Device secret, HKDF keys, nullifiers, canonical signing, sealed envelope, replay cache, `test-vectors.json` | 33 |
| `packages/crypto/spikes/tokens` | Privacy Pass (RFC 9578 type 2) spike, dev-only | 4 |
| `apps/mobile` | Expo SDK 57 shell: language → 3 safety screens → tabs Home · Search · + · Alerts · My activity; FR/EN; INTERNET only | typecheck + Android bundle |
| `spikes/arti` | Arti 0.47 embedded Tor spike (Rust) | builds on x86_64 |

### Decisions

| ADR | Topic | Status |
| --- | --- | --- |
| 0001 | Signed payloads carry only coarse time buckets | Accepted (owner) |
| 0002 | Envelopes use standard `crypto_box_seal` | Accepted (owner) |
| 0003 | Canonical length-prefixed signing input | Proposed |
| 0004 | Monorepo toolchain (pnpm, Vitest, tsx) | Proposed |
| 0005 | `SodiumBackend`; raw libsodium HKDF on Node; HMAC via HKDF-Extract on phone | Proposed |
| 0006 | Privacy Pass tokens, RFC 9578 type 2 | Proposed (spike) |
| 0007 | Embedded Tor with Arti | Proposed (spike) |

Crypto items waiting for review: `docs/crypto-review-queue.md`.

Decided in conversation with the owner (not ADRs):
- Bottom nav: Home · Search · + · Alerts · My activity.
- The old `facto.app` Firebase prototype is abandoned, nothing migrated.
- Before source publication, move to a fresh repo under a pseudonymous org with clean history; keep personal data out of code and commits.
- Tor (Arti) and vote tokens are tackled in Phase 1 as spikes.
- Device language comes from `Intl`, not `expo-localization`.
- Onboarding state stays in memory until the SQLCipher store exists (nothing unencrypted on disk).

### Not verified yet

- Arti bootstrap to the Tor network (container has no direct TCP to relays).
- Arti Android build (no Android NDK in the container).
- Privacy Pass on Hermes (no `crypto.subtle`; phone path undecided).
- Phone crypto backend against `test-vectors.json` (backend not written).
- The app on a real device or emulator.
- GitHub CI has not run (no PR opened yet).
- Permissions gate checks the prebuild manifest, not yet the Gradle-merged release manifest.

### Next steps

1. Owner reviews ADRs 0003–0007.
2. Phone `SodiumBackend` on `react-native-libsodium`; run the vectors on Hermes.
3. SQLCipher local store (`op-sqlite`) and panic wipe (keys first, then data).
4. Per-case recovery codes (PRD 4.7).
5. Prepare the external cryptographic review package (phase 1 gate).
6. Then Phase 2: API + intake, issuer, workers, DB migrations.

### Open questions

- PRD 10.4 list (legal entity, hosting, funding, limits, urgent-alert policy, attestation vs proof-of-work, reporting obligations).
- rustls crypto provider for Arti (`ring` proposed).
- Phone implementation for Privacy Pass: WebCrypto polyfill or Rust native module.
- Where the merged-manifest permission check runs in the release pipeline.
