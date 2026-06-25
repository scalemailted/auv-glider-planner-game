import { expect } from '@playwright/test';
import fs from 'node:fs/promises';
import { waitForAnchorAppReady, waitForAnchorRoute } from './AnchorRuntimeReadyHarness.js';
import { compareSimulationExecutions } from '../../../src/core/simulation/SimulationRendererParity.js';

export async function waitForDefaultPhaserApp(page) {
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
}

export async function prepareTerrainValidationPlanningBase(page) {
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  const agentId = await selectFirstAgentThroughVisibleControls(page);
  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  for (const id of agentIds) {
    await selectAgentThroughVisibleControls(page, id);
    await deployAgentThroughVisibleThreeControls(page, id);
  }
  await selectAgentThroughVisibleControls(page, agentId);
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  return { agentId };
}

export async function terrainReadinessSnapshot(page) {
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
      terrainValidationObjectCount: debug.terrainValidationObjectCount ?? debug.rendererSummary?.terrainValidationObjectCount ?? 0,
      validationLayerDigest: window.ANCHOR_TERRAIN_VALIDATION_DEBUG?.validationLayerDigest ?? null,
      executeControlEnabled: window.ANCHOR_EXECUTION_DEBUG?.executeControlEnabled ?? null,
      executeControlDisabledReason: window.ANCHOR_EXECUTION_DEBUG?.executeControlDisabledReason ?? null,
      executeButtonTitle: document.querySelector('#mission-console [data-action="execute"]')?.getAttribute('title') ?? null
    };
  });
}

export async function findLandCrossingRouteCandidate(page, agentId) {
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
    const width = level.world?.grid?.width ?? 0;
    const height = level.world?.grid?.height ?? 0;
    const water = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
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
      if (crossing) return { safe, crossing, crossingFrom: 'safe' };
    }
    return fallbackSafe ? { safe: fallbackSafe, crossing: null, crossingFrom: null } : null;
  }, agentId);
}

export async function findDeepDiveWarningRouteCandidate(page, agentId) {
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
    const width = level.world?.grid?.width ?? 0;
    const height = level.world?.grid?.height ?? 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const safe = { x, y };
        if (sameAsStart(safe) || !canPlaceWaypoint(state, id, { x, y, action: 'sample' }).allowed) continue;
        const surface = validateTerrainAwareSurfaceWaypoint({ level, mission, agentId: id, position: safe });
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
        if (!surface.accepted || !point || point.visible === false || point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) continue;
        const normalReport = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from: start, to: safe }, segmentIndex: 0 });
        if (normalReport.executable === false || normalReport.hardErrors?.length) continue;
        const deepTarget = { ...safe, diveProfileId: 'deepDive', targetDepthLayerId: 'deep', maximumDiveDepthMeters: 150 };
        const deepReport = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from: start, to: deepTarget }, segmentIndex: 0 });
        const deepIssueCodes = [...(deepReport.hardErrors ?? []), ...(deepReport.warnings ?? [])].map((issue) => issue.code);
        if (!(deepReport.hardErrors ?? []).length && deepIssueCodes.some((code) => /BATHYMETRY|CLEARANCE|PROFILE|VEHICLE/.test(code))) {
          return { safe, deepIssueCodes, crossing: null, crossingFrom: null };
        }
      }
    }
    return null;
  }, agentId);
}

export async function findTerrainWarningWaypointCell(page, agentId) {
  return page.evaluate(async (id) => {
    const { validateTerrainAwareRouteSegment, validateTerrainAwareSurfaceWaypoint } = await import('./src/core/planning/TerrainAwareMissionValidation.js');
    const state = window.anchorGame.state;
    const level = state.level;
    const mission = state.mission;
    const agent = mission.agents.find((candidate) => candidate.id === id) ?? mission.agents[0];
    const agentPlan = state.plan.agentPlans.find((candidate) => candidate.agentId === id);
    const waypoints = agentPlan?.waypoints ?? [];
    const from = waypoints.length >= 2
      ? waypoints[waypoints.length - 2]
      : (waypoints[0] ?? agentPlan?.selectedStart ?? agent?.deployment?.selectedStart ?? agent?.start ?? { x: 0, y: 0 });
    const width = level.world?.grid?.width ?? 0;
    const height = level.world?.grid?.height ?? 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const surface = validateTerrainAwareSurfaceWaypoint({ level, mission, agentId: id, position: { x, y } });
        if (!surface.accepted) continue;
        const report = validateTerrainAwareRouteSegment({ level, mission, agent, agentPlan, segment: { from, to: { x, y } }, segmentIndex: 0 });
        if (report.status === 'VALID_WITH_WARNINGS') return { x, y };
      }
    }
    return null;
  }, agentId);
}

