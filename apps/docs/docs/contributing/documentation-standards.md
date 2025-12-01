---
sidebar_position: 3
sidebar_label: 'Documentation Standards'
---

# Documentation Standards

This guide describes how to write and maintain documentation for Anchorpipe.
All documentation lives in `apps/docs/docs/**` and is published at [anchorpipe-docs.vercel.app](https://anchorpipe-docs.vercel.app).

## Goals

- Make it easy for users and contributors to understand and use the product.
- Keep docs consistent in structure, tone, and formatting.
- Ensure features ship with the right documentation updates.

## File Format and Location

- **Format**: Markdown (`.md`) or MDX (`.mdx`) for Docusaurus content.
- **Location**: `apps/docs/docs/**` (docs site content checked into the repo)
- **Architecture decision records**: `apps/docs/docs/reference/adr/**`
- **Naming**:
  - Use `kebab-case` for filenames (e.g. `getting-started.md`, `rate-limiting.md`).
  - Keep names short and descriptive.

## Structure

For most guides and reference docs:

- Start with a top-level heading (`# Title`).
- Provide a short **Overview** section that explains:
  - What this page covers.
  - Who it is for.
  - When you should use it.
- Use clear sections with `##` and `###` headings.
- Prefer lists and tables over long paragraphs when summarizing options.

### Common Sections

Depending on the doc type, include some of:

- **Overview** – What and why.
- **Prerequisites** – What the reader needs before starting.
- **Steps / How-to** – Numbered steps for tasks.
- **Configuration** – Options, flags, environment variables.
- **Examples** – Code samples or request/response examples.
- **Troubleshooting** – Common issues and how to fix them.
- **Further Reading** – Links to related docs and ADRs.

## Markdown Style

These rules align with the repo’s markdownlint configuration:

- Wrap lines at **≤120 characters** where practical.
- Use fenced code blocks with a language:

```bash
npm run docs:dev
```

- Surround code fences with blank lines.
- Avoid bare URLs in text:
  - ✅ `See [Vercel docs](https://vercel.com/docs).`
  - ❌ `See https://vercel.com/docs`
- Use emphasis for meaning, not headings:
  - ✅ `## Configuration`
  - ❌ `**Configuration**` as a pseudo-heading.

Inline HTML is allowed where Docusaurus needs it, but keep it minimal and documented.

## Code Examples

When including code examples:

- Use realistic, copy-pasteable examples.
- Show both request and response for API examples.
- Include error handling when it matters for production use.
- Keep examples in sync with the current APIs and configuration.

For REST APIs:

- Link to or reference the OpenAPI definition when relevant.
- Use consistent base URLs and common headers.

## Links

- Prefer **relative links** within the docs site:
  - `../getting-started/installation.md`
  - `./configuration.md`
- Use descriptive link text (what the user will get), not “click here”.
- Keep anchors stable (avoid changing heading text unless necessary).

## ADR Standards

Architecture Decision Records live in `apps/docs/docs/reference/adr/**`.

Each ADR should:

- Follow the existing ADR template (context, decision, consequences).
- Have a stable numeric identifier (`0001-...`, `0002-...`).
- Link to related ADRs and implementation docs.
- Be updated or superseded when decisions change, rather than silently edited.

## When to Update Docs

Update documentation when:

- Adding or changing a feature or behavior.
- Modifying APIs, request/response shapes, or auth.
- Changing configuration, environment variables, or deployment flows.
- Introducing or updating an ADR.
- Deprecating or removing functionality.

For small internal refactors with no user-visible change, document only if it affects
internal runbooks or ADRs.

## PR Expectations

For feature PRs (especially those labeled `type:feature`):

- Include at least one of:
  - Updated user docs in `apps/docs/docs/**`.
  - Updated API docs.
  - New or updated ADR.
  - An explicit, documented reason why docs are not required.
- Run `npm run validate:docs` when you touch docs to catch:
  - Markdown style issues.
  - Spelling issues.
  - Broken links (via Docusaurus build).

Refer back to this page from:

- `.github/PULL_REQUEST_TEMPLATE.md` (documentation checklist).
- `.github/ISSUE_TEMPLATE/feature.yml` (documentation requirements).
