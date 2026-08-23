/** @vitest-environment jsdom */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/ui/App.js";
import {
  CHAT_COMPOSER_MAX_HEIGHT_PX,
  MessageComposer,
  syncComposerHeight,
} from "../../src/ui/chat/MessageComposer.js";
import { createDemoWorkspaceFixture } from "../../src/fixtures/demo-workspace.js";
import {
  createMemoryPreferenceStorage,
  openChat,
  WORKSPACE_PREFERENCES_KEY,
} from "../../src/workspace/index.js";

vi.mock("@xyflow/react", () => import("./xyflow-stub.js"));

function mockTextareaScrollHeight(lineHeight = 28): () => void {
  const previous = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "scrollHeight",
  );
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLTextAreaElement) {
      const lines = this.value === "" ? 1 : this.value.split("\n").length;
      return Math.max(44, lines * lineHeight);
    },
  });
  return () => {
    if (previous) {
      Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", previous);
    } else {
      delete (HTMLTextAreaElement.prototype as { scrollHeight?: unknown }).scrollHeight;
    }
  };
}

describe("PR-038 canvas chat interaction polish", () => {
  const restorers: Array<() => void> = [];
  afterEach(() => {
    while (restorers.length > 0) {
      restorers.pop()?.();
    }
  });

  it("disables multi-selection keys on the canvas host", () => {
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const host = screen.getByTestId("tree-nodes");
    expect(host).toHaveAttribute("data-multi-selection", "none");
    expect(host).toHaveAttribute("data-selection-key", "none");
  });

  it("dragging one node does not move sibling coordinates", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(<App initialWorkspace={workspace} preferenceStorage={storage} />);

    const peerX = screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-x");
    const peerY = screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-y");

    await user.click(screen.getByTestId(`node-drag-${projectA.ids.q2}`));

    await waitFor(() => {
      expect(screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-x")).not.toBe(
        null,
      );
    });
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute("data-x", peerX);
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute("data-y", peerY);

    const prefs = storage.getItem(WORKSPACE_PREFERENCES_KEY) ?? "";
    expect(prefs).toContain(projectA.ids.q2);
  });

  it("rejects multi-node position batches so only the dragged node moves", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={workspace}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );

    const peerBefore = {
      x: screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-x"),
      y: screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-y"),
    };
    const focusBefore = {
      x: screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-x"),
      y: screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-y"),
    };

    await user.click(screen.getByTestId(`node-multi-select-drag-${projectA.ids.q2}`));

    await waitFor(() => {
      expect(screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-x")).not.toBe(
        focusBefore.x,
      );
    });
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-x",
      peerBefore.x,
    );
    expect(screen.getByTestId(`node-${projectA.ids.q1}`)).toHaveAttribute(
      "data-y",
      peerBefore.y,
    );
  });

  it("keeps the dragged non-focus node when a multi-position batch also moves the focus peer", async () => {
    const user = userEvent.setup();
    const { workspace, projectA } = createDemoWorkspaceFixture();
    const storage = createMemoryPreferenceStorage();
    render(<App initialWorkspace={workspace} preferenceStorage={storage} />);

    // Demo focus is q2; drag q1 while a spurious batch also tries to move q2.
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-focus",
      "true",
    );
    const focusBefore = {
      x: screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-x"),
      y: screen.getByTestId(`node-${projectA.ids.q2}`).getAttribute("data-y"),
    };
    const draggedBefore = {
      x: screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-x"),
      y: screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-y"),
    };

    await user.click(screen.getByTestId(`node-multi-select-drag-${projectA.ids.q1}`));

    await waitFor(() => {
      expect(screen.getByTestId(`node-${projectA.ids.q1}`).getAttribute("data-x")).not.toBe(
        draggedBefore.x,
      );
    });
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-x",
      focusBefore.x,
    );
    expect(screen.getByTestId(`node-${projectA.ids.q2}`)).toHaveAttribute(
      "data-y",
      focusBefore.y,
    );
    const prefs = storage.getItem(WORKSPACE_PREFERENCES_KEY) ?? "";
    expect(prefs).toContain(projectA.ids.q1);
  });

  it("ships motion tokens and reduced-motion rules without node position transitions", () => {
    const cssPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../../src/ui/styles.css",
    );
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("--motion-slow:");
    expect(css).toContain("--motion-ease:");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("field-sizing: content");
    expect(css).toMatch(/\.learning-node\s*\{[^}]*transition:/s);
    expect(css).not.toMatch(
      /\.learning-node\s*\{[^}]*(?:left|top|transform)\s*:[^;]*transition/s,
    );
  });

  it("syncComposerHeight grows with content and caps at the maximum", () => {
    const el = document.createElement("textarea");
    Object.defineProperty(el, "scrollHeight", {
      configurable: true,
      get: () => 96,
    });
    syncComposerHeight(el);
    expect(el.style.height).toBe("96px");

    Object.defineProperty(el, "scrollHeight", {
      configurable: true,
      get: () => 480,
    });
    syncComposerHeight(el);
    expect(el.style.height).toBe(`${CHAT_COMPOSER_MAX_HEIGHT_PX}px`);
  });

  it("auto-grows the chat composer after Shift+Enter newlines", async () => {
    restorers.push(mockTextareaScrollHeight());
    const user = userEvent.setup();
    const { workspace } = createDemoWorkspaceFixture();
    render(
      <App
        initialWorkspace={openChat(workspace)}
        preferenceStorage={createMemoryPreferenceStorage()}
      />,
    );
    const input = screen.getByTestId("chat-input") as HTMLTextAreaElement;
    expect(Number.parseInt(input.style.height || "44", 10)).toBeLessThanOrEqual(44);

    await user.type(
      input,
      "hello{Shift>}{Enter}{/Shift}world{Shift>}{Enter}{/Shift}again",
    );
    await waitFor(() => {
      expect(Number.parseInt(input.style.height, 10)).toBeGreaterThan(44);
      expect(Number.parseInt(input.style.height, 10)).toBeLessThanOrEqual(
        CHAT_COMPOSER_MAX_HEIGHT_PX,
      );
    });
  });

  it("MessageComposer applies auto-grow on controlled multi-line value", async () => {
    restorers.push(mockTextareaScrollHeight());
    const user = userEvent.setup();
    render(
      <MessageComposer
        locale="en-US"
        disabled={false}
        placeholderKey="chat.composerPlaceholder"
        onSend={() => undefined}
      />,
    );
    const input = screen.getByTestId("chat-input") as HTMLTextAreaElement;
    await user.type(input, "a{Shift>}{Enter}{/Shift}b{Shift>}{Enter}{/Shift}c");
    await waitFor(() => {
      expect(Number.parseInt(input.style.height, 10)).toBeGreaterThan(44);
    });
  });
});
