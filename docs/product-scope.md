# Product scope

## Thesis

Anchorpipe turns noisy CI test observations into **explainable, tenant-isolated evidence about nondeterminism and regression risk**. It does not claim to prove that a test is flaky. It reports what was observed, under which comparable conditions, with calibrated uncertainty and a reasoned investigation queue.

The product should answer:

1. Did the failure reproduce under controlled same-condition attempts?
2. Is the mixed outcome plausibly nondeterministic, or is it a persistent product/infrastructure failure?
3. What should an engineer investigate next, and what evidence supports that recommendation?

A passing rerun is mitigation, not proof of flakiness. Every conclusion must expose its denominator, evidence window, recency, comparable-condition coverage, and detector version.

## v1 workflow

1. A repository owner uploads a local/JUnit report or resolves a GitHub Actions artifact.
2. Anchorpipe validates the envelope, authenticates the source, claims idempotency, stores private raw evidence, and commits a durable receipt/outbox record.
3. The API returns `202 Accepted` with an ingestion ID; parsing and scoring happen asynchronously.
4. Workers normalize test executions, preserve attempts and provenance, derive failure signatures, and calculate evidence-aware findings.
5. The UI/API exposes attempts, evidence links, warnings, uncertainty, and processing freshness.
6. An explicitly configured GitHub integration publishes one idempotent Check Run per logical suite.

## Supported first adapters

- JUnit XML as the universal first format, parsed tolerantly and securely.
- Existing Jest, Pytest, and Playwright JSON adapters behind the same registry.
- GitHub Actions artifact retrieval as the first provider integration.
- Local file, directory, STDIN, and CLI ingestion independent of a provider.

JUnit is pragmatic, not perfectly standardized. Preserve parser warnings, raw hashes, source schema, and unsupported fields instead of pretending all producers have identical semantics.

## Evidence vocabulary

| Tier | Meaning |
|---|---|
| **Observed flaky** | Comparable conditions contain mixed outcomes with sufficient provenance. |
| **Probable** | Supporting evidence exists, but the comparison or sample is incomplete. |
| **Environment-sensitive candidate** | Outcome changes with an environment, seed, order, resource, or timing contrast. |
| **Persistent failure candidate** | Controlled same-condition attempts consistently fail. |
| **Insufficient evidence** | The system cannot make a responsible classification. |

“Stable”, “flaky”, and “highly flaky” may be presentation classes derived from uncertainty-aware policy. They are not primitive truths or fixed score cutoffs.

## Explicit non-goals for v1

- Automatically rerunning arbitrary customer workflows.
- Synchronous webhook processing or making webhooks the only ingestion path.
- Native GitLab/Jenkins/Azure integrations beyond compatible report files.
- PR comments or line annotations as a source of truth.
- Binary auto-quarantine based only on a score.
- Supervised ML as the primary decision rule.
- Source-code indexing or execution of uploaded artifacts.
- Per-tenant databases, confidential computing, mTLS everywhere, or SLSA L3.
- A Kubernetes/Terraform deployment matrix before one path is operable.

## Product acceptance

The first credible release must demonstrate:

- Accepted ingestions have a durable receipt before `202` and survive worker restart.
- Duplicate requests and deliveries produce one canonical receipt and no duplicate Check Run.
- Every canonical attempt retains source run/attempt, test identity, commit SHA, environment digest, parser/scorer versions, and available evidence links.
- Malformed or unsupported reports become explicit `quarantined`/`partial` states, never silent success.
- Findings return `n`, `f`, interval/posterior, evidence tier, recency, and reason links.
- Persistent controlled failures are not mislabeled flaky because historical data was mixed.
- Cross-tenant security tests produce zero unauthorized reads or writes.
- No raw credentials or prohibited PII appear in structured logs or fixtures.
- Retention and deletion tests cover database, object storage, queues, caches, indexes, backups, and legal holds.
