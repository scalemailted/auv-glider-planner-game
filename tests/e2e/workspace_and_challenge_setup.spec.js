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

test('Three Mission Workspace Stabilization', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.levelId)).toBe('tutorial_01_first_deployment');
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererRuntimeErrorCount ?? -1)).toBe(0);
  await expect.poll(() => page.evaluate(() => Boolean(document.querySelector('.three-mission-world-canvas')))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.dropZoneCount ?? 0)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.dropZoneObjectCount ?? 0)).toBeGreaterThan(0);
  expect(browserErrors.unexpected()).toEqual([]);

  const deploymentCells = await page.evaluate(() => {
    const zone = window.anchorGame.state.level?.zones?.find((candidate) => candidate.type === 'deployment');
    return zone?.cells?.map((cell) => ({ x: cell.x, y: cell.y })) ?? [];
  });
  expect(deploymentCells.length).toBeGreaterThan(0);
  const initialCell = deploymentCells[0];
  const distinctTargetAvailable = deploymentCells.some((cell) => cell.x !== initialCell.x || cell.y !== initialCell.y);
  const targetCell = deploymentCells.find((cell) => cell.x !== initialCell.x || cell.y !== initialCell.y) ?? initialCell;
  let point;
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await clickCell(page, initialCell.x, initialCell.y);
  await expect.poll(() => page.evaluate(() => {
    const start = window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  })).toEqual(initialCell);

  const beforeWaypointCount = await totalWaypointCount(page);
  await expect(page.locator('#waypoint-timeline [data-change-start]').first()).toBeVisible();
  await page.locator('#waypoint-timeline [data-change-start]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.deploymentSelectionActive === true)).toBe(true);
  point = await cellCenter(page, targetCell.x, targetCell.y);
  await page.mouse.click(point.x, point.y);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastIntentStatus)).toBe(distinctTargetAvailable ? 'accepted' : 'noChange');
  await expect.poll(() => page.evaluate(() => {
    const start = window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  })).toEqual(targetCell);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedStartCell)).resolves.toMatchObject(targetCell);
  await expect(totalWaypointCount(page)).resolves.toBe(beforeWaypointCount);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerCellDelta)).resolves.toEqual({ dx: 0, dy: 0 });

  const hoverCell = deploymentCells.find((cell) => cell.x !== targetCell.x || cell.y !== targetCell.y) ?? targetCell;
  point = await cellCenter(page, hoverCell.x, hoverCell.y);
  await page.mouse.move(point.x, point.y);

  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.actualGridCell)).resolves.toEqual(hoverCell);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(250);
  point = await cellCenter(page, hoverCell.x, hoverCell.y);
  await page.mouse.move(point.x, point.y);

  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.actualGridCell)).resolves.toEqual(hoverCell);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API.setCameraPresetForTest('tacticalTopDown'));
  point = await cellCenter(page, hoverCell.x, hoverCell.y);
  await page.mouse.move(point.x, point.y);

  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerOwner)).resolves.toBe('three');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.phaserWorldInputEnabled)).resolves.toBe(false);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.duplicatePointerDispatchCount)).resolves.toBe(0);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Mission renderer preserves live Mission Planning state', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await startPlanningFromBriefing(page);
  await expect(page.locator('#mission-console')).toContainText('Mission World');
  await expect(page.locator('#mission-console')).toContainText('Three.js is the production mission environment.');
  await expect(page.locator('#mission-console')).toContainText('portable JavaScript core owns planning validity, simulation, scoring, and visibility permissions.');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');

  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart({ x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample' });
    scene.setPlanningTime(6);
    scene.addWaypointForSelected({ x: 5, y: 3, action: 'sample' });
    scene.addMarkerForSelected({ x: 4, y: 4 });
  });
  await expect(page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart)).resolves.toEqual({ x: 1, y: 1 });
  await expectWaypointCount(page, 2);
  await expect(page.evaluate(() => {
    const marker = window.anchorGame.state.plan.planningMarkers?.at(-1);
    return marker ? { x: marker.x, y: marker.y } : null;
  })).resolves.toEqual({ x: 4, y: 4 });
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    state.level.layers ??= {};
    state.level.layers.priorityTargets = [{
      id: 'e2e-public-gold-star',
      label: 'E2E Public Gold Star',
      value: 150,
      radius: 0.75,
      frames: [{ t: 0, x: 4, y: 4, active: true }, { t: 12, x: 4, y: 4, active: true }, { t: 18, active: false }]
    }];
    state.ui ??= {};
    state.ui.showPriorityStars = true;
    window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setPlanningTime(6);
  });
  const beforeSwitch = await page.evaluate(() => ({
    waypointCount: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markerCount: window.anchorGame.state.plan.planningMarkers?.length ?? 0,
    selectedStart: window.anchorGame.state.mission.agents[0].deployment?.selectedStart,
    planningTime: window.anchorGame.state.planningTime,
    mode: window.anchorGame.state.mode
  }));
  expect(beforeSwitch).toMatchObject({ waypointCount: 2, markerCount: 1, selectedStart: { x: 1, y: 1 }, planningTime: 6, mode: 'planning' });

  await expect(page.locator('.three-mission-world-host')).toBeVisible();
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCount)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.planningMarkerCount)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.priorityTargetCount)).toBe(1);
  const threeDebug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(threeDebug).toMatchObject({
    activeBackend: 'threeMission3d',
    threeMounted: true,
    ownsSimulationState: false,
    ownsPlanning: false,
    ownsScoring: false,
    ownsReplaySemantics: false,
    changesMissionState: false,
    changesOfficialBrowserScoring: false,
    exposesHiddenTruth: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  });
  expect(threeDebug.artifactCountMismatches).toEqual([]);
  expect(threeDebug.threeArtifactCounts.waypointCount).toBe(2);
  expect(threeDebug.threeArtifactCounts.planningMarkerCount).toBe(1);
  expect(threeDebug.threeArtifactCounts.priorityTargetCount).toBe(1);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.ui.threeMissionCameraPreset)).resolves.toBe('tacticalTopDown');
  await page.locator('#mission-console [data-action="three-layer"][data-layer="currentVectors"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.ui.threeMissionLayers.currentVectors)).resolves.toBe(false);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setPlanningTime(12));
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeTimeSeconds)).toBe(12);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.renderedCurrentTimeSeconds)).toBe(12);

  await expect(page.locator('#mission-console [data-action="renderer-legacy"]')).toHaveCount(0);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').setRendererBackend('legacyPhaser2d'));
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expect(page.locator('.three-mission-world-host')).toBeVisible();
  await expect(page.evaluate(() => ({
    waypointCount: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markerCount: window.anchorGame.state.plan.planningMarkers?.length ?? 0,
    selectedStart: window.anchorGame.state.mission.agents[0].deployment?.selectedStart,
    mode: window.anchorGame.state.mode
  }))).resolves.toEqual({ waypointCount: 2, markerCount: 1, selectedStart: { x: 1, y: 1 }, mode: 'planning' });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointCount)).toBe(2);
});

