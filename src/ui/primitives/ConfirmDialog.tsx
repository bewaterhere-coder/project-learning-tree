import type { ReactNode } from "react";
import { Button } from "./Button.js";

export function ConfirmDialog({
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  testId = "delete-confirm-dialog",
  cancelTestId = "delete-confirm-cancel",
  confirmTestId = "delete-confirm-submit",
}: {
  title: string;
  body: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  testId?: string;
  cancelTestId?: string;
  confirmTestId?: string;
}) {
  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={testId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="confirm-dialog-title" id={`${testId}-title`}>
          {title}
        </h2>
        <div className="confirm-dialog-body">{body}</div>
        <div className="confirm-dialog-actions">
          <Button
            variant="secondary"
            data-testid={cancelTestId}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            data-testid={confirmTestId}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
