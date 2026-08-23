import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const CHAT_API_TARGET = process.env.CHAT_API_TARGET ?? "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/chat": {
        target: CHAT_API_TARGET,
        changeOrigin: true,
      },
    },
  },
  test: {
    exclude: ["**/e2e/**", "**/node_modules/**"],
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "tests/domain/**/*.test.ts",
            "tests/application/**/*.test.ts",
            "tests/framework/**/*.test.ts",
            "tests/workspace/**/*.test.ts",
            "tests/conversation/**/*.test.ts",
            "tests/ai/**/*.test.ts",
            "tests/infrastructure/**/*.test.ts",
            "tests/server/**/*.test.ts",
          ],
          environment: "node",
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "ui",
          include: ["tests/ui/**/*.test.ts", "tests/ui/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/setup.ts"],
        },
      },
    ],
  },
});
