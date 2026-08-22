/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  createMemoryPreferenceStorage,
  updateShell,
  WORKSPACE_SEMANTIC_KEY,
  WORKSPACE_THEME_HINT_KEY,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

function trackingStorage() {
  const inner = createMemoryPreferenceStorage();
  const writes: string[] = [];
  return {
    getItem: (key: string) => inner.getItem(key),
    setItem: (key: string, value: string) => {
      writes.push(key);
      inner.setItem(key, value);
    },
    writes,
    inner,
  };
}

function installMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const media = {
    matches,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    },
    removeEventListener: (
      _event: string,
      listener: (event: MediaQueryListEvent) => void,
    ) => {
      listeners.delete(listener);
    },
    dispatch(next: boolean) {
      media.matches = next;
      listeners.forEach((listener) =>
        listener({ matches: next } as MediaQueryListEvent),
      );
    },
  };
  vi.stubGlobal("matchMedia", () => media);
  return media;
}

function expectTheme(resolved: "light" | "dark") {
  expect(document.documentElement.dataset.theme).toBe(resolved);
  expect(screen.getByTestId("shell")).toHaveAttribute("data-theme", resolved);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("theme resolution", () => {
  it("switches dark to light and light to dark on the same turn", async () => {
    const user = userEvent.setup();
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={updateShell(workspace, { colorScheme: "dark" })}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    expectTheme("dark");
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("theme-light"));
    expectTheme("light");
    await user.click(screen.getByTestId("theme-dark"));
    expectTheme("dark");
  });

  it("resolves system from the OS preference and follows OS changes only in system mode", async () => {
    const user = userEvent.setup();
    const media = installMatchMedia(false);
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={updateShell(workspace, { colorScheme: "system" })}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    expectTheme("light");
    media.dispatch(true);
    await waitFor(() => expectTheme("dark"));
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("theme-light"));
    expectTheme("light");
    media.dispatch(false);
    await waitFor(() => expectTheme("light"));
    await user.click(screen.getByTestId("theme-dark"));
    expectTheme("dark");
    media.dispatch(true);
    await waitFor(() => expectTheme("dark"));
    media.dispatch(false);
    await waitFor(() => expectTheme("dark"));
    await user.click(screen.getByTestId("theme-system"));
    expectTheme("light");
  });

  it("uses light system while OS is light after leaving dark, and dark system while OS is dark after leaving light", async () => {
    const user = userEvent.setup();
    const media = installMatchMedia(false);
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={updateShell(workspace, { colorScheme: "dark" })}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("theme-system"));
    expectTheme("light");
    await user.click(screen.getByTestId("theme-light"));
    media.dispatch(true);
    await user.click(screen.getByTestId("theme-system"));
    expectTheme("dark");
  });

  it("lets preferences win over a stale boot hint without writing the semantic store", async () => {
    const user = userEvent.setup();
    const storage = trackingStorage();
    storage.setItem(WORKSPACE_THEME_HINT_KEY, "dark");
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={updateShell(workspace, { colorScheme: "light" })}
        preferenceStorage={storage}
      />,
    );
    expectTheme("light");
    storage.writes.length = 0;
    await user.click(screen.getByTestId("settings-open"));
    await user.click(screen.getByTestId("theme-dark"));
    expectTheme("dark");
    expect(storage.writes.includes(WORKSPACE_SEMANTIC_KEY)).toBe(false);
  });
});
