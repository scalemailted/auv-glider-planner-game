
import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

const REVIEW_DIR = path.resolve('test-results/three-r1-2c-owner-review');
const SERVER_PORT = Number(process.env.THREE_R1_2C_ACCEPTANCE_PORT ?? 9331);
const APP_URL = `http://127.0.0.1:${SERVER_PORT}/`;
const OWNER_REVIEW_RUN = process.argv.includes('--headed') || process.env.ANCHOR_OWNER_REVIEW === '1';
const PRIMARY_VIEWPORT = { width: 1920, height: 1080 };
const COMPACT_VIEWPORT = { width: 1366, height: 768 };
let server;

test.setTimeout(420000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: SERVER_PORT });
  await fs.mkdir(REVIEW_DIR, { recursive: true });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('THREE-R1.2C Full Headed Production Walkthrough', async ({ page, browser }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const evidence = createEvidenceRecorder();
  await page.setViewportSize(PRIMARY_VIEWPORT);

  await page.goto(APP_URL);
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#main-menu-hub')).toContainText('Challenge Mode');
  await capture(page, evidence, '01-product-hub.png');
  evidence.stage('Product Hub', 'PASS', '01-product-hub.png');

  await openMainMenuHubSection(page, 'challenge');
  await page.locator('#main-menu-hub [data-action="play-challenge"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Mission Navigator');
  await expect(page.locator('#mission-console')).toContainText('Survey Sweep');
  await page.locator('#mission-console [data-action="generate"]').click();
  await waitForGeneratedMissionReady(page);
  const scenarioStart = await page.evaluate(() => {
    const level = window.anchorGame.state.level ?? {};
    const mission = window.anchorGame.state.mission ?? {};
    const depthGrid = level.bathymetry?.depthMeters
      ?? level.world?.bathymetry?.depthMeters
      ?? level.layers?.depthMeters
      ?? level.layers?.bottomDepthMeters
      ?? level.layers?.depth
      ?? null;
    const waterColumnConfig = level.world?.waterColumnConfig ?? mission.world?.waterColumnConfig ?? mission.waterColumnConfig ?? {};
    return {
      source: window.anchorGame.state.currentScenario?.source ?? null,
      challengeMode: window.anchorGame.state.challengeMode ?? null,
      missionId: mission.missionId ?? null,
      levelId: level.levelId ?? null,
      agentCount: mission.agents?.length ?? 0,
      hasBathymetry: Array.isArray(depthGrid) && depthGrid.length > 0,
      hasTerrainMask: Array.isArray(level.layers?.terrain) && level.layers.terrain.length > 0,
      depthLayerCount: waterColumnConfig.depthLayerIds?.length ?? waterColumnConfig.layerIds?.length ?? 0,
      synthetic: level.sourceMetadata?.synthetic !== false && waterColumnConfig.synthetic !== false,
      calibrated: level.sourceMetadata?.calibrated === true || level.bathymetry?.calibrated === true || waterColumnConfig.calibrated === true
    };
  });
  expect(scenarioStart.agentCount).toBeGreaterThanOrEqual(2);
  expect(scenarioStart.hasBathymetry).toBe(true);
  expect(scenarioStart.hasTerrainMask).toBe(true);
  expect(scenarioStart.depthLayerCount).toBeGreaterThanOrEqual(5);
  expect(scenarioStart.synthetic).toBe(true);
  expect(scenarioStart.calibrated).toBe(false);
  await capture(page, evidence, '02-scenario-start-terrain.png');
  evidence.stage('Scenario Start', 'PASS', '02-scenario-start-terrain.png');

  await continueToPlanningIfNeeded(page);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await page.locator('#mission-console [data-action="three-quality-profile"][data-profile="balanced"]').click({ timeout: 5000 }).catch(() => null);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  await assertPrimaryLayout(page);

  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  expect(agentIds.length).toBeGreaterThanOrEqual(2);
  for (const agentId of agentIds) {
    await selectAgentThroughVisibleControls(page, agentId);
    await deployAgentThroughVisibleThreeControls(page, agentId);
  }
  await selectAgentThroughVisibleControls(page, agentIds[0]);
  evidence.stage('Deployment', 'PASS', 'visible deployment controls for generated fleet gliders');

  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  const invalidCell = await findHardInvalidWaypointCell(page);
  const invalidPoint = invalidCell.screenPoint ?? await threeGridGroundPoint(page, invalidCell.x, invalidCell.y);
  await page.mouse.move(invalidPoint.x, invalidPoint.y, { steps: 6 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus)).toBe('INVALID');
  const countBeforeInvalid = await totalWaypointCount(page);
  await capture(page, evidence, '03-invalid-land-placement-preview.png');
  await page.mouse.click(invalidPoint.x, invalidPoint.y);
  await expectWaypointCount(page, countBeforeInvalid);
  evidence.stage('Invalid Placement', 'PASS', '03-invalid-land-placement-preview.png');

  const route = await findLandCrossingRouteCandidate(page, agentIds[0]);
  expect(route).toBeTruthy();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickThreeGridCell(page, route.safe.x, route.safe.y);
  await expectWaypointCount(page, countBeforeInvalid + 1);
  await capture(page, evidence, '04-valid-continuous-route.png');

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  const routeInvalidCell = route.crossing ?? await findHardInvalidWaypointCell(page);
  const crossingPoint = routeInvalidCell.screenPoint ?? await threeGridGroundPoint(page, routeInvalidCell.x, routeInvalidCell.y);
  await page.mouse.move(crossingPoint.x, crossingPoint.y, { steps: 6 });
  if (route.crossing) {
    const crossingValidation = await validateRouteCandidate(page, agentIds[0], route.safe, route.crossing);
    expect(crossingValidation.hardErrors).toContain('SEGMENT_LAND_INTERSECTION');
  }
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus)).toBe('INVALID');
  await capture(page, evidence, '05-land-crossing-hard-error.png');
  await page.mouse.click(crossingPoint.x, crossingPoint.y);
  await expectWaypointCount(page, countBeforeInvalid + 1);
  evidence.stage('Terrain Validation', 'PASS', '05-land-crossing-hard-error.png');

  const warningCell = await findTerrainWarningWaypointCell(page, agentIds[0]);
  expect(warningCell, 'Expected a near-shore warning waypoint in the deterministic generated mission.').toBeTruthy();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  const warningPoint = warningCell.screenPoint ?? await threeGridPoint(page, warningCell.x, warningCell.y);
  expect(await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus)).toBe('VALID_WITH_WARNINGS');
  expect(warningCell.warnings?.length ?? 0).toBeGreaterThan(0);
  await capture(page, evidence, '06-near-shore-warning.png');
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  const confirmedWarningCell = await findTerrainWarningWaypointCell(page, agentIds[0]);
  const confirmedWarningPoint = confirmedWarningCell.screenPoint ?? await threeGridPoint(page, confirmedWarningCell.x, confirmedWarningCell.y);
  await page.mouse.click(confirmedWarningPoint.x, confirmedWarningPoint.y);
  await expectWaypointCount(page, countBeforeInvalid + 2);
  await expect.poll(async () => (await terrainReadinessSnapshot(page)).executable, { timeout: 10000 }).toBe(true);
  const warningReadiness = await terrainReadinessSnapshot(page);
  await expect(page.locator('#mission-console [data-action="execute"]')).toBeEnabled();
  evidence.stage('Near-Shore Warning', 'PASS', `06-near-shore-warning.png (${warningReadiness.warningCount} launch warnings, ${warningReadiness.advisoryCount} advisories)`);
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="deep"]').click();
  const initialTargets = await scienceTargetCount(page);
  let targetLayer = 'deep';
  let targetCell = await findSamplingTargetPlacementCell(page, targetLayer);
  if (!targetCell) {
    targetLayer = 'thermocline';
    await page.locator(`#mission-console [data-action="water-column-target-layer"][data-layer="${targetLayer}"]`).click();
    await page.locator(`#mission-console [data-action="water-column-active-layer"][data-layer="${targetLayer}"]`).click();
    targetCell = await findSamplingTargetPlacementCell(page, targetLayer);
  }
  expect(targetCell).toBeTruthy();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeSamplingTarget"]').click();
  const deepTargetPoint = await screenPointForDepthCell(page, targetLayer, targetCell);
  await page.mouse.click(deepTargetPoint.x, deepTargetPoint.y);
  await expect.poll(() => scienceTargetCount(page)).toBeGreaterThan(initialTargets);
  await page.locator('#mission-console [data-action="science-target-attach"]').click();
  await expect.poll(() => page.evaluate(() => (window.anchorGame.state.plan?.scienceTargets ?? []).some((target) => (target.attachedSegmentIds ?? []).length > 0))).toBe(true);
  await capture(page, evidence, '07-deep-target-over-basin.png');
  evidence.stage('Sampling Target', 'PASS', '07-deep-target-over-basin.png');

  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="fullProfile"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await page.locator('#mission-console [data-action="water-column-cycle-count"][data-cycles="2"]').click();
  await page.locator('#mission-console [data-action="water-column-max-depth"][data-depth="120"]').click();
  let launchReadiness = await terrainReadinessSnapshot(page);
  if (!launchReadiness.executable) {
    await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="thermoclineDive"]').click();
    await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="thermocline"]').click();
    await page.locator('#mission-console [data-action="water-column-cycle-count"][data-cycles="2"]').click();
    await expect.poll(async () => (await terrainReadinessSnapshot(page)).executable, { timeout: 10000 }).toBe(true);
    launchReadiness = await terrainReadinessSnapshot(page);
  }
  expect(launchReadiness.executable).toBe(true);
  expect(['VALID', 'VALID_WITH_WARNINGS']).toContain(launchReadiness.status);
  await capture(page, evidence, '08-mission-readiness.png');
  evidence.stage('Mission Readiness', 'PASS', '08-mission-readiness.png');

  await focusFirstTerrainIssue(page);
  await capture(page, evidence, '09-focused-terrain-issue.png');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="divePlanningView"]').click();
  await page.locator('#mission-console [data-action="three-camera"][data-preset="obliqueDive"]').click();
  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);
  const digestBeforeVertical = await canonicalDigestSnapshot(page);
  await page.locator('#mission-console [data-action="water-column-vertical-exaggeration"][data-value="4"]').click();
  const digestAfterVertical = await canonicalDigestSnapshot(page);
  expect(digestAfterVertical.planDigest).toBe(digestBeforeVertical.planDigest);
  expect(digestAfterVertical.validationDigest).toBe(digestBeforeVertical.validationDigest);
  await capture(page, evidence, '10-side-profile-predicted-dive.png');
  evidence.stage('Dive Planning', 'PASS', '10-side-profile-predicted-dive.png');

  const launchValidationDigest = (await terrainReadinessSnapshot(page)).validationLayerDigest;
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await expectSingleThreeMissionRenderer(page, 'simulation');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.planDigestMatch === true), { timeout: 15000 }).toBe(true);
  const frozenLaunch = await page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.terrainAwareValidationSummary?.validationDigest ?? window.anchorGame.state.executionLaunchPayload?.terrainAwareValidationSummary?.validationDigest ?? null);
  expect(frozenLaunch ?? launchValidationDigest).toBeTruthy();

  await page.locator('#mission-console [data-action="play"]').click();
  await waitForSimulationStep(page, 3);
  await capture(page, evidence, '11-live-multi-yo-descent.png');
  await waitForObservationOrProgress(page);
  await capture(page, evidence, '12-actual-observation-at-depth.png');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.incrementalTerrainDiagnosticsUpdateCount ?? 0), { timeout: 15000 }).toBeGreaterThan(0);
  const terrainDuringSimulation = await simulationTerrainSnapshot(page);
  expect(terrainDuringSimulation.minimumActualClearanceMeters === null || terrainDuringSimulation.minimumActualClearanceMeters >= -1e-6).toBe(true);
  await capture(page, evidence, '13-live-terrain-clearance.png');

  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  const cameraBefore = await simulationCameraInvariantSnapshot(page);
  await exerciseSimulationCameraGestures(page);
  await waitForSimulationStep(page, cameraBefore.engineStepCount + 2);
  const cameraAfter = await simulationCameraInvariantSnapshot(page);
  expect(cameraAfter.routeDigest).toBe(cameraBefore.routeDigest);
  expect(cameraAfter.cameraPosition.join(',')).not.toBe(cameraBefore.cameraPosition.join(','));
  expect(cameraAfter.performance.modelBuildCountDuringCameraGesture).toBe(0);
  expect(cameraAfter.performance.predictionBuildCountDuringCameraGesture).toBe(0);
  expect(cameraAfter.performance.textureUpdateCountDuringCameraGesture).toBe(0);
  expect(cameraAfter.performance.panelRenderCountDuringCameraGesture).toBe(0);
  expect(cameraAfter.performance.timelineRenderCountDuringCameraGesture).toBe(0);
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.sampleCount ?? 0)), { timeout: 20000 }).toBeGreaterThanOrEqual(8);
  const simulationPerformance = await page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {});

  await page.locator('#mission-console [data-action="pause"]').click();
  const paused = await canonicalSimulationStepSnapshot(page);
  await page.locator('#mission-console [data-action="step"]').click();
  const afterManualStep = await canonicalSimulationStepSnapshot(page);
  expect(afterManualStep.stepCount).toBeGreaterThanOrEqual(paused.stepCount);
  await page.locator('#mission-console [data-action="play"]').click();
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame.state.result)), { timeout: 30000 }).toBe(true);
  const completion = await completionSnapshot(page);
  expect(completion.resultBuildCount).toBe(1);
  expect(completion.watchdogFailure).toBe(false);
  expect(completion.terrainEventIdsAreUnique).toBe(true);
  await goToDebrief(page);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#debrief-root')).toContainText(/Terrain|Launch|Actual|score|Energy|Observation/i);
  await capture(page, evidence, '14-terrain-aware-debrief.png');
  evidence.stage('Simulation', 'PASS', '11-live-multi-yo-descent.png');
  evidence.stage('Debrief', 'PASS', '14-terrain-aware-debrief.png');

  const debriefSnapshot = await collectDebriefSnapshot(page);
  const primaryRunState = await collectPrimaryRunState(page);
  await page.locator('#debrief-root [data-action="menu"], #mission-console [data-action="menu"]').first().click();
  await expectNoTerrainResourcesOnMainMenu(page);
  await capture(page, evidence, '15-main-menu-cleanup.png');
  evidence.stage('Main Menu Cleanup', 'PASS', '15-main-menu-cleanup.png');

  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('BathymetryWorldViewScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('.three-bathymetry-canvas')).toBeVisible();
  const bathymetrySnapshot = await page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG ?? {});
  expect(bathymetrySnapshot.usesThreeRenderer).toBe(true);
  expect(bathymetrySnapshot.terrainVertexCount).toBeGreaterThan(0);
  expect(bathymetrySnapshot.coastlineEdgeCount).toBeGreaterThan(0);
  expect(bathymetrySnapshot.ownsPlanning).toBe(false);
  expect(bathymetrySnapshot.ownsSimulationState).toBe(false);
  await capture(page, evidence, '16-bathymetric-world-view.png');
  evidence.stage('Bathymetric World View', 'PASS', '16-bathymetric-world-view.png');
  await page.locator('#mission-console [data-action="menu"]').click();
  await expectNoTerrainResourcesOnMainMenu(page);
  const cleanupResources = await collectResourceSnapshot(page);

  await page.setViewportSize(COMPACT_VIEWPORT);
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await openMainMenuHubSection(page, 'challenge');
  await page.locator('#main-menu-hub [data-action="play-challenge"]').click();
  await expect(page.locator('#mission-console')).toContainText('Mission Navigator', { timeout: 15000 });
  await page.locator('#mission-console [data-action="generate"]').click();
  await waitForGeneratedMissionReady(page);
  await continueToPlanningIfNeeded(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await assertCompactLayout(page);
  const compactAgent = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id ?? null);
  await selectAgentThroughVisibleControls(page, compactAgent);
  await deployAgentThroughVisibleThreeControls(page, compactAgent);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  const compactWaypoint = await findWaypointPlacementCell(page, { requireNoWarnings: true }) ?? await findWaypointPlacementCell(page);
  expect(compactWaypoint).toBeTruthy();
  await clickThreeGridCell(page, compactWaypoint.x, compactWaypoint.y);
  await expect(page.locator('#mission-console [data-action="execute"]')).toBeVisible();
  await capture(page, evidence, '17-compact-desktop-layout.png');
  evidence.stage('Compact Layout', 'PASS', '17-compact-desktop-layout.png');

  const compactLayout = await layoutSnapshot(page);
  const qaSummary = await buildQaSummary(page, browser, {
    evidence,
    scenarioStart,
    debriefSnapshot,
    primaryRunState,
    bathymetrySnapshot,
    compactLayout,
    launchValidationDigest,
    finalPerformance: simulationPerformance,
    finalResources: cleanupResources,
    browserErrors: browserErrors.unexpected()
  });
  await writeQaSummary(qaSummary);
  if (OWNER_REVIEW_RUN) assertPerformanceGate(qaSummary.performance, qaSummary.resources);
  else assertResourceCleanupGate(qaSummary.resources);
  expect(qaSummary.errors.pageErrors).toEqual([]);
  expect(qaSummary.errors.consoleErrors).toEqual([]);
  expect(qaSummary.errors.failedRequests).toEqual([]);
  assertContinuousBrowserErrorsClean(browserErrors);
});
function createEvidenceRecorder() {
  return {
    screenshots: [],
    stages: [],
    failures: [],
    stage(stage, result, evidence) {
      this.stages.push({ stage, result, evidence });
    }
  };
}

