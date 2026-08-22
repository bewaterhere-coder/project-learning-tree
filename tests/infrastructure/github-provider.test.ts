import { describe, expect, it, vi } from "vitest";
import { createGitHubRepositoryEvidenceProvider } from "../../src/infrastructure/index.js";
import {
  githubJsonResponse,
  REACT_GITHUB_FIXTURE,
  VITE_GITHUB_FIXTURE,
  type GitHubRepositoryApiFixture,
} from "../fixtures/github-api.js";

function mockGitHubFetch(fixtures: GitHubRepositoryApiFixture[]): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const pathname = new URL(url).pathname;
    for (const fixture of fixtures) {
      const body = githubJsonResponse(fixture, pathname);
      if (body !== undefined) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

describe("GitHubRepositoryEvidenceProvider", () => {
  it("loads metadata, README, root names, and package.json as verified evidence", async () => {
    const provider = createGitHubRepositoryEvidenceProvider({
      fetch: mockGitHubFetch([VITE_GITHUB_FIXTURE]),
    });
    const source = await provider.load({ owner: "vitejs", repo: "vite" });
    expect(source.evidenceStatus).toBe("verified");
    expect(source.metadata?.language).toBe("TypeScript");
    expect(source.metadata?.topics).toContain("dev-server");
    expect(source.readme).toMatch(/plugin pipeline/i);
    expect(source.rootNames).toEqual(
      expect.arrayContaining(["package.json", "packages", "playground"]),
    );
    expect(source.packageJson?.scripts?.dev).toContain("packages/vite");
  });

  it("marks partial when some GitHub reads fail", async () => {
    const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const pathname = new URL(url).pathname;
      if (pathname.endsWith("/readme")) {
        return new Response("missing", { status: 404 });
      }
      const body = githubJsonResponse(REACT_GITHUB_FIXTURE, pathname);
      if (body !== undefined) {
        return new Response(JSON.stringify(body), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;
    const provider = createGitHubRepositoryEvidenceProvider({ fetch: fetchFn });
    const source = await provider.load({ owner: "facebook", repo: "react" });
    expect(source.evidenceStatus).toBe("partial");
    expect(source.metadata?.language).toBe("JavaScript");
    expect(source.readme).toBeUndefined();
  });

  it("throws when every GitHub read fails", async () => {
    const provider = createGitHubRepositoryEvidenceProvider({
      fetch: vi.fn(async () => new Response("down", { status: 503 })) as typeof fetch,
    });
    await expect(provider.load({ owner: "vitejs", repo: "vite" })).rejects.toThrow(
      /unavailable/i,
    );
  });
});
