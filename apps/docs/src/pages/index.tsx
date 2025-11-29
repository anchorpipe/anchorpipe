import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

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
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started/installation"
            >
              Get Started →
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/intro">
              Learn More
            </Link>
          </div>
          <div className={styles.badges}>
            <span className={styles.badge}>🔒 Production-Ready</span>
            <span className={styles.badge}>🚀 CI-Native</span>
            <span className={styles.badge}>📊 ML-Powered</span>
            <span className={styles.badge}>🔓 Open Source</span>
          </div>
        </div>
      </div>
      <div className={styles.heroGradient}></div>
    </header>
  );
}

function FeatureCard({
  title,
  description,
  icon,
  link,
}: {
  title: string;
  description: string;
  icon: string;
  link: string;
}) {
  return (
    <Link to={link} className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
      <span className={styles.featureLink}>Learn more →</span>
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
            icon="🔌"
            link="/docs/guides/integrations/ci-integration"
          />
          <FeatureCard
            title="Intelligent Detection"
            description="ML-powered algorithms identify flaky patterns automatically, reducing false positives."
            icon="🎯"
            link="/docs/guides/architecture/overview"
          />
          <FeatureCard
            title="Production-Ready Security"
            description="Enterprise-grade security with OAuth 2.0, RBAC, rate limiting, and comprehensive audit logging."
            icon="🔒"
            link="/docs/guides/security"
          />
          <FeatureCard
            title="Compliance & Privacy"
            description="GDPR/CCPA compliant with data processing agreements, DSR workflows, and retention policies."
            icon="📊"
            link="/docs/reference/compliance"
          />
          <FeatureCard
            title="Actionable Insights"
            description="Get clear explanations of why tests are flaky and step-by-step remediation guides."
            icon="💡"
            link="/docs/getting-started/quick-start"
          />
          <FeatureCard
            title="Developer-First"
            description="Designed for developers, by developers. Fast, transparent, and easy to use."
            icon="🚀"
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
          <h2 className={styles.sectionTitle}>Get Started in Minutes</h2>
          <p className={styles.sectionSubtitle}>
            Start detecting and managing flaky tests in your CI/CD pipeline today
          </p>
          <div className={styles.quickStartSteps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3>Install anchorpipe</h3>
                <p>Set up in your environment with Docker Compose</p>
                <Link to="/docs/getting-started/installation" className={styles.stepLink}>
                  Installation Guide →
                </Link>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3>Configure CI Integration</h3>
                <p>Integrate with your existing CI/CD pipeline</p>
                <Link to="/docs/guides/integrations/ci-integration" className={styles.stepLink}>
                  Integration Guide →
                </Link>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3>Start Detecting Flakes</h3>
                <p>Run your first detection and see results</p>
                <Link to="/docs/getting-started/quick-start" className={styles.stepLink}>
                  Quick Start →
                </Link>
              </div>
            </div>
          </div>
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
      </main>
    </Layout>
  );
}
