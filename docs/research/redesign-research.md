> **Repository record.** This is the complete research and forensic report used to define the redesign. It contains historical approval-gated recommendations; current repository state is documented in the distilled guides alongside it.

# Anchorpipe redesign report

**Status:** principal-engineer redesign proposal; based on the supplied repository forensic findings and research results.  
**Scope:** open-source MVP for evidence-based flaky-test analytics and CI report ingestion.  
**Posture:** preserve useful working seams, but do not mistake scaffolding, docs, or intended behavior for production guarantees.

## Executive summary

Anchorpipe should become a **tenant-aware, evidence-first test-execution analytics product**, not an opaque “flake score” service and not a general CI orchestration platform. Its first credible release is a modular monolith with a durable ingestion boundary, PostgreSQL as the operational source of truth, private object storage for raw evidence, and one worker process for asynchronous normalization/scoring. It should accept local/JUnit reports and GitHub Actions artifacts, retain every execution attempt, expose uncertainty and evidence, and publish one idempotent GitHub Check Run.

The current repository is substantial but **not release-ready**. It has useful parser adapters, Prisma entities, HMAC intent, RBAC/audit models, storage/MQ seams, and a broad unit-test suite. Conversely, the clean build and lint gates fail; the advertised ingestion worker has no source; queue publish failure can be treated as non-fatal; GitHub `check_run` ingestion returns success while logging “not fully implemented”; route rate limits are not actually wired; metrics are unauthenticated; webhook delivery deduplication is absent; password-reset consumption is race-prone; retention is configured but not demonstrably executed; and legal files do not support the stated Apache-2.0 posture. These are material product and safety gaps, not polish items.

The redesign therefore follows four principles:

1. **Facts before conclusions:** immutable attempts, raw evidence, provenance, and parser/scorer versions precede findings.
2. **Uncertainty is a product field:** a finite rerun campaign cannot prove stability; show denominators, intervals/posteriors, recency, environment coverage, and abstention.
3. **Durability before distribution:** persist an ingestion receipt and outbox record atomically before acknowledging; make every consumer idempotent.
4. **Approval-gated cleanup:** no destructive GitHub action, historical license relabeling, or deletion of code/docs should occur until the owner approves an inventory and migration plan.

## 1. Product thesis and sharply bounded v1

### 1.1 Thesis

**Anchorpipe turns noisy CI test observations into explainable, tenant-isolated evidence about nondeterminism and regression risk.** It does not claim to prove that a test is “flaky.” It reports what was observed, under which comparable conditions, with calibrated uncertainty and a reasoned queue for investigation.

The user outcome is a faster answer to three questions:

- Did this failure reproduce under controlled same-condition attempts?
- Is the mixed outcome plausibly nondeterministic, or is it a persistent product/infrastructure failure?
- What should an engineer investigate next, and what evidence supports that recommendation?

A rerun that passes is mitigation, not proof of flakiness; pytest explicitly describes reruns as mitigation and points to randomization/replay as diagnostic aids [1]. A finite campaign also cannot prove stability: with failure probability `p`, the chance of seeing at least one failure in `n` attempts is `1-(1-p)^n` [1]. Therefore the product must use evidence tiers rather than binary truth.

### 1.2 v1 customer and workflow

V1 supports a repository owner or CI maintainer who:

1. uploads a report from a local file/STDIN or resolves a GitHub Actions artifact;
2. gets a durable ingestion receipt and asynchronous processing status;
3. sees normalized test executions, attempts, failure signatures, and evidence links;
4. sees a per-test evidence tier and transparent reason list;
5. receives a stable GitHub Check Run summary when explicitly configured.

**Initial adapters:**

- JUnit XML as the universal first format, parsed tolerantly and securely;
- existing Jest, Pytest, and Playwright JSON adapters retained behind the same registry;
- GitHub Actions artifact retrieval as the first provider integration;
- local/file and CLI ingestion as a provider-independent path.

JUnit is pragmatic but not a single governed schema; implementations vary, duplicate-name semantics differ, and optional pytest properties can break strict validation [2]. V1 must preserve warnings/raw hashes and reject only safely, not pretend one schema is universal.

### 1.3 Explicit v1 non-goals

V1 does **not** include:

- automatic rerunning of arbitrary customer workflows;
- provider webhooks as the only ingestion path or synchronous webhook processing;
- GitLab/Jenkins/Azure native integrations beyond documented JUnit/file compatibility;
- native Mocha parsing (document JUnit output instead);
- PR review comments or line annotations as a source of truth;
- binary auto-quarantine based solely on a score;
- supervised ML as the decision rule;
- source-code indexing or execution of uploaded artifacts;
- a fully event-sourced control plane;
- per-tenant databases, confidential computing, mTLS everywhere, or SLSA L3;
- a Kubernetes/Terraform matrix before one deployment path is operable;
- destructive cleanup, license relabeling, or historical deletion without owner approval.

## 2. Evidence-based algorithm strategy

### 2.1 Baseline detector

Every execution becomes one immutable `TestRunAttempt`/`TestExecution` with a stable test identity, tenant/repository, commit SHA, environment fingerprint, attempt index, order/seed/shard, timing, outcome reason, and failure signature. Never compress retries into `rerunCount` or overwrite the first observation.

For comparable strata—same tenant/repository, test identity, commit, and environment hash—compute failures `f` out of attempts `n` using a binomial model. Report:

- `n`, `f`, and point estimate `f/n`;
- Jeffreys posterior `Beta(f+0.5, n-f+0.5)` or a Wilson interval;
- lower/upper bound and data recency;
- environment/commit coverage and detector version;
- evidence source: direct mixed outcomes, controlled contrast, heuristic, or model.

