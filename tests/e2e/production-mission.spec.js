import { test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { continueFromBriefing, finishSimulation, launchSimulation, openAnchor, placeWaypointAtCell, returnToMainMenu, returnToPlanning, startDeterministicChallenge, startStochasticChallenge } from './helpers/AnchorDomRuntimeHarness.js';

let server;

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('deterministic mission flow reaches debrief through DOM shell and Three mission environment', async ({ page }) => {
  await startDeterministicChallenge(page, { seed: 101 });
  await continueFromBriefing(page);
  await placeWaypointAtCell(page, 4, 4);
  await launchSimulation(page);
  await finishSimulation(page);
  await returnToPlanning(page);
  await returnToMainMenu(page);
});

test('stochastic mission setup keeps forecast visibility metadata and reaches debrief', async ({ page }) => {
  await startStochasticChallenge(page, { seed: 202 });
  await continueFromBriefing(page);
  await placeWaypointAtCell(page, 5, 5);
  await launchSimulation(page);
  await finishSimulation(page);
});
