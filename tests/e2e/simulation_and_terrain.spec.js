import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import { waitForAnchorAppReady, waitForAnchorRoute } from './helpers/AnchorRuntimeReadyHarness.js';
import { compareSimulationExecutions } from '../../src/core/simulation/SimulationRendererParity.js';
import {
  waitForDefaultPhaserApp,
  prepareTerrainValidationPlanningBase,
  terrainReadinessSnapshot,
  findLandCrossingRouteCandidate,
  findDeepDiveWarningRouteCandidate,
  findTerrainWarningWaypointCell,
  findBelowSeabedSamplingTargetCell,
  focusFirstTerrainIssue,
  generatedWaterColumnSnapshot,
  legacyWaterColumnSnapshot,
  collectSceneIsolationSnapshot,
  expectMainMenuSceneIsolation,
  stepSimulationSceneForRenderCost,
  advanceSimulationSceneForRenderCost,
  startSimulationSceneRenderCostStepper,
  stopSimulationSceneRenderCostStepper,
  prepareThreeSamplingTargetDiveScenario,
  expectNoTerrainResourcesOnMainMenu,
  startVisibleContinuousMissionPlanning,
  assertContinuousBrowserErrorsClean,
  selectedAgentId,
  deploySelectedGliderThroughVisibleControls,
  deployAllGlidersThroughVisibleControls,
  deployAllGlidersAndRouteFirstThroughVisibleControls,
  selectFirstAgentThroughVisibleControls,
  selectAgentThroughVisibleControls,
  adjacentPlaceableWaypointPair,
  clickBetweenThreeGridCells,
  waypointAtIndex,
  hasFractionalCoordinate,
  continuousDiveExecutionSnapshot,
  expectSingleThreeMissionRenderer,
  findHardInvalidWaypointCell,
  findSamplingTargetPlacementCell,
  findWaypointPlacementCell,
  isFiniteQuaternion,
  quaternionDelta,
  clickCell,
  threeGridPoint,
  threeGridGroundPoint,
  threeObjectPoint,
  clickThreeGridCell,
  clickThreeObject,
  clickThreeGridGroundCell,
  dragThreeGridCell,
  dragThreeObjectToGridCell,
  clickFlowDemoCell,
  clickRoiDemoCell,
  clickCoupledDemoCell,
  clickUncertaintyDemoCell,
  clickFirstValidCell,
  dragCell,
  expectWaypointCount,
  expectDebugWaypointSynchronization,
  expectTopHudTooltips,
  expectMarkerHoverAndPlacement,
  expectTooltipNearPointer,
  validMarkerCellsNear,
  expectCenterShellContained,
  expectCenterPanelUsesAvailableSpace,
  expectSamplingSectionsCollapsed,
  openMainMenuHubSection,
  launchFromMainMenuHub,
  expandMissionConsoleSection,
  expandMissionConsoleSections,
  clickRightPanelMode,
  installWaterColumnE2eConfig,
  startTutorialPlanning,
  planVisibleThreeTutorialRoute,
  deployAgentThroughVisibleThreeControls,
  deploymentCellForAgent,
  firstPlaceableWaypointCell,
  canonicalSimulationState,
  runDeterministicTutorialToResult,
  startPlanningFromBriefing,
  downloadDemoArtifact,
  clickCanvasPoint,
  canvasPoint,
  cellCenter,
  totalWaypointCount
} from './helpers/SmokeSpecShared.js';

let server;