Do not use Wald intervals, particularly with small `n` or estimates near 0/1 [1]. With zero observed failures the approximate 95% upper bound is `3/n`; approximately 300 independent attempts are needed to bound failure probability below 1%, and roughly 3,000 to bound it below 0.1% [1]. Normal CI should therefore stop early on evidence rather than burn hundreds of retries.

### 2.2 Sequential retry policy

On a first failure:

1. retry 2–3 times under the same condition;
2. if all fail, classify as **persistent failure candidate**, not flaky;
3. if outcomes mix, collect attempts up to a normal budget of 10 total;
4. reserve 20–50 targeted attempts for high-impact/high-uncertainty tests, nightly rather than on the critical CI path;
5. stop when the posterior probability that `p` exceeds an operational threshold is sufficiently high/low, or when the budget is exhausted.

The UI/API must distinguish **observed flaky** (comparable mixed outcomes), **probable** (supporting but incomplete evidence), **environment-sensitive candidate**, **persistent regression candidate**, and **insufficient evidence**. “Stable,” “flaky,” and “highly flaky” can remain presentation classes derived from uncertainty-aware thresholds, not hard-coded score cutoffs.

A persistent failure after controlled reruns remains a product failure even if historical data shows flakiness. This prevents the detector from becoming an excuse to suppress regressions.

### 2.3 Cause hypotheses via controlled perturbation

Run A/B contrasts, each preserving as many other variables as possible:

- same order vs randomized order and repeated suite prefixes for order dependence;
- same seed vs varied seeds for seed sensitivity;
- stable vs varied worker/CPU/container/browser/network for environment dependence;
- capture duration, timeout, parallelism, resource pressure, schedule, and queue/shard context for timing/concurrency signals.

Classify order-dependent (OD) only when failures reproduce under changed order and disappear under a known-good order under comparable conditions; otherwise report NOD/unknown or a hypothesis. iDFlakies demonstrates OD/NOD classification through randomized orders and truncated failing-order reruns, while warning that repeated failure in one order may still have another nondeterministic cause [3].

Differential coverage is a useful triage signal: a newly failing test that did not execute changed code, or that passes on same-code rerun, may be prioritized as potentially flaky. DeFlaker’s hybrid coverage is incomplete and can create false alarms, so it must never be the sole detector [4].

### 2.4 Transparent heuristic score

The MVP score is a reasoned ranking, not a truth label. It combines direct statistical evidence with explicit features:

- mixed-outcome strength and posterior bounds;
- recency and failure clustering;
- duration/timeout anomaly;
- environment concentration and environment diversity;
- order/seed contrast;
- changed-code coverage when a trustworthy adapter exists;
- impact/severity supplied by repository policy.

Each output contains a reason list and links to the supporting attempts. Store `algorithmVersion`, `policyRevision`, excluded samples, and input attempt IDs.

### 2.5 Later ML, not MVP magic

Once adjudicated labels accumulate, train an interpretable baseline such as class-weighted logistic regression or a calibrated Random Forest/gradient boosting model. Features may include historical rates, duration/timeout behavior, test metadata/smells, coverage, signatures, environment diversity, and order/seed sensitivity. FlakeFlagger found Random Forest strongest on its dataset but explicitly cautioned against transferability [5]. Treat ML first as prioritization/ranking, then consider auto-quarantine only with a high precision budget and abstention for sparse support.

Use project- and time-held-out evaluation, not random row-level splits. The “negative” class after finite reruns is not a reliable stable oracle [5]. For model probabilities, use a time-separated calibration set, reliability diagrams, Brier/log loss, and calibration error; a raw Random Forest probability is not confidence [6].

### 2.6 Evaluation protocol and acceptance metrics

Build a replayable benchmark of immutable attempt sequences with labels from repeated execution, maintainer adjudication, and confirmed fixes where possible. Keep **unknown/insufficient evidence** as a label. Separate natural prevalence from synthetic fault injection.

Report, by project/framework/environment/cause:

- precision at auto-quarantine threshold;
- recall and PR-AUC/average precision;
- F1 or cost-weighted F-beta;
- false-quarantine rate and alert volume per 1,000 tests;
- detection latency and rerun CPU cost;
- calibration error, Brier score, and log loss;
- coverage of supported evidence types;
- abstention rate and operator override rate.

Optimize for precision at any automatic action threshold; retain a lower-threshold investigation queue. Bootstrap intervals over projects, not only test rows. Compare rerun-only, statistical, perturbation, differential-coverage, heuristic, and ML systems under equal budgets.

## 3. Target architecture

### 3.1 Architectural choice

Adopt a **modular monolith plus workers**. Keep API/auth/configuration/read projections and the primary transaction boundary together while boundaries are still changing; move bursty normalization, feature extraction, scoring, and notification work behind durable jobs. Fowler’s monolith-first guidance supports learning boundaries before extraction and highlights the operational premium of premature microservices [7].

Target components:

1. **API/auth module:** tenant derivation, RBAC, ingestion endpoint, status/read APIs.
2. **Ingestion boundary:** envelope validation, credential verification, idempotency, raw object receipt, PostgreSQL receipt plus outbox transaction.
3. **Provider adapters:** GitHub Actions artifact resolver/download; future GitLab/Jenkins/Azure adapters.
4. **Report adapters:** JUnit, Jest, Pytest, Playwright; secure tolerant parsing.
5. **Normalization module:** canonical identities, parser warnings, evidence links, signatures.
6. **Attempt/feature module:** controlled metadata and derived features.
7. **Scoring module:** sequential statistical detector, heuristics, later model registry.
8. **Read projections:** current run/test/finding/score views with freshness timestamps.
9. **Publisher module:** idempotent Checks API; comments only later and opt-in.
10. **Operations module:** outbox relay/jobs, retry/DLQ, replay, retention, audit, metrics/traces.