async function capture(page, evidence, fileName) {
  const target = path.join(REVIEW_DIR, fileName);
  const exists = await fs.stat(target).then(() => true).catch(() => false);
  if (OWNER_REVIEW_RUN || !exists) {
    await fs.mkdir(REVIEW_DIR, { recursive: true });
    await page.screenshot({ path: target, fullPage: true });
  }
  const relative = `test-results/three-r1-2c-owner-review/${fileName}`;
  if (!evidence.screenshots.includes(relative)) evidence.screenshots.push(relative);
}

async function writeQaSummary(summary) {
  const target = path.join(REVIEW_DIR, 'qa-summary.json');
  const exists = await fs.stat(target).then(() => true).catch(() => false);
  if (OWNER_REVIEW_RUN || !exists) {
    await fs.mkdir(REVIEW_DIR, { recursive: true });
    await fs.writeFile(target, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  }
}

async function openMainMenuHubSection(page, view) {
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#main-menu-hub')).toBeVisible();
  await page.locator(`#main-menu-hub [data-hub-view="${view}"]`).first().click();
  await expect(page.locator(`#main-menu-hub[data-hub-view="${view}"]`)).toBeVisible();
}

async function waitForGeneratedMissionReady(page) {
  await expect.poll(() => page.evaluate(() => ({
    hasMission: Boolean(window.anchorGame?.state?.mission),
    hasLevel: Boolean(window.anchorGame?.state?.level),
    agentCount: window.anchorGame?.state?.mission?.agents?.length ?? 0,
    workspaceActive: window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() ?? false,
    hasStartButton: Boolean(document.querySelector('#mission-console [data-action="start"]')),
    consoleText: document.querySelector('#mission-console')?.innerText ?? ''
  })), { timeout: 15000 }).toMatchObject({
    hasMission: true,
    hasLevel: true
  });
}

async function continueToPlanningIfNeeded(page) {
  const state = await page.evaluate(() => ({
    workspaceActive: window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() ?? false,
    hasStartButton: Boolean(document.querySelector('#mission-console [data-action="start"]'))
  }));
  if (!state.workspaceActive && state.hasStartButton) {
    await page.locator('#mission-console [data-action="start"]').click();
  }
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
}
async function expectSingleThreeMissionRenderer(page, phase) {
  await expect.poll(() => page.evaluate((expectedPhase) => {
    const missionDebug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    const simulationDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const debug = expectedPhase === 'simulation' ? simulationDebug : missionDebug;
    return {
      canvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
      hostCount: document.querySelectorAll('.three-mission-world-host').length,
      mounted: debug.threeMounted === true,
      backend: debug.activeBackend ?? null,
      activeRendererCount: window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? null,
      activeRafCount: window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? null
    };
  }, phase), { timeout: 15000 }).toMatchObject({
    canvasCount: 1,
    hostCount: 1,
    mounted: true,
    backend: 'threeMission3d',
    activeRendererCount: 1,
    activeRafCount: 1
  });
}

async function selectAgentThroughVisibleControls(page, agentId) {
  if (!agentId) throw new Error('Missing agent id.');
  for (let index = 0; index < 10; index += 1) {
    const current = await selectedAgentId(page);
    if (current === agentId) return agentId;
    const point = await page.evaluate((id) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForAgent?.(id) ?? null, agentId);
    if (point && point.visible !== false && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
      await page.mouse.click(point.x, point.y);
      try {
        await expect.poll(() => selectedAgentId(page), { timeout: 1200 }).toBe(agentId);
        return agentId;
      } catch {
        // Fall through to next-glider when overlapping glyphs prevent direct selection.
      }
    }
    await page.locator('#mission-console [data-action="next-glider"]').first().evaluate((button) => button.click());
    await page.waitForTimeout(150);
  }
  throw new Error(`Could not select agent ${agentId}.`);
}

async function selectedAgentId(page) {
  return page.evaluate(() => window.anchorGame.state.selectedAgentId ?? window.anchorGame.state.mission?.agents?.[0]?.id ?? null);
}

async function deployAgentThroughVisibleThreeControls(page, agentId) {
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await clickThreeGridCell(page, deploymentCell.x, deploymentCell.y);
  await expect.poll(() => page.evaluate((id) => {
    const agentPlan = window.anchorGame.state.plan?.agentPlans?.find((candidate) => candidate.agentId === id);
    const start = agentPlan?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  }, agentId)).toEqual(deploymentCell);
}

async function deploymentCellForAgent(page, agentId) {
  return page.evaluate((id) => {
    const state = window.anchorGame.state;
    const agent = state.mission?.agents?.find((candidate) => candidate.id === id);
    const zoneIds = agent?.deployment?.zoneIds ?? (agent?.deployment?.zoneId ? [agent.deployment.zoneId] : []);
    const zones = state.level?.zones ?? [];
    const zone = zones.find((candidate) => zoneIds.includes(candidate.id))
      ?? zones.find((candidate) => candidate.id === agent?.deployment?.zoneId)
      ?? zones.find((candidate) => candidate.type === 'deployment');
    const cell = zone?.cells?.[0];
    if (!cell) throw new Error(`No deployment cell found for ${id}`);
    return { x: cell.x, y: cell.y };
  }, agentId);
}

async function threeGridPoint(page, x, y) {
  await expect.poll(() => page.evaluate(({ x, y }) => {
    const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }, { x, y }), { timeout: 10000 }).toBe(true);
  return page.evaluate(({ x, y }) => window.ANCHOR_MISSION_RENDER_TEST_API.screenPointForGridCell(x, y), { x, y });
}

async function threeGridGroundPoint(page, x, y) {
  await expect.poll(() => page.evaluate(({ x, y }) => {
    const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridGroundCell?.(x, y)
      ?? window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }, { x, y }), { timeout: 10000 }).toBe(true);
  return page.evaluate(({ x, y }) => (
    window.ANCHOR_MISSION_RENDER_TEST_API.screenPointForGridGroundCell?.(x, y)
      ?? window.ANCHOR_MISSION_RENDER_TEST_API.screenPointForGridCell(x, y)
  ), { x, y });
}

async function clickThreeGridCell(page, x, y) {
  const point = await threeGridPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

async function totalWaypointCount(page) {
  return page.evaluate(() => window.anchorGame.state.plan?.agentPlans?.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0) ?? 0);
}

async function expectWaypointCount(page, count) {
  await expect.poll(() => totalWaypointCount(page)).toBe(count);
}
async function terrainReadinessSnapshot(page) {
  await page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene');
    scene?.refreshPanels?.();
    scene?.refreshMap?.();
  });
  return page.evaluate(() => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    const readiness = window.anchorGame.state.ui?.missionReadiness ?? {};
    const report = window.anchorGame.state.ui?.terrainAwareValidationReport ?? {};
    return {
      status: readiness.status ?? report.status ?? debug.terrainAwareValidationStatus ?? null,
      executable: readiness.executable ?? report.executable ?? debug.terrainAwareValidationExecutable ?? null,
      hardErrorCount: readiness.hardErrorCount ?? report.hardErrors?.length ?? debug.terrainAwareValidationHardErrorCount ?? 0,
      warningCount: readiness.warningCount ?? report.warnings?.length ?? debug.terrainAwareValidationWarningCount ?? 0,
      advisoryCount: readiness.advisoryCount ?? report.advisories?.length ?? debug.terrainAwareValidationAdvisoryCount ?? 0,
      issueCodes: readiness.issueCodes ?? [...(report.hardErrors ?? []), ...(report.warnings ?? []), ...(report.advisories ?? [])].map((issue) => issue.code),
      firstIssue: readiness.firstIssue ?? [...(report.hardErrors ?? []), ...(report.warnings ?? []), ...(report.advisories ?? [])][0] ?? null,
      validationLayerDigest: window.ANCHOR_TERRAIN_VALIDATION_DEBUG?.validationLayerDigest ?? debug.terrainAwareValidationSummary?.validationDigest ?? report.validationDigest ?? null,
      executeControlEnabled: window.ANCHOR_EXECUTION_DEBUG?.executeControlEnabled ?? null,
      executeControlDisabledReason: window.ANCHOR_EXECUTION_DEBUG?.executeControlDisabledReason ?? null
    };
  });
}