test('Three Planning Pointer Interaction dispatches canonical workspace commands', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await startPlanningFromBriefing(page);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').trySelectDeploymentStart({ x: 1, y: 1 }));

  await page.evaluate(() => {
    const state = window.anchorGame.state;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const width = state.level.world.grid.width;
    const height = state.level.world.grid.height;
    state.level.layers ??= {};
    state.level.layers.terrain = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => Number(state.level.layers.terrain?.[y]?.[x] ?? 0)));
    state.level.layers.terrain[2][2] = 1;
    for (const [x, y] of [[5, 2], [5, 3], [6, 3], [4, 4], [1, 2]]) state.level.layers.terrain[y][x] = 0;
    state.level.layers.hazards = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => Number(state.level.layers.hazards?.[y]?.[x] ?? 0)));
    state.level.layers.hazards[3][6] = 1;
    state.level.layers.priorityTargets = [{
      id: 'e2e-three-gold-star',
      label: 'E2E Three Gold Star',
      value: 150,
      radius: 0.75,
      frames: [{ t: 0, x: 4, y: 4, active: true }, { t: 6, x: 4, y: 4, active: true }, { t: 12, x: 4, y: 4, active: true }]
    }];
    const bravoStart = { x: Math.min(Math.max(0, width - 2), 5), y: Math.min(Math.max(0, height - 2), 3) };
    state.level.layers.terrain[bravoStart.y][bravoStart.x] = 0;
    if (!state.mission.agents.some((agent) => agent.id === 'glider-bravo')) {
      state.mission.agents.push({
        id: 'glider-bravo',
        label: 'Bravo',
        battery: 100,
        deployment: { mode: 'fixedStart', selectedStart: { ...bravoStart } },
        start: { ...bravoStart }
      });
    } else {
      const bravo = state.mission.agents.find((agent) => agent.id === 'glider-bravo');
      bravo.deployment = { ...(bravo.deployment ?? {}), mode: 'fixedStart', selectedStart: { ...bravoStart } };
      bravo.start = { ...bravoStart };
    }
    state.plan.agentPlans ??= [];
    for (const agentPlan of state.plan.agentPlans) agentPlan.waypoints = [];
    if (!state.plan.agentPlans.some((plan) => plan.agentId === 'glider-bravo')) state.plan.agentPlans.push({ agentId: 'glider-bravo', selectedStart: { ...bravoStart }, waypoints: [] });
    state.plan.planningMarkers = [];
    const primaryAgentId = state.mission.agents[0].id;
    state.selectedAgentId = primaryAgentId;
    state.ui.selectedWaypoint = null;
    state.ui.selectedMarker = null;
    state.ui.selectedPriorityTargetId = null;
    state.ui.showPriorityStars = true;
    scene.trySelectDeploymentStart({ x: 1, y: 1 });
    scene.setPlanningTime(6);
    scene.refreshPanels();
    scene.refreshMap();
  });

  await expectWaypointCount(page, 0);
  await expect(page.locator('.three-mission-world-host')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect(page.locator('#mission-console')).toContainText('Planning Tools');
  await expect.poll(() => page.evaluate(() => Boolean(window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell))).toBe(true);

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickThreeGridCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  const waypointId = await page.evaluate(() => {
    const primaryAgentId = window.anchorGame.state.mission.agents[0].id;
    return window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === primaryAgentId).waypoints[0].id;
  });
  await clickThreeGridCell(page, 2, 2);
  await expectWaypointCount(page, 1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastInteractionResult?.status)).toBe('rejected');

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
  await clickThreeObject(page, 'screenPointForWaypoint', waypointId);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui.selectedWaypoint?.index)).toBe(0);
  await dragThreeObjectToGridCell(page, 'screenPointForWaypoint', waypointId, 5, 3);
  await expect.poll(() => page.evaluate((id) => {
    const waypoint = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.mission.agents[0].id).waypoints.find((candidate) => candidate.id === id);
    return waypoint ? { id: waypoint.id, x: Math.round(Number(waypoint.x)), y: Math.round(Number(waypoint.y)) } : null;
  }, waypointId)).toEqual({ id: waypointId, x: 5, y: 3 });

  const beforeCancel = await page.evaluate((id) => {
    const waypoint = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.mission.agents[0].id).waypoints.find((candidate) => candidate.id === id);
    return { x: waypoint.x, y: waypoint.y };
  }, waypointId);
  await dragThreeObjectToGridCell(page, 'screenPointForWaypoint', waypointId, 6, 3, { cancelWithEscape: true });
  await expect(page.evaluate((id) => {
    const waypoint = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.mission.agents[0].id).waypoints.find((candidate) => candidate.id === id);
    return { x: waypoint.x, y: waypoint.y };
  }, waypointId)).resolves.toEqual(beforeCancel);

  await page.keyboard.press('Delete');
  await expectWaypointCount(page, 0);

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placePlanningMarker"]').click();
  await clickThreeGridCell(page, 4, 4);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.plan.planningMarkers?.length ?? 0)).toBe(1);
  const markerId = await page.evaluate(() => window.anchorGame.state.plan.planningMarkers[0].id);
  await expect(page.evaluate(() => window.anchorGame.state.plan.planningMarkers[0].executable === true)).resolves.toBe(false);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
  await clickThreeObject(page, 'screenPointForMarker', markerId);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui.selectedMarker?.index)).toBe(0);
  await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.plan.planningMarkers?.length ?? 0)).toBe(0);

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectInspect');
  await clickThreeObject(page, 'screenPointForAgent', 'glider-bravo');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.selectedAgentId)).toBe('glider-bravo');
  await clickThreeObject(page, 'screenPointForPriorityTarget', 'e2e-three-gold-star');
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.ui.selectedPriorityTargetId)).toBe('e2e-three-gold-star');

  const countsBeforeNavigate = await page.evaluate(() => ({
    waypoints: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markers: window.anchorGame.state.plan.planningMarkers?.length ?? 0
  }));
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="navigate"]').click();
  await dragThreeGridCell(page, 3, 3, 6, 4);
  await expect(page.evaluate(() => ({
    waypoints: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markers: window.anchorGame.state.plan.planningMarkers?.length ?? 0
  }))).resolves.toEqual(countsBeforeNavigate);

  const debug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(debug).toMatchObject({
    activeBackend: 'threeMission3d',
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false
  });
  expect(debug.interactionControllerSummary.enabled).toBe(true);
  expect(debug.interactionBridgeSummary.handledCount).toBeGreaterThan(0);

  await expect(page.evaluate(() => ({
    waypoints: window.anchorGame.state.plan.agentPlans.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    markers: window.anchorGame.state.plan.planningMarkers?.length ?? 0,
    selectedAgentId: window.anchorGame.state.selectedAgentId,
    backend: window.anchorGame.state.ui.rendererBackend
  }))).resolves.toEqual({ waypoints: 0, markers: 0, selectedAgentId: 'glider-bravo', backend: 'threeMission3d' });
  expect(pageErrors).toEqual([]);
});

