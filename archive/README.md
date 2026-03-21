# Archive — Inactive Files

This folder contains files that are no longer active in the application but are kept for reference.

**Do NOT import or reference any file from this folder in the live application.**

---

## Files

| File | Original Location | Archived Date | Reason |
|------|------------------|---------------|--------|
| App.jsx.backup | src/App.jsx.backup | 2026-03-22 | Pre-split monolith (12,901 lines). All engine functions have been extracted to `src/engine/`, `src/data/`, and `src/utils/`. The live `src/App.jsx` (10,623 lines) now imports from those modules. This file is the last snapshot before code splitting was applied. |

## When to use these files

- **Debugging:** If a calculation behaves differently after the split, compare the original function in this backup against the extracted version in `src/engine/`.
- **Reference:** To see how the monolith was structured before modularization.
- **Never:** Do not restore this file to `src/`. The split code is the single source of truth.
