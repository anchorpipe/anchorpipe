---
description: Scripts (PowerShell/Node) Discipline Rules
globs:
  - "scripts/**"
alwaysApply: true
---

- Non-interactive and idempotent
  - Use flags to avoid prompts; reruns are safe
- Cross-platform friendly
  - Prefer Node-based scripts for complex logic; document PowerShell specifics
- Safety
  - Never echo secrets; fail fast with clear messages and exit codes

@RULES.md

