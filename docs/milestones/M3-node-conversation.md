# M3 — Node Conversation + AI Learning Loop

## Goal

Give each Learning Node a real conversation, bound to learning context, without making Chat a permanently fixed right-hand column. Then close the AI Learning Loop: the model may propose, the user decides, Application dispatches, Domain mutates.

```text
M3A complete + M3B complete = M3 COMPLETE
```

M3A may land first. **M3A COMPLETE is not M3 COMPLETE.**

M1 Domain Engine remains frozen. Do not patch `DomainSnapshot`. Do not let `src/ai` import or invoke Domain mutation.

## Slices

| Slice | Name | Ships |
|---|---|---|
| **M3A** | Contextual Node Conversation | Chat chrome, binding, identity, conversation store, LearningContext, Context Inspector, Project Chat, `ChatReply { answer, proposals }`, StubProvider, async routing |
| **M3B** | AI Learning Loop | Interactive proposals starting with `QuestionProposal`; user-only Domain mutation; then Evidence / DoD / Summary / Convergence assistance |

## Architecture

```text
UI
 ↓
Workspace (chatOpen, placement, binding, panel size/position)
Conversation (identity, messages, turns, request state, proposals, persistence)
AI (ChatProvider, StubProvider, ChatReply)
 ↓
Application (selectors, LearningContext, user-accepted UiCommand)
 ↓
Domain (frozen)
```

Conversation is not Workspace chrome. Workspace only stores where Chat sits, whether it is open, and which node it is bound to.

```text
type ConversationIdentity =
  | { kind: "node"; projectId: ProjectId; nodeId: NodeId }
  | { kind: "project"; projectId: ProjectId };

type ChatBinding =
  | { mode: "follow-focus" }
  | { mode: "pinned"; projectId: ProjectId; nodeId: NodeId };
```

Node Conversation public identity is `projectId + nodeId`. Project Chat has a separate identity and must not write a Node Conversation.

Focus is navigation. Clicking a node focuses it and does not force Chat open. Opening Chat is an explicit action such as 聊聊这个问题. Closing Chat does not change Focus, delete conversation, or mutate Domain.

Pins are per-project layout. Switching projects must not clear another project's pin. Reset a pin only when its bound node no longer exists.

## Persistence

Three stores stay separate:

| Store | Key | Owns |
|---|---|---|
| Preferences | `plt.workspace.layout.v2` | positions, viewport, sidebar, inspector, Chat placement/binding |
| Conversation | `plt.conversation.v1` | messages, turns, proposals, request state |
| Semantic | `plt.workspace.semantic.v1` | DomainSnapshot, archive, selected project |

Messages never enter `DomainSnapshot` or layout preferences.

## LearningContext

Application-level model, not a prompt string. Node Chat uses P0 (bound node + its conversation), P1 (parent, Active Stack / ancestor path, DoD, Evidence, Summary, unresolved Blocking Children), and P2 (compact project summary if needed). Sibling conversations, unrelated nodes, other projects, and full project history are excluded by default.

Context Inspector shows only product-facing learning context. No system prompts or provider internals.

## AI boundary

```text
interface ChatReply {
  answer: string;
  proposals: LearningProposal[];
}
```

M3 ships StubProvider only. `src/ai` must not import Domain mutation operations or `dispatchCommand`. LLM output never writes DomainSnapshot.

## M3B proposal flow

```text
AI response → LearningProposal → inline card → user chooses
→ Application UiCommand → existing Domain operation
```

`QuestionProposal` first:

- 加入待解决子问题 → existing `createBlockingChild` (parent must be `active`; question and goal required)
- 稍后探索 → existing `moveCandidateToFrontier` (new `UiCommand` adapter; not `createChild`, not `promoteFrontierItem`)
- 忽略 → conversation state only

AI `suggestedDestination` is never authoritative. Domain rejection appears beside the proposal card.

Later on the same contract: EvidenceProposal, Criterion/DoDProposal, SummaryProposal (learning summary, not transcript summary), Convergence assistance. Close remains `closeNode` through Domain convergence. Close does not auto-change Focus.

## M3A acceptance

1. follow-focus Chat, when already open, switches Conversation when Focus changes
2. Focus itself does not auto-open Chat
3. user can explicitly 聊聊这个问题
4. pinned Chat does not switch when Focus changes
5. UI shows when Focus Node ≠ Chat Node
6. 跟随当前节点 exits pin
7. floating Chat initially appears near the bound Node
8. moved Chat position is remembered
9. docked/floating does not change Domain
10. Node request contains Node LearningContext
11. parent / Active Stack / DoD / Evidence / Summary are available to the context builder
12. sibling conversations excluded by default
13. Project Chat works without a focused Node
14. Project Chat does not append to a Node Conversation
15. project switch restores correct binding/history
16. async response writes back to the original Conversation
17. Context Inspector shows only user-facing context
18. closing Chat does not change Focus
19. project switch does not clear another project's pin
20. conversation persistence is separate from layout/semantic storage

## M3B acceptance

1. ChatReply supports proposals
2. unconfirmed proposal does not mutate Domain
3. Question → Blocking Child succeeds
4. Question → Frontier succeeds
5. Ignore does not change Domain
6. user can override AI recommendation
7. proposal mutation goes through Application/Domain
8. Domain rejection is shown locally
9. AI layer has no Domain mutation import
10. EvidenceProposal requires user confirmation
11. DoD Proposal requires user confirmation
12. SummaryProposal requires user confirmation
13. AI Summary is a learning summary, not a transcript summary
14. readiness can trigger AI assistance
15. closeNode is still decided by Domain convergence
16. AI cannot auto-complete a Node
17. Close does not automatically change Focus
18. Proposal state and Domain state stay separate

## Out of scope

Live LLM SDKs, API keys, RAG, vector DBs, agent frameworks, cloud sync, accounts, conversation branching, AI auto-mutation, AI auto-close, Frontier panel UI, M4.

## Completion

**M3 COMPLETE** — M3A acceptance, M3B acceptance, typecheck, tests, build, and CI are green on `dfa0a4a` (`cursor/m3-node-conversation-4691`).
