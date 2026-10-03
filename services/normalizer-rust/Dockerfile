FROM rust:1.75-bookworm AS builder
WORKDIR /usr/src/normalizer
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/src/normalizer/target/release/anchorpipe-normalizer /usr/local/bin/anchorpipe-normalizer
USER 65532:65532
ENTRYPOINT ["/usr/local/bin/anchorpipe-normalizer"]
