export type DiscoveryDestination = "blocking" | "frontier";

export interface DiscoveryClassification {
  destination: DiscoveryDestination;
  reason: string;
}

/**
 * Adjacent discoveries become Blocking Children only when they block the
 * current question's Definition of Done. Everything else stays in Frontier.
 */
export function classifyDiscovery(input: {
  blocksCurrentDefinitionOfDone: boolean;
}): DiscoveryClassification {
  if (input.blocksCurrentDefinitionOfDone) {
    return {
      destination: "blocking",
      reason: "This question blocks the current Definition of Done.",
    };
  }
  return {
    destination: "frontier",
    reason: "Relevant but non-blocking; keep it in the Learning Frontier.",
  };
}