export async function findBelowSeabedSamplingTargetCell(page, layerId = 'deep') {
  return page.evaluate(async (requestedLayerId) => {
    const { sampleBathymetryAt } = await import('./src/core/science/BathymetryFieldModel.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');
    const state = window.anchorGame.state;
    const level = state.level;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
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

export async function focusFirstTerrainIssue(page) {
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
export async function generatedWaterColumnSnapshot(page) {
  return page.evaluate(() => {
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
  });
}

export async function legacyWaterColumnSnapshot(page) {
  return page.evaluate(() => {
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
  });
}
export async function collectSceneIsolationSnapshot(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame?.phaser?.scene;
    const debug = window.ANCHOR_SCENE_ISOLATION_DEBUG ?? {};
    const text = (id) => document.getElementById(id)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return {
      mainMenuActive: scene?.getScene('MainMenuScene')?.sys?.isActive?.() ?? false,
      planningActive: scene?.getScene('MissionWorkspaceScene')?.sys?.isActive?.() ?? false,
      simulationActive: scene?.getScene('SimulationScene')?.sys?.isActive?.() ?? false,
      mainMenuVisible: Boolean(document.querySelector('#main-menu-hub')),
      threeCanvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
      threeHostCount: document.querySelectorAll('.three-mission-world-host').length,
      planningOverlayCount: document.querySelectorAll('.three-mission-tool-overlay').length,
      simulationOverlayCount: document.querySelectorAll('.three-simulation-overlay, [data-simulation-overlay]').length,
      timelineText: text('bottom-timeline'),
      performanceText: text('agent-performance-hud'),
      rightPanelText: text('waypoint-timeline'),
      debugIsolationStatus: debug.isolationStatus ?? null,
      debugActiveProductionSceneCount: debug.activeProductionSceneCount ?? null,
      debugThreeMissionCanvasCount: debug.threeMissionCanvasCount ?? null,
      debugThreeMissionRendererCount: debug.threeMissionRendererCount ?? null,
      debugThreeAnimationLoopCount: debug.threeAnimationLoopCount ?? null,
      debugPlanningOverlayCount: debug.planningOverlayCount ?? null,
      debugSimulationOverlayCount: debug.simulationOverlayCount ?? null
    };
  });
}

export async function expectMainMenuSceneIsolation(page) {
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => collectSceneIsolationSnapshot(page), { timeout: 15000 }).toMatchObject({
    mainMenuActive: true,
    mainMenuVisible: true,
    threeCanvasCount: 0,
    threeHostCount: 0,
    planningOverlayCount: 0,
    simulationOverlayCount: 0,
    debugIsolationStatus: 'PASS',
    debugActiveProductionSceneCount: 1,
    debugThreeMissionCanvasCount: 0,
    debugThreeMissionRendererCount: 0,
    debugThreeAnimationLoopCount: 0,
    debugPlanningOverlayCount: 0,
    debugSimulationOverlayCount: 0
  });
  const snapshot = await collectSceneIsolationSnapshot(page);
  expect(snapshot.timelineText).not.toMatch(/Mission Waypoints|Transport|Play|Step|Pause/i);
  expect(snapshot.performanceText).not.toMatch(/Mission Performance|Battery|Energy|Samples|Glider/i);
  expect(snapshot.rightPanelText).not.toMatch(/Mission Waypoints|Waypoint \d|MISSION WINDOW|Glider/i);
}

export async function stepSimulationSceneForRenderCost(page, { keepRunning = true } = {}) {
  await page.evaluate(({ keepRunning }) => {
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
    if (!scene?.engine) return;
    if (keepRunning) scene.engine.play?.();
    const beforeStepCount = Number(scene.engine.stepCount ?? 0);
    scene.engine.step?.(1 / 30, { force: true });
    scene.recordSimulationProgressStage?.(beforeStepCount, keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
    scene.syncSimulationTimeToState?.();
    scene.publishLatestSimulationSnapshot?.(keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
    scene.consumeScheduledPresentationFrame?.({ force: true, reason: keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep' });
    scene.refreshSurfaceDecision?.();
    scene.refreshRouteFailureDecision?.();
    scene.notifyAbortIfNeeded?.();
    scene.notifyStopReasonIfNeeded?.();
  }, { keepRunning });
}

export async function advanceSimulationSceneForRenderCost(page, { steps = 12, frameDelay = 40, keepRunning = true } = {}) {
  for (let index = 0; index < steps; index += 1) {
    await stepSimulationSceneForRenderCost(page, { keepRunning });
    if (frameDelay > 0) await page.waitForTimeout(frameDelay);
  }
}

export async function startSimulationSceneRenderCostStepper(page, { intervalMs = 50, keepRunning = true } = {}) {
  await page.evaluate(({ intervalMs, keepRunning }) => {
    if (window.__anchorRenderCostStepper) window.clearInterval(window.__anchorRenderCostStepper);
    const step = () => {
      const scene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
      if (!scene?.engine) return;
      if (keepRunning) scene.engine.play?.();
      const beforeStepCount = Number(scene.engine.stepCount ?? 0);
      scene.engine.step?.(1 / 30, { force: true });
      scene.recordSimulationProgressStage?.(beforeStepCount, keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
      scene.syncSimulationTimeToState?.();
      scene.publishLatestSimulationSnapshot?.(keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep');
      scene.consumeScheduledPresentationFrame?.({ force: true, reason: keepRunning ? 'e2eLiveRenderCostStep' : 'e2eRenderCostStep' });
    };
    step();
    window.__anchorRenderCostStepper = window.setInterval(step, intervalMs);
  }, { intervalMs, keepRunning });
}

export async function stopSimulationSceneRenderCostStepper(page) {
  await page.evaluate(() => {
    if (window.__anchorRenderCostStepper) window.clearInterval(window.__anchorRenderCostStepper);
    window.__anchorRenderCostStepper = null;
    const scene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
    scene?.engine?.pause?.();
    scene?.refreshControls?.();
    scene?.renderSimulationTimeline?.();
    scene?.publishExecutionDebug?.();
  });
}
export async function prepareThreeSamplingTargetDiveScenario(page, { attach = true, profile = 'thermoclineDive', layer = 'thermocline', cycles = 2, extraFarWaypoints = 0 } = {}) {
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
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
  for (let index = 0; index < extraFarWaypoints; index += 1) {
    const beforeCount = await totalWaypointCount(page);
    let placed = false;
    for (let attempt = 0; attempt < 12 && !placed; attempt += 1) {
      const cell = await findWaypointPlacementCell(page, { preferFar: true, requireNoWarnings: attempt < 4, nth: attempt })
        ?? await findWaypointPlacementCell(page, { requireNoWarnings: attempt < 8, nth: attempt });
      if (!cell) continue;
      const result = await page.evaluate(async (candidate) => {
        const { validatePlanForExecution } = await import('./src/core/planning/PlanExecutionValidator.js');
        const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
        const state = window.anchorGame.state;
        const agentId = state.selectedAgentId;
        const agentPlan = state.plan?.agentPlans?.find((plan) => plan.agentId === agentId);
        const before = agentPlan?.waypoints?.length ?? 0;
        const added = scene.addWaypointForSelected({ x: candidate.x, y: candidate.y, action: 'sample' });
        const afterPlan = state.plan?.agentPlans?.find((plan) => plan.agentId === agentId);
        const after = afterPlan?.waypoints?.length ?? 0;
        if (!added?.ok || after <= before) return { ok: false, reason: added?.message ?? 'not-added' };
        const validation = validatePlanForExecution({ level: state.level, mission: state.mission, plan: state.plan });
        if (!validation.ok) {
          scene.removeWaypointFromPanel(agentId, after - 1);
          return { ok: false, reason: validation.errors?.[0] ?? 'execution-invalid' };
        }
        return { ok: true };
      }, cell);
      if (!result?.ok) continue;
      await expect.poll(() => totalWaypointCount(page), { timeout: 1500 }).toBe(beforeCount + 1);
      placed = true;
    }
    expect(placed).toBe(true);
  }
  await expectWaypointCount(page, 2 + extraFarWaypoints);
  await page.locator(`#mission-console [data-action="water-column-dive-profile"][data-profile="${profile}"]`).click();
  await page.locator(`#mission-console [data-action="water-column-target-layer"][data-layer="${layer}"]`).click();
  await page.locator(`#mission-console [data-action="water-column-active-layer"][data-layer="${layer}"]`).click();
  await page.locator(`#mission-console [data-action="water-column-cycle-count"][data-cycles="${cycles}"]`).click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDiveAvailable === true), { timeout: 10000 }).toBe(true);
  const targetCell = await findSamplingTargetPlacementCell(page, layer) ?? await page.evaluate((id) => {
    const agentPlan = window.anchorGame.state.plan.agentPlans.find((plan) => plan.agentId === id);
    const waypoints = agentPlan?.waypoints ?? [];
    const a = waypoints[0] ?? { x: 2, y: 2 };
    const b = waypoints[1] ?? a;
    return { x: Math.round((Number(a.x) + Number(b.x)) / 2), y: Math.round((Number(a.y) + Number(b.y)) / 2) };
  }, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeSamplingTarget"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeSamplingTarget');
  const depthPoint = await page.evaluate(({ layerId, cell }) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(layerId, cell.x, cell.y) ?? null, { layerId: layer, cell: targetCell });
  expect(depthPoint).toBeTruthy();
  const placementResult = await page.evaluate(({ layerId, cell }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    return scene.placeSamplingTargetFromThree?.({
      type: 'placeSamplingTarget',
      gridCell: { ...cell, depthLayerId: layerId },
      continuousPoint: { x: cell.x, y: cell.y },
      depthLayerId: layerId,
      metadata: { source: 'e2eCanonicalPlacement' }
    }) ?? null;
  }, { layerId: layer, cell: targetCell });
  expect(placementResult?.status).toBe('accepted');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0)).toBeGreaterThan(0);
  const targetId = await page.evaluate(() => window.anchorGame.state.ui?.selectedScienceTargetId ?? window.anchorGame.state.plan?.scienceTargets?.[0]?.id ?? null);
  expect(targetId).toBeTruthy();
  if (attach) {
    await page.locator('#mission-console [data-action="science-target-attach"]').click();
    await expect.poll(() => page.evaluate((id) => (window.anchorGame.state.plan?.scienceTargets ?? []).find((target) => target.id === id)?.attachedSegmentIds?.length ?? 0, targetId)).toBeGreaterThan(0);
  }
  return { agentId, targetId, targetCell };
}

export async function expectNoTerrainResourcesOnMainMenu(page) {
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => ({
    canvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
    hostCount: document.querySelectorAll('.three-mission-world-host').length,
    bathymetryCanvasCount: document.querySelectorAll('.three-bathymetry-canvas').length,
    bathymetryHostCount: document.querySelectorAll('.three-bathymetry-host, #bathymetry-three-renderer-host').length,
    terrainObjectCount: window.ANCHOR_SCENE_ISOLATION_DEBUG?.activeWaterColumnSlabCount ?? 0,
    isolationStatus: window.ANCHOR_SCENE_ISOLATION_DEBUG?.isolationStatus ?? null,
    activeSceneKeys: window.ANCHOR_SCENE_ISOLATION_DEBUG?.activePhaserSceneKeys ?? []
  })), { timeout: 10000 }).toMatchObject({
    canvasCount: 0,
    hostCount: 0,
    bathymetryCanvasCount: 0,
    bathymetryHostCount: 0,
    isolationStatus: 'PASS'
  });
  const counts = await page.evaluate(() => ({
    canvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
    hostCount: document.querySelectorAll('.three-mission-world-host').length,
    bathymetryCanvasCount: document.querySelectorAll('.three-bathymetry-canvas').length,
    bathymetryHostCount: document.querySelectorAll('.three-bathymetry-host, #bathymetry-three-renderer-host').length,
    terrainObjectCount: window.ANCHOR_SCENE_ISOLATION_DEBUG?.activeWaterColumnSlabCount ?? 0,
    isolationStatus: window.ANCHOR_SCENE_ISOLATION_DEBUG?.isolationStatus ?? null,
    activeSceneKeys: window.ANCHOR_SCENE_ISOLATION_DEBUG?.activePhaserSceneKeys ?? []
  }));
  expect(counts.canvasCount).toBe(0);
  expect(counts.hostCount).toBe(0);
  expect(counts.bathymetryCanvasCount).toBe(0);
  expect(counts.bathymetryHostCount).toBe(0);
  expect(counts.isolationStatus).toBe('PASS');
  return counts;
}
export async function startVisibleContinuousMissionPlanning(page) {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await openMainMenuHubSection(page, 'challenge');
  await page.locator('#main-menu-hub [data-action="random-challenge"]').first().click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect(page.locator('#mission-console')).toContainText('Scenario Start');
  await expect(page.locator('#mission-console [data-action="start"]')).toBeVisible();
  await page.locator('#mission-console [data-action="start"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expectSingleThreeMissionRenderer(page, 'planning');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CONTINUOUS_MISSION_DEBUG?.planningSceneCreateCompleted === true), { timeout: 15000 }).toBe(true);
}

export function assertContinuousBrowserErrorsClean(browserErrors) {
  const errors = browserErrors.unexpected();
  const text = JSON.stringify(errors);
  expect(text).not.toMatch(/waypointSnapMode|is not defined|ReferenceError|TypeError/i);
  browserErrors.assertClean({ disallow: [/waypointSnapMode/i, /is not defined/i, /ReferenceError/i, /TypeError/i] });
}

export async function selectedAgentId(page) {
  return page.evaluate(() => window.anchorGame.state.selectedAgentId ?? window.anchorGame.state.mission?.agents?.[0]?.id ?? null);
}

export async function deploySelectedGliderThroughVisibleControls(page, agentId) {
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectDeploymentCell"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectDeploymentCell');
  await clickThreeGridCell(page, deploymentCell.x, deploymentCell.y);
  await expect.poll(() => page.evaluate((id) => {
    const agentPlan = window.anchorGame.state.plan?.agentPlans?.find((candidate) => candidate.agentId === id);
    const start = agentPlan?.selectedStart;
    return start ? { x: start.x, y: start.y } : null;
  }, agentId)).toEqual(deploymentCell);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('placeWaypoint');
}

export async function deployAllGlidersThroughVisibleControls(page) {
  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  for (const agentId of agentIds) {
    await selectAgentThroughVisibleControls(page, agentId);
    await deploySelectedGliderThroughVisibleControls(page, agentId);
  }
}

export async function deployAllGlidersAndRouteFirstThroughVisibleControls(page) {
  await deployAllGlidersThroughVisibleControls(page);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  const agentId = await selectFirstAgentThroughVisibleControls(page);
  const route = await findLandCrossingRouteCandidate(page, agentId);
  expect(route).toBeTruthy();
  await page.locator('#mission-console [data-action="waypoint-snap-mode"][data-mode="snapToCellCenters"]').click();
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickThreeGridGroundCell(page, route.safe.x, route.safe.y);
  await expectWaypointCount(page, 1);
  return { agentId, route };
}

export async function selectFirstAgentThroughVisibleControls(page) {
  const firstAgentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id ?? null);
  await selectAgentThroughVisibleControls(page, firstAgentId);
  return firstAgentId;
}

export async function selectAgentThroughVisibleControls(page, agentId) {
  if (!agentId) return null;
  for (let index = 0; index < 8; index += 1) {
    const current = await selectedAgentId(page);
    if (current === agentId) return agentId;
    const point = await page.evaluate((id) => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForAgent?.(id) ?? null, agentId);
    if (point && point.visible !== false && Number.isFinite(point.x) && Number.isFinite(point.y)) {
      await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="selectInspect"]').click();
      await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activePlanningToolId)).toBe('selectInspect');
      await page.mouse.click(point.x, point.y);
      try {
        await expect.poll(() => selectedAgentId(page), { timeout: 1200 }).toBe(agentId);
        return agentId;
      } catch {
        // Fall through to the console control if overlapping agents prevented direct selection.
      }
    }
    await page.locator('#mission-console [data-action="next-glider"]').first().evaluate((button) => button.click());
    await page.waitForTimeout(150);
  }
  throw new Error(`Could not select agent ${agentId} through visible agent controls.`);
}

