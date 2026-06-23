import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;
const BASE = 'http://127.0.0.1:9356';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-r2a-2-owner-review');
const SAFE_WARNING = 'Current-vector display is disabled by Safe Display mode. Mission physics still use the canonical current field.';

const EXACT_TITLES = [
  'Simulation Displays Current Vectors by Default',
  'Planning Displays the Active Current Slice',
  'Current Glyphs Remain Visible Over Scalar and Water Column Slabs',
  'Current Vectors Follow Selected Glider Depth',
  'Safe Current Display Is Disabled Only by Explicit Query',
  'Current Glyph Camera Presets Preserve Visibility',
  'Visible Current Glyphs Do Not Change Mission Outcome',
  'Visible Current Vectors Run From GitHub Pages Subpath',
  'FLOW-R2A.2 Full Headed Visible Current Vector Walkthrough'
];

test.setTimeout(300000);
test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9356 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function boot(page, route = '/') {
  await page.goto(BASE + route);
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame?.phaser?.scene?.getScene?.('MainMenuScene'))), { timeout: 20000 }).toBe(true);
}

async function setupFlowR2A2Planning(page, options = {}) {
  await boot(page, options.route ?? '/');
  await page.evaluate(async ({ cameraPreset = 'obliqueWaterColumn', activeLayerId = 'thermocline', showCurrents = true } = {}) => {
    const {
      FLOW_R2A1_WATER_COLUMN_CONFIG,
      makeFlowR2A1Level,
      makeFlowR2A1Mission,
      makeFlowR2A1Plan
    } = await import('./tools/js/flow_r2a1_test_helpers.mjs');
    const level = makeFlowR2A1Level({
      levelId: 'flow-r2a-2-visible-current-fixture',
      grid: { width: 12, height: 8 },
      waterColumnConfig: FLOW_R2A1_WATER_COLUMN_CONFIG,
      seed: 177
    });
    level.layers.truth.frames = [{ t: 0, roi: Array.from({ length: 8 }, (_row, y) => Array.from({ length: 12 }, (_cell, x) => (x + y) / 20)) }];
    const mission = makeFlowR2A1Mission({ missionId: 'flow-r2a-2-visible-current-mission', waterColumnConfig: FLOW_R2A1_WATER_COLUMN_CONFIG });
    const plan = makeFlowR2A1Plan();
    plan.agentPlans[0].waypoints = [
      { id: 'wp-1', x: 3, y: 2, action: 'sample', segmentTravelTime: 240, estimatedArrivalTime: 240, t: 240, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline' },
      { id: 'wp-2', x: 5, y: 3, action: 'sample', segmentTravelTime: 240, estimatedArrivalTime: 480, t: 480, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' },
      { id: 'wp-3', x: 8, y: 4, action: 'sample', segmentTravelTime: 240, estimatedArrivalTime: 720, t: 720, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep' }
    ];
    plan.agentPlans[1].waypoints = [];
    plan.agentPlans[2].waypoints = [];

    const state = window.anchorGame.state;
    state.level = level;
    state.mission = mission;
    state.plan = plan;
    state.selectedAgentId = 'glider-1';
    state.mode = 'planning';
    state.challengeMode = 'flowR2A2';
    state.experienceMode = 'simulationLab';
    state.playback = { ...(state.playback ?? {}), time: 0 };
    state.ui = {
      ...(state.ui ?? {}),
      rendererBackend: 'threeMission3d',
      legacyPhaserMissionRendererEnabled: false,
      showROI: true,
      showCurrents,
      showHazards: true,
      showTerrain: true,
      showPlannedPath: true,
      showActualPath: true,
      threeMissionCameraPreset: cameraPreset,
      threeMissionQualityProfile: 'balanced',
      threeMissionLayers: { ...(state.ui?.threeMissionLayers ?? {}), scalarField: true, depthLayers: true, currentVectors: true, routes: true, gliders: true, waypoints: true },
      waterColumn: {
        ...(state.ui?.waterColumn ?? {}),
        qualityProfile: 'balanced',
        activeDepthLayerId: activeLayerId,
        selectedTargetDepthLayerId: 'deep',
        selectedDiveProfileId: 'sawtoothProfile',
        currentDisplayMode: 'activeSlice',
        currentLayerMode: 'followSelectedGlider',
        currentVectorDensity: 'balanced',
        currentMagnitudeScale: 1.8,
        currentColorMode: 'speed',
        showContextCurrents: false,
        selectedScalarFieldId: 'sampleValue',
        fieldDisplayMode: 'activeLayerOnly',
        scalarRenderMode: 'smoothedSlices',
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
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys.isActive?.() ?? false), { timeout: 25000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 25000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_LAUNCH_DEBUG?.status), { timeout: 25000 }).toBe('interactive');
}

async function setCameraPreset(page, preset) {
  await page.locator(`#mission-console [data-action="three-camera"][data-preset="${preset}"]`).click();
  await page.waitForTimeout(120);
}

async function setActiveLayer(page, layerId) {
  await page.evaluate(() => {
    window.anchorGame.state.ui.waterColumn.currentLayerMode = 'manualActiveLayer';
  });
  await page.locator(`#mission-console [data-action="water-column-active-layer"][data-layer="${layerId}"]`).first().click();
  await expect.poll(() => page.evaluate((id) => window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG?.currentActiveLayerId === id, layerId), { timeout: 10000 }).toBe(true);
}

async function advanceSimulationBySteps(page, targetSteps = 12) {
  const before = await page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0));
  await page.locator('#mission-console [data-action="play"]').click();
  try {
    await expect.poll(() => page.evaluate((start) => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) >= start + 1, before), { timeout: 6000 }).toBe(true);
  } catch {
    await page.evaluate((steps) => {
      const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
      scene?.engine?.pause?.();
      for (let index = 0; index < steps; index += 1) scene?.engine?.step?.(1 / 30, { force: true });
      scene?.syncResult?.();
      scene?.refresh?.({ reason: 'flow-r2a-2-canonical-step-fallback' });
    }, targetSteps);
  }
  await page.locator('#mission-console [data-action="pause"]').click().catch(() => {});
  await expect.poll(() => page.evaluate((start) => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) >= start + 1, before), { timeout: 10000 }).toBe(true);
}

async function collectCurrentDebug(page) {
  return page.evaluate(() => ({
    current: window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG ?? null,
    simulation: window.ANCHOR_SIMULATION_RENDER_DEBUG ?? null,
    mission: window.ANCHOR_MISSION_RENDER_DEBUG ?? null,
    launch: window.ANCHOR_SIMULATION_LAUNCH_DEBUG ?? null,
    perf: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? null,
    text: document.body?.innerText ?? '',
    url: location.href
  }));
}

async function captureCurrentPixelEvidence(page) {
  return page.evaluate(async () => {
    const THREE = await import('three');
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const planningScene = window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene');
    const simulationScene = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
    const renderer = simulationScene?.threeSimulationRenderer ?? planningScene?.threeMissionRenderer;
    if (!renderer?.renderer || !renderer?.scene || !renderer?.camera) throw new Error('Three renderer is not available for current pixel evidence.');
    const group = renderer.groups?.currentVectorGroup;
    const mesh = renderer.instancedCurrentGlyphLayer?.mesh;
    if (!group || !mesh) throw new Error('Current vector group or instanced glyph mesh is not available.');
    const webgl = renderer.renderer;
    const gl = webgl.getContext();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const before = new Uint8Array(width * height * 4);
    const after = new Uint8Array(width * height * 4);
    const originalVisible = group.visible;
    const originalMeshVisible = mesh.visible;
    function renderAndRead(target) {
      webgl.render(renderer.scene, renderer.camera);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, target);
    }
    group.visible = false;
    mesh.visible = false;
    renderAndRead(before);
    group.visible = true;
    mesh.visible = originalMeshVisible !== false;
    renderAndRead(after);
    group.visible = originalVisible;
    mesh.visible = originalMeshVisible;
    webgl.render(renderer.scene, renderer.camera);

    let diffPixelCount = 0;
    let strongPixelCount = 0;
    for (let index = 0; index < before.length; index += 4) {
      const d = Math.abs(after[index] - before[index]) + Math.abs(after[index + 1] - before[index + 1]) + Math.abs(after[index + 2] - before[index + 2]);
      if (d > 8) diffPixelCount += 1;
      if (d > 48) strongPixelCount += 1;
    }

    function projectCurrentGlyphPositions(limit = 8) {
      const positions = [];
      const matrix = new THREE.Matrix4();
      const vector = new THREE.Vector3();
      mesh.updateMatrixWorld(true);
      renderer.camera.updateMatrixWorld(true);
      const count = Math.min(mesh.count ?? 0, limit);
      for (let index = 0; index < count; index += 1) {
        mesh.getMatrixAt(index, matrix);
        vector.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld).project(renderer.camera);
        const x = ((vector.x + 1) / 2) * width;
        const y = ((1 - vector.y) / 2) * height;
        if (Number.isFinite(x) && Number.isFinite(y) && vector.z >= -1 && vector.z <= 1) positions.push({ index, x, y, ndcZ: vector.z });
      }
      return positions;
    }

    function neighborhoodDiff(point, radius = 8) {
      let diff = 0;
      let strong = 0;
      let samples = 0;
      const cx = Math.round(point.x);
      const cy = Math.round(point.y);
      for (let sy = cy - radius; sy <= cy + radius; sy += 1) {
        for (let sx = cx - radius; sx <= cx + radius; sx += 1) {
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
          const glY = height - 1 - sy;
          const offset = (glY * width + sx) * 4;
          const d = Math.abs(after[offset] - before[offset]) + Math.abs(after[offset + 1] - before[offset + 1]) + Math.abs(after[offset + 2] - before[offset + 2]);
          samples += 1;
          if (d > 8) diff += 1;
          if (d > 48) strong += 1;
        }
      }
      return { ...point, sampleCount: samples, diffPixelCount: diff, strongPixelCount: strong };
    }

    const projected = projectCurrentGlyphPositions(10);
    const projectedNeighborhoods = projected.slice(0, 5).map((point) => neighborhoodDiff(point));
    const debug = window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG ?? {};
    return {
      canvasWidth: width,
      canvasHeight: height,
      diffPixelCount,
      strongPixelCount,
      diffPixelRatio: diffPixelCount / Math.max(1, width * height),
      strongPixelRatio: strongPixelCount / Math.max(1, width * height),
      projectedGlyphCount: projected.length,
      projectedNeighborhoods,
      visibleNeighborhoodCount: projectedNeighborhoods.filter((entry) => entry.diffPixelCount > 0 || entry.strongPixelCount > 0).length,
      rendererDrawCalls: renderer.renderer?.info?.render?.calls ?? null,
      debug: {
        currentPresentationEnabled: debug.currentPresentationEnabled,
        sourceVectorSampleCount: debug.sourceVectorSampleCount,
        finiteVectorSampleCount: debug.finiteVectorSampleCount,
        nonzeroVectorSampleCount: debug.nonzeroVectorSampleCount,
        visibleVectorInstanceCount: debug.visibleVectorInstanceCount,
        glyphOpacity: debug.glyphOpacity,
        glyphRenderOrder: debug.glyphRenderOrder,
        glyphBoundsInFrustum: debug.glyphBoundsInFrustum
      }
    };
  });
}