### 3.2 Data flow

```text
CI/CLI/GitHub artifact
        |
        v
Authenticate + authorize + validate envelope
        |
        +--> stream raw bytes --> private object storage (hash, retention class)
        |
        +--> PostgreSQL transaction:
               ingestion_receipt + idempotency claim + outbox event
                         |
                    return 202 + ingestion_id
                         |
                         v
              worker: normalize -> classify/features -> aggregate -> score -> notify
                         |
                         +--> canonical facts/projections/findings
                         +--> idempotent Check Run outbox
                         +--> audit/telemetry
```

The request must not parse or score reports. The receipt/outbox transaction must commit before acknowledging. Transactional outbox is the remedy for database/message dual writes, but relay duplicates are expected; consumers must be idempotent [8]. Existing `processIngestion` behavior that continues when RabbitMQ publish fails is availability-friendly but data-loss-prone and must be replaced.

Use a stable versioned envelope, for example `test-report.v1`, containing `event_id`, `tenant_id`, `repo_id`, `source`, `schema_version`, occurred/received times, run identity, commit SHA, framework, content hash, artifact URI, and trace ID. Preserve source schema and parser version separately from the canonical model. Return `202 Accepted` with ingestion state; expose status and processing lag.

At-least-once delivery is the contract. Key events by tenant/repository/test identity when per-test ordering matters. Existing RabbitMQ is adequate for initial command/work queues if durable receipts and replay storage exist; adopt Kafka/managed retained logs only after measured retention, replay, and consumer needs justify the operating cost [9]. Do not promise end-to-end exactly-once across Kafka and PostgreSQL [10].

### 3.3 Domain model

The current `TestCase`/`TestRun`/`FlakeScore` model is a compatibility projection, not the final fact model. Add:

- `Organization/Tenant`: owner, lifecycle, policy, quotas, retention defaults.
- `Repository`: immutable provider ID plus historical owner/name attributes.
- `TestDefinition`: `(repository_id, stable adapter-normalized test_key, framework)`.
- `Commit`: `(repository_id, object_format, commit_oid)` with tree/parents/author/committer.
- `RefSnapshot`: observed branch/ref and immutable SHA per run.
- `Run`: logical CI invocation.
- `Attempt`: numbered workflow/job/test retry, parent run, source attempt.
- `Job/Shard`, `SuiteExecution`, `TestExecution`: hierarchy with ordinal, retry-of, status, duration, evidence links.
- `EnvironmentSnapshot`: canonical manifest/digest for OS/image/container, runtime/tool versions, lock hash, locale/timezone, flags, dependencies, and secret-presence booleans only.
- `FailureSignature`: versioned category, exception type, normalized-message hash, top-frame hash, assertion diff, and infrastructure dimensions.
- `Evidence`/`EvidenceLink`: immutable content-addressed object with SHA-256, media type, size, capture time, redaction version, URI, and source execution.
- `Finding`/`FindingEvent`: derived/reviewed assertion, detector/version, confidence/evidence window, reviewer, and append-only changes.
- `SuppressionRevision`, `OwnerAssignment`, `PolicyRevision`: scoped, time-bounded decisions with historical snapshots.
- `IngestionReceipt`, `OutboxEvent`, `ProcessingLedger`, `IdempotencyKey`, `DeadLetter`.

GitHub distinguishes workflow run identity, `run_attempt`, `head_sha`, branch, and job data; model these separately rather than collapsing retries [11]. Git commit object identity is the reproducibility anchor, not a mutable branch name [12]. Keep `TestRun` as a compatibility view during migration.

Critical invariants:

- raw facts are append-only; corrections are compensating events;
- derived scores declare algorithm, window, policy, and input IDs;
- all timestamps carry source/observed times in UTC;
- conflicting replays are quarantined;
- evidence is redacted before analytics and tenant-isolated;
- branch/ref names never replace commit SHAs;
- deletion removes blobs/indexes/credentials subject to legal holds, not immutable audit history without an approved retention policy.

### 3.4 Storage

- **PostgreSQL:** tenant-scoped receipts, canonical facts, identities, policies, current projections, score snapshots, audit, outbox, processing ledger, and small evidence metadata. Partition/time-cluster high-volume attempts and index `(tenant_id, test_id, occurred_at)`.
- **Object storage:** private S3-compatible storage for raw reports/logs/screenshots/traces, addressed by digest and tenant/repository/run; lifecycle and retention classes. Do not accept arbitrary URLs embedded in reports.
- **Analytics history:** defer Parquet/Iceberg until volume requires it; then keep immutable facts and snapshots off OLTP. Iceberg provides committed snapshot reads and schema/partition evolution [13].
- **Redis:** optional cache/rate limiter only; never owns ingestion durability.

### 3.5 APIs and CLI

Core endpoints:

- `POST /v1/ingestions` with required tenant-scoped `Idempotency-Key`, local stream or presigned upload reference; returns `202` and `ingestion_id`.
- `GET /v1/ingestions/{id}` with state, warnings/errors, freshness/lag.
- `GET /v1/tests/{testId}/history`.
- `GET /v1/findings` and `GET /v1/findings/{id}/evidence`.
- `GET /v1/runs/{id}` and report/evidence links.
- operator-only replay endpoint with tenant, time range/event IDs, target consumer/version, dry-run.

CLI contract:

```text
anchorpipe ci ingest --format auto|junit|jest-json|playwright-json \
  --file/dir/stdin --provider github-actions|local \
  --run-id --sha --publish checks|none --comment never \
  --retry N --json --dry-run
```

Stable machine JSON goes to stdout; diagnostics to stderr; tokens never print. `--wait` may poll, but CI is not blocked on scoring latency. Validate size/count/decompression limits and return stable opaque error references, not internal SQL/provider errors.

