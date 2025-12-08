import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';
import clsx from 'clsx';
import { Github, Menu, X } from 'lucide-react';
import ThemeToggle from '@site/src/components/ThemeToggle';
import Button from '@site/src/components/Button';
import styles from './styles.module.css';

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { label: 'Docs', href: '/docs/intro' },
  { label: 'Blog', href: '/blog' },
  { label: 'GitHub', href: 'https://github.com/anchorpipe/anchorpipe', external: true },
];

export default function Navbar(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  const handleNavClick = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  return (
    <nav className={clsx('navbar', styles.navbar, scrolled && styles.scrolled)}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo} aria-label="Anchorpipe home">
          <div className={styles.logoMark}>⚓</div>
          <span className={styles.logoText}>{siteConfig.title}</span>
        </Link>

        <div className={styles.desktopNav}>
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.navLink}
              >
                {link.label}
                <Github className={styles.externalIcon} aria-hidden />
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className={clsx(
                  styles.navLink,
                  location.pathname.startsWith(link.href) && styles.active
                )}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        <div className={styles.desktopActions}>
          <ThemeToggle />
          <Link to="/docs/getting-started/quick-start" className={styles.ctaLink}>
            <Button variant="default" size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className={styles.mobileToggle}
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          {isOpen ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>

      <div
        id="mobile-menu"
        className={clsx(styles.mobileMenu, isOpen && styles.mobileMenuOpen)}
        aria-hidden={!isOpen}
      >
        <div className={styles.mobileMenuInner}>
          <div className={styles.mobileNav}>
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mobileNavLink}
                  onClick={handleNavClick}
                >
                  {link.label}
                  <Github className={styles.externalIcon} aria-hidden />
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className={clsx(
                    styles.mobileNavLink,
                    location.pathname.startsWith(link.href) && styles.active
                  )}
                  onClick={handleNavClick}
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          <div className={styles.mobileActions}>
            <ThemeToggle />
            <Link
              to="/docs/getting-started/quick-start"
              className={styles.ctaLink}
              onClick={handleNavClick}
            >
              <Button variant="default" size="default">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
