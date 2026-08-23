import { createChatApiServer } from "./chat-api.js";

const port = Number(process.env.CHAT_API_PORT ?? 8787);
createChatApiServer({ port });
console.log(`Chat API listening on http://127.0.0.1:${port}`);
