import { expect, type Page } from "@playwright/test";
import type { GitHubRepositoryApiFixture } from "../../tests/fixtures/github-api.js";
import { mockGitHubRepository } from "./github.js";

function slugifyRepoName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._~-]/g, "");
}

function parseOwnerRepo(source: string): { owner: string; repo: string } {
  const match = source
    .trim()
    .replace(/\.git$/, "")
    .match(/github\.com\/([^/]+)\/([^/#?]+)|^([^/]+)\/([^/#?]+)$/i);
  const owner = (match?.[1] ?? match?.[3] ?? "example").trim();
  const repo = (match?.[2] ?? match?.[4] ?? "project").trim();
  return { owner, repo };
}

function resolveCreateSource(
  nameOrSource: string,
  options: { source?: string },
): { source: string; derivedName: string; owner: string; repo: string } {
  if (options.source) {
    const { owner, repo } = parseOwnerRepo(options.source);
    return { source: options.source, derivedName: repo, owner, repo };
  }
  if (nameOrSource.includes("/") || nameOrSource.startsWith("http")) {
    const { owner, repo } = parseOwnerRepo(nameOrSource);
    return { source: nameOrSource, derivedName: repo, owner, repo };
  }
  const repo = slugifyRepoName(nameOrSource) || "project";
  return {
    source: `https://github.com/example/${repo}`,
    derivedName: repo,
    owner: "example",
    repo,
  };
}

function fixtureFor(
  owner: string,
  repo: string,
  derivedName: string,
): GitHubRepositoryApiFixture {
  return {
    owner,
    repo,
    metadata: {
      name: derivedName,
      full_name: `${owner}/${repo}`,
      description: `${derivedName} fixture repository`,
      language: "TypeScript",
      topics: ["learning"],
    },
    readme: `# ${derivedName}\n\nFixture repository for e2e.`,
    root: [
      { name: "README.md", type: "file" },
      { name: "package.json", type: "file" },
      { name: "src", type: "dir" },
    ],
    packageJson: { name: derivedName, private: true },
  };
}

export async function openApp(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("shell").waitFor();
}

/**
 * Create a project via URL-only form.
 * Returns the derived project name (repository segment).
 */
export async function createProject(
  page: Page,
  nameOrSource: string,
  options: { source?: string; description?: string; mockGitHub?: boolean } = {},
): Promise<string> {
  const { source, derivedName, owner, repo } = resolveCreateSource(
    nameOrSource,
    options,
  );
  if (options.mockGitHub !== false) {
    await mockGitHubRepository(page, fixtureFor(owner, repo, derivedName));
  }

  const createOpen = page.getByTestId("project-create-open");
  if (await createOpen.isVisible()) {
    await createOpen.click();
  } else {
    await page.getByTestId("workspace-empty-create").click();
  }
  await page.getByTestId("project-source-input").fill(source);
  await page.getByTestId("project-create-submit").click();
  await expect(page.getByTestId("tree-canvas")).toBeVisible();
  await expect(page.locator("[data-project-root=\"true\"]").first()).toBeVisible();
  await expect(page.locator("[data-node-id]").first()).toBeVisible();
  return derivedName;
}

export async function selectedProjectId(page: Page): Promise<string> {
  const testId = await page
    .locator('[data-testid^="project-item-"][data-selected="true"]')
    .getAttribute("data-testid");
  if (testId === null) {
    throw new Error("No selected project row");
  }
  return testId.slice("project-item-".length);
}

export async function addCoreQuestion(
  page: Page,
  question: string,
  goal: string,
): Promise<void> {
  const emptyAdd = page.getByTestId("project-empty-add-core");
  if (await emptyAdd.isVisible()) {
    await emptyAdd.click();
  } else {
    await page.getByTestId("add-core-question").click();
  }
  await page.getByTestId("core-question-input").fill(question);
  await page.getByTestId("core-goal-input").fill(goal);
  await page.getByTestId("core-question-submit").click();
  await expect(
    page.locator(".node-question", { hasText: question }),
  ).toBeVisible();
}

export async function openSettings(page: Page): Promise<void> {
  const menu = page.getByTestId("settings-menu");
  if (await menu.isVisible()) {
    return;
  }
  await page.getByTestId("settings-open").click();
  await expect(menu).toBeVisible();
}
