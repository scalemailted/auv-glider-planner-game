import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;
const BASE = 'http://127.0.0.1:9342';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-r2a-1-launch-review');
const GLYPH_WARNING = 'Volumetric current visualization could not be initialized. Mission physics still use the canonical current field.';

test.setTimeout(240000);
test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9342 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function boot(page, route = '/') {
  await page.goto(BASE + route);
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame?.phaser?.scene?.getScene?.('MainMenuScene'))), { timeout: 20000 }).toBe(true);
}

async function setupFlowR2A1Planning(page, options = {}) {
  await boot(page, options.route ?? '/');
  await page.evaluate(async ({ malformedCurrent = false, regional = false, legacy = false } = {}) => {
    const {
      FLOW_R2A1_WATER_COLUMN_CONFIG,
      makeFlowR2A1Level,
      makeFlowR2A1Mission,
      makeFlowR2A1Plan
    } = await import('./tools/js/flow_r2a1_test_helpers.mjs');
    const waterColumnConfig = legacy
      ? { enabled: true, depthLayerIds: ['surface'], defaultLayerIds: ['surface'], diveProfileId: 'surfaceOnly', defaultDiveProfileId: 'surfaceOnly', defaultTargetDepthLayerId: 'surface' }
      : FLOW_R2A1_WATER_COLUMN_CONFIG;
    const level = makeFlowR2A1Level({
      levelId: regional ? 'flow-r2a-1-regional-launch-fixture' : legacy ? 'flow-r2a-1-legacy-launch-fixture' : 'flow-r2a-1-browser-launch-fixture',
      grid: regional ? { width: 12, height: 8 } : { width: 8, height: 6 },
      waterColumnConfig,
      seed: regional ? 177 : legacy ? 12 : 91
    });
    const mission = makeFlowR2A1Mission({ missionId: regional ? 'flow-r2a-1-regional-mission' : legacy ? 'flow-r2a-1-legacy-mission' : 'flow-r2a-1-browser-mission', waterColumnConfig });
    if (legacy) {
      mission.agents = mission.agents.slice(0, 1).map((agent) => ({ ...agent, diveProfileId: 'surfaceOnly', targetDepthLayerId: 'surface' }));
    }
    const plan = makeFlowR2A1Plan();
    if (legacy) {
      plan.agentPlans = plan.agentPlans.slice(0, 1).map((agentPlan) => ({ ...agentPlan, diveProfileId: 'surfaceOnly', targetDepthLayerId: 'surface' }));
    }

    const state = window.anchorGame.state;
    state.level = level;
    state.mission = mission;
    state.plan = plan;
    state.selectedAgentId = 'glider-1';
    state.mode = 'planning';
    state.challengeMode = regional ? 'regionalFlowR2A1' : legacy ? 'legacyFlowR2A1' : 'flowR2A1';
    state.experienceMode = 'simulationLab';
    state.playback = { ...(state.playback ?? {}), time: 0 };
    state.ui = {
      ...(state.ui ?? {}),
      rendererBackend: 'threeMission3d',
      legacyPhaserMissionRendererEnabled: false,
      showCurrents: true,
      waterColumn: {
        ...(state.ui?.waterColumn ?? {}),
        qualityProfile: 'balanced',
        activeDepthLayerId: legacy ? 'surface' : 'thermocline',
        selectedTargetDepthLayerId: legacy ? 'surface' : 'deep',
        selectedDiveProfileId: legacy ? 'surfaceOnly' : 'sawtoothProfile',
        currentDisplayMode: 'activeLayerOnly',
        currentVectorDensity: 1,
        verticalDisplayMode: 'physicalDepth',
        verticalExaggeration: 2
      }
    };
    window.anchorGame.phaser.scene.start('MissionWorkspaceScene');
  }, options);
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 20000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true), { timeout: 20000 }).toBe(true);
  await expect(page.locator('#mission-console [data-action="execute"]')).toBeVisible({ timeout: 20000 });
}