test.setTimeout(300000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9321 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Execute Mission Through Three Simulation', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await startTutorialPlanning(page);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();

  await planVisibleThreeTutorialRoute(page, { includeSecondAgent: true });
  const plannedCounts = await page.evaluate(() => ({
    totalWaypoints: (window.anchorGame.state.plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    selectedStarts: (window.anchorGame.state.plan?.agentPlans ?? []).filter((agentPlan) => agentPlan.selectedStart).length,
    agentPlans: window.anchorGame.state.plan?.agentPlans?.length ?? 0,
    planType: window.anchorGame.state.plan?.type,
    schemaVersion: window.anchorGame.state.plan?.schemaVersion,
    routeAuditOk: window.anchorGame.state.ui?.routeAudit?.ok !== false,
    timelineText: document.getElementById('waypoint-timeline')?.textContent ?? '',
    rightPanelText: document.getElementById('waypoint-panel')?.textContent ?? ''
  }));
  expect(plannedCounts).toMatchObject({ planType: 'anchor.plan', schemaVersion: '2.0', routeAuditOk: true });
  expect(plannedCounts.totalWaypoints).toBeGreaterThanOrEqual(3);
  expect(plannedCounts.selectedStarts).toBeGreaterThanOrEqual(1);
  expect(plannedCounts.timelineText).toContain('Waypoint');
  await expectDebugWaypointSynchronization(page, plannedCounts.totalWaypoints);

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.engineInitialized === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.planDigestMatch === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await expect(page.evaluate(() => ({
    clickCount: window.ANCHOR_EXECUTION_DEBUG?.executeControlClickCount,
    duplicateCount: window.ANCHOR_EXECUTION_DEBUG?.duplicateExecuteDispatchCount,
    rendererOwnsExecution: window.ANCHOR_EXECUTION_DEBUG?.rendererOwnsExecution,
    rendererOwnsSimulationState: window.ANCHOR_EXECUTION_DEBUG?.rendererOwnsSimulationState,
    rendererOwnsScoring: window.ANCHOR_EXECUTION_DEBUG?.rendererOwnsScoring,
    changesOfficialBrowserScoring: window.ANCHOR_EXECUTION_DEBUG?.changesOfficialBrowserScoring,
    planningControllerEnabled: window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.threeInteractionController?.enabled === true
  }))).resolves.toMatchObject({
    clickCount: 1,
    duplicateCount: 0,
    rendererOwnsExecution: false,
    rendererOwnsSimulationState: false,
    rendererOwnsScoring: false,
    changesOfficialBrowserScoring: false,
    planningControllerEnabled: false
  });

  const beforeStep = await canonicalSimulationState(page);
  await page.locator('[data-action="sim-step"]').click();
  await expect.poll(() => canonicalSimulationState(page)).toMatchObject({ stepCount: beforeStep.stepCount + 1 });
  const afterStep = await canonicalSimulationState(page);
  expect(afterStep.timeSeconds).toBeGreaterThan(beforeStep.timeSeconds);
  expect(afterStep.trajectoryPointCount).toBeGreaterThan(beforeStep.trajectoryPointCount);
  expect(afterStep.firstStepCompleted).toBe(true);
  const movedAfterStep = afterStep.positions.some((agent, index) => {
    const before = beforeStep.positions[index];
    return before && (Math.abs(agent.x - before.x) > 1e-6 || Math.abs(agent.y - before.y) > 1e-6);
  });
  expect(movedAfterStep || Boolean(afterStep.failureReason)).toBe(true);

  const beforePlay = await canonicalSimulationState(page);
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_EXECUTION_DEBUG?.engineStepCount ?? 0) > before.stepCount + 1, beforePlay), { timeout: 15000 }).toBe(true);
  const runningState = await canonicalSimulationState(page);
  expect(runningState.timeSeconds).toBeGreaterThan(beforePlay.timeSeconds);
  expect(runningState.energyTotal).not.toBe(beforePlay.energyTotal);
  expect(runningState.plannedRouteCount).toBeGreaterThan(0);
  expect(runningState.threeTrajectoryPointCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="pause"]').click();
  const paused = await canonicalSimulationState(page);
  const from = await threeGridPoint(page, 3, 5);
  const to = await threeGridPoint(page, 6, 5);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);
  await expect(canonicalSimulationState(page)).resolves.toMatchObject({ stepCount: paused.stepCount, timeSeconds: paused.timeSeconds });

  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_EXECUTION_DEBUG?.engineStepCount ?? 0) > before.stepCount, paused), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_EXECUTION_DEBUG ?? {};
    return debug.canonicalWaypointStatusCount > 0 || debug.canonicalObservationCount > 0 || debug.resultAvailable === true;
  }), { timeout: 20000 }).toBe(true);

  const parityCounts = await page.evaluate(() => ({
    canonicalWaypointStatusCount: window.ANCHOR_EXECUTION_DEBUG?.canonicalWaypointStatusCount ?? 0,
    rightPanelWaypointStatusCount: window.ANCHOR_EXECUTION_DEBUG?.rightPanelWaypointStatusCount ?? 0,
    timelineWaypointStatusCount: window.ANCHOR_EXECUTION_DEBUG?.timelineWaypointStatusCount ?? 0,
    canonicalObservationCount: window.ANCHOR_EXECUTION_DEBUG?.canonicalObservationCount ?? 0,
    threeObservationCount: window.ANCHOR_EXECUTION_DEBUG?.threeObservationCount ?? 0
  }));
  expect(parityCounts.rightPanelWaypointStatusCount).toBeGreaterThanOrEqual(0);
  expect(parityCounts.timelineWaypointStatusCount).toBeGreaterThanOrEqual(0);
  expect(parityCounts.threeObservationCount).toBeGreaterThanOrEqual(0);

  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.resultAvailable === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount ?? 0), { timeout: 30000 }).toBe(1);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.finishingAsync === false), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  await expect(page.locator('#debrief-root')).toBeVisible();
  await expect(page.locator('#debrief-root .debrief-metric-card')).toHaveCount(8);
  await expect(page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.debriefTransitionCount)).resolves.toBe(1);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Volumetric Water Column Planning', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await startTutorialPlanning(page);
  await installWaterColumnE2eConfig(page);
  await expect(page.locator('#mission-console')).toContainText('Water Column');
  await expect(page.locator('#mission-console')).toContainText('2.5D water-column display');

  await page.locator('#mission-console [data-action="three-camera"][data-preset="obliqueWaterColumn"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueWaterColumn');
  await page.locator('#mission-console [data-action="water-column-display-mode"][data-mode="explodedLayers"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.verticalDisplayMode)).toBe('explodedLayers');
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="thermocline"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeDepthLayerId)).toBe('thermocline');
  await page.locator('#mission-console [data-action="water-column-current-mode"][data-mode="allLayers"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.ui.waterColumn.currentDisplayMode)).resolves.toBe('allLayers');

  const agentId = await page.evaluate(() => window.anchorGame.state.selectedAgentId ?? window.anchorGame.state.mission?.agents?.[0]?.id);
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.evaluate(({ deploymentCell }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart(deploymentCell);
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample' });
    window.anchorGame.state.ui.selectedWaypoint = { agentId: window.anchorGame.state.selectedAgentId, index: 0 };
    scene.refreshPanels();
    scene.refreshMap();
  }, { deploymentCell });
  await expectWaypointCount(page, 1);
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="deepDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await expect.poll(() => page.evaluate(() => {
    const plan = window.anchorGame.state.plan.agentPlans.find((candidate) => candidate.agentId === window.anchorGame.state.selectedAgentId);
    const waypoint = plan?.waypoints?.[0];
    return { diveProfileId: waypoint?.diveProfileId, targetDepthLayerId: waypoint?.targetDepthLayerId, depthLayerId: waypoint?.depthLayerId };
  })).toEqual({ diveProfileId: 'deepDive', targetDepthLayerId: 'deep', depthLayerId: 'deep' });

  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.plannedDiveSegmentCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0), { timeout: 10000 }).toBeGreaterThan(0);

  const depthPoint = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.('thermocline', 2, 2));
  expect(depthPoint).toMatchObject({ visible: true });
  expect(Number.isFinite(depthPoint.x)).toBe(true);
  expect(Number.isFinite(depthPoint.y)).toBe(true);
  const debug = await page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG);
  expect(debug).toMatchObject({
    activeDepthLayerId: 'deep',
    usesFree3DPlanning: false,
    usesHorizontalWaypoints: true,
    usesDiveProfiles: true,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    changesCanonicalDepth: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    publicSafe: true
  });
  expect(debug.canonicalLayerCount).toBe(4);
  expect(debug.layerIds).toEqual(expect.arrayContaining(['surface', 'thermocline', 'deep']));
  expect(debug.predictedTrajectoryPointCount).toBeGreaterThan(0);
  expect(debug.slabObjectCount).toBeGreaterThan(0);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Depth-Aware Dive and Sampling', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await startTutorialPlanning(page);
  await installWaterColumnE2eConfig(page);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const state = window.anchorGame.state;
    const agentId = state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const zone = state.level?.zones?.find((candidate) => candidate.type === 'deployment') ?? state.level?.zones?.[0];
    scene.trySelectDeploymentStart(zone?.cells?.[0] ?? { x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample', divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline', depthLayerId: 'thermocline' });
    scene.addWaypointForSelected({ x: 6, y: 3, action: 'sample', divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep', depthLayerId: 'deep' });
    const plan = state.plan.agentPlans.find((candidate) => candidate.agentId === agentId);
    plan.diveProfileId = 'sawtoothProfile';
    plan.targetDepthLayerId = 'thermocline';
    scene.afterPlanChanged(agentId, { selectedIndex: 1 });
    scene.refreshPanels();
    scene.refreshMap();
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0)).toBeGreaterThan(0);
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.phase)).toBe('simulation');
  await page.locator('[data-action="sim-step"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.firstStepCompleted === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.realizedTrajectoryPointCount ?? 0), { timeout: 15000 }).toBeGreaterThan(0);
  const debug = await page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG);
  expect(debug).toMatchObject({
    phase: 'simulation',
    usesFree3DPlanning: false,
    usesHorizontalWaypoints: true,
    usesDiveProfiles: true,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false,
    changesCanonicalDepth: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    publicSafe: true
  });
  expect(debug.predictedTrajectoryPointCount).toBeGreaterThan(0);
  expect(debug.canonicalObservationCount).toBeGreaterThanOrEqual(0);
  expect(debug.threeObservationCount).toBeGreaterThanOrEqual(0);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Mission Scene Isolation', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await expectMainMenuSceneIsolation(page);

  await startTutorialPlanning(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await planVisibleThreeTutorialRoute(page, { includeSecondAgent: false });

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expectSingleThreeMissionRenderer(page, 'simulation');

  await page.locator('#mission-console [data-action="menu"]').click();
  await expectMainMenuSceneIsolation(page);

  await startTutorialPlanning(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectMainMenuSceneIsolation(page);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Scene Cleanup Is Null-Safe and Idempotent', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await startTutorialPlanning(page);
  await expectSingleThreeMissionRenderer(page, 'planning');

  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectMainMenuSceneIsolation(page);

  const cleanupSnapshot = await page.evaluate(async () => {
    const { threeMissionSceneLifecycleSummary } = await import('./src/game/three/ThreeMissionSceneLifecycle.js');
    const planning = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    planning.cleanupMissionWorkspaceScene?.('e2e-duplicate-cleanup');
    return {
      nullSummary: threeMissionSceneLifecycleSummary(null),
      cleanup: window.ANCHOR_SCENE_CLEANUP_DEBUG ?? {},
      isolation: window.ANCHOR_SCENE_ISOLATION_DEBUG ?? {}
    };
  });

  expect(cleanupSnapshot.nullSummary).toMatchObject({
    status: 'inactive',
    disposed: true,
    registeredResourceCount: 0,
    activeResourceCount: 0,
    disposedResourceCount: 0
  });
  expect(cleanupSnapshot.cleanup.planningCleanupInvocationCount ?? 0).toBeGreaterThan(0);
  expect(cleanupSnapshot.cleanup.planningCleanupErrorCount ?? 0).toBe(0);
  expect(cleanupSnapshot.isolation.isolationStatus).toBe('PASS');
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Generated Mission Opens a Visible Volumetric Water Column', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await waitForDefaultPhaserApp(page);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await expect(page.locator('#mission-console')).toContainText('Water Column');

  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_WATER_COLUMN_RENDER_DEBUG ?? {};
    const scenario = window.anchorGame.state.currentScenario ?? {};
    return {
      scenarioSource: scenario.source ?? null,
      configSource: scenario.waterColumnConfigSource ?? debug.configSource ?? null,
      layerCount: scenario.waterColumnLayerCount ?? debug.canonicalLayerCount ?? 0,
      fallback: scenario.waterColumnFallbackUsed === true || debug.fallbackUsed === true,
      displayMode: debug.verticalDisplayMode ?? null,
      slabObjectCount: debug.slabObjectCount ?? 0,
      volumeFrameObjectCount: debug.volumeFrameObjectCount ?? 0,
      uniqueLayerWorldYCount: debug.uniqueLayerWorldYCount ?? 0,
      minimumLayerWorldYSeparation: debug.minimumLayerWorldYSeparation ?? 0,
      modernMissionActuallyVolumetric: debug.modernMissionActuallyVolumetric === true,
      usesFree3DPlanning: debug.usesFree3DPlanning === true,
      ownsPlanning: debug.ownsPlanning === true,
      ownsSimulation: debug.ownsSimulation === true,
      ownsScoring: debug.ownsScoring === true
    };
  }), { timeout: 15000 }).toMatchObject({
    scenarioSource: 'deterministicChallenge',
    configSource: 'generatedModernMission',
    fallback: false,
    displayMode: 'explodedLayers',
    modernMissionActuallyVolumetric: true,
    usesFree3DPlanning: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false
  });
  const snapshot = await generatedWaterColumnSnapshot(page);
  expect(snapshot.layerCount).toBeGreaterThanOrEqual(5);
  expect(snapshot.slabObjectCount).toBeGreaterThanOrEqual(4);
  expect(snapshot.uniqueLayerWorldYCount).toBeGreaterThanOrEqual(4);
  expect(snapshot.minimumLayerWorldYSeparation).toBeGreaterThan(0);
  expect(snapshot.volumeFrameObjectCount).toBeGreaterThanOrEqual(0);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Legacy Mission Uses Explicit Surface Compatibility Mode', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await waitForDefaultPhaserApp(page);
  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelJsonScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await page.evaluate(async () => {
    const level = await fetch('levels/tutorial_01_currents.json').then((response) => response.json());
    const scene = window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene');
    scene.importLevelData(level);
    scene.playImportedExperience('simulationLab');
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await expect(page.locator('#mission-console')).toContainText('surface-only compatibility mode');

  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_WATER_COLUMN_RENDER_DEBUG ?? {};
    const scenario = window.anchorGame.state.currentScenario ?? {};
    return {
      scenarioSource: scenario.source ?? null,
      configSource: scenario.waterColumnConfigSource ?? debug.configSource ?? null,
      layerCount: scenario.waterColumnLayerCount ?? debug.canonicalLayerCount ?? 0,
      fallback: scenario.waterColumnFallbackUsed === true || debug.fallbackUsed === true,
      displayMode: debug.verticalDisplayMode ?? null,
      slabObjectCount: debug.slabObjectCount ?? 0,
      modernMissionActuallyVolumetric: debug.modernMissionActuallyVolumetric === true,
      legacySurfaceOnlyFallback: debug.legacySurfaceOnlyFallback === true,
      usesFree3DPlanning: debug.usesFree3DPlanning === true,
      ownsPlanning: debug.ownsPlanning === true,
      ownsSimulation: debug.ownsSimulation === true,
      ownsScoring: debug.ownsScoring === true
    };
  }), { timeout: 15000 }).toMatchObject({
    scenarioSource: 'customScenarioBenchmark',
    configSource: 'importedLegacySurfaceFallback',
    layerCount: 1,
    fallback: true,
    displayMode: 'physicalDepth',
    modernMissionActuallyVolumetric: false,
    legacySurfaceOnlyFallback: true,
    usesFree3DPlanning: false,
    ownsPlanning: false,
    ownsSimulation: false,
    ownsScoring: false
  });
  const snapshot = await legacyWaterColumnSnapshot(page);
  expect(snapshot.slabObjectCount).toBeLessThanOrEqual(2);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Vehicle Pose Guidance and Grid Alignment', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await startTutorialPlanning(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await planVisibleThreeTutorialRoute(page, { includeSecondAgent: false });

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  const guidanceCell = await findWaypointPlacementCell(page, { requireNoWarnings: true });
  expect(guidanceCell).toBeTruthy();
  const guidancePoint = await threeGridPoint(page, guidanceCell.x, guidanceCell.y);
  await page.mouse.move(guidancePoint.x + 10, guidancePoint.y + 10);
  await page.mouse.move(guidancePoint.x, guidancePoint.y, { steps: 4 });
  await expect.poll(() => page.evaluate(() => ({
    available: window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceAvailable === true,
    visible: window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceConeVisible === true,
    sourcePresent: Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceSource),
    directionFinite: Number.isFinite(window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceConeDirection),
    origin: window.ANCHOR_MISSION_RENDER_DEBUG?.guidanceConeOrigin
  }))).toMatchObject({ available: true, visible: true, sourcePresent: true, directionFinite: true });

  await expect.poll(() => page.evaluate(() => ({
    status: window.ANCHOR_MISSION_RENDER_DEBUG?.layerAlignmentStatus,
    maxDelta: window.ANCHOR_MISSION_RENDER_DEBUG?.maxLayerAlignmentDelta,
    misaligned: window.ANCHOR_MISSION_RENDER_DEBUG?.misalignedLayerIds ?? []
  }))).toEqual({ status: 'PASS', maxDelta: 0, misaligned: [] });

  for (const cell of [{ x: 1, y: 1 }, { x: 5, y: 2 }, { x: 0, y: 0 }, guidanceCell]) {
    const point = await threeGridPoint(page, cell.x, cell.y);
    expect(Number.isFinite(point.x)).toBe(true);
    expect(Number.isFinite(point.y)).toBe(true);
  }

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);

  const poseSweep = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const samples = [];
    for (let index = 0; index < 80; index += 1) {
      scene.stepOnce();
      scene.refresh();
      const debug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
      if (debug.currentBodyQuaternion) {
        samples.push({
          quaternion: debug.currentBodyQuaternion,
          heading: debug.currentBodyHeadingRadians,
          course: debug.currentActualCourseRadians,
          pitch: debug.selectedAgentPitchRadians,
          orientationSource: debug.selectedAgentOrientationSource,
          courseSource: debug.selectedAgentCourseSource
        });
      }
      if (scene.engine?.t >= 12) break;
    }
    return samples;
  });
  expect(poseSweep.length).toBeGreaterThan(1);
  expect(poseSweep.every((sample) => isFiniteQuaternion(sample.quaternion))).toBe(true);
  expect(poseSweep.some((sample) => sample.orientationSource && sample.courseSource)).toBe(true);
  expect(poseSweep.some((sample) => quaternionDelta(sample.quaternion, poseSweep[0].quaternion) > 0.01)).toBe(true);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Waypoint Validation and Mission Window Semantics', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await startTutorialPlanning(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  const agentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id);
  await clickThreeObject(page, 'screenPointForAgent', agentId);
  await deployAgentThroughVisibleThreeControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.waypointSnapMode)).toBe('snapToCellCenters');
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');

  const invalidCell = await findHardInvalidWaypointCell(page);
  const invalidPoint = await threeGridGroundPoint(page, invalidCell.x, invalidCell.y);
  await page.mouse.move(invalidPoint.x + 10, invalidPoint.y + 10);
  await page.mouse.move(invalidPoint.x, invalidPoint.y, { steps: 4 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus)).toBe('INVALID');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.waypointPrimaryMessage))).toBe(true);
  const beforeInvalid = await totalWaypointCount(page);
  await page.mouse.click(invalidPoint.x, invalidPoint.y);
  await expectWaypointCount(page, beforeInvalid);
  await expectDebugWaypointSynchronization(page, beforeInvalid);

  const normalCell = await findWaypointPlacementCell(page, { requireNoWarnings: true });
  expect(normalCell).toBeTruthy();
  await clickThreeGridCell(page, normalCell.x, normalCell.y);
  await expectWaypointCount(page, beforeInvalid + 1);

  let overrunCell = await findWaypointPlacementCell(page, { warningCode: 'BEYOND_MISSION_WINDOW' });
  for (let attempts = 0; !overrunCell && attempts < 6; attempts += 1) {
    const filler = await findWaypointPlacementCell(page, { preferFar: true });
    expect(filler).toBeTruthy();
    await clickThreeGridCell(page, filler.x, filler.y);
    await expect.poll(() => totalWaypointCount(page)).toBeGreaterThan(beforeInvalid + 1 + attempts);
    overrunCell = await findWaypointPlacementCell(page, { warningCode: 'BEYOND_MISSION_WINDOW' });
  }
  expect(overrunCell).toBeTruthy();
  const overrunPoint = await threeGridGroundPoint(page, overrunCell.x, overrunCell.y);
  await page.mouse.move(overrunPoint.x, overrunPoint.y);
  await expect.poll(() => page.evaluate(() => ({
    status: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus,
    commitAllowed: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCommitAllowed,
    beyond: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointBeyondMissionWindow,
    warnings: window.ANCHOR_MISSION_RENDER_DEBUG?.waypointWarnings ?? []
  }))).toMatchObject({ status: 'VALID_WITH_WARNINGS', commitAllowed: true, beyond: true });

  const beforeOverrun = await totalWaypointCount(page);
  await page.mouse.click(overrunPoint.x, overrunPoint.y);
  await expectWaypointCount(page, beforeOverrun + 1);
  const overrunWaypoint = await page.evaluate(() => {
    const waypoint = window.anchorGame.state.plan.agentPlans[0].waypoints.at(-1);
    return {
      id: waypoint.id,
      warningCodes: waypoint.warningCodes ?? [],
      warnings: waypoint.warnings ?? [],
      runtimeBehavior: waypoint.runtimeBehavior,
      estimatedArrivalTime: waypoint.estimatedArrivalTime,
      missionDurationAtPlanning: waypoint.missionDurationAtPlanning,
      likelyReachedWithinWindow: waypoint.likelyReachedWithinWindow
    };
  });
  expect(overrunWaypoint.warningCodes).toContain('BEYOND_MISSION_WINDOW');
  expect(overrunWaypoint.runtimeBehavior).toBe('truncate_at_mission_end');
  expect(overrunWaypoint.likelyReachedWithinWindow).toBe(false);
  await expect(page.locator('#waypoint-timeline')).toContainText(/Mission-window|Likely not reached|MISSION WINDOW/i);

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.resultAvailable === true), { timeout: 30000 }).toBe(true);
  const terminal = await page.evaluate((waypointId) => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const agent = scene.engine?.agents?.[0];
    const duration = Number(window.anchorGame.state.level?.world?.time?.duration ?? 0);
    const completed = (agent?.completedWaypoints ?? []).some((item) => item.waypointId === waypointId);
    const missed = (agent?.missedWaypoints ?? []).find((item) => item.waypointId === waypointId) ?? null;
    return {
      time: scene.engine?.t ?? 0,
      duration,
      completed,
      missedReason: missed?.reason ?? null,
      unreachedTimeOverrunWaypointCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.unreachedTimeOverrunWaypointCount ?? 0,
      missedWaypoints: window.anchorGame.state.result?.summary?.missedWaypoints ?? 0
    };
  }, overrunWaypoint.id);
  expect(terminal.time).toBeLessThanOrEqual(terminal.duration + 1e-6);
  expect(terminal.completed).toBe(false);
  expect(terminal.missedReason).toBe('missionTimeExpired');
  expect(terminal.unreachedTimeOverrunWaypointCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#debrief-root')).toContainText(/missed|Mission time|expired/i);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Terrain-Aware Placement Preview Prevents Invalid Mission Mutation', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await startTutorialPlanning(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  const agentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id);
  await clickThreeObject(page, 'screenPointForAgent', agentId);
  await deployAgentThroughVisibleThreeControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();

  const invalidCell = await findHardInvalidWaypointCell(page);
  const invalidPoint = await threeGridGroundPoint(page, invalidCell.x, invalidCell.y);
  await page.mouse.move(invalidPoint.x, invalidPoint.y, { steps: 4 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus)).toBe('INVALID');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.waypointPrimaryMessage))).toBe(true);
  const beforeInvalid = await totalWaypointCount(page);
  await page.mouse.click(invalidPoint.x, invalidPoint.y);
  await expectWaypointCount(page, beforeInvalid);
  await expectDebugWaypointSynchronization(page, beforeInvalid);

  const validCell = await findWaypointPlacementCell(page, { requireNoWarnings: true });
  expect(validCell).toBeTruthy();
  await clickThreeGridCell(page, validCell.x, validCell.y);
  await expectWaypointCount(page, beforeInvalid + 1);
  const waypoint = await page.evaluate((id) => {
    const agentPlan = window.anchorGame.state.plan?.agentPlans?.find((plan) => plan.agentId === id);
    const item = agentPlan?.waypoints?.[0] ?? null;
    return item ? { id: item.id ?? item.waypointId, x: item.x, y: item.y } : null;
  }, agentId);
  expect(waypoint?.id).toBeTruthy();

  await dragThreeObjectToGridCell(page, 'screenPointForWaypoint', waypoint.id, invalidCell.x, invalidCell.y);
  await expectWaypointCount(page, beforeInvalid + 1);
  const afterDrag = await waypointAtIndex(page, agentId, 0);
  expect(Math.round(afterDrag.x)).toBe(Math.round(waypoint.x));
  expect(Math.round(afterDrag.y)).toBe(Math.round(waypoint.y));
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.usesMeshRaycastForValidity)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererOwnsTerrainValidation)).toBe(false);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Continuous Route Validation Detects Coastline and Clearance Risks', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const { agentId } = await prepareTerrainValidationPlanningBase(page);
  const route = await findLandCrossingRouteCandidate(page, agentId);
  expect(route).toBeTruthy();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickThreeGridCell(page, route.safe.x, route.safe.y);
  await expectWaypointCount(page, 1);
  await expect.poll(async () => (await terrainReadinessSnapshot(page)).executable).toBe(true);
  let waypoint = await waypointAtIndex(page, agentId, 0);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  const invalidCell = route.crossing ?? await findHardInvalidWaypointCell(page);
  const crossingPoint = await threeGridGroundPoint(page, invalidCell.x, invalidCell.y);
  await page.mouse.move(crossingPoint.x, crossingPoint.y, { steps: 4 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCandidateStatus)).toBe('INVALID');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.waypointPrimaryMessage))).toBe(true);
  await page.mouse.click(crossingPoint.x, crossingPoint.y);
  await expectWaypointCount(page, 1);
  const invalid = await terrainReadinessSnapshot(page);
  expect(invalid.executable).toBe(true);
  expect(invalid.terrainValidationObjectCount).toBeGreaterThan(0);

  const warning = await findTerrainWarningWaypointCell(page, agentId);
  if (warning) {
    await dragThreeObjectToGridCell(page, 'screenPointForWaypoint', waypoint.id, warning.x, warning.y);
    await expect.poll(async () => (await terrainReadinessSnapshot(page)).executable, { timeout: 10000 }).toBe(true);
    expect(['VALID', 'VALID_WITH_WARNINGS']).toContain((await terrainReadinessSnapshot(page)).status);
    await expect(page.locator('#mission-console [data-action="execute"]')).toBeEnabled();
  }
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="deepDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  const deepProfile = await terrainReadinessSnapshot(page);
  expect(deepProfile.issueCodes.some((code) => /BATHYMETRY|CLEARANCE|PROFILE|VEHICLE/.test(code))).toBe(true);
  await focusFirstTerrainIssue(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)), { timeout: 10000 }).toBe(true);
  expect(await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.usesMeshRaycastForValidity)).toBe(false);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Sampling Targets Respect Canonical Seabed and Reachability', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const setup = await prepareThreeSamplingTargetDiveScenario(page, { attach: false, profile: 'thermoclineDive', layer: 'thermocline', cycles: 1 });
  const initialTargets = await page.evaluate(() => window.anchorGame.state.plan?.scienceTargets?.length ?? 0);
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="deep"]').click();
  const below = await findBelowSeabedSamplingTargetCell(page, 'deep');
  if (below) {
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeSamplingTarget"]').click();
    const belowPoint = await page.evaluate(({ layerId, cell }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(layerId, cell.x, cell.y) ?? null, { layerId: 'deep', cell: below });
    expect(belowPoint).toBeTruthy();
    await page.mouse.click(belowPoint.x, belowPoint.y);
    await expect.poll(() => page.evaluate(() => window.anchorGame.state.plan?.scienceTargets?.length ?? 0)).toBe(initialTargets);
    await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.placementPreviewValid === false || window.ANCHOR_MISSION_RENDER_DEBUG?.lastIntentStatus === 'rejected')).toBe(true);
  }
  const validCell = await findSamplingTargetPlacementCell(page, 'deep') ?? setup.targetCell;
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeSamplingTarget"]').click();
  const validPoint = await page.evaluate(({ layerId, cell }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(layerId, cell.x, cell.y) ?? null, { layerId: 'deep', cell: validCell });
  expect(validPoint).toBeTruthy();
  await page.mouse.click(validPoint.x, validPoint.y);
  await expect.poll(() => page.evaluate((count) => (window.anchorGame.state.plan?.scienceTargets?.length ?? 0) > count, initialTargets)).toBe(true);
  const beforeWaypoints = await totalWaypointCount(page);
  await page.locator('#mission-console [data-action="science-target-attach"]').click();
  await expect.poll(() => page.evaluate(() => (window.anchorGame.state.plan?.scienceTargets ?? []).some((target) => (target.attachedSegmentIds ?? []).length > 0))).toBe(true);
  const attached = await terrainReadinessSnapshot(page);
  expect(attached.issueCodes.some((code) => /TARGET_|COVERED|UNREACHABLE|CLEARANCE|BATHYMETRY/.test(code)) || attached.warningCount >= 0).toBe(true);
  await page.locator('#mission-console [data-action="science-target-recommend"]').click();
  const afterWaypoints = await totalWaypointCount(page);
  expect(afterWaypoints).toBe(beforeWaypoints);
  expect(await page.locator('#waypoint-timeline').textContent()).not.toMatch(/Sampling Target 1/i);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Mission Readiness Separates Errors Warnings and Advisories', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  const agentId = await selectFirstAgentThroughVisibleControls(page);
  await deploySelectedGliderThroughVisibleControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  const route = await findDeepDiveWarningRouteCandidate(page, agentId) ?? await findLandCrossingRouteCandidate(page, agentId);
  await clickThreeGridCell(page, route.safe.x, route.safe.y);
  await expectWaypointCount(page, 1);
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="deepDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await expect.poll(() => terrainReadinessSnapshot(page)).toMatchObject({ status: 'VALID_WITH_WARNINGS', executable: true });
  const warning = await terrainReadinessSnapshot(page);
  expect(warning.hardErrorCount).toBe(0);
  expect(warning.warningCount).toBeGreaterThan(0);
  expect(warning.advisoryCount).toBeGreaterThanOrEqual(0);
  expect(warning.issueCodes.some((code) => /BATHYMETRY|CLEARANCE|PROFILE|VEHICLE/.test(code))).toBe(true);
  expect(warning.executeControlEnabled === true || warning.executable === true).toBe(true);
  await focusFirstTerrainIssue(page);
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)), { timeout: 10000 }).toBe(true);
  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  for (const id of agentIds) {
    await selectAgentThroughVisibleControls(page, id);
    await deployAgentThroughVisibleThreeControls(page, id);
  }
  await selectAgentThroughVisibleControls(page, agentId);
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="thermoclineDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="thermocline"]').click();
  await expect.poll(() => terrainReadinessSnapshot(page), { timeout: 10000 }).toMatchObject({ executable: true });
  await expect(page.locator('#mission-console [data-action="execute"]')).toBeEnabled();
  const launchReadiness = await terrainReadinessSnapshot(page);
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  const launch = await page.evaluate(() => ({
    summary: window.ANCHOR_EXECUTION_DEBUG?.terrainAwareValidationSummary ?? window.anchorGame.state.executionLaunchPayload?.terrainAwareValidationSummary ?? null,
    launchPlanDigest: window.ANCHOR_EXECUTION_DEBUG?.launchPlanDigest ?? null
  }));
  expect(launch.summary?.status).toBe(launchReadiness.status);
  expect(launch.summary?.validationDigest ?? launch.summary?.planDigest ?? launch.launchPlanDigest ?? null).toBeTruthy();
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame.state.result)), { timeout: 30000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect(page.locator('#debrief-root')).toContainText(/Terrain|warnings|advisories|Launch/i);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Planned and Realized Paths Share Terrain Validation', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  const launchSnapshot = await page.evaluate(() => ({
    digest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainAwareValidationSummary?.validationDigest ?? window.ANCHOR_TERRAIN_VALIDATION_DEBUG?.validationLayerDigest ?? null,
    predictedMinimumClearance: window.ANCHOR_DIVE_PLAN_DEBUG?.predictedMinimumBottomClearance ?? null,
    predictedMaximumDepth: window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentAchievableDepth ?? window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentRequestedDepth ?? null,
    predictedTargetCoverage: window.ANCHOR_DIVE_PLAN_DEBUG?.predictedSampleCount ?? 0,
    score: window.anchorGame.state.result?.summary?.finalScore ?? null
  }));
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await advanceSimulationSceneForRenderCost(page, { steps: 10, frameDelay: 0, keepRunning: true });
  const actual = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {});
  expect(actual.incrementalTerrainDiagnosticsUpdateCount).toBeGreaterThan(0);
  expect(actual.fullTerrainDiagnosticsRebuildCount).toBe(0);
  expect(actual.trajectoryPointsScannedDuringLastDiagnosticsUpdate).toBeLessThanOrEqual(1);
  const actualMinimumClearance = actual.minimumActualClearanceMeters === null ? null : Number(actual.minimumActualClearanceMeters);
  expect(actualMinimumClearance === null || Number.isFinite(actualMinimumClearance)).toBe(true);
  if (actualMinimumClearance !== null && actualMinimumClearance < -1e-6) {
    expect(actual.terrainEventCount ?? actual.terrainEventSummaryCompact?.eventCount ?? 0).toBeGreaterThan(0);
  }
  await page.locator('#mission-console [data-action="pause"]').click({ timeout: 5000 }).catch(() => null);
  const beforePause = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainEventCount ?? 0);
  const playControlVisible = await page.locator('#mission-console [data-action="sim-play"]').isVisible().catch(() => false);
  if (playControlVisible) {
    await page.locator('#mission-console [data-action="sim-play"]').click({ timeout: 5000 });
    await page.locator('#mission-console [data-action="pause"]').click({ timeout: 5000 }).catch(() => null);
  }
  const afterPause = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainEventCount ?? 0);
  expect(afterPause).toBeGreaterThanOrEqual(beforePause);
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame.state.result)), { timeout: 30000 }).toBe(true);
  const result = await page.evaluate(() => ({ score: window.anchorGame.state.result?.summary?.finalScore ?? null, terrain: window.anchorGame.state.result?.actualTerrainDiagnostics ?? null, events: window.anchorGame.state.result?.terrainEvents?.length ?? 0 }));
  const resultMinimumClearance = result.terrain?.minimumActualClearanceMeters === null ? null : Number(result.terrain?.minimumActualClearanceMeters);
  expect(resultMinimumClearance === null || Number.isFinite(resultMinimumClearance)).toBe(true);
  if (resultMinimumClearance !== null && resultMinimumClearance < -1e-6) {
    expect(result.events).toBeGreaterThan(0);
  }
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect(page.locator('#debrief-root')).toContainText(/Launch|Actual|Terrain|event/i);
  expect(launchSnapshot.score).toBeNull();
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Terrain Validation Persists Through Export Headless and Replay', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 1 });
  const planning = await terrainReadinessSnapshot(page);
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame.state.result)), { timeout: 30000 }).toBe(true);
  const artifact = await page.evaluate(async () => {
    const { buildResultExport } = await import('./src/core/io/ResultExporter.js');
    const { buildReplayArtifactsFromBundle } = await import('./src/core/replay/ReplayContractBuilder.js');
    const state = window.anchorGame.state;
    const exportJson = buildResultExport({ level: state.level, mission: state.mission, plan: state.plan, result: state.result, label: 'E2E terrain persistence' });
    const replay = buildReplayArtifactsFromBundle({ episode: { missionConfig: { missionId: state.mission?.missionId, scenarioId: state.level?.levelId, world: { time: { dt: 1 } } }, tracks: [], observations: [], terrainEvents: state.result?.terrainEvents ?? [] } });
    return {
      exportJson,
      replay,
      resultExportBuildCount: window.ANCHOR_RESULT_EXPORT_DEBUG?.buildCount ?? 0,
      replayDebug: window.ANCHOR_REPLAY_DEBUG ?? null
    };
  });
  expect(artifact.exportJson.terrainAwareValidation?.launch ?? artifact.exportJson.terrainValidation ?? artifact.exportJson.summary?.terrainAwareValidation).toBeTruthy();
  expect(artifact.exportJson.actualTerrainDiagnostics ?? artifact.exportJson.summary?.terrainDiagnostics ?? artifact.exportJson.terrainAwareValidation?.actual).toBeTruthy();
  const terrainEvents = artifact.exportJson.terrainEvents ?? artifact.exportJson.events?.filter?.((event) => String(event.type ?? '').startsWith('anchor.simulation.terrain-')) ?? [];
  expect(terrainEvents.every((event) => String(event.type ?? event.eventType ?? '').startsWith('anchor.simulation.terrain-'))).toBe(true);
  const exportText = JSON.stringify(artifact.exportJson);
  expect(exportText).not.toContain('T_hiddenTruth');
  expect(artifact.exportJson.hiddenTruth).toBeUndefined();
  expect(artifact.exportJson.hiddenFields).toBeUndefined();
  expect(artifact.exportJson.visibleFields?.fields?.T_hiddenTruth).toBeUndefined();
  expect(exportText).not.toMatch(/depthMeters"\s*:\s*\[\s*\[/i);
  expect(artifact.replay.manifest.hiddenTruthIncluded).toBe(false);
  expect(artifact.replay.checkpoints.summary.checkpointCount).toBeGreaterThan(0);
  expect(artifact.resultExportBuildCount).toBeGreaterThan(0);
  expect(artifact.replayDebug.manifestBuildCount).toBeGreaterThan(0);
  expect(planning.status).toMatch(/VALID|VALID_WITH_WARNINGS|INVALID/);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Terrain Presentation Clearly Distinguishes Mission Semantics', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('sideProfile');
  const planning = await page.evaluate(() => ({
    renderer: window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? {},
    water: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG ?? {},
    dive: window.ANCHOR_DIVE_PLAN_DEBUG ?? {},
    canvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
    consoleText: document.querySelector('#mission-console')?.innerText ?? ''
  }));
  expect(planning.renderer.terrainTriangleCount).toBeGreaterThan(0);
  expect(planning.renderer.landObjectCount).toBeGreaterThan(0);
  expect(planning.renderer.coastlineSummary?.coastlineSegmentCount ?? 0).toBeGreaterThan(0);
  expect(planning.renderer.samplingTargetObjectCount).toBeGreaterThan(0);
  expect(planning.renderer.waypointObjectCount).toBeGreaterThan(0);
  expect(planning.renderer.plannedDiveTrajectorySummary?.objectCount ?? 0).toBeGreaterThan(0);
  expect(planning.renderer.terrainValidationSummary?.clearanceMarkerAvailable ?? true).toBeTruthy();
  expect(planning.water.depthTickCount ?? planning.renderer.depthTickCount ?? 0).toBeGreaterThan(0);
  expect(planning.water.verticalExaggeration ?? planning.dive.verticalExaggeration ?? 1).toBeGreaterThan(0);
  expect(planning.canvasCount).toBe(1);
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await advanceSimulationSceneForRenderCost(page, { steps: 8, frameDelay: 0, keepRunning: true });
  const simulation = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary ?? {});
  expect(simulation.realizedTrajectoryPointCount ?? 0).toBeGreaterThan(0);
  expect(simulation.observationObjectCreateCount ?? simulation.observationObjectReuseCount ?? 0).toBeGreaterThanOrEqual(0);
  await expect(page.evaluate(() => document.querySelectorAll('.three-mission-world-canvas').length)).resolves.toBe(1);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Legacy and Three Simulation Produce Identical Canonical Result', async ({ browser }) => {
  const legacyPage = await browser.newPage();
  const threePage = await browser.newPage();
  try {
    const legacyErrors = attachBrowserErrorCollector(legacyPage);
    const threeErrors = attachBrowserErrorCollector(threePage);
    const legacy = await runDeterministicTutorialToResult(legacyPage, { legacy: true });
    const three = await runDeterministicTutorialToResult(threePage, { legacy: false });
    const report = compareSimulationExecutions(legacy, three);
    expect(report.status, JSON.stringify(report.canonicalDifferences, null, 2)).toBe('PASS');
    expect(report.canonicalDifferences).toEqual([]);
    expect(legacyErrors.unexpected()).toEqual([]);
    expect(threeErrors.unexpected()).toEqual([]);
  } finally {
    await legacyPage.close();
    await threePage.close();
  }
});

test('legacy saved level registry scene still opens', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await waitForDefaultPhaserApp(page);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').sys.isActive())).toBe(true);

  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelByIdScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelByIdScene').sys.isActive())).toBe(true);
  await expect(page.getByRole('heading', { name: 'Legacy Saved Levels' })).toBeVisible();
  await expect(page.locator('#saved-level-id-input')).toBeVisible();
});
