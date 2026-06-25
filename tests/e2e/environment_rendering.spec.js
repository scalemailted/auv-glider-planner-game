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

test('Three Simulation Uses Incremental Presentation Updates', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await page.locator('[data-action="sim-play"]').click();
  await expect.poll(() => page.evaluate(() => {
    const debug = window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {};
    return Number(debug.engineStepCount ?? 0) > 0 && Number(debug.presentationFrameCount ?? 0) > 0 && Number(debug.realizedTrajectoryPointCount ?? 0) > 0;
  }), { timeout: 25000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  const beforeCamera = await page.evaluate(() => ({
    debug: window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {},
    perf: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {}
  }));
  expect(beforeCamera.debug.engineStepCount).toBeGreaterThan(0);
  expect(beforeCamera.debug.presentationFrameCount).toBeGreaterThan(0);
  expect(beforeCamera.debug.presentationRequestCount).toBeGreaterThanOrEqual(beforeCamera.debug.presentationFrameCount);
  expect(beforeCamera.debug.rendererSummary?.trajectoryAppendCount ?? 0).toBeGreaterThan(0);
  expect(beforeCamera.debug.rendererSummary?.trajectoryFullRebuildCount ?? 0).toBe(0);
  expect(beforeCamera.debug.rendererSummary?.performanceCounters?.routeGeometryUpdate ?? 0).toBe(0);
  expect(beforeCamera.debug.rendererSummary?.performanceCounters?.bathymetryUpdate ?? 0).toBe(0);
  expect(beforeCamera.debug.rendererSummary?.performanceCounters?.waterColumnUpdate ?? 0).toBe(0);
  expect(beforeCamera.debug.hudRenderCount + beforeCamera.debug.rightPanelRenderCount).toBeGreaterThan(0);
  expect(beforeCamera.perf.activeRendererCount).toBe(1);
  expect(beforeCamera.perf.activeRafCount).toBe(1);

  const point = await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.screenPointForAgent?.() ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 80, point.y + 30, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);
  const afterCamera = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {});
  expect(afterCamera.engineStepCount).toBe(beforeCamera.debug.engineStepCount);
  expect(afterCamera.rendererSummary?.performanceCounters?.routeGeometryUpdate ?? 0).toBe(beforeCamera.debug.rendererSummary?.performanceCounters?.routeGeometryUpdate ?? 0);
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame.state.result)), { timeout: 30000 }).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Finish Instantly Avoids Per-Step Three Rebuilds', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.state.result && window.ANCHOR_EXECUTION_DEBUG?.resultBuildCount === 1), { timeout: 30000 }).toBe(true);
  const debug = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG ?? {});
  expect(debug.engineStepCount).toBeGreaterThan(0);
  expect(debug.finishChunkCount).toBeGreaterThan(0);
  expect(debug.finishPresentationUpdateCount).toBeLessThanOrEqual(debug.finishChunkCount + 1);
  expect(debug.presentationFrameCount).toBeLessThanOrEqual(debug.finishChunkCount + 5);
  expect(debug.rendererSummary?.performanceCounters?.rendererUpdate ?? 0).toBeLessThanOrEqual(debug.finishChunkCount + 6);
  expect(debug.resultBuildCount).toBe(1);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Quality Profiles Preserve Canonical Simulation Result', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'thermocline', cycles: 1 });
  const digests = await page.evaluate(async () => {
    const { SimulationEngine } = await import('./src/core/sim/SimulationEngine.js');
    const clone = (value) => JSON.parse(JSON.stringify(value));
    const base = {
      level: clone(window.anchorGame.state.level),
      mission: clone(window.anchorGame.state.mission),
      plan: clone(window.anchorGame.state.plan)
    };
    const run = (quality) => {
      const engine = new SimulationEngine({ level: clone(base.level), mission: clone(base.mission), plan: clone(base.plan), time: 0 });
      const dt = Number(base.level?.world?.time?.dt ?? 0.25) || 0.25;
      let guard = 0;
      while (!engine.complete && !engine.aborted && guard < 1000) {
        engine.step(dt, { force: true });
        guard += 1;
      }
      const result = engine.buildResult?.() ?? { summary: engine.getSummary?.(), events: engine.events ?? [], trajectories: engine.agents?.map((agent) => ({ agentId: agent.id, history: agent.history ?? [] })) ?? [] };
      const summary = result.summary ?? {};
      return {
        quality,
        complete: engine.complete === true,
        aborted: engine.aborted === true,
        finalScore: Number(summary.finalScore ?? summary.score ?? 0).toFixed(6),
        elapsedTime: Number(summary.elapsedTime ?? engine.t ?? 0).toFixed(6),
        eventCount: result.events?.length ?? 0,
        trajectoryDigest: JSON.stringify((result.trajectories ?? []).map((trajectory) => ({ agentId: trajectory.agentId, count: trajectory.history?.length ?? 0, last: trajectory.history?.at?.(-1) ?? null })))
      };
    };
    return ['performance', 'balanced', 'high'].map(run);
  });
  const baseline = { ...digests[0], quality: 'baseline' };
  for (const digest of digests.slice(1)) expect({ ...digest, quality: 'baseline' }).toEqual(baseline);
  const presentation = await page.evaluate(async () => {
    const { effectiveThreePixelRatio, renderCostPolicySummary, threeQualityProfileSettings } = await import('./src/game/three/ThreeRenderCostPolicy.js');
    return ['performance', 'balanced', 'high'].map((qualityProfile) => ({
      qualityProfile,
      pixelRatio: effectiveThreePixelRatio({ devicePixelRatio: 2, qualityProfile }),
      currentVectorStride: threeQualityProfileSettings(qualityProfile).currentVectorStride,
      policy: renderCostPolicySummary({ displaySettings: { waterColumn: { qualityProfile, fieldDisplayMode: 'activeLayerOnly' } } })
    }));
  });
  expect(presentation.map((row) => row.pixelRatio)).toEqual([1, 1.25, 2]);
  expect(presentation.map((row) => row.currentVectorStride)).toEqual([3, 2, 1]);
  expect(presentation.every((row) => row.policy.ownsSimulationState === false && row.policy.changesOfficialBrowserScoring === false)).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Context Slabs Reduce Cost Without Losing Dive Context', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await page.locator('#mission-console [data-action="three-quality-profile"][data-profile="balanced"]').click();
  await page.locator('#mission-console [data-action="three-camera"][data-preset="sideProfile"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0)).toBe(1);
  const before = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    activeTexturedSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    visibleLayerCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.visibleLayerCount ?? 0,
    allLayerFieldTexturesEnabled: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.allLayerFieldTexturesEnabled === true,
    predictedDiveObjectCount: window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0
  }));
  expect(before.activeTexturedSlabCount).toBe(1);
  expect(before.contextOutlineSlabCount).toBe(Math.max(0, before.visibleLayerCount - 1));
  expect(before.slabTextureCount).toBe(1);
  expect(before.allLayerFieldTexturesEnabled).toBe(false);
  expect(before.predictedDiveObjectCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="water-column-field-display-mode"][data-mode="allLayers"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.allLayerFieldTexturesEnabled === true)).toBe(true);
  const allLayers = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    visibleLayerCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.visibleLayerCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0
  }));
  expect(allLayers.planDigest).toBe(before.planDigest);
  expect(allLayers.slabTextureCount).toBe(allLayers.visibleLayerCount);
  expect(allLayers.contextOutlineSlabCount).toBe(0);

  await page.locator('#mission-console [data-action="water-column-field-display-mode"][data-mode="activeLayerOnly"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.allLayerFieldTexturesEnabled === false)).toBe(true);
  const after = await page.evaluate(() => ({
    planDigest: JSON.stringify(window.anchorGame.state.plan),
    activeTexturedSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0,
    slabTextureCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.slabTextureCount ?? 0,
    visibleLayerCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.visibleLayerCount ?? 0
  }));
  expect(after.planDigest).toBe(before.planDigest);
  expect(after.activeTexturedSlabCount).toBe(1);
  expect(after.contextOutlineSlabCount).toBe(Math.max(0, after.visibleLayerCount - 1));
  expect(after.slabTextureCount).toBe(1);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Mission Uses Continuous Bathymetric Terrain', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  await expect.poll(() => page.evaluate(() => (window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.terrainVertexCount ?? 0) > 0), { timeout: 15000 }).toBe(true);
  const terrain = await page.evaluate(() => {
    const summary = window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? {};
    const terrainSummary = summary.bathymetryTerrainSummary ?? {};
    const landmassSummary = summary.landmassSummary ?? {};
    const coastlineSummary = summary.coastlineSummary ?? {};
    const contourSummary = summary.bathymetryContourSummary ?? {};
    return {
      terrainVertexCount: summary.terrainVertexCount ?? 0,
      terrainTriangleCount: summary.terrainTriangleCount ?? 0,
      terrainDrawCallEstimate: summary.terrainDrawCallEstimate ?? 0,
      terrainSourceDigest: summary.terrainSourceDigest ?? null,
      canonicalMeshAlignmentStatus: summary.canonicalMeshAlignmentStatus ?? null,
      rendererOwnsBathymetry: summary.rendererOwnsBathymetry,
      usesVisualMeshForPhysics: summary.usesVisualMeshForPhysics,
      terrainObjectCount: terrainSummary.terrainObjectCount ?? 0,
      terrainBuildCount: terrainSummary.terrainBuildCount ?? 0,
      indexedGeometry: terrainSummary.indexedGeometry === true,
      terrainLayerOwnsCollision: terrainSummary.ownsCollision === true,
      terrainLayerOwnsDiveFeasibility: terrainSummary.ownsDiveFeasibility === true,
      landVertexCount: landmassSummary.landVertexCount ?? 0,
      coastlineSegmentCount: coastlineSummary.coastlineSegmentCount ?? 0,
      contourSegmentCount: contourSummary.contourSegmentCount ?? 0,
      contourLevelsMeters: contourSummary.contourLevelsMeters ?? []
    };
  });
  expect(terrain.terrainVertexCount).toBeGreaterThan(0);
  expect(terrain.terrainTriangleCount).toBeGreaterThan(0);
  expect(terrain.terrainDrawCallEstimate).toBeLessThanOrEqual(4);
  expect(terrain.terrainObjectCount).toBeLessThanOrEqual(2);
  expect(terrain.terrainBuildCount).toBe(1);
  expect(terrain.indexedGeometry).toBe(true);
  expect(terrain.terrainSourceDigest).toBeTruthy();
  expect(terrain.canonicalMeshAlignmentStatus).toBe('PASS');
  expect(terrain.rendererOwnsBathymetry).toBe(false);
  expect(terrain.usesVisualMeshForPhysics).toBe(false);
  expect(terrain.terrainLayerOwnsCollision).toBe(false);
  expect(terrain.terrainLayerOwnsDiveFeasibility).toBe(false);
  expect(terrain.landVertexCount).toBeGreaterThan(0);
  expect(terrain.coastlineSegmentCount).toBeGreaterThan(0);
  expect(terrain.contourSegmentCount).toBeGreaterThan(0);
  expect(terrain.contourLevelsMeters.length).toBeGreaterThan(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Terrain Camera Gestures Do Not Rebuild Bathymetry Mesh', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'thermoclineDive', layer: 'thermocline', cycles: 2 });
  await expect.poll(() => page.evaluate(() => (window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.bathymetryTerrainSummary?.terrainBuildCount ?? 0) > 0), { timeout: 15000 }).toBe(true);
  const before = await page.evaluate(() => {
    const summary = window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? {};
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      terrainBuildCount: summary.bathymetryTerrainSummary?.terrainBuildCount ?? 0,
      landBuildCount: summary.landmassSummary?.landBuildCount ?? 0,
      coastlineBuildCount: summary.coastlineSummary?.coastlineBuildCount ?? 0,
      contourBuildCount: summary.bathymetryContourSummary?.contourBuildCount ?? 0,
      terrainSourceDigest: summary.terrainSourceDigest ?? null,
      terrainVertexCount: summary.terrainVertexCount ?? 0,
      terrainTriangleCount: summary.terrainTriangleCount ?? 0,
      cameraOrbitChangeCount: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraOrbitChangeCount ?? 0,
      cameraZoomChangeCount: window.ANCHOR_MISSION_RENDER_DEBUG?.cameraZoomChangeCount ?? 0
    };
  });
  const point = await threeGridPoint(page, 4, 3);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 150, point.y + 60, { steps: 12 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate((snapshot) => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    return (debug.cameraOrbitChangeCount ?? 0) > snapshot.cameraOrbitChangeCount || (debug.cameraZoomChangeCount ?? 0) > snapshot.cameraZoomChangeCount;
  }, before), { timeout: 10000 }).toBe(true);
  const after = await page.evaluate(() => {
    const summary = window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary ?? {};
    return {
      planDigest: JSON.stringify(window.anchorGame.state.plan),
      terrainBuildCount: summary.bathymetryTerrainSummary?.terrainBuildCount ?? 0,
      landBuildCount: summary.landmassSummary?.landBuildCount ?? 0,
      coastlineBuildCount: summary.coastlineSummary?.coastlineBuildCount ?? 0,
      contourBuildCount: summary.bathymetryContourSummary?.contourBuildCount ?? 0,
      terrainSourceDigest: summary.terrainSourceDigest ?? null,
      terrainVertexCount: summary.terrainVertexCount ?? 0,
      terrainTriangleCount: summary.terrainTriangleCount ?? 0
    };
  });
  expect(after.planDigest).toBe(before.planDigest);
  expect(after.terrainBuildCount).toBe(before.terrainBuildCount);
  expect(after.landBuildCount).toBe(before.landBuildCount);
  expect(after.coastlineBuildCount).toBe(before.coastlineBuildCount);
  expect(after.contourBuildCount).toBe(before.contourBuildCount);
  expect(after.terrainSourceDigest).toBe(before.terrainSourceDigest);
  expect(after.terrainVertexCount).toBe(before.terrainVertexCount);
  expect(after.terrainTriangleCount).toBe(before.terrainTriangleCount);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Bathymetry Limits Predicted and Realized Dive Depth', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  const predicted = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const segments = scene?.missionRenderViewModel?.plannedDiveSegments ?? [];
    const points = segments.flatMap((segment) => segment.predictedDivePath ?? []);
    const clearances = points.map((point) => Number(point.clearanceMeters)).filter(Number.isFinite);
    return {
      segmentCount: segments.length,
      pointCount: points.length,
      minimumClearance: Math.min(...clearances),
      terrainLimited: segments.some((segment) => segment.bottomClearance?.terrainLimited === true || segment.warningCodes?.includes?.('TERRAIN_LIMITED')),
      rendererOwnsDiveFeasibility: window.ANCHOR_MISSION_RENDER_DEBUG?.rendererSummary?.bathymetryTerrainSummary?.ownsDiveFeasibility === true,
      validationSource: window.ANCHOR_MISSION_RENDER_DEBUG?.lastSamplingTargetValidationSource ?? null
    };
  });
  expect(predicted.segmentCount).toBeGreaterThan(0);
  expect(predicted.pointCount).toBeGreaterThan(0);
  expect(predicted.minimumClearance).toBeGreaterThanOrEqual(4.999);
  expect(predicted.terrainLimited).toBe(true);
  expect(predicted.rendererOwnsDiveFeasibility).toBe(false);
  expect(predicted.validationSource).toBe('canonicalBottomBoundary');

  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await advanceSimulationSceneForRenderCost(page, { steps: 8, frameDelay: 30, keepRunning: false });
  const realized = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const grid = scene?.simulationRenderViewModel?.bottomBoundary?.bottomDepthField ?? [];
    const points = (scene?.engine?.agents ?? []).flatMap((agent) => agent.history ?? []);
    const canonicalClearances = points.map((point) => Number(point.bottomClearanceMeters)).filter(Number.isFinite);
    const visualClearances = points.map((point) => {
      const bottom = sample(grid, Number(point.x ?? point.col ?? 0), Number(point.y ?? point.row ?? 0));
      const depth = Number(point.depthMeters ?? point.position?.depthMeters);
      if (!Number.isFinite(depth)) return null;
      return Number.isFinite(bottom) ? bottom - depth : null;
    }).filter(Number.isFinite);
    return {
      pointCount: points.length,
      minimumClearance: canonicalClearances.length ? Math.min(...canonicalClearances) : null,
      visualMinimumClearance: visualClearances.length ? Math.min(...visualClearances) : null,
      usesSharedTerrainLayer: window.ANCHOR_SIMULATION_RENDER_DEBUG?.usesSharedTerrainLayer === true,
      usesMeshRaycastForValidity: window.ANCHOR_SIMULATION_RENDER_DEBUG?.usesMeshRaycastForValidity === true,
      terrainGeometryUpdateCountDuringSimulation: window.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary?.terrainGeometryUpdateCountDuringSimulation ?? 0
    };
    function sample(grid, x, y) {
      const height = grid.length;
      const width = grid[0]?.length ?? 0;
      if (!height || !width) return null;
      const bx = Math.max(0, Math.min(width - 1, x));
      const by = Math.max(0, Math.min(height - 1, y));
      const x0 = Math.floor(bx);
      const y0 = Math.floor(by);
      const x1 = Math.min(width - 1, x0 + 1);
      const y1 = Math.min(height - 1, y0 + 1);
      const tx = bx - x0;
      const ty = by - y0;
      const a = Number(grid[y0]?.[x0] ?? 0);
      const b = Number(grid[y0]?.[x1] ?? 0);
      const c = Number(grid[y1]?.[x0] ?? 0);
      const d = Number(grid[y1]?.[x1] ?? 0);
      return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    }
  });
  expect(realized.pointCount).toBeGreaterThan(0);
  expect(realized.minimumClearance).toBeGreaterThanOrEqual(-0.001);
  expect(realized.usesSharedTerrainLayer).toBe(true);
  expect(realized.usesMeshRaycastForValidity).toBe(false);
  expect(realized.terrainGeometryUpdateCountDuringSimulation).toBe(0);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Continuous Coastline Blocks Invalid Surface Waypoints', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  const agentId = await selectFirstAgentThroughVisibleControls(page);
  await deploySelectedGliderThroughVisibleControls(page, agentId);
  const beforeCount = await page.evaluate((id) => (window.anchorGame.state.plan?.agentPlans ?? []).find((plan) => plan.agentId === id)?.waypoints?.length ?? 0, agentId);
  const invalid = await findHardInvalidWaypointCell(page);
  await page.locator('#mission-console [data-action="mission-planning-tool"][data-tool="placeWaypoint"]').click();
  await clickThreeGridCell(page, invalid.x, invalid.y);
  await page.waitForTimeout(250);
  const after = await page.evaluate((id) => {
    const debug = window.ANCHOR_MISSION_RENDER_DEBUG ?? {};
    return {
      count: (window.anchorGame.state.plan?.agentPlans ?? []).find((plan) => plan.agentId === id)?.waypoints?.length ?? 0,
      waypointCandidateValid: debug.waypointCandidateValid,
      waypointValidationReason: debug.waypointValidationReason ?? debug.lastWaypointPipelineReason ?? null,
      lastWaypointTerrainValidationSource: debug.lastWaypointTerrainValidationSource,
      usesMeshRaycastForValidity: debug.usesMeshRaycastForValidity === true,
      usesSharedTerrainLayer: debug.usesSharedTerrainLayer === true
    };
  }, agentId);
  expect(after.count).toBe(beforeCount);
  expect(after.waypointCandidateValid).toBe(false);
  expect(after.waypointValidationReason).toMatch(/water|terrain|land|deployment|blocked/i);
  expect(after.lastWaypointTerrainValidationSource).toBeTruthy();
  expect(after.usesMeshRaycastForValidity).toBe(false);
  expect(after.usesSharedTerrainLayer).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Water-Column Layers Respect Continuous Seabed', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  const masks = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    const vm = scene?.missionRenderViewModel ?? {};
    const layers = vm.depthLayers ?? [];
    const bottom = vm.bottomBoundary ?? {};
    const findCell = (predicate) => {
      const height = bottom.bottomDepthField?.length ?? 0;
      const width = bottom.bottomDepthField?.[0]?.length ?? 0;
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (predicate(x, y)) return { x, y };
      return null;
    };
    const land = findCell((x, y) => bottom.landMask?.[y]?.[x] === true);
    const byId = Object.fromEntries(layers.map((layer) => [layer.id, layer]));
    const shelf = findCell((x, y) => !bottom.landMask?.[y]?.[x] && byId.deep?.validCellMask?.[y]?.[x] === false);
    const basin = findCell((x, y) => !bottom.landMask?.[y]?.[x] && byId.deep?.validCellMask?.[y]?.[x] === true);
    return {
      layerIds: layers.map((layer) => layer.id),
      landMasked: land ? layers.every((layer) => layer.validCellMask?.[land.y]?.[land.x] === false) : false,
      deepMaskedOnShelf: shelf ? byId.deep?.validCellMask?.[shelf.y]?.[shelf.x] === false : false,
      midwaterValidInBasin: basin ? byId.midwater?.validCellMask?.[basin.y]?.[basin.x] === true || byId.thermocline?.validCellMask?.[basin.y]?.[basin.x] === true : false,
      deepValidInBasin: basin ? byId.deep?.validCellMask?.[basin.y]?.[basin.x] === true : false,
      integratedIsPhysical: byId.integratedWaterColumn?.representativeDepthMeters !== null,
      activeTexturedSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0,
      usesSharedTerrainLayer: window.ANCHOR_MISSION_RENDER_DEBUG?.usesSharedTerrainLayer === true
    };
  });
  expect(masks.layerIds).toContain('deep');
  expect(masks.landMasked).toBe(true);
  expect(masks.deepMaskedOnShelf).toBe(true);
  expect(masks.midwaterValidInBasin).toBe(true);
  expect(masks.deepValidInBasin).toBe(true);
  expect(masks.integratedIsPhysical).toBe(false);
  expect(masks.activeTexturedSlabCount).toBe(1);
  expect(masks.usesSharedTerrainLayer).toBe(true);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Bathymetric Demo and Mission Renderer Share Terrain Geometry', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  const missionTerrain = await page.evaluate(() => ({
    sourceDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainSourceDigest ?? null,
    meshDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainMeshDigest ?? null,
    coordinateProfileId: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainCoordinateProfileId ?? null,
    implementationId: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainLayerImplementationId ?? null,
    usesSharedTerrainLayer: window.ANCHOR_MISSION_RENDER_DEBUG?.usesSharedTerrainLayer === true,
    usesLegacyTerrainLayer: window.ANCHOR_MISSION_RENDER_DEBUG?.usesLegacyTerrainLayer === true
  }));
  expect(missionTerrain.sourceDigest).toBeTruthy();
  expect(missionTerrain.meshDigest).toBeTruthy();
  expect(missionTerrain.usesSharedTerrainLayer).toBe(true);
  expect(missionTerrain.usesLegacyTerrainLayer).toBe(false);
  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectNoTerrainResourcesOnMainMenu(page);
  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.active === true), { timeout: 15000 }).toBe(true);
  const demoTerrain = await page.evaluate(() => ({
    sourceDigest: window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainSourceDigest ?? null,
    meshDigest: window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainMeshDigest ?? null,
    coordinateProfileId: window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainCoordinateProfileId ?? null,
    implementationId: window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.terrainLayerImplementationId ?? null,
    usesSharedTerrainLayer: window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesSharedTerrainLayer === true,
    usesLegacyTerrainLayer: window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesLegacyTerrainLayer === true
  }));
  expect(demoTerrain.sourceDigest).toBeTruthy();
  expect(demoTerrain.meshDigest).toBeTruthy();
  expect(demoTerrain.coordinateProfileId).toBeTruthy();
  expect(demoTerrain.implementationId).toBe(missionTerrain.implementationId);
  expect(demoTerrain.usesSharedTerrainLayer).toBe(true);
  expect(demoTerrain.usesLegacyTerrainLayer).toBe(false);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('All Production Mission Phases Share One Bathymetry Contract', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  await openMainMenuHubSection(page, 'challenge');
  await page.locator('#main-menu-hub [data-action="random-challenge"]').first().click();
  await expect(page.locator('#mission-console')).toContainText('Scenario Start');
  const scenarioStart = await page.evaluate(() => ({
    hasBathymetry: Boolean(window.anchorGame.state.level?.world?.bathymetry || window.anchorGame.state.level?.bathymetry || window.anchorGame.state.level?.layers?.depthMeters || window.anchorGame.state.level?.layers?.depth),
    mode: window.anchorGame.state.mode ?? null
  }));
  expect(scenarioStart.hasBathymetry).toBe(true);
  await page.locator('#mission-console [data-action="start"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  const planning = await page.evaluate(() => ({
    sourceDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainSourceDigest ?? null,
    meshDigest: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainMeshDigest ?? null,
    implementationId: window.ANCHOR_MISSION_RENDER_DEBUG?.terrainLayerImplementationId ?? null,
    usesSharedTerrainLayer: window.ANCHOR_MISSION_RENDER_DEBUG?.usesSharedTerrainLayer === true,
    usesLegacyTerrainLayer: window.ANCHOR_MISSION_RENDER_DEBUG?.usesLegacyTerrainLayer === true
  }));
  expect(planning.sourceDigest).toBeTruthy();
  expect(planning.meshDigest).toBeTruthy();
  expect(planning.usesSharedTerrainLayer).toBe(true);
  expect(planning.usesLegacyTerrainLayer).toBe(false);
  await deployAllGlidersAndRouteFirstThroughVisibleControls(page);
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  const simulation = await page.evaluate(() => ({
    sourceDigest: window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainSourceDigest ?? null,
    meshDigest: window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainMeshDigest ?? null,
    implementationId: window.ANCHOR_SIMULATION_RENDER_DEBUG?.terrainLayerImplementationId ?? null,
    usesSharedTerrainLayer: window.ANCHOR_SIMULATION_RENDER_DEBUG?.usesSharedTerrainLayer === true,
    usesLegacyTerrainLayer: window.ANCHOR_SIMULATION_RENDER_DEBUG?.usesLegacyTerrainLayer === true,
    terrainGeometryUpdateCountDuringSimulation: window.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary?.terrainGeometryUpdateCountDuringSimulation ?? 0
  }));
  expect(simulation.sourceDigest).toBe(planning.sourceDigest);
  expect(simulation.meshDigest).toBe(planning.meshDigest);
  expect(simulation.implementationId).toBe(planning.implementationId);
  expect(simulation.usesSharedTerrainLayer).toBe(true);
  expect(simulation.usesLegacyTerrainLayer).toBe(false);
  expect(simulation.terrainGeometryUpdateCountDuringSimulation).toBe(0);
  await page.locator('#mission-console [data-action="finish"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.simulationStatus === 'complete' || window.anchorGame.state.mode === 'debrief'), { timeout: 30000 }).toBe(true);
  await page.locator('#mission-console [data-action="debrief"]').click();
  await expect(page.locator('#debrief-root')).toBeVisible({ timeout: 15000 });
  await page.locator('[data-action="menu"]').filter({ hasText: 'Main Menu' }).first().click();
  await expectNoTerrainResourcesOnMainMenu(page);
  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.active === true), { timeout: 15000 }).toBe(true);
  const bathymetryView = await page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG ?? {});
  expect(bathymetryView.usesSharedTerrainLayer).toBe(true);
  expect(bathymetryView.usesLegacyTerrainLayer).toBe(false);
  expect(bathymetryView.terrainLayerImplementationId).toBe(planning.implementationId);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Bathymetry Resources Dispose Across Scene Transitions', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await startVisibleContinuousMissionPlanning(page);
  await page.locator('[data-action="main-menu"]').filter({ hasText: 'Main Menu' }).first().click();
  const firstMenu = await expectNoTerrainResourcesOnMainMenu(page);
  await startVisibleContinuousMissionPlanning(page);
  await deployAllGlidersAndRouteFirstThroughVisibleControls(page);
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="menu"]').click();
  const secondMenu = await expectNoTerrainResourcesOnMainMenu(page);
  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.active === true), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="menu"]').click();
  const thirdMenu = await expectNoTerrainResourcesOnMainMenu(page);
  expect(secondMenu.canvasCount).toBe(firstMenu.canvasCount);
  expect(thirdMenu.canvasCount).toBe(firstMenu.canvasCount);
  expect(secondMenu.bathymetryCanvasCount).toBe(firstMenu.bathymetryCanvasCount);
  expect(thirdMenu.bathymetryCanvasCount).toBe(firstMenu.bathymetryCanvasCount);
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Bathymetric Terrain Preserves Render-Cost Gate', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2, extraFarWaypoints: 1 });
  await page.locator('#mission-console [data-action="three-quality-profile"][data-profile="balanced"]').click();
  const planningVisuals = await page.evaluate(() => ({
    agentCount: window.anchorGame.state.mission?.agents?.length ?? 0,
    activeTexturedSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.activeTexturedSlabCount ?? 0,
    contextOutlineSlabCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.contextOutlineSlabCount ?? 0,
    currentVectorObjectCount: window.ANCHOR_WATER_COLUMN_RENDER_DEBUG?.currentVectorObjectCount ?? 0,
    samplingTargetCount: window.ANCHOR_MISSION_RENDER_DEBUG?.scienceTargetCount ?? 0,
    plannedDiveObjectCount: window.ANCHOR_DIVE_PLAN_DEBUG?.predictedDivePointCount ?? 0
  }));
  expect(planningVisuals.agentCount).toBeGreaterThanOrEqual(2);
  expect(planningVisuals.activeTexturedSlabCount).toBe(1);
  expect(planningVisuals.contextOutlineSlabCount).toBeGreaterThan(0);
  expect(planningVisuals.samplingTargetCount).toBeGreaterThan(0);
  expect(planningVisuals.plannedDiveObjectCount).toBeGreaterThan(0);

  await page.locator('#mission-console [data-action="execute"]').click();
  try {
    await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  } catch (error) {
    const executeDebug = await page.evaluate(() => ({
      mode: window.anchorGame.state.mode ?? null,
      activeScenes: window.anchorGame.phaser.scene.getScenes(true).map((scene) => scene.scene?.key ?? scene.sys?.settings?.key ?? null),
      missionDebug: window.ANCHOR_MISSION_RENDER_DEBUG ?? null,
      executionDebug: window.ANCHOR_EXECUTION_DEBUG ?? null,
      simulationDebug: window.ANCHOR_SIMULATION_RENDER_DEBUG ?? null,
      executeDisabled: document.querySelector('#mission-console [data-action="execute"]')?.disabled ?? null,
      consoleText: document.querySelector('#mission-console')?.innerText?.slice(0, 1200) ?? null,
      planSummary: {
        agentPlans: window.anchorGame.state.plan?.agentPlans?.map?.((agentPlan) => ({
          agentId: agentPlan.agentId,
          waypointCount: agentPlan.waypoints?.length ?? 0,
          selectedStart: agentPlan.selectedStart ?? null,
          waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({ x: waypoint.x, y: waypoint.y, targetDepthLayerId: waypoint.targetDepthLayerId, maximumDiveDepthMeters: waypoint.maximumDiveDepthMeters, scienceTargetIds: waypoint.scienceTargetIds ?? [] }))
        })) ?? [],
        scienceTargets: window.anchorGame.state.plan?.scienceTargets ?? []
      }
    }));
    console.log('BALANCED_EXECUTE_DEBUG ' + JSON.stringify(executeDebug));
    throw error;
  }
  await advanceSimulationSceneForRenderCost(page, { steps: 12, frameDelay: 40, keepRunning: true });
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 4), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await advanceSimulationSceneForRenderCost(page, { steps: 14, frameDelay: 40, keepRunning: true });
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.sampleCount ?? 0) >= 8), { timeout: 25000 }).toBe(true);
  await stopSimulationSceneRenderCostStepper(page);
  const perf = await page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {});
  const strictHeadedGate = test.info().project.use?.headless === false;
  expect(perf.qualityProfile).toBe('balanced');
  expect(Number.isFinite(Number(perf.frameIntervalAverageMilliseconds))).toBe(true);
  expect(Number.isFinite(Number(perf.frameIntervalP95Milliseconds))).toBe(true);
  expect(Number.isFinite(Number(perf.presentationUpdateAverageMilliseconds))).toBe(true);
  expect(Number.isFinite(Number(perf.rendererSubmissionAverageMilliseconds))).toBe(true);
  expect(perf.renderedFramesPerSecond).toBeGreaterThan(0);
  if (strictHeadedGate) {
    expect(perf.frameIntervalAverageMilliseconds).toBeLessThanOrEqual(50);
    expect(perf.frameIntervalP95Milliseconds).toBeLessThanOrEqual(100);
    expect(perf.renderedFramesPerSecond).toBeGreaterThanOrEqual(20);
  }
  expect(perf.activeRendererCount).toBe(1);
  expect(perf.activeRafCount).toBe(1);
  expect(perf.renderCallsPerPresentationFrame).toBeLessThanOrEqual(1);
  expect(perf.duplicateRenderCallWarningCount).toBe(0);
  expect(perf.activeTexturedSlabCount).toBe(1);
  expect(perf.contextOutlineSlabCount).toBeGreaterThan(0);
  const simulationVisuals = await page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary ?? {});
  expect(simulationVisuals.samplingTargetObjectCount ?? 0).toBeGreaterThan(0);
  expect(simulationVisuals.realizedTrajectoryPointCount ?? 0).toBeGreaterThan(0);
  console.log('THREE_BALANCED_HEADROOM_GATE ' + JSON.stringify({
    average: perf.frameIntervalAverageMilliseconds,
    p50: perf.medianFrameMilliseconds ?? perf.frameIntervalMedianMilliseconds ?? perf.frameIntervalP50Milliseconds ?? null,
    p95: perf.frameIntervalP95Milliseconds,
    p99: perf.frameIntervalP99Milliseconds,
    maximum: perf.maximumFrameMilliseconds,
    renderedFramesPerSecond: perf.renderedFramesPerSecond,
    presentationUpdateAverageMilliseconds: perf.presentationUpdateAverageMilliseconds,
    rendererSubmissionAverageMilliseconds: perf.rendererSubmissionAverageMilliseconds,
    gpuTimingSupported: perf.gpuTimingSupported,
    gpuAverageMilliseconds: perf.gpuAverageMilliseconds,
    renderCalls: perf.rendererCalls,
    triangles: perf.rendererTriangles,
    lines: perf.rendererLines,
    points: perf.rendererPoints,
    sceneObjectCount: perf.sceneObjectCount,
    geometryCount: perf.geometryCount,
    materialCount: perf.materialCount,
    textureCount: perf.textureCount,
    terrainTriangleCount: simulationVisuals.terrainTriangleCount ?? null,
    terrainDrawCallCount: simulationVisuals.bathymetryTerrainSummary?.terrainObjectCount ?? null
  }));
  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Three Camera Remains Responsive Under Live Simulation Load', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page);
  await prepareThreeSamplingTargetDiveScenario(page, { attach: true, profile: 'fullProfile', layer: 'deep', cycles: 2 });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 15000 }).toBe(true);
  await advanceSimulationSceneForRenderCost(page, { steps: 2, frameDelay: 40, keepRunning: true });
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 1), { timeout: 15000 }).toBe(true);
  await page.evaluate(() => window.ANCHOR_MISSION_RENDER_TEST_API?.resetPerformanceWindow?.());
  await startSimulationSceneRenderCostStepper(page, { intervalMs: 50, keepRunning: true });
  const before = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return {
      engineStepCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0,
      presentationFrameCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.presentationFrameCount ?? 0,
      cameraPosition: scene.threeSimulationRenderer?.camera?.position?.toArray?.() ?? [],
      routeDigest: JSON.stringify((window.anchorGame.state.plan?.agentPlans ?? []).map((agentPlan) => ({ agentId: agentPlan.agentId, selectedStart: agentPlan.selectedStart, waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({ id: waypoint.id, x: waypoint.x, y: waypoint.y, action: waypoint.action, kind: waypoint.kind, targetDepthLayerId: waypoint.targetDepthLayerId, diveProfileId: waypoint.diveProfileId, scienceTargetIds: waypoint.scienceTargetIds ?? [] })) })))
    };
  });
  const canvasBox = await page.locator('.three-mission-world-canvas').boundingBox();
  expect(canvasBox).toBeTruthy();
  const point = { x: canvasBox.x + canvasBox.width * 0.52, y: canvasBox.y + canvasBox.height * 0.48 };
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(point.x + 160, point.y + 70, { steps: 12 });
  await page.mouse.up({ button: 'right' });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(point.x + 40, point.y + 100, { steps: 8 });
  await page.mouse.up({ button: 'middle' });
  await page.mouse.wheel(0, -180);
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_THREE_PERFORMANCE_DEBUG?.cameraGestureCount ?? 0) > 0), { timeout: 10000 }).toBe(true);
  await expect.poll(() => page.evaluate((beforeCamera) => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    const current = scene.threeSimulationRenderer?.camera?.position?.toArray?.() ?? [];
    return current.join(',') !== beforeCamera.join(',');
  }, before.cameraPosition), { timeout: 10000 }).toBe(true);
  await advanceSimulationSceneForRenderCost(page, { steps: 4, frameDelay: 20, keepRunning: true });
  const afterGesture = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return {
      engineStepCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0,
      presentationFrameCount: window.ANCHOR_SIMULATION_RENDER_DEBUG?.presentationFrameCount ?? 0,
      cameraPosition: scene.threeSimulationRenderer?.camera?.position?.toArray?.() ?? [],
      perf: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? {},
      routeDigest: JSON.stringify((window.anchorGame.state.plan?.agentPlans ?? []).map((agentPlan) => ({ agentId: agentPlan.agentId, selectedStart: agentPlan.selectedStart, waypoints: (agentPlan.waypoints ?? []).map((waypoint) => ({ id: waypoint.id, x: waypoint.x, y: waypoint.y, action: waypoint.action, kind: waypoint.kind, targetDepthLayerId: waypoint.targetDepthLayerId, diveProfileId: waypoint.diveProfileId, scienceTargetIds: waypoint.scienceTargetIds ?? [] })) })))
    };
  });
  expect(afterGesture.routeDigest).toBe(before.routeDigest);
  expect(afterGesture.cameraPosition.join(',')).not.toBe(before.cameraPosition.join(','));
  expect(afterGesture.engineStepCount).toBeGreaterThanOrEqual(before.engineStepCount);
  expect(afterGesture.presentationFrameCount).toBeGreaterThan(before.presentationFrameCount);
  expect(afterGesture.perf.activeRendererCount).toBe(1);
  expect(afterGesture.perf.activeRafCount).toBe(1);
  expect(afterGesture.perf.modelBuildCountDuringCameraGesture).toBe(0);
  expect(afterGesture.perf.predictionBuildCountDuringCameraGesture).toBe(0);
  await stopSimulationSceneRenderCostStepper(page);
  const paused = await page.evaluate(() => ({
    running: window.anchorGame.phaser.scene.getScene('SimulationScene')?.engine?.running === true,
    complete: window.anchorGame.phaser.scene.getScene('SimulationScene')?.engine?.complete === true,
    aborted: window.anchorGame.phaser.scene.getScene('SimulationScene')?.engine?.aborted === true,
    awaitingSurfaceDecision: window.anchorGame.phaser.scene.getScene('SimulationScene')?.engine?.awaitingSurfaceDecision === true,
    routeFailureActive: window.anchorGame.phaser.scene.getScene('SimulationScene')?.engine?.routeFailureDecision?.active === true,
    step: window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0
  }));
  expect(paused.running).toBe(false);

  assertContinuousBrowserErrorsClean(browserErrors);
});