test('Three Waypoint Pipeline and Standard Camera Gestures', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await expect(page.locator('.three-mission-world-canvas')).toBeVisible();

  const agentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id);
  await clickThreeObject(page, 'screenPointForAgent', agentId);
  await expect.poll(() => page.evaluate((id) => window.anchorGame.state.selectedAgentId === id, agentId)).toBe(true);

  const deploymentCells = await page.evaluate(() => {
    const zone = window.anchorGame.state.level?.zones?.find((candidate) => candidate.type === 'deployment');
    return zone?.cells?.map((cell) => ({ x: cell.x, y: cell.y })) ?? [];
  });
  expect(deploymentCells.length).toBeGreaterThan(0);
  const deployCell = deploymentCells[0];
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await clickThreeGridCell(page, deployCell.x, deployCell.y);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedAgentDeployed)).toBe(true);
  await expect.poll(() => page.evaluate(() => { const cell = window.ANCHOR_MISSION_RENDER_DEBUG?.selectedStartCell; return cell ? { x: cell.x, y: cell.y } : null; })).toEqual(deployCell);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.waypointToolEnabled)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.autoArmedWaypointAfterDeployment)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');

  const beforeToolDispatch = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.planningToolControlDispatchCount ?? 0);
  await expect(page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]')).toBeEnabled();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.planningToolControlDispatchCount ?? 0) === before + 1, beforeToolDispatch)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.duplicateToolControlDispatchCount ?? 0)).toBe(0);
  await expect.poll(() => page.evaluate(() => ({
    activePlanningToolId: window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId,
    scenePlanningToolId: window.ANCHOR_MISSION_RENDER_DEBUG?.scenePlanningToolId,
    controllerInteractionMode: window.ANCHOR_MISSION_RENDER_DEBUG?.controllerInteractionMode,
    visibleToolButtonId: window.ANCHOR_MISSION_RENDER_DEBUG?.visibleToolButtonId,
    mismatches: window.ANCHOR_MISSION_RENDER_DEBUG?.planningToolStateMismatches
  }))).toEqual({
    activePlanningToolId: 'placeWaypoint',
    scenePlanningToolId: 'placeWaypoint',
    controllerInteractionMode: 'placeWaypoint',
    visibleToolButtonId: 'placeWaypoint',
    mismatches: []
  });

  await clickThreeGridCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  await expectDebugWaypointSynchronization(page, 1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastWaypointPipelineStatus)).toBe('accepted');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.lastWaypointCommandResult?.ok)).toBe(true);

  await clickThreeGridCell(page, 5, 3);
  await expectWaypointCount(page, 2);
  await expectDebugWaypointSynchronization(page, 2);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.routeCount > 0)).toBe(true);

  const beforePan = await page.evaluate(() => ({
    count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount,
    target: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraTarget,
    pan: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0
  }));
  const panStart = await threeGridPoint(page, 4, 3);
  await page.mouse.move(panStart.x, panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x + 82, panStart.y + 26, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0) > before.pan, beforePan)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerGestureClassification)).toBe('pan');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.missionClickSuppressedReason)).toBe('panGesture');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforePan.count);
  await expect(page.evaluate((before) => JSON.stringify(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraTarget) !== JSON.stringify(before.target), beforePan)).resolves.toBe(true);

  const beforeHorizontalOrbit = await page.evaluate(() => ({ azimuth: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraAzimuthRadians, count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount }));
  const orbitPoint = await threeGridPoint(page, 4, 3);
  await page.mouse.move(orbitPoint.x, orbitPoint.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(orbitPoint.x + 86, orbitPoint.y, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate((before) => Math.abs((window.ANCHOR_MISSION_RENDER_DEBUG?.cameraAzimuthRadians ?? before.azimuth) - before.azimuth) > 0.01, beforeHorizontalOrbit)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerGestureClassification)).toBe('orbit');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforeHorizontalOrbit.count);

  const beforeVerticalOrbit = await page.evaluate(() => ({ polar: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarRadians, count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount }));
  const verticalPoint = await threeGridPoint(page, 4, 3);
  await page.mouse.move(verticalPoint.x, verticalPoint.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(verticalPoint.x, verticalPoint.y + 72, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate((before) => Math.abs((window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarRadians ?? before.polar) - before.polar) > 0.01, beforeVerticalOrbit)).toBe(true);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforeVerticalOrbit.count);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="obliqueMission"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueMission');
  const diagonalPoint = await threeGridPoint(page, 4, 3);
  await page.mouse.move(diagonalPoint.x, diagonalPoint.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(diagonalPoint.x + 78, diagonalPoint.y + 58, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => page.evaluate(() => Math.abs(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraAzimuthDelta ?? 0) > 0.01)).toBe(true);
  await expect.poll(() => page.evaluate(() => Math.abs(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPolarDelta ?? 0) > 0.01)).toBe(true);
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.interactionControllerSummary?.contextMenuScopedToCanvas)).resolves.toBe(true);

  const beforeWheel = await page.evaluate(() => ({ distance: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraDistance, count: window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount }));
  await page.locator('.three-mission-world-canvas').hover();
  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate((before) => Math.abs((window.ANCHOR_MISSION_RENDER_DEBUG?.cameraDistance ?? before.distance) - before.distance) > 0.01, beforeWheel)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.pointerGestureClassification)).toBe('wheelZoom');
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).resolves.toBe(beforeWheel.count);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="resetCamera"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueMission');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  await clickThreeGridCell(page, 6, 2);
  await expectWaypointCount(page, 3);
  await expectDebugWaypointSynchronization(page, 3);

  await expect.poll(() => page.evaluate(() => {
    const agentId = window.anchorGame.state.selectedAgentId;
    const waypoints = window.anchorGame.state.plan?.agentPlans?.find((plan) => plan.agentId === agentId)?.waypoints ?? [];
    const waypoint = waypoints.at(-1);
    return waypoint ? { x: Math.round(Number(waypoint.x)), y: Math.round(Number(waypoint.y)) } : null;
  })).toEqual({ x: 6, y: 2 });


  await clickThreeGridCell(page, 0, 0);
  await expectWaypointCount(page, 3);

  const finalDebug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(finalDebug).toMatchObject({
    pointerOwner: 'three',
    phaserWorldInputEnabled: false,
    duplicatePointerDispatchCount: 0,
    waypointCountMismatch: false,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    exposesHiddenTruth: false
  });

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Mission Planning Tools and Camera Controls', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Planning Tools');
  await expect(page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="three-camera"][data-preset="fleetOverview"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-action="three-camera"][data-preset="focusSelectedGlider"]')).toBeVisible();
  await expect(page.locator('.three-mission-tool-overlay')).toBeVisible();

  const deploymentCells = await page.evaluate(() => {
    const zone = window.anchorGame.state.level?.zones?.find((candidate) => candidate.type === 'deployment');
    return zone?.cells?.map((cell) => ({ x: cell.x, y: cell.y })) ?? [];
  });
  expect(deploymentCells.length).toBeGreaterThan(0);
  const deployCell = deploymentCells[0];
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.deploymentSelectionActive)).toBe(true);
  await clickThreeGridCell(page, deployCell.x, deployCell.y);
  await expect.poll(() => page.evaluate(() => {
    const start = window.anchorGame.state.mission?.agents?.[0]?.deployment?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  })).toEqual(deployCell);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');

  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  await clickThreeGridCell(page, 5, 2);
  await expectWaypointCount(page, 1);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.canonicalWaypointCount)).toBe(1);

  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="focusSelectedGlider"]').click();
  await expect.poll(() => page.evaluate(() => Number.isFinite(window.ANCHOR_MISSION_RENDER_DEBUG?.cameraDistance))).toBe(true);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="navigate"]').click();
  const beforeCamera = await page.evaluate(() => ({
    orbit: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0,
    pan: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0,
    zoom: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraZoomChangeCount ?? 0
  }));
  const center = await cellCenter(page, 4, 3);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 70, center.y + 35, { steps: 4 });
  await page.mouse.up();
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(center.x + 35, center.y + 70, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  await page.locator('.three-mission-world-canvas').hover();
  await page.mouse.wheel(0, -160);
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0) > before.orbit, beforeCamera)).toBe(true);
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPanChangeCount ?? 0) > before.pan, beforeCamera)).toBe(true);
  await expect.poll(() => page.evaluate((before) => (window.ANCHOR_MISSION_RENDER_DEBUG?.cameraZoomChangeCount ?? 0) > before.zoom, beforeCamera)).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="resetCamera"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('obliqueMission');

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  expect(browserErrors.unexpected()).toEqual([]);
});

