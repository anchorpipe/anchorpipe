import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

// Type declaration for custom-scrollbar web component
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'custom-scrollbar': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          className?: string;
        },
        HTMLElement
      >;
    }
  }
}
import Link from '@docusaurus/Link';
import { useLocation } from '@docusaurus/router';
import type { PropSidebarItem, PropSidebarItemCategory } from '@docusaurus/plugin-content-docs';
// @ts-expect-error: No type declarations for @theme/DocSidebar in local build, skip strict import
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
import { ensureCustomScrollbar } from '@site/src/components/customScrollbar';
import styles from './styles.module.css';

const STORAGE_KEY = 'docsSidebarOpenSections';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'Getting Started': Rocket,
  Guides: Book,
  'API Reference': Code2,
  Security: Shield,
  Contributing: Users,
};

const isCategory = (item: PropSidebarItem | undefined | null): item is PropSidebarItemCategory =>
  Boolean(item && 'type' in item && item.type === 'category');

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
  (category.items ?? []).some((child) => {
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

const useIntroHref = (sidebar: PropSidebarItem[]): string =>
  useMemo(() => {
    const introItem =
      sidebar.find((item) => !isCategory(item) && 'docId' in item && item.docId === 'intro') ??
      sidebar.find((item) => !isCategory(item) && 'href' in item && item.href);

    if (introItem) {
      const href = getItemHref(introItem);
      if (href) return href;
    }

    return '/docs/intro';
  }, [sidebar]);

const useActiveCategory = (
  sections: PropSidebarItemCategory[],
  activePath: string
): string | null =>
  useMemo(() => {
    for (const category of sections) {
      if (categoryHasActivePath(category, activePath)) {
        return category.label;
      }
    }
    return null;
  }, [activePath, sections]);

function useOpenSections(
  sections: PropSidebarItemCategory[],
  activeCategory: string | null
): {
  openSections: string[];
  toggleSection: (label: string) => void;
} {
  const [openSections, setOpenSections] = useState<string[]>(() => {
    const stored = getStoredSections();
    if (stored.length) {
      return stored;
    }

    if (activeCategory) {
      return [activeCategory];
    }

    const defaultOpen = sections.find((section) => section.label === 'Getting Started');
    return defaultOpen ? [defaultOpen.label] : [];
  });

  useEffect(() => {
    if (activeCategory) {
      setOpenSections([activeCategory]);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
  }, [openSections]);

  const toggleSection = React.useCallback(
    (label: string) => {
      setOpenSections((prev) => {
        if (prev.includes(label)) {
          if (label === activeCategory) {
            return [label];
          }
          return activeCategory ? [activeCategory] : [label];
        }
        return [label];
      });
    },
    [activeCategory]
  );

  return { openSections, toggleSection };
}

const useSmoothScrollToActive = (
  navRef: React.RefObject<HTMLDivElement>,
  activePath: string
): void => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const navEl = navRef.current;
      if (!navEl) return;
      const activeEl = navEl.querySelector('[data-active="true"]') as HTMLElement | null;
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [activePath, navRef]);
};

function SectionItems({
  items,
  activePath,
  parentKey,
}: {
  items: PropSidebarItem[] | undefined;
  activePath: string;
  parentKey: string;
}): React.ReactElement {
  const [openChildKey, setOpenChildKey] = useState<string | null>(null);

  useEffect(() => {
    const indexedItems = (items ?? []).map((child, idx) => ({ child, idx }));
    const activeChildEntry = indexedItems.find(
      ({ child }) => isCategory(child) && categoryHasActivePath(child, activePath)
    );

    if (activeChildEntry && isCategory(activeChildEntry.child)) {
      const activeKey = `${parentKey}-${activeChildEntry.idx}-${activeChildEntry.child.label ?? 'item'}`;
      if (activeKey !== openChildKey) {
        setOpenChildKey(activeKey);
      }
    }
    // Only react to route/item changes; keep manual toggles intact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, activePath, parentKey]);

  return (
    <div className={styles.sectionItemsInner}>
      {(items ?? []).map((item, idx) =>
        renderSectionItem({
          item,
          idx,
          parentKey,
          activePath,
          openChildKey,
          setOpenChildKey,
        })
      )}
    </div>
  );
}

function NestedCategory({
  item,
  itemKey,
  childActive,
  isChildOpen,
  activePath,
  setOpenChildKey,
}: {
  item: PropSidebarItemCategory;
  itemKey: string;
  childActive: boolean;
  isChildOpen: boolean;
  activePath: string;
  setOpenChildKey: React.Dispatch<React.SetStateAction<string | null>>;
}): React.ReactElement {
  const childId = `${itemKey}-child`;
  const nestedLabel = item.label ?? 'Section';

  return (
    <div className={styles.nestedCategory}>
      <button
        type="button"
        className={clsx(
          styles.sectionButton,
          styles.nestedSectionButton,
          (childActive || isChildOpen) && styles.sectionButtonActive
        )}
        onClick={() => setOpenChildKey(isChildOpen ? null : itemKey)}
        aria-expanded={isChildOpen}
        aria-controls={childId}
      >
        <span className={styles.sectionLabel}>
          <span className={styles.nestedCategoryLabel}>{nestedLabel}</span>
        </span>
        <ChevronRight className={clsx(styles.chevron, isChildOpen && styles.chevronOpen)} />
      </button>

      <div
        id={childId}
        className={clsx(styles.sectionItems, isChildOpen && styles.sectionItemsExpanded)}
        role="group"
        aria-label={`${item.label} links`}
      >
        <SectionItems
          items={item.items}
          activePath={activePath}
          parentKey={`${itemKey}-${item.label}`}
        />
      </div>
    </div>
  );
}

function SectionLinkItem({
  itemKey,
  href,
  isActive,
  itemLabel,
}: {
  itemKey: string;
  href: string;
  isActive: boolean;
  itemLabel: string;
}): React.ReactElement {
  return (
    <Link
      key={itemKey}
      to={href}
      className={clsx(styles.sectionItem, isActive && styles.itemActive)}
      data-active={isActive ? 'true' : undefined}
    >
      {itemLabel}
    </Link>
  );
}

function renderSectionItem({
  item,
  idx,
  parentKey,
  activePath,
  openChildKey,
  setOpenChildKey,
}: {
  item: PropSidebarItem | undefined;
  idx: number;
  parentKey: string;
  activePath: string;
  openChildKey: string | null;
  setOpenChildKey: React.Dispatch<React.SetStateAction<string | null>>;
}): React.ReactElement | null {
  if (!item || !('type' in item)) {
    return null;
  }

  const itemKey = `${parentKey}-${idx}-${'label' in item ? item.label : 'item'}`;

  if (isCategory(item)) {
    const children = item.items ?? [];
    if (children.length === 0) {
      return null;
    }

    const childActive = categoryHasActivePath(item, activePath);
    const isChildOpen = openChildKey === itemKey || childActive;

    return (
      <NestedCategory
        key={itemKey}
        item={item}
        itemKey={itemKey}
        childActive={childActive}
        isChildOpen={isChildOpen}
        activePath={activePath}
        setOpenChildKey={setOpenChildKey}
      />
    );
  }

  const href = getItemHref(item);
  if (!href) {
    return null;
  }

  const isActive = activePath.startsWith(href);
  const itemLabel = 'label' in item ? item.label : '';

  return (
    <SectionLinkItem
      key={itemKey}
      itemKey={itemKey}
      href={href}
      isActive={isActive}
      itemLabel={itemLabel}
    />
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
}): React.ReactElement {
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

export default function DocSidebar({ sidebar }: DocSidebarProps): React.ReactElement {
  const location = useLocation();
  const activePath = location.pathname;
  const navRef = useRef<HTMLDivElement | null>(null);

  const sections = useMemo(
    () => (sidebar.filter(isCategory) as PropSidebarItemCategory[]) ?? [],
    [sidebar]
  );

  const introHref = useIntroHref(sidebar);
  const activeCategory = useActiveCategory(sections, activePath);
  const { openSections, toggleSection } = useOpenSections(sections, activeCategory);

  useEffect(() => {
    ensureCustomScrollbar();
  }, []);

  useSmoothScrollToActive(navRef, activePath);

  // Filter sections based on search query
  return (
    <aside className={styles.sidebar} aria-label="Documentation navigation">
      {/* Scrollable Navigation */}
      {React.createElement(
        'custom-scrollbar',
        { className: styles.customScrollbar },
        <div className={styles.navWrapper}>
          <nav className={styles.nav} ref={navRef}>
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
        </div>
      )}

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
