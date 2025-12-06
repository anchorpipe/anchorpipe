# FeatureCard Component

This document describes the FeatureCard component used in the anchorpipe documentation site.

## Overview

The FeatureCard component is a reusable card for displaying features with icons, titles, and descriptions, following the design system specifications with smooth hover effects.

## Features

- **Icon display** with styled wrapper and background
- **Title** with h3 styling
- **Description** with proper line height
- **Hover effects** including lift, border color change, background change, and icon scaling
- **Responsive design** for mobile devices

## Usage

### Basic Usage

```tsx
import FeatureCard from '@site/src/components/FeatureCard';
import { Zap } from 'lucide-react';

<FeatureCard
  icon={Zap}
  title="Fast Performance"
  description="Lightning-fast performance with optimized algorithms"
/>
```

### With Custom Class

```tsx
<FeatureCard
  icon={Shield}
  title="Secure"
  description="Enterprise-grade security"
  className="custom-class"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `LucideIcon` | **required** | Lucide React icon component |
| `title` | `string` | **required** | Feature title |
| `description` | `string` | **required** | Feature description |
| `accent` | `string` | `'primary'` | Accent color (currently unused, reserved for future use) |
| `className` | `string` | `undefined` | Additional CSS class names |

## Styling

### Card

- **Padding**: 2rem (1.5rem on mobile)
- **Border Radius**: 1.25rem
- **Background**: Surface-1 with 0.8 opacity
- **Border**: Subtle border with 0.4 opacity

### Icon Wrapper

- **Size**: 3rem × 3rem (2.5rem on mobile)
- **Border Radius**: 0.875rem
- **Background**: Primary color with 0.1 opacity
- **Icon Size**: 1.5rem × 1.5rem (1.25rem on mobile)

### Typography

- **Title**: 1.25rem (1.125rem on mobile), 600 weight, foreground color
- **Description**: 0.9375rem (0.875rem on mobile), muted foreground color, 1.6 line height

## Hover Effects

On hover, the FeatureCard has several smooth animations:

1. **Lift Effect**: Card translates up by 4px (`translateY(-4px)`)
2. **Border Color**: Changes to primary color with 0.3 opacity
3. **Background**: Changes to surface-2 with 0.8 opacity
4. **Icon Wrapper**: Scales to 1.05x
5. **Box Shadow**: Appears with primary glow effect

All transitions use:
- **Card**: 0.5s cubic-bezier(0.4, 0, 0.2, 1)
- **Icon Wrapper**: 0.3s ease

## Accessibility

The FeatureCard component is accessible:

- **Semantic HTML**: Uses proper heading (h3) and paragraph elements
- **Color Contrast**: Meets WCAG AA requirements
- **Readable Text**: Proper font sizes and line heights
- **Visual Hierarchy**: Clear distinction between title and description

## Design System Integration

The FeatureCard component uses design system tokens:

- **Colors**: `--surface-1`, `--surface-2`, `--border`, `--primary`, `--foreground`, `--muted-foreground`
- **Typography**: `--font-sans` for all text
- **Spacing**: Uses design system spacing scale
- **Border Radius**: Uses design system radius values
- **Transitions**: Uses design system timing functions

## Examples

### Multiple Feature Cards

```tsx
import FeatureCard from '@site/src/components/FeatureCard';
import { Zap, Shield, Rocket } from 'lucide-react';

<div className="features-grid">
  <FeatureCard
    icon={Zap}
    title="Fast"
    description="Lightning-fast performance"
  />
  <FeatureCard
    icon={Shield}
    title="Secure"
    description="Enterprise-grade security"
  />
  <FeatureCard
    icon={Rocket}
    title="Scalable"
    description="Grows with your needs"
  />
</div>
```

## Responsive Design

The FeatureCard component is responsive:

- **Desktop**: Full padding (2rem), larger icons (3rem)
- **Mobile**: Reduced padding (1.5rem), smaller icons (2.5rem)
- **Typography**: Scales down appropriately on mobile

## Related Documentation

- [Design System](/docs/contributing/design-system) - Complete design system documentation
- [Button Component](/docs/contributing/button-component) - Button component documentation

