# ADR 0007: Embedded Tor with Arti (spike findings)

- Status: Proposed (spike; waiting for project owner approval)
- Date: 2026-10-08
- PRD sections: 5.5, 7.5, 9.6

## Context

PRD 5.5 makes Tor optional, through an embedded Arti client and Facto's onion service. No maintained React Native module embeds Arti.

## Spike (`spikes/arti/`)

A Rust crate links `arti-client` 0.47 with `tokio`, `rustls` (ring provider only), `onion-service-client` and `static-sqlite`. Release profile: `opt-level = "z"`, LTO, one codegen unit, stripped, `panic = "abort"`.

| Check | Result in this environment |
| --- | --- |
| Builds for Linux x86_64 | Yes, about 2.5 minutes cold |
| Creates a configured Tor client without network | Yes |
| Binary size, x86_64, stripped | 5.7 MB (2.8 MB gzip -9) |
| Bootstraps to the Tor network | **Not verified.** The container only allows outbound HTTPS through a proxy; bootstrap timed out after 90 s, as expected |
| `cargo check --target aarch64-linux-android` | Pure-Rust crates compile; **stops at `ring` and SQLite**, which need the Android NDK's clang. No NDK in this container, so the Android build is **not verified** |

Two findings from the build:

- rustls 0.23 needs exactly one crypto provider. Enabling both or neither panics at runtime. The spike pins `ring` (no cmake needed for Android); `aws-lc-rs` would add build complexity.
- `static-sqlite` bundles SQLite for Arti's directory cache. The app will separately bundle SQLCipher (`op-sqlite`). Two SQLite copies coexist only if their symbols do not clash; this must be checked in the native module build.

## Size against the 40 MB budget (PRD 9.6)

Estimate per Android ABI, stripped: about 6 MB uncompressed and about 3 MB compressed in the APK. Shipping arm64-v8a and armeabi-v7a, plus x86_64 for emulators in debug only, adds about 6 MB to a release APK. Play App Bundles deliver one ABI per device, which halves that. This is an estimate from the x86_64 build; the real numbers come from the first Android build.

## Proposed design

1. A small Rust crate (`native/facto-tor`) wraps `arti-client`. It starts a SOCKS5 listener on `127.0.0.1` with a random port, and a random username and password per app session, so other apps on the phone cannot use the proxy.
2. It is exposed to the app as an Expo native module (Kotlin/Swift → Rust through `uniffi`), with `start()`, `status()` and `stop()`. Built with `cargo-ndk` for Android and as an XCFramework for iOS.
3. When Tor mode is on, the app's single HTTP client routes every request through the SOCKS proxy and only to the onion service address. In Tor mode there is no fallback to clearnet; a failure is shown to the user.
4. Arti state and cache live in the app sandbox and are erased by the panic wipe (PRD 4.8).
5. Arti's own dependencies go through the dependency gate as one reviewed unit (`DEPENDENCIES.md`), with `cargo-deny` added to CI for the Rust tree.

## Open items before acceptance

- Build on a machine or CI runner with the Android NDK; measure the real `.so` sizes and cold-start bootstrap time on a 2 GB Android phone over 3G.
- iOS: background limits and the bootstrap time on first open.
- Bridges or pluggable transports for networks that block Tor (not in V1 scope; worth a decision before the DRC pilot).
