# Implementation Dependencies and Gap Resolution Order

**Last Updated**: 2025-11-09

## Overview

This document outlines the recommended order for addressing identified gaps from the gap analysis. It provides a structured approach to implementing missing features and completing partially implemented stories.

## Gap Analysis Summary

### EPIC-000 (Foundation) - Status: ✅ Complete

- **ST-101 through ST-108**: All stories fully implemented with no identified gaps
- **Action**: No gaps to address

### EPIC-00A (Security Foundation) - Status: ✅ Complete

- **ST-201 through ST-212**: All stories fully implemented with no identified gaps
- **Action**: No gaps to address

### EPIC-001 (Core Platform) - Status: ✅ Complete

- **ST-301**: Fully implemented - All phases (1, 2, 3) complete
  - ✅ Phase 1: Workflow/Check Run Event Handling, Repository Synchronization, Ingestion Integration
  - ✅ Phase 2: Direct Uninstall API Endpoint, Installation Health Check
  - ✅ Phase 3: Repository Selection Management, Installation Permissions Update Handling
- **Action**: No gaps to address

## Remaining Gaps from ST-100s and ST-200s

### EPIC-00A (Security Foundation) - Medium Priority Gaps

While EPIC-00A is marked as complete, there are some Medium Priority gaps with Low Impact that can be addressed:

#### ST-205: Email Notifications

**Priority**: Medium  
**Status**: ⚠️ Partially Implemented  
**Estimated Effort**: Medium (3-4 hours)

**Description**:  
Telemetry events are queued (`dsr.email_queued`), but mailer infrastructure is pending. Email notifications would improve UX for DSR confirmations, password resets, and email verification.

**Implementation Steps**:

1. Create email service abstraction layer
2. Implement email template system
3. Create email queue processor (consumes telemetry events)
4. Add email provider integration (Resend, SendGrid, or SMTP)
5. Add configuration for email settings
6. Update DSR, password reset, and email verification to use email service
7. Add unit tests
8. Update documentation

**Dependencies**:

- ✅ Telemetry events queued
- ⚠️ Requires email provider (Resend, SendGrid, AWS SES, or SMTP)

**Files to Create**:

- `apps/web/src/lib/server/email-service.ts`
- `apps/web/src/lib/server/email-templates.ts`
- `apps/web/src/lib/server/email-queue-processor.ts`

**Files to Modify**:

