# anchorpipe Project Governance

**Last Updated**: 2025-11-09

## Overview

anchorpipe follows a **Benevolent Dictator For Life (BDFL)** governance model with community input. The project owner retains final decision-making authority while actively seeking and incorporating community feedback.

## Governance Principles

anchorpipe's governance is built on these core principles:

### 🎯 Our Governance Values

1. **Transparency First** 🔍
   - All significant decisions are public and documented
   - Rationale is explained, not just outcomes
   - Community can see and understand decision-making processes

2. **Community Voice Matters** 💬
   - Everyone can propose ideas and provide feedback
   - Final authority is clear, but community input shapes direction
   - We actively seek diverse perspectives

3. **Meritocracy** 🌟
   - Contribution quality and consistency earn trust and influence
   - Recognition is based on impact, not tenure

4. **Stability with Evolution** 🔄
   - Clear ownership enables fast, decisive action
   - Governance evolves as the project matures
   - We commit to planned transition milestones

5. **Open by Default** 🌐
   - Discussions happen in public unless there's a specific reason for privacy
   - Code, decisions, and roadmap are accessible to all
   - Proprietary interests don't override community benefit

### Why BDFL?

We've chosen a **Benevolent Dictator For Life (BDFL)** model because:

✅ **Speed** - Enables rapid decision-making in early stages  
✅ **Clarity** - No ambiguity about final authority  
✅ **Vision Coherence** - Maintains architectural and product coherence  
✅ **Accountability** - Clear responsibility for outcomes

**However**, this model is not permanent:

- 📅 We will transition to a **Technical Steering Committee (TSC)** model when the project reaches sufficient maturity
- 🗳️ Community will have input on the transition process
- 📊 Success metrics for governance health will be defined

