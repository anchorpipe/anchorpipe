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
  FileText,
  ArrowRight,
  Zap,
  Target,
  Lock,
  BarChart3,
  Lightbulb,
  CheckCircle,
} from 'lucide-react';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <p className={styles.heroDescription}>
            Automatically detect, explain, and fix flaky tests—integrated directly into your CI/CD
            workflow. Restore developer velocity and release confidence across teams of all sizes.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started/installation"
            >
              Get Started
              <ArrowRight size={18} className={styles.buttonIcon} />
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/intro">
              Learn More
            </Link>
          </div>
          <div className={styles.heroBadges}>
            <div className={styles.badge}>
              <Lock size={16} />
              <span>Production-Ready</span>
            </div>
            <div className={styles.badge}>
              <Zap size={16} />
              <span>CI-Native</span>
            </div>
            <div className={styles.badge}>
              <Shield size={16} />
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  link: string;
}

function FeatureCard({ title, description, icon: Icon, link }: FeatureCardProps) {
  return (
    <Link to={link} className={styles.featureCard}>
      <div className={styles.featureIconContainer}>
        <Icon size={24} className={styles.featureIcon} />
      </div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
      <span className={styles.featureLink}>
        Learn more
        <ArrowRight size={14} className={styles.featureLinkIcon} />
      </span>
    </Link>
  );
}

function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresHeader}>
          <h2 className={styles.sectionTitle}>Why anchorpipe?</h2>
          <p className={styles.sectionSubtitle}>
            Everything you need to manage flaky tests, built for modern development teams
          </p>
        </div>
        <div className={styles.featuresGrid}>
          <FeatureCard
            title="Universal CI Integration"
            description="Works with GitHub Actions, GitLab CI, CircleCI, Jenkins, and more. No migration required."
            icon={Zap}
            link="/docs/guides/integrations/ci-integration"
          />
          <FeatureCard
            title="Intelligent Detection"
            description="ML-powered algorithms identify flaky patterns automatically, reducing false positives."
            icon={Target}
            link="/docs/guides/architecture/overview"
          />
          <FeatureCard
            title="Production-Ready Security"
            description="Enterprise-grade security with OAuth 2.0, RBAC, rate limiting, and comprehensive audit logging."
            icon={Shield}
            link="/docs/guides/security"
          />
          <FeatureCard
            title="Compliance & Privacy"
            description="GDPR/CCPA compliant with data processing agreements, DSR workflows, and retention policies."
            icon={BarChart3}
            link="/docs/reference/compliance"
          />
          <FeatureCard
            title="Actionable Insights"
            description="Get clear explanations of why tests are flaky and step-by-step remediation guides."
            icon={Lightbulb}
            link="/docs/getting-started/quick-start"
          />
          <FeatureCard
            title="Developer-First"
            description="Designed for developers, by developers. Fast, transparent, and easy to use."
            icon={Rocket}
            link="/docs/contributing/development"
          />
        </div>
      </div>
    </section>
  );
}

function QuickStartSection(): ReactNode {
  return (
    <section className={styles.quickStart}>
      <div className="container">
        <div className={styles.quickStartContent}>
          <div className={styles.quickStartHeader}>
            <h2 className={styles.sectionTitle}>Get Started in Minutes</h2>
            <p className={styles.sectionSubtitle}>
              Start detecting and managing flaky tests in your CI/CD pipeline today
            </p>
          </div>
          <div className={styles.quickStartSteps}>
            <div className={styles.step}>
              <div className={styles.stepNumberContainer}>
                <div className={styles.stepNumber}>
                  <CheckCircle size={20} />
                </div>
                <div className={styles.stepConnector}></div>
              </div>
              <div className={styles.stepContent}>
                <h3>Install anchorpipe</h3>
                <p>Set up in your environment with Docker Compose</p>
                <div className={styles.codeBlock}>
                  <code>docker-compose up -d</code>
                </div>
                <Link to="/docs/getting-started/installation" className={styles.stepLink}>
                  Installation Guide
                  <ArrowRight size={14} className={styles.stepLinkIcon} />
                </Link>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumberContainer}>
                <div className={styles.stepNumber}>
                  <CheckCircle size={20} />
                </div>
                <div className={styles.stepConnector}></div>
              </div>
              <div className={styles.stepContent}>
                <h3>Configure CI Integration</h3>
                <p>Integrate with your existing CI/CD pipeline</p>
                <div className={styles.codeBlock}>
                  <code>export ANCHORPIPE_API_KEY=&quot;your-api-key&quot;</code>
                </div>
                <Link to="/docs/guides/integrations/ci-integration" className={styles.stepLink}>
                  Integration Guide
                  <ArrowRight size={14} className={styles.stepLinkIcon} />
                </Link>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumberContainer}>
                <div className={styles.stepNumber}>
                  <CheckCircle size={20} />
                </div>
              </div>
              <div className={styles.stepContent}>
                <h3>Start Detecting Flakes</h3>
                <p>Run your first detection and see results</p>
                <div className={styles.codeBlock}>
                  <code>anchorpipe detect --ci github-actions</code>
                </div>
                <Link to="/docs/getting-started/quick-start" className={styles.stepLink}>
                  Quick Start
                  <ArrowRight size={14} className={styles.stepLinkIcon} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
        <div className={styles.categoriesHeader}>
          <h2 className={styles.sectionTitle}>Explore Documentation</h2>
          <p className={styles.sectionSubtitle}>
            Browse our comprehensive documentation by category
          </p>
        </div>
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
        <HomepageFeatures />
        <QuickStartSection />
        <HomepageCategories />
      </main>
    </Layout>
  );
}
