FROM rust:1.85-bookworm AS builder
WORKDIR /build
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 --create-home ingestion
COPY --from=builder /build/target/release/anchorpipe-receipt-gate /usr/local/bin/anchorpipe-receipt-gate
USER ingestion
EXPOSE 8080
ENV INGESTION_BIND_ADDR=0.0.0.0:8080
ENTRYPOINT ["/usr/local/bin/anchorpipe-receipt-gate"]
