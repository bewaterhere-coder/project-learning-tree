import type { LearningContext } from "../application/selectors/learning-context.js";
import type { ChatProvider } from "./provider.js";
import type { ChatReply, LearningProposal } from "./types.js";
import type { GenerationLocale } from "../framework/locale.js";

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
      return delay(
        defaultStubReply(request.context, request.input, request.locale ?? "en-US"),
        delayMs,
      );
    },
  };
}

function defaultStubReply(
  context: LearningContext,
  input: string,
  locale: GenerationLocale,
): ChatReply {
  const lowered = input.toLowerCase();
  const nodeId =
    context.identity.kind === "node" ? context.identity.nodeId : undefined;
  const question = context.node?.question ?? context.project.name;
  const zh = locale === "zh-CN";

  if (context.identity.kind === "project") {
    return {
      answer: zh
        ? `从整体看 ${context.project.name}。${projectStatusLine(context, zh)}`
        : `Looking at ${context.project.name} as a whole. ${projectStatusLine(context, zh)}`,
      proposals: [],
    };
  }

  if (nodeId === undefined) {
    return {
      answer: zh
        ? `我可以围绕 ${context.project.name} 继续讨论。`
        : `I can discuss ${context.project.name}.`,
      proposals: [],
    };
  }

  if (looksLikeSummaryAssist(lowered)) {
    const summary =
      context.node?.summary ??
      (zh
        ? `在当前深度下，${question} 可以这样理解：${context.node?.goal ?? question}。`
        : `At this depth, ${question} is understood as: ${context.node?.goal ?? question}.`);
    return {
      answer: zh
        ? "这是一份学习心得草稿，不是对话摘要。"
        : "Here is a learning summary draft for this question. It is not a chat transcript.",
      proposals: [summaryProposal(nodeId, summary)],
    };
  }

  if (looksLikeEvidenceAssist(lowered)) {
    return {
      answer: zh
        ? "这看起来值得保留为学习依据。"
        : "This looks like something worth keeping as learning evidence.",
      proposals: [
        {
          id: stubId("evidence"),
          type: "evidence",
          sourceNodeId: nodeId,
          evidenceType: "note",
          reference: input.slice(0, 160),
          note: zh
            ? `来自当前问题的建议：${question}`
            : `Suggested from the current question: ${question}`,
          status: "pending",
        },
      ],
    };
  }

  if (looksLikeCriterionAssist(lowered)) {
    return {
      answer: zh
        ? "一条能让这个问题算完成的达成条件："
        : "A completion requirement that would make this question done:",
      proposals: [
        {
          id: stubId("criterion"),
          type: "criterion",
          sourceNodeId: nodeId,
          description: zh
            ? `能清楚解释 ${question}`
            : `Be able to explain ${question}`,
          required: true,
          evidenceRequired: false,
          status: "pending",
        },
      ],
    };
  }

  const proposedQuestion = deriveFollowUp(question, input, zh);
  return {
    answer: zh
      ? `围绕「${question}」继续。${context.node?.goal ? `目标：${context.node.goal}。` : ""}我可以基于当前问题的学习上下文继续展开。`
      : `Working from “${question}”. ${context.node?.goal ? `Goal: ${context.node.goal}. ` : ""}I can keep going from this node’s current learning context.`,
    proposals: [
      {
        id: stubId("question"),
        type: "question",
        sourceNodeId: nodeId,
        question: proposedQuestion,
        goal: zh ? `理解 ${proposedQuestion}` : `Understand ${proposedQuestion}`,
        suggestedDestination: "blocking",
        rationale: zh
          ? "这看起来可能会阻塞完成当前问题。"
          : "This looks like it may block finishing the current question.",
        status: "pending",
      },
    ],
  };
}

function projectStatusLine(context: LearningContext, zh: boolean): string {
  const percent = context.projectSummary
    ? Math.round(context.projectSummary.completionLevel * 100)
    : 0;
  const focus = context.currentFocusNodeId
    ? context.materializedTree.find((node) => node.id === context.currentFocusNodeId)
        ?.question
    : undefined;
  if (zh) {
    return `大约 ${percent}% 的已展开问题已完成。${focus ? ` 当前焦点：${focus}。` : ""}`;
  }
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
    input.includes("definition of done") ||
    input.includes("达成条件")
  );
}

function deriveFollowUp(question: string, input: string, zh: boolean): string {
  const trimmed = input.trim();
  if (trimmed.length > 8 && !looksLikeSummaryAssist(trimmed.toLowerCase())) {
    if (trimmed.endsWith("?") || trimmed.endsWith("？")) {
      return trimmed;
    }
    return zh ? `${trimmed}？` : `${trimmed}?`;
  }
  return zh
    ? `在完成「${question}」之前，还需要先弄清楚什么？`
    : `What must be true before we can finish “${question}”?`;
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
