import type { NodeLifecycle } from "./types.js";

const LEGAL: ReadonlyArray<readonly [NodeLifecycle, NodeLifecycle, string]> = [
  ["open", "active", "activate"],
  ["active", "parked", "park"],
  ["parked", "active", "resume"],
  ["open", "closed", "close"],
  ["active", "closed", "close"],
  ["parked", "closed", "close"],
  ["closed", "open", "reopen"],
  ["active", "open", "leave-stack"],
];

export function isLegalTransition(
  from: NodeLifecycle,
  to: NodeLifecycle,
  attempted: string,
): boolean {
  return LEGAL.some(
    ([source, target, via]) =>
      source === from && target === to && (via === attempted || attempted === "*"),
  );
}

export function canBecomeActive(lifecycle: NodeLifecycle): boolean {
  return lifecycle === "open" || lifecycle === "active";
}