export async function adjacentPlaceableWaypointPair(page, agentId) {
  return page.evaluate(async (id) => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const state = window.anchorGame.state;
    const width = state.level?.world?.grid?.width ?? 0;
    const height = state.level?.world?.grid?.height ?? 0;
    const allowed = (x, y) => canPlaceWaypoint(state, id, { x, y, action: 'sample' }).allowed === true;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        if (allowed(x, y) && allowed(x + 1, y)) return { a: { x, y }, b: { x: x + 1, y } };
        if (allowed(x, y) && allowed(x, y + 1)) return { a: { x, y }, b: { x, y: y + 1 } };
      }
    }
    for (let y = 1; y < height; y += 1) {
      for (let x = 1; x < width; x += 1) {
        if (allowed(x, y)) return { a: { x, y }, b: { x, y } };
      }
    }
    throw new Error(`No adjacent placeable waypoint pair found for ${id}`);
  }, agentId);
}

export async function clickBetweenThreeGridCells(page, a, b, weight = 0.5) {
  const from = await threeGridPoint(page, a.x, a.y);
  const to = await threeGridPoint(page, b.x, b.y);
  const bounded = Math.max(0, Math.min(1, Number(weight)));
  await page.mouse.click(from.x + (to.x - from.x) * bounded, from.y + (to.y - from.y) * bounded);
}

