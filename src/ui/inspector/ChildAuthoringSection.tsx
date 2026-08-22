import { useEffect, useState } from "react";
import type {
  AuthoringAvailability,
  InspectorChildView,
  UiCommand,
} from "../../application/index.js";
import { validateChildDraft } from "../../application/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { lifecycleMessageKey, t } from "../i18n/index.js";

export function ChildAuthoringSection({
  parentId,
  children,
  availability,
  locale,
  authoringError,
  onCommand,
}: {
  parentId: string;
  children: InspectorChildView[];
  availability: AuthoringAvailability;
  locale: WorkspaceLocale;
  authoringError?: string;
  onCommand: (command: UiCommand) => boolean | void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [goal, setGoal] = useState("");
  const [mustResolveFirst, setMustResolveFirst] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    question?: "empty";
    goal?: "empty";
  }>({});

  useEffect(() => {
    setOpen(false);
    setQuestion("");
    setGoal("");
    setMustResolveFirst(false);
    setFieldErrors({});
  }, [parentId]);

  const resetDraft = (): void => {
    setOpen(false);
    setQuestion("");
    setGoal("");
    setMustResolveFirst(false);
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
    const createBlocking =
      mustResolveFirst && availability.canCreateBlockingChild;
    const ok = onCommand(
      createBlocking
        ? {
            type: "createBlockingChild",
            parentId,
            question,
            goal,
          }
        : {
            type: "createChild",
            parentId,
            question,
            goal,
          },
    );
    if (ok !== false) {
      resetDraft();
    }
  };

  return (
    <section className="child-authoring" data-testid="child-authoring">
      <h3>{t(locale, "children.title")}</h3>
      {children.length === 0 ? (
        <p className="empty" data-testid="inspector-children-empty">
          {t(locale, "children.empty")}
        </p>
      ) : (
        <ul className="inspector-children" data-testid="inspector-children">
          {children.map((child) => (
            <li key={child.id} data-testid={`inspector-child-${child.id}`}>
              <div>
                <strong data-testid={`inspector-child-question-${child.id}`}>
                  {child.question}
                </strong>
                <span className="child-lifecycle">
                  {t(locale, lifecycleMessageKey(child.lifecycle))}
                </span>
              </div>
              <label className="child-blocking">
                <input
                  type="checkbox"
                  data-testid={`child-must-resolve-${child.id}`}
                  checked={child.isBlocking}
                  disabled={!availability.canChangeBlockingRelationship}
                  onChange={(event) =>
                    onCommand(
                      event.target.checked
                        ? {
                            type: "markChildBlocking",
                            parentId,
                            childId: child.id,
                          }
                        : {
                            type: "unmarkChildBlocking",
                            parentId,
                            childId: child.id,
                          },
                    )
                  }
                />
                {t(locale, "children.mustResolveFirst")}
              </label>
            </li>
          ))}
        </ul>
      )}

      {availability.canCreateChild ? (
        open ? (
          <form
            className="authoring-form"
            data-testid="authoring-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                resetDraft();
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
            {availability.canCreateBlockingChild ? (
              <label className="authoring-blocking">
                <input
                  type="checkbox"
                  data-testid="authoring-must-resolve"
                  checked={mustResolveFirst}
                  onChange={(event) => setMustResolveFirst(event.target.checked)}
                />
                {t(locale, "authoring.mustResolveFirst")}
              </label>
            ) : null}
            <div className="authoring-actions">
              <button type="submit" data-testid="authoring-submit">
                {t(locale, "authoring.submit")}
              </button>
              <button
                type="button"
                data-testid="authoring-cancel"
                onClick={resetDraft}
              >
                {t(locale, "authoring.cancel")}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            data-testid="action-add-sub-question"
            onClick={() => setOpen(true)}
          >
            {t(locale, "actions.addSubQuestion")}
          </button>
        )
      ) : (
        <p className="empty" data-testid="authoring-closed-parent">
          {t(locale, "authoring.closedParent")}
        </p>
      )}

      {authoringError ? (
        <p className="authoring-error" role="alert" data-testid="authoring-error">
          {authoringError}
        </p>
      ) : null}
    </section>
  );
}
