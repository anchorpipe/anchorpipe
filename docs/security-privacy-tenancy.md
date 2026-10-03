# Security, privacy, and tenancy

## Tenant boundary

Tenant scope comes from server-verified identity or credential, never from a payload repository ID, arbitrary header, queue message, or opaque identifier. Propagate `tenant_id` and `repository_id` through every row, event, object key, metric label, cache key, and authorization decision.

Use pooled PostgreSQL with mandatory tenant predicates plus RLS or an equivalent defense. Request roles must not bypass the isolation policy. Every asynchronous consumer re-checks resource ownership and authorization context. Add negative tests for cross-tenant reads and writes through the deployed request role and connection pooling.

Apply per-tenant limits for payload size, concurrency, storage, events, workers, and API rate. Keep a maintained inventory of tenant-owned tables and object prefixes.

## Identity and secrets

Prefer a GitHub App with minimum permissions and immutable provider numeric IDs. Encrypt provider access and refresh tokens at rest under a KMS/vault design, separate refresh-token access, rotate and revoke credentials, and never log them.

CI uploads use an opaque key ID plus secret, timestamp/nonce freshness, tenant binding, and mandatory idempotency. Development placeholders such as `CI_HMAC_SECRET=dev-secret-change-me`, `CRON_SECRET=dev-cron-secret`, and MinIO defaults must fail closed outside local development.

## Webhooks and external providers

Verify the raw request bytes with the exact HMAC format and constant-time comparison. Enforce body size/content-type limits, high-entropy secrets, delivery-ID uniqueness/expiry, event/action allow-lists, and fast acknowledgement followed by asynchronous processing.

Do not treat provider branch names as identity; use immutable provider IDs and commit SHAs. Provider integrations must have narrow permissions, bounded retries, backoff, and explicit failure states.

## Evidence handling

Test names, paths, failure output, commit/branch data, usernames, and artifacts may be private. Default to metadata and aggregates. Redact tokens, cookies, authorization headers, emails, and sensitive parameters before indexing or exporting. Do not ingest source code unless essential, and never execute uploaded report content.

Raw evidence is private by default and served with short-lived signed URLs plus role checks. Apply data-class retention: short for raw logs/screenshots/traces, longer for compact outcomes/signatures, and aggregate/anonymized trends only as long as needed. Define backup expiry and legal holds. Data-subject deletion must not silently erase repository-owned audit history.

## Audit and logging

Audit actor/service, tenant, repository, action, target, outcome, request/delivery ID, correlation ID, timestamp, and reason for authentication failures, role changes, secret operations, exports/deletions, webhook rejects, replay, and admin actions.

Never log passwords, tokens, keys, raw authorization headers, unnecessary PII, or raw customer evidence. Protect audit history from ordinary account deletion through actor snapshots or nullable references with retained context.

## Threat model

Cover browser/API, GitHub, queue, database, object storage, and CI boundaries. Threats include IDOR, cross-tenant leakage, replay, SSRF, XML/decompression bombs, log injection, denial of service, compromised runners/dependencies, and insider access.

Secure defaults are private-by-default, deny-by-default, encrypted transit/at rest, bounded inputs, short-lived credentials, and fail-closed missing configuration. Do not begin with per-tenant databases, bespoke cryptography, or confidential computing.

## Required security tests

- Cross-tenant IDOR for API, objects, cache, queue, metrics, exports, and RLS.
- HMAC raw-body verification, exact prefix, replayed delivery ID, event allow-list, and body limit.
- Concurrent password-reset redemption, session invalidation, anti-enumeration, rate limiting, and log redaction.
- Upload path traversal, digest mismatch, expired artifact, decompression bomb, and unsupported media type.
- Retention, legal hold, export expiry, deletion, offboarding, and restore behavior.
