import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;
const BASE = 'http://127.0.0.1:9364';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-r2a-4-owner-review');
const SAFE_WARNING = 'Current-vector display is disabled by Safe Display mode. Mission physics still use the canonical current field.';

const EXACT_TITLES = [
  'Normal Generated Challenge Displays Current Vectors in Planning',
  'Normal Generated Challenge Displays Current Vectors in Simulation',
  'Current Visibility Survives Planning to Simulation Transition',
  'Current Visibility Survives Return Replan and Second Execute',
  'Current Display Is Not Limited to the Regional Benchmark Fixture',
  'Idle Optional Gliders Do Not Disable Current Presentation',
  'Safe Current Display Requires an Explicit Query',
  'Default and Next Runtime Shells Use Shared Current Presentation Contracts',
  'Current Presentation Failure Shows a Visible Recovery Reason',
  'Production Current Vectors Run From GitHub Pages Subpath',
  'FLOW-R2A.4 Full Headed Production Current Visibility Walkthrough'
];

test.setTimeout(300000);
test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9364 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function boot(page, route = '/') {
  await page.goto(BASE + route);
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame)), { timeout: 30000 }).toBe(true);
}

async function startNormalChallengePlanning(page, options = {}) {
  await boot(page, options.route ?? '/');
  await page.evaluate(() => {
    const mainMenu = window.anchorGame?.phaser?.scene?.getScene?.('MainMenuScene');
    if (!mainMenu?.startRandomChallenge) throw new Error('MainMenuScene.startRandomChallenge is not available.');
    mainMenu.startRandomChallenge('perfectKnowledge', 'challenge');
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionBriefingScene')?.sys?.isActive?.() ?? false), { timeout: 30000 }).toBe(true);
  await page.evaluate(() => {
    const briefing = window.anchorGame?.phaser?.scene?.getScene?.('MissionBriefingScene');
    if (!briefing?.startPlanning) throw new Error('MissionBriefingScene.startPlanning is not available.');
    briefing.startPlanning();
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() ?? false), { timeout: 30000 }).toBe(true);
  await configureSingleActiveRoute(page, options);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true), { timeout: 30000 }).toBe(true);
  if (options.expectCurrentEnabled !== false) {
    await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPresentationEnabled === true), { timeout: 30000 }).toBe(true);
  } else {
    await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPresentationEnabled === false), { timeout: 30000 }).toBe(true);
  }
}

