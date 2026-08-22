import type { WorkspaceLocale } from "../../workspace/index.js";

const enUS = {
  "app.title": "Project Learning Tree",
  "app.activeStack": "Current learning path:",
  "app.activeStackEmpty": "(empty)",
  "app.localeEn": "EN",
  "app.localeZh": "中文",
  "sidebar.title": "Projects",
  "sidebar.collapse": "Collapse project sidebar",
  "sidebar.expand": "Expand project sidebar",
  "sidebar.noActiveQuestion": "No active question",
  "inspector.title": "Question details",
  "inspector.close": "Close details",
  "inspector.open": "Open details",
  "inspector.noFocus": "No question is selected.",
  "inspector.question": "Question",
  "inspector.goal": "Goal",
  "inspector.targetDepth": "Target depth",
  "inspector.lifecycle": "Learning status",
  "inspector.blocked": "Open sub-questions",
  "inspector.blockedNone": "None",
  "inspector.dod": "Completion requirements",
  "inspector.noCriteria": "No completion requirements.",
  "inspector.evidence": "Evidence",
  "inspector.noEvidence": "No evidence yet.",
  "inspector.summary": "Learning summary",
  "inspector.noSummary": "No summary yet.",
  "inspector.required": "required",
  "inspector.optional": "optional",
  "inspector.evidenceRequired": "evidence required",
  "lifecycle.open": "To start",
  "lifecycle.active": "Learning",
  "lifecycle.parked": "Continue later",
  "lifecycle.closed": "Completed",
  "criterion.satisfied": "Done",
  "criterion.unsatisfied": "Not done",
  "depth.L1": "Level 1",
  "depth.L2": "Level 2",
  "depth.L3": "Level 3",
  "node.blocked": "{count} open sub-questions",
  "actions.startLearning": "Start learning",
  "actions.enterQuestion": "Enter this question",
  "actions.park": "Pause",
  "actions.resume": "Resume",
  "actions.close": "Complete",
  "actions.returnToParent": "Return to previous question",
  "close.stillNeeded": "Still needed:",
  "close.needSummary": "Learning summary",
  "close.needCriterion": "Complete “{description}”",
  "close.needEvidence": "Add required evidence for “{description}”",
  "close.needChild": "Complete “{question}” first",
  "close.needChildren": "{count} open sub-questions",
  "status.done": "Done",
  "status.missingSummary": "Not filled yet",
  "status.missingEvidence": "Missing evidence",
  "status.criterionUnmet": "Not done",
  "status.openChildren": "{count} open sub-questions remaining",
  "error.dismiss": "Dismiss",
  "error.generic": "Something went wrong.",
  "error.InvalidLifecycleTransition":
    "This action isn’t available in the current learning state.",
  "error.InvalidActiveStack": "The current learning path is invalid.",
  "error.InvalidActiveStack.cycle": "The current learning path contains a loop.",
  "error.InvalidActiveStack.notRoot":
    "The current learning path must start from a root question.",
  "error.InvalidActiveStack.incomplete": "The current learning path is incomplete.",
  "error.InvalidActiveStack.notChain":
    "The current learning path is not a connected sequence of questions.",
  "error.InvalidActiveStack.duplicate":
    "The current learning path lists the same question more than once.",
  "error.InvalidActiveStack.missing": "The current learning path is missing a question.",
  "error.NodeNotFound": "That question could not be found.",
  "error.CriterionNotSatisfied": "Complete the required condition: {description}",
  "error.MissingRequiredEvidence": "Add required evidence for “{description}”",
  "error.UnresolvedBlockingChildren":
    "{count} open sub-questions still need to be completed.",
  "error.ReopenReasonRequired": "A reason is required to reopen this question.",
  "error.FrontierItemNotFound": "That saved question could not be found.",
  "error.SummaryRequired":
    "A learning summary is required before completing this question.",
  "error.CoreQuestionLimitReached":
    "A learning pass may have at most {limit} core questions.",
  "error.EvidenceNotFound": "That evidence could not be found.",
  "error.EvidenceNotOnNode": "That evidence does not belong to this question.",
  "error.PassNotCompletable": "This learning pass cannot be completed yet.",
  "error.PassNotCompletable.alreadyCompleted": "This learning pass is already completed.",
  "error.PassNotCompletable.stackNotEmpty":
    "Finish or pause the current learning path before completing the pass.",
  "error.PassNotCompletable.rootsOpen":
    "Every root question must be completed before completing the pass.",
  "error.NotActiveStackLeaf":
    "This question is not the current step on the learning path.",
  "error.CannotReturnToParent": "Can't return to the previous question.",
  "error.CannotReturnToParent.noFocus": "Select a question before returning.",
  "error.CannotReturnToParent.root": "This question has no previous question to return to.",
  "error.CriterionNotFound": "That completion requirement could not be found.",
} as const;

export type MessageKey = keyof typeof enUS;

