# Contributor Intellectual Property Rights

**Last Updated**: 2025-11-09  
**Status**: Active Policy

## ⚠️ Important: This is Not a CLA

**This document explains our IP approach. You do NOT sign this document.**

anchorpipe uses the **Developer Certificate of Origin (DCO)** for contributions, not a Contributor License Agreement (CLA).

---

## Our IP Approach: DCO + AGPL License

### What is DCO?

The [Developer Certificate of Origin](https://developercertificate.org/) is a lightweight way to certify you have the right to contribute code.

**To contribute, you:**

1. Certify you wrote the code or have the right to contribute it
2. Sign your commits: `git commit -s -m "Your message"`
3. Your contribution is automatically licensed under AGPL-3.0

**That's it.** No complex legal agreements to sign.

### What DCO Sign-Off Means

By signing off on a commit, you certify:

> Developer Certificate of Origin
>
> Version 1.1
>
> By making a contribution to this project, I certify that:
>
> (a) The contribution was created in whole or in part by me and I have the right to submit it under the open source license indicated in the file; or
>
> (b) The contribution is based upon previous work that, to the best of my knowledge, is covered under an appropriate open source license and I have the right under that license to submit that work with modifications, whether created in whole or in part by me, under the same open source license (unless I am permitted to submit under a different license), as indicated in the file; or
>
> (c) The contribution was provided directly to me by some other person who certified (a), (b) or (c) and I have not modified it.
>
> (d) I understand and agree that this project and the contribution are public and that a record of the contribution (including all personal information I submit with it, including my sign-off) is maintained indefinitely and may be redistributed consistent with this project or the open source license(s) involved.

**[Read full DCO →](https://developercertificate.org/)**

---

## License Grant: AGPL-3.0

### What You're Licensing (Not Assigning)

When you contribute code to anchorpipe:

**✅ You grant a license (not ownership transfer):**

- Your contribution is licensed under **AGPL-3.0**
- Same license as the rest of the project
- This is an **irrevocable, perpetual, worldwide license**

**✅ You keep ownership:**

- You retain copyright to your code
- You can use your code in other projects
- You can relicense your code in other contexts

**✅ The project can:**

- Include your code in the AGPL-licensed project
- Distribute your code under AGPL-3.0
- Allow others to use your code under AGPL-3.0

### Understanding Your Rights

#### Copyright vs. License

**You keep copyright** = You own the code  
**You grant license** = Others can use it under specific terms

**Example:**

```
Copyright (c) 2025 Your Name
Licensed under AGPL-3.0
```

You own it (copyright), but you've given permission for others to use it (license).

#### What "Irrevocable" Means

**Irrevocable** = You can't take it back

Once your code is merged:

- ✅ It's available under AGPL-3.0 forever
- ❌ You can't revoke the license later
- ❌ You can't demand removal (except for legal violations)

**Why?** Projects need stability. Imagine if contributors could revoke licenses randomly—the project would collapse.

**Your protection:** The license is public and limited to AGPL-3.0 terms.

---

## What About Commercial Licensing?

### Current Approach (DCO Only)

With DCO, you grant rights under **AGPL-3.0 ONLY**. This means:

- ✅ Your code stays open source (AGPL)
- ✅ Anyone can use it under AGPL terms
- ❌ Project **CANNOT** relicense your code without your permission
- ❌ Project **CANNOT** offer proprietary licenses of your code

### Our Commercial Strategy

We handle commercial licensing through:

1. **Separate Commercial Modules** - Proprietary features not in AGPL codebase
2. **Dual Repository Model** - Community edition (AGPL) + Enterprise edition (proprietary)
3. **Services & Support** - Revenue from support, not relicensing

**This means:**

- The AGPL core (including your contributions) stays open source forever
- Commercial revenue comes from additional proprietary modules and services
- We don't need to relicense your AGPL contributions

**[See Commercial Strategy →](docs/governance/COMMERCIAL_STRATEGY.md)**

### How anchorpipe Makes Money (Planned)

**Revenue Sources:**

1. **Enterprise Edition** (Proprietary Add-Ons)
   - ✅ Built on AGPL core (your contributions)
   - ✅ Additional proprietary modules sold separately
   - ❌ Does NOT relicense your AGPL code

2. **Support & Services**
   - Consulting, training, implementation help
   - SLAs and enterprise support contracts
   - Custom feature development

3. **Managed Hosting**
   - Cloud-hosted version of anchorpipe
   - Uses AGPL core + proprietary management layer

**What This Means for Your Contributions:**

Your AGPL contributions:

- ✅ Stay open source forever
- ✅ Are used in free community edition
- ✅ Form the foundation of commercial products
- ❌ Are NOT relicensed or made proprietary
- ❌ Do NOT directly generate revenue (infrastructure does)

**Why This Matters:**

You should understand that:

- Your work enables commercial products (indirectly)
- You receive recognition, not direct compensation (unless in revenue share program)
- Commercial success benefits the project (more development resources)

**Is this fair?**

This is the standard open-source model:

- **GitLab** - AGPL core + proprietary features
- **MongoDB** - AGPL database + commercial tools
- **Elastic** - Open core + commercial features

You contribute to open source; company builds commercial layer on top.

**If you're uncomfortable with this:**

- Don't contribute (that's okay!)
- Contribute only to areas you're comfortable with
- Engage in [Commercial Strategy discussions](https://github.com/anchorpipe/anchorpipe/discussions/categories/commercial-strategy)

---

## Optional: Enhanced Contributor Agreement

### For Contributors Who Want More

If you want to grant additional rights (like relicensing for commercial use), you can **optionally** sign our Enhanced Contributor Agreement:

**Why would you do this?**

- Enable simpler commercial licensing
- Potential for contributor revenue sharing (see [Contributor Rewards](docs/governance/CONTRIBUTOR_REWARDS.md))
- Support project sustainability

**What it grants:**

- ✅ Right to relicense your contributions under other licenses
- ✅ Right to include in commercial products
- ✅ Right to sublicense

**What you get:**

- ✅ Eligibility for revenue sharing program (when available)
- ✅ Recognition as "Enhanced Contributor"
- ✅ Priority consideration for paid roles

**This is 100% optional. Your AGPL contributions are valuable regardless.**

**[View Enhanced Contributor Agreement →](docs/governance/ENHANCED_CONTRIBUTOR_AGREEMENT.md)** (coming soon)

---

## What You Can Do With Your Code

### ✅ You CAN:

**Use your code elsewhere:**

- Include in other open-source projects (any license)
- Include in your proprietary software
- Sell products that use your code
- Relicense your code in other contexts

**Contribute elsewhere:**

- Contribute similar code to other projects
- Reuse your own ideas and implementations

**Fork this project:**

- Create a fork under AGPL-3.0
- Modify and distribute your fork
- Compete with anchorpipe if you want

### ❌ You CANNOT:

**Revoke the license:**

- Can't remove your code from the project retroactively
- Can't prohibit others from using your merged code under AGPL

**Change terms retroactively:**

- Can't change license terms after contribution
- Can't demand compensation for past contributions

**Make anchorpipe proprietary:**

- Can't demand anchorpipe remove AGPL license
- Can't prevent others from using the project

---

## Your Protections

### What the Project Promises

**1. License Integrity**

- ✅ Your AGPL contributions stay AGPL
- ✅ No retroactive license changes without consent
- ✅ Clear notice if commercial licensing approach changes

**2. Attribution**

- ✅ Your name in git history (permanent)
- ✅ Recognition in release notes
- ✅ Listing in CONTRIBUTORS.md
- ✅ Copyright headers preserved

**3. Transparency**

- ✅ Commercial strategy is public
- ✅ Revenue reports (when applicable)
- ✅ Clear communication about IP changes

**4. No Surprises**

- ✅ 90-day notice before major IP policy changes
- ✅ Community discussion before changes
- ✅ Opt-out period for new agreements

### What Happens If Policy Changes?

**If we change IP requirements:**

1. **Notice**: 90 days advance notice
2. **Grandfather**: Existing contributions remain under current terms
3. **Choice**: You choose whether new contributions follow new terms
4. **Transparency**: Full rationale explained publicly

**Example Scenario:**

```
Jan 1, 2026: "We're adopting a CLA for all new contributions"
↓
Mar 31, 2026: CLA takes effect
↓
Your past contributions: Still under DCO/AGPL (unchanged)
Your future contributions: You choose to sign CLA or not contribute
```

**You're protected:** Past contributions can't be retroactively changed.

---

## IP Approaches: Comparison

Understanding different contribution models:

| Approach                  | Rights Granted            | Contributor Keeps            | anchorpipe Use       |
| ------------------------- | ------------------------- | ---------------------------- | -------------------- |
| **DCO (current)**         | AGPL license only         | Copyright, can reuse code    | ✅ Current default   |
| **CLA (optional future)** | AGPL + relicensing rights | Copyright, reuse with notice | 📅 Planned opt-in    |
| **Copyright Assignment**  | All rights to project     | Nothing (full transfer)      | ❌ We don't use this |
| **Public Domain**         | All rights to everyone    | Nothing                      | ❌ We don't use this |

### DCO vs. CLA: What's the Difference?

**DCO (Developer Certificate of Origin)**

- ✅ Lightweight: Just sign commits
- ✅ No legal document to sign
- ✅ Certifies you have right to contribute
- ✅ Contribution under AGPL only
- ❌ Doesn't grant relicensing rights

**Used by:** Linux kernel, Git, many AGPL projects

---

**CLA (Contributor License Agreement)**

- ⚠️ More complex: Sign legal document
- ⚠️ Grants broader rights (including relicensing)
- ✅ Enables commercial dual licensing
- ✅ Can include revenue sharing terms
- ❌ Requires more legal overhead

**Used by:** Apache projects, Google projects, GitLab

---

**Our Approach:**

- DCO by default (minimal friction)
- Optional CLA for those who want revenue sharing eligibility
- Never copyright assignment (you always keep ownership)

---

## Contribution Scenarios

### Scenario 1: Individual Developer

**Your situation:**

- You're an individual developer
- Contributing in your free time
- Not employed by company claiming IP

**What you do:**

1. Sign commits with `git commit -s`
2. Certify you own the code
3. Contribution licensed under AGPL

**Result:**

- ✅ Your code is in the project
- ✅ You keep copyright
- ✅ Everyone can use it under AGPL

---

### Scenario 2: Employed Developer (Employer Owns IP)

**Your situation:**

- Your employment agreement says employer owns code you write
- You want to contribute during work hours OR
- Your contribution relates to your job

**What you do:**

1. **Get employer permission** (written)
2. Sign commits on behalf of employer
3. Employer grants AGPL license

**Result:**

- ✅ Your code is in the project
- ✅ Employer keeps copyright
- ✅ Contribution licensed under AGPL
- ⚠️ Employer must agree to AGPL terms

---

### Scenario 3: Significant Contributor Seeking Revenue Share

**Your situation:**

- You've made major contributions
- Want to participate in future revenue sharing
- Willing to grant additional rights

**What you do:**

1. Continue contributing under DCO
2. When revenue sharing program launches, sign Enhanced CLA
3. Grant relicensing rights in exchange for revenue share eligibility

**Result:**

- ✅ Past contributions: Stay AGPL (DCO terms)
- ✅ Future contributions: AGPL + relicensing (Enhanced CLA)
- ✅ Eligible for revenue sharing
- ✅ Still keep copyright

---

## Future: Contributor Revenue Sharing

### Our Commitment

As commercial revenue grows, we're exploring:

**📊 Revenue Sharing Pool**

- X% of commercial revenue allocated to contributors
- Distributed based on contribution impact
- Requires Enhanced Contributor Agreement (opt-in)

**💼 Paid Contributor Roles**

- Full-time employment opportunities
- Contract work for specific features
- Bounties for priority issues

**Status:** 📅 Planned for 2025 when commercial revenue begins

**[See full plan →](docs/governance/CONTRIBUTOR_REWARDS.md)**

### Why Not Now?

**Honest answer:** No revenue yet.

- We're pre-revenue (as of 2025-11)
- Can't promise revenue sharing without revenue
- Want to establish fair, sustainable model first

**When revenue exists**, we'll implement contributor compensation.

---

## Frequently Asked Questions

<details>
<summary><strong>Do I need to sign a CLA?</strong></summary>

**No.** We use DCO (Developer Certificate of Origin), which just requires signing your commits with `git commit -s`.

We may offer an **optional** Enhanced Contributor Agreement in the future for revenue sharing, but it will always be opt-in.

</details>

<details>
<summary><strong>Can I contribute if I work for a company?</strong></summary>

**Check with your employer first.**

Many employment agreements claim rights to code you write. Before contributing:

1. Review your employment agreement
2. Get written permission from employer (if needed)
3. Ensure your company is okay with AGPL license

When signing off commits, you're certifying you have the right to contribute.

</details>

<details>
<summary><strong>What if I contributed code but change my mind?</strong></summary>

**You can't revoke the AGPL license** once your code is merged.

However:

- You retain copyright
- You can use your code elsewhere
- You can stop contributing in the future
- You can fork the project

If there's a legal issue (copyright violation, etc.), contact governance@anchorpipe.dev.

</details>

<details>
<summary><strong>Will I get paid if anchorpipe makes money?</strong></summary>

**Not automatically.**

Current approach:

- Contributions are voluntary and unpaid
- Future revenue sharing program planned (opt-in)
- Requires Enhanced Contributor Agreement

If you want guaranteed compensation:

- Wait for paid bounties/contracts
- Apply for paid maintainer roles (when available)
- Propose commercial partnership

See [Contributor Rewards](docs/governance/CONTRIBUTOR_REWARDS.md).

</details>

<details>
<summary><strong>Can anchorpipe sell my code?</strong></summary>

**Not directly.**

They can:

- ✅ Use your AGPL code in commercial products (under AGPL terms)
- ✅ Sell services, hosting, support around your code
- ✅ Sell proprietary add-ons that integrate with your code

They cannot:

- ❌ Relicense your AGPL code as proprietary (without your permission)
- ❌ Remove AGPL license from your contributions
- ❌ Sell your code under different terms (without CLA you haven't signed)

</details>

<details>
<summary><strong>What happens to my code if the project dies?</strong></summary>

**Your code is safe.**

Because it's AGPL:

- ✅ Anyone can fork the project
- ✅ Code remains available on GitHub
- ✅ Community can continue development
- ✅ You can extract your code and use elsewhere

AGPL protects against "code hostage" situations.

</details>

<details>
<summary><strong>Can I contribute anonymously?</strong></summary>

**Yes, but:**

- You still need to sign DCO (certify you have rights to contribute)
- Your commits are public (use pseudonym if preferred)
- Attribution will use your git name/email

For complete anonymity, you'd need to:

- Use pseudonymous git identity
- Not link to personal accounts
- Understand you may forfeit some recognition

</details>

<details>
<summary><strong>What if I contributed code that has a security vulnerability?</strong></summary>

**You're not liable** (no warranty under AGPL).

However:

- We'll notify you if we find issues in your code
- You're welcome (but not required) to help fix it
- Your contribution history isn't negatively impacted

AGPL Section 15-16 provides no warranty protection.

</details>

<details>
<summary><strong>Can I contribute code from StackOverflow or other sources?</strong></summary>

**Check the license first.**

- ✅ Public domain code: Yes
- ✅ MIT/Apache/BSD code: Yes (with attribution and license notice)
- ⚠️ GPL code: Check compatibility (AGPL is compatible with GPL)
- ❌ Proprietary/copyrighted code: No
- ❌ StackOverflow without attribution: No (CC BY-SA license)

When in doubt, ask in [Discussions](https://github.com/anchorpipe/anchorpipe/discussions).

</details>

<details>
<summary><strong>How do I prove I contributed if I want to use it on my resume?</strong></summary>

**Evidence you own:**

- ✅ Git commit history (publicly visible)
- ✅ GitHub profile showing merged PRs
- ✅ Release notes mentioning you
- ✅ CONTRIBUTORS.md listing

We also provide:

- Contributor certificates (on request)
- Recommendation letters for significant contributors
- Verification of contributions

Contact governance@anchorpipe.dev for official verification.

</details>

---

## Related Documents

- [Contributing Guide](CONTRIBUTING.md) - How to contribute code
- [Governance](GOVERNANCE.md) - Project governance model
- [Commercial Strategy](docs/governance/COMMERCIAL_STRATEGY.md) - How we make money
- [Contributor Rewards](docs/governance/CONTRIBUTOR_REWARDS.md) - Recognition and compensation
- [Developer Certificate of Origin](https://developercertificate.org/) - What DCO means
- [AGPL-3.0 License](LICENSE) - Full license text

---

## Get Help

**Questions about IP rights?**

- 💬 [Ask in Discussions](https://github.com/anchorpipe/anchorpipe/discussions/categories/legal-ip)
- 📧 Email: governance@anchorpipe.dev
- 🔍 [Read the FAQ](#frequently-asked-questions)

**Before contributing if you're unsure:**

- Check with your employer
- Read the [DCO](https://developercertificate.org/)
- Ask questions first

**We'd rather answer questions upfront than have problems later.**

---

## Legal Disclaimer

This document is a summary and does not constitute legal advice. Consult with a lawyer if you have specific legal questions about IP rights or commercial use.

**Important:** This document explains our current IP approach. We may update this policy as the project evolves. Significant changes will be:

- Announced in GitHub Discussions
- Documented in release notes
- Applied only to new contributions (existing contributions remain under current terms)

---

<div align="center">

<sub>Your code. Your rights. Our shared future.</sub>

<br><br>

**[Back to Top ↑](#contributor-intellectual-property-rights)**

</div>
