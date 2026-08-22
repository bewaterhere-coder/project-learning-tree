import { describe, expect, it } from "vitest";
import { presentDomainError } from "../../src/application/errors.js";
import type { DomainError } from "../../src/application/index.js";
import { isMessageKey, messages, t } from "../../src/ui/i18n/messages.js";

const errorExamples: DomainError[] = [
  {
    kind: "InvalidLifecycleTransition",
    nodeId: "n1",
    from: "open",
    attempted: "close",
  },
  { kind: "InvalidActiveStack", reason: "cycle in parent chain" },
  { kind: "InvalidActiveStack", reason: "unknown stack problem" },
  { kind: "NodeNotFound", nodeId: "n1" },
  { kind: "CriterionNotSatisfied", nodeId: "n1", criterionId: "c1" },
  { kind: "MissingRequiredEvidence", nodeId: "n1", criterionId: "c1" },
  {
    kind: "UnresolvedBlockingChildren",
    nodeId: "n1",
    unresolvedChildIds: ["c1", "c2"],
  },
  { kind: "ReopenReasonRequired", nodeId: "n1" },
  { kind: "FrontierItemNotFound", frontierItemId: "f1" },
  { kind: "SummaryRequired", nodeId: "n1" },
  { kind: "CoreQuestionLimitReached", limit: 5 },
  { kind: "EvidenceNotFound", evidenceId: "e1" },
  { kind: "EvidenceNotOnNode", nodeId: "n1", evidenceId: "e1" },
  { kind: "PassNotCompletable", reason: "pass already completed" },
  { kind: "PassNotCompletable", reason: "unknown pass problem" },
  { kind: "NotActiveStackLeaf", nodeId: "n1" },
  { kind: "CannotReturnToParent", reason: "no current focus" },
  { kind: "CannotReturnToParent", reason: "unknown return problem" },
  { kind: "CriterionNotFound", nodeId: "n1", criterionId: "c1" },
];

describe("i18n message catalogs", () => {
  it("keeps en-US and zh-CN keys in parity with product copy", () => {
    const keys = Object.keys(messages["en-US"]);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(isMessageKey(key)).toBe(true);
      if (!isMessageKey(key)) {
        continue;
      }
      expect(messages["en-US"][key].length).toBeGreaterThan(0);
      expect(messages["zh-CN"][key].length).toBeGreaterThan(0);
    }
  });

  it("uses different zh-CN copy for user-facing chrome", () => {
    const required = [
      "sidebar.title",
      "inspector.title",
      "inspector.lifecycle",
      "inspector.blocked",
      "inspector.dod",
      "inspector.summary",
      "actions.close",
      "app.activeStack",
      "lifecycle.open",
      "error.dismiss",
    ] as const;
    for (const key of required) {
      expect(messages["zh-CN"][key]).not.toBe(messages["en-US"][key]);
    }
  });

  it("interpolates params in both locales and leaves unknown tokens", () => {
    expect(t("en-US", "node.blocked", { count: 2 })).toBe("2 open sub-questions");
    expect(t("zh-CN", "node.blocked", { count: 2 })).toBe("有 2 个子问题待解决");
    expect(t("en-US", "node.blocked")).toBe("{count} open sub-questions");
  });

  it("covers every DomainError presentation key in both catalogs", () => {
    for (const error of errorExamples) {
      const presented = presentDomainError(error);
      expect(isMessageKey(presented.key)).toBe(true);
      if (!isMessageKey(presented.key)) {
        continue;
      }
      const en = t("en-US", presented.key, presented.params);
      const zh = t("zh-CN", presented.key, presented.params);
      expect(en.length).toBeGreaterThan(0);
      expect(zh.length).toBeGreaterThan(0);
      expect(zh).not.toBe(en);
      expect(en).not.toMatch(/Cannot close/);
      expect(en.toLowerCase()).not.toContain("node n1");
    }
  });
});