export async function waypointAtIndex(page, agentId, index) {
  return page.evaluate(({ id, index }) => {
    const plan = window.anchorGame.state.plan?.agentPlans?.find((candidate) => candidate.agentId === id);
    const waypoint = plan?.waypoints?.[index];
    return waypoint ? JSON.parse(JSON.stringify(waypoint)) : null;
  }, { id: agentId, index });
}

export function hasFractionalCoordinate(point) {
  return Boolean(point) && (
    Math.abs(Number(point.x) - Math.round(Number(point.x))) > 1e-3
    || Math.abs(Number(point.y) - Math.round(Number(point.y))) > 1e-3
  );
}

export async function continuousDiveExecutionSnapshot(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const executionDebug = window.ANCHOR_EXECUTION_DEBUG ?? {};
    const renderDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const agents = scene?.engine?.agents ?? [];
    const history = agents.flatMap((agent) => agent.history ?? []);
    const depths = [
      ...agents.map((agent) => Number(agent.depthMeters ?? agent.position?.depthMeters ?? 0)),
      ...history.map((point) => Number(point.depthMeters ?? point.z ?? 0))
    ].filter(Number.isFinite);
    const pitches = [
      ...agents.map((agent) => Number(agent.pitchRadians ?? 0)),
      ...history.map((point) => Number(point.pitchRadians ?? 0)),
      Number(renderDebug.selectedAgentPitchRadians ?? 0)
    ].filter(Number.isFinite);
    const phases = [...new Set(agents.map((agent) => agent.divePhase ?? null).filter(Boolean))];
    return {
      firstStepCompleted: executionDebug.firstStepCompleted === true || renderDebug.firstStepCompleted === true,
      maxDepthMeters: Math.max(0, ...depths.map((value) => Math.abs(value))),
      maxAbsPitchRadians: Math.max(0, ...pitches.map((value) => Math.abs(value))),
      divePhases: phases,
      realizedTrajectoryPointCount: renderDebug.realizedTrajectoryPointCount ?? 0,
      trackHasContinuousCoordinates: history.some((point) => (
        Math.abs(Number(point.x ?? 0) - Math.round(Number(point.x ?? 0))) > 1e-3
        || Math.abs(Number(point.y ?? 0) - Math.round(Number(point.y ?? 0))) > 1e-3
      ))
    };
  });
}
export async function expectSingleThreeMissionRenderer(page, phase) {
  await expect.poll(() => page.evaluate((expectedPhase) => {
    const missionDebug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    const simulationDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const phaseDebug = expectedPhase === 'simulation' ? simulationDebug : missionDebug;
    return {
      canvasCount: document.querySelectorAll('.three-mission-world-canvas').length,
      hostCount: document.querySelectorAll('.three-mission-world-host').length,
      mounted: phaseDebug.threeMounted === true,
      backend: phaseDebug.activeBackend ?? null,
      renderLoopCount: expectedPhase === 'simulation'
        ? (simulationDebug.threeRenderLoopCount ?? (phaseDebug.threeMounted ? 1 : 0))
        : (missionDebug.threeRenderLoopCount ?? (phaseDebug.threeMounted ? 1 : 0))
    };
  }, phase), { timeout: 15000 }).toMatchObject({
    canvasCount: 1,
    hostCount: 1,
    mounted: true,
    backend: 'threeMission3d'
  });
}

export async function findHardInvalidWaypointCell(page) {
  return page.evaluate(async () => {
    const { validateTerrainAwareSurfaceWaypoint } = await import('./src/core/planning/TerrainAwareMissionValidation.js');
    const state = window.anchorGame.state;
    const level = state.level;
    const mission = state.mission;
    const agentId = state.selectedAgentId ?? mission?.agents?.[0]?.id ?? null;
    const fallback = { x: 0, y: 0 };
    for (let y = 0; y < level.world.grid.height; y += 1) {
      for (let x = 0; x < level.world.grid.width; x += 1) {
        const validation = validateTerrainAwareSurfaceWaypoint({ level, mission, agentId, position: { x, y } });
        if (validation.accepted) continue;
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
        if (point?.visible !== false && point?.x >= 0 && point?.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight) {
          return { x, y };
        }
      }
    }
    return fallback;
  });
}

