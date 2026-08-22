import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
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