async function configureSingleActiveRoute(page, options = {}) {
  await page.evaluate(async ({ currentDisplayMode = 'activeSlice', forceFailure = false } = {}) => {
    const { getDeploymentZonesForAgent, setSelectedStart } = await import('./src/core/deployment/DeploymentZones.js');
    const { normalizePlan } = await import('./src/core/planning/WaypointPlan.js');
    const { canPlaceWaypoint } = await import('./src/core/planning/WaypointPlacementGuard.js');

    const state = window.anchorGame.state;
    const level = state.level;
    const mission = state.mission;
    const activeAgent = mission.agents[0];
    const activeAgentId = activeAgent.id;
    state.selectedAgentId = activeAgentId;
    state.ui = {
      ...(state.ui ?? {}),
      rendererBackend: 'threeMission3d',
      legacyPhaserMissionRendererEnabled: false,
      showROI: true,
      showCurrents: true,
      showHazards: true,
      showTerrain: true,
      threeMissionCameraPreset: 'obliqueWaterColumn',
      threeMissionQualityProfile: 'balanced',
      threeMissionLayers: { ...(state.ui?.threeMissionLayers ?? {}), scalarField: true, depthLayers: true, currentVectors: true, routes: true, gliders: true, waypoints: true },
      waterColumn: {
        ...(state.ui?.waterColumn ?? {}),
        qualityProfile: 'balanced',
        activeDepthLayerId: 'thermocline',
        selectedTargetDepthLayerId: 'deep',
        selectedDiveProfileId: 'sawtoothProfile',
        currentDisplayMode,
        currentLayerMode: 'followSelectedGlider',
        currentVectorDensity: 'balanced',
        currentMagnitudeScale: 1.8,
        currentColorMode: 'speed',
        showContextCurrents: false,
        selectedScalarFieldId: 'sampleValue',
        fieldDisplayMode: 'activeLayerOnly',
        verticalDisplayMode: 'physicalDepth',
        verticalExaggeration: 1.6
      }
    };
    window.__ANCHOR_TEST_FORCE_CURRENT_GLYPH_FAILURE = Boolean(forceFailure);

    const selectedStart = getDeploymentZonesForAgent(level, mission, activeAgentId)?.[0]?.cells?.[0] ?? activeAgent.deployment?.selectedStart ?? activeAgent.start;
    const rawPlan = {
      schemaVersion: '2.0',
      type: 'anchor.plan',
      coordinateProfileId: 'continuousGridV1',
      fieldSamplingProfileId: 'continuousTrilinearV1',
      levelId: level.levelId,
      missionId: mission.missionId,
      meta: { name: 'FLOW-R2A.4 routed Glider 1 with idle controls' },
      agentPlans: mission.agents.map((agent, index) => ({
        agentId: agent.id,
        selectedStart: index === 0 ? selectedStart : null,
        diveProfileId: index === 0 ? 'sawtoothProfile' : 'surfaceOnly',
        targetDepthLayerId: index === 0 ? 'deep' : 'surface',
        waypoints: []
      }))
    };
    state.plan = normalizePlan(rawPlan, level, mission);
    const selection = setSelectedStart(level, mission, state.plan, activeAgentId, selectedStart);
    if (!selection.valid) throw new Error(`Could not select active glider start: ${selection.message}`);
    const activePlan = state.plan.agentPlans.find((agentPlan) => agentPlan.agentId === activeAgentId);
    const candidates = [];
    const grid = level.world.grid;
    for (let y = 0; y < grid.height; y += 1) {
      for (let x = 0; x < grid.width; x += 1) {
        if (level.layers?.terrain?.[y]?.[x]) continue;
        const distance = Math.hypot(x - Number(selectedStart.x), y - Number(selectedStart.y));
        if (distance >= 2 && distance <= 10) candidates.push({ x: x + 0.35, y: y + 0.35, distance });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const selectedTargets = [];
    const rejected = [];
    for (const candidate of candidates) {
      const placement = canPlaceWaypoint(state, activeAgentId, { x: candidate.x, y: candidate.y, action: 'sample' });
      if (!placement.allowed) {
        rejected.push(`${Math.round(candidate.x)},${Math.round(candidate.y)}:${placement.reason}`);
        continue;
      }
      if (selectedTargets.some((target) => Math.hypot(target.x - candidate.x, target.y - candidate.y) < 1.25)) continue;
      selectedTargets.push({ x: candidate.x, y: candidate.y, placement });
      const arrivalTime = Number(placement.estimate?.arrivalTime ?? selectedTargets.length * 120);
      activePlan.waypoints.push({
        id: `flow-r2a4-browser-wp-${selectedTargets.length}`,
        x: candidate.x,
        y: candidate.y,
        action: 'sample',
        t: arrivalTime,
        estimatedArrivalTime: arrivalTime,
        segmentTravelTime: Number(placement.estimate?.segment?.estimatedTravelTime ?? 120),
        diveProfileId: 'sawtoothProfile',
        targetDepthLayerId: selectedTargets.length === 1 ? 'thermocline' : 'deep',
        validationRadius: 0.65
      });
      if (selectedTargets.length >= 2) break;
    }
    if (selectedTargets.length < 2) throw new Error(`Could not find two executable route targets. Rejected ${rejected.slice(0, 10).join('; ')}`);
    state.plan = normalizePlan(state.plan, level, mission);
    state.plan.agentPlans.filter((agentPlan) => agentPlan.agentId !== activeAgentId).forEach((agentPlan) => { agentPlan.waypoints = []; agentPlan.selectedStart = null; });
    state.mode = 'planning';
    state.challengeMode = 'perfectKnowledge';
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    if (forceFailure && scene?.threeMissionRenderer?.presentationCache) scene.threeMissionRenderer.presentationCache.lastRenderedCurrentFieldFrameId = null;
    scene?.refreshPanels?.();
    scene?.refreshMap?.();
    scene?.refreshThreeMissionRenderer?.({ reason: 'flow-r2a4-route-configured' });
  }, options);
}

async function executeAndWaitForSimulation(page) {
  await page.locator('#mission-console [data-action="execute"]').click();
  try {
    await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene')?.sys?.isActive?.() ?? false), { timeout: 30000 }).toBe(true);
  } catch (error) {
    const debug = await page.evaluate(() => ({
      execution: window.ANCHOR_EXECUTION_DEBUG ?? null,
      missionDebug: window.ANCHOR_MISSION_RENDER_DEBUG ?? null,
      currentPresentation: window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? null,
      routeAudit: window.anchorGame?.state?.ui?.routeAudit ?? null,
      consoleText: document.querySelector('#mission-console')?.innerText ?? document.body?.innerText ?? ''
    }));
    throw new Error(`${error.message}\nFLOW_R2A4_EXECUTE_DEBUG ${JSON.stringify(debug, null, 2)}`);
  }
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.phase === 'simulation'), { timeout: 30000 }).toBe(true);
}