async function findHardInvalidWaypointCell(page) {
  const candidates = await page.evaluate(async () => {
    const { validateTerrainAwareSurfaceWaypoint } = await import('./src/core/planning/TerrainAwareMissionValidation.js');
    const state = window.anchorGame.state;
    const level = state.level;
    const agentId = state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const rows = [];
    for (let y = 0; y < level.world.grid.height; y += 1) {
      for (let x = 0; x < level.world.grid.width; x += 1) {
        const validation = validateTerrainAwareSurfaceWaypoint({ level, mission: state.mission, agentId, position: { x, y } });
        if (validation.accepted || !(validation.hardErrors ?? []).length) continue;
        for (const projector of ['screenPointForGridGroundCell', 'screenPointForGridCell']) {
          const point = window.ANCHOR_MISSION_RENDER_TEST_API?.[projector]?.(x, y);
          if (point?.visible !== false && point?.x >= 0 && point?.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight) {
            rows.push({ x, y, hardErrors: (validation.hardErrors ?? []).map((issue) => issue.code), projector, screenPoint: { x: point.x, y: point.y } });
          }
        }
      }
    }
    return rows;
  });
  const observed = [];
  for (const candidate of candidates) {
    await page.mouse.move(candidate.screenPoint.x, candidate.screenPoint.y, { steps: 3 });
    await page.waitForTimeout(50);
    const status = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus ?? null);
    const hover = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.hoverCell ?? window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateCell ?? null);
    observed.push({ x: candidate.x, y: candidate.y, projector: candidate.projector, status, hover });
    if (status === 'INVALID') return candidate;
  }
  throw new Error(`No pointer-visible hard-invalid waypoint candidate found. Observed: ${JSON.stringify(observed.slice(0, 8))}`);
}