async function executeAndWaitForSimulation(page) {
  const executeClickedAt = Date.now();
  await page.locator('#mission-console [data-action="execute"]').click();
  try {
    await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 20000 }).toBe(true);
  } catch (error) {
    const debug = await page.evaluate(() => ({
      execution: window.ANCHOR_EXECUTION_DEBUG ?? null,
      launch: window.ANCHOR_SIMULATION_LAUNCH_DEBUG ?? null,
      routeAudit: window.anchorGame?.state?.ui?.routeAudit ?? null,
      terrainReport: window.anchorGame?.state?.ui?.terrainAwareValidationReport ?? null,
      consoleText: document.querySelector('#mission-console')?.innerText ?? null,
      modalText: document.querySelector('.modal, .game-modal, [role="dialog"]')?.innerText ?? null
    }));
    throw new Error(`${error.message}\nFLOW_R2A1_EXECUTE_DEBUG ${JSON.stringify(debug, null, 2)}`);
  }
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 25000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_LAUNCH_DEBUG?.status), { timeout: 25000 }).toBe('interactive');
  return { executeClickedAt, interactiveAt: Date.now() };
}

async function readLaunchSnapshot(page) {
  return page.evaluate(() => ({
    launch: window.ANCHOR_SIMULATION_LAUNCH_DEBUG ?? null,
    render: window.ANCHOR_SIMULATION_RENDER_DEBUG ?? null,
    perf: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? null,
    execution: window.ANCHOR_EXECUTION_DEBUG ?? null,
    current: window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG ?? null,
    warningText: document.body?.innerText?.includes('Volumetric current visualization could not be initialized') ?? false,
    pageUrl: location.href
  }));
}

