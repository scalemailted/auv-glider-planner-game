import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { continueFromBriefing, expectBriefingView, expectMainMenu, expectPlanningView, expectRouteIsolation, finishSimulation, launchSimulation, openAnchor, openMissionSetup, placeWaypointAtCell, returnToMainMenu, returnToPlanning, startDeterministicChallenge } from './helpers/AnchorDomRuntimeHarness.js';

let server;

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('production route boundaries preserve separate Main Menu, Setup, Briefing, Planning, Simulation, and Debrief views', async ({ page }) => {
  await openAnchor(page);
  await expect(page.getByTestId('mission-setup-view')).toHaveCount(0);
  await openMissionSetup(page);
  await expect(page.getByTestId('mission-briefing')).toHaveCount(0);
  await page.getByTestId('generate-mission').click();
  await expectBriefingView(page);
  await expect(page.getByTestId('mission-setup-view')).toHaveCount(0);
  await continueFromBriefing(page);
  await expectPlanningView(page);
  await placeWaypointAtCell(page, 4, 4);
  await launchSimulation(page);
  await finishSimulation(page);
  await returnToPlanning(page);
  await returnToMainMenu(page);
  await expectMainMenu(page);
  await expect(page.getByTestId('mission-planning-view')).toHaveCount(0);
});

test('route geometry exposes legacy shell regions without overlap-critical omissions', async ({ page }) => {
  await startDeterministicChallenge(page, { seed: 515 });
  await continueFromBriefing(page);
  const boxes = await page.evaluate(() => {
    const ids = ['mission-console', 'center-column', 'waypoint-timeline', 'bottom-timeline', 'agent-performance-hud', 'top-hud'];
    return Object.fromEntries(ids.map((id) => {
      const rect = document.getElementById(id)?.getBoundingClientRect?.();
      return [id, rect ? { width: rect.width, height: rect.height, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null];
    }));
  });
  expect(boxes['mission-console'].width).toBeGreaterThan(100);
  expect(boxes['center-column'].width).toBeGreaterThan(300);
  expect(boxes['waypoint-timeline'].width).toBeGreaterThan(100);
  expect(boxes['center-column'].left).toBeGreaterThanOrEqual(boxes['mission-console'].right - 1);
  expect(boxes['waypoint-timeline'].left).toBeGreaterThanOrEqual(boxes['center-column'].right - 1);
  await expectRouteIsolation(page, 'missionPlanning');
});