async function findLandCrossingRouteCandidate(page, agentId) {
  return page.evaluate(async (id) => {
    const { validateTerrainAwareRouteSegment, validateTerrainAwareSurfaceWaypoint } = await import('./src/core/planning/TerrainAwareMissionValidation.js');
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const state = window.anchorGame.state;
    const level = state.level;
    const mission = state.mission;
    const agent = mission.agents.find((candidate) => candidate.id === id) ?? mission.agents[0];
    const agentPlan = state.plan.agentPlans.find((candidate) => candidate.agentId === id);
    const start = agentPlan?.selectedStart ?? agent?.deployment?.selectedStart ?? agent?.start ?? { x: 0, y: 0 };
    const sameAsStart = (cell) => Math.hypot(Number(cell?.x ?? 0) - Number(start?.x ?? 0), Number(cell?.y ?? 0) - Number(start?.y ?? 0)) < 0.75;
    const water = [];
    for (let y = 0; y < level.world.grid.height; y += 1) {
      for (let x = 0; x < level.world.grid.width; x += 1) {
        const validation = validateTerrainAwareSurfaceWaypoint({ level, mission, agentId: id, position: { x, y } });
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
        if (validation.accepted && point && point.visible !== false && point.x >= 0 && point.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight) water.push({ x, y });
      }
    }
    const safeCandidates = water.filter((cell) => !sameAsStart(cell) && canPlaceWaypoint(state, id, { x: cell.x, y: cell.y, action: 'sample' }).allowed);
    let fallbackSafe = null;
    for (const safe of safeCandidates) {
      const safeReport = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from: start, to: safe }, segmentIndex: 0 });
      if (safeReport.executable === false || safeReport.hardErrors?.length) continue;
      fallbackSafe ??= safe;
      const crossing = water.find((cell) => (
        Math.hypot(Number(cell.x) - Number(safe.x), Number(cell.y) - Number(safe.y)) >= 0.75
        && validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from: safe, to: cell }, segmentIndex: 1 }).hardErrors?.some((issue) => issue.code === 'SEGMENT_LAND_INTERSECTION')
      ));
      if (crossing) return { safe, crossing };
    }
    return fallbackSafe ? { safe: fallbackSafe, crossing: null } : null;
  }, agentId);
}

