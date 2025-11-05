# anchorpipe Project Governance

**Last Updated**: 11-05-2025

## Overview

anchorpipe follows a **Benevolent Dictator For Life (BDFL)** governance model with community input. The project owner retains final decision-making authority while actively seeking and incorporating community feedback.

## Project Owner

**Current Owner**: RICK / ELSHADAY MENGESHA

The project owner is responsible for:

- Final decisions on project direction and features
- Architectural decisions (documented via ADRs)
- Release planning and gate decisions
- Community standards and conduct enforcement
- Legal and commercial licensing decisions

## Decision-Making Process

### Architecture Decisions (ADRs)

Major technical decisions are documented as Architecture Decision Records (ADRs) in `docs/adr/`:

1. **Proposal**: Any contributor can propose an ADR via GitHub Discussion (RFC category)
2. **Review**: Community feedback gathered via Discussions
3. **Decision**: Project owner makes final decision
4. **Documentation**: ADR created/updated in `docs/adr/`

See existing ADRs: `docs/adr/0001-core-backend-stack.md` through `docs/adr/0012-failure-details-privacy.md`

### Feature Requests

1. **Ideas Discussion**: Propose in GitHub Discussions (Ideas category)
2. **Community Feedback**: Gauge interest via reactions and comments
3. **Issue Creation**: If approved, create GitHub issue
4. **Implementation**: Follow standard PR process

### Code Changes

All code changes follow standard open-source process:

- Create issue (if not existing)
- Fork, branch, implement
- Sign DCO (Developer Certificate of Origin)
- Submit PR with tests
- CODEOWNERS review
- Merge after approval

## CODEOWNERS

The `.github/CODEOWNERS` file defines who reviews code in different areas:

- Required approvals before merging
- Expertise-based routing
- Security-sensitive areas require additional review

## Release Process

Releases follow the gate-based roadmap:

- **G0**: Foundation (internal/alpha)
- **GA**: Security Foundation (private beta)
- **GB**: Core Platform (public beta)
- **GC**: MVP (general availability)
- **GD**: Post-MVP enhancements

See `docs/program/09-release-ops.md` for detailed release process.

## Community Roles

### Contributors

Anyone who contributes code, documentation, or other improvements:

- Recognized in release notes
- Listed in CONTRIBUTORS.md
- Subject to Code of Conduct

### Maintainers (Future)

As the project grows, maintainers may be added to assist with:

- Code review
- Issue triage
- Documentation
- Community support

### Core Team (Future)

Long-term, highly engaged contributors may join the core team with:

- Extended commit access
- Release responsibilities
- Architecture input

## Licensing

### Open Source License

Core anchorpipe software is licensed under **AGPL v3**.

This means:

- ✅ Free to use, modify, and distribute
- ✅ Must share source code if you modify and run as a service
- ✅ Perfect for open-source collaboration

### Commercial Licensing

For enterprises requiring:

- Proprietary licensing
- Trademark usage rights
- Enterprise support
- On-premise deployment without AGPL requirements

Contact: Use GitHub Discussions or create an issue

## Project Transparency

We maintain transparency through:

- **Public Roadmap**: GitHub Projects V2 board
- **ADRs**: All architectural decisions documented
- **Discussions**: Open community discussions
- **Release Notes**: Detailed changelogs

## Conflict Resolution

For governance disputes:

1. **Discussion**: Attempt resolution via GitHub Discussions
2. **Mediation**: Project owner mediates if needed
3. **Decision**: Project owner makes final decision

## Changes to Governance

This governance model may evolve as the project grows. Changes will be:

- Proposed via GitHub Discussion (Community category)
- Discussed with community
- Documented in this file
- Announced in release notes

## Contact

- **General Questions**: GitHub Discussions
- **Governance Issues**: Use GitHub Discussions
- **Commercial Licensing**: Use GitHub Discussions or create an issue
