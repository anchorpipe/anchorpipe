# Design System

This document describes the design system used in the anchorpipe documentation site.

## Overview

The documentation site uses a comprehensive design system built on HSL-based color tokens, a consistent typography scale, and standardized spacing and animation guidelines.

## Color System

The design system uses HSL (Hue, Saturation, Lightness) color format for better theming and dark mode support.

### Primary Colors

- **Primary Red**: `#D41818` (HSL: `0 85% 45%`) - Core brand color
- **Red Spectrum**: Light, base, dark, glow, and subtle variants
- **Surface Layers**: Multiple elevation levels for depth

### Dark Mode

All colors automatically adjust for dark mode with appropriate contrast ratios to meet WCAG AA standards.

## Typography

- **Sans-serif**: Inter (weights: 400, 500, 600, 700, 800)
- **Monospace**: JetBrains Mono (weights: 400, 500, 600)

Complete type scale from display (72px) down to xs (12px) with appropriate line heights and weights.

## Spacing

Base unit: 4px (0.25rem)

Tokens range from 0.5 (2px) to 24 (96px) for consistent spacing throughout the site.

## Border Radius

Standardized radius tokens from sm (8px) to full (pills/avatars).

## Animation

Keyframe animations and timing functions for smooth, accessible interactions. All animations respect `prefers-reduced-motion`.

## Implementation

The design system is implemented via CSS custom properties in `src/css/variables.css` and consumed throughout the site via `src/css/custom.css`.

For developers working on the documentation site, refer to the inline comments in `variables.css` for detailed token definitions and usage guidelines.

