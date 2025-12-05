# Color Migration

This document describes the color migration from blue to red in the anchorpipe documentation site.

## Overview

The documentation site has been migrated from a blue color scheme (#0066CC) to a red-based palette (#D41818) to align with the anchorpipe brand identity and create a unique visual presence.

## Color Palette

### Primary Color (Red)

- **Light Mode**: `#D41818` (HSL: `0 85% 45%`)
- **Dark Mode**: `#E83C3C` (HSL: `0 85% 55%`)

### Red Spectrum

The design system includes a complete red spectrum:

- **Red Light**: `#E85C5C` (HSL: `0 85% 60%`) - Light mode
- **Red Base**: `#D41818` (HSL: `0 85% 45%`) - Light mode primary
- **Red Dark**: `#982020` (HSL: `0 70% 35%`) - Darker variant
- **Red Glow**: `#FF0000` (HSL: `0 100% 50%`) - Accent glow
- **Red Subtle**: `#F2E3E3` (HSL: `0 30% 90%`) - Subtle backgrounds

### Dark Mode Adjustments

In dark mode, red colors are adjusted for better visibility:

- **Primary**: `#E83C3C` (HSL: `0 85% 55%`)
- **Red Light**: `#EE7070` (HSL: `0 85% 65%`)
- **Red Dark**: `#AD2626` (HSL: `0 70% 40%`)

## Migration Details

### Files Updated

1. **CSS Variables** (`variables.css`)
   - Primary color set to red HSL values
   - Red spectrum variables defined
   - Dark mode adjustments included

2. **Custom CSS** (`custom.css`)
   - Docusaurus color variables mapped to red
   - All `--ifm-color-primary` variants use red
   - Button hover shadows updated to use red

3. **Homepage Styles** (`index.module.css`)
   - Background gradients updated to red
   - Button shadows and hover effects use red
   - Feature card and category icon backgrounds use red
   - All `rgba(0, 102, 204, ...)` replaced with `hsl(var(--primary) / ...)`

4. **SVG Assets**
   - `logo.svg`: Updated fill color from `#0066CC` to `#D41818`
   - `favicon.svg`: Updated fill color from `#0066CC` to `#D41818`

## Color Usage

### Using Design System Variables

Always use design system variables instead of hard-coded colors:

```css
/* ✅ Good - Uses design system variable */
color: hsl(var(--primary));
background: hsl(var(--primary) / 0.1);
box-shadow: 0 2px 8px hsl(var(--primary) / 0.2);

/* ❌ Bad - Hard-coded color */
color: #d41818;
background: rgba(212, 24, 24, 0.1);
box-shadow: 0 2px 8px rgba(212, 24, 24, 0.2);
```

### Opacity with HSL

When using opacity, use the HSL format with alpha:

```css
/* ✅ Good - HSL with alpha */
background: hsl(var(--primary) / 0.1);
box-shadow: 0 2px 8px hsl(var(--primary) / 0.2);

/* ❌ Bad - RGBA with hard-coded color */
background: rgba(212, 24, 24, 0.1);
box-shadow: 0 2px 8px rgba(212, 24, 24, 0.2);
```

## Accessibility

All color combinations meet WCAG AA contrast requirements:

- **Normal Text**: 4.5:1 contrast ratio minimum
- **Large Text**: 3:1 contrast ratio minimum

The red primary color has been tested against both light and dark backgrounds to ensure readability.

## Testing

After migration, verify:

- [ ] No blue color references remain (`#0066CC`, `rgb(0, 102, 204)`, etc.)
- [ ] All colors use design system variables
- [ ] Colors work correctly in both light and dark modes
- [ ] Contrast ratios meet WCAG AA standards
- [ ] SVG assets display correctly with red colors
- [ ] All interactive elements (buttons, links, hover states) use red

## Related Documentation

- [Design System](/docs/contributing/design-system) - Complete design system documentation
- [Typography System](/docs/contributing/typography-system) - Typography guidelines