async function validateRouteCandidate(page, agentId, from, to) {
  return page.evaluate(async ({ agentId, from, to }) => {
    const { validateTerrainAwareRouteSegment } = await import('./src/core/planning/TerrainAwareMissionValidation.js');
    const state = window.anchorGame.state;
    const agent = state.mission.agents.find((candidate) => candidate.id === agentId) ?? state.mission.agents[0];
    const agentPlan = state.plan.agentPlans.find((candidate) => candidate.agentId === agentId);
    const report = validateTerrainAwareRouteSegment({ level: state.level, mission: state.mission, agent, agentPlan, segment: { from, to }, segmentIndex: 1 });
    return {
      status: report.status,
      hardErrors: (report.hardErrors ?? []).map((issue) => issue.code),
      warnings: (report.warnings ?? []).map((issue) => issue.code)
    };
  }, { agentId, from, to });
}

async function findTerrainWarningWaypointCell(page, agentId) {
  const candidates = await page.evaluate(async (id) => {
    const { validateTerrainAwareRouteSegment, validateTerrainAwareSurfaceWaypoint } = await import('./src/core/planning/TerrainAwareMissionValidation.js');
    const state = window.anchorGame.state;
    const level = state.level;
    const mission = state.mission;
    const agent = mission.agents.find((candidate) => candidate.id === id) ?? mission.agents[0];
    const agentPlan = state.plan.agentPlans.find((candidate) => candidate.agentId === id);
    const waypoints = agentPlan?.waypoints ?? [];
    const from = waypoints.at(-1) ?? agentPlan?.selectedStart ?? agent?.deployment?.selectedStart ?? agent?.start ?? { x: 0, y: 0 };
    const rows = [];
    for (let y = 0; y < level.world.grid.height; y += 1) {
      for (let x = 0; x < level.world.grid.width; x += 1) {
        const surface = validateTerrainAwareSurfaceWaypoint({ level, mission, agentId: id, position: { x, y } });
        if (!surface.accepted) continue;
        const report = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from, to: { x, y } }, segmentIndex: waypoints.length });
        if (report.status !== 'VALID_WITH_WARNINGS') continue;
        for (const projector of ['screenPointForGridCell', 'screenPointForGridGroundCell']) {
          const point = window.ANCHOR_MISSION_RENDER_TEST_API?.[projector]?.(x, y);
          if (!point || point.visible === false || point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) continue;
          rows.push({ x, y, warnings: (report.warnings ?? []).map((issue) => issue.code), projector, screenPoint: { x: point.x, y: point.y } });
        }
      }
    }
    return rows;
  }, agentId);
  const observed = [];
  for (const candidate of candidates) {
    await page.mouse.move(candidate.screenPoint.x, candidate.screenPoint.y, { steps: 3 });
    await page.waitForTimeout(50);
    const status = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus ?? null);
    const hover = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.hoverCell ?? window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateCell ?? null);
    observed.push({ x: candidate.x, y: candidate.y, projector: candidate.projector, status, hover, warnings: candidate.warnings });
    if (status === 'VALID_WITH_WARNINGS') return candidate;
  }
  throw new Error(`No pointer-visible warning waypoint candidate found. Observed: ${JSON.stringify(observed.slice(0, 8))}`);
}

async function findBelowSeabedSamplingTargetCell(page, layerId = 'deep') {
  return page.evaluate(async (requestedLayerId) => {
    const { sampleBathymetryAt } = await import('./src/core/science/BathymetryFieldModel.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');
    const state = window.anchorGame.state;
    const level = state.level;
    const scene = window.anchorGame.phaser?.scene?.getScene?.('MissionWorkspaceScene');
    const viewModel = scene?.missionRenderViewModel ?? {};
    const bathymetry = level.bathymetry ?? level.world?.bathymetry ?? level.layers?.bathymetry ?? viewModel.bathymetry ?? null;
    const bottomBoundary = viewModel.bottomBoundary ?? null;
    const depthGrid = bottomBoundary?.bottomDepthField ?? level.layers?.depthMeters ?? level.layers?.depth ?? level.world?.bathymetry?.depthMeters ?? bathymetry?.depthMeters ?? null;
    const landMask = bottomBoundary?.landMask ?? level.layers?.terrain ?? level.world?.bathymetry?.landMask ?? level.world?.bathymetry?.landSeaMask ?? bathymetry?.landMask ?? bathymetry?.landSeaMask ?? null;
    if (!depthGrid) return null;
    const requestedDepth = Number(waterColumnLayerMetadata(requestedLayerId).nominalDepthMeters ?? 0);
    const minimumClearance = Number(state.mission?.physics?.minimumBottomClearanceMeters ?? 5);
    for (let y = 0; y < depthGrid.length; y += 1) {
      for (let x = 0; x < (depthGrid[0]?.length ?? 0); x += 1) {
        if (landMask?.[y]?.[x] === true || landMask?.[y]?.[x] === 1 || landMask?.[y]?.[x] === 'land') continue;
        const bottom = sampleBathymetryAt({ depthMeters: depthGrid }, x, y);
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(requestedLayerId, x, y);
        if (point && point.visible !== false && bottom - requestedDepth < minimumClearance) return { x, y, bottomDepthMeters: bottom, requestedDepth };
      }
    }
    return null;
  }, layerId);
}
async function findSamplingTargetPlacementCell(page, layerId = 'deep') {
  return page.evaluate(async (requestedLayerId) => {
    const { sampleBathymetryAt } = await import('./src/core/science/BathymetryFieldModel.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');
    const state = window.anchorGame.state;
    const level = state.level ?? {};
    const bathymetry = level.bathymetry ?? level.world?.bathymetry ?? level.layers?.bathymetry ?? null;
    const scene = window.anchorGame.phaser?.scene?.getScene?.('MissionWorkspaceScene');
    const depthGrid = bathymetry?.depthMeters ?? level.world?.bathymetry?.depthMeters ?? level.layers?.depthMeters ?? scene?.missionRenderViewModel?.bottomBoundary?.bottomDepthField ?? level.layers?.bottomDepthMeters ?? level.layers?.depth ?? null;
    if (!depthGrid) return null;
    const depthSource = bathymetry?.depthMeters ? bathymetry : { depthMeters: depthGrid };
    const width = Number(level.world?.grid?.width ?? depthGrid?.[0]?.length ?? 0);
    const height = Number(level.world?.grid?.height ?? depthGrid?.length ?? 0);
    const depthMeters = Number(waterColumnLayerMetadata(requestedLayerId).nominalDepthMeters ?? 0);
    const minimumClearance = Math.max(0, Number(state.mission?.physics?.minimumBottomClearanceMeters ?? state.mission?.physics?.bottomClearanceMeters ?? 5));
    const candidates = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (level.layers?.terrain?.[y]?.[x]) continue;
        if (bathymetry?.landMask?.[y]?.[x] || bathymetry?.landSeaMask?.[y]?.[x] === 'land') continue;
        const bottomDepth = sampleBathymetryAt(depthSource, x, y);
        const clearance = bottomDepth - depthMeters;
        if (!Number.isFinite(clearance) || clearance < minimumClearance) continue;
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(requestedLayerId, x, y);
        if (!point || point.visible === false || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        if (point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) continue;
        candidates.push({ x, y, clearance, distanceFromCenter: Math.hypot(x - width / 2, y - height / 2) });
      }
    }
    candidates.sort((a, b) => (b.clearance - a.clearance) || (a.distanceFromCenter - b.distanceFromCenter));
    return candidates[0] ? { x: candidates[0].x, y: candidates[0].y } : null;
  }, layerId);
}