test('Three Simulation Selection inspects canonical public simulation objects', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await startPlanningFromBriefing(page);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart({ x: 1, y: 1 });
    scene.addWaypointForSelected({ x: 6, y: 2, action: 'sample' });
    scene.executePlan();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys?.isActive?.() === true), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.hasThreeRenderer === true)).toBe(true);

  const ids = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    scene.engine.pause();
    const agent = scene.engine.agents[0];
    const agentId = agent.id;
    agent.x = 1;
    agent.y = 2;
    agent.depthMeters = 0;
    agent.history = [
      { x: 1, y: 2, t: 0, timeSeconds: 0, depthMeters: 0 },
      { x: 2, y: 2, t: 1, timeSeconds: 1, depthMeters: 0 },
      { x: 3, y: 2, t: 2, timeSeconds: 2, depthMeters: 0 }
    ];
    scene.engine.events = [
      ...(scene.engine.events ?? []),
      { id: 'e2e-observation-1', type: 'sample', agentId, x: 3, y: 3, t: scene.engine.t ?? 0, timeSeconds: scene.engine.t ?? 0, value: 7, status: 'transmitted', depthMeters: 0 },
      { id: 'e2e-surface-1', type: 'surfaced', agentId, x: 4, y: 3, t: scene.engine.t ?? 0, timeSeconds: scene.engine.t ?? 0, status: 'surfaced', gpsFix: true, transmittedObservationCount: 1 },
      { id: 'e2e-route-failure-1', type: 'blocked', agentId, x: 5, y: 3, t: scene.engine.t ?? 0, timeSeconds: scene.engine.t ?? 0, status: 'blocked', reason: 'blockedTerrain' }
    ];
    scene.refresh();
    window.ANCHOR_MISSION_RENDER_TEST_API?.setCameraPresetForTest?.('tacticalTopDown');
    scene.refresh();
    return {
      agentId,
      observationId: 'e2e-observation-1',
      surfacingEventId: 'e2e-surface-1',
      routeFailureId: 'e2e-route-failure-1',
      routeSegmentId: `${agentId}-sampled-trajectory`
    };
  });

  await expect.poll(() => page.evaluate((observationId) => Boolean(window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForObservation?.(observationId)), ids.observationId)).toBe(true);
  await clickThreeObject(page, 'screenPointForAgent', ids.agentId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedAgentId)).toBe(ids.agentId);
  await clickThreeObject(page, 'screenPointForObservation', ids.observationId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedObservationId)).toBe(ids.observationId);
  await clickThreeObject(page, 'screenPointForSurfacingEvent', ids.surfacingEventId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedSurfacingEventId)).toBe(ids.surfacingEventId);
  await clickThreeObject(page, 'screenPointForRouteSegment', ids.routeSegmentId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedRouteSegmentId)).toBe(ids.routeSegmentId);
  await clickThreeObject(page, 'screenPointForRouteFailure', ids.routeFailureId);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.selectedRouteFailureId)).toBe(ids.routeFailureId);

  const timeBefore = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.simulationTimeSeconds);
  const from = await threeGridPoint(page, 3, 5);
  const to = await threeGridPoint(page, 6, 5);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await expect(page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.simulationTimeSeconds)).resolves.toBe(timeBefore);

  const debug = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG);
  expect(debug).toMatchObject({
    activeBackend: 'threeMission3d',
    pointerOwner: 'three',
    phaserWorldInputEnabled: false,
    duplicatePointerDispatchCount: 0,
    ownsPlanning: false,
    ownsSimulationState: false,
    ownsScoring: false,
    changesOfficialBrowserScoring: false,
    exposesHiddenTruth: false,
    advancesSimulationClock: false
  });
  expect(debug.interactionControllerSummary.enabled).toBe(true);
  expect(debug.interactionControllerSummary.allowEditing).toBe(false);
  expect(pageErrors).toEqual([]);
});

