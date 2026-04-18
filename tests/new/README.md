# New engine tests (post-refactor)

These tests target the simplified `investors[]`-based engine from the
simplification campaign (Tasks 3-5). They START RED (engine not refactored
yet) and turn GREEN after Task 5.

Once green, these become permanent regression guards alongside the existing
audit suite in `tests/`.

Do not delete these tests if they fail — they fail BY DESIGN in the TDD cycle.
