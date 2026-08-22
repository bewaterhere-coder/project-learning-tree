import type { DomainError, DomainSnapshot } from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { presentDomainError } from "../../application/index.js";
import { isMessageKey, t } from "./messages.js";

export function formatPresentedError(
  locale: WorkspaceLocale,
  error: DomainError,
  snapshot?: DomainSnapshot,
): string {
  const presented = presentDomainError(error, snapshot);
  if (!isMessageKey(presented.key)) {
    return t(locale, "error.generic", presented.params);
  }
  return t(locale, presented.key, presented.params);
}
