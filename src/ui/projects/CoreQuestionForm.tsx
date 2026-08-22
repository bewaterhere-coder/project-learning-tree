import { useState } from "react";
import {
  validateCoreQuestionDraft,
  type UiCommand,
} from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";
import { Button } from "../primitives/Button.js";
import { Field, TextInput } from "../primitives/Field.js";

export function CoreQuestionForm({
  locale,
  remaining,
  atLimit,
  authoringError,
  onCommand,
  onCancel,
}: {
  locale: WorkspaceLocale;
  remaining: number;
  atLimit: boolean;
  authoringError?: string;
  onCommand: (command: UiCommand) => boolean | void;
  onCancel?: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [goal, setGoal] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    question?: string;
    goal?: string;
  }>({});

  const handleSubmit = (): void => {
    const draft = validateCoreQuestionDraft({ question, goal });
    if (!draft.ready) {
      setFieldErrors({
        question: draft.questionError
          ? t(locale, "authoring.questionEmpty")
          : undefined,
        goal: draft.goalError ? t(locale, "authoring.goalEmpty") : undefined,
      });
      return;
    }
    setFieldErrors({});
    const ok = onCommand({
      type: "addCoreQuestion",
      question,
      goal,
    });
    if (ok !== false) {
      setQuestion("");
      setGoal("");
    }
  };

  return (
    <form
      className="authoring-form core-question-form"
      data-testid="core-question-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.();
        }
      }}
    >
      <Field
        label={t(locale, "project.coreQuestion")}
        required
        error={fieldErrors.question}
      >
        <TextInput
          data-testid="core-question-input"
          value={question}
          placeholder={t(locale, "project.coreQuestionPlaceholder")}
          autoFocus
          disabled={atLimit}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </Field>
      <Field
        label={t(locale, "project.coreGoal")}
        required
        error={fieldErrors.goal}
      >
        <TextInput
          data-testid="core-goal-input"
          value={goal}
          placeholder={t(locale, "project.coreGoalPlaceholder")}
          disabled={atLimit}
          onChange={(event) => setGoal(event.target.value)}
        />
      </Field>
      <p className="ui-field-helper" data-testid="core-question-limit">
        {atLimit
          ? t(locale, "project.coreLimit")
          : t(locale, "project.coreRemaining", { remaining })}
      </p>
      {authoringError ? (
        <p className="authoring-error" role="alert" data-testid="core-authoring-error">
          {authoringError}
        </p>
      ) : null}
      <div className="authoring-actions">
        <Button
          variant="primary"
          type="submit"
          data-testid="core-question-submit"
          disabled={atLimit}
        >
          {t(locale, "project.addCore")}
        </Button>
        {onCancel ? (
          <Button variant="ghost" data-testid="core-question-cancel" onClick={onCancel}>
            {t(locale, "authoring.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