### 3.6 Integration rules

GitHub Actions integration is artifact-first: resolve repository/run, list artifacts, select an allow-listed name/glob, download the expiring redirect URL, validate digest/size/type, unpack safely, and parse only allow-listed members. The first provider integration should publish one stable Check Run per logical suite, with counts, warnings, and a report link. Checks are machine-readable and branch-protection compatible; comments are noisy and should be delayed [14].

Webhook support, when added, must verify raw bytes with exact `sha256=` HMAC, constant-time comparison, delivery-ID replay protection, event allow-listing, body limits, fast acknowledgement, and asynchronous processing [15]. A GitHub App with minimum permissions is preferred over broad OAuth [16].

### 3.7 Migration strategy

1. Add envelope/canonical schema, receipts, outbox, ledger, status/error fields; preserve current API response shape.
2. Add outbox relay to existing RabbitMQ; use unique constraints and idempotent consumers; dual-write/compare current projections.
3. Move parsing/scoring out of the request path; backfill raw reports and compare counts/scores.
4. Add retained event log only if measured replay/retention needs exceed the jobs/outbox design.
5. Extract normalization/scoring/notifications one at a time behind stable contracts and per-tenant canaries.

## 4. Forensic gap register

**Decision vocabulary:** Preserve = retain and harden; Rewrite = retain concept but change implementation/contract; Delete = remove from active product or mark unsupported. Any destructive repository/GitHub action is approval-gated in Section 10.

### P0 / critical: blocks a trustworthy release

| Area | Evidence/path | Current truth | Decision |
|---|---|---|---|
| Clean build | `libs/database/src/index.ts`, `libs/database/prisma/schema.prisma`, `apps/web/Dockerfile` | Generated Prisma client is not tracked; clean `npm run build` fails, while Docker generates it and masks the divergence. | **Rewrite**: first-class Nx generate target, CI dependency, empty-checkout build gate. |
| Tenant boundary | `libs/database/prisma/schema.prisma:18-47` | Repo is effective boundary; no first-class Organization/Tenant. | **Rewrite**: tenant entity, immutable provider IDs, RLS/equivalent, composite predicates, negative tests. |
| Ingestion durability | `apps/web/src/lib/server/ingestion-service.ts`, `services/ingestion/README.md`, `libs/mq` | Synchronous Next.js path; publish failure can be non-fatal; worker is development-only/scaffolded. | **Rewrite**: receipt + outbox before `202`; durable jobs, retries, DLQ, replay. |
| Fake check-run ingestion | `apps/web/src/lib/server/github-app-ingestion-trigger.ts:384-395` | Logs “not fully implemented,” TODO artifact fetch, returns `{success:true}`. | **Delete or rewrite**: remove capability until implemented, or ship artifact retrieval with acceptance tests; never acknowledge false success. |
| License/legal posture | missing root `LICENSE`/`NOTICE`; `IP_ASSIGNMENT.md`; `package.json` | AGPL/default and commercial/relicensing language conflicts with requested Apache-2.0/no assignment. | **Rewrite, approval required**: use canonical Apache-2.0 only after rights inventory; remove assignment/restricted language. |
| Authentication of CI uploads | `apps/web/src/lib/server/hmac-auth.ts` | `Authorization: Bearer <repoId>` treats an identifier as selector, not credential; audit may store `repoToken`. | **Rewrite**: opaque key ID + secret, tenant binding, timestamp/nonce, redaction, rotation. |
| Webhook replay | `apps/web/src/app/api/webhooks/github-app/route.ts`, `github-webhook.ts` | HMAC exists, but delivery IDs are not persisted/deduplicated; prefix handling is not strict. | **Rewrite**: raw-body verification, exact prefix, delivery uniqueness/expiry, allow-list, async acknowledgment. |
| Security gate health | `package.json`, `.github/workflows/`, lockfile | ESLint/plugin incompatibility; `npm ci` reports 127 advisories including 8 critical. | **Rewrite**: compatible pinned toolchain, triage exceptions, severity-bounded CI gate. |

### P1 / high: blocks external production use or honest product claims

| Area | Evidence/path | Current truth | Decision |
|---|---|---|---|
| Rate limiting | `apps/web/src/lib/server/rate-limit.ts`, API routes, ADR 0015 | Redis limiter exists but route scan found no `checkRateLimit` calls; ADR describes controls not enforced. | **Rewrite**: route middleware/enforcement and tests; fail closed for abuse-sensitive endpoints. |
| Metrics exposure | `apps/web/src/app/api/metrics/route.ts:7-15` | Unauthenticated process metrics. | **Rewrite**: internal/authenticated scrape path or ingress isolation; bound labels. |
| Password reset | `apps/web/src/lib/server/password-reset.ts`, `auth.ts` | Token read/verify/update is race-prone; JWT sessions are not revoked after reset. | **Rewrite**: single-use conditional transaction, session-version invalidation, rate limits, notification, redacted logs. |
| PII logs | `apps/web/src/app/api/auth/password-reset/request/route.ts:131-137`, `logger.ts` | Full submitted email can enter logs for nonexistent accounts. | **Rewrite**: hash/redact identifiers and define retention/access. |
| Retention/DSR | `RepositoryConfig.retentionDays`, DSR models, cron route | Retention is data, not an evidenced executor; no object/backup/queue cascade verified. | **Rewrite**: batched observable purge, legal holds, expiry tests, tenant-scoped export/delete. |
| Audit integrity | `schema.prisma:398-399` | Cascading user deletion can erase role audit logs. | **Rewrite**: SET NULL or immutable actor snapshot; protected audit retention. |
| Parser boundary | `apps/web/src/lib/server/test-report-parsers/*` | Good registry and tests, but parser accepts only content and lacks provenance/attempt/evidence envelope. | **Preserve + rewrite boundary**: envelope around existing parsers; secure XML, limits, warnings, raw hash. |
| CI publication | Check/webhook routes; provider integrations | Comments/checks and provider behavior are partial or overclaimed. | **Preserve checks; rewrite** to one idempotent Check Run; delete/disable comments and unsupported provider claims in v1. |

