import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import {
  Rocket,
  BookOpen,
  Shield,
  Settings,
  Code,
  Database,
  GitBranch,
  FileText,
  ArrowRight,
} from 'lucide-react';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className={styles.heroTitle}>
          {siteConfig.title}
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
      </div>
    </header>
  );
}

interface CategoryItem {
  label: string;
  to?: string;
  href?: string;
}

interface Category {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: CategoryItem[];
}

function CategorySection({ category }: { category: Category }) {
  const Icon = category.icon;
  return (
    <div className={styles.categorySection}>
      <div className={styles.categoryHeader}>
        <Icon size={20} className={styles.categoryIcon} />
        <h2 className={styles.categoryTitle}>{category.title}</h2>
      </div>
      <ul className={styles.categoryList}>
        {category.items.map((item, idx) => (
          <li key={idx} className={styles.categoryItem}>
            {item.to ? (
              <Link to={item.to} className={styles.categoryLink}>
                {item.label}
              </Link>
            ) : (
              <a
                href={item.href}
                className={styles.categoryLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
                <ArrowRight size={14} className={styles.externalLinkIcon} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HomepageCategories(): ReactNode {
  const categories: Category[] = [
    {
      title: 'Get started',
      icon: Rocket,
      items: [
        { label: 'Installation', to: '/docs/getting-started/installation' },
        { label: 'Quick Start', to: '/docs/getting-started/quick-start' },
        { label: 'Configuration', to: '/docs/getting-started/configuration' },
        { label: 'Introduction', to: '/docs/intro' },
      ],
    },
    {
      title: 'Guides',
      icon: BookOpen,
      items: [
        { label: 'Architecture Overview', to: '/docs/guides/architecture/overview' },
        { label: 'CI Integration', to: '/docs/guides/integrations/ci-integration' },
        { label: 'Security', to: '/docs/guides/security' },
        { label: 'Foundation', to: '/docs/guides/foundation' },
      ],
    },
    {
      title: 'Security & Compliance',
      icon: Shield,
      items: [
        { label: 'Security Guide', to: '/docs/guides/security' },
        { label: 'RBAC', to: '/docs/guides/security/rbac' },
        { label: 'Compliance', to: '/docs/reference/compliance' },
        {
          label: 'Data Processing Agreement',
          to: '/docs/reference/compliance/data-processing-agreement',
        },
      ],
    },
    {
      title: 'Architecture',
      icon: Settings,
      items: [
        { label: 'Architecture Overview', to: '/docs/guides/architecture/overview' },
        { label: 'Rate Limiting', to: '/docs/guides/architecture/rate-limiting' },
        { label: 'Idempotency', to: '/docs/guides/architecture/idempotency' },
        { label: 'Testing Strategy', to: '/docs/guides/architecture/testing' },
      ],
    },
    {
      title: 'API Reference',
      icon: Code,
      items: [
        { label: 'REST API', to: '/docs/api/rest-api' },
        { label: 'Authentication', to: '/docs/guides/foundation/authentication' },
        { label: 'API Gateway', to: '/docs/guides/foundation/api-gateway' },
      ],
    },
    {
      title: 'Foundation',
      icon: Database,
      items: [
        { label: 'Project Setup', to: '/docs/guides/foundation/project-setup' },
        { label: 'Database Schema', to: '/docs/guides/foundation/database-schema' },
        { label: 'CI/CD Pipeline', to: '/docs/guides/foundation/cicd-pipeline' },
        { label: 'Message Queue', to: '/docs/guides/foundation/message-queue' },
      ],
    },
    {
      title: 'Contributing',
      icon: GitBranch,
      items: [
        { label: 'Development Guide', to: '/docs/contributing/development' },
        { label: 'Documentation Standards', to: '/docs/contributing/documentation-standards' },
        { label: 'Code Standards', to: '/docs/contributing/code-standards' },
      ],
    },
    {
      title: 'Reference',
      icon: FileText,
      items: [
        { label: 'Architecture Decisions', to: '/docs/reference/adr' },
        { label: 'Compliance', to: '/docs/reference/compliance' },
        { label: 'Security Reference', to: '/docs/reference/security' },
      ],
    },
  ];

  return (
    <section className={styles.categories}>
      <div className="container">
        <div className={styles.categoriesGrid}>
          {categories.map((category, idx) => (
            <CategorySection key={idx} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - CI-Native Flaky Test Management`}
      description="Automatically detect, explain, and fix flaky tests—integrated directly into your CI/CD workflow. Production-ready, open-source platform for modern development teams."
    >
      <HomepageHeader />
      <main>
        <HomepageCategories />
      </main>
    </Layout>
  );
}
