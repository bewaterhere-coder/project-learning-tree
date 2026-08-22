# M4 — Project Learning Bootstrap

## Goal

When a learner adds a GitHub (or named) project, do not open an empty canvas that waits for manual question authoring. Run a Project Learning Bootstrap so the first visible tree already contains a small, high-value first layer of project-specific Core Questions.

The **Coco Project Learning Contract** (`coco-project-learning-contract` / `v1`) is the canonical methodology. Learning Tree visualizes, persists, and lets the user operate that process through a versioned executable adapter (`learning-tree-coco-adapter` / `v1` in `src/framework`). This milestone does not create a competing methodology inside React or treat the adapter as a second source of truth.

Independent from M2.6 visual hierarchy.

## Product principle

```text
Repository evidence (GitHub metadata, README, root listing)
→ Project Positioning
→ Learning Value Judgment
→ System Model
→ Guided Question Generation
→ Core Questions (default <= 5)
→ Recommended Current Focus
```

Manual question authoring remains supplemental. It is no longer required to start learning.

## Architecture

```text
UI
 ↓
Workspace (async createWorkspaceProject, optional bootstrap record in semantic store)
 ↓
Application (bootstrapLearningProject + RepositoryEvidenceProvider port)
 ↓
Infrastructure (GitHub loader)     Framework (adapter projection)     Domain (createProject, addCoreQuestion, addCriterion)
```

- Canonical methodology remains the Coco Project Learning Contract. `src/framework` is Learning Tree's versioned adapter/projection of that contract, not a second methodology document.
- Framework does not import Domain, React, GitHub, or network APIs. It never calls `fetch`.
- A `RepositoryEvidenceProvider` is injected at create time. Production uses `GitHubRepositoryEvidenceProvider`. Tests inject fixtures.
- Framework output never mutates `DomainSnapshot`. Application dispatches existing Domain operations.
- Domain `createProject` remains an empty pass. Bootstrap is application orchestration.
- Domain `CORE_QUESTION_LIMIT` is an operational tree cap, not a methodology constant.
- UI must not import `src/framework` or restate exploration budgets.

## Repository evidence

Verified questions are derived from GitHub reads, not from a learner-typed blurb:

1. `GET /repos/{owner}/{repo}` — description, language, topics
2. `GET /repos/{owner}/{repo}/readme` — README text
3. `GET /repos/{owner}/{repo}/contents/` — root file and directory names

If a root `package.json` is listed, it may be fetched for entry-point hints. There is no full tree walk and no RAG.

`evidenceStatus` is persisted on the bootstrap record:

- `verified` — GitHub source and all three reads succeed
- `partial` — some reads fail; whatever arrived is still used
- `fallback` — no GitHub source, or the provider throws / network fails. Project creation still succeeds from the name only.

User `description` is a supplemental hint appended last. It is never sufficient to claim verified evidence.

## Exploration budget (adapter runtime defaults)

```text
Core Questions       <= 5
Concurrent Focus     <= 2
Branch Depth         <= 3
Core Mechanisms      <= 3
L3 Implementation    <= 1
```

These are deterministic defaults copied into the Learning Tree adapter so bootstrap can run locally. They are not canonical methodology truth. Domain still enforces `CORE_QUESTION_LIMIT`.

## Question contract

Every generated core question is materialized as a Learning Node with:

```text
Question
Goal
Target Depth (L1 Know / L2 Understand / L3 Implement)
Definition of Done
Status
```

Default depth intent:

- core mechanism: L2
- near-term engineering use: L3 (at most one)
- peripheral: L1

## Persistence

Bootstrap artifacts (`positioning`, `learningValue`, `systemModel`, recommended focus node IDs, canonical contract ref, adapter version, `evidenceStatus`) are Workspace semantic state on `ProjectWorkspace.bootstrap`, stored next to `DomainSnapshot` in `plt.workspace.semantic.v1`. They are not UI preferences and not Domain lifecycle.

Missing `bootstrap` remains valid so older semantic stores still hydrate. Old v1 records that lack `evidenceStatus` or canonical/adapter fields hydrate with defaults (`evidenceStatus: fallback`) and extra unknown fields do not drop the project.

## Out of scope

```text
LLM-authored questions
Eager full knowledge trees
Full repository tree walk / RAG
M2.6 visual-hierarchy changes
Accounts / server infrastructure
Enforcing branch-depth in Domain
```

## Acceptance

1. Creating a learning project produces a non-empty first learning layer automatically.
2. That layer is bounded by the Core Question budget.
3. Questions are project-specific and evidence-derived from GitHub metadata, README, and root listing — not a fixed generic checklist, and not from stuffing keywords into the optional description.
4. Name-only creates and provider/network failure still succeed, with `evidenceStatus` `fallback` (or `partial` when some reads fail).
5. Expanding or focusing one question does not materialize unrelated branches.
6. Blocking vs Frontier classification lives in the adapter: only DoD blockers become blocking children.
7. Generated questions include Goal, Target Depth, and Definition of Done. Completion is not “exhaust all subquestions”.
8. Manual core-question authoring still works when slots remain, but is not required to start.
