import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  children,
  testId,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="empty-state" data-testid={testId}>
      <h2>{title}</h2>
      {body ? <p>{body}</p> : null}
      {children}
    </div>
  );
}
