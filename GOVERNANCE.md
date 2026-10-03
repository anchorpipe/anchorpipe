# Anchorpipe governance

**Status:** clean-slate redesign baseline.

Anchorpipe is an independent open-source project. It is not an Apache Software Foundation project and does not imply ASF affiliation.

## License and contributions

The project is intended to use the Apache License 2.0. Contributors retain ownership of their work and contribute under the project license through the Developer Certificate of Origin (DCO). Anchorpipe does not require a copyright assignment, exclusive license, mandatory CLA, commercial-relicensing agreement, or field-of-use restriction.

The license transition is subject to copyright-authority and provenance review. Historical code, generated assets, vendored material, fonts, fixtures, and dependencies must not be relabeled without confirming their applicable terms. Third-party components retain their upstream notices and license terms.

## Decision making

- Design decisions should be recorded in repository documentation or pull requests.
- Pull requests must include tests and explain migration, rollback, security, privacy, tenancy, and operational impact where relevant.
- Maintainers may reject changes that overclaim behavior, weaken isolation, hide uncertainty, or introduce an unbounded operational dependency.
- Material security and licensing decisions require review by the project owner and designated code owners.

## Maintainers

Maintainers are responsible for technical direction, release readiness, security response, and review of changes affecting legal files, authentication, authorization, data retention, deployment, or external integrations. Additions, removals, and succession decisions should be documented in public repository history.

## Release policy

There will be no release until the clean-checkout quality gates pass: dependency and license review, build/lint, database migration, service-backed integration tests, security negative tests, container smoke tests, retention/deletion tests, and source-archive reproducibility.

A release must identify an immutable commit, dependency/provenance inventory, checksums, and build evidence. Hosted deployment is not part of the project contract until a supported deployment profile has an owner, rollback procedure, backup/restore evidence, and measured SLOs.

## Security and conduct

Report vulnerabilities privately using [`SECURITY.md`](SECURITY.md). Contributions must follow [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Do not include secrets, private customer data, or unreviewed third-party material in issues or pull requests.
