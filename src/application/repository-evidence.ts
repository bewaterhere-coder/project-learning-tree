import type {
  GitHubRepositoryRef,
  RepositoryEvidenceSource,
} from "../framework/index.js";

export type RepositoryRef = GitHubRepositoryRef;

export interface RepositoryEvidenceProvider {
  load(input: RepositoryRef): Promise<RepositoryEvidenceSource>;
}

export type {
  EvidenceStatus,
  RepositoryEvidenceSource,
} from "../framework/index.js";
