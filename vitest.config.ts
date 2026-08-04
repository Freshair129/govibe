import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Several runtime tests do real workspace and roadmap filesystem scans. Under
    // the full baseline (typecheck + build + tests in parallel) they intermittently
    // exceed vitest's 5s default. This raises the ceiling; it is not a claim that
    // they are fast.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Vitest 4 removed `environmentMatchGlobs`. `projects` is the replacement for
    // per-glob environment selection: each project extends this root config
    // (inheriting testTimeout/hookTimeout etc.) and only overrides `environment`
    // and `include`. React/DOM tests run under jsdom; backend/runtime tests run
    // under node.
    projects: [
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["scripts/**/*.test.mjs", "packages/**/*.test.mjs"],
        },
      },
    ],
  },
});
