export interface GitHubRepoMetadataFixture {
  name: string;
  full_name: string;
  description: string;
  language: string;
  topics: string[];
}

export interface GitHubContentEntryFixture {
  name: string;
  type: "file" | "dir";
}

export interface GitHubRepositoryApiFixture {
  owner: string;
  repo: string;
  metadata: GitHubRepoMetadataFixture;
  readme: string;
  root: GitHubContentEntryFixture[];
  packageJson: Record<string, unknown>;
}

export const VITE_README = `# Vite

Next Generation Frontend Tooling

- A **dev server** that provides rich feature enhancements over native ES modules, for example extremely fast Hot Module Replacement (HMR).
- A **build command** that bundles your code with Rollup, pre-configured to output highly optimized static assets for production.
- A **plugin pipeline** built on Rollup's plugin interface, with extra Vite-specific options.

Vite (French word for "quick") is a build tool that aims to provide a faster and leaner development experience for modern web projects.
`;

export const REACT_README = `# React

The library for web and native user interfaces.

React implements a **reconciliation** algorithm that walks the component tree and determines which DOM updates are needed. The Fiber architecture makes this incremental.

- Declarative: React makes it painless to create interactive UIs.
- Component-Based
- Learn Once, Write Anywhere
`;

export const VITE_GITHUB_FIXTURE: GitHubRepositoryApiFixture = {
  owner: "vitejs",
  repo: "vite",
  metadata: {
    name: "vite",
    full_name: "vitejs/vite",
    description: "Next generation frontend tooling. It's fast!",
    language: "TypeScript",
    topics: ["vite", "build-tool", "dev-server", "hmr", "frontend"],
  },
  readme: VITE_README,
  root: [
    { name: "docs", type: "dir" },
    { name: "package.json", type: "file" },
    { name: "packages", type: "dir" },
    { name: "playground", type: "dir" },
    { name: "README.md", type: "file" },
    { name: "rollup.config.ts", type: "file" },
    { name: "scripts", type: "dir" },
  ],
  packageJson: {
    name: "vite-monorepo",
    private: true,
    type: "module",
    scripts: {
      dev: "pnpm -C packages/vite run dev",
    },
  },
};

export const REACT_GITHUB_FIXTURE: GitHubRepositoryApiFixture = {
  owner: "facebook",
  repo: "react",
  metadata: {
    name: "react",
    full_name: "facebook/react",
    description: "The library for web and native user interfaces.",
    language: "JavaScript",
    topics: ["react", "javascript", "ui", "declarative"],
  },
  readme: REACT_README,
  root: [
    { name: "compiler", type: "dir" },
    { name: "fixtures", type: "dir" },
    { name: "package.json", type: "file" },
    { name: "packages", type: "dir" },
    { name: "README.md", type: "file" },
    { name: "scripts", type: "dir" },
  ],
  packageJson: {
    private: true,
    scripts: {
      build: "node ./scripts/rollup/build.js",
    },
  },
};

export function githubFilePayload(text: string): { encoding: "base64"; content: string } {
  return {
    encoding: "base64",
    content: Buffer.from(text, "utf8").toString("base64"),
  };
}

export function githubJsonResponse(
  fixture: GitHubRepositoryApiFixture,
  pathname: string,
): unknown | undefined {
  const repoRoot = `/repos/${fixture.owner}/${fixture.repo}`;
  if (pathname === repoRoot || pathname === `${repoRoot}/`) {
    return fixture.metadata;
  }
  if (pathname === `${repoRoot}/readme`) {
    return githubFilePayload(fixture.readme);
  }
  if (pathname === `${repoRoot}/contents` || pathname === `${repoRoot}/contents/`) {
    return fixture.root;
  }
  if (pathname === `${repoRoot}/contents/package.json`) {
    return githubFilePayload(`${JSON.stringify(fixture.packageJson, null, 2)}\n`);
  }
  return undefined;
}
