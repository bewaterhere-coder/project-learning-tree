import type { ChatSuggestion } from "../../ai/types.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function SuggestionList({
  locale,
  suggestions,
}: {
  locale: WorkspaceLocale;
  suggestions: ChatSuggestion[];
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
            key={`${index}-${suggestion.type}-${suggestion.content}`}
            className="chat-suggestion"
            data-testid="chat-suggestion"
            data-suggestion-type={suggestion.type}
          >
            <span className="chat-suggestion-type">
              {t(locale, suggestionTypeLabelKey(suggestion.type))}
            </span>
            <span className="chat-suggestion-content">{suggestion.content}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function suggestionTypeLabelKey(type: ChatSuggestion["type"]): "chat.suggestionQuestion" {
  if (type === "question") {
    return "chat.suggestionQuestion";
  }
  return "chat.suggestionQuestion";
}
