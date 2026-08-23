export function layoutOnlyNodeChanges<T extends { type: string }>(
  changes: readonly T[],
): T[] {
  // Intentionally omit `select` — selection is patched in place to avoid
  // remapping the full controlled tree (canvas flash).
  return changes.filter(
    (change) => change.type === "position" || change.type === "dimensions",
  );
}

export function selectionNodeChanges<T extends { type: string }>(
  changes: readonly T[],
): T[] {
  return changes.filter((change) => change.type === "select");
}