test('scenario setup stays inside the center viewport', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').openChallengeSetup('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Scenario Setup');
  await expect(page.locator('#mission-console')).toContainText('Current / Flow Field');
  await expect(page.locator('#mission-console')).toContainText('Additive Flow Layers');
  await expect(page.locator('#mission-console [data-flow-field="fieldMode"]')).toBeVisible();
  await expect(page.locator('#mission-console [data-flow-field="basePreset"]')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Waypoints');
  await expectCenterShellContained(page);
  await expectCenterPanelUsesAvailableSpace(page);
});

test('challenge setup uses left navigator and selected briefing', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').openChallengeSetup('perfectKnowledge', 'challenge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.locator('.mission-mode-detail-view')).toBeVisible();
  await expect(page.locator('.mission-mode-gallery-view')).toHaveCount(0);
  await expect(page.locator('.mission-mode-gallery')).toHaveCount(0);
  await expect(page.locator('#mission-console')).toContainText('Mission Navigator');
  await expect(page.locator('#mission-console [data-mission-mode="surveySweep"]')).toContainText('Survey Sweep');
  await expect(page.locator('#mission-console [data-mission-mode="plumeIntercept"]')).toContainText('Plume Intercept');
  await expect(page.locator('#mission-console [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#waypoint-timeline')).toContainText('Mission Snapshot');
  await expect(page.locator('#waypoint-timeline')).not.toContainText('Mission Waypoints');
  await page.locator('#mission-console [data-mission-mode="plumeIntercept"]').click();
  await expect(page.evaluate(() => window.anchorGame.state.pendingScenarioSetup?.missionMode)).resolves.toBe('plumeIntercept');
  await expect(page.evaluate(() => window.anchorGame.state.pendingScenarioSetup?.mode)).resolves.toBe('forecast');
  await expect(page.locator('.mission-mode-detail-view')).toBeVisible();
  await expect(page.locator('.mission-mode-detail-view')).toContainText('Plume Intercept');
  await expect(page.locator('.mission-mode-detail-view')).not.toContainText('Back to Mission Modes');
  await expect(page.locator('.mission-mode-detail-view [data-action="reset"]')).toHaveCount(0);
  await expect(page.locator('#mission-console [data-flow-field="basePreset"]')).toHaveCount(0);
  await page.locator('.mission-mode-detail-view [data-action="generate"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.missionMode)).toBe('plumeIntercept');
});