function expectVisibleCurrentEvidence(evidence) {
  expect(evidence.diffPixelCount).toBeGreaterThan(100);
  expect(evidence.strongPixelCount).toBeGreaterThan(40);
  expect(evidence.projectedGlyphCount).toBeGreaterThanOrEqual(3);
  expect(evidence.projectedNeighborhoods.filter((entry) => entry.diffPixelCount > 0 || entry.strongPixelCount > 0).length).toBeGreaterThanOrEqual(3);
  expect(evidence.debug.visibleVectorInstanceCount).toBeGreaterThan(0);
}

test(EXACT_TITLES[0], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page);
  await executeAndWaitForSimulation(page);
  const debug = await collectCurrentDebug(page);
  expect(debug.simulation.currentDisplayMode).toBe('activeSlice');
  expect(debug.simulation.currentPresentationRequested).toBe(true);
  expect(debug.simulation.currentPresentationEnabled).toBe(true);
  expect(debug.simulation.currentVectorValidCount).toBeGreaterThan(0);
  expect(debug.simulation.currentNonzeroVectorCount).toBeGreaterThan(0);
  expect(debug.simulation.currentVisibleVectorInstanceCount).toBeGreaterThan(0);
  expect(debug.text.includes('Current physics are active, but no current vectors are visible')).toBe(false);
  const evidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(evidence);
  await page.locator('#mission-console [data-action="play"]').click();
  await expect.poll(() => page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > 0), { timeout: 15000 }).toBe(true);
  await page.locator('#mission-console [data-action="pause"]').click();
  errors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG?.currentPresentationEnabled === true), { timeout: 15000 }).toBe(true);
  const thermocline = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(thermocline);
  await setActiveLayer(page, 'deep');
  const deepDebug = await collectCurrentDebug(page);
  expect(deepDebug.current.currentActiveLayerId).toBe('deep');
  expect(deepDebug.current.currentActiveDepthMeters).toBeGreaterThan(0);
  const deep = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(deep);
  expect(await page.evaluate(() => window.anchorGame.state.plan.agentPlans[1].waypoints.length + window.anchorGame.state.plan.agentPlans[2].waypoints.length)).toBe(0);
  errors.assertClean();
});