export async function findSamplingTargetPlacementCell(page, layerId = 'thermocline') {
  return page.evaluate(async (requestedLayerId) => {
    const { sampleBathymetryAt } = await import('./src/core/science/BathymetryFieldModel.js');
    const { waterColumnLayerMetadata } = await import('./src/core/science/WaterColumnSchema.js');
    const state = window.anchorGame.state;
    const level = state.level ?? {};
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const viewModel = scene?.missionRenderViewModel ?? {};
    const bathymetry = level.bathymetry ?? level.world?.bathymetry ?? level.layers?.bathymetry ?? viewModel.bathymetry ?? null;
    const bottomBoundary = viewModel.bottomBoundary ?? null;
    const depthGrid = bottomBoundary?.bottomDepthField ?? level.layers?.depthMeters ?? level.layers?.depth ?? level.world?.bathymetry?.depthMeters ?? bathymetry?.depthMeters ?? null;
    const depthSource = Array.isArray(depthGrid) ? { depthMeters: depthGrid } : bathymetry;
    const landMask = bottomBoundary?.landMask ?? level.layers?.terrain ?? level.world?.bathymetry?.landMask ?? level.world?.bathymetry?.landSeaMask ?? bathymetry?.landMask ?? bathymetry?.landSeaMask ?? null;
    const grid = level.world?.grid ?? viewModel.coordinateSystem ?? {};
    const width = Number(grid.width ?? bathymetry?.width ?? depthGrid?.[0]?.length ?? 0);
    const height = Number(grid.height ?? bathymetry?.height ?? depthGrid?.length ?? 0);
    const depthMeters = Number(waterColumnLayerMetadata(requestedLayerId).nominalDepthMeters ?? 0);
    const minimumClearance = Math.max(0, Number(state.mission?.physics?.minimumBottomClearanceMeters ?? state.mission?.physics?.bottomClearanceMeters ?? 5));
    const bottomValues = Array.isArray(depthGrid) ? depthGrid.flat().map(Number).filter(Number.isFinite) : [];
    const candidateDebug = {
      requestedLayerId,
      depthMeters,
      minimumClearance,
      width,
      height,
      hasBathymetry: Boolean(bathymetry?.depthMeters),
      hasDepthGrid: Array.isArray(depthGrid),
      minBottom: bottomValues.length ? Math.min(...bottomValues) : null,
      maxBottom: bottomValues.length ? Math.max(...bottomValues) : null,
      visibleDepthPointCount: 0,
      clearanceCandidateCount: 0,
      visibleCandidateCount: 0
    };
    const candidates = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (landMask?.[y]?.[x] === true || landMask?.[y]?.[x] === 1 || landMask?.[y]?.[x] === 'land') continue;
        const bottomDepth = sampleBathymetryAt(depthSource, x, y);
        const clearance = bottomDepth - depthMeters;
        if (!Number.isFinite(clearance) || clearance < minimumClearance) continue;
        candidateDebug.clearanceCandidateCount += 1;
        const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForDepthCell?.(requestedLayerId, x, y);
        if (point) candidateDebug.visibleDepthPointCount += 1;
        if (!point || point.visible === false || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
        if (point.x < 0 || point.y < 0 || point.x > window.innerWidth || point.y > window.innerHeight) continue;
        candidateDebug.visibleCandidateCount += 1;
        candidates.push({ x, y, clearance, bottomDepth, distanceFromCenter: Math.hypot(x - width / 2, y - height / 2) });
      }
    }
    candidates.sort((a, b) => (b.clearance - a.clearance) || (a.distanceFromCenter - b.distanceFromCenter));
    window.__samplingTargetCandidateDebug = { ...candidateDebug, selected: candidates[0] ?? null, topCandidates: candidates.slice(0, 5) };
    return candidates[0] ? { x: candidates[0].x, y: candidates[0].y } : null;
  }, layerId);
}
export async function findWaypointPlacementCell(page, { warningCode = null, requireNoWarnings = false, preferFar = false, nth = 0 } = {}) {
  return page.evaluate(async ({ warningCode, requireNoWarnings, preferFar, nth }) => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const state = window.anchorGame.state;
    const agentId = state.selectedAgentId ?? state.mission?.agents?.[0]?.id;
    const plan = state.plan?.agentPlans?.find((candidate) => candidate.agentId === agentId);
    const existing = new Set((plan?.waypoints ?? []).map((waypoint) => `${Math.round(waypoint.x)},${Math.round(waypoint.y)}`));
    const start = plan?.selectedStart ?? state.mission?.agents?.find((agent) => agent.id === agentId)?.deployment?.selectedStart ?? state.mission?.agents?.[0]?.start ?? { x: 0, y: 0 };
    const last = (plan?.waypoints ?? []).at(-1) ?? start;
    const cells = [];
    const grid = state.level?.world?.grid ?? {};
    for (let y = 0; y < Number(grid.height ?? 0); y += 1) {
      for (let x = 0; x < Number(grid.width ?? 0); x += 1) {
        if (existing.has(`${x},${y}`)) continue;
        const placement = canPlaceWaypoint(state, agentId, { x, y, action: 'sample' });
        if (!placement.allowed) continue;
        const warningCodes = placement.estimate?.warningCodes ?? [];
        const warnings = placement.estimate?.warnings ?? [];
        if (warningCode && !warningCodes.includes(warningCode)) continue;
        if (requireNoWarnings && (warningCodes.length || warnings.length)) continue;
        cells.push({
          x,
          y,
          distance: Math.hypot(Number(x) - Number(last?.x ?? 0), Number(y) - Number(last?.y ?? 0)),
          eta: Number(placement.estimate?.estimatedArrivalTime ?? placement.estimate?.arrivalTime ?? 0)
        });
      }
    }
    cells.sort((a, b) => preferFar || warningCode ? (b.eta - a.eta) || (b.distance - a.distance) : (a.distance - b.distance));
    const selected = cells.length ? cells[Math.max(0, Math.min(cells.length - 1, Number(nth ?? 0)))] : null;
    return selected ? { x: selected.x, y: selected.y } : null;
  }, { warningCode, requireNoWarnings, preferFar });
}

export function isFiniteQuaternion(quaternion) {
  return Boolean(quaternion)
    && Number.isFinite(quaternion.x)
    && Number.isFinite(quaternion.y)
    && Number.isFinite(quaternion.z)
    && Number.isFinite(quaternion.w);
}

export function quaternionDelta(a, b) {
  if (!isFiniteQuaternion(a) || !isFiniteQuaternion(b)) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w);
}
export async function clickCell(page, x, y) {
  await page.evaluate(() => {
    if (window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d') {
      const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
      const state = window.anchorGame.state;
      const agent = state.mission?.agents?.find((candidate) => candidate.id === state.selectedAgentId) ?? state.mission?.agents?.[0];
      const needsDeployment = (agent?.deployment?.mode === 'chooseFromZone' || agent?.deployment?.mode === 'chooseFromZones') && !agent?.deployment?.selectedStart;
      if (scene?.setPlanningToolFromUi) scene.setPlanningToolFromUi(needsDeployment ? 'selectDeploymentCell' : 'placeWaypoint');
      else scene?.setThreeInteractionMode?.(needsDeployment ? 'selectDeployment' : 'placeWaypoint');
    }
  });
  const point = await cellCenter(page, x, y);
  await page.mouse.click(point.x, point.y);
}

export async function threeGridPoint(page, x, y) {
  await expect.poll(() => page.evaluate(({ x, y }) => {
    const point = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }, { x, y }), { timeout: 10000 }).toBe(true);
  return page.evaluate(({ x, y }) => window.ANCHOR_MISSION_RENDER_TEST_API.screenPointForGridCell(x, y), { x, y });
}

