# Custom Navbar Component

## Overview

The custom Navbar replaces the default Docusaurus navbar to deliver scroll effects, a polished desktop layout, and a smooth mobile menu. It integrates design system tokens, the ThemeToggle, and a primary CTA.

## Features

- Scroll effects: sticky, background opacity increase, shadow on scroll > 20px
- Desktop layout: logo, nav links (Docs, Blog, GitHub), ThemeToggle, “Get Started” CTA
- Mobile menu: hamburger toggle, slide-down overlay with blur, close on selection/Escape
- Active link highlighting and external link handling
- Accessible: keyboard focus, aria-expanded/controls, Escape closes menu

## Usage

The component overrides Docusaurus in `src/theme/Navbar`. No imports are required elsewhere—Docusaurus automatically picks it up.

## Implementation Details

- Path: `apps/docs/src/theme/Navbar/index.tsx`
- Styling: `apps/docs/src/theme/Navbar/styles.module.css`
- Dependencies: `ThemeToggle`, `Button`, Lucide icons (Menu, X, Github), Docusaurus Link/location

## Behavior

- Scroll past 20px → navbar background opacity increases and shadow appears.
- Mobile: hamburger toggles overlay; selecting a link or pressing Escape closes it.
- External GitHub link opens in a new tab; active link highlighted via pathname match.

## Design Tokens

- Background/surfaces: `--background`, `--surface-1`, `--surface-2`
- Border/shadow: `--border`, shadow with primary tint
- Typography/color: `--foreground`, `--muted-foreground`, `--primary`
- Radius/spacing: design-system radii; responsive gaps/padding
- Easing: `--ease-smooth`

## Testing

- Scroll page → background/blur/shadow update at >20px.
- Desktop links → navigate; active link highlights; GitHub opens new tab.
- Mobile → open menu, click links and CTA; menu closes; Escape closes menu.
- Keyboard → Tab through controls; Enter/Space activate; focus ring visible.
- Theme toggle → switches modes; CTA “Get Started” links to `/docs/quick-start`.
