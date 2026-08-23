import { test, expect } from '@playwright/test';

// TASK-PRD-004 (GAP-02): this spec is the app-level E2E replacement for the fixture-only
// coverage the config used to provide. It loads the REAL Mission Control app (Vite dev server +
// sidecar, both booted by playwright.config.ts's `webServer`) and asserts on the roadmap board
// (view A2) using values that can only come from a live, connected sidecar feed:
//   - a CONNECTED transport state (not just "the page rendered something")
//   - a real `sourcePath` under docs/roadmap/, and an "approved" status pill
//   - a feature count that is cross-checked against the sidecar's own `/mission/snapshot`
//     response, fetched from inside the already-loaded page (reusing the app's own
//     bootstrapped, authenticated fetch — see src/mission-auth-bootstrap.ts — so this test
//     never has to know the sidecar token itself)
// A static-fixture or hardcoded-markup version of this view would fail every assertion below;
// so would the sidecar being down (CONNECTED never appears, or the cross-check fetch throws).
const ACTIONABLE_ROADMAP_TYPES = new Set(['task', 'sub-task', 'micro-task', 'atomic-task']);

test.describe('Mission Control — Roadmap Board (A2) live snapshot', () => {
  test('renders live roadmap data from the sidecar, not fixture markup', async ({ page }) => {
    await page.goto('/');

    // The gateway starts "disconnected" and flips to "connected" only once a real WS/HTTP
    // round-trip with the sidecar has happened (src/mission/gateway.ts). This is the load-bearing
    // proof that the sidecar is actually up and talking to this page, not just that Vite served
    // static markup.
    const statusRowState = page.locator('.status-row span').first();
    await expect(statusRowState).toHaveText('CONNECTED', { timeout: 20_000 });

    await page.getByRole('button', { name: 'A2: Roadmap Board' }).click();

    const sourcePathEl = page.locator('.a2-roadmap-source-meta code');
    await expect(sourcePathEl).toBeVisible();
    const renderedSourcePath = (await sourcePathEl.textContent())?.trim() ?? '';
    // A source path this specific (a real repo-relative markdown/HTML path) cannot come from a
    // static fixture — LANDING-GoVibe-Mockup.html has no such element at all.
    expect(renderedSourcePath).toMatch(/^docs\/roadmap\/.+\.(md|html)$/);

    const statusPill = page.locator('.a2-roadmap-source-meta .status-pill');
    await expect(statusPill).toHaveClass(/online/);
    await expect(statusPill).toContainText(/approved/i);

    const renderedTotalFeatures = Number(
      (await page.locator('.a2-roadmap-stat').nth(0).locator('strong').textContent())?.trim(),
    );
    expect(Number.isFinite(renderedTotalFeatures)).toBe(true);
    expect(renderedTotalFeatures).toBeGreaterThan(0);

    // Ground truth, fetched from the sidecar itself (from inside the page so the already-installed
    // auth bootstrap attaches the bearer token for us — this test carries no secret).
    const liveSnapshot = await page.evaluate(async () => {
      const response = await fetch('http://127.0.0.1:4310/mission/snapshot');
      if (!response.ok) throw new Error(`sidecar snapshot fetch failed: HTTP ${response.status}`);
      return response.json();
    });

    const liveRoadmap = liveSnapshot?.roadmap as
      | { sourcePath?: string; approvalStatus?: string; nodes?: Array<{ type: string }> }
      | undefined;

    expect(liveRoadmap, 'sidecar snapshot has no roadmap slice').toBeTruthy();
    expect(liveRoadmap?.sourcePath).toBe(renderedSourcePath);
    expect(liveRoadmap?.approvalStatus?.toLowerCase()).toBe('approved');
    expect(Array.isArray(liveRoadmap?.nodes) && liveRoadmap!.nodes!.length).toBeGreaterThan(0);

    // Same "actionable node" filter the board itself uses (src/features/roadmap/roadmapSelectors.ts
    // getRoadmapStats) — this pins the rendered stat to the ACTUAL live node count, not merely
    // ">0", so a regression that returns the wrong node set (empty, mis-filtered, off-by-one)
    // fails this test even though the number would still be some other positive integer.
    const expectedTotalFeatures = liveRoadmap!.nodes!.filter((node) =>
      ACTIONABLE_ROADMAP_TYPES.has(node.type),
    ).length;
    expect(renderedTotalFeatures).toBe(expectedTotalFeatures);
  });
});