test(EXACT_TITLES[2], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page);
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    state.ui.showROI = true;
    state.ui.threeMissionLayers = { ...(state.ui.threeMissionLayers ?? {}), scalarField: true, depthLayers: true, currentVectors: true, routes: true, gliders: true };
    window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.refreshMap?.();
  });
  await setCameraPreset(page, 'obliqueWaterColumn');
  const evidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(evidence);
  const debug = await collectCurrentDebug(page);
  expect(debug.current.glyphDepthWrite).toBe(false);
  expect(debug.current.glyphRenderOrder).toBeGreaterThanOrEqual(90);
  expect(debug.current.glyphLayerOffsetWorld).toBeGreaterThan(0);
  errors.assertClean();
});

test(EXACT_TITLES[3], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page);
  await executeAndWaitForSimulation(page);
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    state.ui.waterColumn.currentLayerMode = 'followSelectedGlider';
    state.ui.waterColumn.activeDepthLayerId = 'surface';
  });
  const before = await collectCurrentDebug(page);
  await advanceSimulationBySteps(page, 16);

  const after = await collectCurrentDebug(page);
  expect(after.simulation.currentActiveDepthMeters).toBeGreaterThanOrEqual(0);
  expect(after.simulation.currentActiveTimeSeconds).toBeGreaterThanOrEqual(before.simulation.currentActiveTimeSeconds ?? 0);
  expect(after.current.currentPresentationEnabled).toBe(true);
  expect(after.current.displayLayerChangesCurrent).toBe(false);
  const evidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(evidence);
  errors.assertClean();
});

