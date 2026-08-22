import { expect, test } from "../fixtures/test.js";
import {
  addCoreQuestion,
  createProject,
  openApp,
} from "../helpers/project.js";

test("clicking a real tree node opens the inspector for that question", async ({
  page,
}) => {
  await openApp(page);
  await createProject(page, "Inspector Smoke");
  await addCoreQuestion(
    page,
    "How do agents plan?",
    "Explain the loop",
  );

  const node = page.locator("[data-node-id]").first();
  await expect(node).toBeVisible();
  await node.click();

  await expect(page.getByTestId("node-inspector")).toBeVisible();
  await expect(page.getByTestId("inspector-question")).toHaveText(
    "How do agents plan?",
  );
});
