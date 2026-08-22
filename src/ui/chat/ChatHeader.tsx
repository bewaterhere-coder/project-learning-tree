import type {
  BoundConversationIdentity,
  InspectorViewModel,
  LearningContext,
} from "../../application/index.js";
import type { NodeConversation } from "../../conversation/index.js";
import type { ChatPlacement, WorkspaceLocale } from "../../workspace/index.js";
import { t } from "../i18n/index.js";

export function ChatHeader({
  locale,
  identity,
  inspector,
  context,
  viewingNodeId,
  placement,
  pinned,
  onClose,
  onFollow,
  onPin,
  onPlacement,
}: {
  locale: WorkspaceLocale;
  identity: BoundConversationIdentity;
  inspector?: InspectorViewModel;
  context: LearningContext;
  viewingNodeId?: string;
  placement: ChatPlacement;
  pinned: boolean;
  onClose: () => void;
  onFollow: () => void;
  onPin: () => void;
  onPlacement: (placement: ChatPlacement) => void;
}) {
  const talkingId = identity.kind === "node" ? identity.nodeId : undefined;
  const diverge =
    viewingNodeId !== undefined && talkingId !== undefined && viewingNodeId !== talkingId;
  const node = context.node;
  const path = node?.ancestorPath.map((item) => item.question).join(" → ");

  return (
    <header className="chat-header" data-testid="chat-header">
      <div className="chat-header-main">
        {identity.kind === "project" ? (
          <div>
            <h2 data-testid="chat-title">{t(locale, "chat.titleProject")}</h2>
            <p data-testid="chat-project-name">{context.project.name}</p>
          </div>
        ) : (
          <div>
            <h2 data-testid="chat-title">
              {node?.question ?? inspector?.question ?? talkingId}
            </h2>
            {node?.parentQuestion ? (
              <p className="chat-parent" data-testid="chat-parent">
                {t(locale, "chat.parent")}: {node.parentQuestion}
              </p>
            ) : null}
            {path ? (
              <p className="chat-path" data-testid="chat-path">
                {t(locale, "chat.path")}: {path}
              </p>
            ) : null}
          </div>
        )}
        <button
          type="button"
          className="ui-button ui-button-ghost"
          data-testid="chat-close"
          onClick={onClose}
        >
          {t(locale, "chat.close")}
        </button>
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
            data-testid="chat-follow"
            onClick={onFollow}
          >
            {t(locale, "chat.follow")}
          </button>
        </div>
      ) : null}
      <div className="chat-header-actions">
        {identity.kind === "node" && !pinned ? (
          <button type="button" data-testid="chat-pin" onClick={onPin}>
            {t(locale, "chat.pin")}
          </button>
        ) : null}
        {identity.kind === "node" && pinned && !diverge ? (
          <button type="button" data-testid="chat-follow" onClick={onFollow}>
            {t(locale, "chat.follow")}
          </button>
        ) : null}
        <div className="chat-placement" data-testid="chat-placement">
          <button
            type="button"
            data-testid="chat-placement-floating"
            data-active={placement === "floating" ? "true" : "false"}
            onClick={() => onPlacement("floating")}
          >
            {t(locale, "chat.placementFloating")}
          </button>
          <button
            type="button"
            data-testid="chat-placement-docked"
            data-active={placement === "docked" ? "true" : "false"}
            onClick={() => onPlacement("docked")}
          >
            {t(locale, "chat.placementDocked")}
          </button>
        </div>
      </div>
    </header>
  );
}