async function moduleProbe(page, route = '/') {
  await page.goto(BASE + route);
  return page.evaluate(async () => {
    const { makeFlowR2A1Level, makeFlowR2A1Mission, makeFlowR2A1Plan, makeCachedCurrentField, makeFixtureCurrentField, makeCurrentExplorer } = await import('./tools/js/flow_r2a1_test_helpers.mjs');
    const { resetSyntheticCurrentCubeSessionCache, syntheticCurrentCubeSessionCacheSummary, getSyntheticCurrentCubeFromMissionWorld } = await import('./src/core/science/SyntheticCurrentCubeAdapter.js');
    const { getOceanCurrentSampler, createOceanCurrentSampler, resetOceanCurrentSamplerRuntimeCounters, getOceanCurrentSamplerRuntimeCounters } = await import('./src/core/science/OceanCurrentFieldSampler.js');
    const { resetOceanCurrentFieldRuntimeCounters, getOceanCurrentFieldRuntimeCounters } = await import('./src/core/science/OceanCurrentField4D.js');
    const { resetWaterColumnCurrentRenderSampleCache, waterColumnCurrentRenderSampleCacheSummary } = await import('./src/core/rendering/WaterColumnLayerExplorerViewModel.js');
    const { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } = await import('./src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js');
    const { SimulationEngine } = await import('./src/core/sim/SimulationEngine.js');
    const { startSimulationLaunchProfiler, simulationLaunchDebugSnapshot, resetSimulationLaunchProfiler } = await import('./src/core/runtime/SimulationLaunchProfiler.js');

    resetSyntheticCurrentCubeSessionCache();
    resetOceanCurrentFieldRuntimeCounters();
    resetOceanCurrentSamplerRuntimeCounters();
    resetWaterColumnCurrentRenderSampleCache();
    resetSimulationLaunchProfiler();
    const level = makeFlowR2A1Level();
    const mission = makeFlowR2A1Mission();
    const plan = makeFlowR2A1Plan();
    startSimulationLaunchProfiler({ level, mission, agentCount: mission.agents.length });
    const first = makeCachedCurrentField(level);
    const second = getSyntheticCurrentCubeFromMissionWorld({ level, waterColumnConfig: level.world.waterColumnConfig });
    const samplerA = getOceanCurrentSampler(first);
    const samplerB = getOceanCurrentSampler(second);
    const worldEngine = new SimulationEngine({ level, mission, plan, time: 0 });
    for (let i = 0; i < 8; i += 1) worldEngine.step(1 / 30, { force: true });
    const sampleBefore = getOceanCurrentFieldRuntimeCounters();
    for (let index = 0; index < 1000; index += 1) samplerA.sample({ eastMeters: 2.25, northMeters: 2.5, depthMeters: index % 2 ? 35 : 150, timeSeconds: index % 900 });
    const sampleAfter = getOceanCurrentFieldRuntimeCounters();
    const explorerA = makeCurrentExplorer(level, { currentField4D: first, activeLayerId: 'thermocline', activeTimeSeconds: 600 });
    const explorerB = makeCurrentExplorer(level, { currentField4D: first, activeLayerId: 'thermocline', activeTimeSeconds: 600 });
    const explorerC = makeCurrentExplorer(level, { currentField4D: first, activeLayerId: 'deep', activeTimeSeconds: 600 });
    const glyph = createThreeInstancedCurrentGlyphLayer();
    updateThreeInstancedCurrentGlyphLayer(glyph, { coordinateSystem: { cellSize: 12, originX: 0, originY: 0 }, waterColumnExplorer: explorerA, waterColumn: { currentVectorDensity: 1 } });
    updateThreeInstancedCurrentGlyphLayer(glyph, { coordinateSystem: { cellSize: 12, originX: 0, originY: 0 }, waterColumnExplorer: explorerB, waterColumn: { currentVectorDensity: 1 } });
    const glyphSummary = threeInstancedCurrentGlyphLayerSummary(glyph, { waterColumnExplorer: explorerB });
    const primaryCubeStats = syntheticCurrentCubeSessionCacheSummary();
    const primaryLaunchDebug = simulationLaunchDebugSnapshot();
    const legacyLevel = makeFlowR2A1Level({ levelId: 'legacy-surface-current', waterColumnConfig: { enabled: true, depthLayerIds: ['surface'], defaultLayerIds: ['surface'], diveProfileId: 'surfaceOnly' }, seed: 13 });
    const legacyMission = makeFlowR2A1Mission({ waterColumnConfig: legacyLevel.world.waterColumnConfig });
    legacyMission.agents = legacyMission.agents.slice(0, 1).map((agent) => ({ ...agent, diveProfileId: 'surfaceOnly', targetDepthLayerId: 'surface' }));
    const legacyPlan = makeFlowR2A1Plan();
    legacyPlan.agentPlans = legacyPlan.agentPlans.slice(0, 1).map((agentPlan) => ({ ...agentPlan, diveProfileId: 'surfaceOnly', targetDepthLayerId: 'surface' }));
    const legacyEngine = new SimulationEngine({ level: legacyLevel, mission: legacyMission, plan: legacyPlan, time: 0 });
    legacyEngine.step(1 / 30, { force: true });
    const regionalLevel = makeFlowR2A1Level({ levelId: 'regional-small-current', grid: { width: 12, height: 8 }, seed: 177 });
    const regionalMission = makeFlowR2A1Mission({ missionId: 'regional-small-current-mission', waterColumnConfig: regionalLevel.world.waterColumnConfig });
    const regionalEngine = new SimulationEngine({ level: regionalLevel, mission: regionalMission, plan, time: 0 });
    regionalEngine.step(1 / 30, { force: true });
    const fixture = makeFixtureCurrentField();
    const hotSampler = createOceanCurrentSampler(fixture);
    resetOceanCurrentFieldRuntimeCounters();
    resetOceanCurrentSamplerRuntimeCounters();
    let hotLast = null;
    const start = performance.now();
    for (let index = 0; index < 10000; index += 1) hotLast = hotSampler.sample({ eastMeters: (index % 7) + 0.25, northMeters: (index % 5) + 0.5, depthMeters: [0, 15, 35, 75, 150][index % 5], timeSeconds: index % 1800 });
    const hotElapsedMs = performance.now() - start;
    return {
      sameField: first === second,
      sameSampler: samplerA === samplerB,
      primaryCubeStats,
      cubeStats: syntheticCurrentCubeSessionCacheSummary(),
      fieldStats: getOceanCurrentFieldRuntimeCounters(),
      samplerStats: getOceanCurrentSamplerRuntimeCounters(),
      sampleBefore,
      sampleAfter,
      renderCache: waterColumnCurrentRenderSampleCacheSummary(),
      explorerDigests: [explorerA.activeCurrentLayer?.sourceDigest, explorerB.activeCurrentLayer?.sourceDigest, explorerC.activeCurrentLayer?.sourceDigest],
      glyphSummary,
      legacy: { complete: legacyEngine.complete, aborted: legacyEngine.aborted, depthCount: legacyEngine.world?.currentField4D?.depthAxisMeters?.length ?? null },
      regional: { complete: regionalEngine.complete, aborted: regionalEngine.aborted, depthCount: regionalEngine.world?.currentField4D?.depthAxisMeters?.length ?? null, scalarCount: (regionalEngine.world?.currentField4D?.eastAxisMeters?.length ?? 0) * (regionalEngine.world?.currentField4D?.northAxisMeters?.length ?? 0) * (regionalEngine.world?.currentField4D?.depthAxisMeters?.length ?? 0) * (regionalEngine.world?.currentField4D?.timeAxisSeconds?.length ?? 0) },
      hotLoop: { elapsedMs: Number(hotElapsedMs.toFixed(3)), lastFinite: Number.isFinite(hotLast?.uEastMetersPerSecond) && Number.isFinite(hotLast?.vNorthMetersPerSecond) },
      launchDebug: primaryLaunchDebug
    };
  });
}

