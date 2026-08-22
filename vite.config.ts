import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "tests/domain/**/*.test.ts",
            "tests/application/**/*.test.ts",
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
