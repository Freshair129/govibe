import { defineConfig } from "vitest/config";

// Local config so `npm test` (vitest run) inside packages/msp-runtime works
// standalone, independent of the root G:/govibe/vitest.config.ts (which
// already separately picks up this package's tests via its own
// "packages/**/*.test.mjs" include glob when running the full repo suite).
export default defineConfig({
  test: {
    root: import.meta.dirname,
    environment: "node",
    include: ["test/**/*.test.mjs"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