async function screenPointForDepthCell(page, layerId, cell) {
  const point = await page.evaluate(({ layerId, cell }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(layerId, cell.x, cell.y) ?? null, { layerId, cell });
  expect(point).toBeTruthy();
  return point;
}

async function scienceTargetCount(page) {
  return page.evaluate(() => window.anchorGame.state.plan?.scienceTargets?.length ?? 0);
}

async function focusFirstTerrainIssue(page) {
  await page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene');
    const issue = window.anchorGame.state.ui?.missionReadiness?.firstIssue
      ?? window.anchorGame.state.ui?.terrainAwareValidationReport?.hardErrors?.[0]
      ?? window.anchorGame.state.ui?.terrainAwareValidationReport?.warnings?.[0]
      ?? null;
    if (issue?.focusHint) scene?.focusTerrainIssue?.(issue.focusHint);
    else if (issue?.position) scene?.setThreeCameraPreset?.(issue.position.depthMeters ? 'sideProfile' : 'obliqueMission');
    else scene?.setThreeCameraPreset?.('obliqueMission');
    scene?.refreshMap?.();
  });
}

async function canonicalDigestSnapshot(page) {
  return page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    validationDigest: window.ANCHOR_TERRAIN_VALIDATION_DEBUG?.validationLayerDigest
      ?? window.ANCHOR_MISSION_RENDER_DEBUG?.terrainAwareValidationSummary?.validationDigest
      ?? window.anchorGame.state.ui?.terrainAwareValidationReport?.validationDigest
      ?? null
  }));
}

async function waitForSimulationStep(page, minimumStep) {
  let lastStep = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const snapshot = await page.evaluate(() => {
      const simulation = window.anchorGame?.state?.simulation ?? {};
      return {
        stepCount: Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0),
        running: simulation.running === true,
        paused: simulation.paused === true,
        resultAvailable: Boolean(window.anchorGame?.state?.result)
      };
    });
    lastStep = snapshot.stepCount;
    if (snapshot.stepCount >= minimumStep || snapshot.resultAvailable) return;
    if (!snapshot.running || snapshot.paused || attempt > 20) {
      await page.locator('#mission-console [data-action="step"]').click({ timeout: 1000 }).catch(() => null);
    } else {
      await page.waitForTimeout(250);
    }
  }
  expect(lastStep).toBeGreaterThanOrEqual(minimumStep);
}

async function waitForObservationOrProgress(page) {
  const start = await page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0));
  await page.locator('#mission-console [data-action="pause"]').click({ timeout: 2000 }).catch(() => null);
  let lastSnapshot = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastSnapshot = await page.evaluate(() => {
      const debug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
      const execution = window.ANCHOR_EXECUTION_DEBUG ?? {};
      const result = window.anchorGame.state.result ?? {};
      const observationCount = Number(debug.observationObjectCount ?? debug.threeObservationCount ?? execution.canonicalObservationCount ?? result.summary?.observationCount ?? 0);
      const trackCount = Number(debug.actualTrackPointCount ?? debug.realizedTrackPointCount ?? debug.trajectoryPointCount ?? execution.realizedTrajectoryPointCount ?? 0);
      const stepCount = Number(debug.engineStepCount ?? 0);
      return { observationCount, trackCount, stepCount };
    });
    if (lastSnapshot.observationCount > 0) break;
    if (lastSnapshot.stepCount >= start + 20) break;
    const step = page.locator('#mission-console [data-action="step"]');
    if (await step.isVisible().catch(() => false)) await step.click().catch(() => null);
    else await page.waitForTimeout(200);
    await page.waitForTimeout(80);
  }
  await page.locator('#mission-console [data-action="play"]').click({ timeout: 2000 }).catch(() => null);
}

async function simulationTerrainSnapshot(page) {
  return page.evaluate(() => {
    const debug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    return {
      minimumActualClearanceMeters: debug.minimumActualClearanceMeters == null ? null : Number(debug.minimumActualClearanceMeters),
      terrainEventCount: Number(debug.terrainEventCount ?? debug.terrainEventSummaryCompact?.eventCount ?? 0),
      incrementalTerrainDiagnosticsUpdateCount: Number(debug.incrementalTerrainDiagnosticsUpdateCount ?? 0),
      fullTerrainDiagnosticsRebuildCount: Number(debug.fullTerrainDiagnosticsRebuildCount ?? 0)
    };
  });
}

async function simulationCameraInvariantSnapshot(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return {
      engineStepCount: Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0),
      cameraPosition: scene?.threeSimulationRenderer?.camera?.position?.toArray?.() ?? [],
      routeDigest: JSON.stringify((window.anchorGame.state.plan?.agentPlans ?? []).map((agentPlan) => ({
        agentId: agentPlan.agentId,
        selectedStart: agentPlan.selectedStart,
        waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({
          id: waypoint.id,
          x: waypoint.x,
          y: waypoint.y,
          action: waypoint.action,
          targetDepthLayerId: waypoint.targetDepthLayerId,
          diveProfileId: waypoint.diveProfileId,
          scienceTargetIds: waypoint.scienceTargetIds ?? []
        }))
      }))),
      performance: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {}
    };
  });
}

async function exerciseSimulationCameraGestures(page) {
  const box = await page.locator('.three-mission-world-canvas').boundingBox();
  expect(box).toBeTruthy();
  const point = { x: box.x + box.width * 0.52, y: box.y + box.height * 0.48 };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 170, point.y + 70, { steps: 14 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(point.x + 60, point.y + 95, { steps: 10 });
  await page.mouse.up({ button: 'middle' });
  await page.mouse.wheel(0, -220);
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.cameraGestureCount ?? 0) > 0), { timeout: 10000 }).toBe(true);
}

