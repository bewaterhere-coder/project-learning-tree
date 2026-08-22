import { useState } from "react";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function MessageComposer({
  locale,
  disabled,
  placeholderKey,
  onSend,
}: {
  locale: WorkspaceLocale;
  disabled: boolean;
  placeholderKey: "chat.composerPlaceholder" | "chat.composerPlaceholderProject";
  onSend: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <form
      className="chat-composer"
      data-testid="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        const next = value.trim();
        if (next === "" || disabled) {
          return;
        }
        onSend(next);
        setValue("");
      }}
    >
      <input
        type="text"
        data-testid="chat-input"
        value={value}
        disabled={disabled}
        placeholder={t(locale, placeholderKey)}
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" data-testid="chat-send" disabled={disabled}>
        {t(locale, "chat.send")}
      </button>
    </form>
  );
}