test('Simulation Launch Reaches Interactive Frame With Volumetric Currents', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A1Planning(page);
  const timing = await executeAndWaitForSimulation(page);
  await page.locator('#mission-console [data-action="play"]').click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineRunning === true || Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 0), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  const snapshot = await readLaunchSnapshot(page);
  expect(snapshot.launch.status).toBe('interactive');
  expect(snapshot.launch.currentDepthCount).toBeGreaterThan(1);
  expect(snapshot.launch.currentCubeBuildCount).toBeLessThanOrEqual(1);
  expect(snapshot.launch.currentCubeNormalizeCount).toBeLessThanOrEqual(1);
  expect(snapshot.launch.currentSamplerCreateCount).toBeLessThanOrEqual(1);
  expect(snapshot.launch.activeRendererCount).toBe(1);
  expect(snapshot.launch.activeRafCount).toBe(1);
  expect(snapshot.launch.totalLaunchDurationMs).toBeLessThanOrEqual(3000);
  expect(timing.interactiveAt - timing.executeClickedAt).toBeLessThanOrEqual(3000);
  errors.assertClean();
});

test('Current Cube Is Built Once Per Mission Launch', async ({ page }) => {
  const probe = await moduleProbe(page);
  expect(probe.sameField).toBe(true);
  expect(probe.sameSampler).toBe(true);
  expect(probe.primaryCubeStats.buildCount).toBeLessThanOrEqual(1);
  expect(probe.primaryCubeStats.cacheHitCount).toBeGreaterThanOrEqual(1);
  expect(probe.launchDebug.currentCubeBuildCount).toBeLessThanOrEqual(1);
  expect(probe.launchDebug.currentCubeNormalizeCount).toBeLessThanOrEqual(1);
  expect(probe.launchDebug.currentSamplerCreateCount).toBeLessThanOrEqual(1);
  expect(probe.samplerStats.sampleCallCount).toBeGreaterThan(0);
});

test('Simulation Current Sampling Does Not Rebuild the Current Field', async ({ page }) => {
  const probe = await moduleProbe(page);
  expect(probe.hotLoop.lastFinite).toBe(true);
  expect(probe.fieldStats.normalizeCount).toBe(0);
  expect(probe.fieldStats.digestCount).toBe(0);
  expect(probe.samplerStats.sampleCallCount).toBe(10000);
  expect(probe.samplerStats.bracketLookupCount).toBeLessThanOrEqual(40000);
  expect(probe.hotLoop.elapsedMs).toBeGreaterThanOrEqual(0);
});

