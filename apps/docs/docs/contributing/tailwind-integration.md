# Tailwind CSS Integration

This document describes the Tailwind CSS integration in the anchorpipe documentation site.

## Overview

The documentation site uses Tailwind CSS v4 with design system tokens, enabling utility-first styling that matches our design system while avoiding conflicts with Docusaurus's existing styles.

## Configuration

Tailwind is configured in `tailwind.config.js` with:

- **Design System Colors**: All colors mapped to HSL design system variables
- **Spacing**: 4px base unit system tokens
- **Typography**: Inter (sans) and JetBrains Mono (mono) fonts
- **Border Radius**: Design system radius tokens
- **Animations**: Keyframes and timing functions from design system
- **Preflight Disabled**: To avoid conflicts with Docusaurus styles

## Dark Mode

Dark mode is configured to work with Docusaurus's `[data-theme='dark']` attribute, automatically switching colors based on the theme.

## Usage

Use Tailwind utility classes in components:

```tsx
<div className="bg-primary text-primary-foreground p-4 rounded-lg">
  Content with design system colors
</div>
```

All design system tokens are available as Tailwind utilities. Refer to `tailwind.config.js` for the complete list of available utilities.
