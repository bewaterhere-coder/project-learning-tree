import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  selectBoundConversationIdentity,
  selectContextInspectorView,
  selectLearningContext,
  type InspectorViewModel,
  type UiCommand,
} from "../../application/index.js";
import { createStubProvider, type ChatProvider, type LearningProposal } from "../../ai/index.js";
import {
  appendUserMessage,
  applyConversationError,
  createMemoryConversationStore,
  createMessageId,
  emptyRegistry,
  getConversation,
  routeReplyToIdentity,
  updateProposal,
  upsertConversation,
  type ConversationRegistry,
  type ConversationStore,
  type NodeConversation,
} from "../../conversation/index.js";
import {
  closeChat,
  followCurrentNode,
  moveFloatingChat,
  pinChatToNode,
  setChatPlacement,
  updateSelectedLayout,
  type ChatPlacement,
  type LearningWorkspace,
  type PreferenceStorage,
  type ProjectWorkspace,
  DEFAULT_CHAT_HEIGHT,
} from "../../workspace/index.js";
import { t } from "../i18n/index.js";
import { useExitHold } from "../hooks/useExitHold.js";
import { ChatPanel } from "./ChatPanel.js";

const CHAT_EXIT_MS = import.meta.env.MODE === "test" ? 0 : 220;

