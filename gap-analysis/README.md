# Gap Analysis Documentation

This directory contains comprehensive gap analysis documents for each story/epic in the anchorpipe project.

## Structure

```
gap-analysis/
├── README.md (this file)
├── EPIC-000/          # Foundation (G0) stories
│   ├── ST-101.md
│   ├── ST-102.md
│   └── ...
├── EPIC-00A/          # Security Foundation (GA) stories
│   ├── ST-201.md
│   ├── ST-202.md
│   └── ...
├── EPIC-001/          # Core Platform (GB) stories
│   ├── ST-301.md
│   └── ...
└── IMPLEMENTATION-DEPENDENCIES.md  # Order of implementation
```

## Purpose

Each gap analysis document:

1. **Compares Requirements vs Implementation**: Cross-references story definitions with actual implementation
2. **Identifies Gaps**: Documents missing features, incomplete implementations, or deviations
3. **Categorizes Gaps**: Classifies as Critical, High, Medium, or Low priority
4. **References Documentation**: Links to ADRs, PRD, Architecture docs, and related stories
5. **Notes Future Work**: Distinguishes between current scope and future enhancements
6. **Provides Recommendations**: Suggests implementation order and dependencies

## Gap Priority Levels

- **Critical**: Blocks other work or violates acceptance criteria
- **High**: Important feature missing, impacts user experience
- **Medium**: Nice to have, improves quality but not blocking
- **Low**: Future enhancement, out of current scope

## How to Use

1. Review the gap analysis for a specific story before starting work
2. Check `IMPLEMENTATION-DEPENDENCIES.md` for implementation order
3. Address Critical and High priority gaps first
4. Update gap analysis as work progresses
5. Mark gaps as resolved when implemented

## Related Documentation

- Story definitions: `anchorpipe_guide_docs/issues-to-create/`
- ADRs: `adr/`
- Architecture: `anchorpipe_guide_docs/docs/02-architecture.md`
- PRD: `anchorpipe_guide_docs/docs/01-prd.md`
- Quality Handbook: `anchorpipe_guide_docs/docs/08-quality-handbook.md`
