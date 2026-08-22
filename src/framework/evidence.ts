export interface GitHubRepositoryRef {
  owner: string;
  repo: string;
}

export interface RepositoryEvidence {
  name: string;
  source?: string;
  description?: string;
  repository?: GitHubRepositoryRef;
  primaryLanguage?: string;
  topics: string[];
  entryPoints: string[];
  keyModules: string[];
  architectureSignals: string[];
}

export interface EvidenceInput {
  name: string;
  source?: string;
  description?: string;
}

const GITHUB_URL =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i;
const OWNER_REPO = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/;

const LANGUAGE_HINTS: Array<{ pattern: RegExp; language: string }> = [
  { pattern: /\btypescript\b|\.tsx?\b/i, language: "TypeScript" },
  { pattern: /\bjavascript\b|\.jsx?\b/i, language: "JavaScript" },
  { pattern: /\brust\b|\.rs\b/i, language: "Rust" },
  { pattern: /\bpython\b|\.py\b/i, language: "Python" },
  { pattern: /\bgo(?:lang)?\b/i, language: "Go" },
];

const MODULE_HINTS: Array<{ pattern: RegExp; module: string }> = [
  { pattern: /\breact(?:-flow|flow)?\b/i, module: "React view layer" },
  { pattern: /\bxyflow\b/i, module: "XYFlow graph view" },
  { pattern: /\bdomain engine\b|\bdomain snapshot\b|\bdomain layer\b/i, module: "domain engine" },
  { pattern: /\bworkspace\b/i, module: "workspace session" },
  { pattern: /\bplugin\b/i, module: "plugin pipeline" },
  { pattern: /\breconcili/i, module: "reconciliation" },
  { pattern: /\bcompiler\b/i, module: "compiler pipeline" },
  { pattern: /\bdev server\b|\bbundl/i, module: "dev server and bundler" },
  { pattern: /\bpersist/i, module: "persistence" },
  { pattern: /\bconversation\b|\bchat\b/i, module: "node conversation" },
];

const ENTRY_HINTS: Array<{ pattern: RegExp; entry: string }> = [
  { pattern: /\bvite\b/i, entry: "Vite entry" },
  { pattern: /\bcli\b/i, entry: "CLI" },
  { pattern: /\bapi\b/i, entry: "public API" },
  { pattern: /\bapp\b|\bui\b/i, entry: "application UI" },
];

export function parseGitHubSource(source: string): GitHubRepositoryRef | undefined {
  const trimmed = source.trim().replace(/^#项目学习\s+/u, "").replace(/^#+/, "");
  const urlMatch = trimmed.match(GITHUB_URL);
  if (urlMatch?.[1] && urlMatch[2]) {
    return { owner: urlMatch[1], repo: stripGitSuffix(urlMatch[2]) };
  }
  const shortMatch = trimmed.match(OWNER_REPO);
  if (shortMatch?.[1] && shortMatch[2]) {
    return { owner: shortMatch[1], repo: stripGitSuffix(shortMatch[2]) };
  }
  return undefined;
}

export function deriveRepositoryEvidence(input: EvidenceInput): RepositoryEvidence {
  const name = input.name.trim();
  const source = input.source?.trim() || undefined;
  const description = input.description?.trim() || undefined;
  const repository = source ? parseGitHubSource(source) : undefined;
  const haystack = [name, source ?? "", description ?? "", repository?.repo ?? ""].join(" ");
  return {
    name,
    source,
    description,
    repository,
    primaryLanguage: firstMatch(LANGUAGE_HINTS, haystack, (hint) => hint.language),
    topics: unique(
      [
        repository?.repo,
        ...MODULE_HINTS.filter((hint) => hint.pattern.test(haystack)).map((hint) => hint.module),
      ].filter((value): value is string => Boolean(value)),
    ),
    entryPoints: unique(
      ENTRY_HINTS.filter((hint) => hint.pattern.test(haystack)).map((hint) => hint.entry),
    ),
    keyModules: unique(
      MODULE_HINTS.filter((hint) => hint.pattern.test(haystack)).map((hint) => hint.module),
    ),
    architectureSignals: architectureSignals(haystack),
  };
}

function architectureSignals(haystack: string): string[] {
  const signals: string[] = [];
  if (/\btree\b|\bnode-centered\b|\blearning node\b/i.test(haystack)) {
    signals.push("node-centered learning tree");
  }
  if (/\bstate machine\b|\binvariant\b|\bdomain\b/i.test(haystack)) {
    signals.push("explicit domain state");
  }
  if (/\bplugin\b/i.test(haystack)) {
    signals.push("extension/plugin surface");
  }
  return unique(signals);
}

function firstMatch<T extends { pattern: RegExp }>(
  hints: T[],
  haystack: string,
  pick: (hint: T) => string,
): string | undefined {
  const hint = hints.find((item) => item.pattern.test(haystack));
  return hint ? pick(hint) : undefined;
}

function stripGitSuffix(repo: string): string {
  return repo.replace(/\.git$/i, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