export async function threeGridGroundPoint(page, x, y) {
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

export async function threeObjectPoint(page, method, id) {
  await expect.poll(() => page.evaluate(({ method, id }) => {
    const point = window.ANCHOR_MISSION_RENDER_TEST_API?.[method]?.(id);
    return Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
  }, { method, id }), { timeout: 10000 }).toBe(true);
  return page.evaluate(({ method, id }) => window.ANCHOR_MISSION_RENDER_TEST_API[method](id), { method, id });
}

export async function clickThreeGridCell(page, x, y) {
  const point = await threeGridPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

export async function clickThreeObject(page, method, id) {
  const point = await threeObjectPoint(page, method, id);
  await page.mouse.click(point.x, point.y);
}

export async function clickThreeGridGroundCell(page, x, y) {
  const point = await threeGridGroundPoint(page, x, y);
  await page.mouse.click(point.x, point.y);
}

export async function dragThreeGridCell(page, fromX, fromY, toX, toY) {
  const from = await threeGridPoint(page, fromX, fromY);
  const to = await threeGridGroundPoint(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

export async function dragThreeObjectToGridCell(page, method, id, toX, toY, options = {}) {
  const from = await threeObjectPoint(page, method, id);
  const to = await threeGridGroundPoint(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  if (options.cancelWithEscape) await page.keyboard.press('Escape');
  await page.mouse.up();
}
export async function clickFlowDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('FlowFieldDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasX = map.x + ((Number(col) + 0.5) / 18) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / 12) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

export async function clickRoiDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('RoiGeneratorDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const width = scene.field.width;
    const height = scene.field.height;
    const canvasX = map.x + ((Number(col) + 0.5) / width) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / height) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

export async function clickCoupledDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('CoupledFieldsDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasX = map.x + ((Number(col) + 0.5) / 24) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / 16) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

export async function clickUncertaintyDemoCell(page, col, row) {
  const point = await page.evaluate(({ col, row }) => {
    const scene = window.anchorGame.phaser.scene.getScene('UncertaintyForecastDemoScene');
    const map = scene.layout().map;
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const width = scene.field.width;
    const height = scene.field.height;
    const canvasX = map.x + ((Number(col) + 0.5) / width) * map.width;
    const canvasY = map.y + ((Number(row) + 0.5) / height) * map.height;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { col, row });
  await page.mouse.click(point.x, point.y);
}

export async function clickFirstValidCell(page) {
  const cell = await page.evaluate(() => {
    const level = window.anchorGame.state.level;
    for (let y = 2; y < level.world.grid.height; y += 1) {
      for (let x = 2; x < level.world.grid.width; x += 1) {
        const base = (level.layers.bases ?? []).some((candidate) => Math.round(candidate.x) === x && Math.round(candidate.y) === y);
        if (!base && !level.layers.terrain?.[y]?.[x] && !level.layers.hazards?.[y]?.[x]) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  });
  await clickCell(page, cell.x, cell.y);
}

export async function dragCell(page, fromX, fromY, toX, toY) {
  const from = await cellCenter(page, fromX, fromY);
  const to = await cellCenter(page, toX, toY);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y);
  await page.mouse.up();
}

export async function expectWaypointCount(page, count) {
  await expect.poll(async () => page.evaluate(() => (
    window.anchorGame.state.plan?.agentPlans?.reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length || 0), 0) ?? 0
  ))).toBe(count);
}

export async function expectDebugWaypointSynchronization(page, count) {
  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    return {
      canonical: debug.canonicalWaypointCount,
      three: debug.threeWaypointCount,
      timeline: debug.timelineWaypointCount,
      rightPanel: debug.rightPanelWaypointCount,
      mismatch: debug.waypointCountMismatch
    };
  })).toEqual({ canonical: count, three: count, timeline: count, rightPanel: count, mismatch: false });
}

export async function expectTopHudTooltips(page) {
  await expect(page.evaluate(() => {
    const chips = [...document.querySelectorAll('#mission-summary-hud .top-hud-chip')];
    return {
      chipCount: chips.length,
      allHaveTitles: chips.every((chip) => chip.getAttribute('title')?.trim()),
      allHaveAriaLabels: chips.every((chip) => chip.getAttribute('aria-label')?.trim()),
      titles: chips.map((chip) => chip.getAttribute('title'))
    };
  })).resolves.toMatchObject({
    allHaveTitles: true,
    allHaveAriaLabels: true
  });
}

export async function expectMarkerHoverAndPlacement(page, x, y) {
  await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    if (window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d') scene.setThreeInteractionMode?.('placeMarker');
    else if (window.anchorGame.state.ui.placementMode !== 'marker') scene.togglePlacementMode();
  });
  const point = await cellCenter(page, x, y);
  await page.mouse.move(point.x, point.y);
  const usingThree = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend === 'threeMission3d');
  if (usingThree) {
    await expect.poll(() => page.evaluate(() => {
      const cell = window.ANCHOR_MISSION_RENDER_DEBUG?.hoveredGridCell;
      return cell ? { x: cell.x, y: cell.y } : null;
    })).toEqual({ x, y });
  } else {
    await expect(page.locator('#map-hover-tooltip')).toContainText(`Cell (${x}, ${y})`);
    await expectTooltipNearPointer(page, point);
    await expect(page.evaluate(() => window.anchorGame.state.ui.hoverCell)).resolves.toEqual({ x, y });
  }
  await page.mouse.click(point.x, point.y);
  await expect(page.evaluate(() => {
    const marker = window.anchorGame.state.plan.planningMarkers?.at(-1);
    return marker ? { x: marker.x, y: marker.y } : null;
  })).resolves.toEqual({ x, y });
}

export async function expectTooltipNearPointer(page, point) {
  await expect(page.evaluate(({ point }) => {
    const rect = document.getElementById('map-hover-tooltip')?.getBoundingClientRect();
    if (!rect) return { exists: false };
    const horizontalGap = point.x <= rect.left
      ? rect.left - point.x
      : point.x - rect.right;
    const verticalGap = point.y <= rect.top
      ? rect.top - point.y
      : point.y - rect.bottom;
    return {
      exists: true,
      insideViewport: rect.left >= 0
        && rect.top >= 0
        && rect.right <= window.innerWidth
        && rect.bottom <= window.innerHeight,
      closeHorizontally: horizontalGap <= 24,
      closeVertically: verticalGap <= 24,
      notFarRight: rect.left - point.x < 80,
      notFarBelow: rect.top - point.y < 80
    };
  }, { point })).resolves.toEqual({
    exists: true,
    insideViewport: true,
    closeHorizontally: true,
    closeVertically: true,
    notFarRight: true,
    notFarBelow: true
  });
}

export async function validMarkerCellsNear(page, origin, count = 2) {
  return page.evaluate(({ origin, count }) => {
    const level = window.anchorGame.state.level;
    const cells = [];
    for (let radius = 1; radius < Math.max(level.world.grid.width, level.world.grid.height); radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const x = origin.x + dx;
          const y = origin.y + dy;
          if (x < 0 || y < 0 || x >= level.world.grid.width || y >= level.world.grid.height) continue;
          if (level.layers.terrain?.[y]?.[x]) continue;
          if (cells.some((cell) => cell.x === x && cell.y === y)) continue;
          cells.push({ x, y });
          if (cells.length >= count) return cells;
        }
      }
    }
    return cells;
  }, { origin, count });
}

export async function expectCenterShellContained(page) {
  await expect(page.evaluate(() => {
    const left = document.getElementById('mission-console').getBoundingClientRect();
    const center = document.getElementById('game-root').getBoundingClientRect();
    const right = document.getElementById('waypoint-timeline').getBoundingClientRect();
    const canvas = document.querySelector('#game-root canvas').getBoundingClientRect();
    return {
      centerAfterLeft: center.left >= left.right - 1,
      centerBeforeRight: center.right <= right.left + 1,
      canvasInsideCenter: canvas.left >= center.left - 1
        && canvas.right <= center.right + 1
        && canvas.top >= center.top - 1
        && canvas.bottom <= center.bottom + 1,
      canvasFillsCenter: Math.abs(canvas.width - center.width) <= 1
        && Math.abs(canvas.height - center.height) <= 1,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1
    };
  })).resolves.toEqual({
    centerAfterLeft: true,
    centerBeforeRight: true,
    canvasInsideCenter: true,
    canvasFillsCenter: true,
    noHorizontalOverflow: true
  });
}