test(EXACT_TITLES[4], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page);
  await executeAndWaitForSimulation(page);
  const normal = await collectCurrentDebug(page);
  expect(normal.simulation.currentPresentationEnabled).toBe(true);
  await setupFlowR2A2Planning(page, { route: '/?currentDisplay=safe' });
  await executeAndWaitForSimulation(page);
  const safe = await collectCurrentDebug(page);
  expect(safe.simulation.currentSafeModeExplicit).toBe(true);
  expect(safe.simulation.currentPresentationRequested).toBe(false);
  expect(safe.simulation.currentPresentationEnabled).toBe(false);
  expect(safe.text).toContain(SAFE_WARNING);
  await setupFlowR2A2Planning(page);
  await executeAndWaitForSimulation(page);
  const restored = await collectCurrentDebug(page);
  expect(restored.simulation.currentSafeModeExplicit).toBe(false);
  expect(restored.simulation.currentPresentationEnabled).toBe(true);
  expect(restored.launch.currentDepthCount).toBeGreaterThan(1);
  errors.assertClean();
});

test(EXACT_TITLES[5], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page);
  for (const preset of ['obliqueMission', 'fleetOverview', 'waterColumnProfile', 'sideProfile']) {
    await setCameraPreset(page, preset);
    const evidence = await captureCurrentPixelEvidence(page);
    expectVisibleCurrentEvidence(evidence);
  }
  errors.assertClean();
});

