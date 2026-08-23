import { defineConfig, devices } from '@playwright/test';

// TASK-PRD-004 (GAP-02): `e2e/landing-page.spec.ts` tests the static marketing mockup
// (`docs/references/fixtures/LANDING-GoVibe-Mockup.html`), not Mission Control. It is KEPT
// (not deleted — see this task's PR description for the reasoning) but moved to its own config
// so it no longer defines what "E2E" means for this repo, and so running it never boots the
// Vite dev server or the sidecar (playwright.config.ts's `webServer` is scoped to that config
// only — Playwright has no per-project `webServer`, so a shared config would have forced both
// app processes to boot even for this fixture-only run).
export default defineConfig({
  testDir: './e2e',
  testMatch: 'landing-page.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report-landing' }],
    ['json', { outputFile: 'test-results/landing-results.json' }],
    ['junit', { outputFile: 'test-results/landing-junit.xml' }],
    ['list'],
  ],
  use: {
    baseURL: new URL('./docs/references/fixtures/LANDING-GoVibe-Mockup.html', import.meta.url).href,
    reducedMotion: 'reduce', // kills WebGL rAF loop (fixes teardown timeouts), disables smooth-scroll & magnetic CTAs
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: undefined,
});
