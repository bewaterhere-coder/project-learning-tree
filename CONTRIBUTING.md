# Contributing

Project Learning Tree is currently validating its core product model. Contributions should preserve scope discipline and the node-centered learning thesis.

## Before contributing

Read:

- `AGENTS.md`
- `docs/product/vision.md`
- `docs/product/mvp-scope.md`
- the current milestone specification

## Pull requests

Keep PRs aligned to one milestone or one clearly bounded concern. Explain any product or architecture deviation explicitly and include tests for domain behavior changes.

## Browser acceptance

Playwright covers real-browser workflows. Vitest covers domain logic, persistence contracts, and component tests. Do not put `npm test` behind Playwright.

- Install the browser once: `npx playwright install chromium`
- Run against a production preview: `npm run build && npm run test:e2e`
- Watch the same tests in a real Chromium window: `npm run build && npm run test:e2e:headed` (needs a local display; not `npm run dev`; see `docs/milestones/M2.5-qa-harness.md`)
- Prefer existing `data-testid`s, authored entity text, and `data-node-id`. Do not select translated chrome copy or XYFlow CSS classes.
- Each test starts from an empty browser context. Seed semantic state only through Playwright `storageState`, never by rewriting localStorage on every navigation.
- Visual snapshots are generated and validated on Linux CI. Use `npm run test:e2e:update-snapshots` from a Linux/Playwright image, not as a macOS/Windows baseline.

When CI `e2e` fails, download `playwright-artifacts` (`playwright-report/` and `test-results/`) and open the HTML report or `trace.zip`. Do not treat “test failed” as sufficient evidence.

Confirmed browser-level bugs should become a permanent `e2e/*.spec.ts` regression test after the fix.
