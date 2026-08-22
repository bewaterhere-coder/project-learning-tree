import type { NodeId } from "../application/index.js";

export type QuestionDestination = "blocking" | "frontier";
export type ProposalStatus = "pending" | "accepted" | "ignored";

export interface QuestionProposal {
  id: string;
  type: "question";
  sourceNodeId: NodeId;
  question: string;
  goal: string;
  suggestedDestination: QuestionDestination;
  rationale?: string;
  status: ProposalStatus;
  error?: string;
}

export interface EvidenceProposal {
  id: string;
  type: "evidence";
  sourceNodeId: NodeId;
  evidenceType: string;
  reference: string;
  note?: string;
  status: ProposalStatus;
  error?: string;
}

export interface CriterionProposal {
  id: string;
  type: "criterion";
  sourceNodeId: NodeId;
  description: string;
  required: boolean;
  evidenceRequired: boolean;
  status: ProposalStatus;
  error?: string;
}

export interface SummaryProposal {
  id: string;
  type: "summary";
  sourceNodeId: NodeId;
  summary: string;
  status: ProposalStatus;
  error?: string;
}

export type LearningProposal =
  | QuestionProposal
  | EvidenceProposal
  | CriterionProposal
  | SummaryProposal;

export interface ChatReply {
  answer: string;
  proposals: LearningProposal[];
}