export async function expectCenterPanelUsesAvailableSpace(page) {
  await expect(page.evaluate(() => {
    const center = document.getElementById('game-root').getBoundingClientRect();
    const panel = document.querySelector('#modal-root .center-panel')?.getBoundingClientRect();
    return {
      exists: Boolean(panel),
      usesCenterWidth: panel ? panel.width >= center.width * 0.82 : false,
      contained: panel ? panel.left >= center.left - 1 && panel.right <= center.right + 1 : false
    };
  })).resolves.toEqual({
    exists: true,
    usesCenterWidth: true,
    contained: true
  });
}

export async function expectSamplingSectionsCollapsed(page, titles) {
  await expect.poll(() => page.evaluate((expectedTitles) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')];
    return expectedTitles.every((title) => {
      const header = headers.find((entry) => entry.textContent.replace(/\s+/g, ' ').trim().includes(title));
      return header?.getAttribute('aria-expanded') === 'false';
    });
  }, titles)).toBe(true);
}

export async function openMainMenuHubSection(page, view) {
  await waitForAnchorRoute(page, 'main-menu');
  await expect(page.locator('#main-menu-hub')).toBeVisible();
  await page.locator(`#main-menu-hub [data-hub-view="${view}"]`).first().click();
  await expect(page.locator(`#main-menu-hub[data-hub-view="${view}"]`)).toBeVisible();
}

export async function launchFromMainMenuHub(page, view, action) {
  await openMainMenuHubSection(page, view);
  await page.locator(`#main-menu-hub [data-action="${action}"]`).first().click();
}
export async function expandMissionConsoleSection(page, title) {
  await expect(page.locator('#mission-console .accordion-header').filter({ hasText: title }).first()).toBeVisible();
  await page.evaluate((sectionTitle) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')]
      .filter((header) => header.textContent.replace(/\s+/g, ' ').trim().includes(sectionTitle));
    for (const header of headers) {
      if (header.getAttribute('aria-expanded') !== 'true') header.click();
    }
  }, title);
  await expect.poll(() => page.evaluate((sectionTitle) => {
    const headers = [...document.querySelectorAll('#mission-console .accordion-header')]
      .filter((header) => header.textContent.replace(/\s+/g, ' ').trim().includes(sectionTitle));
    return headers.length > 0 && headers.every((header) => header.getAttribute('aria-expanded') === 'true');
  }, title)).toBe(true);
}

export async function expandMissionConsoleSections(page, titles) {
  for (const title of titles) {
    await expandMissionConsoleSection(page, title);
  }
}

export async function clickRightPanelMode(page, mode) {
  await page.evaluate((nextMode) => {
    document.querySelector(`#waypoint-timeline [data-roi-panel-mode="${nextMode}"]`)?.click();
  }, mode);
}

export async function installWaterColumnE2eConfig(page) {
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    state.level.world.waterColumnConfig = {
      enabled: true,
      depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'],
      defaultLayerIds: ['surface', 'thermocline', 'deep'],
      divediveProfileId: 'sawtoothProfile'
    };
    state.ui ??= {};
    state.ui.waterColumn = {
      ...(state.ui.waterColumn ?? {}),
      verticalDisplayMode: 'physicalDepth',
      activeDepthLayerId: 'thermocline',
      selectedDivediveProfileId: 'sawtoothProfile',
      selectedTargetDepthLayerId: 'thermocline',
      selectedScalarFieldId: 'sampleValue',
      currentDisplayMode: 'activeLayerOnly',
      globalOpacity: 0.28
    };
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.refreshPanels();
    scene.refreshMap();
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.canonicalLayerCount), { timeout: 15000 }).toBe(4);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeDepthLayerId), { timeout: 15000 }).toBe('thermocline');
}
export async function startTutorialPlanning(page) {
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false)).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MainMenuScene').startCampaignLevel('tutorial_01_first_deployment'));
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await startPlanningFromBriefing(page);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
}

export async function planVisibleThreeTutorialRoute(page, { includeSecondAgent = false } = {}) {
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.rendererReady === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="three-camera"][data-preset="tacticalTopDown"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.cameraPresetId)).toBe('tacticalTopDown');
  const agentIds = await page.evaluate(() => (window.anchorGame.state.mission?.agents ?? []).map((agent) => agent.id));
  expect(agentIds.length).toBeGreaterThan(0);

  await clickThreeObject(page, 'screenPointForAgent', agentIds[0]);
  await deployAgentThroughVisibleThreeControls(page, agentIds[0]);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  for (const cell of [{ x: 5, y: 2 }, { x: 5, y: 3 }, { x: 6, y: 2 }]) {
    await clickThreeGridCell(page, cell.x, cell.y);
  }

  if (includeSecondAgent && agentIds.length > 1) {
    await clickThreeObject(page, 'screenPointForAgent', agentIds[1]);
    await deployAgentThroughVisibleThreeControls(page, agentIds[1]);
    const waypoint = await firstPlaceableWaypointCell(page, agentIds[1]);
    await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
    await clickThreeGridCell(page, waypoint.x, waypoint.y);
  }
}

export async function deployAgentThroughVisibleThreeControls(page, agentId) {
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

export async function deploymentCellForAgent(page, agentId) {
  return page.evaluate((id) => {
    const state = window.anchorGame.state;
    const agent = state.mission?.agents?.find((candidate) => candidate.id === id);
    const zones = state.level?.zones ?? [];
    const zone = zones.find((candidate) => candidate.id === agent?.deployment?.zoneId)
      ?? zones.find((candidate) => candidate.type === 'deployment');
    const cell = zone?.cells?.[0];
    if (!cell) throw new Error(`No deployment cell found for ${id}`);
    return { x: cell.x, y: cell.y };
  }, agentId);
}

export async function firstPlaceableWaypointCell(page, agentId) {
  return page.evaluate(async (id) => {
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');
    const width = window.anchorGame.state.level?.world?.grid?.width ?? 0;
    const height = window.anchorGame.state.level?.world?.grid?.height ?? 0;
    for (let y = 1; y < height; y += 1) {
      for (let x = 1; x < width; x += 1) {
        const placement = canPlaceWaypoint(window.anchorGame.state, id, { x, y, action: 'sample' });
        if (placement.allowed === true) return { x, y };
      }
    }
    throw new Error(`No placeable waypoint cell found for ${id}`);
  }, agentId);
}

export async function canonicalSimulationState(page) {
  return page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const debug = window.ANCHOR_EXECUTION_DEBUG ?? {};
    const renderDebug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    const agents = scene?.engine?.agents ?? [];
    const positions = agents.map((agent) => ({ id: agent.id, x: Number(agent.x), y: Number(agent.y), energy: Number(agent.energy ?? agent.battery ?? 0) }));
    const initial = debug.initialAgentPositions ?? positions;
    return {
      stepCount: debug.engineStepCount ?? scene?.engine?.stepCount ?? 0,
      timeSeconds: Number(debug.simulationTimeSeconds ?? scene?.engine?.t ?? 0),
      firstStepCompleted: debug.firstStepCompleted === true,
      trajectoryPointCount: debug.canonicalTrajectoryPointCount ?? positions.length,
      threeTrajectoryPointCount: debug.threeTrajectoryPointCount ?? renderDebug.realizedTrajectoryPointCount ?? 0,
      plannedRouteCount: renderDebug.plannedRouteCount ?? 0,
      observationCount: debug.canonicalObservationCount ?? 0,
      threeObservationCount: debug.threeObservationCount ?? renderDebug.observationCount ?? 0,
      energyTotal: positions.reduce((sum, agent) => sum + agent.energy, 0),
      positions,
      anyAgentMoved: positions.some((agent, index) => {
        const before = initial[index];
        return before && (Math.abs(Number(agent.x) - Number(before.x)) > 1e-6 || Math.abs(Number(agent.y) - Number(before.y)) > 1e-6);
      }),
      failureReason: debug.failureReason ?? scene?.engine?.abortReason ?? null
    };
  });
}