test('Current Glyph Presentation Failure Does Not Freeze Simulation', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A1Planning(page);
  await page.evaluate(() => { window.__ANCHOR_TEST_FORCE_CURRENT_GLYPH_FAILURE = true; });
  await executeAndWaitForSimulation(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_LAUNCH_DEBUG?.degradedPresentation === true), { timeout: 15000 }).toBe(true);
  await expect(page.locator('body')).toContainText(GLYPH_WARNING, { timeout: 15000 });
  await page.locator('#mission-console [data-action="play"]').click();
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 0), { timeout: 15000 }).toBe(true);
  const snapshot = await readLaunchSnapshot(page);
  expect(snapshot.launch.activeRendererCount).toBe(1);
  expect(snapshot.launch.activeRafCount).toBe(1);
  expect(snapshot.render.rendererSummary.currentGlyphPresentationFailed).toBe(true);
  await page.evaluate(() => { window.__ANCHOR_TEST_FORCE_CURRENT_GLYPH_FAILURE = false; });
  errors.assertClean();
});

test('Malformed Canonical Current Field Aborts Launch Cleanly', async ({ page }) => {
  await setupFlowR2A1Planning(page);
  await page.evaluate(() => {
    const level = window.anchorGame.state.level;
    level.layers.waterColumn ??= {};
    level.layers.waterColumn.currentField4D = {
      type: 'anchor.science.ocean-current-field-4d',
      eastAxisMeters: [],
      northAxisMeters: [],
      depthAxisMeters: [],
      timeAxisSeconds: [],
      uEastMetersPerSecond: [],
      vNorthMetersPerSecond: []
    };
  });
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect(page.locator('[data-simulation-launch-error="true"]')).toBeVisible({ timeout: 20000 });
  const debug = await page.evaluate(() => ({ launch: window.ANCHOR_SIMULATION_LAUNCH_DEBUG, error: window.anchorGame.state.simulationLaunchError, plan: window.anchorGame.state.plan }));
  expect(debug.launch.status).toBe('failed');
  expect(debug.launch.launchAbortedCleanly).toBe(true);
  expect(debug.error.planPreserved).toBe(true);
  expect(debug.plan.agentPlans[0].waypoints.length).toBe(2);
  await page.locator('[data-action="return-planning"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
});

test('Regional Simulation Launch Remains Responsive', async ({ page }) => {
  const probe = await moduleProbe(page);
  expect(probe.regional.aborted).toBe(false);
  expect(probe.regional.depthCount).toBeGreaterThan(1);
  expect(probe.regional.scalarCount).toBeGreaterThan(0);
  expect(probe.glyphSummary.glyphInstanceCount).toBeGreaterThan(0);
  expect(probe.glyphSummary.glyphDrawCallCount).toBe(1);
});

test('Legacy Mission Launch Remains Compatible After FLOW-R2A', async ({ page }) => {
  const probe = await moduleProbe(page);
  expect(probe.legacy.aborted).toBe(false);
  expect(probe.legacy.depthCount).toBe(1);
});

test('Camera and Current Layer Changes Do Not Reallocate the Current Cube', async ({ page }) => {
  const probe = await moduleProbe(page);
  expect(probe.primaryCubeStats.buildCount).toBeLessThanOrEqual(1);
  expect(probe.renderCache.buildCount).toBeGreaterThanOrEqual(2);
  expect(probe.renderCache.hitCount).toBeGreaterThanOrEqual(1);
  expect(probe.glyphSummary.glyphBufferAllocationCount).toBe(1);
});

test('FLOW-R2A Simulation Launch Works From GitHub Pages Subpath', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A1Planning(page, { route: '/auv-glider-planner-game/' });
  await executeAndWaitForSimulation(page);
  const snapshot = await readLaunchSnapshot(page);
  expect(snapshot.pageUrl).toContain('/auv-glider-planner-game/');
  expect(snapshot.launch.status).toBe('interactive');
  expect(snapshot.launch.currentDepthCount).toBeGreaterThan(1);
  errors.assertClean();
});
test('Current Display Safe Mode Keeps Canonical Current Physics', async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A1Planning(page, { route: '/?currentDisplay=safe' });
  await executeAndWaitForSimulation(page);
  const snapshot = await readLaunchSnapshot(page);
  expect(snapshot.launch.status).toBe('interactive');
  expect(snapshot.launch.safeCurrentDisplayMode).toBe(true);
  expect(snapshot.launch.currentDepthCount).toBeGreaterThan(1);
  expect(snapshot.launch.currentCubeBuildCount).toBeLessThanOrEqual(1);
  expect(snapshot.launch.currentSamplerCreateCount).toBeLessThanOrEqual(1);
  expect(snapshot.launch.currentSampleCallCount).toBeGreaterThan(0);
  expect(snapshot.render.rendererSummary.layerVisibility.currentVectors).toBe(false);
  errors.assertClean();
});