async function advanceSimulation(page, steps = 10) {
  const before = await page.evaluate(() => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0));
  await page.locator('#mission-console [data-action="play"]').click().catch(() => {});
  try {
    await expect.poll(() => page.evaluate((start) => Number(window.ANCHOR_SIMULATION_RENDER_DEBUG?.engineStepCount ?? 0) > start, before), { timeout: 12000 }).toBe(true);
  } catch {
    await page.evaluate((stepCount) => {
      const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
      scene?.engine?.pause?.();
      for (let index = 0; index < stepCount; index += 1) scene?.engine?.stepOnce?.();
      scene?.syncResult?.();
      scene?.refresh?.({ reason: 'flow-r2a4-step-fallback' });
    }, steps);
  }
  await page.locator('#mission-console [data-action="pause"]').click().catch(() => {});
}

async function collectCurrentDebug(page) {
  return page.evaluate(() => ({
    presentation: window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? null,
    current: window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG ?? null,
    mission: window.ANCHOR_MISSION_RENDER_DEBUG ?? null,
    simulation: window.ANCHOR_SIMULATION_RENDER_DEBUG ?? null,
    perf: window.ANCHOR_THREE_PERFORMANCE_DEBUG ?? null,
    text: document.body?.innerText ?? '',
    url: location.href,
    route: window.anchorGame?.state?.plan?.agentPlans?.map?.((agentPlan) => ({ agentId: agentPlan.agentId, waypointCount: agentPlan.waypoints?.length ?? 0, selectedStart: agentPlan.selectedStart ?? null })) ?? []
  }));
}

async function collectCurrentPixelEvidence(page) {
  return page.evaluate(async () => {
    const THREE = await import('three');
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const workspace = window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene');
    const simulation = window.anchorGame?.phaser?.scene?.getScene?.('SimulationScene');
    const renderer = simulation?.threeSimulationRenderer ?? workspace?.threeMissionRenderer;
    if (!renderer?.renderer || !renderer?.scene || !renderer?.camera) throw new Error('Three renderer is not ready for current evidence.');
    const group = renderer.groups?.currentVectorGroup;
    const mesh = renderer.instancedCurrentGlyphLayer?.mesh;
    if (!group || !mesh) throw new Error('Current glyph group or mesh is not present.');
    const webgl = renderer.renderer;
    const gl = webgl.getContext();
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const before = new Uint8Array(width * height * 4);
    const after = new Uint8Array(width * height * 4);
    const originalGroupVisible = group.visible;
    const originalMeshVisible = mesh.visible;
    const originalAutoClear = webgl.autoClear;
    function read(target) {
      webgl.autoClear = true;
      webgl.clear(true, true, true);
      webgl.render(renderer.scene, renderer.camera);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, target);
    }
    group.visible = false;
    mesh.visible = false;
    read(before);
    group.visible = true;
    mesh.visible = originalMeshVisible !== false;
    read(after);
    group.visible = originalGroupVisible;
    mesh.visible = originalMeshVisible;
    webgl.autoClear = originalAutoClear;
    webgl.render(renderer.scene, renderer.camera);

    let diffPixelCount = 0;
    let strongPixelCount = 0;
    for (let index = 0; index < before.length; index += 4) {
      const delta = Math.abs(after[index] - before[index]) + Math.abs(after[index + 1] - before[index + 1]) + Math.abs(after[index + 2] - before[index + 2]);
      if (delta > 8) diffPixelCount += 1;
      if (delta > 48) strongPixelCount += 1;
    }

    const matrix = new THREE.Matrix4();
    const vector = new THREE.Vector3();
    mesh.updateMatrixWorld(true);
    renderer.camera.updateMatrixWorld(true);
    let projectedGlyphCount = 0;
    let inViewportGlyphCount = 0;
    const projectedScreenPoints = [];
    const count = Math.min(mesh.count ?? 0, 24);
    for (let index = 0; index < count; index += 1) {
      mesh.getMatrixAt(index, matrix);
      vector.setFromMatrixPosition(matrix).applyMatrix4(mesh.matrixWorld).project(renderer.camera);
      const finite = Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
      const inClipDepth = finite && vector.z >= -1 && vector.z <= 1;
      const inViewport = inClipDepth && vector.x >= -1 && vector.x <= 1 && vector.y >= -1 && vector.y <= 1;
      if (inClipDepth) projectedGlyphCount += 1;
      if (inViewport) inViewportGlyphCount += 1;
      if (projectedScreenPoints.length < 12) {
        projectedScreenPoints.push({
          index,
          ndcX: Number.isFinite(vector.x) ? Number(vector.x.toFixed(4)) : null,
          ndcY: Number.isFinite(vector.y) ? Number(vector.y.toFixed(4)) : null,
          ndcZ: Number.isFinite(vector.z) ? Number(vector.z.toFixed(4)) : null,
          inViewport
        });
      }
    }
    return {
      canvasWidth: width,
      canvasHeight: height,
      diffPixelCount,
      strongPixelCount,
      projectedGlyphCount,
      inViewportGlyphCount,
      projectedScreenPoints,
      rendererSummary: window.ANCHOR_MISSION_RENDER_DEBUG ?? window.ANCHOR_SIMULATION_RENDER_DEBUG ?? null,
      currentDebug: window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? null,
      volumetricDebug: window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG ?? null
    };
  });
}

