import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type {
  BoundConversationIdentity,
  ContextInspectorView,
  InspectorViewModel,
  LearningContext,
} from "../../application/index.js";
import type { LearningProposal } from "../../ai/index.js";
import type { NodeConversation } from "../../conversation/index.js";
import type {
  ChatPlacement,
  ChatPosition,
  WorkspaceLocale,
} from "../../workspace/index.js";
import {
  clampChatHeight,
  clampChatWidth,
  clampFloatingChatWidth,
  DEFAULT_CHAT_HEIGHT,
} from "../../workspace/index.js";
import { PaneDivider } from "../chrome/Pane.js";
import { t } from "../i18n/index.js";
import { ChatHeader } from "./ChatHeader.js";
import { ContextInspector } from "./ContextInspector.js";
import { MessageComposer } from "./MessageComposer.js";
import { MessageList } from "./MessageList.js";
import { ProposalList } from "./ProposalCard.js";

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function ChatPanel({
  locale,
  identity,
  conversation,
  context,
  inspectorView,
  inspector,
  viewingNodeId,
  placement,
  width,
  height = DEFAULT_CHAT_HEIGHT,
  position,
  pinned,
  boundNodeClosed,
  motionState = "open",
  onClose,
  onFollow,
  onPin,
  onPlacement,
  onMove,
  onResize,
  onSend,
  onQuestionAction,
  onAdopt,
  onIgnore,
}: {
  locale: WorkspaceLocale;
  identity: BoundConversationIdentity;
  conversation: NodeConversation;
  context: LearningContext;
  inspectorView: ContextInspectorView;
  inspector?: InspectorViewModel;
  viewingNodeId?: string;
  placement: ChatPlacement;
  width: number;
  height?: number;
  position?: ChatPosition;
  pinned: boolean;
  boundNodeClosed: boolean;
  motionState?: "open" | "closed";
  onClose: () => void;
  onFollow: () => void;
  onPin: () => void;
  onPlacement: (placement: ChatPlacement) => void;
  onMove: (position: ChatPosition) => void;
  onResize: (size: { width: number; height?: number }) => void;
  onSend: (input: string) => void;
  onQuestionAction: (
    proposal: Extract<LearningProposal, { type: "question" }>,
    destination: "blocking" | "frontier",
    goal: string,
  ) => void;
  onAdopt: (proposal: LearningProposal, draft?: string) => void;
  onIgnore: (proposal: LearningProposal) => void;
}) {
  const floating = placement === "floating";
  const [contextOpen, setContextOpen] = useState(false);

  const startFloatingResize = (
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = position?.x ?? 24;
    const originY = position?.y ?? 24;
    const startWidth = width;
    const startHeight = height;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const move = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let nextWidth = startWidth;
      let nextHeight = startHeight;
      let nextX = originX;
      let nextY = originY;

      if (handle.includes("e")) {
        nextWidth = startWidth + dx;
      }
      if (handle.includes("w")) {
        nextWidth = startWidth - dx;
        nextX = originX + dx;
      }
      if (handle.includes("s")) {
        nextHeight = startHeight + dy;
      }
      if (handle.includes("n")) {
        nextHeight = startHeight - dy;
        nextY = originY + dy;
      }

      nextWidth = clampFloatingChatWidth(nextWidth, viewportW);
      nextHeight = clampChatHeight(nextHeight, viewportH);

      if (handle.includes("w")) {
        nextX = originX + (startWidth - nextWidth);
      }
      if (handle.includes("n")) {
        nextY = originY + (startHeight - nextHeight);
      }

      onResize({ width: nextWidth, height: nextHeight });
      if (nextX !== originX || nextY !== originY) {
        onMove({ x: nextX, y: nextY });
      }
    };

    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <aside
      className={`chat-panel chat-panel-${placement}`}
      data-testid="chat-panel"
      data-placement={placement}
      data-identity-kind={identity.kind}
      data-node-id={identity.kind === "node" ? identity.nodeId : undefined}
      data-state={motionState}
      style={
        floating
          ? {
              left: position?.x ?? 24,
              top: position?.y ?? 24,
              width,
              height,
            }
          : { width }
      }
      onPointerDown={
        floating
          ? (event) => {
              const target = event.target as HTMLElement;
              if (target.closest("[data-chat-resize-handle]")) {
                return;
              }
              if (!target.closest("[data-testid='chat-header']")) {
                return;
              }
              if ((event.target as HTMLElement).closest("button")) {
                return;
              }
              const startX = event.clientX;
              const startY = event.clientY;
              const originX = position?.x ?? 24;
              const originY = position?.y ?? 24;
              const move = (moveEvent: PointerEvent) => {
                onMove({
                  x: originX + (moveEvent.clientX - startX),
                  y: originY + (moveEvent.clientY - startY),
                });
              };
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }
          : undefined
      }
    >
      <ChatHeader
        locale={locale}
        identity={identity}
        inspector={inspector}
        context={context}
        viewingNodeId={viewingNodeId}
        placement={placement}
        pinned={pinned}
        contextOpen={contextOpen}
        onClose={onClose}
        onFollow={onFollow}
        onPin={onPin}
        onPlacement={onPlacement}
        onToggleContext={() => setContextOpen((value) => !value)}
      />
      <ContextInspector locale={locale} view={inspectorView} open={contextOpen} />
      <div className="chat-scroll-body">
        <MessageList
          locale={locale}
          messages={conversation.messages}
          emptyKey={identity.kind === "project" ? "chat.emptyProject" : "chat.empty"}
        />
        {conversation.status === "thinking" ? (
          <p data-testid="chat-thinking">{t(locale, "chat.thinking")}</p>
        ) : null}
        {conversation.status === "error" && conversation.error ? (
          <p className="chat-error" role="alert" data-testid="chat-error">
            {conversation.error.message}
          </p>
        ) : null}
        <ProposalList
          locale={locale}
          proposals={conversation.proposals}
          onQuestionAction={onQuestionAction}
          onAdopt={onAdopt}
          onIgnore={onIgnore}
        />
      </div>
      {boundNodeClosed ? (
        <div className="chat-closed-notice" data-testid="chat-closed-notice">
          <p>{t(locale, "chat.closedNotice")}</p>
        </div>
      ) : null}
      <MessageComposer
        locale={locale}
        disabled={conversation.status === "thinking"}
        placeholderKey={
          identity.kind === "project"
            ? "chat.composerPlaceholderProject"
            : "chat.composerPlaceholder"
        }
        onSend={onSend}
      />
      {placement === "docked" ? (
        <PaneDivider
          invert
          orientation="vertical"
          testId="chat-resize"
          label={t(locale, "chat.resize")}
          onDrag={(delta) =>
            onResize({ width: clampChatWidth(width + delta) })
          }
          onRelease={() => undefined}
        />
      ) : (
        (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const).map((handle) => (
          <div
            key={handle}
            className={`chat-resize-handle chat-resize-${handle} nodrag nopan`}
            data-chat-resize-handle={handle}
            data-testid={`chat-resize-${handle}`}
            role="separator"
            aria-orientation={
              handle === "n" || handle === "s"
                ? "horizontal"
                : handle === "e" || handle === "w"
                  ? "vertical"
                  : undefined
            }
            aria-label={t(locale, "chat.resize")}
            onPointerDown={(event) => startFloatingResize(handle, event)}
          />
        ))
      )}
    </aside>
  );
}
