import { useEffect, useRef, useState } from "react";
import { validateChildDraft, type NodeId, type UiCommand } from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";
import { Button } from "../primitives/Button.js";

export function NodeAddChildAction({
  nodeId,
  locale,
  canCreateChild,
  onCommand,
}: {
  nodeId: NodeId;
  locale: WorkspaceLocale;
  canCreateChild: boolean;
  onCommand: (command: UiCommand) => boolean | void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [goal, setGoal] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    question?: "empty";
    goal?: "empty";
  }>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setOpen(false);
    setQuestion("");
    setGoal("");
    setFieldErrors({});
  }, [nodeId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (formRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!canCreateChild) {
    return null;
  }

  const resetDraft = (): void => {
    setOpen(false);
    setQuestion("");
    setGoal("");
    setFieldErrors({});
  };

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
      parentId: nodeId,
      question,
      goal,
    });
    if (ok !== false) {
      resetDraft();
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="icon"
        className="node-add-child-action nodrag nopan"
        data-testid={`node-add-child-${nodeId}`}
        aria-label={t(locale, "node.addChild")}
        title={t(locale, "node.addChild")}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <svg
          className="node-add-child-icon"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M8 2.5a.75.75 0 0 1 .75.75V7h3.75a.75.75 0 0 1 0 1.5H8.75v3.75a.75.75 0 0 1-1.5 0V8.5H3.5a.75.75 0 0 1 0-1.5h3.75V3.25A.75.75 0 0 1 8 2.5Z"
          />
        </svg>
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      className="node-add-child-form nodrag nopan"
      data-testid={`node-add-child-form-${nodeId}`}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleSubmit();
      }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          resetDraft();
        }
      }}
    >
      <label>
        {t(locale, "authoring.question")}
        <input
          type="text"
          data-testid="authoring-question"
          value={question}
          autoFocus
          placeholder={t(locale, "authoring.questionPlaceholder")}
          onChange={(event) => setQuestion(event.target.value)}
        />
      </label>
      {fieldErrors.question ? (
        <p className="field-error" role="alert" data-testid="authoring-question-error">
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
        <p className="field-error" role="alert" data-testid="authoring-goal-error">
          {t(locale, "authoring.goalEmpty")}
        </p>
      ) : null}
      <div className="authoring-actions">
        <button type="submit" data-testid="authoring-submit">
          {t(locale, "authoring.submit")}
        </button>
        <button type="button" data-testid="authoring-cancel" onClick={resetDraft}>
          {t(locale, "authoring.cancel")}
        </button>
      </div>
    </form>
  );
}
