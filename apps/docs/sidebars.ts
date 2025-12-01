import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        {
          type: 'category',
          label: 'Foundation',
          items: [
            'guides/foundation/README',
            'guides/foundation/project-setup',
            'guides/foundation/database-schema',
            'guides/foundation/cicd-pipeline',
            'guides/foundation/authentication',
            'guides/foundation/api-gateway',
            'guides/foundation/message-queue',
            'guides/foundation/object-storage',
            'guides/foundation/telemetry-logging',
          ],
        },
        {
          type: 'category',
          label: 'Architecture',
          items: [
            'guides/architecture/overview',
            'guides/architecture/rate-limiting',
            'guides/architecture/idempotency',
            'guides/architecture/testing',
          ],
        },
        {
          type: 'category',
          label: 'Security',
          items: [
            'guides/security/README',
            'guides/security/rbac',
            'guides/security/encryption',
            'guides/security/input-validation',
            'guides/security/security-headers',
            'guides/security/data-subject-requests',
            'guides/security/audit-logging',
            'guides/security/oauth',
            'guides/security/rate-limiting',
            'guides/security/scanning',
          ],
        },
        {
          type: 'category',
          label: 'Integrations',
          items: [
            'guides/integrations/README',
            'guides/integrations/ci-integration',
            'guides/integrations/github-app',
            'guides/integrations/github-actions',
            'guides/integrations/gitlab-ci',
            'guides/integrations/jenkins',
            'guides/integrations/circleci',
          ],
        },
        {
          type: 'category',
          label: 'Services',
          items: ['guides/services/ingestion-worker'],
        },
        {
          type: 'category',
          label: 'Deployment',
          items: [
            'guides/deployment/local',
            'guides/deployment/staging',
            'guides/deployment/production',
          ],
        },
        'guides/local-testing',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: ['api/rest-api', 'api/webhooks', 'api/authentication'],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/configuration',
        'reference/environment-variables',
        {
          type: 'category',
          label: 'Compliance',
          items: [
            'reference/compliance/README',
            'reference/compliance/privacy-policy',
            'reference/compliance/data-processing-agreement',
            'reference/compliance/retention-policy',
          ],
        },
        {
          type: 'category',
          label: 'Security',
          items: [
            'reference/security/README',
            'reference/security/contacts',
            'reference/security/escalation',
            'reference/security/incident-response',
          ],
        },
        {
          type: 'category',
          label: 'Architecture Decisions',
          items: [
            'reference/adr/index',
            'reference/adr/core-backend-stack',
            'reference/adr/messaging-selection',
            'reference/adr/db-sharding-strategy',
            'reference/adr/ml-serving-for-mcp',
            'reference/adr/ci-auth-strategy',
            'reference/adr/web-entry-bundle-budget',
            'reference/adr/ingestion-cutover-criteria',
            'reference/adr/api-style-rest-vs-graphql',
            'reference/adr/search-engine',
            'reference/adr/product-site-cta',
            'reference/adr/object-storage',
            'reference/adr/failure-details-privacy',
            'reference/adr/code-organization-server-client-separation',
            'reference/adr/test-database-strategy',
            'reference/adr/redis-rate-limiting',
            'reference/adr/idempotency-strategy',
            'reference/adr/error-handling-strategy',
            'reference/adr/observability-strategy',
            'reference/adr/template',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance/FOUNDATION_PLAN',
        'governance/COMMERCIAL_STRATEGY',
        'governance/CONTRIBUTOR_REWARDS',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/development',
        'contributing/code-standards',
        'contributing/pull-requests',
      ],
    },
    'changelog',
  ],
};

export default sidebars;
