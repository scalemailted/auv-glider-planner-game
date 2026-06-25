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

test('Continuous Mission Planning Starts Without Overlay Errors', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);

  const consoleRoot = page.locator('#mission-console');
  await expect(consoleRoot).toContainText('Planning Console');
  await expect(consoleRoot).toContainText('Planning Tools');
  await expect(consoleRoot).toContainText('Waypoint Placement');
  await expect(consoleRoot).toContainText('Water Column');
  await expect(consoleRoot).toContainText('Dive Planning');
  await expect(consoleRoot).toContainText('Field Rendering');
  await expect(consoleRoot).toContainText('Camera Controls');
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expect(page.locator('.three-mission-world-canvas')).toHaveCount(1);

  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.planningSceneCreateCompleted === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayFirstRenderCompleted === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayRuntimeErrorCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.uiStateValid === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayControlBindCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererRuntimeErrorCount ?? -1)).toBe(0);

  const debug = await page.evaluate(() => ({
    continuous: window.ANCHOR_CONTINUOUS_MISSION_DEBUG,
    ui: window.ANCHOR_CONTINUOUS_UI_DEBUG,
    render: window.ANCHOR_MISSION_RENDER_DEBUG,
    waterColumn: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG
  }));
  expect(debug.continuous).toMatchObject({
    uiStateValid: true,
    coordinateProfileId: 'continuousGridV1',
    waypointSnapMode: 'freePlacement',
    fieldSamplingProfileId: 'continuousTrilinearV1',
    planningWorkspaceVisible: true,
    planningControlsVisible: true,
    planningInteractionEnabled: true,
    overlayRuntimeErrorCount: 0,
    planningSceneCreateCompleted: true,
    usesContinuousWaypoints: true,
    usesCanonical3DDiveState: true,
    usesArbitraryXYZRoutePlanning: false,
    rendererOwnsPlanning: false,
    rendererOwnsSimulation: false,
    rendererOwnsScoring: false
  });
  expect(debug.ui.availableWaypointSnapModes).toEqual(expect.arrayContaining(['freePlacement', 'snapToCellCenters', 'snapToFeature']));
  expect(debug.ui.availableVolumeRenderModes).toEqual(expect.arrayContaining(['layerSlices', 'smoothedSlices', 'volumetricCloud', 'hybrid']));
  expect(debug.render).toMatchObject({ activeBackend: 'threeMission3d', ownsPlanning: false, ownsScoring: false });
  expect(debug.waterColumn.publicSafe).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Continuous Mission Controls Are Visible and Functional', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');

  const agentId = await selectedAgentId(page);
  await deploySelectedGliderThroughVisibleControls(page, agentId);

  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="freePlacement"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.waypointSnapMode)).toBe('freePlacement');
  const firstPair = await adjacentPlaceableWaypointPair(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickBetweenThreeGridCells(page, firstPair.a, firstPair.b, 0.37);
  await expectWaypointCount(page, 1);
  const fractionalWaypoint = await waypointAtIndex(page, agentId, 0);
  expect(hasFractionalCoordinate(fractionalWaypoint)).toBe(true);
  expect(fractionalWaypoint.coordinateProfileId).toBe('continuousGridV1');

  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_UI_DEBUG?.waypointSnapMode)).toBe('snapToCellCenters');
  const secondPair = await adjacentPlaceableWaypointPair(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickBetweenThreeGridCells(page, secondPair.a, secondPair.b, 0.42);
  await expectWaypointCount(page, 2);
  const snappedWaypoint = await waypointAtIndex(page, agentId, 1);
  expect(Number.isInteger(Number(snappedWaypoint.x))).toBe(true);
  expect(Number.isInteger(Number(snappedWaypoint.y))).toBe(true);

  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="thermoclineDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="thermocline"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.selectedDiveProfileId)).toBe('thermoclineDive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.selectedTargetDepthLayerId)).toBe('thermocline');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0)).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="water-column-volume-render-mode"][data-mode="smoothedSlices"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.volumeRenderMode)).toBe('smoothedSlices');
  await page.locator('#mission-console [data-action="water-column-volume-render-mode"][data-mode="volumetricCloud"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.volumeRenderMode)).toBe('volumetricCloud');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.volumeFallbackUsed === true)).toBe(true);
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="deep"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.activeDepthLayerId)).toBe('deep');

  const debug = await page.evaluate(() => ({
    continuous: window.ANCHOR_CONTINUOUS_MISSION_DEBUG,
    render: window.ANCHOR_MISSION_RENDER_DEBUG,
    waterColumn: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG
  }));
  expect(debug.continuous.overlayControlDispatchCount).toBeGreaterThan(0);
  expect(debug.continuous.duplicateOverlayControlDispatchCount).toBe(0);
  expect(debug.continuous).toMatchObject({ rendererOwnsPlanning: false, rendererOwnsSimulation: false, rendererOwnsScoring: false });
  expect(debug.render).toMatchObject({ ownsPlanning: false, ownsSimulationState: false, ownsScoring: false });
  expect(debug.waterColumn).toMatchObject({ ownsPlanning: false, ownsSimulation: false, ownsScoring: false });
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Continuous Mission Plan Executes Through Canonical 3D Dive', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await deployAllGlidersThroughVisibleControls(page);
  const agentId = await selectFirstAgentThroughVisibleControls(page);

  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="freePlacement"]').click();
  for (let index = 0; index < 2; index += 1) {
    const pair = await adjacentPlaceableWaypointPair(page, agentId);
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickBetweenThreeGridCells(page, pair.a, pair.b, index === 0 ? 0.34 : 0.46);
  }
  await expectWaypointCount(page, 2);
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="deepDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.predictedTrajectoryPointCount ?? 0)).toBeGreaterThan(0);

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);

  const beforeDive = await continuousDiveExecutionSnapshot(page);
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => continuousDiveExecutionSnapshot(page).then((snapshot) => snapshot.maxDepthMeters > beforeDive.maxDepthMeters && snapshot.maxAbsPitchRadians > 0 && snapshot.realizedTrajectoryPointCount > beforeDive.realizedTrajectoryPointCount), { timeout: 20000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  const afterDive = await continuousDiveExecutionSnapshot(page);
  expect(afterDive.firstStepCompleted).toBe(true);
  expect(afterDive.maxDepthMeters).toBeGreaterThan(beforeDive.maxDepthMeters);
  expect(afterDive.maxAbsPitchRadians).toBeGreaterThan(0);
  expect(afterDive.realizedTrajectoryPointCount).toBeGreaterThan(beforeDive.realizedTrajectoryPointCount);
  expect(afterDive.trackHasContinuousCoordinates).toBe(true);
  expect(afterDive.divePhases.length).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  const metadata = await page.evaluate(() => window.anchorGame.state.result?.continuousMission ?? window.anchorGame.state.result?.summary?.continuousMission ?? null);
  expect(metadata).toMatchObject({
    type: 'anchor.sim.continuous-mission-summary',
    coordinateProfileId: 'continuousGridV1',
    supportsFreePlacement: true,
    usesArbitraryXYZPlanning: false,
    syntheticTeachingModel: true,
    calibratedOceanForecast: false
  });
  expect(metadata.continuousWaypointCount).toBeGreaterThan(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Surface Waypoints Produce a Predicted Three-Dimensional Dive', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  const agentId = await selectedAgentId(page);
  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  for (const id of agentIds) {
    await selectAgentThroughVisibleControls(page, id);
    await deployAgentThroughVisibleThreeControls(page, id);
  }
  await selectAgentThroughVisibleControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="freePlacement"]').click();
  for (let index = 0; index < 2; index += 1) {
    const pair = await adjacentPlaceableWaypointPair(page, agentId);
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickBetweenThreeGridCells(page, pair.a, pair.b, index === 0 ? 0.34 : 0.58);
  }
  await expectWaypointCount(page, 2);

  await expect(page.locator('#mission-console')).toContainText('Segment Dive Plan');
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="thermoclineDive"]').click();
  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="thermocline"]').click();
  await page.locator('#mission-console [data-action="water-column-max-depth"][data-depth="80"]').click();
  await page.locator('#mission-console [data-action="water-column-cycle-count"][data-cycles="2"]').click();

  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentDiveProfileId), { timeout: 10000 }).toBe('thermoclineDive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDiveAvailable === true)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedLayerCrossingCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedSampleCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedBottomTurnCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.plannedDiveThreeObjectCount ?? 0)).toBeGreaterThan(0);
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const selectedSegmentId = window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentId;
    const segments = scene.missionRenderViewModel?.plannedDiveSegments ?? [];
    const segment = segments.find((candidate) => candidate.segmentId === selectedSegmentId) ?? segments.find((candidate) => candidate.diveProfileId === 'thermoclineDive') ?? segments[0];
    return {
      surfaceIntentAtSurface: segment?.surfaceIntentPath?.every((point) => Number(point.depthMeters ?? 0) === 0) === true,
      predictedDescends: segment?.predictedDivePath?.some((point) => Number(point.depthMeters ?? 0) > 0) === true,
      predictedSamplesAtDepth: segment?.predictedSamples?.every((sample) => Number(sample.depthMeters ?? 0) > 0 && sample.createsScoreEvent === false) === true,
      usesArbitraryXYZWaypoints: segment?.boundaryFlags?.usesArbitraryXYZWaypoints === true,
      rendererOwnsPrediction: segment?.boundaryFlags?.rendererOwnsPrediction === true
    };
  })).resolves.toEqual({
    surfaceIntentAtSurface: true,
    predictedDescends: true,
    predictedSamplesAtDepth: true,
    usesArbitraryXYZWaypoints: false,
    rendererOwnsPrediction: false
  });

  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('sideProfile');
  await page.locator('#mission-console [data-action="water-column-dive-profile"][data-profile="surfaceOnly"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentDiveProfileId), { timeout: 10000 }).toBe('surfaceOnly');
  await expect.poll(() => page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const selectedSegmentId = window.ANCHOR_DIVE_PLAN_DEBUG?.selectedSegmentId;
    const segments = scene.missionRenderViewModel?.plannedDiveSegments ?? [];
    const segment = segments.find((candidate) => candidate.segmentId === selectedSegmentId) ?? segments[0];
    return Math.max(0, ...(segment?.predictedDivePath ?? []).map((point) => Number(point.depthMeters ?? 0)));
  })).toBe(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Camera Reveals Full Water-Column Dive', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="water-column-focus-predicted-dive"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('selectedSegmentDive');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0)).toBeGreaterThan(0);
  const before = await page.evaluate(() => ({
    polar: Number(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraCurrentPolarRadians ?? window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarRadians ?? 0),
    min: Number(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraMinPolarRadians ?? 0),
    max: Number(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraMaxPolarRadians ?? 0),
    planDigest: JSON.stringify(window.anchorGame.state.plan)
  }));
  expect(before.min).toBeLessThanOrEqual(0.1);
  expect(before.max).toBeGreaterThanOrEqual(1.48);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('sideProfile');
  const point = await threeGridPoint(page, 4, 3);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x, point.y + 80, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate((startPolar) => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    return Math.abs(Number(debug.cameraCurrentPolarRadians ?? debug.cameraPolarRadians ?? 0) - startPolar) > 0.01 || Number(debug.cameraOrbitChangeCount ?? 0) > 0;
  }, before.polar)).toBe(true);
  await page.locator('#mission-console [data-action="water-column-vertical-exaggeration"][data-value="4"]').click();
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.setWaterColumnVerticalExaggeration?.(4));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui?.waterColumn?.verticalExaggeration)).toBe(4);
  await expect(page.evaluate((digest) => JSON.stringify(window.anchorGame.state.plan) === digest, before.planDigest)).resolves.toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Surface Waypoints and Sampling Targets Have Distinct Semantics', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const setup = await prepareThreeSamplingTargetDiveScenario(page, { attach: false, profile: 'thermoclineDive', layer: 'thermocline' });
  const state = await page.evaluate(({ agentId, targetId }) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === agentId);
    const target = window.anchorGame.state.plan.scienceTargets.find((candidate) => candidate.id === targetId);
    return {
      waypointCount: agentPlan?.waypoints?.length ?? 0,
      timelineWaypointCount: window.ANCHOR_MISSION_RENDER_DEBUG?.timelineWaypointCount ?? null,
      scienceTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
      targetExecutable: target?.executable,
      targetNavigationAuthority: target?.navigationAuthority,
      targetDepthLayerId: target?.depthLayerId,
      selectedEntityType: window.anchorGame.state.ui?.threeMissionInteraction?.selectedEntity?.objectType ?? null,
      selectedTargetId: window.anchorGame.state.ui?.selectedScienceTargetId ?? null
    };
  }, setup);
  expect(state.waypointCount).toBe(2);
  expect(state.timelineWaypointCount).toBe(2);
  expect(state.scienceTargetCount).toBeGreaterThanOrEqual(1);
  expect(state.targetExecutable).toBe(false);
  expect(state.targetNavigationAuthority).toBe(false);
  expect(state.targetDepthLayerId).toBe('thermocline');
  expect(state.selectedEntityType).toBe('samplingTarget');
  expect(state.selectedTargetId).toBe(setup.targetId);
  await expect(page.locator('#mission-console [data-science-targets-panel]')).toContainText('Science Targets');
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Sampling Target Drives Predicted Dive Without Becoming a Navigation Point', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const setup = await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="science-target-set-layer"]').click();
  await page.locator('#mission-console [data-action="science-target-copy-depth"]').click();
  await page.locator('#mission-console [data-action="science-target-recommend"]').click();
  const state = await page.evaluate(({ agentId, targetId }) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === agentId);
    const target = window.anchorGame.state.plan.scienceTargets.find((candidate) => candidate.id === targetId);
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const segments = scene.missionRenderViewModel?.plannedDiveSegments ?? [];
    const coverageSegment = segments.find((candidate) => (candidate.targetCoverage ?? []).some((coverage) => coverage.targetId === targetId)) ?? null;
    const diveSegment = segments.find((candidate) => (candidate.predictedDivePath ?? []).some((point) => Number(point.depthMeters ?? 0) > 0)) ?? coverageSegment ?? segments[0];
    return {
      waypointCount: agentPlan?.waypoints?.length ?? 0,
      targetAttached: (target?.attachedSegmentIds ?? []).length > 0,
      waypointTargetIds: (agentPlan?.waypoints ?? []).flatMap((waypoint) => waypoint.scienceTargetIds ?? []),
      coverageStatuses: coverageSegment?.targetCoverage?.map((coverage) => coverage.status) ?? diveSegment?.targetCoverage?.map((coverage) => coverage.status) ?? [],
      predictedSamplesScore: segments.some((candidate) => (candidate.predictedSamples ?? []).some((sample) => sample.createsScoreEvent === true)),
      surfaceIntentAtSurface: diveSegment?.surfaceIntentPath?.every((point) => Number(point.depthMeters ?? 0) === 0) === true,
      predictedDescends: (diveSegment?.predictedDivePath ?? []).some((point) => Number(point.depthMeters ?? 0) > 0),
      recommendation: window.anchorGame.state.ui?.scienceTargetProfileRecommendation?.recommendation ?? null
    };
  }, setup);
  expect(state.waypointCount).toBe(2);
  expect(state.targetAttached).toBe(true);
  expect(state.waypointTargetIds).toContain(setup.targetId);
  expect(state.coverageStatuses.length).toBeGreaterThan(0);
  expect(state.coverageStatuses.every((status) => ['COVERED', 'PARTIALLY_COVERED', 'CROSSED_WITHOUT_SAMPLE', 'UNREACHABLE', 'NOT_ATTACHED'].includes(status))).toBe(true);
  expect(state.predictedSamplesScore).toBe(false);
  expect(state.surfaceIntentAtSurface).toBe(true);
  expect(state.predictedDescends).toBe(true);
  expect(state.recommendation).toBeTruthy();
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Predicted Multi-Yo Profile Executes Through Canonical Simulation', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  const result = await page.evaluate(async () => {
    const { buildPlannedDiveSegmentViewModel } = await import('./src/core/rendering/PlannedDiveSegmentViewModel.js');
    const { advanceGliderDiveStateMachine } = await import('./src/core/sim/GliderDiveStateMachine.js');
    const waterColumnConfig = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], divediveProfileId: 'sawtoothProfile' };
    const segment = buildPlannedDiveSegmentViewModel({
      segmentId: 'e2e-multi-yo',
      startWaypoint: { x: 0, y: 2 },
      targetWaypoint: { x: 12, y: 2, divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' },
      waterColumnConfig,
      bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 14 }, () => 220)) },
      requestedMaximumDepthMeters: 110,
      cycleCount: 3,
      sampleCount: 100
    });
    const machine = advanceGliderDiveStateMachine({ position: { depthMeters: 0 }, divePhase: 'surface' }, { waterColumnConfig, targetDepthLayerId: 'deep', requestedMaximumDepthMeters: 110, achievableMaximumDepthMeters: segment.achievableMaximumDepthMeters, cycleCount: segment.requestedCycleCount, segmentProgress: 1, routeProgress: 1, diveProfileId: 'sawtoothProfile' });
    return {
      predictedCycles: segment.cycleCount,
      requestedCycles: segment.requestedCycleCount,
      actualCompletedCycles: machine.actualCompletedCycleCount,
      predictionExecutionMatch: machine.feasibleCycleCount === segment.cycleCount,
      predictedBottomTurns: segment.bottomTurns.length,
      predictionOwnsSimulation: segment.boundaryFlags?.ownsSimulation === true,
      predictionOwnsScoring: segment.boundaryFlags?.ownsScoring === true
    };
  });
  expect(result.predictedCycles).toBeGreaterThanOrEqual(2);
  expect(result.actualCompletedCycles).toBe(result.predictedCycles);
  expect(result.predictionExecutionMatch).toBe(true);
  expect(result.predictedBottomTurns).toBeGreaterThan(0);
  expect(result.predictionOwnsSimulation).toBe(false);
  expect(result.predictionOwnsScoring).toBe(false);
});

