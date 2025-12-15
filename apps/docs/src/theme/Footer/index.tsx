import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

type FooterLink = {
  label: string;
  to?: string;
  href?: string;
};

type FooterColumn = {
  title: string;
  items: FooterLink[];
};

const columns: FooterColumn[] = [
  {
    title: 'Product',
    items: [
      { label: 'Features', to: '/#features' },
      { label: 'How It Works', to: '/#how-it-works' },
      { label: 'Integrations', to: '/#integrations' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Documentation', to: '/docs' },
      { label: 'Blog', to: '/blog' },
      { label: 'Changelog', href: 'https://github.com/anchorpipe/anchorpipe/releases' },
    ],
  },
  {
    title: 'Community',
    items: [
      { label: 'GitHub', href: 'https://github.com/anchorpipe/anchorpipe' },
      { label: 'Discord', href: 'https://discord.gg/anchorpipe' },
      { label: 'Twitter', href: 'https://twitter.com/anchorpipe' },
    ],
  },
];

const FooterLinkItem = ({ label, to, href }: FooterLink): React.ReactElement => {
  const isExternal = Boolean(href);
  const linkProps = isExternal ? { href, target: '_blank', rel: 'noreferrer' } : { to };

  return (
    <Link className={styles.link} {...linkProps}>
      {label}
    </Link>
  );
};

export default function Footer(): React.ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} aria-labelledby="footer-heading">
      <div className={styles.inner}>
        <div className={styles.columns} role="navigation" aria-label="Footer navigation">
          <h2 id="footer-heading" className={styles.srOnly}>
            Footer
          </h2>
          {columns.map((column) => (
            <div key={column.title} className={styles.column}>
              <h3 className={styles.columnTitle}>{column.title}</h3>
              <ul className={styles.list}>
                {column.items.map((item) => (
                  <li key={item.label} className={styles.listItem}>
                    <FooterLinkItem {...item} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.bottomRow}>
          <span className={styles.brand}>Anchorpipe</span>
          <span className={styles.copyright}>© {year} Anchorpipe. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
