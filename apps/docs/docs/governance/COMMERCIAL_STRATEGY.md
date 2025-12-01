---
sidebar_position: 1
sidebar_label: 'anchorpipe Commercial Strategy'
---

# anchorpipe Commercial Strategy

**Status**: Draft - For Internal Planning  
**Last Updated**: 11-05-2025

> **Note**: This document outlines the planned commercial strategy. Actual implementation will depend on market conditions, community feedback, and project maturity.

## Overview

anchorpipe follows an **open-core model** with dual licensing:

- **Open Source**: Core platform under AGPL v3
- **Commercial**: Enterprise features under proprietary license

## Open Source Foundation

### Core Features (Always Open Source)

- ✅ Universal test ingestion (all CI platforms, all frameworks)
- ✅ Basic flake detection algorithms
- ✅ Open-source dashboard (web UI)
- ✅ CLI tool
- ✅ Desktop application (Tauri)
- ✅ GitHub PR Bot (open-source features)
- ✅ API access
- ✅ Self-hosted deployment
- ✅ Community support via GitHub Discussions

### What Makes It Open Source

- Fully functional for small to medium teams
- No artificial limitations
- Community can extend and improve
- Contributions accepted under DCO

## Commercial Offering (Future)

### Enterprise Features (Commercial License Required)

**Timing**: Post-Gate D (after community launch and validation)

Potential enterprise features (subject to market research):

1. **Advanced Analytics**
   - Custom reporting and dashboards
   - Historical data retention beyond 30 days
   - Advanced trend analysis

2. **Enterprise Integrations**
   - SSO/SAML authentication
   - SCIM user provisioning
   - Enterprise audit logging
   - Compliance reporting (SOC 2, ISO 27001)

3. **Advanced RBAC**
   - Fine-grained permissions
   - Team-based access controls
   - API key management
   - Multi-tenant support

4. **Premium Support**
   - SLA-backed support
   - Priority bug fixes
   - Custom development
   - On-site training

5. **Hosted Service (Future)**
   - Managed cloud deployment
   - Automatic updates
   - High availability
   - Managed backups

6. **Advanced ML Features**
   - Predictive flakiness models
   - Custom ML training
   - Advanced root cause analysis
   - AI-powered remediation suggestions

### Commercial Licensing Model

**Options** (to be determined based on market research):

1. **Per-Seat Licensing**: Monthly/annual per developer
2. **Per-Repository Licensing**: Based on number of repositories
3. **Usage-Based**: Based on test run volume
4. **Enterprise Agreement**: Custom pricing for large organizations

**Contact**: Use GitHub Discussions or create an issue (commercial licensing will be available post-launch)

## Legal Protection

### License Structure

- **AGPL v3**: Open-source core
  - Prevents SaaS providers from using without contributing back
  - Allows commercial dual licensing
  - Enables future proprietary features

- **Commercial License**: Enterprise features
  - Proprietary codebase for enterprise features
  - Separate repository or clearly marked modules
  - Requires commercial license agreement

### Intellectual Property Protection

#### Contributor IP Assignment

- **DCO (Developer Certificate of Origin)**: Contributors certify their code
- **IP Assignment Policy**: Clear commercial use rights (see [IP_ASSIGNMENT.md](https://github.com/anchorpipe/anchorpipe/blob/main/IP_ASSIGNMENT.md))
- **Explicit Commercial Rights**: Contributors grant commercial use rights upfront
- **Optional CLA**: Significant contributors receiving equity may sign additional CLA

#### IP Ownership Structure

**Current (Phase 1)**:

- Project owner holds IP
- Contributors grant commercial use rights via IP assignment policy
- Clear documentation of rights and ownership

**Future (Phase 2 - Foundation)**:

- Foundation holds open-source IP
- Commercial entity licenses from foundation
- Clear separation of open-source and commercial IP
- Community governance through foundation

See [FOUNDATION_PLAN.md](FOUNDATION_PLAN.md) for detailed foundation structure.

#### Legal Entity Structure

**Current**:

- Single entity structure
- Project owner retains all IP rights

**Future**:

- Foundation (non-profit) holds open-source IP
- Commercial entity (corporation) holds enterprise IP
- Clear licensing between entities
- Investor-ready structure

### Investor Readiness

#### IP Clarity

- ✅ All contributions documented with IP assignment
- ✅ Clear commercial use rights from contributors
- ✅ No contributor IP claims
- ✅ Clean chain of title for all code

#### Community as Asset

- ✅ Quantified community metrics
- ✅ Clear contributor recognition and rewards framework
- ✅ Demonstrated community-driven innovation
- ✅ Conversion pathways documented

See [CONTRIBUTOR_REWARDS.md](CONTRIBUTOR_REWARDS.md) for contributor recognition and future rewards.

### Trademark Protection

- "anchorpipe" trademark registered (planned)
- Usage policy clearly defined (see TRADEMARK_POLICY.md)
- Prevents brand confusion
- Enables commercial brand licensing

## Community Considerations

### Maintaining Open Source Goodwill

1. **Transparency**: This document is public
2. **No Bait-and-Switch**: Core features remain open
3. **Community Input**: Gather feedback on commercial features
4. **Fair Pricing**: Competitive with market alternatives
5. **Value Add**: Enterprise features provide real value, not artificial limits

### Avoiding Common Pitfalls

- ❌ Don't restrict core features after launch
- ❌ Don't create artificial limitations
- ❌ Don't surprise community with licensing changes
- ✅ Add value with enterprise features
- ✅ Maintain strong open-source core
- ✅ Support community generously

## Timeline (Tentative)

### Phase 1: Open Source Launch (Current - Gate D)

- Build strong open-source foundation
- Grow community
- Validate product-market fit
- Establish project reputation

### Phase 2: Enterprise Validation (Post-Gate D)

- Market research on enterprise needs
- Design enterprise feature set
- Beta test with select organizations
- Refine pricing model

### Phase 3: Commercial Launch (12-18 months post-launch)

- Launch commercial offering
- Hire enterprise support team
- Expand enterprise features
- Maintain open-source commitment

## Success Metrics

### Open Source Health

- 500+ GitHub stars
- 50+ active contributors
- 1000+ repositories integrated
- Strong community engagement

### Commercial Validation

- Enterprise feature requests from community
- Pilot customers expressing interest
- Clear demand signal
- Sustainable business model

## FAQ

**Q: Will you close-source the project later?**  
A: No. Core features will always remain open source under AGPL v3.

**Q: Will you add artificial limitations to open-source version?**  
A: No. The open-source version will remain fully functional.

**Q: How will you decide what's enterprise vs. open source?**  
A: Based on community feedback, market research, and clear value differentiation. Enterprise features will be true value-adds, not artificial restrictions.

**Q: Can I use anchorpipe commercially without a license?**  
A: Yes, if you comply with AGPL v3. If you need to avoid AGPL requirements (e.g., proprietary SaaS), you'll need a commercial license.

**Q: When will commercial features be available?**  
A: Not before community launch and validation (post-Gate D). Timeline depends on project maturity.

## Contact

- **Commercial Inquiries**: Use GitHub Discussions or create an issue
- **General Questions**: GitHub Discussions
- **Enterprise Early Access**: Use GitHub Discussions (available post-launch)

---

**Note**: This strategy is subject to change based on:

- Community feedback
- Market conditions
- Project maturity
- Legal considerations

All significant changes will be announced transparently.
