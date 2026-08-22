import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  required,
  error,
  helper,
  children,
  testId,
}: {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <label className={error ? "ui-field invalid" : "ui-field"} data-testid={testId}>
      <span className="ui-field-label">
        {label}
        {required ? (
          <span className="ui-required" aria-hidden="true">
            *
          </span>
        ) : null}
      </span>
      {children}
      {helper ? <span className="ui-field-helper">{helper}</span> : null}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={["ui-input", props.className].filter(Boolean).join(" ")} />;
}