- `apps/web/src/lib/server/dsr-service.ts`
- `apps/web/src/app/api/auth/password-reset/request/route.ts`
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/auth/resend-verification/route.ts`

**Related Gap Analysis**: [ST-205.md](./EPIC-00A/ST-205.md#medium-priority-gaps)

---

#### ST-206: SIEM Integration

**Priority**: Medium  
**Status**: ✅ Complete  
**Estimated Effort**: Medium (4-6 hours)

**Description**:  
Integrate audit logs with SIEM systems (ELK, Splunk, etc.) for enhanced security monitoring.

**Implementation Steps**:

1. Create SIEM adapter interface
2. Implement log forwarding (Syslog, HTTP, or native API)
3. Add configuration for SIEM endpoints
4. Add batch processing for audit logs
5. Add retry logic and error handling
6. Add unit tests
7. Update documentation

**Dependencies**:

- ✅ Audit logging exists
- ⚠️ Requires SIEM system configuration

**Files to Create**:

- `apps/web/src/lib/server/siem-adapter.ts`
- `apps/web/src/lib/server/siem-forwarder.ts`

**Related Gap Analysis**: [ST-206.md](./EPIC-00A/ST-206.md#medium-priority-gaps)

---

#### ST-206: Alerting on Suspicious Patterns

**Priority**: Medium  
**Status**: ✅ Complete  
**Estimated Effort**: Medium (3-4 hours)

**Description**:  
Add automated alerting for suspicious patterns in audit logs (e.g., multiple failed logins, unusual access patterns).

**Implementation Steps**:

1. Create pattern detection service
2. Define suspicious patterns (rate limits, geographic anomalies, etc.)
3. Implement alerting mechanism (email, webhook, or SIEM)
4. Add configuration for alert thresholds
5. Add unit tests
6. Update documentation

**Dependencies**:

- ✅ Audit logging exists
- ⚠️ Requires email service (ST-205) or webhook infrastructure

**Files to Create**:

- `apps/web/src/lib/server/security-alerts.ts`
- `apps/web/src/lib/server/pattern-detection.ts`

**Related Gap Analysis**: [ST-206.md](./EPIC-00A/ST-206.md#medium-priority-gaps)

---

## ST-301 Gap Resolution Order (COMPLETED ✅)

### Phase 1: Critical Gaps (Must Complete for ST-301)

#### 1.1 Workflow/Check Run Event Handling

**Priority**: Critical  
**Status**: ❌ Not Implemented  
**Estimated Effort**: Medium (2-3 days)

**Description**:  
Add webhook handlers for `workflow_run` and `check_run` events to detect when test runs complete. This is required for the "test data flows automatically" requirement.

**Implementation Steps**:

1. Add `workflow_run` event handler in `/api/webhooks/github-app/route.ts`
2. Add `check_run` event handler in `/api/webhooks/github-app/route.ts`
3. Extract test run metadata (commit SHA, workflow run ID, repository)
4. Trigger ingestion service integration (see Phase 1.3)
5. Add unit tests for event handlers
6. Update documentation

**Dependencies**:

- ✅ Webhook endpoint exists
- ✅ Signature verification exists
- ⚠️ Requires ingestion service integration (Phase 1.3)

**Files to Modify**:

- `apps/web/src/app/api/webhooks/github-app/route.ts`
- `apps/web/src/lib/server/github-app-service.ts` (if helper functions needed)
- `docs/guides/integrations/github-app.md`

**Related Gap Analysis**: [ST-301.md](./EPIC-001/ST-301.md#critical-gaps)

---

#### 1.2 Repository Synchronization Verification

**Priority**: Critical  
**Status**: ⚠️ Partially Implemented  
**Estimated Effort**: Small (1 day)

**Description**:  
Verify that `syncRepositoriesFromInstallation` is called on all relevant webhook events and correctly creates/updates `Repo` records in the database.

**Implementation Steps**:

1. Review `syncRepositoriesFromInstallation` implementation
2. Verify it's called on `installation.created` event
3. Verify it's called on `installation_repositories.added` event
4. Test repository creation/update flow
5. Add integration tests
6. Fix any issues found

**Dependencies**:

- ✅ `syncRepositoriesFromInstallation` function exists
- ✅ Database schema supports `Repo` model

**Files to Review/Modify**:

- `apps/web/src/lib/server/github-app-service.ts` (line 311-370)
- `apps/web/src/app/api/webhooks/github-app/route.ts`
- `apps/web/src/lib/server/__tests__/github-app-service.test.ts`

**Related Gap Analysis**: [ST-301.md](./EPIC-001/ST-301.md#critical-gaps)

---

#### 1.3 Integration with Ingestion Service

**Priority**: Critical  
**Estimated Effort**: Large (3-5 days)

**Description**:  
Create integration layer between GitHub App webhook events and the ingestion pipeline. When `workflow_run` or `check_run` completes, automatically fetch test results and submit them to the ingestion service.

**Implementation Steps**:

1. Create ingestion trigger service (`github-app-ingestion-trigger.ts`)
2. Implement GitHub API client to fetch workflow run artifacts
3. Parse test results from artifacts (JUnit XML, Jest JSON, etc.)
4. Submit to ingestion endpoint (`/api/ingestion`) with proper HMAC signature
5. Handle errors and retries
6. Add audit logging
7. Add unit and integration tests
8. Update documentation

**Dependencies**:

- ✅ Ingestion endpoint exists (`/api/ingestion`)
- ✅ HMAC authentication exists (ST-208)
- ✅ Token generation exists (`getInstallationToken`)
- ⚠️ Requires workflow_run/check_run handlers (Phase 1.1)

**Files to Create**:

- `apps/web/src/lib/server/github-app-ingestion-trigger.ts`
- `apps/web/src/lib/server/__tests__/github-app-ingestion-trigger.test.ts`

**Files to Modify**:

- `apps/web/src/app/api/webhooks/github-app/route.ts`
- `docs/guides/integrations/github-app.md`

**Related Gap Analysis**: [ST-301.md](./EPIC-001/ST-301.md#critical-gaps)

---

### Phase 2: High-Priority Gaps (Should Complete for ST-301)

#### 2.1 Direct Uninstall API Endpoint

**Priority**: High  
**Status**: ⚠️ Partially Implemented  
**Estimated Effort**: Small (1 day)

**Description**:  
Add `DELETE /api/github-app/installations/[installationId]` endpoint to allow users to uninstall the app directly via API (in addition to webhook handling).

**Implementation Steps**:

1. Create `DELETE` handler in `/api/github-app/installations/[installationId]/route.ts`
2. Call GitHub API to uninstall the app
3. Delete installation record from database
4. Clear token cache
5. Add audit logging
6. Add unit tests
7. Update API documentation

**Dependencies**:

- ✅ Installation management service exists
- ✅ Token generation exists
- ✅ GitHub API client (or fetch) available

**Files to Modify**:

- `apps/web/src/app/api/github-app/installations/[installationId]/route.ts`
- `docs/guides/integrations/github-app.md`

**Related Gap Analysis**: [ST-301.md](./EPIC-001/ST-301.md#high-priority-gaps)

---

#### 2.2 Installation Status/Health Check

**Priority**: High  
**Status**: ❌ Not Implemented  
**Estimated Effort**: Small (1 day)

**Description**:  
Add endpoint or extend existing endpoint to check installation health (active, suspended, permission issues).

**Implementation Steps**:

1. Add health check function to `github-app-service.ts`
2. Check installation status in database
3. Optionally verify with GitHub API
4. Return health status in API response
5. Add to existing `GET /api/github-app/installations/[installationId]` endpoint
6. Add unit tests
7. Update documentation

**Dependencies**:

- ✅ Installation service exists
- ✅ GitHub API client available

**Files to Modify**:

- `apps/web/src/lib/server/github-app-service.ts`
- `apps/web/src/app/api/github-app/installations/[installationId]/route.ts`
- `docs/guides/integrations/github-app.md`

**Related Gap Analysis**: [ST-301.md](./EPIC-001/ST-301.md#high-priority-gaps)

---

### Phase 3: Medium-Priority Gaps (Nice to Have)

#### 3.1 Repository Selection Management

**Priority**: Medium  
**Status**: ❌ Not Implemented  
**Estimated Effort**: Medium (2-3 days)

**Description**:  
Add API endpoints to manage which repositories are selected for an installation when `repository_selection: 'selected'`.

**Implementation Steps**:

1. Add `PUT /api/github-app/installations/[installationId]/repositories` endpoint
2. Call GitHub API to update repository selection
3. Update database record
4. Add audit logging
5. Add unit tests
6. Update documentation

**Dependencies**:

- ✅ Installation service exists
- ✅ GitHub API client available

**Files to Create/Modify**:

- `apps/web/src/app/api/github-app/installations/[installationId]/repositories/route.ts`
- `apps/web/src/lib/server/github-app-service.ts`
- `docs/guides/integrations/github-app.md`

**Related Gap Analysis**: [ST-301.md](./EPIC-001/ST-301.md#medium-priority-gaps)

---

#### 3.2 Installation Permissions Update Handling

**Priority**: Medium  
**Status**: ⚠️ Partially Implemented  
**Estimated Effort**: Small (1 day)

**Description**:  
Ensure `validateInstallationPermissions` is called when permissions change (e.g., via webhook event or manual update).

**Implementation Steps**:

1. Review current permission validation implementation
2. Add webhook handler for permission change events (if GitHub sends them)
3. Add manual permission refresh endpoint (optional)
4. Add unit tests
5. Update documentation

**Dependencies**:

- ✅ Permission validation function exists
- ⚠️ May require GitHub webhook event support

**Files to Modify**:

- `apps/web/src/app/api/webhooks/github-app/route.ts`
- `apps/web/src/lib/server/github-app-service.ts`
- `docs/guides/integrations/github-app.md`

**Related Gap Analysis**: [ST-301.md](./EPIC-001/ST-301.md#medium-priority-gaps)

---

## Implementation Timeline

### Week 1: Critical Gaps

- **Day 1-2**: Workflow/Check Run Event Handling (Phase 1.1)
- **Day 3**: Repository Synchronization Verification (Phase 1.2)
- **Day 4-5**: Integration with Ingestion Service (Phase 1.3)

### Week 2: High-Priority Gaps

- **Day 1**: Direct Uninstall API Endpoint (Phase 2.1)
- **Day 2**: Installation Status/Health Check (Phase 2.2)
- **Day 3-5**: Testing, documentation, and refinement

### Week 3: Medium-Priority Gaps (Optional)

- **Day 1-3**: Repository Selection Management (Phase 3.1)
- **Day 4**: Installation Permissions Update Handling (Phase 3.2)
- **Day 5**: Final testing and documentation

## Testing Strategy

### Unit Tests

- Add tests for all new functions
- Mock GitHub API calls
- Test error handling

### Integration Tests

- Test webhook → ingestion flow end-to-end
- Test repository synchronization
- Test token generation and caching

### Manual Testing

- Install GitHub App on test repository
- Trigger test runs
- Verify automatic ingestion
- Test uninstall flow

## Documentation Updates

### Required Updates

1. **GitHub App Integration Guide** (`docs/guides/integrations/github-app.md`)
   - Add workflow_run/check_run event handling documentation
   - Add ingestion integration documentation
   - Add uninstall API endpoint documentation
   - Add health check documentation

2. **API Reference**
   - Document new endpoints
   - Document request/response formats
   - Document error codes

3. **Troubleshooting Guide**
   - Add common issues and solutions
   - Add debugging steps

## Dependencies Between Gaps

```
Phase 1.1 (Workflow/Check Run Events)
    ↓