test('Segment Distance Changes Predicted Dive Geometry', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  const result = await page.evaluate(async () => {
    const { buildPlannedDiveSegmentViewModel } = await import('./src/core/rendering/PlannedDiveSegmentViewModel.js');
    const waterColumnConfig = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'fullProfile' };
    const deepBottom = Array.from({ length: 5 }, () => Array.from({ length: 14 }, () => 220));
    const short = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 2 }, targetWaypoint: { x: 1, y: 2, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: deepBottom }, requestedMaximumDepthMeters: 120, cycleCount: 5 });
    const long = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 2 }, targetWaypoint: { x: 12, y: 2, diveProfileId: 'fullProfile', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: deepBottom }, requestedMaximumDepthMeters: 120, cycleCount: 5 });
    const shallow = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 2 }, targetWaypoint: { x: 7, y: 2, diveProfileId: 'deepDive', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => 45)) }, requestedMaximumDepthMeters: 120, requiredBottomClearanceMeters: 10 });
    return {
      shortCycles: short.cycleCount,
      longCycles: long.cycleCount,
      shortSamples: short.predictedSamples.length,
      longSamples: long.predictedSamples.length,
      terrainLimited: shallow.bottomClearance.terrainLimited,
      minClearance: shallow.bottomClearance.minimumClearanceMeters,
      noRendererAuthority: shallow.boundaryFlags.ownsPlanning === false && shallow.boundaryFlags.ownsSimulation === false && shallow.boundaryFlags.ownsScoring === false
    };
  });
  expect(result.longCycles).toBeGreaterThan(result.shortCycles);
  expect(result.longSamples).toBeGreaterThanOrEqual(result.shortSamples);
  expect(result.terrainLimited).toBe(true);
  expect(result.minClearance).toBeGreaterThanOrEqual(0);
  expect(result.noRendererAuthority).toBe(true);
});

