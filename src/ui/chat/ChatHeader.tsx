import { useRef, useState } from "react";
import type {
  BoundConversationIdentity,
  InspectorViewModel,
  LearningContext,
} from "../../application/index.js";
import type { ChatPlacement, WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";
import { Menu } from "../primitives/Menu.js";

export function ChatHeader({
  locale,
  identity,
  inspector,
  context,
  viewingNodeId,
  placement,
  pinned,
  contextOpen,
  onClose,
  onFollow,
  onPin,
  onPlacement,
  onToggleContext,
}: {
  locale: WorkspaceLocale;
  identity: BoundConversationIdentity;
  inspector?: InspectorViewModel;
  context: LearningContext;
  viewingNodeId?: string;
  placement: ChatPlacement;
  pinned: boolean;
  contextOpen: boolean;
  onClose: () => void;
  onFollow: () => void;
  onPin: () => void;
  onPlacement: (placement: ChatPlacement) => void;
  onToggleContext: () => void;
}) {
  const talkingId = identity.kind === "node" ? identity.nodeId : undefined;
  const diverge =
    viewingNodeId !== undefined && talkingId !== undefined && viewingNodeId !== talkingId;
  const node = context.node;
  const title =
    identity.kind === "project"
      ? t(locale, "chat.titleProject")
      : (node?.question ?? inspector?.question ?? talkingId ?? "");
  const statusLine =
    identity.kind === "project"
      ? context.project.name
      : t(locale, "chat.discussingCurrent");
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  return (
    <header className="chat-header" data-testid="chat-header">
      <div className="chat-header-main">
        <div className="chat-header-titles">
          <h2 className="chat-title" data-testid="chat-title">
            {title}
          </h2>
          <p className="chat-status-line" data-testid="chat-status-line">
            {statusLine}
          </p>
          {identity.kind === "project" ? (
            <p className="chat-project-name sr-only" data-testid="chat-project-name">
              {context.project.name}
            </p>
          ) : null}
        </div>
        <div className="chat-header-trailing">
          {identity.kind === "node" && !pinned ? (
            <button
              type="button"
              className="chat-icon-button"
              data-testid="chat-pin"
              aria-label={t(locale, "chat.pin")}
              title={t(locale, "chat.pin")}
              onClick={onPin}
            >
              <PinIcon />
            </button>
          ) : null}
          {identity.kind === "node" && pinned && !diverge ? (
            <button
              type="button"
              className="chat-text-action"
              data-testid="chat-follow"
              onClick={onFollow}
            >
              {t(locale, "chat.follow")}
            </button>
          ) : null}
          <button
            type="button"
            className="chat-icon-button"
            data-testid="chat-more"
            aria-label={t(locale, "chat.more")}
            title={t(locale, "chat.more")}
            ref={moreRef}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <MoreIcon />
          </button>
          <Menu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            anchorRef={moreRef}
            testId="chat-overflow-menu"
          >
            <button
              type="button"
              role="menuitem"
              data-testid="chat-placement-floating"
              data-active={placement === "floating" ? "true" : "false"}
              onClick={() => {
                onPlacement("floating");
                setMenuOpen(false);
              }}
            >
              {t(locale, "chat.placementFloating")}
            </button>
            <button
              type="button"
              role="menuitem"
              data-testid="chat-placement-docked"
              data-active={placement === "docked" ? "true" : "false"}
              onClick={() => {
                onPlacement("docked");
                setMenuOpen(false);
              }}
            >
              {t(locale, "chat.placementDocked")}
            </button>
            <button
              type="button"
              role="menuitem"
              data-testid="chat-context-toggle"
              aria-pressed={contextOpen}
              onClick={() => {
                onToggleContext();
                setMenuOpen(false);
              }}
            >
              {t(locale, "chat.context")}
            </button>
          </Menu>
          <button
            type="button"
            className="chat-close-button"
            data-testid="chat-close"
            aria-label={t(locale, "chat.close")}
            title={t(locale, "chat.close")}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      {diverge ? (
        <div className="chat-divergence" data-testid="chat-divergence">
          <p>
            {t(locale, "chat.viewing")}: {inspector?.question ?? viewingNodeId}
          </p>
          <p>
            {t(locale, "chat.talking")}: {node?.question ?? talkingId}
          </p>
          <button
            type="button"
            className="chat-text-action"
            data-testid="chat-follow"
            onClick={onFollow}
          >
            {t(locale, "chat.follow")}
          </button>
        </div>
      ) : null}
    </header>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M3 3l6 6M9 3L3 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M7 1.5l1.2 3.2 3.3.3-2.5 2.2.8 3.3L7 8.8 3.2 10.5l.8-3.3L1.5 5l3.3-.3L7 1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <circle cx="3" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7" cy="7" r="1.2" fill="currentColor" />
      <circle cx="11" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}
