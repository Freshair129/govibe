import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs", "packages/**/*.test.mjs"],
    environmentMatchGlobs: [["scripts/**", "node"], ["packages/**", "node"]],
    // Several runtime tests do real workspace and roadmap filesystem scans. Under
    // the full baseline (typecheck + build + tests in parallel) they intermittently
    // exceed vitest's 5s default. This raises the ceiling; it is not a claim that
    // they are fast.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