test('Predicted and Realized Dive Paths Remain Distinct', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  const result = await page.evaluate(async () => {
    const { buildPlannedDiveSegmentViewModel } = await import('./src/core/rendering/PlannedDiveSegmentViewModel.js');
    const { buildRealizedDiveTrajectory } = await import('./src/core/rendering/DiveTrajectoryViewModel.js');
    const waterColumnConfig = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], divediveProfileId: 'sawtoothProfile' };
    const predicted = buildPlannedDiveSegmentViewModel({ startWaypoint: { x: 0, y: 1 }, targetWaypoint: { x: 6, y: 3, divediveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' }, waterColumnConfig, bottomBoundary: { bottomDepthField: Array.from({ length: 5 }, () => Array.from({ length: 8 }, () => 180)) }, requestedMaximumDepthMeters: 110, cycleCount: 2 });
    const frozen = JSON.stringify(predicted.predictedDivePath);
    const actual = [{ x: 0, y: 1, depthMeters: 0 }, { x: 2.2, y: 1.7, depthMeters: 65 }, { x: 4.5, y: 2.6, depthMeters: 96 }];
    const growing = buildRealizedDiveTrajectory({ points: actual, divediveProfileId: 'sawtoothProfile' });
    actual.push({ x: 6.4, y: 3.2, depthMeters: 0 });
    const completed = buildRealizedDiveTrajectory({ points: actual, divediveProfileId: 'sawtoothProfile' });
    return {
      predictionFrozen: JSON.stringify(predicted.predictedDivePath) === frozen,
      actualGrows: completed.points.length > growing.points.length,
      surfacingOffset: Math.hypot((predicted.predictedSurfacingPosition.x ?? 0) - (completed.surfacingPoint.x ?? 0), (predicted.predictedSurfacingPosition.y ?? 0) - (completed.surfacingPoint.y ?? 0)),
      predictedSamplesScore: predicted.predictedSamples.some((sample) => sample.createsScoreEvent === true)
    };
  });
  expect(result.predictionFrozen).toBe(true);
  expect(result.actualGrows).toBe(true);
  expect(result.surfacingOffset).toBeGreaterThan(0);
  expect(result.predictedSamplesScore).toBe(false);
});