Phase 1.3 (Ingestion Integration)
    ↑
Phase 1.2 (Repository Sync) ──┘

Phase 2.1 (Uninstall API) ──┐
    ↓                        │
Phase 2.2 (Health Check) ───┘

Phase 3.1 (Repo Selection) ──┐
    ↓                         │
Phase 3.2 (Permissions) ─────┘
```

## Success Criteria

### Phase 1 Complete (Critical Gaps)

- ✅ `workflow_run` events trigger test result ingestion
- ✅ `check_run` events trigger test result ingestion
- ✅ Repository synchronization works correctly
- ✅ Test results automatically flow to ingestion service
- ✅ Integration tests pass

### Phase 2 Complete (High-Priority Gaps)

- ✅ Users can uninstall app via API
- ✅ Installation health status is available
- ✅ All tests pass
- ✅ Documentation updated

### Phase 3 Complete (Medium-Priority Gaps)

- ✅ Repository selection can be managed via API
- ✅ Permission changes are detected and validated
- ✅ All tests pass
- ✅ Documentation updated

## Related Documentation

- [ST-301 Gap Analysis](./EPIC-001/ST-301.md)
- [GitHub App Integration Guide](../../docs/guides/integrations/github-app.md)
- [CI Integration Guide](../../docs/CI_INTEGRATION.md)
- [Issue Dependencies Matrix](../../anchorpipe_guide_docs/issues-to-create/07-issue-dependencies-matrix.md)

## Notes

- **Critical gaps must be addressed** before ST-301 can be considered complete
- **High-priority gaps** should be addressed for a production-ready implementation
- **Medium-priority gaps** are nice-to-have features that can be deferred if needed
- All gap implementations should include tests and documentation updates