export async function runDeterministicTutorialToResult(page, { legacy = false } = {}) {
  await page.goto(legacy ? '/?legacyPhaser=1' : '/');
  await startTutorialPlanning(page);
  if (legacy) {
    await expect(page.locator('#mission-console [data-action="renderer-legacy"]')).toBeVisible();
    await page.locator('#mission-console [data-action="renderer-legacy"]').click();
    await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.activeBackend)).toBe('legacyPhaser2d');
  }
  const agentId = await page.evaluate(() => window.anchorGame.state.mission?.agents?.[0]?.id);
  const deploymentCell = await deploymentCellForAgent(page, agentId);
  await page.evaluate(({ deploymentCell }) => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene.trySelectDeploymentStart(deploymentCell);
    scene.addWaypointForSelected({ x: 5, y: 2, action: 'sample' });
    scene.addWaypointForSelected({ x: 5, y: 3, action: 'sample' });
    scene.executePlan({ source: 'renderer-parity-e2e' });
  }, { deploymentCell });
  await expectWaypointCount(page, 2);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_EXECUTION_DEBUG?.engineInitialized === true && window.ANCHOR_EXECUTION_DEBUG?.planDigestMatch === true), { timeout: 15000 }).toBe(true);
  if (!legacy) {
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.activeBackend)).toBe('threeMission3d');
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  }
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  return page.evaluate(async () => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const result = window.anchorGame.state.result;
    const events = (scene.engine?.events ?? []).map((event) => ({
      type: event.type,
      agentId: event.agentId ?? null,
      x: Number.isFinite(Number(event.x)) ? Number(Number(event.x).toFixed(6)) : null,
      y: Number.isFinite(Number(event.y)) ? Number(Number(event.y).toFixed(6)) : null,
      t: Number.isFinite(Number(event.t ?? event.timeSeconds)) ? Number(Number(event.t ?? event.timeSeconds).toFixed(6)) : null,
      status: event.status ?? null,
      value: Number.isFinite(Number(event.value)) ? Number(Number(event.value).toFixed(6)) : null
    }));
    return {
      levelId: window.anchorGame.state.level?.levelId ?? window.anchorGame.state.level?.id ?? null,
      missionId: window.anchorGame.state.mission?.missionId ?? window.anchorGame.state.mission?.id ?? null,
      seed: window.anchorGame.state.level?.meta?.seed ?? window.anchorGame.state.mission?.rules?.stochasticSeed ?? null,
      planDigest: window.ANCHOR_EXECUTION_DEBUG?.enginePlanDigest ?? window.ANCHOR_EXECUTION_DEBUG?.launchPlanDigest ?? null,
      terminalReason: result?.summary?.stopReason?.code ?? result?.summary?.terminalReason ?? null,
      elapsedTime: result?.summary?.elapsedTime ?? scene.engine?.t ?? null,
      finalPositions: (scene.engine?.agents ?? []).map((agent) => ({
        agentId: agent.id,
        x: Number(Number(agent.x).toFixed(6)),
        y: Number(Number(agent.y).toFixed(6)),
        energy: Number(Number(agent.energy ?? agent.battery ?? 0).toFixed(6)),
        status: agent.status ?? null
      })),
      trajectories: (scene.engine?.agents ?? []).map((agent) => ({
        agentId: agent.id,
        points: (agent.history ?? []).map((point) => ({
          x: Number(Number(point.x).toFixed(6)),
          y: Number(Number(point.y).toFixed(6)),
          t: Number(Number(point.t ?? point.timeSeconds ?? 0).toFixed(6))
        }))
      })),
      waypointStatus: (scene.engine?.agents ?? []).map((agent) => ({
        agentId: agent.id,
        completed: agent.completedWaypoints ?? [],
        missed: agent.missedWaypoints ?? []
      })),
      observations: events.filter((event) => ['sample', 'duplicateSample', 'probabilityOutcome'].includes(event.type)),
      samples: result?.summary?.sampledCells ?? null,
      energy: result?.summary?.energyUsed ?? null,
      hazards: result?.summary?.hazardsHit ?? null,
      goldStars: result?.summary?.priorityTargets?.captured ?? null,
      events,
      score: result?.summary?.finalScore ?? null,
      result: result?.summary ?? null
    };
  });
}
export async function startPlanningFromBriefing(page) {
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene').sys.isActive())).toBe(true);
}

export async function downloadDemoArtifact(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#mission-console [data-action="export-demo-json"]').click()
  ]);
  const path = await download.path();
  const text = await fs.readFile(path, 'utf8');
  return {
    filename: download.suggestedFilename(),
    data: JSON.parse(text)
  };
}

export async function clickCanvasPoint(page, canvasX, canvasY) {
  const point = await canvasPoint(page, canvasX, canvasY);
  await page.mouse.click(point.x, point.y);
}

export async function canvasPoint(page, canvasX, canvasY) {
  return page.evaluate(({ canvasX, canvasY }) => {
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { canvasX, canvasY });
}

export async function cellCenter(page, x, y) {
  return page.evaluate(({ x, y }) => {
    const threePoint = window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForGridCell?.(x, y);
    if (threePoint && Number.isFinite(threePoint.x) && Number.isFinite(threePoint.y)) return { x: threePoint.x, y: threePoint.y };
    const canvas = document.getElementById('game-canvas');
    const rect = canvas.getBoundingClientRect();
    const layout = window.anchorGame.adapter.layout;
    if (!layout) throw new Error('No Phaser map layout or Three projection API is available for cellCenter.');
    const canvasX = layout.ox + (x + 0.5) * layout.cell;
    const canvasY = layout.oy + (y + 0.5) * layout.cell;
    return {
      x: rect.left + canvasX * rect.width / canvas.width,
      y: rect.top + canvasY * rect.height / canvas.height
    };
  }, { x, y });
}

export async function totalWaypointCount(page) {
  return page.evaluate(() => (window.anchorGame.state.plan?.agentPlans ?? []).reduce((sum, plan) => sum + (plan.waypoints?.length ?? 0), 0));
}
