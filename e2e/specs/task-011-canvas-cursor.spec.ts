import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "../fixtures/test.js";
import { createProject, openApp, openSettings } from "../helpers/project.js";

const evidenceDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../docs/milestones/task-011-light-mode-canvas-cursor",
);

async function paneCursor(page: import("@playwright/test").Page): Promise<string> {
  return page.locator(".react-flow__pane").evaluate((el) => getComputedStyle(el).cursor);
}

test("light mode pane uses high-contrast custom grab cursor with native fallback", async ({
  page,
}) => {
  await openApp(page);
  await createProject(page, "Cursor Light");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".react-flow__pane.draggable")).toBeVisible();

  const at100 = await paneCursor(page);
  expect(at100).toMatch(/url\(/);
  expect(at100).toMatch(/data:image\/svg\+xml|canvas-grab/);
  expect(at100).toMatch(/grab/);
  expect(at100.toLowerCase()).toMatch(/f7f4ef/);
  expect(at100.toLowerCase()).toMatch(/1c1917/);

  // Force XYFlow dragging class to verify the grabbing cursor rule binds
  // (Playwright mouse pan does not always flip `.dragging` under CI timing).
  await page.locator(".react-flow__pane").evaluate((el) => {
    el.classList.add("dragging");
  });
  const whileDragging = await paneCursor(page);
  await page.locator(".react-flow__pane").evaluate((el) => {
    el.classList.remove("dragging");
  });
  expect(whileDragging).toMatch(/url\(/);
  expect(whileDragging).toMatch(/grabbing/);
  expect(whileDragging.toLowerCase()).toMatch(/f7f4ef/);
  expect(whileDragging.toLowerCase()).toMatch(/1c1917/);

  // Non-100% browser zoom (CDP) — cursor declaration must remain applied.
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1.25 });
  const at125 = await paneCursor(page);
  expect(at125).toMatch(/url\(/);
  expect(at125).toMatch(/data:image\/svg\+xml|canvas-grab/);

  mkdirSync(evidenceDir, { recursive: true });
  const evidence = {
    capturedAt: new Date().toISOString(),
    theme: "light",
    cursorAt100: at100,
    cursorWhileDragging: whileDragging,
    cursorAt125Zoom: at125,
    notes:
      "Vite may inline SVG cursors as data:image/svg+xml; dual-tone #F7F4EF/#1C1917 must remain in the computed cursor.",
    verdict:
      /url\(/.test(at100) &&
      /grab/.test(at100) &&
      /f7f4ef/i.test(at100) &&
      /1c1917/i.test(at100) &&
      /url\(/.test(at125) &&
      /grabbing/.test(whileDragging)
        ? "pass"
        : "fail",
  };
  writeFileSync(
    path.join(evidenceDir, "cursor-verification.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  await page.locator(".tree-pane").screenshot({
    path: path.join(evidenceDir, "light-canvas-100.png"),
  });
});

test("dark mode does not apply the light-mode custom pane cursors", async ({ page }) => {
  await openApp(page);
  await createProject(page, "Cursor Dark");
  await openSettings(page);
  await page.getByTestId("theme-dark").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("Escape");

  const cursor = await paneCursor(page);
  expect(cursor).not.toMatch(/canvas-grab\.svg/);
  expect(cursor).not.toMatch(/canvas-grabbing\.svg/);

  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(
    path.join(evidenceDir, "dark-mode-cursor.json"),
    `${JSON.stringify({ capturedAt: new Date().toISOString(), cursor, verdict: "pass" }, null, 2)}\n`,
  );
});