test('FLOW-R2A.1 Full Headed Simulation Launch Stability Walkthrough', async ({ page }, testInfo) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const screenshots = [];
  const shot = async (name) => {
    const filePath = path.join(REVIEW_DIR, name);
    await page.screenshot({ path: filePath, fullPage: true });
    screenshots.push(filePath);
  };
  await setupFlowR2A1Planning(page);
  await shot('01-before-execute.png');
  const timing = await executeAndWaitForSimulation(page);
  await shot('02-first-interactive-simulation-frame.png');
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary?.glyphInstanceCount ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.rendererSummary?.currentGlyphInstanceCount ?? 0), { timeout: 15000 }).toBeGreaterThan(0);
  await shot('03-current-glyphs-loaded.png');
  await page.locator('#mission-console [data-action="play"]').click();
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 0), { timeout: 20000 }).toBe(true);
  await shot('04-simulation-running.png');
  await page.locator('#mission-console [data-action="pause"]').click();
  await page.locator('#mission-console [data-action="step"]').click();
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    state.ui.waterColumn.activeDepthLayerId = 'deep';
    state.ui.waterColumn.currentDisplayMode = 'allLayers';
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    scene?.refresh?.();
  });
  await page.mouse.move(960, 540);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(1120, 610, { steps: 8 });
  await page.mouse.up({ button: 'right' });
  await page.locator('#mission-console [data-action="play"]').click();
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.selectedAgentDepthMeters ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.maxDepthMeters ?? 0) >= 0), { timeout: 10000 }).toBe(true);
  await shot('05-depth-current-change.png');
  await page.locator('#mission-console [data-action="planning"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 15000 }).toBe(true);
  await shot('06-return-replan.png');
  await executeAndWaitForSimulation(page);
  await shot('07-second-launch.png');
  const second = await readLaunchSnapshot(page);
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0), { timeout: 15000 }).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0), { timeout: 15000 }).toBe(0);
  await shot('08-main-menu-cleanup.png');
  const qa = {
    browserName: testInfo.project.name,
    missionId: second.launch?.missionId,
    scenarioId: second.launch?.scenarioId,
    currentFieldDimensions: {
      east: second.launch?.currentEastCount,
      north: second.launch?.currentNorthCount,
      depth: second.launch?.currentDepthCount,
      time: second.launch?.currentTimeCount,
      scalar: second.launch?.currentScalarCount
    },
    approximateMemory: {
      currentBytes: second.launch?.estimatedCurrentBytes,
      renderBufferBytes: second.launch?.estimatedRenderBufferBytes
    },
    launchStageTimings: second.launch?.stageDurationsMs,
    totalLaunchDurationMs: second.launch?.totalLaunchDurationMs,
    wallClockLaunchDurationMs: timing.interactiveAt - timing.executeClickedAt,
    heartbeatGapMs: second.launch?.maximumHeartbeatGapMs,
    longTaskCount: second.launch?.longTaskCount,
    counters: {
      build: second.launch?.currentCubeBuildCount,
      normalize: second.launch?.currentCubeNormalizeCount,
      digest: second.launch?.currentCubeDigestCount,
      sampler: second.launch?.currentSamplerCreateCount,
      samples: second.launch?.currentSampleCallCount,
      glyphLayerBuilds: second.launch?.currentGlyphLayerBuildCount,
      glyphBufferAllocations: second.launch?.currentGlyphBufferAllocationCount,
      glyphBufferUpdates: second.launch?.currentGlyphBufferUpdateCount
    },
    rendererCounts: {
      activeRendererCount: second.launch?.activeRendererCount,
      activeRafCount: second.launch?.activeRafCount,
      renderSubmissionCount: second.launch?.renderSubmissionCount
    },
    glyph: second.render?.rendererSummary ?? null,
    pageErrors: errors.unexpected(),
    screenshots
  };
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(qa, null, 2));
  errors.assertClean();
});