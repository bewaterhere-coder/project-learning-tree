import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 1024,
      height: 768,
      top: 0,
      left: 0,
      right: 1024,
      bottom: 768,
      toJSON() {
        return {};
      },
    }) as DOMRect;
}

afterEach(() => {
  if (typeof document !== "undefined") {
    cleanup();
  }
});