See [Governance Evolution Roadmap](#governance-evolution-roadmap) below.

## Project Owner (BDFL)

### Current Owner

**Name:** Rick / Elshaday Mengesha  
**Contact:** governance@anchorpipe.dev  
**Term:** Indefinite (with succession plan below)

### Responsibilities

The project owner is the final decision-maker on:

**Strategic Direction**

- ✅ Project vision and long-term roadmap
- ✅ Commercial licensing and business strategy
- ✅ Foundation structure and governance evolution

**Technical Architecture**

- ✅ Major architectural decisions (via ADRs)
- ✅ Technology stack choices
- ✅ Security and privacy architecture

**Community & Operations**

- ✅ Release gates and version planning
- ✅ Code of Conduct enforcement (severe cases)
- ✅ Maintainer appointments and removals
- ✅ Trademark and legal matters

**What the BDFL Does NOT Decide Alone:**

- ❌ Day-to-day code reviews (delegated to maintainers when they exist)
- ❌ Individual contributor recognition (community-driven)
- ❌ Minor documentation changes (contributor autonomy)

### Decision-Making Commitments

The project owner commits to:

1. **Seek Community Input** 📢
   - Major decisions posted to Discussions for ≥7 days before finalizing
   - ADR proposals open for community feedback
   - Annual "State of the Project" with Q&A

2. **Explain Decisions** 📝
   - Rationale documented in ADRs or GitHub Discussions
   - Community concerns addressed in writing
   - Transparency reports for controversial decisions

3. **Delegate Appropriately** 🤝
   - Empower maintainers for their areas of expertise (when they exist)
   - Respect community consensus on non-critical matters
   - Build leadership capacity in the community

4. **Avoid Conflicts of Interest** ⚖️
   - Recuse from decisions with personal financial stakes (when community members raise concerns)
   - Disclose relevant affiliations
   - Seek external mediation if needed

### Succession Planning

**Temporary Absence (< 30 days):**

- Designated Acting BDFL: TBD
- Powers: Emergency decisions only
- Contact: governance@anchorpipe.dev

**Extended Absence (> 30 days):**

- Emergency TSC formed from top contributors
- Powers: All BDFL responsibilities except governance changes
- Process: Majority vote required for decisions

**Permanent Succession:**

In the event of permanent unavailability:

1. **Designated Successor**: TBD (if willing)
2. **If Declined**: Emergency TSC appoints new BDFL via 2/3 vote
3. **Fallback**: Project transitioned to Technical Steering Committee model immediately

**Succession Review:** This plan is reviewed and updated **annually** (next: Q1 2026)

### Accountability

The community can provide feedback on governance through:

- 💬 **GitHub Discussions** - [Governance category](https://github.com/anchorpipe/anchorpipe/discussions/categories/governance)
- 📧 **Direct Contact** - governance@anchorpipe.dev
- 📊 **Annual Governance Survey** - (to be established)

## Governance Evolution Roadmap

Our governance model will mature as the project grows:

### Phase 1: BDFL Foundation (Current)

**Status:** ✅ Active  
**Model:** Single project owner with community input  
**Characteristics:**

- Fast decision-making for foundational architecture
- Community feedback via Discussions and ADRs
- CODEOWNERS for code review distribution

---

### Phase 2: BDFL + Maintainers (Future)

**Status:** 📅 Planned  
**Trigger:** 10+ regular contributors over 3 months  
**Changes:**

**Add Role: Module Maintainers**

- Own specific subsystems (e.g., ML engine, ingestion pipeline)
- Final say on code in their modules (subject to BDFL veto)
- Appointed by BDFL based on contribution history

**Add Structure: Maintainer Meetings**

- Bi-weekly sync on technical coordination
- Public notes published to Discussions
- Open attendance for all contributors

**Governance Changes:**

- Maintainers can approve/merge PRs in their areas
- BDFL focuses on cross-cutting decisions
- Community can nominate new maintainers

---

### Phase 3: Technical Steering Committee (Future)

**Status:** 📅 Planned  
**Trigger:** One of:

- 50+ active contributors
- 1000+ GitHub stars
- 5+ organizations using in production
- BDFL initiates transition

**Transition Process:**

**Step 1: TSC Formation**

1. Community nominates TSC members (2-week period)
2. Candidates must have:
   - 20+ merged PRs OR significant architectural contributions
   - Active for 6+ months
   - Code of Conduct good standing
3. Community votes (1 vote per qualifying contributor)
4. Top 5-7 vote recipients join initial TSC
5. BDFL becomes TSC Chair (non-voting except to break ties)

**Step 2: Charter Development**

- TSC drafts governance charter
- Community review period (30 days)
- Ratification by 2/3 TSC vote + BDFL approval

**Step 3: Transition**

- TSC assumes decision-making authority
- BDFL retains veto power for 12 months
- New contribution ladders defined

---

### Phase 4: Foundation Model (Future)

**Status:** 🔮 Future  
**Trigger:** One of:

- Significant commercial revenue
- 10+ corporate sponsors
- Legal/IP complexity requires formal entity

**Options Being Considered:**

- Join existing foundation (Apache, Linux Foundation, CNCF)
- Form independent 501(c)(3) foundation
- Fiscal sponsorship model

See [Foundation Plan](docs/governance/FOUNDATION_PLAN.md) for details.

---

## Decision-Making Process

Different types of decisions follow different processes:

### Decision Types & Authority

| Decision Type        | Authority                 | Process                                                      | Transparency                    |
| -------------------- | ------------------------- | ------------------------------------------------------------ | ------------------------------- |
| **Day-to-day code**  | Maintainer/Reviewer       | Standard PR review                                           | Public PR                       |
| **Minor features**   | Maintainer (module owner) | Issue → PR → Review → Merge                                  | Public issue/PR                 |
| **Major features**   | BDFL (with input)         | Discussion → ADR → Implementation                            | Public Discussion + ADR         |
| **Architecture**     | BDFL (via ADR)            | RFC → Feedback → ADR → Announcement                          | Public ADR                      |
| **Breaking changes** | BDFL (with warning)       | RFC → Extended feedback → ADR → Deprecation → Implementation | Public + Migration guide        |
| **Governance**       | BDFL (community input)    | Discussion → Proposal → Feedback (30d) → Decision            | Public + Rationale doc          |
| **Commercial/Legal** | BDFL                      | Internal → Announcement                                      | Public announcement             |
| **CoC Enforcement**  | BDFL + Moderators         | [Per CoC process](CODE_OF_CONDUCT.md#enforcement-guidelines) | Anonymized transparency reports |

---

### Process Details

#### 🏗️ Architecture Decisions (ADRs)

**For:** Major technical decisions with long-term impact

**Process:**

1. **Proposal** (Week 1)
   - Anyone creates GitHub Discussion in [RFC category](https://github.com/anchorpipe/anchorpipe/discussions/categories/rfcs)
   - Include: Problem, proposed solution, alternatives considered, impact

2. **Community Feedback** (Week 2-3)
   - Discussion open for minimum 14 days
   - BDFL/Maintainers provide initial feedback within 7 days
   - Questions and alternatives discussed
   - Proposal refined based on feedback

3. **Decision** (Week 4)
   - BDFL makes final decision
   - Rationale posted to Discussion
   - If rejected: explanation of why + alternative paths

4. **Documentation** (Week 5)
   - ADR document created in `docs/adr/`
   - Linked from proposal Discussion
   - Announced in next release notes

**Example ADRs:** [View all →](docs/adr/)

**SLA:** Initial feedback within 7 days, final decision within 30 days

---

#### 💡 Feature Requests

**For:** New functionality or significant enhancements

**Process:**

**Small/Medium Features** (< 1 week implementation):

1. Create [Feature Request issue](https://github.com/anchorpipe/anchorpipe/issues/new?template=feature_request.md)
2. Maintainer/BDFL reviews within 7 days
3. If approved: Label "approved", assign to milestone
4. Implement via standard PR process

**Large Features** (> 1 week implementation):

1. Create GitHub Discussion in [Ideas category](https://github.com/anchorpipe/anchorpipe/discussions/categories/ideas)
2. Community reacts and comments (minimum 7 days)
3. If popular (20+ 👍 or strong rationale), BDFL reviews
4. If approved: Create issue, potentially ADR if architecturally significant
5. Implementation planned in roadmap

**SLA:**

- Small features: 7-day review
- Large features: 14-day community feedback, 30-day final decision

---

#### 🐛 Bug Fixes

**Process:**

- Create issue with reproduction steps
- Maintainer/BDFL confirms/triages within 3 business days
- Fix via standard PR process
- No ADR required unless architectural changes needed

**Critical Security Bugs:**

- Follow [Security Policy](SECURITY.md)
- Private disclosure → Fix → Coordinated disclosure

---

#### 📝 Documentation Changes

**Minor (typos, clarifications):**

- PR directly, no issue needed
- Any maintainer can merge

**Major (new guides, restructuring):**

- Discussion in [Documentation category](https://github.com/anchorpipe/anchorpipe/discussions/categories/documentation)
- Standard PR process

---

#### 🏛️ Governance Changes

**For:** Changes to this GOVERNANCE.md or community structure

**Process:**

1. **Proposal** in [Governance Discussion](https://github.com/anchorpipe/anchorpipe/discussions/categories/governance)
2. **Community Input** for minimum 30 days
3. **Community Survey** (if significant change)
4. **BDFL Decision** with written rationale
5. **Update Documentation** and announce
6. **Review Period** - 90 days to assess impact

---

### Challenging Decisions

**What if I disagree with a decision?**

1. **Comment on the Discussion** - Explain your concerns with technical/community rationale
2. **Propose Alternatives** - Offer a better solution
3. **Request Reconsideration** - If new information emerges, ask BDFL to revisit
4. **Escalate** - For governance disputes: governance@anchorpipe.dev
5. **Accept or Exit** - BDFL decisions are final; if you can't accept them, forking is a valid option

**We commit to:**

- ✅ Responding to all substantive objections in writing
- ✅ Explaining why alternatives weren't chosen
- ✅ Reconsidering if new information emerges
- ❌ We cannot promise every voice will change the outcome

---

## CODEOWNERS

The `.github/CODEOWNERS` file defines who reviews code in different areas:

- Required approvals before merging
- Expertise-based routing
- Security-sensitive areas require additional review

## Release Process

Releases follow the gate-based roadmap:

- **G0**: Foundation (internal/alpha) - ✅ Complete
- **GA**: Security Foundation (private beta) - ✅ Complete
- **GB**: Core Platform (public beta) - 📅 In Progress
- **GC**: MVP (general availability) - 📅 Planned
- **GD**: Post-MVP enhancements - 📅 Planned

See `docs/program/09-release-ops.md` for detailed release process.

## Community Roles & Contribution Ladder

anchorpipe uses a contribution ladder to recognize and empower community members.

### Contributor

**Who:** Anyone who contributes to the project  
**How to Become One:** Submit a merged PR, issue, or documentation improvement  
**Responsibilities:**

- Follow Code of Conduct
- Sign Developer Certificate of Origin (DCO)

**Rights & Recognition:**

- ✅ Listed in CONTRIBUTORS.md
- ✅ Mentioned in release notes
- ✅ Eligible for swag/rewards (see [Contributor Rewards](docs/governance/CONTRIBUTOR_REWARDS.md))

**Current Contributors:** [View list →](CONTRIBUTORS.md)

---

### Regular Contributor

**Who:** Consistent contributors over time  
**Criteria:**

- 5+ merged PRs OR
- 10+ reviewed/triaged issues OR
- Significant documentation contributions

**Additional Rights:**

- ✅ "Regular Contributor" badge on GitHub
- ✅ Priority issue assignment
- ✅ Can nominate for community awards

**Recognition:** Highlighted in quarterly community updates

---

### Reviewer

**Who:** Trusted community members who review PRs  
**Criteria:**

- 10+ merged PRs AND
- 6+ months active AND
- Nominated by existing Reviewer/Maintainer AND
- Approved by BDFL

**Responsibilities:**

- Review PRs in assigned areas
- Provide constructive feedback
- Uphold code quality standards

**Rights:**

- ✅ "Reviewer" GitHub org membership
- ✅ Request changes on PRs (not merge)
- ✅ Participate in design discussions

**Current Reviewers:** [View team →](https://github.com/orgs/anchorpipe/teams/reviewers) (when established)

---

### Maintainer

**Who:** Long-term contributors responsible for specific areas  
**Status:** 📅 Role defined, not yet active (see [Phase 2](#phase-2-bdfl--maintainers-future))  
**Criteria:**

- 20+ merged PRs AND
- 12+ months active AND
- Domain expertise in a specific area AND
- Nominated by existing Maintainer AND
- Approved by BDFL

**Responsibilities:**

- Own a module/subsystem (e.g., "ML Engine Maintainer")
- Review and merge PRs in their area
- Participate in maintainer meetings
- Mentor contributors
- Maintain documentation for their area

**Rights:**

- ✅ Write access to repository (scoped by CODEOWNERS)
- ✅ Merge authority in owned modules
- ✅ Vote on technical decisions in their domain
- ✅ Can block PRs that impact their area
- ✅ Participate in release planning

**Current Maintainers:** [View team →](https://github.com/orgs/anchorpipe/teams/maintainers) (when established)

---

### Technical Steering Committee (TSC) Member

**Who:** Senior technical leaders guiding project direction  
**Status:** 📅 Role defined, not yet active (see [Phase 3](#phase-3-technical-steering-committee-future))  
**Criteria:** (To be defined during TSC formation)

**Expected Responsibilities:**

- Set technical vision and strategy
- Approve ADRs
- Resolve architectural disputes
- Manage maintainer appointments
- Represent project externally

---

### How to Advance

**Want to move up the ladder?**

1. **Start Contributing** - Find [good first issues](https://github.com/anchorpipe/anchorpipe/labels/good%20first%20issue)
2. **Build Consistency** - Regular contributions over time matter more than big one-offs
3. **Expand Impact** - Review others' PRs, help in Discussions, improve docs
4. **Express Interest** - Comment in [Role Advancement Discussions](https://github.com/anchorpipe/anchorpipe/discussions/categories/role-advancement) (when established)
5. **Get Nominated** - Existing Reviewers/Maintainers can nominate you

**Evaluation Criteria:**

- ✅ Technical quality of contributions
- ✅ Collaboration and communication skills
- ✅ Alignment with project values
- ✅ Community engagement and mentorship
- ✅ Code of Conduct adherence

**Self-nominations are welcome!** We know self-advocacy can be hard, so we actively encourage it.

## Communication Channels

### Where Decisions Happen

All major decisions occur in **public, archived channels**:

| Channel                | Purpose                       | Archive   | Participation             |
| ---------------------- | ----------------------------- | --------- | ------------------------- |
| **GitHub Discussions** | RFCs, ideas, governance, Q&A  | Permanent | Anyone can post           |
| **GitHub Issues**      | Bug reports, feature requests | Permanent | Anyone can create         |
| **GitHub PRs**         | Code review, implementation   | Permanent | Contributors              |
| **Email**              | Private/sensitive matters     | Private   | governance@anchorpipe.dev |

### Community Meetings

**Monthly Contributor Call** (to be established)

- **When:** First Wednesday of each month, 3pm UTC
- **Where:** TBD
- **Who:** Open to all contributors
- **Agenda:** Posted 3 days prior
- **Notes:** Published within 48 hours

**BDFL Office Hours** (to be established)

- **When:** First Friday of each month, 2pm UTC
- **Where:** TBD
- **Format:** Open Q&A, come with questions
- **Notes:** Summarized in monthly update

**Important:** Decisions made in real-time chat must be documented in GitHub Discussions/Issues to be official.

## Licensing & Intellectual Property

### Open Source License

**Primary License:** [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE)

**What this means for you:**

**✅ You CAN:**

- Use anchorpipe for free (commercially or personally)
- Modify the source code
- Distribute modified versions
- Run anchorpipe as a service (SaaS)

**⚠️ You MUST:**

- Share your source code if you modify and distribute/host anchorpipe
- License your modifications under AGPL-3.0
- Provide source code to users of your hosted service
- Include original copyright and license notices

**❌ You CANNOT:**

- Create proprietary forks without commercial license
- Use anchorpipe trademarks without permission (see [Trademark Policy](TRADEMARK_POLICY.md))

**Why AGPL?** We chose AGPL to ensure that improvements benefit the entire community, even when anchorpipe is used as a SaaS.

**[Read the full license →](LICENSE)**

---

### Commercial Licensing

**For enterprises who need:**

- ✅ Proprietary licensing (no source code sharing requirement)
- ✅ Trademark usage rights
- ✅ Enterprise support and SLAs
- ✅ Custom feature development
- ✅ Legal indemnification

**Contact:** commercial@anchorpipe.dev  
**Details:** [Commercial Strategy](docs/governance/COMMERCIAL_STRATEGY.md)

---

### Contributor Intellectual Property

**Contributions are licensed under AGPL-3.0:**

By contributing, you agree:

1. You own the rights to your contribution OR have permission to contribute
2. Your contribution is licensed under AGPL-3.0
3. You grant anchorpipe project rights to relicense (for commercial licensing purposes)

**We use DCO (Developer Certificate of Origin), not CLAs:**

- Sign commits with `-s` flag: `git commit -s -m "Your message"`
- This certifies you have the right to contribute
- No complicated CLA forms

**Read:** [Developer Certificate of Origin](https://developercertificate.org/)

**Optional:** [Intellectual Property Assignment](IP_ASSIGNMENT.md) for contributors who want to explicitly assign IP to the project

---

### Trademark & Brand

**"anchorpipe" name and logo are trademarks.**

**Permitted use:**

- Referring to the software accurately
- Linking to the project
- Stating you use anchorpipe

**Requires permission:**

- Using "anchorpipe" in product names
- Using the logo in commercial contexts
- Implying official endorsement

**[Full Trademark Policy →](TRADEMARK_POLICY.md)**

---

## Conflict Resolution

We aim to resolve conflicts at the lowest possible level.

### Types of Conflicts

#### Technical Disagreements

**Examples:** Code review disputes, architectural preferences, implementation approaches

**Resolution Path:**

1. **Discussion** - Discuss in PR/issue comments
2. **Maintainer Input** - Tag relevant maintainer for perspective (when they exist)
3. **BDFL Decision** - If no consensus after 7 days, BDFL makes final call
4. **Document** - Rationale recorded in ADR or issue

**Timeline:** Resolved within 14 days maximum

---

#### Interpersonal Conflicts

**Examples:** Communication style clashes, misunderstandings, perceived rudeness

**Resolution Path:**

1. **Direct Communication** - Parties attempt private resolution
2. **Mediation** - Request community moderator mediation (mediation@anchorpipe.dev)
3. **CoC Process** - If behavior violates [Code of Conduct](CODE_OF_CONDUCT.md)

**Timeline:** Acknowledged within 48 hours, resolution varies

---

#### Governance Disputes

**Examples:** Disagreement with BDFL decision, governance process concerns, power structure issues

**Resolution Path:**

1. **Governance Discussion** - Post in [Governance category](https://github.com/anchorpipe/anchorpipe/discussions/categories/governance)
2. **BDFL Response** - BDFL responds with rationale within 7 days
3. **Community Input** - Community feedback period (14 days)
4. **Reconsideration** - BDFL reconsiders with new input
5. **Final Decision** - BDFL makes final decision with documented rationale
6. **Escalation** - Email governance@anchorpipe.dev if process not followed

**Timeline:** Initial response within 7 days, full resolution within 30 days

**If Still Unresolved:**

- Wait for governance evolution to TSC model (see [roadmap](#governance-evolution-roadmap))
- Fork the project (you have this right under AGPL license)
- Participate in annual governance survey (when established)

---

#### Code of Conduct Violations

**Process:** Follow [Code of Conduct Enforcement Guidelines](CODE_OF_CONDUCT.md#enforcement-guidelines)

---

### Conflict of Interest

**What is a conflict of interest?**

- Financial interest in a competing product
- Employment by company that could benefit from decision
- Personal relationships affecting objectivity

**How we handle it:**

1. **Disclose** - Community member raises concern via governance@anchorpipe.dev
2. **Evaluate** - BDFL assesses whether conflict is material
3. **Recusal** - If material, BDFL recuses from decision OR seeks external mediation
4. **Document** - Decision process and recusal documented publicly

**Current Known Interests:** TBD (to be updated when applicable)

**Updated:** Quarterly or when changes occur

## Project Transparency & Accountability

We commit to transparency in project operations:

### What's Public

**Technical:**

- ✅ All code (GitHub repository)
- ✅ All issues and PRs
- ✅ Architecture decisions (ADRs)
- ✅ Roadmap and milestones
- ✅ CI/CD pipeline results

**Governance:**

- ✅ Decision-making processes
- ✅ Maintainer appointments/removals (when they exist)
- ✅ Governance changes
- ✅ Community survey results (when established)

**Financial (when applicable):**

- ✅ Sponsorship income
- ✅ Commercial revenue (aggregated)
- ✅ Expense allocation

### What's Private

**Only when necessary:**

- ❌ Security vulnerabilities (until patched)
- ❌ Code of Conduct reports (anonymized summaries published)
- ❌ Personal information
- ❌ Commercial negotiations (announced after completion)
- ❌ Legal matters under attorney advice

**Private matters are disclosed when:**

- Security patch is released
- CoC case is resolved
- Commercial deal is finalized
- Legal matter is settled

### Transparency Commitments

**We publish:**

| Report                      | Frequency | Next Due       | Archive                                                                  |
| --------------------------- | --------- | -------------- | ------------------------------------------------------------------------ |
| **Roadmap Updates**         | Monthly   | 1st of month   | [GitHub Projects](https://github.com/orgs/anchorpipe/projects/3)         |
| **Contributor Recognition** | Quarterly | End of quarter | [Recognition Archive](docs/governance/RECOGNITION.md) (when established) |
| **State of the Project**    | Annually  | January        | [Annual Reports](docs/governance/ANNUAL_REPORTS/) (when established)     |

### Feedback Mechanisms

**Tell us how we're doing:**

- 💬 [Governance Discussions](https://github.com/anchorpipe/anchorpipe/discussions/categories/governance)
- 📧 Direct feedback: governance@anchorpipe.dev
- 📊 Annual Governance Survey (to be established)

**We respond to:**

- All governance emails within 7 days
- All survey feedback in annual report (when established)
- Trending Discussion topics in monthly updates

## Governance Changelog

Track changes to this governance document:

### 2025

**November 9, 2025** - Major governance overhaul

- Added governance principles and values
- Defined contribution ladder
- Added succession planning
- Created governance evolution roadmap
- Enhanced decision-making processes
- Added communication channels
- Strengthened conflict resolution
- Expanded licensing & IP section

**November 5, 2024** - Initial governance document

- Established BDFL model
- Defined basic roles
- Linked to ADR process

---

**[View full history →](https://github.com/anchorpipe/anchorpipe/commits/main/GOVERNANCE.md)**

## Related Documents

- [Code of Conduct](CODE_OF_CONDUCT.md) - Community behavior standards
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Security Policy](SECURITY.md) - Security vulnerability reporting
- [Commercial Strategy](docs/governance/COMMERCIAL_STRATEGY.md) - Business model
- [Contributor Rewards](docs/governance/CONTRIBUTOR_REWARDS.md) - Recognition framework
- [Foundation Plan](docs/governance/FOUNDATION_PLAN.md) - Long-term structure
- [Trademark Policy](TRADEMARK_POLICY.md) - Brand usage
- [IP Assignment](IP_ASSIGNMENT.md) - Intellectual property

---

## Contact & Questions

**Have governance questions?**

- 💬 [Ask in Discussions](https://github.com/anchorpipe/anchorpipe/discussions/categories/governance)
- 📧 Email: governance@anchorpipe.dev

**Want to propose changes?**

1. Open a [Governance Discussion](https://github.com/anchorpipe/anchorpipe/discussions/categories/governance)
2. Describe the problem and proposed solution
3. Allow 30 days for community feedback
4. BDFL will respond with decision and rationale

---

<div align="center">

<sub>Governance by the people, for the people. Built with ❤️ by the anchorpipe community.</sub>

<br><br>

**[Back to Top ↑](#anchorpipe-project-governance)**

</div>
