# Security Contacts (ST-211)

## Overview

This document provides contact information for security-related matters, including incident reporting, vulnerability disclosure, and security inquiries.

## Primary Contacts

### Security Team

**Email**: security@anchorpipe.org (preferred)

**Response Time**: Within 48 hours for initial response

**Use For**:

- Security vulnerability reports
- Security incident reports
- Security questions
- Security policy inquiries

### Incident Commander

**Role**: Overall incident response coordination

**Primary**: Security Lead / CTO

- **Email**: security@anchorpipe.org
- **Escalation**: Via security email

**Backup**: Engineering Lead

- **Email**: engineering@anchorpipe.org
- **Escalation**: Via security email

### Security Engineer

**Role**: Technical investigation and remediation

**Primary**: Security Engineer / Senior Engineer

- **Email**: security@anchorpipe.org
- **On-Call**: Rotating schedule

**Backup**: Engineering Team

- **Email**: engineering@anchorpipe.org

### Communication Lead

**Role**: Internal and external communication

**Primary**: Product Manager / CTO

- **Email**: product@anchorpipe.org
- **Escalation**: Via security email

**Backup**: Engineering Lead

- **Email**: engineering@anchorpipe.org

## Emergency Contacts

### Critical Incidents (P0)

**Response Time**: Immediate (within 1 hour)

1. **Incident Commander**
   - Email: security@anchorpipe.org
   - Subject: [CRITICAL] Security Incident

2. **On-Call Engineer**
   - Check on-call schedule
   - PagerDuty / OpsGenie (if configured)

3. **Security Team**
   - Email: security@anchorpipe.org
   - Slack: #security-incidents (if configured)

### High Severity Incidents (P1)

**Response Time**: Within 4 hours

1. **Security Team**
   - Email: security@anchorpipe.org
   - Subject: [HIGH] Security Incident

2. **Incident Commander**
   - Email: security@anchorpipe.org

## External Contacts

### Law Enforcement

**When to Contact**:

- Active data breach
- Criminal activity
- Legal requirements

**Contact**: Via legal team first

### Legal Team

**When to Contact**:

- Regulatory notification required
- Legal implications
- Contractual obligations

**Contact**: legal@anchorpipe.org (when available)

### Compliance Team

**When to Contact**:

- GDPR notification (72 hours)
- Other regulatory requirements
- Compliance questions

**Contact**: compliance@anchorpipe.org (when available)

### Cloud Provider Support

**AWS / Azure / GCP**:

- Security incidents affecting infrastructure
- Account compromise
- Infrastructure vulnerabilities

**Contact**: Via cloud provider support portal

### Third-Party Vendors

**When to Contact**:

- Vendor security incidents affecting Anchorpipe
- Vendor vulnerability disclosures
- Integration security issues

**Contact**: Per vendor security contact procedures

## Communication Channels

### Email

**Primary**: security@anchorpipe.org

**Use For**:

- Vulnerability reports
- Security incident reports
- Security inquiries
- Non-urgent security matters

### GitHub Security Advisories

**URL**: https://github.com/anchorpipe/anchorpipe/security/advisories

**Use For**:

- Public vulnerability disclosure
- Security advisory publication
- Coordinated disclosure

### Slack / Teams (Internal)

**Channel**: #security-incidents (if configured)

**Use For**:

- Real-time incident coordination
- Internal security discussions
- Incident status updates

**Note**: Do not discuss sensitive details in public channels

### Phone (Emergency Only)

**When to Use**:

- Critical incidents requiring immediate response
- When email is not accessible

**Contact**: Via on-call schedule

## Contact Information Template

When reporting a security incident, include:

```
Subject: [SEVERITY] Security Incident: [Brief Description]

Incident Details:
- Type: [Data Breach / Vulnerability / Attack / etc.]
- Severity: [Critical / High / Medium / Low]
- Discovery Time: [Date/Time]
- Affected Systems: [List systems]
- Impact: [Description of impact]
- Current Status: [Active / Contained / Resolved]

Contact Information:
- Name: [Your Name]
- Email: [Your Email]
- Phone: [Optional, for urgent matters]

Additional Information:
[Any other relevant details]
```

## Response Timeline

### Initial Response

- **Critical (P0)**: Within 1 hour
- **High (P1)**: Within 4 hours
- **Medium (P2)**: Within 24 hours
- **Low (P3)**: Within 7 days

### Status Updates

- **Critical**: Hourly during active incident
- **High**: Every 4 hours during active incident
- **Medium/Low**: Daily updates

### Resolution

- **Critical**: 24-48 hours
- **High**: 7 days
- **Medium**: 30 days
- **Low**: Next release

## On-Call Schedule

### Rotation

- **Frequency**: Weekly rotation
- **Coverage**: 24/7 for critical incidents
- **Handoff**: Monday 9:00 AM UTC

### Responsibilities

- Receive and triage security alerts
- Initial incident assessment
- Escalate to Incident Commander
- Implement immediate mitigations

### Current Schedule

_Note: Update this section with actual on-call schedule_

| Week   | Primary | Backup |
| ------ | ------- | ------ |
| Week 1 | [Name]  | [Name] |
| Week 2 | [Name]  | [Name] |
| Week 3 | [Name]  | [Name] |
| Week 4 | [Name]  | [Name] |

## Escalation Contacts

See [SECURITY_ESCALATION.md](SECURITY_ESCALATION.md) for escalation procedures.

### Escalation Path

1. **Level 1**: On-Call Engineer → Incident Commander
2. **Level 2**: Incident Commander → CTO / Security Lead
3. **Level 3**: CTO → Executive Team / Board
4. **External**: Legal, Compliance, Law Enforcement

## Contact Updates

### Regular Review

- **Frequency**: Quarterly
- **Owner**: Security Lead
- **Process**: Verify all contacts are current

### Update Triggers

- Team member changes
- Role changes
- Contact information changes
- Organizational changes

## Confidentiality

All security contacts and communications are confidential. Do not share contact information or incident details publicly without authorization.

## Related Documentation

- [SECURITY_INCIDENT_RESPONSE.md](SECURITY_INCIDENT_RESPONSE.md) - Incident response procedures
- [SECURITY_ESCALATION.md](SECURITY_ESCALATION.md) - Escalation procedures
- [SECURITY.md](../SECURITY.md) - Security policy

## Revision History

| Version | Date       | Author        | Changes                   |
| ------- | ---------- | ------------- | ------------------------- |
| 1.0     | 2025-11-08 | Security Team | Initial contacts document |
