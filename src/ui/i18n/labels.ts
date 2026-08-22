import type { LearningDepth, NodeLifecycle } from "../../application/index.js";
import type { MessageKey } from "./messages.js";

export function lifecycleMessageKey(lifecycle: NodeLifecycle): MessageKey {
  switch (lifecycle) {
    case "open":
      return "lifecycle.open";
    case "active":
      return "lifecycle.active";
    case "parked":
      return "lifecycle.parked";
    case "closed":
      return "lifecycle.closed";
  }
}

export function depthMessageKey(depth: LearningDepth): MessageKey {
  switch (depth) {
    case "L1":
      return "depth.L1";
    case "L2":
      return "depth.L2";
    case "L3":
      return "depth.L3";
  }
}

export function criterionStatusKey(
  status: "satisfied" | "unsatisfied",
): MessageKey {
  return status === "satisfied" ? "criterion.satisfied" : "criterion.unsatisfied";
}
