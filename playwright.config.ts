import { defineConfig, devices } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

// TASK-PRD-004 (GAP-02): a clean checkout has `.env.example` but no `.env`, and the app suite
// below needs a matched GOVIBE_MCP_TOKEN / VITE_GOVIBE_MCP_TOKEN pair for the sidecar and the
// Vite-served client to authenticate with each other (src/mission-auth-bootstrap.ts). Running
// the bootstrap ONCE here, synchronously, in the single config-loading process — before either
// `webServer` entry below spawns — is what avoids the race that would exist if both entries
// tried to bootstrap concurrently: `scripts/mcp/bootstrap-env.mjs` never overwrites an existing
// `.env` (safe to call again on a developer machine that already has one; see its own header
// comment), but two concurrent first-time bootstraps could each observe ".env absent" and write
// different tokens.
execFileSync(process.execPath, [path.join(repoRoot, 'scripts', 'mcp', 'bootstrap-env.mjs')], {
  stdio: 'inherit',
  cwd: repoRoot,
});

// Pinned rather than left to vite.config.ts's default (port: 1420, strictPort: false): a drifted
// port would silently move Vite to e.g. 1421 while this config's webServer.url and baseURL still
// point at 1420, racing a stale/absent server. `--strictPort` below makes a taken port a hard
// failure instead of a silent, mismatched drift.
const APP_HOST = '127.0.0.1'; // src/mission/gateway.ts's resolveLocalApiFallback only engages for 127.0.0.1/localhost origins.
const APP_PORT = 1420;
const SIDECAR_HOST = process.env.GOVIBE_MCP_HOST ?? '127.0.0.1';
const SIDECAR_PORT = Number(process.env.GOVIBE_MCP_PORT ?? 4310);

export default defineConfig({
  testDir: './e2e/app',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: `http://${APP_HOST}:${APP_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // TASK-PRD-004 (GAP-02): boots the REAL application — the Vite dev server AND the sidecar —
  // instead of pointing at a static fixture. Both entries run concurrently (Playwright's default
  // for a webServer array); each gets its own real readiness signal per constraint 5, not a sleep.
  webServer: [
    {
      // `--host` is explicit, not cosmetic: plain `vite --port` binds the "localhost" hostname,
      // which on this Windows host resolves to the IPv6 loopback (::1) first and leaves the
      // IPv4 127.0.0.1 socket refusing connections — exactly the address this config's baseURL,
      // readiness check, and the gateway's resolveLocalApiFallback all target.
      command: `npx vite --port ${APP_PORT} --strictPort --host ${APP_HOST}`,
      url: `http://${APP_HOST}:${APP_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      cwd: repoRoot,
    },
    {
      // `npm run mcp:dev` already loads `.env` via node's `--env-file-if-exists` flag, so the
      // sidecar and the Vite-served client (which reads `.env`'s VITE_-prefixed keys itself,
      // Vite's own built-in behavior) end up with the identical token bootstrap wrote above.
      // Readiness uses `port`, not `url`: every sidecar HTTP route requires both a matching
      // Origin header and a bearer token (scripts/mcp/sidecar-server.mjs), so a plain
      // unauthenticated readiness GET would always see 401/403 and never be treated as "ready".
      command: 'npm run mcp:dev',
      port: SIDECAR_PORT,
      host: SIDECAR_HOST,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      cwd: repoRoot,
    },
  ],
});