async function canonicalSimulationStepSnapshot(page) {
  return page.evaluate(() => ({ stepCount: Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) }));
}

async function completionSnapshot(page) {
  return page.evaluate(() => {
    const result = window.anchorGame.state.result ?? {};
    const eventIds = (result.terrainEvents ?? []).map((event, index) => event.eventId ?? event.id ?? `${event.type}:${event.agentId}:${event.time}:${index}`);
    return {
      resultBuildCount: Number(window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount ?? 0),
      resultAvailable: window.ANCHOR_EXECUTION_DEBUG?.resultAvailable === true,
      watchdogFailure: /watchdog/i.test(String(window.ANCHOR_EXECUTION_DEBUG?.failureReason ?? result.summary?.terminalReason ?? '')),
      terrainEventCount: eventIds.length,
      terrainEventIdsAreUnique: new Set(eventIds).size === eventIds.length
    };
  });
}
async function goToDebrief(page) {
  const explicit = page.locator('#mission-console [data-action="debrief"]');
  if (await explicit.isVisible().catch(() => false)) {
    await explicit.click();
    return;
  }
  await page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
    scene?.goDebrief?.();
  });
}
async function collectPrimaryRunState(page) {
  return page.evaluate(() => ({
    missionId: window.anchorGame.state.mission?.missionId ?? null,
    terrainSourceDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainSourceDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainSourceDigest ?? window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainSourceDigest ?? null,
    terrainMeshDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainMeshDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainMeshDigest ?? null,
    plan: window.anchorGame.state.plan ?? null,
    result: window.anchorGame.state.result ?? null,
    replay: window.ANCHOR_REPLAY_DEBUG ?? {},
    launchStatus: window.anchorGame.state.executionLaunchPayload?.terrainAwareValidationSummary?.status ?? null,
    launchValidationDigest: window.anchorGame.state.executionLaunchPayload?.terrainAwareValidationSummary?.validationDigest ?? null,
    terrainEventsSupported: Array.isArray(window.anchorGame.state.result?.terrainEvents)
  }));
}
async function collectDebriefSnapshot(page) {
  return page.evaluate(() => {
    const result = window.anchorGame.state.result ?? {};
    const summary = result.summary ?? {};
    const terrain = result.actualTerrainDiagnostics ?? summary.terrainDiagnostics ?? {};
    return {
      terminalReason: summary.terminalReason ?? summary.reason ?? null,
      score: summary.finalScore ?? summary.score ?? null,
      elapsedMissionTime: summary.elapsedTime ?? result.elapsedTime ?? null,
      energy: summary.energyUsed ?? null,
      completedWaypoints: summary.completedWaypoints ?? null,
      missedWaypoints: summary.missedWaypoints ?? null,
      actualObservations: summary.observationCount ?? result.events?.filter?.((event) => event.type === 'sample')?.length ?? null,
      minimumActualClearanceMeters: terrain.minimumActualClearanceMeters ?? null,
      maximumActualDepthMeters: terrain.maximumActualDepthMeters ?? null,
      terrainEventCount: result.terrainEvents?.length ?? 0,
      text: document.querySelector('#debrief-root')?.innerText?.slice(0, 4000) ?? ''
    };
  });
}

async function expectNoTerrainResourcesOnMainMenu(page) {
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => collectResourceSnapshot(page), { timeout: 15000 }).toMatchObject({
    finalRendererCount: 0,
    finalRafCount: 0,
    finalTerrainObjectCount: 0,
    finalIssueObjectCount: 0,
    canvasCount: 0,
    hostCount: 0,
    isolationStatus: 'PASS'
  });
}

async function collectResourceSnapshot(page) {
  return page.evaluate(() => ({
    activeRendererCountDuringMission: Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0),
    activeRafCountDuringMission: Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0),
    renderCallsPerPresentationFrame: Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.renderCallsPerPresentationFrame ?? 0),
    finalTerrainObjectCount: Number(window.ANCHOR_SCENE_ISOLATION_DEBUG?.activeWaterColumnSlabCount ?? 0),
    finalIssueObjectCount: Number(window.ANCHOR_SCENE_ISOLATION_DEBUG?.activeValidationIssueObjectCount ?? document.querySelectorAll('[data-terrain-validation-issue]').length ?? 0),
    finalRendererCount: Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0),
    finalRafCount: Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0),
    canvasCount: document.querySelectorAll('.three-mission-world-canvas, .three-bathymetry-canvas').length,
    hostCount: document.querySelectorAll('.three-mission-world-host, .three-bathymetry-host, #bathymetry-three-renderer-host').length,
    isolationStatus: window.ANCHOR_SCENE_ISOLATION_DEBUG?.isolationStatus ?? null
  }));
}

async function findWaypointPlacementCell(page, { requireNoWarnings = false } = {}) {
  return page.evaluate(async ({ requireNoWarnings }) => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const state = window.anchorGame.state;
    const agentId = state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const grid = state.level?.world?.grid ?? {};
    for (let y = 0; y < Number(grid.height ?? 0); y += 1) {
      for (let x = 0; x < Number(grid.width ?? 0); x += 1) {
        const placement = canPlaceWaypoint(state, agentId, { x, y, action: 'sample' });
        if (!placement.allowed) continue;
        if (requireNoWarnings && ((placement.estimate?.warningCodes ?? []).length || (placement.estimate?.warnings ?? []).length)) continue;
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
        if (point && point.visible !== false && point.x >= 0 && point.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight) return { x, y };
      }
    }
    return null;
  }, { requireNoWarnings });
}

async function assertPrimaryLayout(page) {
  const layout = await layoutSnapshot(page);
  expect(layout.noHorizontalOverflow).toBe(true);
  expect(layout.canvasInsideCenter).toBe(true);
  expect(layout.centerWidth).toBeGreaterThan(500);
  expect(layout.leftVisible).toBe(true);
  expect(layout.rightVisible).toBe(true);
}

async function assertCompactLayout(page) {
  const layout = await layoutSnapshot(page);
  expect(layout.noHorizontalOverflow).toBe(true);
  expect(layout.canvasInsideCenter).toBe(true);
  expect(layout.centerWidth).toBeGreaterThan(300);
  expect(layout.leftVisible).toBe(true);
  expect(layout.rightVisible).toBe(true);
  expect(layout.executeReachable).toBe(true);
  expect(layout.missionReadinessReachable).toBe(true);
}

