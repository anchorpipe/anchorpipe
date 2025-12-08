# Custom Sidebar Component

This document covers the custom Sidebar implementation that replaces the default Docusaurus DocSidebar. The component delivers collapsible sections, iconography, and a help area while adhering to the design system.

## Overview

- Built in `apps/docs/src/theme/DocSidebar/`
- Collapsible sections with smooth transitions and state persistence
- Lucide icons mapped per section (e.g., Rocket for Getting Started)
- Introduction link pinned at the top
- Help section pinned at the bottom
- Active state highlighting for the current page and section
- Accessible controls (keyboard, ARIA) and responsive layout

## Files

- `apps/docs/src/theme/DocSidebar/index.tsx` — component logic and state
- `apps/docs/src/theme/DocSidebar/styles.module.css` — design system-driven styles

## Features

- **Collapsible sections:** Toggle headers rotate chevrons; expanded state persists across navigation via local storage and ensures the active section stays open.
- **Icon mapping:** Section labels map to Lucide icons (Rocket, Book, Code2, Shield, Users; fallback to FileText).
- **Active highlighting:** Current page and its parent section display primary-accent colors.
- **Help section:** “Need help?” block linking to GitHub issues.
- **Responsive:** Sticky on desktop; flows inline on mobile.
- **Accessibility:** Keyboard-operable buttons with `aria-expanded`/`aria-controls`, focus rings, and semantic nav structure.

## Usage

The sidebar automatically consumes the generated docs sidebar data (`apps/docs/sidebars.ts`). No manual wiring is needed—top-level categories render as collapsible sections and their nested items appear within.

## Testing

- `npm run lint` — lint and type checks
- `npm run build` — ensure Docusaurus build succeeds and sidebar renders

