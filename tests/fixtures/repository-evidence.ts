import type {
  RepositoryEvidenceProvider,
  RepositoryEvidenceSource,
  RepositoryRef,
} from "../../src/application/index.js";
import type { GitHubRepositoryApiFixture } from "./github-api.js";

export function evidenceSourceFromGitHubFixture(
  fixture: GitHubRepositoryApiFixture,
  name?: string,
): RepositoryEvidenceSource {
  return {
    name: name ?? fixture.metadata.name,
    source: `${fixture.owner}/${fixture.repo}`,
    repository: { owner: fixture.owner, repo: fixture.repo },
    metadata: {
      description: fixture.metadata.description,
      language: fixture.metadata.language,
      topics: fixture.metadata.topics,
    },
    readme: fixture.readme,
    rootNames: fixture.root.map((entry) => entry.name),
    packageJson: {
      name: typeof fixture.packageJson.name === "string" ? fixture.packageJson.name : undefined,
      description:
        typeof fixture.packageJson.description === "string"
          ? fixture.packageJson.description
          : undefined,
      scripts:
        fixture.packageJson.scripts && typeof fixture.packageJson.scripts === "object"
          ? Object.fromEntries(
              Object.entries(fixture.packageJson.scripts as Record<string, unknown>).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            )
          : undefined,
    },
    evidenceStatus: "verified",
  };
}

export function createFixtureRepositoryEvidenceProvider(
  fixtures: GitHubRepositoryApiFixture | Record<string, GitHubRepositoryApiFixture>,
): RepositoryEvidenceProvider {
  const byKey = isGitHubRepositoryApiFixture(fixtures)
    ? { [`${fixtures.owner}/${fixtures.repo}`]: fixtures }
    : fixtures;
  return {
    async load(input: RepositoryRef): Promise<RepositoryEvidenceSource> {
      const fixture = byKey[`${input.owner}/${input.repo}`];
      if (!fixture) {
        throw new Error(`No GitHub evidence fixture for ${input.owner}/${input.repo}`);
      }
      return evidenceSourceFromGitHubFixture(fixture);
    },
  };
}

function isGitHubRepositoryApiFixture(
  value: GitHubRepositoryApiFixture | Record<string, GitHubRepositoryApiFixture>,
): value is GitHubRepositoryApiFixture {
  return (
    "owner" in value &&
    "repo" in value &&
    "metadata" in value &&
    "readme" in value &&
    "root" in value &&
    "packageJson" in value
  );
}

export function createRejectingRepositoryEvidenceProvider(
  message = "GitHub evidence unavailable",
): RepositoryEvidenceProvider {
  return {
    async load(): Promise<RepositoryEvidenceSource> {
      throw new Error(message);
    },
  };
}