test('level generator opens from main menu', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });

  await page.evaluate(() => window.anchorGame.phaser.scene.start('EnvironmentEditorScene'));
  await expect(page.getByRole('heading', { name: 'Environment Editor' })).toBeVisible();
  await expect(page.locator('.three-mission-editor-host .three-mission-world-canvas')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_EDITOR_DEBUG?.normalEditorUsesThree ?? false)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').editorHud?.activeGroup)).toBe('terrain');
  await expect(page.getByRole('button', { name: 'Generate Level' })).toBeVisible();
  await expect(page.locator('#ensemble-count')).toBeVisible();
  await expect(page.locator('#mobile-hazards-count')).toBeVisible();
  await expect(page.locator('#current-tool')).toBeVisible();
  await expect(page.locator('#editor-frame')).toBeVisible();
  await expect(page.locator('#waypoint-timeline')).toContainText('Editor Context');
  await expect(page.locator('#context-panel')).toBeEmpty();
  await expect(page.locator('#current-preview-summary')).toContainText('Frame 1 /');
  await expect(page.locator('#current-preview-summary')).toContainText('Apply To Level commits all');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').currentPreview.frames.length)).resolves.toBeGreaterThan(1);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.setPreviewFrame(Math.min(2, scene.currentPreview.frames.length - 1));
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').currentPreview.selectedFrameIndex)).resolves.toBeGreaterThan(0);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene');
    scene.setBrushSettingFromHud('radius', 4);
    scene.setBrushSettingFromHud('intensity', 1.2);
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('EnvironmentEditorScene').readBrushConfig().radius)).resolves.toBe(4);
  await expect(page.locator('#brush-radius')).toHaveValue('4');
  await expect(page.locator('#brush-intensity')).toHaveValue('1.2');
});

test('deterministic challenge generates a fresh perfect-knowledge level', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await waitForDefaultPhaserApp(page);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('perfectKnowledge'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.name?.startsWith('Deterministic Challenge'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.currentScenario?.source)).resolves.toBe('deterministicChallenge');
  await expect(page.evaluate(() => window.anchorGame.state.level?.instanceId)).resolves.toBeTruthy();
  await expect(page.evaluate(() => window.anchorGame.state.level?.meta?.seed)).resolves.toBeTruthy();
  await expect(page.evaluate(() => window.anchorGame.state.challengeMode)).resolves.toBe('perfectKnowledge');
  await expect(page.evaluate(() => window.anchorGame.state.level.layers.truth.frames.length)).resolves.toBeGreaterThan(0);
  await expect(page.evaluate(() => {
    const frames = window.anchorGame.state.level.layers.truth.frames;
    return JSON.stringify(frames[0]?.roi) !== JSON.stringify(frames[3]?.roi)
      && JSON.stringify(frames[0]?.current) !== JSON.stringify(frames[3]?.current);
  })).resolves.toBe(true);
});