function expectCurrentEnabled(debug) {
  expect(debug.presentation?.currentPresentationEnabled).toBe(true);
  expect(debug.presentation?.sourceVectorSampleCount).toBeGreaterThan(0);
  expect(debug.presentation?.finiteVectorSampleCount).toBeGreaterThan(0);
  expect(debug.presentation?.nonzeroVectorSampleCount).toBeGreaterThan(0);
  expect(debug.presentation?.visibleVectorInstanceCount).toBeGreaterThan(0);
  expect(debug.presentation?.displayLayerChangesCurrent).toBe(false);
  expect(debug.presentation?.changesOfficialScoring).toBe(false);
}

function expectVisibleCurrentPixels(evidence) {
  const message = JSON.stringify(evidence, null, 2);
  expect(evidence.diffPixelCount, message).toBeGreaterThan(80);
  expect(evidence.strongPixelCount, message).toBeGreaterThan(20);
  expect(evidence.projectedGlyphCount, message).toBeGreaterThanOrEqual(2);
  expect(evidence.inViewportGlyphCount, message).toBeGreaterThanOrEqual(2);
}

test(EXACT_TITLES[0], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page);
  const debug = await collectCurrentDebug(page);
  expectCurrentEnabled(debug);
  expect(debug.presentation.phase).toBe('planning');
  expect(debug.presentation.runtimeShell).toBe('default');
  expect(debug.route.map((entry) => entry.waypointCount)).toEqual([2, 0, 0]);
  const evidence = await collectCurrentPixelEvidence(page);
  expectVisibleCurrentPixels(evidence);
  errors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page);
  await executeAndWaitForSimulation(page);
  const debug = await collectCurrentDebug(page);
  expectCurrentEnabled(debug);
  expect(debug.presentation.phase).toBe('simulation');
  const evidence = await collectCurrentPixelEvidence(page);
  expectVisibleCurrentPixels(evidence);
  await advanceSimulation(page, 12);
  expectCurrentEnabled(await collectCurrentDebug(page));
  errors.assertClean();
});

test(EXACT_TITLES[2], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page);
  const planning = await collectCurrentDebug(page);
  const planningEvidence = await collectCurrentPixelEvidence(page);
  await executeAndWaitForSimulation(page);
  const simulation = await collectCurrentDebug(page);
  const simulationEvidence = await collectCurrentPixelEvidence(page);
  expectCurrentEnabled(planning);
  expectCurrentEnabled(simulation);
  expectVisibleCurrentPixels(planningEvidence);
  expectVisibleCurrentPixels(simulationEvidence);
  expect(planning.presentation.cacheSignature).toContain('activeSlice');
  expect(simulation.presentation.cacheSignature).toContain('activeSlice');
  errors.assertClean();
});

test(EXACT_TITLES[3], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page);
  await executeAndWaitForSimulation(page);
  expectCurrentEnabled(await collectCurrentDebug(page));
  await page.evaluate(() => {
    window.anchorGame.phaser.scene.stop('SimulationScene');
    window.anchorGame.state.mode = 'planning';
    window.anchorGame.phaser.scene.start('MissionWorkspaceScene');
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene')?.sys.isActive?.() ?? false), { timeout: 20000 }).toBe(true);
  await configureSingleActiveRoute(page);
  expectCurrentEnabled(await collectCurrentDebug(page));
  await executeAndWaitForSimulation(page);
  const afterSecondExecute = await collectCurrentDebug(page);
  expectCurrentEnabled(afterSecondExecute);
  expect(afterSecondExecute.route.map((entry) => entry.waypointCount)).toEqual([2, 0, 0]);
  errors.assertClean();
});

