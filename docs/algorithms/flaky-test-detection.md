# Flaky-test detection

## Core rule

A finite rerun campaign cannot prove that a test is stable. If the true failure probability is `p`, the probability of observing at least one failure in `n` attempts is `1 - (1-p)^n`. Therefore Anchorpipe reports evidence and uncertainty, not a binary verdict.

Every observation is an immutable attempt with test identity, tenant/repository, commit SHA, environment fingerprint, attempt index, order/seed/shard, timing, outcome reason, and failure signature. Retries must not be compressed into a single `rerunCount`.

## Baseline statistics

For a comparable stratum—same tenant, repository, test identity, commit, and environment hash—record failures `f` out of attempts `n`:

- point estimate: `f / n`;
- Jeffreys posterior: `Beta(f + 0.5, n - f + 0.5)`;
- interval: posterior credible interval or Wilson interval;
- recency and age of evidence;
- commit/environment coverage;
- parser, detector, and policy versions;
- evidence source and excluded samples.

Do not use Wald intervals, especially with small samples or estimates near zero/one. With zero observed failures, the approximate 95% upper bound is `3/n`; roughly 300 independent attempts are needed to bound failure probability below 1%, and around 3,000 for 0.1%. Normal CI should stop on decision evidence rather than burn a fixed retry count.

## Sequential retry policy

1. On a first failure, retry 2–3 times under the same condition.
2. If all attempts fail, classify as a **persistent failure candidate**, not flaky.
3. If outcomes mix, collect attempts up to a normal budget of 10 total.
4. Reserve 20–50 targeted attempts for high-impact/high-uncertainty tests, preferably nightly.
5. Stop when the posterior probability that `p` exceeds an operational threshold is sufficiently high or low, or when the budget is exhausted.

Thresholds, budgets, impact weights, and abstention behavior belong to a versioned policy. A historical mixed outcome must never suppress a current persistent regression.

## Controlled perturbation

Use A/B contrasts that change one meaningful variable at a time:

- same order versus randomized order for order dependence;
- same seed versus varied seeds for seed sensitivity;
- stable versus varied worker/CPU/container/browser/network for environment dependence;
- duration, timeout, parallelism, resource pressure, schedule, and queue/shard context for timing and concurrency signals.

Classify order dependence only when failures reproduce under changed order and disappear under a known-good order under comparable conditions. Repeating one failing order is not enough to prove order dependence.

Differential coverage can prioritize a newly failing test that did not execute changed code or passes on a same-code rerun, but coverage is an incomplete signal and must never be the sole detector.

## Transparent ranking

The MVP score is an investigation ranking, not truth. It may combine:

- mixed-outcome strength and posterior bounds;
- recency and failure clustering;
- duration/timeout anomalies;
- environment concentration/diversity;
- order/seed contrasts;
- trustworthy changed-code coverage;
- repository-supplied impact/severity.

Every finding stores a reason list and links to supporting attempts, with `algorithmVersion`, `policyRevision`, excluded samples, and input IDs.

## Later machine learning

Only after adjudicated labels accumulate should Anchorpipe evaluate interpretable models such as class-weighted logistic regression or calibrated tree ensembles. Use project- and time-held-out evaluation, not random row splits. The negative class after finite reruns is not a reliable stable oracle.

Calibrate probabilities on a time-separated set and report reliability diagrams, Brier score, log loss, and calibration error. ML should first rank investigations. Automatic quarantine requires a high precision budget, abstention for sparse support, drift monitoring, operator override, and explicit approval.

## Evaluation protocol

Maintain a replayable benchmark of immutable attempt sequences with labels from repeated execution, maintainer adjudication, and confirmed fixes where available. Keep `unknown`/`insufficient evidence` as a real label and separate natural prevalence from synthetic fault injection.

Report by project, framework, environment, and cause:

- precision at the automatic-action threshold;
- recall and PR-AUC/average precision;
- false-quarantine rate and alerts per 1,000 tests;
- detection latency and rerun CPU cost;
- calibration error, Brier score, and log loss;
- supported-evidence coverage;
- abstention and operator-override rates.

Optimize for precision at any automatic action threshold. Keep a lower-threshold human investigation queue and bootstrap intervals over projects, not only test rows.
