import { expect } from '@playwright/test';

export async function openAnchor(page, path = '/#/menu') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expectMainMenu(page);
}

export async function expectMainMenu(page) {
  await expect(page.getByTestId('main-menu')).toBeVisible();
  await expect(page.getByTestId('challenge-mode-card')).toBeVisible();
  await expect(page.getByTestId('simulation-lab-card')).toBeVisible();
  await expect(page.getByTestId('learning-labs-card')).toBeVisible();
  await expectRouteIsolation(page, 'mainMenu');
}

export async function openChallengeMode(page) {
  await page.getByTestId('challenge-mode-tab').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="challenge"]')).toBeVisible();
}

export async function openSimulationLab(page) {
  await page.getByTestId('simulation-mode-tab').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="simulation"]')).toBeVisible();
}

export async function openLearningLabs(page) {
  await page.getByTestId('learning-mode-tab').click();
  await expect(page.locator('#main-menu-hub[data-hub-view="learning"]')).toBeVisible();
}

export async function openMissionSetup(page) {
  await openChallengeMode(page);
  await page.getByTestId('open-mission-setup').click();
  await expectSetupView(page);
}

export async function expectSetupView(page) {
  await expect(page.getByTestId('mission-setup-view')).toBeVisible();
  await expect(page.getByTestId('mission-mode-select')).toBeVisible();
  await expect(page.getByTestId('visibility-mode-select')).toBeVisible();
  await expect(page.getByTestId('seed-input')).toBeVisible();
  await expectRouteIsolation(page, 'missionSetup');
}

export async function startDeterministicChallenge(page, options = {}) {
  await openAnchor(page);
  await openMissionSetup(page);
  if (options.seed) await page.getByTestId('seed-input').fill(String(options.seed));
  await page.getByTestId('visibility-mode-select').selectOption('public');
  await page.getByTestId('generate-mission').click();
  await expectBriefingView(page);
}

export async function startStochasticChallenge(page, options = {}) {
  await openAnchor(page);
  await openMissionSetup(page);
  if (options.seed) await page.getByTestId('seed-input').fill(String(options.seed));
  await page.getByTestId('visibility-mode-select').selectOption('stochastic');
  await page.getByTestId('generate-mission').click();
  await expectBriefingView(page);
}

export async function expectBriefingView(page) {
  await expect(page.getByTestId('mission-briefing')).toBeVisible();
  await expect(page.getByTestId('begin-planning')).toBeVisible();
  await expect(page.getByTestId('mission-setup-view')).toHaveCount(0);
  await expectRouteIsolation(page, 'missionBriefing');
}

export async function continueFromBriefing(page) {
  await page.getByTestId('begin-planning').click();
  await expectPlanningView(page);
}

export async function expectPlanningView(page) {
  await expect(page.getByTestId('mission-planning-view')).toBeVisible();
  await expect(page.getByTestId('three-mission-canvas')).toBeVisible();
  await expect(page.getByTestId('launch-simulation')).toBeVisible();
  await expect(page.getByTestId('simulation-finish')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expectRouteIsolation(page, 'missionPlanning');
}

export async function selectPlanningAgent(page, agentId) {
  await page.locator('#waypoint-timeline [data-agent]').filter({ hasText: agentId }).first().click();
}

export async function placeWaypointAtCell(page, col, row) {
  const defaultStart = page.getByTestId('select-default-start');
  if (await defaultStart.count()) {
    await defaultStart.click();
  }
  const point = await page.evaluate(({ col, row }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(col, row), { col, row });
  if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
    await page.mouse.click(point.x, point.y);
  } else {
    const box = await page.getByTestId('three-mission-canvas').boundingBox();
    await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.5);
  }
  await expect.poll(() => page.getByTestId('waypoint-count').textContent()).not.toBe('0');
}

export async function launchSimulation(page) {
  await page.getByTestId('launch-simulation').click();
  await expectSimulationView(page);
}

export async function expectSimulationView(page) {
  await expect(page.getByTestId('mission-simulation-view')).toBeVisible();
  await expect(page.getByTestId('simulation-finish')).toBeVisible();
  await expect(page.getByTestId('launch-simulation')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expectRouteIsolation(page, 'missionSimulation');
}

export async function pauseSimulation(page) {
  await page.getByTestId('simulation-pause').click();
}

export async function resumeSimulation(page) {
  await page.getByTestId('simulation-resume').click();
}

export async function stepSimulation(page) {
  await page.getByTestId('simulation-step').click();
}

export async function finishSimulation(page) {
  await page.getByTestId('simulation-finish').click();
  await expectDebriefView(page);
}

export async function expectDebriefView(page) {
  await expect(page.getByTestId('mission-debrief-view')).toBeVisible();
  await expect(page.getByTestId('official-score')).toBeVisible();
  await expect(page.getByTestId('simulation-finish')).toHaveCount(0);
  await expectRouteIsolation(page, 'missionDebrief');
}

export async function returnToPlanning(page) {
  await page.getByTestId('return-to-planning').click();
  await expectPlanningView(page);
}

export async function rerunMission(page) {
  await page.getByTestId('rerun-mission').click();
  await expectSimulationView(page);
}

export async function returnToMainMenu(page) {
  await page.getByTestId('return-to-menu').click();
  await expectMainMenu(page);
}

export async function openPlannerBenchmark(page) {
  await openSimulationLab(page);
  await page.getByTestId('open-planner-benchmark').click();
  await expectBriefingView(page);
}

export async function openAdaptiveBenchmark(page) {
  await openSimulationLab(page);
  await page.getByTestId('open-adaptive-benchmark').click();
  await expectBriefingView(page);
}

export async function openLegacyLab(page, testId = 'open-flow-demo') {
  await openSimulationLab(page);
  await page.getByTestId(testId).click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_LEGACY_PHASER_DEBUG?.mounted === true)).toBe(true);
}

export async function leaveLegacyLab(page) {
  await page.goto('/#/menu', { waitUntil: 'domcontentloaded' });
  await expectMainMenu(page);
}

export async function expectRouteIsolation(page, routeId = null) {
  await expect.poll(() => page.evaluate(() => window.ANCHOR_UI_PARITY_DEBUG?.activeRouteRootCount ?? 0)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_UI_PARITY_DEBUG?.duplicateDomIdCount ?? 0)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_UI_PARITY_DEBUG?.staleRouteNodeCount ?? 0)).toBe(0);
  if (routeId) await expect.poll(() => page.evaluate(() => window.ANCHOR_APP_RUNTIME_DEBUG?.route?.currentRoute?.id)).toBe(routeId);
}

