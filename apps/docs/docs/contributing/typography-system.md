# Typography System

This document describes the typography system used in the anchorpipe documentation site.

## Overview

The documentation site uses a comprehensive typography system with Inter (sans-serif) and JetBrains Mono (monospace) fonts, providing clear, readable typography throughout the site.

## Font Families

- **Sans-serif**: Inter (weights: 400, 500, 600, 700, 800)
- **Monospace**: JetBrains Mono (weights: 400, 500, 600)

Fonts are loaded from Google Fonts with preconnect links for optimal performance.

## Typography Scale

The typography system includes a complete type scale:

- **Display**: 4.5rem (72px) - Hero headlines
- **H1**: 3rem (48px) - Page titles
- **H2**: 2rem (32px) - Section headings
- **H3**: 1.5rem (24px) - Subsection headings
- **H4**: 1.25rem (20px) - Card titles
- **H5**: 1.125rem (18px) - Sub-card titles
- **H6**: 1rem (16px) - Small headings
- **Body**: 1rem (16px) - Paragraph text
- **Body Large**: 1.125rem (18px) - Lead paragraphs
- **Small**: 0.875rem (14px) - Captions, meta
- **XS**: 0.75rem (12px) - Labels, badges
- **Mono**: 0.875rem (14px) - Code, technical

## Font Loading

Fonts are preloaded using preconnect links in `Root.tsx` to improve loading performance and reduce FOUT (Flash of Unstyled Text).

## Usage

Typography classes are available for use in components:

- `.display` - Display text
- `.h1`, `.h2`, `.h3`, `.h4`, `.h5`, `.h6` - Heading classes
- `.body-lg` - Large body text
- `.small` - Small text
- `.xs` - Extra small text
- `.mono` - Monospace text

All typography uses design system variables for consistency. Refer to `variables.css` for complete typography token definitions.