### P2 / medium: operational/documentation debt that causes unsafe assumptions

| Area | Evidence/path | Current truth | Decision |
|---|---|---|---|
| Docs build | `apps/docs/docusaurus.config.ts`, `vercel.json` | Docusaurus build fails on missing `./prism-prisma`. | **Rewrite** config/dependency; make docs build a gate. |
| Local Compose | `infra/docker-compose.yml`, `infra/README.md` | Host ports/dev credentials, floating MinIO `latest`, no healthchecks/limits; Redis port documentation mismatch. | **Preserve for local only; rewrite** with pinned versions/digests, loopback/private binds, generated dev secrets, healthchecks. |
| Environment examples | `env.example` | Two sequential NODE_ENV/DATABASE_URL blocks silently select test settings. | **Rewrite** into explicit local/test/hosted profiles and validation. |
| Stale docs | `services/README.md`, `infra/README.md`, `apps/docs/docs/guides/local-testing.md` | References absent `anchorpipe_guide_docs` and `tempo-local`; describes planned Rust/Go services as if current. | **Delete or rewrite** links; mark plans as planned with owner/exit criteria. |
| Worker scaffold | `services/ingestion/project.json`, README, no `src` | Advertised independently deployable service is absent. | **Delete or rewrite**: remove Nx target until source exists, or complete it. No fictional deploy surface. |
| API errors | `apps/web/src/app/api/ingestion/route.ts:167-174` | Internal exceptions can be returned to clients. | **Rewrite** stable opaque errors and server-side details. |
| Test confidence | CI results: 95 files, 576 tests, 573 pass, 3 skipped | Mostly unit/mocked; no service-backed integration/E2E acceptance. | **Preserve unit suite; add** DB/storage/webhook/replay/retention/container smoke tests. |
| Architecture placeholder | `apps/docs/docs/guides/architecture/overview.md` | Literal “coming soon.” | **Preserve as roadmap only**, remove navigation/README claims of current architecture. |

### P3 / low or explicitly future

- Future ML, Kafka, Iceberg, provider breadth, Kubernetes, and native Mocha are **preserve as roadmap**, not v1 promises.
- `TRADEMARK_POLICY.md` is **preserve separately** from code licensing; it must not become a software-use restriction.
- Future Rust/Go cutover documents are **delete or label planned** until an approved boundary, owner, and benchmark exist.

## 5. Security, privacy, and tenancy baseline

### 5.1 Tenant and authorization invariants

Derive tenant scope from server-verified identity/credential, never from a payload repo ID, header, queue message, or opaque ID. Propagate `tenant_id/repo_id` through every row, event, object key, metric label, cache key, and authorization decision. Use pooled PostgreSQL tables with mandatory tenant predicates and RLS/equivalent; request roles must not bypass RLS. Every async consumer re-checks authorization context and resource ownership.

Add automated cross-tenant denial tests against the deployed request DB role and connection pooling. Maintain an inventory of tenant-owned tables and object prefixes. Apply per-tenant payload, concurrency, storage, event, and worker quotas to prevent noisy neighbors. AWS’s SaaS guidance treats tenant isolation as foundational and context-dependent [17].

### 5.2 Identity, secrets, and CI trust boundaries

Prefer GitHub App minimum permissions and immutable provider numeric IDs. Encrypt provider access/refresh tokens at rest under a KMS/vault design, separate refresh-token access, rotate/revoke, and never log secrets. Current `Account.accessToken`/`refreshToken` string fields require an explicit envelope-encryption treatment; `HmacSecret` is a useful direction but needs custody, rotation, and runtime controls.

Webhook verification must use raw request bytes, exact HMAC format, constant-time comparison, high-entropy secrets, delivery-ID replay cache, size/content-type limits, and event/action allowlists [15]. CI upload credentials must be opaque key ID + secret; require freshness token or nonce and mandatory idempotency. Fail closed if development placeholders such as `CI_HMAC_SECRET=dev-secret-change-me`, `CRON_SECRET=dev-cron-secret`, or MinIO defaults appear outside development.

### 5.3 Data minimization and evidence handling

Treat test names, paths, failure output, commit/branch data, usernames, and artifacts as potentially private. Default to metadata/aggregates; make raw output/source-derived content opt-in. Redact tokens, cookies, authorization headers, emails, and sensitive parameters before indexing or export. Do not ingest source code unless essential. Set size/depth/count/decompression limits and sandbox parsers; never execute report content.

Evidence is private by default, accessed with short-lived signed URLs and role checks. Retention is per data class: short for raw logs/screenshots/traces, longer for compact outcomes/signatures, and only aggregate/anonymized trends beyond business need. GDPR principles include minimization, storage limitation, erasure review, and privacy by design [18]. Define backup expiry and legal holds; a user deletion must not silently erase repo-owned audit history.

### 5.4 Audit, monitoring, and threat model

Audit actor/service, tenant, repository, action, target, outcome, request/delivery ID, correlation ID, timestamp, and reason for login/authorization failures, role changes, secrets, exports/deletions, webhook rejects, replay, and admin actions. Exclude passwords, tokens, keys, source, and unnecessary PII from logs [19]. Protect audit storage from ordinary account deletion.

