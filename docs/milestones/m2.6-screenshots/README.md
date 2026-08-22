# M2.6 Screenshot Acceptance Matrix

All frames are captured from the real running app at **1280 × 720**. They are not mocks, Figma exports, or component-only shots.

| # | File | Seed | Locale | Theme | Selected node | Lifecycle setup | Viewport |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `01-empty-workspace-light.png` | Empty boot (`createWorkspace([])`) | en-US | Light | none | No projects | Playwright default `1280×720`, zoom 1 |
| 2 | `02-project-roots-light.png` | Created in UI: project “Visual Roots” + two core questions; Details closed | en-US | Light | none (Details closed) | Two `open` roots | Default |
| 3 | `03-active-stack-light.png` | `createDemoWorkspaceFixture()` Project A | en-US | Light | Q1, then Details closed | Q1 `active` on stack, blocked by Q1.2 | Default |
| 4 | `04-focused-details-light.png` | `createDemoWorkspaceFixture()` Project A | en-US | Light | Q2 focused, Details open | Q2 `open`; sibling Q1 active | Default |
| 5 | `05-blocked-node-light.png` | `createDemoWorkspaceFixture()` Project A | en-US | Light | Q1 focused, Details open | Q1 `active` + blocked + on stack | Default |
| 6 | `06-parked-closed-light.png` | `createDemoWorkspaceFixture()` Project A | en-US | Light | Q1.2 then Details closed | Q1.1 `closed`, Q1.2 `parked` | Default |
| 7 | `07-dark.png` | `createDemoWorkspaceFixture()` Project A | en-US | Dark | Q2 focused, Details open | Same as #4 | Default |
| 8 | `08-zh-CN.png` | `createDemoWorkspaceFixture()` Project A | zh-CN | Light | Q2 focused, Details open | Same as #4 | Default |

Generated with:

```bash
E2E_ACCEPTANCE_SHOTS=1 npx playwright test e2e/acceptance/m26-screenshots.spec.ts
```
