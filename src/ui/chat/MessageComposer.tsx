import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

/** Matches `.chat-composer-input` max-height; grow up to this cap. */
export const CHAT_COMPOSER_MAX_HEIGHT_PX = 160;
const CHAT_COMPOSER_MIN_HEIGHT_PX = 44;

export function syncComposerHeight(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  const next = Math.min(
    Math.max(el.scrollHeight, CHAT_COMPOSER_MIN_HEIGHT_PX),
    CHAT_COMPOSER_MAX_HEIGHT_PX,
  );
  el.style.height = `${next}px`;
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) {
      syncComposerHeight(el);
    }
  }, [value]);

  const submit = () => {
    const next = value.trim();
    if (next === "" || disabled) {
      return;
    }
    onSend(next);
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="chat-composer"
      data-testid="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={textareaRef}
        data-testid="chat-input"
        className="chat-composer-input"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={t(locale, placeholderKey)}
        onChange={(event) => {
          setValue(event.target.value);
          syncComposerHeight(event.target);
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="submit"
        className="chat-send-button"
        data-testid="chat-send"
        disabled={disabled || value.trim() === ""}
        aria-label={t(locale, "chat.send")}
        title={t(locale, "chat.send")}
      >
        <SendIcon />
      </button>
    </form>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M2.5 8h9M8 3.5L12.5 8 8 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
