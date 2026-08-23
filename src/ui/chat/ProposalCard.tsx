import { useState } from "react";
import type { LearningProposal } from "../../ai/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function ProposalList({
  locale,
  proposals,
  onQuestionAction,
  onAdopt,
  onIgnore,
}: {
  locale: WorkspaceLocale;
  proposals: LearningProposal[];
  onQuestionAction: (
    proposal: Extract<LearningProposal, { type: "question" }>,
    destination: "blocking" | "frontier",
    goal: string,
  ) => void;
  onAdopt: (proposal: LearningProposal, draft?: string) => void;
  onIgnore: (proposal: LearningProposal) => void;
}) {
  const visible = proposals.filter(
    (proposal) => proposal.status === "pending" || proposal.status === "accepted",
  );
  if (visible.length === 0) {
    return null;
  }
  return (
    <div className="proposal-list" data-testid="proposal-list">
      {visible.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          locale={locale}
          proposal={proposal}
          onQuestionAction={onQuestionAction}
          onAdopt={onAdopt}
          onIgnore={onIgnore}
        />
      ))}
    </div>
  );
}

function ProposalCard({
  locale,
  proposal,
  onQuestionAction,
  onAdopt,
  onIgnore,
}: {
  locale: WorkspaceLocale;
  proposal: LearningProposal;
  onQuestionAction: (
    proposal: Extract<LearningProposal, { type: "question" }>,
    destination: "blocking" | "frontier",
    goal: string,
  ) => void;
  onAdopt: (proposal: LearningProposal, draft?: string) => void;
  onIgnore: (proposal: LearningProposal) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(proposalDraft(proposal));
  const [goal, setGoal] = useState(
    proposal.type === "question" ? proposal.goal : "",
  );
  const accepted = proposal.status === "accepted";

  return (
    <article
      className="proposal-row"
      data-testid={`proposal-card-${proposal.type}`}
      data-proposal-id={proposal.id}
      data-status={proposal.status}
    >
      <p className="proposal-guidance">
        {t(
          locale,
          proposal.type === "question"
            ? "proposal.questionTitle"
            : proposal.type === "evidence"
              ? "proposal.evidenceTitle"
              : proposal.type === "criterion"
                ? "proposal.criterionTitle"
                : "proposal.summaryTitle",
        )}
      </p>
      <p className="proposal-body" data-testid="proposal-body">
        {proposalBody(proposal)}
      </p>
      {proposal.type === "question" && !accepted ? (
        <>
          <p className="proposal-suggestion" data-testid="proposal-suggestion">
            {t(
              locale,
              proposal.suggestedDestination === "frontier"
                ? "proposal.aiSuggestsFrontier"
                : "proposal.aiSuggestsBlocking",
            )}
          </p>
          <label className="proposal-goal-label">
            {t(locale, "proposal.goal")}
            <input
              data-testid="proposal-goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
            />
          </label>
        </>
      ) : null}
      {editing && !accepted ? (
        <textarea
          data-testid="proposal-edit"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      ) : null}
      {proposal.error ? (
        <p className="proposal-error" role="alert" data-testid="proposal-error">
          {t(locale, "proposal.rejected")} {proposal.error}
        </p>
      ) : null}
      {accepted ? (
        <p className="proposal-added" data-testid="proposal-added">
          {t(locale, "proposal.added")}
        </p>
      ) : (
        <div className="proposal-actions">
          {proposal.type === "question" ? (
            <>
              <button
                type="button"
                className="proposal-text-action proposal-text-action-primary"
                data-testid="proposal-accept-blocking"
                onClick={() => onQuestionAction(proposal, "blocking", goal)}
              >
                {t(locale, "proposal.acceptBlocking")}
              </button>
              <button
                type="button"
                className="proposal-text-action"
                data-testid="proposal-send-frontier"
                onClick={() => onQuestionAction(proposal, "frontier", goal)}
              >
                {t(locale, "proposal.sendFrontier")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="proposal-text-action proposal-text-action-primary"
                data-testid="proposal-adopt"
                onClick={() => onAdopt(proposal, editing ? draft : undefined)}
              >
                {t(locale, "proposal.adopt")}
              </button>
              <button
                type="button"
                className="proposal-text-action"
                data-testid="proposal-edit-adopt"
                onClick={() => {
                  if (!editing) {
                    setEditing(true);
                    return;
                  }
                  onAdopt(proposal, draft);
                }}
              >
                {t(locale, "proposal.editAdopt")}
              </button>
            </>
          )}
          <button
            type="button"
            className="proposal-text-action"
            data-testid="proposal-ignore"
            onClick={() => onIgnore(proposal)}
          >
            {t(locale, "proposal.ignore")}
          </button>
        </div>
      )}
    </article>
  );
}

function proposalBody(proposal: LearningProposal): string {
  switch (proposal.type) {
    case "question":
      return proposal.question;
    case "evidence":
      return proposal.reference;
    case "criterion":
      return proposal.description;
    case "summary":
      return proposal.summary;
  }
}

function proposalDraft(proposal: LearningProposal): string {
  switch (proposal.type) {
    case "question":
      return proposal.question;
    case "evidence":
      return proposal.reference;
    case "criterion":
      return proposal.description;
    case "summary":
      return proposal.summary;
  }
}