test('load level json imports a level and offers play/edit actions', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await waitForDefaultPhaserApp(page);

  await page.evaluate(() => window.anchorGame.phaser.scene.start('LoadLevelJsonScene'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').sys.isActive())).toBe(true);
  await expect(page.locator('#context-panel')).toBeEmpty();
  await page.evaluate(async () => {
    const response = await fetch('levels/tutorial_01_currents.json');
    const data = await response.json();
    window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').importLevelData(data);
  });
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').level?.levelId)).resolves.toBe('tutorial_01_currents');
  await expect(page.evaluate(() => window.anchorGame.phaser.scene.getScene('LoadLevelJsonScene').objects?.length)).resolves.toBeGreaterThan(0);
});

test('stochastic mode exposes ensemble and risk controls', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await waitForDefaultPhaserApp(page);

  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startRandomChallenge('forecast'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.level?.meta?.name?.startsWith('Stochastic Challenge'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').sys.isActive())).toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.level.layers.forecasts.length)).resolves.toBe(3);
  await expect(page.evaluate(() => {
    const level = window.anchorGame.state.level;
    return JSON.stringify(level.layers.truth.frames[0]?.roi) !== JSON.stringify(level.layers.truth.frames[3]?.roi)
      && JSON.stringify(level.layers.forecasts[0].frames[0]?.current) !== JSON.stringify(level.layers.forecasts[0].frames[3]?.current);
  })).resolves.toBe(true);
  await expect(page.evaluate(() => window.anchorGame.state.ui.forecastMemberId)).resolves.toBe('ensemble_mean');
  await expect(page.evaluate(() => window.anchorGame.state.ui.roiViewMode)).resolves.toBe('expectedValue');
  await startPlanningFromBriefing(page);
  await expect(page.locator('#mission-summary-hud')).toContainText('Deploy');
  await expectTopHudTooltips(page);
  await expect(page.locator('#waypoint-timeline')).toContainText('Start: not selected');
  await expect(page.evaluate(() => import('./src/core/deployment/DeploymentZones.js').then(({ getSelectedStart }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const agent = window.anchorGame.state.mission.agents[0];
    return {
      selectedStart: getSelectedStart(agent),
      agentStart: agent.start ?? null,
      legacyGliderHitTargets: scene.gliderObjects?.length ?? 0,
      threeGliderCount: window.ANCHOR_MISSION_RENDER_DEBUG?.gliderCount ?? 0,
      fallbackDropZoneLabels: (scene.labelObjects ?? []).filter((object) => object.text === 'Drop zone').length
    };
  }))).resolves.toMatchObject({
    selectedStart: null,
    agentStart: null,
    legacyGliderHitTargets: 0,
    fallbackDropZoneLabels: 0
  });
  await expect(page.evaluate(() => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => buildPlanningGuidance({
    level: window.anchorGame.state.level,
    mission: window.anchorGame.state.mission,
    plan: window.anchorGame.state.plan,
    selectedAgentId: window.anchorGame.state.selectedAgentId,
    time: window.anchorGame.state.planningTime,
    challengeMode: window.anchorGame.state.challengeMode,
    forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
    planningAnchor: window.anchorGame.state.ui.planningAnchor,
    hoverCell: { x: 8, y: 8 },
    settings: window.anchorGame.state.ui
  })))).resolves.toBeNull();

  await clickCell(page, 8, 8);
  await expectWaypointCount(page, 0);
  await expect(page.evaluate(() => window.anchorGame.state.mission.agents[0].deployment?.selectedStart)).resolves.toBeFalsy();
  await expect(page.evaluate(() => import('./src/core/planning/PlanExecutionValidator.js').then(({ validatePlanForExecution }) => {
    const result = validatePlanForExecution({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan
    });
    return {
      ok: result.ok,
      firstError: result.errors[0] ?? ''
    };
  }))).resolves.toMatchObject({
    ok: false
  });
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').executePlan());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive())).toBe(false);
  await expect(page.evaluate(() => import('./src/core/sim/SimulationEngine.js').then(({ SimulationEngine }) => {
    const engine = new SimulationEngine({
      level: window.anchorGame.state.level,
      mission: JSON.parse(JSON.stringify(window.anchorGame.state.mission)),
      plan: JSON.parse(JSON.stringify(window.anchorGame.state.plan))
    });
    return {
      complete: engine.complete,
      aborted: engine.aborted,
      abortReason: engine.abortReason
    };
  }))).resolves.toMatchObject({
    complete: true,
    aborted: true,
    abortReason: 'invalidExecutionPlan'
  });

  const deploymentCell = await page.evaluate(() => window.anchorGame.state.level.zones.find((zone) => zone.id === 'drop_alpha')?.cells?.[0]);
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const agentId = window.anchorGame.state.mission.agents[0]?.id;
    if (agentId) scene.selectGlider?.(agentId);
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.selectedAgentId)).toBe(await page.evaluate(() => window.anchorGame.state.mission.agents[0]?.id));
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  await clickThreeGridCell(page, deploymentCell.x, deploymentCell.y);
  await expect(page.evaluate(() => { const start = window.anchorGame.state.mission.agents[0].deployment?.selectedStart; return start ? { x: start.x, y: start.y } : null; })).resolves.toEqual(deploymentCell);
  await expect(page.evaluate(() => { const start = window.anchorGame.state.plan.agentPlans[0].selectedStart; return start ? { x: start.x, y: start.y } : null; })).resolves.toEqual(deploymentCell);
  await expect(page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return {
      agentStart: window.anchorGame.state.mission.agents[0].start,
      gliderVisible: scene.getMissionRendererBackend?.() === 'threeMission3d'
        ? (window.ANCHOR_MISSION_RENDER_DEBUG?.gliderCount ?? 0) > 0
        : (scene.gliderObjects?.length ?? 0) === 1
    };
  })).resolves.toMatchObject({
    agentStart: deploymentCell,
    gliderVisible: true
  });
  await expect(page.locator('#mission-summary-hud')).toContainText(`Start ${deploymentCell.x},${deploymentCell.y}`);
  await expectTopHudTooltips(page);
  const markerCells = await validMarkerCellsNear(page, deploymentCell, 2);
  await expectMarkerHoverAndPlacement(page, markerCells[0].x, markerCells[0].y);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').zoomMap(1.5));
  await expectMarkerHoverAndPlacement(page, markerCells[1].x, markerCells[1].y);
  await expect(page.evaluate((cell) => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => {
    const guidance = buildPlanningGuidance({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan,
      selectedAgentId: window.anchorGame.state.selectedAgentId,
      time: window.anchorGame.state.planningTime,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      planningAnchor: window.anchorGame.state.ui.planningAnchor,
      hoverCell: { x: cell.x + 1, y: cell.y },
      settings: window.anchorGame.state.ui
    });
    return {
      hasGuidance: Boolean(guidance),
      center: guidance?.reachableRegion?.center ?? null,
      anchor: guidance?.debug?.planningAnchor ?? null
    };
  }), deploymentCell)).resolves.toMatchObject({
    hasGuidance: true,
    center: deploymentCell,
    anchor: { x: deploymentCell.x, y: deploymentCell.y }
  });

  const plannedWaypointCount = await page.evaluate(async () => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const level = window.anchorGame.state.level;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    let added = 0;
    for (const [index, agent] of window.anchorGame.state.mission.agents.entries()) {
      window.anchorGame.state.selectedAgentId = agent.id;
      scene.selectGlider?.(agent.id);
      if (!agent.deployment?.selectedStart) {
        const zone = level.zones.find((candidate) => candidate.id === agent.deployment?.zoneId);
        if (zone?.cells?.length) scene.trySelectDeploymentStart(zone.cells[Math.min(index, zone.cells.length - 1)]);
      }
      for (let y = 2; y < level.world.grid.height; y += 1) {
        let placed = false;
        for (let x = 2; x < level.world.grid.width; x += 1) {
          const candidate = { x, y, action: 'sample' };
          const placement = canPlaceWaypoint(window.anchorGame.state, agent.id, candidate);
          if (placement.allowed) {
            scene.addWaypointForSelected(candidate);
            added += 1;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }
    return added;
  });
  await expectWaypointCount(page, plannedWaypointCount);
  const postWaypointGuidance = await page.evaluate(() => import('./src/core/planning/PlanningGuidance.js').then(({ buildPlanningGuidance }) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === window.anchorGame.state.selectedAgentId);
    const last = agentPlan?.waypoints?.at(-1);
    const guidance = buildPlanningGuidance({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      plan: window.anchorGame.state.plan,
      selectedAgentId: window.anchorGame.state.selectedAgentId,
      time: window.anchorGame.state.planningTime,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      planningAnchor: window.anchorGame.state.ui.planningAnchor,
      settings: window.anchorGame.state.ui
    });
    return {
      center: guidance?.reachableRegion?.center ?? null,
      anchor: guidance?.debug?.planningAnchor ?? null,
      last: last ? { x: last.x, y: last.y } : null
    };
  }));
  expect(postWaypointGuidance.center).toEqual(postWaypointGuidance.last);
  expect(postWaypointGuidance.anchor).toMatchObject(postWaypointGuidance.last);
  await expect(page.evaluate(() => import('./src/core/io/SolverPacketExporter.js').then(({ buildSolverPacket }) => {
    const packet = buildSolverPacket({
      level: window.anchorGame.state.level,
      mission: window.anchorGame.state.mission,
      challengeMode: window.anchorGame.state.challengeMode,
      forecastMemberId: window.anchorGame.state.ui.forecastMemberId,
      roiViewMode: window.anchorGame.state.ui.roiViewMode
    });
    return packet.deployment.agents[0];
  }))).resolves.toMatchObject({
    mode: 'chooseFromZone',
    zoneId: 'drop_alpha',
    selectedStart: deploymentCell
  });
  const executeButton = page.locator('#mission-console [data-action="execute"]');
  await expect(executeButton).toBeEnabled();
  await executeButton.click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene').sys.isActive()), { timeout: 15000 }).toBe(true);
});
