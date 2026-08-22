import type { Page } from "@playwright/test";
import {
  githubJsonResponse,
  VITE_GITHUB_FIXTURE,
  type GitHubRepositoryApiFixture,
} from "../../tests/fixtures/github-api.js";

const GITHUB_API_BASE = "https://api.github.com";

export async function mockGitHubRepository(
  page: Page,
  fixture: GitHubRepositoryApiFixture = VITE_GITHUB_FIXTURE,
): Promise<void> {
  const prefix = `${GITHUB_API_BASE}/repos/${fixture.owner}/${fixture.repo}`;
  await page.route(`${prefix}**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = githubJsonResponse(fixture, pathname);
    if (body === undefined) {
      await route.fulfill({ status: 404, body: "not found" });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
