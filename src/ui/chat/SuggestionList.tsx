import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function SuggestionList({
  locale,
  suggestions,
}: {
  locale: WorkspaceLocale;
  suggestions: string[];
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="chat-suggestions" data-testid="chat-suggestions">
      <h3 className="chat-suggestions-title">{t(locale, "chat.suggestionsTitle")}</h3>
      <ul className="chat-suggestions-list">
        {suggestions.map((suggestion, index) => (
          <li
            key={`${index}-${suggestion}`}
            className="chat-suggestion"
            data-testid="chat-suggestion"
          >
            {suggestion}
          </li>
        ))}
      </ul>
    </section>
  );
}
