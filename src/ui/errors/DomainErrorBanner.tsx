export function DomainErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="domain-error" role="alert" data-testid="domain-error">
      <p>{message}</p>
      <button type="button" data-testid="dismiss-error" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
