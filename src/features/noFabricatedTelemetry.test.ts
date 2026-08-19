// This test runs under vitest's Node-backed jsdom environment and genuinely needs filesystem
// access to source-scan src/features. There is no @types/node in this repo's browser-lib
// tsconfig (see tsconfig.json), so these Node builtin imports are unresolvable at typecheck
// time even though they resolve fine at test-run time -- same pattern as the `@ts-expect-error`
// on the backend .mjs import in src/missionContract.test.ts.
// @ts-expect-error -- Node builtin; no @types/node in this tsconfig (see comment above)
import { readFileSync } from "node:fs";
// @ts-expect-error -- Node builtin; no @types/node in this tsconfig (see comment above)
import { glob } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// TASK-PRD-020 (AUD-07): D1 Reactor Run Trigger used to drive a `setInterval` loop that
// invoked the browser's random-number API every second to fabricate CPU/GPU/temperature/TPS
// values and presented them as "Real-Time Telemetry & Hardware Status" -- a live-data-rule
// violation (PRODUCT.md). This is a regression guard, not a style lint: it source-scans every
// file under src/features (every Mission Control view) for a call to that API and fails the
// moment one reappears, naming the offending file so the violation cannot land silently again.
//
// The search token is built from parts (see RANDOM_CALL_TOKEN) so this file's own source does
// not contain the literal pattern -- otherwise the scan would flag itself, since it is under
// src/features.
//
// Scope is deliberately src/features only. Non-feature code may have legitimate,
// non-telemetry randomness -- e.g. src/mission/gateway.ts uses the same API for reconnect
// backoff jitter, which is not presented as live application state. Widening this guard to
// the whole src tree would false-positive on that and similar legitimate uses.
const RANDOM_CALL_TOKEN = ["Math", ".", "random", "("].join("");
const SELF_PATH_SUFFIX = "noFabricatedTelemetry.test.ts";

describe("guard: no fabricated (random-number) telemetry in feature views", () => {
  it("finds zero random-number-driven telemetry calls under src/features", async () => {
    const offenders: string[] = [];
    for await (const file of glob("src/features/**/*.{ts,tsx}")) {
      const normalized = file.split("\\").join("/");
      if (normalized.endsWith(SELF_PATH_SUFFIX)) continue;
      const contents = readFileSync(file, "utf8");
      if (contents.includes(RANDOM_CALL_TOKEN)) offenders.push(normalized);
    }

    expect(
      offenders,
      "Found a random-number call in feature view source -- this repo's live-data-only " +
        "product rule (PRODUCT.md) forbids presenting randomly generated values as live " +
        `telemetry or backend state. Offending file(s): ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
