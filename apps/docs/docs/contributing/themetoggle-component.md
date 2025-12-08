# ThemeToggle Component

## Overview

The ThemeToggle component lets users switch between light and dark modes using Docusaurus color mode, with smooth icon transitions and design-system styling.

## Features

- Sun/Moon icons (Lucide React) with smooth rotate/scale transitions
- Uses Docusaurus `useColorMode` for theme persistence
- Accessible: keyboard support, `aria-label`, focus ring, `aria-pressed`
- Hover and focus states aligned to design tokens
- 2.5rem square button, 0.625rem radius, 1.25rem icon size
- Works in both light and dark themes

## Usage

```tsx
import ThemeToggle from '@site/src/components/ThemeToggle';

export default function HeaderToggle() {
  return <ThemeToggle />;
}
```

## Props

| Prop        | Type     | Default     | Description                 |
| ----------- | -------- | ----------- | --------------------------- |
| `className` | `string` | `undefined` | Optional custom class names |

## Behavior

- Click or Enter/Space toggles theme.
- Sun shows in light mode; Moon shows in dark mode.
- Animations: rotate + scale (0.3s ease).
- Theme persistence handled by Docusaurus.

## Accessibility

- `aria-label` describes the action (switch to light/dark).
- `aria-pressed` reflects current state.
- Focus-visible ring for keyboard users.
- Icons marked `aria-hidden`.

## Design Tokens

- Backgrounds: `--surface-1`, `--surface-2`
- Border/ring: `--border`, `--ring`
- Color: `--foreground`, `--primary`
- Radius: `--radius-md` (0.625rem equivalent)
- Easing: `--ease-smooth`

## Testing

- Verify click toggles theme (sun ↔ moon).
- Check hover background change and focus outline.
- Keyboard: Tab to focus, Enter/Space toggles.
- Confirm icons animate and correct icon shows per mode.
