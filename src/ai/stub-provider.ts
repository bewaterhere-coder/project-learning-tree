import type { LearningContext } from "../application/selectors/learning-context.js";
import type { ChatProvider } from "./provider.js";
import type { ChatReply, LearningProposal } from "./types.js";

export interface StubProviderOptions {
  delayMs?: number;
  complete?: ChatProvider["complete"];
}

export function createStubProvider(
  options: StubProviderOptions = {},
): ChatProvider {
  const delayMs = options.delayMs ?? 0;
  return {
    async complete(request) {
      if (options.complete) {
        const reply = await options.complete(request);
        return delay(reply, delayMs);
      }
      return delay(defaultStubReply(request.context, request.input), delayMs);
    },
  };
}

function defaultStubReply(context: LearningContext, input: string): ChatReply {
  const lowered = input.toLowerCase();
  const nodeId =
    context.identity.kind === "node" ? context.identity.nodeId : undefined;
  const question = context.node?.question ?? context.project.name;

  if (context.identity.kind === "project") {
    return {
      answer: `Looking at ${context.project.name} as a whole. ${projectStatusLine(context)}`,
      proposals: [],
    };
  }

  if (nodeId === undefined) {
    return { answer: `I can discuss ${context.project.name}.`, proposals: [] };
  }

  if (looksLikeSummaryAssist(lowered)) {
    const summary =
      context.node?.summary ??
      `At this depth, ${question} is understood as: ${context.node?.goal ?? question}.`;
    return {
      answer: "Here is a learning summary draft for this question. It is not a chat transcript.",
      proposals: [
        summaryProposal(nodeId, summary),
      ],
    };
  }

  if (looksLikeEvidenceAssist(lowered)) {
    return {
      answer: "This looks like something worth keeping as learning evidence.",
      proposals: [
        {
          id: stubId("evidence"),
          type: "evidence",
          sourceNodeId: nodeId,
          evidenceType: "note",
          reference: input.slice(0, 160),
          note: `Suggested from the current question: ${question}`,
          status: "pending",
        },
      ],
    };
  }

  if (looksLikeCriterionAssist(lowered)) {
    return {
      answer: "A completion requirement that would make this question done:",
      proposals: [
        {
          id: stubId("criterion"),
          type: "criterion",
          sourceNodeId: nodeId,
          description: `Be able to explain ${question}`,
          required: true,
          evidenceRequired: false,
          status: "pending",
        },
      ],
    };
  }

  const proposedQuestion = deriveFollowUp(question, input);
  return {
    answer: `Working from “${question}”. ${context.node?.goal ? `Goal: ${context.node.goal}. ` : ""}I can keep going from this node’s current learning context.`,
    proposals: [
      {
        id: stubId("question"),
        type: "question",
        sourceNodeId: nodeId,
        question: proposedQuestion,
        goal: `Understand ${proposedQuestion}`,
        suggestedDestination: "blocking",
        rationale: "This looks like it may block finishing the current question.",
        status: "pending",
      },
    ],
  };
}

function projectStatusLine(context: LearningContext): string {
  const percent = context.projectSummary
    ? Math.round(context.projectSummary.completionLevel * 100)
    : 0;
  const focus = context.currentFocusNodeId
    ? context.materializedTree.find((node) => node.id === context.currentFocusNodeId)
        ?.question
    : undefined;
  return `About ${percent}% of materialized questions are completed.${focus ? ` Current focus: ${focus}.` : ""}`;
}

function looksLikeSummaryAssist(input: string): boolean {
  return (
    input.includes("整理") ||
    input.includes("learning summary") ||
    input.includes("summarize this question")
  );
}

function looksLikeEvidenceAssist(input: string): boolean {
  return input.includes("evidence") || input.includes("学习依据") || input.includes("依据");
}

function looksLikeCriterionAssist(input: string): boolean {
  return (
    input.includes("completion requirement") ||
    input.includes("完成要求") ||
    input.includes("definition of done")
  );
}

function deriveFollowUp(question: string, input: string): string {
  const trimmed = input.trim();
  if (trimmed.length > 8 && !looksLikeSummaryAssist(trimmed.toLowerCase())) {
    return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
  }
  return `What must be true before we can finish “${question}”?`;
}

function summaryProposal(nodeId: string, summary: string): LearningProposal {
  return {
    id: stubId("summary"),
    type: "summary",
    sourceNodeId: nodeId,
    summary,
    status: "pending",
  };
}

function stubId(kind: string): string {
  return `stub-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function delay<T>(value: T, delayMs: number): Promise<T> {
  if (delayMs <= 0) {
    return Promise.resolve(value);
  }
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delayMs);
  });
}
