export interface GitHubRepositoryRef {
  owner: string;
  repo: string;
}

export const EVIDENCE_STATUSES = ["verified", "partial", "fallback"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export function isEvidenceStatus(value: unknown): value is EvidenceStatus {
  return (
    typeof value === "string" &&
    (EVIDENCE_STATUSES as readonly string[]).includes(value)
  );
}

export interface PackageJsonEvidence {
  name?: string;
  description?: string;
  main?: string;
  module?: string;
  types?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
}

export interface RepositoryMetadata {
  description?: string;
  language?: string;
  topics?: string[];
}

/**
 * Raw repository reads collected by an injected provider. Framework code
 * normalizes this shape; it never fetches.
 */
export interface RepositoryEvidenceSource {
  name?: string;
  source?: string;
  /** Supplemental learner hint. Appended last; never enough to claim verified. */
  userDescription?: string;
  repository?: GitHubRepositoryRef;
  metadata?: RepositoryMetadata;
  readme?: string;
  rootNames?: string[];
  packageJson?: PackageJsonEvidence;
  evidenceStatus: EvidenceStatus;
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
  evidenceStatus: EvidenceStatus;
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
  { pattern: /\bplugin pipeline\b|\bplugin interface\b|\bplugin\b/i, module: "plugin pipeline" },
  { pattern: /\breconcili/i, module: "reconciliation" },
  { pattern: /\bfiber\b/i, module: "Fiber reconciler" },
  { pattern: /\bcompiler\b/i, module: "compiler pipeline" },
  { pattern: /\bdev server\b|\bhot module replacement\b|\bhmr\b|\bbundl/i, module: "dev server and bundler" },
  { pattern: /\bpersist/i, module: "persistence" },
  { pattern: /\bconversation\b|\bchat\b/i, module: "node conversation" },
];

const ENTRY_HINTS: Array<{ pattern: RegExp; entry: string }> = [
  { pattern: /\bvite\b/i, entry: "Vite entry" },
  { pattern: /\bcli\b/i, entry: "CLI" },
  { pattern: /\bapi\b/i, entry: "public API" },
  { pattern: /\bapp\b|\bui\b/i, entry: "application UI" },
];

const TOPIC_MODULES: Record<string, string> = {
  "dev-server": "dev server",
  hmr: "hot module replacement",
  vite: "Vite bundler",
  react: "React view layer",
  rollup: "Rollup bundler",
};

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

/**
 * Name-only fallback. User description is a last-resort hint and cannot mark
 * evidence as verified.
 */
export function deriveRepositoryEvidence(input: EvidenceInput): RepositoryEvidence {
  return normalizeRepositoryEvidence({
    name: input.name,
    source: input.source,
    userDescription: input.description,
    repository: input.source ? parseGitHubSource(input.source) : undefined,
    evidenceStatus: "fallback",
  });
}

export function normalizeRepositoryEvidence(
  source: RepositoryEvidenceSource,
): RepositoryEvidence {
  const name = (source.name ?? source.repository?.repo ?? "Project").trim();
  const repoSource = source.source?.trim() || undefined;
  const repository =
    source.repository ?? (repoSource ? parseGitHubSource(repoSource) : undefined);
  const userDescription = source.userDescription?.trim() || undefined;
  const metadataDescription = source.metadata?.description?.trim() || undefined;

  const verifiedHaystack = [
    metadataDescription ?? "",
    source.readme ?? "",
    (source.rootNames ?? []).join(" "),
    (source.metadata?.topics ?? []).join(" "),
    source.metadata?.language ?? "",
    packageJsonHaystack(source.packageJson),
    repository?.repo ?? "",
  ].join(" ");
  const supplementalHaystack = userDescription ?? "";

  const topics = unique([
    ...(source.metadata?.topics ?? []),
    repository?.repo,
  ].filter((value): value is string => Boolean(value)));

  const keyModules = unique([
    ...MODULE_HINTS.filter((hint) => hint.pattern.test(verifiedHaystack)).map(
      (hint) => hint.module,
    ),
    ...modulesFromRootNames(source.rootNames ?? []),
    ...modulesFromTopics(source.metadata?.topics ?? []),
    ...MODULE_HINTS.filter((hint) => hint.pattern.test(supplementalHaystack)).map(
      (hint) => hint.module,
    ),
  ]);

  const entryPoints = unique([
    ...entryPointsFromPackageJson(source.packageJson),
    ...ENTRY_HINTS.filter((hint) => hint.pattern.test(verifiedHaystack)).map(
      (hint) => hint.entry,
    ),
    ...ENTRY_HINTS.filter((hint) => hint.pattern.test(supplementalHaystack)).map(
      (hint) => hint.entry,
    ),
  ]);

  return {
    name,
    source: repoSource,
    description: metadataDescription ?? userDescription,
    repository,
    primaryLanguage:
      source.metadata?.language?.trim() ||
      firstMatch(LANGUAGE_HINTS, verifiedHaystack, (hint) => hint.language) ||
      firstMatch(LANGUAGE_HINTS, supplementalHaystack, (hint) => hint.language),
    topics,
    entryPoints,
    keyModules,
    architectureSignals: unique([
      ...architectureSignals(verifiedHaystack),
      ...architectureSignals(supplementalHaystack),
    ]),
    evidenceStatus: source.evidenceStatus,
  };
}

function modulesFromRootNames(names: string[]): string[] {
  const modules: string[] = [];
  for (const name of names) {
    const base = name.replace(/\/$/, "").toLowerCase();
    if (base.includes("plugin")) {
      modules.push("plugin pipeline");
    }
    if (base.includes("reconcil") || base.includes("fiber")) {
      modules.push("reconciliation");
    }
    if (base === "compiler" || base.startsWith("compiler")) {
      modules.push("compiler pipeline");
    }
    if (base.includes("vite")) {
      modules.push("dev server and bundler");
    }
  }
  return modules;
}

function modulesFromTopics(topics: string[]): string[] {
  return topics.flatMap((topic) => {
    const mapped = TOPIC_MODULES[topic.toLowerCase()];
    return mapped ? [mapped] : [];
  });
}

function entryPointsFromPackageJson(pkg: PackageJsonEvidence | undefined): string[] {
  if (!pkg) {
    return [];
  }
  const entries: string[] = [];
  if (typeof pkg.bin === "string" && pkg.bin.trim() !== "") {
    entries.push("CLI");
  } else if (pkg.bin && typeof pkg.bin === "object") {
    entries.push("CLI");
    if (Object.keys(pkg.bin).some((key) => /vite/i.test(key))) {
      entries.push("Vite entry");
    }
  }
  if (pkg.main || pkg.module) {
    entries.push("package entry");
  }
  if (pkg.scripts && ("dev" in pkg.scripts || "start" in pkg.scripts)) {
    entries.push("dev server");
  }
  return entries;
}

function packageJsonHaystack(pkg: PackageJsonEvidence | undefined): string {
  if (!pkg) {
    return "";
  }
  const bin =
    typeof pkg.bin === "string"
      ? pkg.bin
      : pkg.bin
        ? Object.keys(pkg.bin).join(" ")
        : "";
  const scripts = pkg.scripts ? Object.keys(pkg.scripts).join(" ") : "";
  return [pkg.name, pkg.description, pkg.main, pkg.module, bin, scripts]
    .filter(Boolean)
    .join(" ");
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
  if (/\bfiber\b|\breconcili/i.test(haystack)) {
    signals.push("incremental UI reconciliation");
  }
  return unique(signals);
}

function firstMatch<T extends { pattern: RegExp }>(
  hints: T[],
  haystack: string,
  pick: (hint: T) => string,
): string | undefined {
  if (haystack.trim() === "") {
    return undefined;
  }
  const hint = hints.find((item) => item.pattern.test(haystack));
  return hint ? pick(hint) : undefined;
}

function stripGitSuffix(repo: string): string {
  return repo.replace(/\.git$/i, "");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