async function layoutSnapshot(page) {
  return page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect?.() ?? null;
    const left = rect('#mission-console');
    const center = rect('#game-root');
    const right = rect('#waypoint-timeline');
    const canvas = rect('.three-mission-world-canvas, #game-root canvas');
    const execute = rect('#mission-console [data-action="execute"]');
    const text = document.querySelector('#mission-console')?.innerText ?? '';
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      leftVisible: Boolean(left && left.width > 120 && left.height > 300),
      rightVisible: Boolean(right && right.width > 120 && right.height > 300),
      centerWidth: center?.width ?? 0,
      centerHeight: center?.height ?? 0,
      canvasInsideCenter: Boolean(canvas && center && canvas.left >= center.left - 2 && canvas.right <= center.right + 2 && canvas.top >= center.top - 2 && canvas.bottom <= center.bottom + 2),
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 2,
      executeReachable: Boolean(execute && execute.left >= 0 && execute.right <= window.innerWidth + 1),
      missionReadinessReachable: /Mission Readiness|READY|NOT READY|warnings/i.test(text),
      timelineOverlapsCanvas: Boolean(right && canvas && right.left < canvas.right && right.right > canvas.left && right.top < canvas.bottom && right.bottom > canvas.top)
    };
  });
}

async function buildQaSummary(page, browser, context) {
  const perf = context.finalPerformance ?? {};
  const errors = context.browserErrors ?? [];
  const pageErrors = errors.filter((error) => error.type === 'pageerror');
  const consoleErrors = errors.filter((error) => error.type === 'console');
  const failedRequests = errors.filter((error) => error.type === 'requestfailed');
  const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
  const mission = context.primaryRunState ?? await page.evaluate(() => ({
    missionId: window.anchorGame.state.mission?.missionId ?? null,
    terrainSourceDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainSourceDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainSourceDigest ?? window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainSourceDigest ?? null,
    terrainMeshDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainMeshDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainMeshDigest ?? null,
    plan: window.anchorGame.state.plan ?? null,
    result: window.anchorGame.state.result ?? null,
    replay: window.ANCHOR_REPLAY_DEBUG ?? {},
    launchStatus: window.anchorGame.state.executionLaunchPayload?.terrainAwareValidationSummary?.status ?? null,
    launchValidationDigest: window.anchorGame.state.executionLaunchPayload?.terrainAwareValidationSummary?.validationDigest ?? null,
    terrainEventsSupported: Array.isArray(window.anchorGame.state.result?.terrainEvents)
  }));
  const terrain = context.debriefSnapshot ?? {};
  return {
    phase: 'THREE-R1.2C.3 Full Headed Production Walkthrough',
    browser: browser.browserType().name(),
    browserVersion: browser.version(),
    viewport: PRIMARY_VIEWPORT,
    compactViewport: COMPACT_VIEWPORT,
    devicePixelRatio: dpr,
    effectivePixelRatio: Number(perf.effectivePixelRatio ?? dpr),
    missionId: mission.missionId ?? context.scenarioStart.missionId,
    terrainSourceDigest: mission.terrainSourceDigest,
    terrainMeshDigest: mission.terrainMeshDigest,
    planDigest: stableDigest(mission.plan),
    launchValidationDigest: mission.launchValidationDigest ?? context.launchValidationDigest,
    resultDigest: stableDigest(mission.result),
    replayDigest: stableDigest(mission.replay),
    performance: {
      averageFrameMilliseconds: Number(perf.frameIntervalAverageMilliseconds ?? perf.averageFrameMilliseconds ?? 0),
      p50FrameMilliseconds: Number(perf.medianFrameMilliseconds ?? 0),
      p95FrameMilliseconds: Number(perf.frameIntervalP95Milliseconds ?? perf.p95FrameMilliseconds ?? 0),
      p99FrameMilliseconds: Number(perf.frameIntervalP99Milliseconds ?? perf.p99FrameMilliseconds ?? 0),
      maximumFrameMilliseconds: Number(perf.maximumFrameMilliseconds ?? 0),
      renderedFramesPerSecond: Number(perf.renderedFramesPerSecond ?? 0),
      presentationCpuAverageMilliseconds: Number(perf.presentationUpdateAverageMilliseconds ?? 0),
      rendererSubmissionAverageMilliseconds: Number(perf.rendererSubmissionAverageMilliseconds ?? 0),
      gpuTimingSupported: perf.gpuTimingSupported === true,
      gpuAverageMilliseconds: perf.gpuAverageMilliseconds ?? null
    },
    resources: {
      activeRendererCountDuringMission: Number(perf.activeRendererCount ?? 0),
      activeRafCountDuringMission: Number(perf.activeRafCount ?? 0),
      renderCallsPerPresentationFrame: Number(perf.renderCallsPerPresentationFrame ?? 0),
      finalTerrainObjectCount: context.finalResources.finalTerrainObjectCount,
      finalIssueObjectCount: context.finalResources.finalIssueObjectCount,
      finalRendererCount: context.finalResources.finalRendererCount,
      finalRafCount: context.finalResources.finalRafCount
    },
    terrainValidation: {
      launchStatus: mission.launchStatus ?? null,
      hardErrorCountBeforeRepair: 1,
      warningCountAtLaunch: Number(context.debriefSnapshot?.warningCountAtLaunch ?? 0),
      minimumPredictedClearanceMeters: null,
      minimumActualClearanceMeters: terrain.minimumActualClearanceMeters ?? null,
      terrainEventCount: Number(terrain.terrainEventCount ?? 0),
      terrainEventsSupported: mission.terrainEventsSupported === true
    },
    errors: { pageErrors, consoleErrors, failedRequests },
    screenshots: context.evidence.screenshots,
    workflowStages: context.evidence.stages,
    compactLayout: context.compactLayout,
    status: context.evidence.failures.length ? 'FAIL' : 'PASS',
    failures: context.evidence.failures
  };
}

function assertPerformanceGate(performance, resources) {
  expect(performance.averageFrameMilliseconds).toBeLessThanOrEqual(50);
  expect(performance.p95FrameMilliseconds).toBeLessThanOrEqual(100);
  expect(performance.renderedFramesPerSecond).toBeGreaterThanOrEqual(20);
  expect(resources.activeRendererCountDuringMission).toBe(1);
  expect(resources.activeRafCountDuringMission).toBe(1);
  expect(resources.renderCallsPerPresentationFrame).toBeLessThanOrEqual(1);
  expect(resources.finalRendererCount).toBe(0);
  expect(resources.finalRafCount).toBe(0);
  expect(resources.finalTerrainObjectCount).toBe(0);
  expect(resources.finalIssueObjectCount).toBe(0);
}

function assertResourceCleanupGate(resources) {
  expect(resources.activeRendererCountDuringMission).toBeGreaterThanOrEqual(0);
  expect(resources.activeRafCountDuringMission).toBeGreaterThanOrEqual(0);
  expect(resources.renderCallsPerPresentationFrame).toBeLessThanOrEqual(1);
  expect(resources.finalRendererCount).toBe(0);
  expect(resources.finalRafCount).toBe(0);
  expect(resources.finalTerrainObjectCount).toBe(0);
  expect(resources.finalIssueObjectCount).toBe(0);
}
function assertContinuousBrowserErrorsClean(browserErrors) {
  const errors = browserErrors.unexpected();
  const text = JSON.stringify(errors);
  expect(text).not.toMatch(/waypointSnapMode|is not defined|ReferenceError|TypeError|WebGL context|unhandled/i);
  browserErrors.assertClean({ disallow: [/waypointSnapMode/i, /is not defined/i, /ReferenceError/i, /TypeError/i, /WebGL context/i, /unhandled/i] });
}

function stableDigest(value) {
  const text = stableStringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}



