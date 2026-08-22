export function layoutOnlyNodeChanges<T extends { type: string }>(
  changes: readonly T[],
): T[] {
  return changes.filter(
    (change) =>
      change.type === "position" ||
      change.type === "select" ||
      change.type === "dimensions",
  );
}
