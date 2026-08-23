import type { GenerationLocale } from "../../framework/locale.js";
import { chatSuggestionJsonExample } from "../../ai/schema.js";
import type {
  NodeChatContext,
  NodeChatHistoryMessage,
  NodeChatRequest,
} from "./types.js";

export function buildNodeChatMessages(request: NodeChatRequest): Array<{
  role: "system" | "user" | "assistant";
  content: string;
}> {
  const locale = request.locale ?? "en-US";
  const systemPrompt =
    locale === "zh-CN" ? buildChineseSystemPrompt() : buildEnglishSystemPrompt();
  const contextPrompt = buildContextPrompt(request.context, locale);
  const history = (request.history ?? []).map((message) => ({
    role: message.role,
    content: message.content,
  }));
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: contextPrompt },
    ...history,
    { role: "user", content: request.input },
  ];
}

function buildEnglishSystemPrompt(): string {
  return [
    "You are a learning assistant for Project Learning Tree.",
    "Reply only with valid JSON using this schema:",
    chatSuggestionJsonExample(),
    "Provide a helpful answer and up to three question suggestions.",
    "Each suggestion must use type \"question\" and a short content string.",
    "Do not propose creating nodes or mutating the learning tree.",
    "Do not wrap JSON in markdown fences.",
  ].join(" ");
}

function buildChineseSystemPrompt(): string {
  return [
    "你是 Project Learning Tree 的学习助手。",
    "请只返回合法 JSON，格式如下：",
    chatSuggestionJsonExample(),
    "给出有帮助的回答，并提供最多三条 question 类型建议。",
    "每条建议必须使用 type \"question\" 和简短的 content。",
    "不要建议自动创建节点或修改学习树。",
    "不要用 markdown 代码块包裹 JSON。",
  ].join(" ");
}

function buildContextPrompt(context: NodeChatContext, locale: GenerationLocale): string {
  const lines: string[] = [];
  if (locale === "zh-CN") {
    lines.push(`项目：${context.project.name}`);
    if (context.project.source) {
      lines.push(`来源：${context.project.source}`);
    }
    if (context.parentNode) {
      lines.push(`父节点：${context.parentNode.question}`);
    }
    if (context.node) {
      lines.push(`当前节点：${context.node.question}`);
      lines.push(`目标：${context.node.goal}`);
      lines.push(`状态：${context.node.lifecycle}`);
    }
    lines.push("请基于以上上下文回答用户问题。");
    return lines.join("\n");
  }

  lines.push(`Project: ${context.project.name}`);
  if (context.project.source) {
    lines.push(`Source: ${context.project.source}`);
  }
  if (context.parentNode) {
    lines.push(`Parent node: ${context.parentNode.question}`);
  }
  if (context.node) {
    lines.push(`Current node: ${context.node.question}`);
    lines.push(`Goal: ${context.node.goal}`);
    lines.push(`Lifecycle: ${context.node.lifecycle}`);
  }
  lines.push("Use this context when answering the user.");
  return lines.join("\n");
}

export function extractNodeChatHistory(
  messages: NodeChatHistoryMessage[],
): NodeChatHistoryMessage[] {
  return messages.map((message) => ({ ...message }));
}
