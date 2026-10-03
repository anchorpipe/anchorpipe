FROM rust:1.85-bookworm AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 --create-home ingestion
COPY --from=builder /build/target/release/anchorpipe-ingestion-rust /usr/local/bin/anchorpipe-ingestion-rust
USER ingestion
EXPOSE 8080
ENV INGESTION_BIND_ADDR=0.0.0.0:8080
ENTRYPOINT ["/usr/local/bin/anchorpipe-ingestion-rust"]
