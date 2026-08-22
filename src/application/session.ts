import type { DomainError, DomainSnapshot } from "../domain/index.js";

export interface TreeSession {
  snapshot: DomainSnapshot;
  lastError?: DomainError;
}

export function createSession(snapshot: DomainSnapshot): TreeSession {
  return { snapshot };
}
