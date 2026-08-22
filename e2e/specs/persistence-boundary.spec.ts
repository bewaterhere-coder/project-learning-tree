import { expect, test } from "../fixtures/test.js";
import {
  getConversationStore,
  getPreferenceStore,
  getSemanticStore,
} from "../helpers/local-storage.js";
import { createProject, openApp, openSettings } from "../helpers/project.js";

test("theme, locale, and sidebar toggle do not rewrite semantic storage", async ({
  page,
}) => {
  await openApp(page);
  await createProject(page, "Persist Boundary");

  const semanticBefore = await getSemanticStore(page);
  expect(semanticBefore).not.toBeNull();
  const prefsBefore = await getPreferenceStore(page);

  await openSettings(page);
  await page.getByTestId("theme-dark").click();
  await page.getByTestId("theme-light").click();
  await page.getByTestId("locale-zh").click();
  await page.getByTestId("locale-en").click();
  await page.keyboard.press("Escape");

  await page.getByTestId("sidebar-toggle").click();
  await expect(page.getByTestId("project-sidebar")).toHaveAttribute(
    "data-open",
    "false",
  );
  await page.getByTestId("sidebar-toggle").click();
  await expect(page.getByTestId("project-sidebar")).toHaveAttribute(
    "data-open",
    "true",
  );

  expect(await getSemanticStore(page)).toBe(semanticBefore);
  const prefsAfter = await getPreferenceStore(page);
  expect(prefsAfter).not.toBeNull();
  expect(prefsAfter).not.toBe(prefsBefore);
  expect(await getConversationStore(page)).toBeNull();
});

test("opening chat writes conversation chrome to preferences, not semantic or conversation stores", async ({
  page,
}) => {
  await openApp(page);
  await createProject(page, "Chat Boundary");
  const semanticBefore = await getSemanticStore(page);

  await page.getByTestId("chat-open-header").click();
  await expect(page.getByTestId("chat-panel")).toBeVisible();

  expect(await getSemanticStore(page)).toBe(semanticBefore);
  const prefs = await getPreferenceStore(page);
  expect(prefs).toContain("chatOpen");
  expect(await getConversationStore(page)).toBeNull();
});