const zhCN: Record<MessageKey, string> = {
  "app.title": "项目学习树",
  "app.activeStack": "当前学习路径：",
  "app.activeStackEmpty": "（空）",
  "app.localeEn": "EN",
  "app.localeZh": "中文",
  "sidebar.title": "学习项目",
  "sidebar.collapse": "折叠项目侧栏",
  "sidebar.expand": "展开项目侧栏",
  "sidebar.noActiveQuestion": "暂无进行中的问题",
  "inspector.title": "问题详情",
  "inspector.close": "关闭详情",
  "inspector.open": "打开详情",
  "inspector.noFocus": "尚未选择问题。",
  "inspector.question": "问题",
  "inspector.goal": "目标",
  "inspector.targetDepth": "目标深度",
  "inspector.lifecycle": "学习状态",
  "inspector.blocked": "待解决子问题",
  "inspector.blockedNone": "无",
  "inspector.dod": "完成要求",
  "inspector.noCriteria": "尚无完成要求。",
  "inspector.evidence": "证据",
  "inspector.noEvidence": "尚无证据。",
  "inspector.summary": "学习总结",
  "inspector.noSummary": "尚未填写学习总结。",
  "inspector.required": "必需",
  "inspector.optional": "可选",
  "inspector.evidenceRequired": "需要证据",
  "lifecycle.open": "待开始",
  "lifecycle.active": "学习中",
  "lifecycle.parked": "稍后继续",
  "lifecycle.closed": "已完成",
  "criterion.satisfied": "已完成",
  "criterion.unsatisfied": "未完成",
  "depth.L1": "第 1 层",
  "depth.L2": "第 2 层",
  "depth.L3": "第 3 层",
  "node.blocked": "有 {count} 个子问题待解决",
  "actions.startLearning": "开始学习",
  "actions.enterQuestion": "进入这个问题",
  "actions.park": "暂停",
  "actions.resume": "继续",
  "actions.close": "完成问题",
  "actions.returnToParent": "返回上一问",
  "close.stillNeeded": "还需完成：",
  "close.needSummary": "学习总结",
  "close.needCriterion": "完成「{description}」",
  "close.needEvidence": "为「{description}」补充必要证据",
  "close.needChild": "请先完成「{question}」",
  "close.needChildren": "还有 {count} 个子问题待解决",
  "status.done": "已完成",
  "status.missingSummary": "尚未填写",
  "status.missingEvidence": "缺少证据",
  "status.criterionUnmet": "未完成",
  "status.openChildren": "还有 {count} 个子问题待解决",
  "error.dismiss": "关闭",
  "error.generic": "出现了问题。",
  "error.InvalidLifecycleTransition": "当前学习状态下无法执行这个操作。",
  "error.InvalidActiveStack": "当前学习路径无效。",
  "error.InvalidActiveStack.cycle": "当前学习路径存在循环。",
  "error.InvalidActiveStack.notRoot": "当前学习路径必须从根问题开始。",
  "error.InvalidActiveStack.incomplete": "当前学习路径不完整。",
  "error.InvalidActiveStack.notChain": "当前学习路径不是连续的问题序列。",
  "error.InvalidActiveStack.duplicate": "当前学习路径中出现了重复的问题。",
  "error.InvalidActiveStack.missing": "当前学习路径缺少问题。",
  "error.NodeNotFound": "找不到这个问题。",
  "error.CriterionNotSatisfied": "请完成要求：{description}",
  "error.MissingRequiredEvidence": "为「{description}」补充必要证据",
  "error.UnresolvedBlockingChildren": "还有 {count} 个子问题待解决。",
  "error.ReopenReasonRequired": "重新打开这个问题需要填写原因。",
  "error.FrontierItemNotFound": "找不到这条已保存的问题。",
  "error.SummaryRequired": "完成这个问题前需要填写学习总结。",
  "error.CoreQuestionLimitReached": "一次学习最多只能有 {limit} 个核心问题。",
  "error.EvidenceNotFound": "找不到这条证据。",
  "error.EvidenceNotOnNode": "这条证据不属于当前问题。",
  "error.PassNotCompletable": "这次学习还不能结束。",
  "error.PassNotCompletable.alreadyCompleted": "这次学习已经结束。",
  "error.PassNotCompletable.stackNotEmpty": "请先完成或暂停当前学习路径，再结束这次学习。",
  "error.PassNotCompletable.rootsOpen": "结束这次学习前，所有根问题都需要完成。",
  "error.NotActiveStackLeaf": "这个问题不是当前学习路径上的这一步。",
  "error.CannotReturnToParent": "无法返回上一问。",
  "error.CannotReturnToParent.noFocus": "请先选择一个问题再返回。",
  "error.CannotReturnToParent.root": "这个问题没有可返回的上一问。",
  "error.CriterionNotFound": "找不到这条完成要求。",
};

export const messages = {
  "en-US": enUS,
  "zh-CN": zhCN,
} as const;

export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function t(
  locale: WorkspaceLocale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = messages[locale][key] ?? messages["en-US"][key];
  return interpolate(template, params);
}

export function isMessageKey(key: string): key is MessageKey {
  return key in messages["en-US"];
}