test(EXACT_TITLES[4], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page);
  await page.evaluate(async () => {
    const { createNormalGeneratedCurrentScenario } = await import('./tools/js/flow_r2a4_production_helpers.mjs');
    const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-r2a4-nonregional-fixture', operationalDomainProfileId: 'compactTrainingArea', agentCount: 3 });
    const state = window.anchorGame.state;
    Object.assign(state, fixture.state);
    state.ui.threeMissionCameraPreset = 'obliqueMission';
    window.anchorGame.phaser.scene.start('MissionWorkspaceScene');
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPresentationEnabled === true), { timeout: 30000 }).toBe(true);
  const debug = await collectCurrentDebug(page);
  expectCurrentEnabled(debug);
  expect(debug.current.depthDependent).toBe(true);
  const evidence = await collectCurrentPixelEvidence(page);
  expectVisibleCurrentPixels(evidence);
  errors.assertClean();
});

test(EXACT_TITLES[5], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page);
  const planning = await collectCurrentDebug(page);
  expectCurrentEnabled(planning);
  expect(planning.route).toHaveLength(3);
  expect(planning.route[0].waypointCount).toBeGreaterThan(0);
  expect(planning.route[1].waypointCount).toBe(0);
  expect(planning.route[2].waypointCount).toBe(0);
  await executeAndWaitForSimulation(page);
  const runtime = await page.evaluate(() => {
    const scene = window.anchorGame.phaser.scene.getScene('SimulationScene');
    return scene?.engine?.agents?.map?.((agent) => ({ id: agent.id, idleControl: agent.idleControl === true, status: agent.status, depthMeters: agent.depthMeters, completedPlan: agent.completedPlan })) ?? [];
  });
  expect(runtime[0].idleControl).toBe(false);
  expect(runtime[1].idleControl).toBe(true);
  expect(runtime[2].idleControl).toBe(true);
  expect(runtime[1].depthMeters).toBe(0);
  expect(runtime[2].depthMeters).toBe(0);
  expectCurrentEnabled(await collectCurrentDebug(page));
  errors.assertClean();
});

test(EXACT_TITLES[6], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page);
  expectCurrentEnabled(await collectCurrentDebug(page));
  await startNormalChallengePlanning(page, { route: '/?currentDisplay=safe', expectCurrentEnabled: false });
  const safePlanning = await collectCurrentDebug(page);
  expect(safePlanning.presentation.safeModeExplicit).toBe(true);
  expect(safePlanning.presentation.currentPresentationRequested).toBe(false);
  expect(safePlanning.presentation.currentPresentationEnabled).toBe(false);
  expect(safePlanning.presentation.noVisibleVectorsReason).toBe('Safe Display mode');
  await executeAndWaitForSimulation(page);
  const safeSimulation = await collectCurrentDebug(page);
  expect(safeSimulation.presentation.safeModeExplicit).toBe(true);
  expect(safeSimulation.presentation.currentPresentationEnabled).toBe(false);
  expect(safeSimulation.text).toContain(SAFE_WARNING);
  await startNormalChallengePlanning(page);
  expectCurrentEnabled(await collectCurrentDebug(page));
  errors.assertClean();
});

test(EXACT_TITLES[7], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page);
  const defaultShell = await collectCurrentDebug(page);
  expectCurrentEnabled(defaultShell);

  await boot(page, '/?runtimeShell=next');
  await page.locator('[data-action="open-mission-setup"]').first().click();
  await page.locator('[data-action="generate"]').first().click();
  await page.locator('[data-action="start-planning"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.runtimeShell === 'next'), { timeout: 30000 }).toBe(true);
  const nextShell = await page.evaluate(() => ({
    presentation: window.ANCHOR_CURRENT_PRESENTATION_DEBUG ?? null,
    current: window.ANCHOR_VOLUMETRIC_CURRENT_DEBUG ?? null,
    heading: document.querySelector('#next-shell-route-heading')?.textContent ?? null
  }));
  expect(nextShell.presentation.runtimeShell).toBe('next');
  expect(nextShell.presentation.currentPresentationEnabled).toBe(true);
  expect(nextShell.presentation.normalizedDisplayMode).toBe(defaultShell.presentation.normalizedDisplayMode);
  expect(nextShell.presentation.displayLayerChangesCurrent).toBe(false);
  expect(nextShell.current.currentPresentationEnabled).toBe(true);
  errors.assertClean();
});

