import type {
  RepositoryEvidenceProvider,
  RepositoryEvidenceSource,
  RepositoryRef,
} from "../../application/repository-evidence.js";
import type { PackageJsonEvidence } from "../../framework/index.js";

export const GITHUB_API_BASE = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";
export const GITHUB_USER_AGENT = "project-learning-tree";

const REQUEST_TIMEOUT_MS = 8_000;

export interface GitHubRepositoryEvidenceProviderOptions {
  fetch?: typeof fetch;
  apiBase?: string;
  timeoutMs?: number;
}

export function createGitHubRepositoryEvidenceProvider(
  options: GitHubRepositoryEvidenceProviderOptions = {},
): RepositoryEvidenceProvider {
  const fetchFn = options.fetch ?? fetch;
  const apiBase = (options.apiBase ?? GITHUB_API_BASE).replace(/\/$/, "");
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  return {
    async load(input: RepositoryRef): Promise<RepositoryEvidenceSource> {
      const repoPath = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`;
      const [metaResult, readmeResult, contentsResult] = await Promise.allSettled([
        githubJson(fetchFn, `${apiBase}${repoPath}`, timeoutMs),
        githubJson(fetchFn, `${apiBase}${repoPath}/readme`, timeoutMs),
        githubJson(fetchFn, `${apiBase}${repoPath}/contents`, timeoutMs),
      ]);

      const meta = fulfilledValue(metaResult);
      const readme = fulfilledValue(readmeResult);
      const contents = fulfilledValue(contentsResult);
      const succeeded = [meta, readme, contents].filter((value) => value !== undefined).length;
      if (succeeded === 0) {
        throw new Error(
          `GitHub repository evidence unavailable for ${input.owner}/${input.repo}`,
        );
      }

      const rootNames = Array.isArray(contents)
        ? contents.flatMap((entry) => {
            if (!isRecord(entry) || typeof entry.name !== "string") {
              return [];
            }
            return [entry.name];
          })
        : [];

      let packageJson: PackageJsonEvidence | undefined;
      if (rootNames.includes("package.json")) {
        try {
          const pkgFile = await githubJson(
            fetchFn,
            `${apiBase}${repoPath}/contents/package.json`,
            timeoutMs,
          );
          packageJson = parsePackageJson(decodeGitHubFileContent(pkgFile));
        } catch {
          packageJson = undefined;
        }
      }

      return {
        repository: input,
        metadata: parseMetadata(meta),
        readme: decodeGitHubFileContent(readme),
        rootNames,
        packageJson,
        evidenceStatus: succeeded === 3 ? "verified" : "partial",
      };
    },
  };
}

async function githubJson(
  fetchFn: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const response = await fetchFn(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": GITHUB_USER_AGENT,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
    signal: abortSignal(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

function parseMetadata(value: unknown): RepositoryEvidenceSource["metadata"] {
  if (!isRecord(value)) {
    return undefined;
  }
  const topics = Array.isArray(value.topics)
    ? value.topics.filter((topic): topic is string => typeof topic === "string")
    : undefined;
  return {
    description: typeof value.description === "string" ? value.description : undefined,
    language: typeof value.language === "string" ? value.language : undefined,
    topics,
  };
}

export function decodeGitHubFileContent(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.content !== "string") {
    return undefined;
  }
  const encoding = typeof value.encoding === "string" ? value.encoding : "base64";
  if (encoding !== "base64") {
    return value.content;
  }
  return decodeBase64(value.content);
}

function parsePackageJson(content: string | undefined): PackageJsonEvidence | undefined {
  if (!content) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(content);
    if (!isRecord(parsed)) {
      return undefined;
    }
    const scripts =
      isRecord(parsed.scripts)
        ? Object.fromEntries(
            Object.entries(parsed.scripts).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : undefined;
    const bin =
      typeof parsed.bin === "string"
        ? parsed.bin
        : isRecord(parsed.bin)
          ? Object.fromEntries(
              Object.entries(parsed.bin).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            )
          : undefined;
    return {
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      description: typeof parsed.description === "string" ? parsed.description : undefined,
      main: typeof parsed.main === "string" ? parsed.main : undefined,
      module: typeof parsed.module === "string" ? parsed.module : undefined,
      types: typeof parsed.types === "string" ? parsed.types : undefined,
      bin,
      scripts,
    };
  } catch {
    return undefined;
  }
}

function decodeBase64(content: string): string {
  const packed = content.replace(/\s/g, "");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(packed, "base64").toString("utf8");
  }
  const binary = globalThis.atob(packed);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder("utf-8").decode(bytes);
}

function abortSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

function fulfilledValue(result: PromiseSettledResult<unknown>): unknown {
  return result.status === "fulfilled" ? result.value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
