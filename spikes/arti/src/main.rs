//! Spike only (ADR 0007). Bootstraps an embedded Tor client with no disk state outside the app
//! sandbox, then exposes nothing: the real module would serve a SOCKS5 listener on 127.0.0.1
//! that the app's HTTP client is routed through. No network call happens unless `--connect` is passed.

use anyhow::Result;
use arti_client::{config::TorClientConfigBuilder, TorClient};

#[tokio::main]
async fn main() -> Result<()> {
    let state = std::env::temp_dir().join("facto-arti-spike/state");
    let cache = std::env::temp_dir().join("facto-arti-spike/cache");
    let config = TorClientConfigBuilder::from_directories(state, cache).build()?;

    // Build without bootstrapping: proves the client links and configures with no network.
    let client = TorClient::builder().config(config).create_unbootstrapped()?;

    if std::env::args().any(|a| a == "--connect") {
        client.bootstrap().await?;
        println!("bootstrapped");
    } else {
        println!("client created (not bootstrapped)");
    }
    Ok(())
}
