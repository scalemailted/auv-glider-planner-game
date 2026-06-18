import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { continueFromBriefing, finishSimulation, launchSimulation, openAdaptiveBenchmark, openAnchor, openPlannerBenchmark, placeWaypointAtCell } from './helpers/AnchorDomRuntimeHarness.js';

let server;

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('planner benchmark reuses normal briefing planning simulation and debrief phases', async ({ page }) => {
  await openAnchor(page);
  await openPlannerBenchmark(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_APP_RUNTIME_DEBUG?.session?.benchmarkMode)).toBe('plannerBenchmark');
  await continueFromBriefing(page);
  await placeWaypointAtCell(page, 4, 4);
  await launchSimulation(page);
  await finishSimulation(page);
});

test('adaptive benchmark debrief exposes surfacing review and clean next-leg return to planning', async ({ page }) => {
  await openAnchor(page);
  await openAdaptiveBenchmark(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_APP_RUNTIME_DEBUG?.session?.benchmarkMode)).toBe('adaptiveBenchmark');
  await continueFromBriefing(page);
  await placeWaypointAtCell(page, 5, 5);
  await launchSimulation(page);
  await finishSimulation(page);
  await expect(page.getByTestId('adaptive-surfacing-review')).toBeVisible();
  await page.getByTestId('adaptive-continue-next-leg').click();
  await expect(page.getByTestId('mission-planning-view')).toBeVisible();
});
