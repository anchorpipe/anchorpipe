import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import type { PropSidebarItem, PropSidebarItemCategory } from '@docusaurus/plugin-content-docs';
import type { Props as DocSidebarProps } from '@theme/DocSidebar';
import {
  Book,
  ChevronRight,
  Code2,
  FileText,
  HelpCircle,
  Rocket,
  Shield,
  Users,
} from 'lucide-react';
import styles from './styles.module.css';

const STORAGE_KEY = 'docsSidebarOpenSections';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Getting Started': Rocket,
  Guides: Book,
  'API Reference': Code2,
  Security: Shield,
  Contributing: Users,
};

const isCategory = (item: PropSidebarItem): item is PropSidebarItemCategory =>
  item.type === 'category';

const getItemHref = (item: PropSidebarItem): string | undefined => {
  if ('href' in item && item.href) {
    return item.href;
  }

  if ('docId' in item && item.docId) {
    return `/docs/${item.docId}`;
  }

  return undefined;
};

const categoryHasActivePath = (category: PropSidebarItemCategory, pathname: string): boolean =>
  category.items.some((child) => {
    if (isCategory(child)) {
      return categoryHasActivePath(child, pathname);
    }
    const href = getItemHref(child);
    return Boolean(href && pathname.startsWith(href));
  });

const getStoredSections = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
};

function SectionItems({
  items,
  activePath,
  parentKey,
}: {
  items: PropSidebarItem[];
  activePath: string;
  parentKey: string;
}) {
  return (
    <div className={styles.sectionItemsInner}>
      {items.map((item, idx) => {
        const itemKey = `${parentKey}-${idx}-${'label' in item ? item.label : 'item'}`;
        if (isCategory(item)) {
          return (
            <div key={itemKey} className={styles.nestedCategory}>
              <div className={styles.nestedCategoryLabel}>{item.label}</div>
              <SectionItems
                items={item.items}
                activePath={activePath}
                parentKey={`${itemKey}-${item.label}`}
              />
            </div>
          );
        }

        const href = getItemHref(item);
        if (!href) {
          return null;
        }

        const isActive = activePath.startsWith(href);

        return (
          <Link
            key={itemKey}
            to={href}
            className={clsx(styles.sectionItem, isActive && styles.itemActive)}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function NavSection({
  item,
  isOpen,
  onToggle,
  activePath,
}: {
  item: PropSidebarItemCategory;
  isOpen: boolean;
  onToggle: () => void;
  activePath: string;
}) {
  const Icon = iconMap[item.label] || FileText;
  const isActive = categoryHasActivePath(item, activePath) || isOpen;
  const sectionId = `sidebar-section-${item.label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={styles.section}>
      <button
        type="button"
        onClick={onToggle}
        className={clsx(styles.sectionButton, isActive && styles.sectionButtonActive)}
        aria-expanded={isOpen}
        aria-controls={sectionId}
      >
        <span className={styles.sectionLabel}>
          <Icon className={styles.sectionIcon} />
          <span>{item.label}</span>
        </span>
        <ChevronRight className={clsx(styles.chevron, isOpen && styles.chevronOpen)} />
      </button>

      <div
        id={sectionId}
        className={clsx(styles.sectionItems, isOpen && styles.sectionItemsExpanded)}
        role="group"
        aria-label={`${item.label} links`}
      >
        <SectionItems items={item.items} activePath={activePath} parentKey={item.label} />
      </div>
    </div>
  );
}

export default function DocSidebar({ sidebar }: DocSidebarProps): JSX.Element {
  const location = useLocation();
  const activePath = location.pathname;

  const sections = useMemo(
    () => sidebar.filter(isCategory) as PropSidebarItemCategory[],
    [sidebar],
  );

  const [openSections, setOpenSections] = useState<string[]>(() => {
    const stored = getStoredSections();
    if (stored.length) {
      return stored;
    }

    const defaultOpen = sections.find((section) => section.label === 'Getting Started');
    return defaultOpen ? [defaultOpen.label] : [];
  });

  useEffect(() => {
    const activeLabels = sections
      .filter((section) => categoryHasActivePath(section, activePath))
      .map((section) => section.label);

    if (activeLabels.length) {
      setOpenSections(activeLabels);
    }
  }, [activePath, sections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  const toggleSection = (label: string) => {
    setOpenSections((prev) => (prev.includes(label) ? [] : [label]));
  };

  const introHref = useMemo(() => {
    let introItem = sidebar.find(
      (item) => !isCategory(item) && 'docId' in item && item.docId === 'intro',
    );

    if (!introItem) {
      introItem = sidebar.find((item) => !isCategory(item) && 'href' in item && item.href);
    }

    if (introItem) {
      const href = getItemHref(introItem);
      if (href) return href;
    }

    return '/docs/intro';
  }, [sidebar]);

  return (
    <aside className={styles.sidebar} aria-label="Documentation navigation">
      <nav className={styles.nav}>
        <Link
          to={introHref}
          className={clsx(styles.introLink, activePath === introHref && styles.introActive)}
        >
          <FileText className={styles.introIcon} />
          <span>Introduction</span>
        </Link>

        <div className={styles.divider} role="presentation">
          <span>Documentation</span>
        </div>

        {sections.map((item) => (
          <NavSection
            key={item.label}
            item={item}
            activePath={activePath}
            isOpen={openSections.includes(item.label)}
            onToggle={() => toggleSection(item.label)}
          />
        ))}
      </nav>

      <div className={styles.helpSection}>
        <div className={styles.helpLabel}>
          <HelpCircle className={styles.helpIcon} />
          <span>Need help?</span>
        </div>
        <a
          href="https://github.com/anchorpipe/anchorpipe/issues"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.helpLink}
        >
          Open an issue →
        </a>
      </div>
    </aside>
  );
}

