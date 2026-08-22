import type { LearningContext } from "../application/selectors/learning-context.js";
import type { ConversationIdentity } from "../conversation/identity.js";
import type { ChatReply } from "./types.js";

export interface ChatCompleteRequest {
  identity: ConversationIdentity;
  context: LearningContext;
  input: string;
}

export interface ChatProvider {
  complete(request: ChatCompleteRequest): Promise<ChatReply>;
}