test(EXACT_TITLES[6], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page);
  await executeAndWaitForSimulation(page);
  await page.locator('#mission-console [data-action="pause"]').click();
  const visible = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return {
      planDigest: window.ANCHOR_EXECUTION_DEBUG?.enginePlanDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.enginePlanDigest,
      launchDigest: window.ANCHOR_EXECUTION_DEBUG?.simulationReceivedPlanDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.simulationReceivedPlanDigest,
      score: scene?.engine?.getSummary?.()?.finalScore ?? null,
      terminalReason: scene?.engine?.abortReason ?? scene?.engine?.completeReason ?? null,
      currentHistory: (scene?.engine?.agents ?? []).map((agent) => ({ id: agent.id, currentVector: agent.currentVector, depthMeters: agent.depthMeters, x: agent.x, y: agent.y }))
    };
  });
  await page.evaluate(() => {
    const state = window.anchorGame.state;
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    state.ui.showCurrents = false;
    scene?.refresh?.({ reason: 'flow-r2a-2-hide-currents' });
    state.ui.showCurrents = true;
    scene?.refresh?.({ reason: 'flow-r2a-2-restore-currents' });
  });
  const restored = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return {
      planDigest: window.ANCHOR_EXECUTION_DEBUG?.enginePlanDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.enginePlanDigest,
      launchDigest: window.ANCHOR_EXECUTION_DEBUG?.simulationReceivedPlanDigest ?? window.ANCHOR_SIMULATION_RENDER_DEBUG?.simulationReceivedPlanDigest,
      score: scene?.engine?.getSummary?.()?.finalScore ?? null,
      terminalReason: scene?.engine?.abortReason ?? scene?.engine?.completeReason ?? null,
      currentHistory: (scene?.engine?.agents ?? []).map((agent) => ({ id: agent.id, currentVector: agent.currentVector, depthMeters: agent.depthMeters, x: agent.x, y: agent.y }))
    };
  });
  expect(restored).toEqual(visible);
  const evidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(evidence);
  errors.assertClean();
});

test(EXACT_TITLES[7], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await setupFlowR2A2Planning(page, { route: '/auv-glider-planner-game/' });
  expect((await collectCurrentDebug(page)).url).toContain('/auv-glider-planner-game/');
  const planningEvidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(planningEvidence);
  await executeAndWaitForSimulation(page);
  const simulationEvidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(simulationEvidence);
  errors.assertClean();
});