test('Three Camera Interaction Does Not Rebuild Mission Models', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline' });
  const before = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    scienceTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
    waypointCount: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    panelDispatchCount: window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayControlDispatchCount ?? 0
  }));
  const point = await threeGridPoint(page, 4, 3);
  for (let index = 0; index < 3; index += 1) {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(point.x + 40, point.y + 20, { steps: 4 });
    await page.mouse.up({ button: 'right' });
  }
  const after = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    scienceTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
    waypointCount: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    panelDispatchCount: window.ANCHOR_CONTINUOUS_UI_DEBUG?.overlayControlDispatchCount ?? 0,
    cameraOrbitChangeCount: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0
  }));
  expect(after.planDigest).toBe(before.planDigest);
  expect(after.scienceTargetCount).toBe(before.scienceTargetCount);
  expect(after.waypointCount).toBe(before.waypointCount);
  expect(after.slabTextureCount).toBe(before.slabTextureCount);
  expect(after.panelDispatchCount).toBe(before.panelDispatchCount);
  expect(after.cameraOrbitChangeCount).toBeGreaterThan(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Mission Renderer Resources Remain Stable', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'deepDive', layer: 'deep' });
  const snapshot = () => page.evaluate(async () => {
    const { threeMissionWorldRendererSummary } = await import('./src/game/three/ThreeMissionWorldRenderer.js');
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const summary = threeMissionWorldRendererSummary(scene.threeMissionRenderer);
    return {
      waypointObjectCount: summary.waypointObjectCount,
      samplingTargetObjectCount: summary.samplingTargetObjectCount,
      plannedDiveObjectCount: summary.plannedDiveTrajectorySummary?.objectCount ?? 0,
      slabTextureCount: summary.slabTextureCount,
      disposed: summary.disposed,
      ownsPlanning: summary.ownsPlanning,
      ownsScoring: summary.ownsScoring,
      ownsSimulationState: summary.ownsSimulationState
    };
  });
  const before = await snapshot();
  for (const preset of ['divePlanningView', 'sideProfile', 'obliqueDive', 'tacticalTopDown']) {
    await page.locator(`#mission-console [data-action="three-camera"][data-preset="${preset}"]`).click();
  }
  await page.locator('#mission-console [data-action="water-column-display-mode"][data-mode="explodedLayers"]').click();
  await page.locator('#mission-console [data-action="water-column-display-mode"][data-mode="physicalDepth"]').click();
  await page.locator('#mission-console [data-action="water-column-layer-visibility"][data-mode="isolateActive"]').click();
  await page.locator('#mission-console [data-action="water-column-layer-visibility"][data-mode="showAll"]').click();
  const after = await snapshot();
  expect(after.disposed).toBe(false);
  expect(after.ownsPlanning).toBe(false);
  expect(after.ownsScoring).toBe(false);
  expect(after.ownsSimulationState).toBe(false);
  expect(after.waypointObjectCount).toBe(before.waypointObjectCount);
  expect(after.samplingTargetObjectCount).toBe(before.samplingTargetObjectCount);
  expect(after.plannedDiveObjectCount).toBeGreaterThan(0);
  expect(after.slabTextureCount).toBeLessThanOrEqual(before.slabTextureCount + 8);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Mission Interaction Performance Invariants', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 3 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  const before = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      cameraPosition: scene.threeMissionRenderer?.camera?.position?.toArray?.() ?? [],
      resourceDebug: window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.()
    };
  });

  const point = await threeGridPoint(page, 4, 3);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  for (let index = 0; index < 20; index += 1) await page.mouse.move(point.x + 6 * index, point.y + 2 * index, { steps: 1 });
  await page.mouse.up({ button: 'right' });

  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'left' });
  for (let index = 0; index < 20; index += 1) await page.mouse.move(point.x - 4 * index, point.y + 3 * index, { steps: 1 });
  await page.mouse.up({ button: 'left' });

  for (let index = 0; index < 20; index += 1) await page.mouse.wheel(0, index % 2 === 0 ? -80 : 100);
  await page.waitForTimeout(1000);

  const afterCamera = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const debug = window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.();
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      cameraPosition: scene.threeMissionRenderer?.camera?.position?.toArray?.() ?? [],
      debug
    };
  });
  expect(afterCamera.planDigest).toBe(before.planDigest);
  expect(afterCamera.cameraPosition.join(',')).not.toBe(before.cameraPosition.join(','));
  expect(afterCamera.debug.activeRendererCount).toBe(1);
  expect(afterCamera.debug.activeRafCount).toBe(1);
  expect(afterCamera.debug.sampleCount).toBeGreaterThan(10);
  expect(afterCamera.debug.cameraGestureCount).toBeGreaterThanOrEqual(20);
  expect(afterCamera.debug.modelBuildCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.predictionBuildCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.textureUpdateCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.panelRenderCountDuringCameraGesture).toBe(0);
  expect(afterCamera.debug.timelineRenderCountDuringCameraGesture).toBe(0);

  await page.locator('#mission-console [data-action="science-target-detach"]').click();
  await page.locator('#mission-console [data-action="science-target-attach"]').click();
  for (const mode of ['explodedLayers', 'physicalDepth']) await page.locator(`#mission-console [data-action="water-column-display-mode"][data-mode="${mode}"]`).click();
  for (const preset of ['divePlanningView', 'sideProfile', 'obliqueDive', 'tacticalTopDown']) await page.locator(`#mission-console [data-action="three-camera"][data-preset="${preset}"]`).click();
  await page.waitForTimeout(500);
  const afterEdits = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.());
  expect(afterEdits.activeRendererCount).toBe(1);
  expect(afterEdits.activeRafCount).toBe(1);
  expect(afterEdits.duplicateRendererWarningCount).toBe(0);
  expect(afterEdits.duplicateRafWarningCount).toBe(0);
  expect(afterEdits.sceneObjectCount).toBeGreaterThan(0);
  expect(afterEdits.sceneObjectCount).toBeLessThanOrEqual(Math.max(250, Number(afterCamera.debug.sceneObjectCount ?? 0) + 140));

  console.log('THREE_PERF_MEASUREMENT ' + JSON.stringify({
    scenario: 'planning-camera-interaction',
    averageFrameMilliseconds: afterCamera.debug.averageFrameMilliseconds,
    medianFrameMilliseconds: afterCamera.debug.medianFrameMilliseconds,
    p95FrameMilliseconds: afterCamera.debug.p95FrameMilliseconds,
    p99FrameMilliseconds: afterCamera.debug.p99FrameMilliseconds,
    maximumFrameMilliseconds: afterCamera.debug.maximumFrameMilliseconds,
    framesOver33Milliseconds: afterCamera.debug.framesOver33Milliseconds,
    framesOver50Milliseconds: afterCamera.debug.framesOver50Milliseconds,
    framesOver100Milliseconds: afterCamera.debug.framesOver100Milliseconds,
    rendererCalls: afterCamera.debug.rendererCalls,
    rendererTriangles: afterCamera.debug.rendererTriangles,
    rendererLines: afterCamera.debug.rendererLines,
    rendererPoints: afterCamera.debug.rendererPoints,
    sceneObjectCount: afterEdits.sceneObjectCount,
    geometryCount: afterEdits.geometryCount,
    materialCount: afterEdits.materialCount,
    textureCount: afterEdits.textureCount
  }));

  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectMainMenuSceneIsolation(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? -1)).toBe(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Sampling Target and Dive Planning Headed Workflow', async ({ page }, testInfo) => {
  const browserErrors = attachBrowserErrorCollector(page);
  const setup = await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'thermocline', cycles: 3 });
  await page.screenshot({ path: testInfo.outputPath('three-tactical-planning.png'), fullPage: true });

  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.performanceDebug?.()?.activeRendererCount)).toBe(1);
  await page.screenshot({ path: testInfo.outputPath('three-side-profile.png'), fullPage: true });
  await page.locator('#mission-console [data-action="water-column-vertical-exaggeration"][data-value="4"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui?.waterColumn?.verticalExaggeration)).toBe(4);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0)).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="water-column-target-layer"][data-layer="deep"]').click();
  await page.locator('#mission-console [data-action="water-column-active-layer"][data-layer="deep"]').click();
  const deepCell = await findSamplingTargetPlacementCell(page, 'deep') ?? { x: setup.targetCell.x + 1, y: setup.targetCell.y };
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeSamplingTarget"]').click();
  const deepPoint = await page.evaluate(({ layerId, cell }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(layerId, cell.x, cell.y) ?? null, { layerId: 'deep', cell: deepCell });
  expect(deepPoint).toBeTruthy();
  await page.mouse.click(deepPoint.x, deepPoint.y);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.plan?.scienceTargets?.length ?? 0)).toBeGreaterThanOrEqual(2);
  await page.locator('#mission-console [data-action="science-target-attach"]').click();
  await page.locator('#mission-console [data-action="science-target-copy-depth"]').click();
  await page.locator('#mission-console [data-action="science-target-recommend"]').click();
  await page.screenshot({ path: testInfo.outputPath('three-sampling-target-attached.png'), fullPage: true });

  await page.locator('#mission-console [data-action="water-column-focus-predicted-dive"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('selectedSegmentDive');
  await page.screenshot({ path: testInfo.outputPath('three-multi-yo-prediction.png'), fullPage: true });

  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeVisible();
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  const beforeDive = await continuousDiveExecutionSnapshot(page);
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => continuousDiveExecutionSnapshot(page).then((snapshot) => snapshot.maxDepthMeters > beforeDive.maxDepthMeters && snapshot.realizedTrajectoryPointCount > beforeDive.realizedTrajectoryPointCount), { timeout: 25000 }).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('three-multi-yo-simulation.png'), fullPage: true });
  await page.locator('#mission-console [data-action="pause"]').click();
  const simulationPerf = await page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? null);
  console.log('THREE_PERF_MEASUREMENT ' + JSON.stringify({ scenario: 'simulation-multi-yo', performance: simulationPerf }));
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  const resultSummary = await page.evaluate(() => ({
    observationCount: window.anchorGame.state.result?.summary?.observationCount ?? window.anchorGame.state.result?.events?.filter?.((event) => ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type))?.length ?? 0,
    events: window.anchorGame.state.result?.events?.length ?? 0
  }));
  expect(resultSummary.observationCount + resultSummary.events).toBeGreaterThan(0);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('DebriefScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Debrief Console');
  await page.screenshot({ path: testInfo.outputPath('three-debrief.png'), fullPage: true });
  await page.locator('#mission-console [data-action="menu"]').click();
  await expectMainMenuSceneIsolation(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? -1)).toBe(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});
