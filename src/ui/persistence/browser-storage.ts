import type { PreferenceStorage } from "../../workspace/index.js";

export function createBrowserPreferenceStorage(): PreferenceStorage {
  return {
    getItem(key: string): string | null {
      try {
        return globalThis.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      try {
        globalThis.localStorage.setItem(key, value);
      } catch {
        // Ignore quota / private-mode failures; UI prefs are optional.
      }
    },
  };
}
