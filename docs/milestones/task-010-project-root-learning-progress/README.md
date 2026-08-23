# TASK-010 — Verification evidence

## Canvas flash (select / drag)

Automated MutationObserver check on `.react-flow` knowledge-cluster underlays:

- Spec: `e2e/specs/project-root-canvas-stability.spec.ts`
- Result: `canvas-flash-verification.json` (`verdict: pass`)
- Screenshot after select+drag: `canvas-after-select-drag.png`

Observed:

- Pure selection: **0** cluster childList add/remove mutations
- Drag: attribute/geometry updates only; **0** cluster node remounts

Fix direction (not workarounds): selection patched in place; cluster underlays rebuild on topology / drag-stop only — not on every select or drag tick.

## Migration

Covered by `tests/application/hierarchy-migration.test.ts` (flat → rooted, idempotent second pass, question text preserved, stable root id, already-rooted unchanged) and bootstrap / domain Project Root suites.
