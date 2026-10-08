# Arti spike (ADR 0007)

A minimal Rust binary that links `arti-client` 0.47 with the features Facto would need (tokio, rustls with ring, onion-service client, bundled SQLite) and creates a Tor client without network access. With `--connect` it bootstraps to the Tor network.

```sh
cargo build --release
./target/release/facto-arti-spike            # creates the client, no network
./target/release/facto-arti-spike --connect  # bootstraps (needs direct TCP to Tor relays)
```

This is not shipped code. The Phase 3 module will expose a SOCKS5 listener on 127.0.0.1 through a React Native native module; see ADR 0007.