Threat-model browser/API, GitHub, queue, DB, object storage, and CI boundaries for IDOR, cross-tenant leakage, replay, SSRF, upload/decompression bombs, log injection, DoS, compromised runner/dependency, and insider access. Secure defaults are private-by-default, deny-by-default, encrypted transit/at rest, bounded inputs, short credentials, and fail-closed missing configuration. Do not begin with per-tenant databases, bespoke cryptography, or confidential computing.

## 6. Apache-2.0 and governance cleanup plan

This section is an **approval-gated plan**, not permission to delete or relabel history.

### 6.1 Legal baseline

1. Verify actual copyright owners/years through Git history and employment/contract records.
2. Obtain a complete provenance inventory for original, employee/contractor, generated, copied, vendored, fixture, font, image, documentation, container, and dependency content.
3. Add an unmodified canonical root `LICENSE` with SPDX identifier `Apache-2.0` only after authority is established.
4. Add a truthful root `NOTICE` only for project and required third-party attribution; do not copy ASF-specific project boilerplate or imply ASF affiliation.
5. Add `SPDX-License-Identifier: Apache-2.0` to original source/config/docs where practical; preserve third-party notices unchanged.
6. Add `license: "Apache-2.0"` to publishable workspace packages.
7. Remove AGPL references and restricted-commercial language only after holder/rights review.

Apache-2.0 grants contributors a copyright and limited patent license but does not transfer copyright ownership; Section 5 makes intentionally submitted contributions Apache-2.0 by default unless otherwise stated, and Section 6 grants no trademark rights [20]. It permits commercial use; do not add non-commercial, hosted-service, customer, field-of-use, or proprietary-use restrictions [21]. Historical AGPL material cannot be silently relabeled: obtain consent from relevant holders, rewrite/exclude the material, or preserve it under its existing license with explicit boundaries.

### 6.2 Contribution and governance

