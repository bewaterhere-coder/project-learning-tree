import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { createHttpChatProvider } from "../infrastructure/chat/http-chat-provider.js";
import { App } from "./App.js";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

function BootstrapApp() {
  const chatProvider = useMemo(() => {
    const apiUrl = import.meta.env.VITE_CHAT_API_URL?.trim();
    if (!apiUrl) {
      return undefined;
    }
    return createHttpChatProvider({ apiUrl });
  }, []);

  return <App chatProvider={chatProvider} />;
}

createRoot(root).render(
  <StrictMode>
    <BootstrapApp />
  </StrictMode>,
);
