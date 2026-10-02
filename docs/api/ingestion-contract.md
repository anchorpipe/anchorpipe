# Ingestion contract

This is the target v1 contract. Until implemented and acceptance-tested, it is a proposal rather than a production guarantee.

## Request

`POST /v1/ingestions`

Required properties:

- tenant-scoped `Idempotency-Key`;
- one local stream/file or an allow-listed provider artifact reference;
- source/provider and `schema_version`;
- logical run identity, commit SHA, framework, and content hash;
- authenticated tenant/repository context derived by the server.

The API validates size, count, decompression, media type, and artifact path limits before accepting input. It must not fetch arbitrary URLs or execute report content.

## Versioned envelope

```json
{
  "event_id": "opaque-id",
  "tenant_id": "server-derived",
  "repository_id": "provider-id",
  "source": "local|github-actions",
  "schema_version": "test-report.v1",
  "occurred_at": "2026-01-01T00:00:00Z",
  "received_at": "server-time",
  "run": {
    "provider_run_id": "opaque-id",
    "attempt": 1,
    "commit_sha": "immutable-sha",
    "ref": "observed-ref",
    "framework": "junit"
  },
  "content": {
    "sha256": "digest",
    "media_type": "application/xml",
    "size_bytes": 1234,
    "object_uri": "private-server-reference"
  },
  "trace_id": "opaque-id"
}
```

`tenant_id` and authorization context are not trusted from the request body. Preserve source schema, parser version, warnings, and raw digest separately from canonical facts.

## Response

A successful accepted request returns `202 Accepted`:

```json
{
  "ingestion_id": "opaque-id",
  "state": "accepted",
  "status_url": "/v1/ingestions/opaque-id"
}
```

The receipt and outbox event must be committed before `202`. Parsing and scoring do not run synchronously in the request path.

## Status

`GET /v1/ingestions/{id}` returns:

- `accepted` — durable receipt exists and work is queued;
- `processing` — normalization or scoring is running;
- `completed` — canonical facts and projections are available;
- `partial` — safe subset accepted with explicit parser warnings;
- `quarantined` — rejected or isolated because of malformed, unsafe, conflicting, or unsupported input;
- `failed` — retry budget exhausted with an opaque error reference;
- `replayed` — operator-authorized reprocessing, linked to the original receipt.

Return stable opaque error codes to callers. Keep SQL, provider responses, credentials, and internal stack traces server-side.

## Idempotency and retries

The same tenant and idempotency key must return the original receipt. A conflicting payload hash under the same key is a client error and must not overwrite the first request. Delivery IDs, outbox events, and worker writes require uniqueness constraints and a processing ledger.

At-least-once delivery is the contract. Consumers must tolerate duplicate relay, crash-after-write, retry, and operator replay. Dead-letter items retain reason, attempts, timestamps, and replay authorization.

## Read APIs

- `GET /v1/tests/{testId}/history`
- `GET /v1/findings`
- `GET /v1/findings/{id}/evidence`
- `GET /v1/runs/{id}`
- operator-only replay with tenant, time range/event IDs, target consumer/version, and dry-run

Every response is tenant-authorized and includes freshness metadata where a read projection may lag canonical facts.

## CLI

```text
anchorpipe ci ingest \
  --format auto|junit|jest-json|playwright-json \
  --file/dir/stdin \
  --provider github-actions|local \
  --run-id RUN_ID --sha COMMIT_SHA \
  --publish checks|none --comment never \
  --retry N --json --dry-run
```

Machine JSON goes to stdout; diagnostics go to stderr; tokens never print. `--wait` may poll status but CI is not blocked on scoring latency.

## GitHub artifact and Check Run rules

Artifact retrieval is allow-listed and artifact-first: resolve the repository/run, select a configured name/glob, download the expiring redirect, validate digest/size/type, unpack safely, and parse only allow-listed members. Publish one stable idempotent Check Run per logical suite with counts, warnings, and a report link. Comments and line annotations are not v1 sources of truth.
