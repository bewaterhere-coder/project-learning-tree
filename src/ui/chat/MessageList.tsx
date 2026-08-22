import type { ConversationMessage } from "../../conversation/index.js";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function MessageList({
  locale,
  messages,
  emptyKey,
}: {
  locale: WorkspaceLocale;
  messages: ConversationMessage[];
  emptyKey: "chat.empty" | "chat.emptyProject";
}) {
  if (messages.length === 0) {
    return (
      <p className="chat-empty" data-testid="chat-empty">
        {t(locale, emptyKey)}
      </p>
    );
  }
  return (
    <ol className="chat-messages" data-testid="chat-messages">
      {messages.map((message) => (
        <li
          key={message.id}
          className={`chat-message chat-message-${message.role}`}
          data-testid={`chat-message-${message.role}`}
        >
          {message.content}
        </li>
      ))}
    </ol>
  );
}
