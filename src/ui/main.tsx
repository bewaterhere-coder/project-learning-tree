import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { createHttpChatProvider } from "../infrastructure/chat/http-chat-provider.js";
import { resolveLlmTraceApiUrl } from "../infrastructure/llm/trace-api.js";
import { App } from "./App.js";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

function BootstrapApp() {
  const chatApiUrl = import.meta.env.VITE_CHAT_API_URL?.trim();
  const chatProvider = useMemo(() => {
    if (!chatApiUrl) {
      return undefined;
    }
    return createHttpChatProvider({ apiUrl: chatApiUrl });
  }, [chatApiUrl]);
  const llmTraceApiUrl = useMemo(() => resolveLlmTraceApiUrl(chatApiUrl), [chatApiUrl]);

  return <App chatProvider={chatProvider} llmTraceApiUrl={llmTraceApiUrl} />;
}

createRoot(root).render(
  <StrictMode>
    <BootstrapApp />
  </StrictMode>,
);