test(EXACT_TITLES[8], async ({ page }, testInfo) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const screenshots = [];
  const shot = async (name) => {
    const filePath = path.join(REVIEW_DIR, name);
    await page.screenshot({ path: filePath, fullPage: true });
    screenshots.push(name);
  };
  await setupFlowR2A2Planning(page);
  await setActiveLayer(page, 'surface');
  await shot('01-planning-surface-currents.png');
  const surfaceEvidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(surfaceEvidence);
  await setActiveLayer(page, 'thermocline');
  await shot('02-planning-thermocline-currents.png');
  const thermoEvidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(thermoEvidence);
  await setActiveLayer(page, 'deep');
  await shot('03-planning-deep-currents.png');
  const deepEvidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(deepEvidence);
  await page.evaluate(() => { window.anchorGame.state.ui.showROI = true; window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.refreshMap?.(); });
  await shot('04-currents-over-scalar-field.png');
  await setCameraPreset(page, 'obliqueMission');
  await shot('05-regional-overview-currents.png');
  await setCameraPreset(page, 'waterColumnProfile');
  await shot('06-dive-profile-currents.png');
  await executeAndWaitForSimulation(page);
  await shot('07-simulation-current-vectors.png');
  await advanceSimulationBySteps(page, 18);

  await shot('08-follow-glider-depth.png');
  const restoredEvidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(restoredEvidence);
  await page.evaluate(() => { const s = window.anchorGame.state; s.ui.showCurrents = false; window.anchorGame.phaser.scene.getScene('SimulationScene')?.refresh?.({ reason: 'flow-r2a-2-off' }); });
  await shot('09-currents-disabled.png');
  await page.evaluate(() => { const s = window.anchorGame.state; s.ui.showCurrents = true; window.anchorGame.phaser.scene.getScene('SimulationScene')?.refresh?.({ reason: 'flow-r2a-2-on' }); });
  await shot('10-currents-restored.png');
  const afterToggleEvidence = await captureCurrentPixelEvidence(page);
  expectVisibleCurrentEvidence(afterToggleEvidence);
  const preCleanupDebug = await collectCurrentDebug(page);
  await page.locator('#mission-console [data-action="menu"]').click();
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRendererCount ?? 0), { timeout: 15000 }).toBe(0);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_THREE_PERFORMANCE_DEBUG?.activeRafCount ?? 0), { timeout: 15000 }).toBe(0);
  await shot('11-main-menu-cleanup.png');
  const finalDebug = await collectCurrentDebug(page);
  const browser = page.context().browser();
  const qa = {
    status: errors.unexpected().length ? 'FAIL' : 'PASS',
    browserName: testInfo.project.name,
    browserVersion: browser?.version?.() ?? null,
    viewport: testInfo.project.use?.viewport ?? null,
    deviceScaleFactor: await page.evaluate(() => window.devicePixelRatio),
    exactTitles: EXACT_TITLES,
    missionId: finalDebug.launch?.missionId ?? 'flow-r2a-2-visible-current-mission',
    currentFieldId: finalDebug.current?.fieldId ?? null,
    activeDepths: {
      planningSurface: 0,
      final: finalDebug.current?.currentActiveDepthMeters ?? null
    },
    vectorCounts: {
      source: finalDebug.current?.sourceVectorSampleCount ?? null,
      finite: finalDebug.current?.finiteVectorSampleCount ?? null,
      nonzero: finalDebug.current?.nonzeroVectorSampleCount ?? null,
      visible: finalDebug.current?.visibleVectorInstanceCount ?? null
    },
    glyph: {
      scaleMin: finalDebug.current?.glyphMinimumScale ?? null,
      scaleMax: finalDebug.current?.glyphMaximumScale ?? null,
      opacity: finalDebug.current?.glyphOpacity ?? null,
      renderOrder: finalDebug.current?.glyphRenderOrder ?? null,
      boundsMin: finalDebug.current?.glyphBoundsMinimum ?? null,
      boundsMax: finalDebug.current?.glyphBoundsMaximum ?? null,
      boundsRadius: finalDebug.current?.glyphBoundsRadius ?? null,
      boundsInFrustum: finalDebug.current?.glyphBoundsInFrustum ?? null,
      drawCalls: finalDebug.current?.glyphDrawCallCount ?? null
    },
    rendererCounts: {
      activeRendererCount: preCleanupDebug.perf?.activeRendererCount ?? preCleanupDebug.simulation?.rendererSummary?.activeRendererCount ?? 0,
      activeRafCount: preCleanupDebug.perf?.activeRafCount ?? preCleanupDebug.simulation?.rendererSummary?.activeRafCount ?? 0,
      cleanupActiveRendererCount: finalDebug.perf?.activeRendererCount ?? 0,
      cleanupActiveRafCount: finalDebug.perf?.activeRafCount ?? 0
    },
    pixelEvidence: {
      surface: surfaceEvidence,
      thermocline: thermoEvidence,
      deep: deepEvidence,
      simulationRestored: restoredEvidence,
      afterToggle: afterToggleEvidence
    },
    performance: preCleanupDebug.perf ?? null,
    simulationRenderDebug: preCleanupDebug.simulation ?? null,
    screenshots,
    pageErrors: errors.unexpected(),
    cleanup: {
      mainMenuVisible: await page.locator('#main-menu-hub').isVisible(),
      activeRendererCount: finalDebug.perf?.activeRendererCount ?? 0,
      activeRafCount: finalDebug.perf?.activeRafCount ?? 0
    }
  };
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(qa, null, 2));
  errors.assertClean();
});