test('Bathymetry Demo and Mission Dive Paths Share Coordinates', async ({ page }) => {
  await page.goto('/');
  await waitForAnchorAppReady(page, { routeId: 'main-menu' });
  const result = await page.evaluate(async () => {
    const { createMissionWorldCoordinateTransform, gridCellToWorld } = await import('./src/core/rendering/MissionWorldCoordinates.js');
    const { gridCellDepthToWorld, createVolumetricMissionCoordinateModel } = await import('./src/core/rendering/VolumetricMissionCoordinates.js');
    const transform = createMissionWorldCoordinateTransform({ grid: { width: 8, height: 6 }, depthScale: 0.05, verticalExaggeration: 1.5 });
    const coordinateModel = createVolumetricMissionCoordinateModel({ coordinateSystem: transform, verticalDisplayMode: 'physicalDepth', depthLayers: [] });
    const surface = gridCellDepthToWorld({ col: 3, row: 2, depthMeters: 0, coordinateModel, transform, verticalDisplayMode: 'physicalDepth' });
    const deep = gridCellDepthToWorld({ col: 3, row: 2, depthMeters: 80, coordinateModel, transform, verticalDisplayMode: 'physicalDepth' });
    const mission = gridCellToWorld(transform, 3, 2, 0);
    return {
      sameHorizontalX: Math.abs(surface.x - mission.x) < 1e-9 && Math.abs(deep.x - mission.x) < 1e-9,
      sameHorizontalZ: Math.abs(surface.z - mission.z) < 1e-9 && Math.abs(deep.z - mission.z) < 1e-9,
      positiveDepthMovesDown: deep.y < surface.y,
      surfaceY: surface.y,
      deepY: deep.y
    };
  });
  expect(result.sameHorizontalX).toBe(true);
  expect(result.sameHorizontalZ).toBe(true);
  expect(result.positiveDepthMovesDown).toBe(true);
});
