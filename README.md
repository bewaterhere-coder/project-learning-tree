# Project Learning Tree

An open-source experiment in **node-centered AI learning** for complex technical projects.

Most AI learning tools are conversation-centered. Complex learning is naturally branching: one question reveals blockers, adjacent questions, evidence gaps, and stopping conditions. Project Learning Tree explores a different model where learning is organized around questions rather than one ever-growing chat.

## Core thesis

> Conversation belongs to a Learning Node. A Learning Node does not belong to a Conversation.

The learning tree is progressively materialized. The system should not eagerly generate a complete knowledge tree. Only questions that block the current learning goal become child nodes; adjacent but non-blocking questions move to the Learning Frontier.

## MVP loop

```text
Create Project
→ Generate Core Questions
→ Focus Node
→ Learn in Node Conversation
→ Discover Blocking Child or Frontier Item
→ Evaluate Definition of Done
→ Close Node
→ Return to Parent / Next Node
```

## Architecture direction

- React + TypeScript + Vite
- `@xyflow/react` for Tree UI (derived from DomainSnapshot; not a source of truth)
- Vitest for domain, workspace, and component tests
- Playwright Chromium for browser acceptance (`e2e/`)
- Pure domain engine with no dependency on React, persistence, LLM providers, GitHub, or network APIs

Zustand and Dexie/IndexedDB remain deferred. Workspace UI preferences (sidebar, inspector, viewport, node positions, locale, appearance) use localStorage. DomainSnapshot is persisted only in the dedicated Workspace semantic store, never in UI preferences.

AI is an advisor. The domain engine is the authority for state transitions. DomainSnapshot is the single source of truth.

## Start here

1. Read `AGENTS.md`.
2. Review `docs/product/interaction-spec.md` and `docs/product/domain-model.md`.
3. M1 Domain Engine is complete: `docs/milestones/M1-domain-engine.md`.
4. M2 Tree UI: `docs/milestones/M2-tree-ui.md`.
5. M2.1 Multi-Project Workspace: `docs/milestones/M2.1-multi-project-workspace.md`.
6. M2.3 Question Authoring: `docs/milestones/M2.3-question-authoring.md`.
7. M2.4 Product Workspace & UI Foundation: `docs/milestones/M2.4-product-workspace-ui.md`.
8. M2.5 QA Harness: `docs/milestones/M2.5-qa-harness.md`.
9. UI Reference Study: `docs/design/Learning-Tree-UI-Reference-Study.md`.
10. M2.6 Visual Hierarchy (planned): `docs/milestones/M2.6-visual-hierarchy.md`.

```bash
npm install
npm test
npm run typecheck
npm run dev
```

`npm run dev` is for operating the product yourself (Vite dev server). It is not the acceptance-test runner.

Browser acceptance (Chromium, production preview):

```bash
npx playwright install chromium
npm run build
npm run test:e2e
```

To watch the same tests operate the product in a real Chromium window:

```bash
npx playwright install chromium
npm run build
npm run test:e2e:headed
```

Command roles:

```text
npm run dev
→ operate the product yourself (Vite dev server)

npm run test:e2e:headed
→ open a real Chromium window and run the existing acceptance tests
  (production preview, not npm run dev; needs a local display)

npm run test:e2e:ui
→ Playwright UI Mode for analyzing and debugging tests
  (not the product window itself)

npm run test:e2e:debug
→ Playwright Inspector / step-through debugging

npm run test:e2e
→ headless automatic acceptance (also what CI runs)
```

`--headed` is a Playwright CLI flag. No `playwright.config.ts` change and no extra dependency are required. Headed mode uses the existing Vite production preview (`webServer` on port 4173), not `npm run dev`. It needs a graphical display; CI and SSH sessions without `DISPLAY` should keep using `npm run test:e2e`. Existing `fullyParallel` settings are unchanged, so headed mode may open several Chromium windows at once.

`npm test` is Vitest-only and does not launch a browser. Visual snapshots are Linux-canonical; set `E2E_VISUAL=1` to run them locally. See `docs/milestones/M2.5-qa-harness.md` for selector policy, storage seeding, and artifact debugging.

## Status

M1 Domain Engine is complete. M2 Tree UI is implemented. M2.1 Multi-Project Workspace is implemented. M2.2 Localization & Close Preflight is implemented. M2.3 Question Authoring Semantics is implemented. M2.4 Product Workspace & UI Foundation is implemented: project create/archive/restore, semantic local persistence, core question authoring, light/dark/system, and the product UI foundation. M2.5 adds a Playwright Chromium acceptance harness (`e2e/`) on top of Vitest. **M3 COMPLETE:** Node Conversation + AI Learning Loop (`docs/milestones/M3-node-conversation.md`).

## License

MIT