- Replace `IP_ASSIGNMENT.md` with a copyright-retention contribution policy, or delete it after approval. State: contributors retain ownership; contributions are licensed under Apache-2.0; no assignment, exclusive license, mandatory CLA, or relicensing right is required.
- Keep DCO as the sole contribution gate; explain that sign-off certifies authority to submit and is not assignment. Keep/update `.github/workflows/dco-check.yml` and PR template.
- Add/update `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `GOVERNANCE.md` with maintainers, CODEOWNERS, release authority, security exception handling, recusal/conflicts, succession/removal, appeals, and response channels.
- Protect `LICENSE`, `NOTICE`, legal policy, release workflows, and dependency inventory with CODEOWNERS and mandatory review.
- Keep trademark policy separate: nominative use is allowed, misleading endorsement/source confusion is not; no code-license restriction is implied.

### 6.3 Dependency and release provenance

Generate a direct/transitive inventory from all manifests and lockfiles with package/version, SPDX expression, source URL, checksum, copyright holder, and notice obligations. Flag GPL/AGPL/LGPL/MPL/SSPL/CC-BY-NC/ND, custom, unknown, or absent licenses for review. Apache guidance is a useful model, not evidence that anchorpipe is an ASF project [22].

Release gate: immutable tag and SHA, source archive, LICENSE/NOTICE/manifests/lockfiles, no credentials or unreviewed binaries, license report, dependency/provenance manifest, detached signatures, checksums, and a build/install test from the source archive. Add signed provenance/SBOM; SLSA L2 is a realistic baseline, while L3 is later.

## 7. Deployment and operations strategy

### 7.1 Supported profiles

1. **Local:** Compose for Postgres plus disposable Redis/MinIO; jobs table can emulate the queue. Bind services to localhost/private network and use generated dev secrets.
2. **Hosted reference:** one stateless web/API container, one worker, managed PostgreSQL, managed S3-compatible object storage, optional managed Redis/Valkey. This is the recommended first deployment.
3. **Self-hosted:** Compose first; Kubernetes/Helm only after demand and a tested backup/upgrade runbook.

PostgreSQL is the source of truth. Managed PostgreSQL reduces failover/backup burden; reliable PITR requires base backup plus continuous WAL archiving [23]. Managed object storage is preferable to operating a MinIO cluster for the first hosted tier. Redis is disposable and non-authoritative because persistence modes can lose recent data [24].

### 7.2 What to retire or demote

- **Retire from hosted default:** RabbitMQ cluster, MinIO cluster, and Kubernetes/Terraform matrix. Keep adapters/self-hosting profiles.
- **Demote Redis:** rate limiting/cache only; define degraded behavior.
- **Retire fictional worker claim:** either implement `services/ingestion` or remove its deploy target and label it planned.
- **Retire synchronous parsing/scoring from request path.**
- **Retire unauthenticated metrics and fail-open security controls.**
- **Retire floating `node:25-alpine`/`minio/minio:latest`; use supported LTS and immutable base/image digests.**
- **Retire automatic destructive migrations on web startup; use controlled expand/contract migration job.**
- **Retire stale docs/paths and unsupported provider/comment promises.**

### 7.3 Reliability contract

Initial proposed targets (not observed performance):

- 99.5% monthly availability for authenticated API/UI requests;
- p95 non-ingestion read latency under 500 ms;
- 99% successful accepted-ingestion responses;
- 99% of accepted jobs started within 5 minutes;
- no unacknowledged backup/restore test older than 90 days.

Define exclusions and measure from edge plus worker outcomes; SRE guidance says 100% is not a useful target and error budgets should drive decisions [25]. Instrument OpenTelemetry request rate/error/latency, DB pools, object-store errors, queue age/retries/DLQ, ingestion freshness, worker saturation, and provider rate limits [26]. Alert on SLO burn rate, queue age, DLQ, DB/WAL/storage, backup freshness, and tenant quota abuse.

Use graceful shutdown, readiness/liveness separation, worker lease renewal, bounded retries with jitter, circuit breakers, resource limits, and correlation IDs. Backups require managed PITR, encrypted copies as needed, object versioning/lifecycle, and quarterly restore drills with RPO/RTO evidence. Self-hosting requires documented WAL archives, off-host immutable storage, key recovery, and restore verification.

## 8. Testing, quality gates, release process, and acceptance criteria

### 8.1 Mandatory quality gates

A release cannot proceed unless a clean checkout passes:

1. dependency install with lockfile enforcement and bounded vulnerability policy;
2. Prisma generation, empty-database migration, and schema checks;
3. typecheck/build for web, libraries, worker, and docs;
4. lint with compatible pinned ESLint/plugin versions;
5. unit tests with no unexplained skips;
6. service-backed integration tests using PostgreSQL and object storage;
7. API/webhook/security negative tests;
8. container build/start/smoke test as non-root;
9. license/provenance/SBOM scan;
10. source-archive build/install test.

### 8.2 Required test suites

- **Ingestion:** duplicate idempotency, conflicting same-key payload, malformed reports, size/decompression bombs, partial parser warnings, missing artifact, expired artifact, provider retry.
- **Durability:** database commit succeeds/broker fails; outbox relay retries; consumer crashes after write; replay/dedup; DLQ and operator replay.
- **Tenant security:** cross-tenant IDOR, object URI, cache, queue, metric, export, and RLS denial.
- **Webhook:** raw HMAC, exact prefix, replayed delivery ID, event allowlist, body limit, fast `2xx`.
- **Password/auth:** concurrent token redemption, reset session invalidation, anti-enumeration, rate limiting, no PII/token logs.
- **Algorithms:** posterior/interval correctness, sequential stopping, comparable-strata rules, order/seed/environment contrasts, confidence/evidence serialization.
- **Retention/DSR:** expiry across DB/object/queue/cache/index, legal hold, signed export TTL, restore/offboarding.
- **Integration:** GitHub artifact ZIP path traversal, digest/expiry, stable Check Run upsert, provider rate-limit/backoff.
- **Operations:** container startup, migration rollback compatibility, readiness, worker lease, backup restore.

### 8.3 Measurable product acceptance criteria

V1 is acceptable only if:

- 100% of accepted ingestions have a durable receipt before `202` and remain queryable after worker restart;
- duplicate request/delivery produces one canonical receipt and no duplicate Check Run;
- 100% of canonical attempts retain source run/attempt, test identity, commit SHA, environment digest, parser/scorer versions, and evidence links where supplied;
- unsupported/malformed reports are explicit `quarantined`/`partial` states, never silent success;
- baseline score returns `n`, `f`, interval/posterior, evidence tier, recency, and reason links;
- persistent controlled failures are not labeled flaky solely because of historical flake evidence;
- cross-tenant access tests have zero unauthorized reads/writes;
- no raw credentials or prohibited PII appear in structured logs in test fixtures;
- retention and deletion integration test proves data-class-specific expiry and audit trail;
- docs/build/lint/dependency gates are green from an empty checkout;
- proposed SLOs are measured for at least one staged soak and all error-budget exceptions are recorded.

## 9. Phased execution plan with stop/go gates

### Phase 0 — Inventory and approvals (1–2 weeks)

**Deliverables:** repository behavior matrix, legal/provenance inventory, threat model, schema/event ADRs, v1 contract, baseline metrics, cleanup diff plan.  
**Dependencies:** owner decision on product scope, tenant model, Apache transition authority.  
**Stop/go:** stop if copyright ownership, historical AGPL boundaries, or tenant authority cannot be established; no destructive cleanup.

### Phase 1 — Release foundation and honest repository (2–3 weeks)

Fix Prisma generation, ESLint compatibility, docs build, dependency policy, error redaction, environment profiles, pinned runtime/images, and CI gates. Label/remove fictional worker/docs claims only after approval.  
**Gate:** clean build/lint/docs/test/container from empty checkout; no critical unreviewed dependency exception.

### Phase 2 — Security/tenancy baseline (3–4 weeks)

Add Organization/Tenant, immutable provider IDs, centralized authorization, RLS/equivalent, opaque CI credentials, webhook delivery dedupe, route rate limits, protected metrics, atomic reset tokens/session invalidation, audit retention, and log redaction.  
**Gate:** cross-tenant denial suite, replay suite, secret/PII log scan, key-rotation drill, documented threat-model signoff.

### Phase 3 — Durable ingestion and canonical facts (4–6 weeks)

Add `IngestionReceipt`, `OutboxEvent`, `ProcessingLedger`, `DeadLetter`, evidence storage, versioned envelope, canonical Run/Attempt/TestExecution model, and worker job loop. Keep RabbitMQ optional behind an adapter; use PostgreSQL-backed jobs initially if simpler.  
**Gate:** receipt durability under broker/object-store failure, idempotent replay, crash recovery, malformed artifact quarantine, freshness metrics.

### Phase 4 — Evidence-first detector and v1 integrations (4–6 weeks)

Implement same-condition sequential retries, Jeffreys/Wilson uncertainty, transparent heuristics, perturbation hooks, JUnit plus existing JSON adapters, GitHub artifact retrieval, and one stable Check Run.  
**Gate:** algorithm benchmark meets agreed precision/false-quarantine budget; parser security tests; GitHub sandbox acceptance; no unsupported path acknowledges success.

### Phase 5 — Production reference deployment (2–4 weeks)

Ship hosted-reference profile, managed Postgres/object storage, optional Redis, OpenTelemetry, SLO dashboards/alerts, PITR/restore drill, expand/contract migrations, release signatures/SBOM, and operator replay/retention runbooks.  
**Gate:** staged soak meets proposed availability/latency/freshness targets; restore and offboarding evidence; rollback rehearsal.

### Phase 6 — Calibration, ML, and selective extraction (ongoing)

Build adjudication workflow and future benchmark; add calibrated model only when label volume/support is adequate. Consider retained Kafka/Iceberg or service extraction only after measured queue/replay/ownership pressure.  
**Gate:** grouped time-forward evaluation, calibration, drift monitoring, abstention, per-repository performance, and explicit owner approval for auto-actions.

## 10. Decisions requiring the owner’s approval before external actions

The following approvals are required **before deleting files, rewriting history, changing public license claims, removing GitHub assets/workflows, or publishing/releasing externally**:

1. Confirm v1 thesis, supported providers/formats, non-goals, and whether automatic reruns are categorically out of scope.
2. Approve the Organization/Tenant model, pooled PostgreSQL + RLS/equivalent, retention classes, and cross-tenant isolation standard.
3. Approve the canonical domain model and compatibility treatment of existing `TestRun`, `TestCase`, and `FlakeScore`.
4. Approve receipt/outbox/at-least-once semantics and whether initial jobs use PostgreSQL, RabbitMQ, or both.
5. Approve the first hosted deployment profile: managed PostgreSQL, managed object storage, optional Redis, one web + one worker; approve demotion of RabbitMQ/MinIO/Kubernetes from default.
6. Approve baseline algorithm thresholds, retry budgets, evidence tiers, and the false-quarantine/CPU-cost budget.
7. Approve what GitHub integration may publish: Checks only, no comments in v1; approve GitHub App permissions and installation model.
8. Approve implementation or removal/disablement of the current fake `check_run` success path and ingestion worker scaffold.
9. Verify all copyright holders and approve Apache-2.0 transition authority; specifically approve adding `LICENSE`/`NOTICE`, removing AGPL/commercial language, and rewriting/deleting `IP_ASSIGNMENT.md`.
10. Approve DCO-only contribution governance, CODEOWNERS protections, maintainer/release/security authority, and trademark separation.
11. Approve the dependency/provenance remediation policy, vulnerability exceptions, SBOM/signing requirements, and release archive process.
12. Approve retention/deletion/legal-hold semantics, backup expiry, DSR scope, and whether audit logs are immutable/WORM-like.
13. Approve destructive repository cleanup list: stale docs, absent-path references, unsupported provider/comment claims, worker project target, and outdated infrastructure files.
14. Approve GitHub actions that change repository state—branch protection, workflow deletion/disablement, release publication, package metadata, tags, and removal of secrets/integrations—only after a dry-run diff and rollback plan.
15. Approve production SLOs, error-budget policy, data residency/subprocessor choices, and the threshold for introducing Kafka, Iceberg, Kubernetes, or extracted services.

## References

1. [Flaky-test detection algorithms and evaluation research supplied for anchorpipe](https://www.sciencedirect.com/science/article/pii/S0164121223002327) (see also [pytest flaky tests](https://docs.pytest.org/en/stable/explanation/flaky.html), [DeFlaker](https://www.cs.cornell.edu/~legunsen/pubs/BellETAL18DeFlaker.pdf)).
2. [GitLab unit test reports and JUnit constraints](https://docs.gitlab.com/ci/testing/unit_test_reports/) and [pytest JUnit output](https://docs.pytest.org/en/stable/how-to/output.html).
3. [iDFlakies: detecting order-dependent flaky tests](https://mir.cs.illinois.edu/marinov/publications/LamETAL19iDFlakies.pdf).
4. [DeFlaker: automatically detecting flaky tests](https://conf.researchr.org/details/icse-2018/icse-2018-Technical-Papers/99/DeFlaker-Automatically-Detecting-Flaky-Tests).
5. [FlakeFlagger preprint](https://www.jonbell.net/preprint/icse21-flakeflagger.pdf).
6. [scikit-learn probability calibration](https://scikit-learn.org/stable/modules/calibration.html) and [model evaluation](https://scikit-learn.org/stable/modules/model_evaluation.html).
7. [Martin Fowler, MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) and [Microservices](https://martinfowler.com/articles/microservices.html).
8. [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html).
9. [Apache Kafka documentation](https://kafka.apache.org/documentation/).
10. [Confluent delivery semantics](https://docs.confluent.io/kafka/design/delivery-semantics.html).
11. [GitHub Actions workflow runs](https://docs.github.com/en/rest/actions/workflow-runs) and [workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs).
12. [Git object model](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects).
13. [Apache Iceberg specification](https://iceberg.apache.org/spec/).
14. [GitHub Checks API](https://docs.github.com/en/rest/checks/runs), [artifacts](https://docs.github.com/en/rest/actions/artifacts), and [workflow reruns](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs).
15. [GitHub webhook signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) and [webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks).
16. [GitHub App permission selection](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app).
17. [AWS SaaS tenant isolation](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html) and [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html).
18. [European Commission GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr_en) and [NIST Privacy Framework](https://www.nist.gov/privacy-framework).
19. [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html), and [REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
20. [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) and [SPDX Apache-2.0](https://spdx.org/licenses/Apache-2.0.html).
21. [Open Source Initiative Apache-2.0](https://opensource.org/license/apache-2-0) and [Open Source Definition](https://opensource.org/osd).
22. [Apache legal/resolved licensing guidance](https://www.apache.org/legal/resolved.html), [source headers](https://www.apache.org/legal/src-headers.html), and [contributor agreements](https://www.apache.org/licenses/contributor-agreements.html).
23. [PostgreSQL continuous archiving and PITR](https://www.postgresql.org/docs/current/continuous-archiving.html).
24. [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
25. [Google SRE workbook: implementing SLOs](https://sre.google/workbook/implementing-slos/).
26. [OpenTelemetry documentation](https://opentelemetry.io/docs/).
