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
| expo | ~57.0.27 | apps/mobile | Expo SDK runtime (modules core, asset, font, file-system, keep-awake, constants). `expo-updates` is NOT included (gate: no-telemetry) | Runtime: none; `fetch` is the standard polyfill, used only by our own code. Dev only: Metro dev-server connections in debug builds. `@expo/cli` telemetry is disabled with `EXPO_NO_TELEMETRY=1` in CI and must be set locally | None beyond INTERNET | APPROVED | 2026-10-08 |
| expo-constants | ~57.0.21 | apps/mobile | App config at runtime (expo-router peer) | None. No installation ID in this SDK; the source has no `installationId`/Android ID reads (checked) | None | APPROVED | 2026-10-08 |
| expo-linking | ~57.0.12 | apps/mobile | Deep-link URL parsing (expo-router peer) | None (URL parsing only) | None | APPROVED | 2026-10-08 |
| expo-router | ~57.0.25 | apps/mobile | File-based navigation (PRD 8.1). Transitive native modules: `@expo/ui`, `expo-symbols`, `expo-glass-effect`, `react-native-screens`; web-only: `expo-server`, `@radix-ui/*`, `vaul` | None at runtime (URL hits are comments and web history code; `expo-server` is used only for web/server builds, which Facto does not ship) | None | APPROVED | 2026-10-08 |
| expo-status-bar | ~57.0.1 | apps/mobile | Status bar style | None | None | APPROVED | 2026-10-08 |
| @expo/vector-icons | 15.1.1 | apps/mobile | Ionicons glyphs, bundled in the app (no font download) | None at runtime (URLs only in its font-generation script) | None | APPROVED | 2026-10-08 |
| react | 19.2.3 | apps/mobile | UI library | None | None | APPROVED | 2026-10-08 |
| react-native | 0.86.3 | apps/mobile | Native runtime (Hermes). Dev menu and inspector exist only in debug builds | Runtime: none of its own. Debug builds connect to the local Metro server | INTERNET (declared by us) | APPROVED | 2026-10-08 |
| react-native-safe-area-context | ~5.7.0 | apps/mobile | Safe-area insets | None | None | APPROVED | 2026-10-08 |
| react-native-screens | ~4.26.0 | apps/mobile | Native navigation containers (expo-router peer) | None | None | APPROVED | 2026-10-08 |
| i18next | 26.4.2 | apps/mobile | Translations FR/EN (PRD 9.4). Resources are bundled; no backend plugin is installed | None (no backend or language-detector plugins used) | None | APPROVED | 2026-10-08 |
| react-i18next | 17.0.16 | apps/mobile | React bindings for i18next | None (URL hits are links in warning messages) | None | APPROVED | 2026-10-08 |
| @types/react | ~19.2.2 | apps/mobile (dev) | React type definitions | None (types only) | None | APPROVED-DEV | 2026-10-08 |
| react-native-libsodium | 1.7.0 | apps/mobile | libsodium on the phone through JSI (PRD 7.1), behind `createReactNativeBackend` (ADR 0005 addendum). Native libsodium is bundled. Transitive (web build only, not used on Android/iOS): `libsodium-wrappers`, `libsodium-wrappers-sumo`, `@noble/hashes` | None (no network code in its JS; the native part is libsodium) | None (its Expo plugin is a no-op) | APPROVED | 2026-10-08 |
| @op-engineering/op-sqlite | 18.2.5 | apps/mobile | Local database with SQLCipher (`"op-sqlite": {"sqlcipher": true}` in apps/mobile/package.json; PRD 7.2). Keys go through `sqlite3_key_v2`; we pass the raw-key form. The app refuses to open a database when `isSQLCipher()` is false | None unless libsql/Turso (`openRemote`) is enabled, which Facto never does; the optional web peer `@sqlite.org/sqlite-wasm` is not installed | None | APPROVED | 2026-10-08 |
| expo-secure-store | ~57.0.4 | apps/mobile | Device secret and wrapped database key in Android Keystore / iOS Keychain, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (PRD 5.1, 7.2) | None | None (plugin set to `faceIDPermission: false`, so no NSFaceIDUsageDescription; Android backup rules not added because `allowBackup` is false) | APPROVED | 2026-10-08 |
