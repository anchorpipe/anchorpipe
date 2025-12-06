# CodeBlock Component

This document describes the CodeBlock component used in the anchorpipe documentation site.

## Overview

The CodeBlock component is a terminal-style code block with copy functionality, syntax highlighting support, and enhanced styling following the design system specifications.

## Features

- **Terminal-style header** with traffic light dots (red, yellow, green)
- **Copy functionality** with Clipboard API
- **Visual feedback** when code is copied
- **Filename display** (optional)
- **Line numbers** (optional)
- **Comment/addition/deletion highlighting**
- **Glow effect** on hover
- **Responsive design** for mobile devices

## Usage

### Basic Usage

```tsx
import CodeBlock from '@site/src/components/CodeBlock';

<CodeBlock code="npm install anchorpipe" />;
```

### With Filename

```tsx
<CodeBlock code="const example = 'hello world';" filename="example.ts" language="typescript" />
```

### With Line Numbers

```tsx
<CodeBlock
  code="function hello() {\n  console.log('Hello');\n}"
  language="javascript"
  showLineNumbers={true}
/>
```

### With Comments and Diff

The component automatically highlights:

- **Comments**: Lines starting with `#`, `//`, or `/*`
- **Additions**: Lines starting with `+`
- **Deletions**: Lines starting with `-` (but not `--`)

```tsx
<CodeBlock code="# This is a comment\n+ Added line\n- Removed line\nNormal line" />
```

## Props

| Prop              | Type      | Default      | Description                                    |
| ----------------- | --------- | ------------ | ---------------------------------------------- |
| `code`            | `string`  | **required** | The code to display                            |
| `language`        | `string`  | `'bash'`     | Programming language (for syntax highlighting) |
| `filename`        | `string`  | `undefined`  | Optional filename to display in header         |
| `showLineNumbers` | `boolean` | `false`      | Whether to show line numbers                   |
| `className`       | `string`  | `undefined`  | Additional CSS class names                     |

## Copy Functionality

The CodeBlock component includes a copy button that:

1. Copies the code to clipboard using the Clipboard API
2. Shows "Copied!" feedback with a check icon
3. Automatically resets after 2 seconds
4. Falls back to `document.execCommand` for older browsers

### Keyboard Accessibility

- The copy button is keyboard accessible
- Press Tab to focus the button
- Press Enter or Space to copy

## Styling

### Terminal Header

The header includes:

- **Traffic light dots**: Red, yellow, green circles (macOS terminal style)
- **Filename**: Displayed in monospace font if provided
- **Copy button**: Positioned on the right side

### Glow Effect

On hover, the code block shows a subtle glow effect:

- Uses primary color with low opacity
- Blur effect for smooth appearance
- Border color changes to primary on hover

### Code Styling

- **Font**: JetBrains Mono (design system monospace font)
- **Background**: Surface-1 color from design system
- **Border**: Subtle border with opacity
- **Syntax highlighting**: Supports comment, addition, and deletion highlighting

## Accessibility

The CodeBlock component is fully accessible:

- **Keyboard Navigation**: Copy button is keyboard accessible
- **ARIA Labels**: Copy button has proper aria-label
- **Screen Readers**: Code content is properly announced
- **Focus States**: Visible focus ring on copy button
- **Color Contrast**: Meets WCAG AA requirements

## Design System Integration

The CodeBlock component uses design system tokens:

- **Colors**: `--surface-1`, `--surface-2`, `--surface-3`, `--border`, `--primary`, `--foreground`, `--muted-foreground`
- **Typography**: `--font-mono` for code, `--font-sans` for UI elements
- **Spacing**: Uses design system spacing scale
- **Border Radius**: Uses design system radius values
- **Transitions**: Uses design system timing (200ms, 300ms)

## Examples

### Bash Command

```tsx
<CodeBlock code="npm install -g anchorpipe" filename="install.sh" language="bash" />
```

### TypeScript Code

```tsx
<CodeBlock
  code="interface User {\n  id: string;\n  name: string;\n}"
  filename="types.ts"
  language="typescript"
  showLineNumbers={true}
/>
```

### Git Diff

```tsx
<CodeBlock
  code="# Old code\n- const old = 'removed';\n+ const new = 'added';\nconst unchanged = 'same';"
  filename="diff.patch"
  language="diff"
/>
```

## Responsive Design

The CodeBlock component is responsive:

- **Mobile**: Reduced padding and font sizes
- **Tablet**: Standard sizing
- **Desktop**: Full styling with all effects

## Related Documentation

- [Design System](/docs/contributing/design-system) - Complete design system documentation
- [Button Component](/docs/contributing/button-component) - Button component documentation
