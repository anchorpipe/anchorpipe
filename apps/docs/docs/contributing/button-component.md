# Button Component

This document describes the Button component used in the anchorpipe documentation site.

## Overview

The Button component is a reusable, accessible button with multiple variants and sizes, following the design system specifications.

## Variants

The Button component supports 5 variants:

### Default

Primary button with solid background and shadow:

```tsx
<Button variant="default">Click me</Button>
```

- Background: Primary color
- Shadow: Subtle shadow for depth
- Use for: Primary actions

### Outline

Button with border and transparent background:

```tsx
<Button variant="outline">Click me</Button>
```

- Border: Design system border color
- Background: Transparent
- Use for: Secondary actions

### Ghost

Button with no border or background:

```tsx
<Button variant="ghost">Click me</Button>
```

- Background: Transparent
- Use for: Tertiary actions, subtle interactions

### Hero

Enhanced button with larger shadow for CTAs:

```tsx
<Button variant="hero">Get Started</Button>
```

- Background: Primary color
- Shadow: Enhanced shadow for prominence
- Hover: Slight lift effect
- Use for: Hero section CTAs, important actions

### Glow

Button with glow effect on hover:

```tsx
<Button variant="glow">Click me</Button>
```

- Background: Primary color
- Shadow: Glow effect
- Hover: Enhanced glow
- Use for: Special actions, highlights

## Sizes

The Button component supports 5 sizes:

### Small (sm)

```tsx
<Button size="sm">Small Button</Button>
```

- Height: 2.25rem (36px)
- Padding: 0 0.75rem
- Font size: 0.8125rem (13px)

### Default

```tsx
<Button size="default">Default Button</Button>
```

- Height: 2.5rem (40px)
- Padding: 0 1.25rem
- Font size: 0.875rem (14px)

### Large (lg)

```tsx
<Button size="lg">Large Button</Button>
```

- Height: 3rem (48px)
- Padding: 0 2rem
- Font size: 1rem (16px)
- Border radius: 0.875rem

### Extra Large (xl)

```tsx
<Button size="xl">Extra Large Button</Button>
```

- Height: 3.5rem (56px)
- Padding: 0 2.5rem
- Font size: 1.125rem (18px)
- Border radius: 0.875rem

### Icon

Square button for icon-only buttons:

```tsx
<Button size="icon">
  <Icon />
</Button>
```

- Height: 2.5rem (40px)
- Width: 2.5rem (40px)
- Padding: 0

## States

### Hover

All variants have smooth hover transitions (200ms):

- Default: Slightly darker background
- Outline: Background fill
- Ghost: Background fill
- Hero: Lift effect with enhanced shadow
- Glow: Enhanced glow effect

### Focus

Focus states use a ring outline for keyboard navigation:

```css
outline: 2px solid hsl(var(--ring));
outline-offset: 2px;
```

### Active

Active states provide feedback with a scale transform:

```css
transform: scale(0.98);
```

### Disabled

Disabled buttons:

- Opacity: 0.5
- Pointer events: None
- Cursor: Not-allowed

## Accessibility

The Button component is fully accessible:

- **Keyboard Navigation**: Supports Enter and Space keys
- **Focus States**: Visible focus ring for keyboard users
- **ARIA Support**: Can accept aria-label and other ARIA attributes
- **Screen Readers**: Properly announced button text
- **WCAG AA**: Meets contrast requirements

## Usage Examples

### Basic Usage

```tsx
import Button from '@site/src/components/Button';

<Button>Click me</Button>;
```

### With Variant and Size

```tsx
<Button variant="hero" size="lg">
  Get Started
</Button>
```

### With Icons

```tsx
import { ArrowRight } from 'lucide-react';

<Button variant="default" size="default">
  Continue
  <ArrowRight className="w-4 h-4" />
</Button>;
```

### Disabled State

```tsx
<Button disabled>Disabled Button</Button>
```

### With Custom Class

```tsx
<Button className="custom-class">Custom Button</Button>
```

## Design System Integration

The Button component uses design system tokens:

- **Colors**: `--primary`, `--primary-foreground`, `--foreground`, `--border`, `--secondary`
- **Spacing**: Uses design system spacing scale
- **Typography**: Uses design system font family and weights
- **Border Radius**: Uses design system radius values
- **Transitions**: Uses design system timing (200ms)

## Related Documentation

- [Design System](/docs/contributing/design-system) - Complete design system documentation
- [Color Migration](/docs/contributing/color-migration) - Color system details