export function ChatHost({
  locale,
  current,
  inspector,
  workspace,
  storage,
  conversationStore,
  chatProvider,
  onWorkspace,
  runCommand,
}: {
  locale: "zh-CN" | "en-US";
  current: ProjectWorkspace;
  inspector?: InspectorViewModel;
  workspace: LearningWorkspace;
  storage: PreferenceStorage;
  conversationStore?: ConversationStore;
  chatProvider?: ChatProvider;
  onWorkspace: (next: LearningWorkspace, semantic: boolean) => void;
  runCommand: (command: UiCommand) => { ok: boolean; errorMessage?: string };
}) {
  const store = useMemo(
    () => conversationStore ?? createMemoryConversationStore({}, storage),
    [conversationStore, storage],
  );
  const provider = useMemo(() => chatProvider ?? createStubProvider(), [chatProvider]);
  const [registry, setRegistry] = useState<ConversationRegistry>(emptyRegistry);
  const registryRef = useRef(registry);
  registryRef.current = registry;
  const [chatDragWidth, setChatDragWidth] = useState<number>();
  const [chatDragHeight, setChatDragHeight] = useState<number>();
  const chatDragRef = useRef<number | null>(null);
  const chatHeightDragRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void store.loadRegistry().then((loaded) => {
      if (!cancelled) {
        registryRef.current = loaded;
        setRegistry(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  useEffect(() => {
    void store.saveRegistry(registry);
  }, [registry, store]);

  const identity = selectBoundConversationIdentity(
    current.projectId,
    current.snapshot.pass.currentFocusNodeId,
    current.layout.chatBinding,
  );
  const conversation: NodeConversation = getConversation(registry, identity);
  const context = selectLearningContext(
    current.snapshot,
    identity,
    conversation.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  );
  const inspectorView = selectContextInspectorView(context);
  const boundNode =
    identity.kind === "node" ? current.snapshot.nodes[identity.nodeId] : undefined;

  const persistRegistry = (next: ConversationRegistry) => {
    registryRef.current = next;
    setRegistry(next);
  };

  const handleSend = useCallback(
    async (input: string) => {
      const snapshot = current.snapshot;
      const captured = selectBoundConversationIdentity(
        current.projectId,
        snapshot.pass.currentFocusNodeId,
        current.layout.chatBinding,
      );
      const requestId = createMessageId();
      const existing = getConversation(registryRef.current, captured);
      const withUser = appendUserMessage(existing, input, requestId);
      persistRegistry(upsertConversation(registryRef.current, withUser));
      const requestContext = selectLearningContext(
        snapshot,
        captured,
        withUser.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      );
      try {
        const reply = await provider.complete({
          identity: captured,
          context: requestContext,
          input,
          locale,
        });
        persistRegistry(
          routeReplyToIdentity(
            registryRef.current,
            captured,
            requestId,
            reply.answer,
            reply.proposals,
            reply.suggestions ?? [],
          ),
        );
      } catch {
        const failed = applyConversationError(
          getConversation(registryRef.current, captured),
          requestId,
          t(locale, "chat.providerError"),
        );
        if (failed) {
          persistRegistry(upsertConversation(registryRef.current, failed));
        }
      }
    },
    [current.layout.chatBinding, current.projectId, current.snapshot, locale, provider],
  );

  const patchConversation = (conversation: NodeConversation) => {
    persistRegistry(upsertConversation(registryRef.current, conversation));
  };

  const handleQuestionAction = (
    proposal: Extract<LearningProposal, { type: "question" }>,
    destination: "blocking" | "frontier",
    goal: string,
  ) => {
    if (identity.kind !== "node") {
      return;
    }
    if (destination === "blocking") {
      if (goal.trim() === "") {
        patchConversation(
          updateProposal(conversation, proposal.id, {
            error: t(locale, "authoring.goalEmpty"),
          }),
        );
        return;
      }
      const ok = runCommand({
        type: "createChild",
        parentId: identity.nodeId,
        question: proposal.question,
        goal: goal.trim(),
      });
      if (!ok.ok) {
        patchConversation(
          updateProposal(getConversation(registryRef.current, identity), proposal.id, {
            error: ok.errorMessage ?? t(locale, "error.generic"),
          }),
        );
        return;
      }
      patchConversation(
        updateProposal(getConversation(registryRef.current, identity), proposal.id, {
          status: "accepted",
          error: undefined,
        }),
      );
      return;
    }
    const ok = runCommand({
      type: "moveCandidateToFrontier",
      sourceNodeId: identity.nodeId,
      question: proposal.question,
    });
    if (!ok.ok) {
      patchConversation(
        updateProposal(getConversation(registryRef.current, identity), proposal.id, {
          error: ok.errorMessage ?? t(locale, "error.generic"),
        }),
      );
      return;
    }
    patchConversation(
      updateProposal(getConversation(registryRef.current, identity), proposal.id, {
        status: "accepted",
        error: undefined,
      }),
    );
  };

  const handleAdopt = (proposal: LearningProposal, draft?: string) => {
    if (identity.kind !== "node") {
      return;
    }
    let command: UiCommand | undefined;
    if (proposal.type === "evidence") {
      command = {
        type: "addEvidence",
        nodeId: identity.nodeId,
        evidenceType: proposal.evidenceType,
        reference: draft?.trim() || proposal.reference,
        note: proposal.note,
      };
    } else if (proposal.type === "criterion") {
      command = {
        type: "addCriterion",
        nodeId: identity.nodeId,
        description: draft?.trim() || proposal.description,
        required: proposal.required,
        evidenceRequired: proposal.evidenceRequired,
      };
    } else if (proposal.type === "summary") {
      command = {
        type: "setNodeSummary",
        nodeId: identity.nodeId,
        summary: draft?.trim() || proposal.summary,
      };
    }
    if (!command) {
      return;
    }
    const ok = runCommand(command);
    if (!ok.ok) {
      patchConversation(
        updateProposal(getConversation(registryRef.current, identity), proposal.id, {
          error: ok.errorMessage ?? t(locale, "error.generic"),
        }),
      );
      return;
    }
    patchConversation(
      updateProposal(getConversation(registryRef.current, identity), proposal.id, {
        status: "accepted",
        error: undefined,
      }),
    );
  };

  const boundClosed =
    boundNode !== undefined && ["closed"].includes(boundNode.lifecycle);
  const width = chatDragWidth ?? current.layout.chatWidth;
  const height =
    chatDragHeight ?? current.layout.chatHeight ?? DEFAULT_CHAT_HEIGHT;
  const chatOpen = current.layout.chatOpen === true;
  const showChat = useExitHold(chatOpen, CHAT_EXIT_MS);

  if (!showChat) {
    return null;
  }

  return (
    <ChatPanel
      locale={locale}
      identity={identity}
      conversation={conversation}
      context={context}
      inspectorView={inspectorView}
      inspector={inspector}
      viewingNodeId={current.snapshot.pass.currentFocusNodeId}
      placement={current.layout.chatPlacement}
      width={width}
      height={height}
      position={current.layout.chatPosition}
      pinned={current.layout.chatBinding.mode === "pinned"}
      boundNodeClosed={boundClosed}
      motionState={chatOpen ? "open" : "closed"}
      onClose={() => onWorkspace(closeChat(workspace), false)}
      onFollow={() => onWorkspace(followCurrentNode(workspace), false)}
      onPin={() => {
        if (identity.kind === "node") {
          onWorkspace(pinChatToNode(workspace, identity.nodeId), false);
        }
      }}
      onPlacement={(placement: ChatPlacement) =>
        onWorkspace(setChatPlacement(workspace, placement), false)
      }
      onMove={(position) => onWorkspace(moveFloatingChat(workspace, position), false)}
      onResize={(size) => {
        chatDragRef.current = size.width;
        setChatDragWidth(size.width);
        const patch: { chatWidth: number; chatHeight?: number } = {
          chatWidth: size.width,
        };
        if (size.height !== undefined) {
          chatHeightDragRef.current = size.height;
          setChatDragHeight(size.height);
          patch.chatHeight = size.height;
        }
        onWorkspace(updateSelectedLayout(workspace, patch), false);
      }}
      onSend={(input) => {
        void handleSend(input);
      }}
      onQuestionAction={handleQuestionAction}
      onAdopt={handleAdopt}
      onIgnore={(proposal) =>
        patchConversation(updateProposal(conversation, proposal.id, { status: "ignored" }))
      }
    />
  );
}
