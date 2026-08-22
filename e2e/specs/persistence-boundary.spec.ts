import { expect, test } from "../fixtures/test.js";
import { getPreferenceStore, getSemanticStore } from "../helpers/local-storage.js";
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
});
