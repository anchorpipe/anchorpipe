use anchorpipe_receipt_gate::{
    router, AppState, Config, IntakeDbConfig, PostgresIntakePort, UnavailablePort,
};
use std::{net::SocketAddr, sync::Arc};
use tokio::net::TcpListener;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    init_tracing();
    let config = Config::from_env()?;
    tracing::info!(config = %config.redacted_summary(), "starting ingestion service");
    let bind_addr: SocketAddr = config.bind_addr;
    let listener = TcpListener::bind(bind_addr).await?;
    // Fail-closed default is the unavailable port; when a database URL is
    // present we wire the durable Postgres intake adapter instead.
    let port: Arc<dyn anchorpipe_receipt_gate::DurableIngestionPort> = match IntakeDbConfig::from_env() {
        Ok(db_config) => match PostgresIntakePort::connect(db_config).await {
            Ok(adapter) => {
                tracing::info!("durable Postgres intake adapter connected");
                Arc::new(adapter)
            }
            Err(_) => {
                tracing::warn!("intake database unreachable; failing closed with UnavailablePort");
                Arc::new(UnavailablePort)
            }
        },
        Err(_) => {
            tracing::warn!("no INGESTION_DATABASE_URL/DATABASE_URL configured; failing closed with UnavailablePort");
            Arc::new(UnavailablePort)
        }
    };
    let app = router(AppState::new(config, port));
    tracing::info!(address = %listener.local_addr()?, "receipt gate HTTP listener ready");
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    tracing::info!("ingestion service stopped");
    Ok(())
}

fn init_tracing() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "anchorpipe_receipt_gate=info,tower_http=info".into());
    tracing_subscriber::registry()
        .with(filter)
        .with(tracing_subscriber::fmt::layer().json().flatten_event(true))
        .init();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { _ = ctrl_c => {}, _ = terminate => {} }
    tracing::info!("shutdown signal received");
}
