import { t, useLocale } from "../i18n/index.js";

export function DomainErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const locale = useLocale();
  return (
    <div className="domain-error" role="alert" data-testid="domain-error">
      <p>{message}</p>
      <button type="button" data-testid="dismiss-error" onClick={onDismiss}>
        {t(locale, "error.dismiss")}
      </button>
    </div>
  );
}
