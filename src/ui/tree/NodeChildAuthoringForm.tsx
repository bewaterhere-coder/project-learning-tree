import { useEffect, useState } from "react";
import type { UiCommand } from "../../application/index.js";
import { validateChildDraft } from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";
import { Button } from "../primitives/Button.js";

/** Ordinary createChild authoring for a Question node (no blocking checkbox). */
export function NodeChildAuthoringForm({
  parentId,
  locale,
  authoringError,
  onCommand,
  onCancel,
}: {
  parentId: string;
  locale: WorkspaceLocale;
  authoringError?: string;
  onCommand: (command: UiCommand) => boolean | void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [goal, setGoal] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    question?: "empty";
    goal?: "empty";
  }>({});

  useEffect(() => {
    setQuestion("");
    setGoal("");
    setFieldErrors({});
  }, [parentId]);

  const handleSubmit = (): void => {
    const draft = validateChildDraft({ question, goal });
    if (!draft.ready) {
      setFieldErrors({
        question: draft.questionError,
        goal: draft.goalError,
      });
      return;
    }
    setFieldErrors({});
    const ok = onCommand({
      type: "createChild",
      parentId,
      question,
      goal,
    });
    if (ok !== false) {
      onCancel();
    }
  };

  return (
    <form
      className="authoring-form node-child-authoring"
      data-testid="authoring-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <h3>{t(locale, "authoring.title")}</h3>
      <label>
        {t(locale, "authoring.question")}
        <input
          type="text"
          data-testid="authoring-question"
          value={question}
          placeholder={t(locale, "authoring.questionPlaceholder")}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      {fieldErrors.question ? (
        <p
          className="field-error"
          role="alert"
          data-testid="authoring-question-error"
        >
          {t(locale, "authoring.questionEmpty")}
        </p>
      ) : null}
      <label>
        {t(locale, "authoring.goal")}
        <input
          type="text"
          data-testid="authoring-goal"
          value={goal}
          placeholder={t(locale, "authoring.goalPlaceholder")}
          onChange={(event) => setGoal(event.target.value)}
        />
      </label>
      {fieldErrors.goal ? (
        <p
          className="field-error"
          role="alert"
          data-testid="authoring-goal-error"
        >
          {t(locale, "authoring.goalEmpty")}
        </p>
      ) : null}
      <div className="authoring-actions">
        <Button type="submit" data-testid="authoring-submit">
          {t(locale, "authoring.submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          data-testid="authoring-cancel"
          onClick={onCancel}
        >
          {t(locale, "authoring.cancel")}
        </Button>
      </div>
      {authoringError ? (
        <p className="authoring-error" role="alert" data-testid="authoring-error">
          {authoringError}
        </p>
      ) : null}
    </form>
  );
}
