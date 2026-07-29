import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs", "packages/**/*.test.mjs"],
    environmentMatchGlobs: [["scripts/**", "node"], ["packages/**", "node"]],
  },
});
