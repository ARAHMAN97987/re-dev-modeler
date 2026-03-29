# Deprecated Engine Files

These files are OLD CJS implementations from the early engine architecture.
They are NOT used by the frontend (App.jsx imports from *.js ESM files only).

They were kept to support `tests/layer_abc.cjs`, which no longer runs.

**DO NOT import these files.** Use the corresponding ESM versions:
- calcUtils.cjs → use engine/math.js
- assets.cjs → functionality merged into engine/cashflow.js
- cashflow.cjs → use engine/cashflow.js (completely rewritten)
- inputs.cjs → use data/defaults.js

Moved here on 2026-03-29 during structural audit.