test(EXACT_TITLES[8], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page, { forceFailure: true, expectCurrentEnabled: false });
  const debug = await collectCurrentDebug(page);
  expect(debug.presentation.currentPresentationEnabled).toBe(false);
  expect(debug.presentation.noVisibleVectorsReason).toMatch(/current glyph presentation failed|could not be initialized|Forced current glyph presentation failure|presentation initialization failed/i);
  expect(debug.text).toContain('Current physics are active, but no current vectors are visible. Reason: presentation initialization failed.');
  await page.evaluate(() => {
    window.__ANCHOR_TEST_FORCE_CURRENT_GLYPH_FAILURE = false;
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    if (scene?.threeMissionRenderer) {
      scene.threeMissionRenderer.currentGlyphPresentationFailed = false;
      scene.threeMissionRenderer.currentGlyphPresentationWarning = null;
      scene.threeMissionRenderer.currentGlyphPresentationError = null;
      scene.threeMissionRenderer.presentationCache.lastRenderedCurrentFieldFrameId = null;
    }
    scene?.refreshThreeMissionRenderer?.({ reason: 'flow-r2a4-recover-current-glyphs' });
  });
  await expect.poll(() => page.evaluate(() => window.ANCHOR_CURRENT_PRESENTATION_DEBUG?.currentPresentationEnabled === true), { timeout: 30000 }).toBe(true);
  errors.assertClean();
});

test(EXACT_TITLES[9], async ({ page }) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startNormalChallengePlanning(page, { route: '/auv-glider-planner-game/' });
  const planning = await collectCurrentDebug(page);
  expect(planning.url).toContain('/auv-glider-planner-game/');
  expectCurrentEnabled(planning);
  expectVisibleCurrentPixels(await collectCurrentPixelEvidence(page));
  await executeAndWaitForSimulation(page);
  expectCurrentEnabled(await collectCurrentDebug(page));
  expectVisibleCurrentPixels(await collectCurrentPixelEvidence(page));
  errors.assertClean();
});

test(EXACT_TITLES[10], async ({ page }, testInfo) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const screenshots = [];
  async function shot(name) {
    const filePath = path.join(REVIEW_DIR, name);
    await page.screenshot({ path: filePath, fullPage: true });
    screenshots.push(name);
  }

  await startNormalChallengePlanning(page);
  await shot('01-normal-challenge-planning-currents.png');
  const planningEvidence = await collectCurrentPixelEvidence(page);
  expectVisibleCurrentPixels(planningEvidence);
  await executeAndWaitForSimulation(page);
  await shot('02-normal-challenge-simulation-currents.png');
  const simulationEvidence = await collectCurrentPixelEvidence(page);
  expectVisibleCurrentPixels(simulationEvidence);
  await advanceSimulation(page, 14);
  await shot('03-normal-challenge-playing-currents.png');
  await page.evaluate(() => {
    window.anchorGame.phaser.scene.stop('SimulationScene');
    window.anchorGame.state.mode = 'planning';
    window.anchorGame.phaser.scene.start('MissionWorkspaceScene');
  });
  await configureSingleActiveRoute(page);
  await shot('04-return-replan-currents.png');
  await executeAndWaitForSimulation(page);
  await shot('05-second-execute-currents.png');
  const secondExecuteEvidence = await collectCurrentPixelEvidence(page);
  expectVisibleCurrentPixels(secondExecuteEvidence);

  const finalDebug = await collectCurrentDebug(page);
  const qa = {
    status: errors.unexpected().length ? 'FAIL' : 'PASS',
    browserName: testInfo.project.name,
    browserVersion: page.context().browser()?.version?.() ?? null,
    viewport: testInfo.project.use?.viewport ?? null,
    exactTitles: EXACT_TITLES,
    route: finalDebug.route,
    currentPresentation: finalDebug.presentation,
    volumetricCurrent: finalDebug.current,
    pixelEvidence: { planningEvidence, simulationEvidence, secondExecuteEvidence },
    screenshots,
    manualQaRequired: 'Human manual QA by the project owner remains pending until the FLOW-R2A.4 normal-production current-visibility screenshot package is reviewed.',
    pageErrors: errors.unexpected()
  };
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(qa, null, 2));
  errors.assertClean();
});




