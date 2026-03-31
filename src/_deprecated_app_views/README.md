# Deprecated App.jsx View Components

These were duplicate view components defined inside App.jsx.
They have been replaced with imports from the canonical component files
in src/components/views/.

Archived on 2026-03-31 during App.jsx deduplication refactor.

If issues arise, these files contain the exact code that was removed.
Safe to delete after 2 weeks if no regressions.

## What was replaced:
- WaterfallView (App.jsx lines 428-1227) → import from WaterfallView.jsx
- ExitAnalysisPanel (lines 1228-1370) → import from WaterfallView.jsx
- IncentivesImpact (lines 1371-1465) → import from WaterfallView.jsx
- ResultsView router (lines 1466-1492) → import from ResultsView.jsx
- SelfResultsView (lines 1494-1856) → import from ResultsView.jsx
- BankResultsView (lines 1857-2464) → import from ResultsView.jsx
- FieldGroup, FL, Inp, Drp (lines 2465-2492) → import from ResultsView.jsx
- FinancingView (lines 2493-3739) → import from FinancingView.jsx
- ProjectSetupWizard (lines 4397-4498) → import from ProjectSetupWizard.jsx
