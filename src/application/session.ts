import type { DomainError, DomainSnapshot } from "../domain/index.js";
import type { UiCommand } from "./commands.js";

export interface TreeSession {
  snapshot: DomainSnapshot;
  lastError?: DomainError;
  lastErrorCommand?: UiCommand["type"];
}

export function createSession(snapshot: DomainSnapshot): TreeSession {
  return { snapshot };
}
