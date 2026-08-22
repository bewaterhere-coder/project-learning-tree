import { expect, test } from "../fixtures/test.js";
import { getSemanticStore } from "../helpers/local-storage.js";
import { openApp } from "../helpers/project.js";

test("boots into Product Empty Workspace without a demo project", async ({
  page,
}) => {
  await openApp(page);

  await expect(page.getByTestId("workspace-empty")).toBeVisible();
  await expect(page.getByTestId("shell")).toBeVisible();
  await expect(page.locator('[data-testid^="project-item-"]')).toHaveCount(0);
  await expect(page.getByTestId("project-list")).not.toContainText("M2 Demo Tree");
  expect(await getSemanticStore(page)).toBeNull();
});
