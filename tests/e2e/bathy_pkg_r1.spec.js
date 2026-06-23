import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;
const BASE = 'http://127.0.0.1:9371';

const PACKAGE_VERSION_PREFIX = 'anchor-bathymetry-';

const EXACT_TITLES = [
  'Bathymetry Package Powers Production Planning Terrain',
  'Bathymetry Package Powers Production Simulation Terrain',
  'Bathymetry Package Powers the Standalone Bathymetric World View',
  'Bathymetry Package Runs From GitHub Pages Subpath'
];

test.setTimeout(180000);
test.use({ viewport: { width: 1440, height: 920 } });

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9371 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test('Bathymetry Package Powers Production Planning Terrain', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startGeneratedChallengePlanning(page);
  const debug = await packageDebug(page, 'mission');
  assertPackageDebug(debug);
  expect(debug.threeMounted).toBe(true);
  expect(debug.terrainSourceDigest).toBeTruthy();
  expect(debug.rendererOwnsBathymetry).toBe(false);
  expect(debug.simulationOwnsBathymetryGeneration).toBe(false);
  expect(debug.packageUsesThree).toBe(false);
  expect(debug.packageUsesPhaser).toBe(false);
  expect(debug.packageUsesDom).toBe(false);
  const state = await page.evaluate(() => ({
    artifactDigest: window.anchorGame.state.level?.bathymetryArtifact?.artifactDigest ?? null,
    metaDigest: window.anchorGame.state.level?.meta?.bathymetryArtifactDigest ?? null,
    summaryDigest: window.anchorGame.state.level?.bathymetryArtifactSummary?.artifactDigest ?? null,
    validationStatus: window.anchorGame.state.level?.bathymetryArtifact?.validationReport?.status ?? null,
    wet: window.anchorGame.state.level?.bathymetryArtifactSummary?.wetCellCount ?? 0,
    land: window.anchorGame.state.level?.bathymetryArtifactSummary?.landCellCount ?? 0
  }));
  expect(state.artifactDigest).toBe(debug.bathymetryArtifactDigest);
  expect(state.metaDigest).toBe(debug.bathymetryArtifactDigest);
  expect(state.summaryDigest).toBe(debug.bathymetryArtifactDigest);
  expect(state.validationStatus).toBe('ok');
  expect(state.wet).toBeGreaterThan(0);
  expect(state.land).toBeGreaterThan(0);
  browserErrors.assertClean();
});

test('Bathymetry Package Powers Production Simulation Terrain', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await startGeneratedChallengePlanning(page);
  await configureSingleActiveGeneratedRoute(page);
  const planning = await packageDebug(page, 'mission');
  await page.locator('#mission-console [data-action="execute"]').click();
  await expect.poll(() => page.evaluate(() => window.anchorGame.phaser.scene.getScene('SimulationScene')?.sys?.isActive?.() === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_SIMULATION_RENDER_DEBUG?.threeMounted === true), { timeout: 30000 }).toBe(true);
  const simulation = await packageDebug(page, 'simulation');
  assertPackageDebug(simulation);
  expect(simulation.bathymetryArtifactDigest).toBe(planning.bathymetryArtifactDigest);
  expect(simulation.terrainSourceDigest).toBe(planning.terrainSourceDigest);
  expect(simulation.rendererOwnsBathymetry).toBe(false);
  expect(simulation.simulationOwnsBathymetryGeneration).toBe(false);
  expect(simulation.packageUsesThree).toBe(false);
  expect(simulation.packageUsesPhaser).toBe(false);
  expect(simulation.packageUsesDom).toBe(false);
  const masks = await page.evaluate(() => ({
    launchArtifactDigest: window.anchorGame.state.executionLaunchPayload?.level?.bathymetryArtifact?.artifactDigest ?? null,
    currentVisualizationAvailable: window.ANCHOR_SIMULATION_RENDER_DEBUG?.currentVisualizationAvailable ?? null,
    wet: window.ANCHOR_SIMULATION_RENDER_DEBUG?.bathymetryWetCellCount ?? 0,
    land: window.ANCHOR_SIMULATION_RENDER_DEBUG?.bathymetryLandCellCount ?? 0
  }));
  expect(masks.wet).toBeGreaterThan(0);
  expect(masks.land).toBeGreaterThan(0);
  expect(masks.launchArtifactDigest).toBe(simulation.bathymetryArtifactDigest);
  browserErrors.assertClean();
});

test('Bathymetry Package Powers the Standalone Bathymetric World View', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await boot(page);
  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.usesThreeRenderer === true), { timeout: 30000 }).toBe(true);
  await expect(page.locator('.three-bathymetry-canvas')).toBeVisible({ timeout: 30000 });
  const debug = await packageDebug(page, 'bathymetry');
  assertPackageDebug(debug);
  expect(debug.terrainVertexCount).toBeGreaterThan(0);
  expect(debug.coastlineEdgeCount).toBeGreaterThan(0);
  expect(debug.rendererOwnsBathymetry).toBe(false);
  expect(debug.packageUsesThree).toBe(false);
  expect(debug.packageUsesPhaser).toBe(false);
  expect(debug.packageUsesDom).toBe(false);
  browserErrors.assertClean();
});

test('Bathymetry Package Runs From GitHub Pages Subpath', async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  const failedResponses = [];
  const moduleResponses = [];
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
    if (url.includes('/packages/bathymetry/src/') || url.includes('/packages/contracts/src/')) {
      moduleResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] ?? '' });
    }
  });
  await boot(page, '/auv-glider-planner-game/');
  await openMainMenuHubSection(page, 'simulation');
  await page.locator('#main-menu-hub [data-action="bathymetry-world-view"]').first().click();
  await expect.poll(() => page.evaluate(() => window.ANCHOR_BATHYMETRY_VIEW_DEBUG?.bathymetryArtifactDigest), { timeout: 30000 }).toBeTruthy();
  const debug = await packageDebug(page, 'bathymetry');
  assertPackageDebug(debug);
  expect(moduleResponses.some((entry) => entry.url.includes('/packages/bathymetry/src/index.js'))).toBe(true);
  expect(moduleResponses.some((entry) => entry.url.includes('/packages/contracts/src/index.js'))).toBe(true);
  expect(moduleResponses.every((entry) => entry.status === 200 && (entry.contentType.includes('javascript') || entry.contentType.includes('text/plain') || entry.contentType.includes('application/octet-stream')))).toBe(true);
  expect(failedResponses).toEqual([]);
  browserErrors.assertClean();
});

async function boot(page, route = '/') {
  await page.goto(BASE + route);
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame)), { timeout: 30000 }).toBe(true);
}

async function startGeneratedChallengePlanning(page) {
  await boot(page);
  await page.evaluate(() => {
    const mainMenu = window.anchorGame?.phaser?.scene?.getScene?.('MainMenuScene');
    if (!mainMenu?.startRandomChallenge) throw new Error('MainMenuScene.startRandomChallenge is not available.');
    mainMenu.startRandomChallenge('perfectKnowledge', 'challenge');
  });
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionBriefingScene')?.sys?.isActive?.() === true), { timeout: 30000 }).toBe(true);
  await page.evaluate(() => window.anchorGame.phaser.scene.getScene('MissionBriefingScene').startPlanning());
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene?.getScene?.('MissionWorkspaceScene')?.sys?.isActive?.() === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.threeMounted === true), { timeout: 30000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => window.ANCHOR_MISSION_RENDER_DEBUG?.bathymetryArtifactDigest ?? null), { timeout: 30000 }).toBeTruthy();
}

async function configureSingleActiveGeneratedRoute(page) {
  await page.evaluate(async () => {
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
      showTerrain: true,
      showCurrents: true,
      threeMissionLayers: { ...(state.ui?.threeMissionLayers ?? {}), scalarField: true, depthLayers: true, currentVectors: true, routes: true, gliders: true, waypoints: true },
      waterColumn: {
        ...(state.ui?.waterColumn ?? {}),
        selectedTargetDepthLayerId: 'deep',
        selectedDiveProfileId: 'sawtoothProfile',
        activeDepthLayerId: 'thermocline',
        currentDisplayMode: 'activeSlice'
      }
    };
    const selectedStart = getDeploymentZonesForAgent(level, mission, activeAgentId)?.[0]?.cells?.[0] ?? activeAgent.deployment?.selectedStart ?? activeAgent.start;
    const rawPlan = {
      schemaVersion: '2.0',
      type: 'anchor.plan',
      coordinateProfileId: 'continuousGridV1',
      fieldSamplingProfileId: 'continuousTrilinearV1',
      levelId: level.levelId,
      missionId: mission.missionId,
      meta: { name: 'BATHY-PKG-R1 generated challenge route' },
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
    if (!selection.valid) throw new Error(`Could not select start: ${selection.message}`);
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
    for (const candidate of candidates) {
      const placement = canPlaceWaypoint(state, activeAgentId, { x: candidate.x, y: candidate.y, action: 'sample' });
      if (!placement.allowed) continue;
      if (selectedTargets.some((target) => Math.hypot(target.x - candidate.x, target.y - candidate.y) < 1.25)) continue;
      selectedTargets.push(candidate);
      const arrivalTime = Number(placement.estimate?.arrivalTime ?? selectedTargets.length * 120);
      activePlan.waypoints.push({
        id: `bathy-pkg-r1-wp-${selectedTargets.length}`,
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
    if (selectedTargets.length < 2) throw new Error('Could not find two executable route targets.');
    state.plan = normalizePlan(state.plan, level, mission);
    state.plan.agentPlans.filter((agentPlan) => agentPlan.agentId !== activeAgentId).forEach((agentPlan) => {
      agentPlan.selectedStart = null;
      agentPlan.waypoints = [];
    });
    const scene = window.anchorGame.phaser.scene.getScene('MissionWorkspaceScene');
    scene?.refreshPanels?.();
    scene?.refreshMap?.();
    scene?.refreshThreeMissionRenderer?.({ reason: 'bathy-pkg-r1-route-configured' });
  });
  await expect.poll(() => page.evaluate(() => (window.anchorGame.state.plan?.agentPlans?.[0]?.waypoints?.length ?? 0) >= 2), { timeout: 10000 }).toBe(true);
  await expect(page.locator('#mission-console [data-action="execute"]')).toBeEnabled({ timeout: 30000 });
}

async function openMainMenuHubSection(page, view) {
  await expect.poll(() => page.evaluate(() => window.anchorGame?.phaser?.scene.getScene('MainMenuScene')?.sys.isActive() ?? false), { timeout: 30000 }).toBe(true);
  await expect(page.locator('#main-menu-hub')).toBeVisible({ timeout: 30000 });
  await page.locator(`#main-menu-hub [data-hub-view="${view}"]`).first().click();
  await expect(page.locator(`#main-menu-hub[data-hub-view="${view}"]`)).toBeVisible({ timeout: 30000 });
}

async function packageDebug(page, kind) {
  const expression = kind === 'simulation'
    ? 'window.ANCHOR_SIMULATION_RENDER_DEBUG'
    : kind === 'bathymetry'
      ? 'window.ANCHOR_BATHYMETRY_VIEW_DEBUG'
      : 'window.ANCHOR_MISSION_RENDER_DEBUG';
  return page.evaluate((debugExpression) => {
    const debug = Function(`return ${debugExpression}`)();
    return {
      activeBackend: debug?.activeBackend ?? debug?.rendererBackend ?? null,
      threeMounted: debug?.threeMounted ?? debug?.usesThreeRenderer ?? null,
      terrainVertexCount: debug?.terrainVertexCount ?? debug?.rendererSummary?.terrainVertexCount ?? 0,
      coastlineEdgeCount: debug?.coastlineEdgeCount ?? debug?.rendererSummary?.coastlineSummary?.coastlineSegmentCount ?? 0,
      terrainSourceDigest: debug?.terrainSourceDigest ?? debug?.rendererSummary?.terrainSourceDigest ?? null,
      bathymetryPackageVersion: debug?.bathymetryPackageVersion ?? null,
      bathymetryManifestDigest: debug?.bathymetryManifestDigest ?? null,
      bathymetryArtifactDigest: debug?.bathymetryArtifactDigest ?? null,
      bathymetrySourceType: debug?.bathymetrySourceType ?? null,
      bathymetryCoordinateFrame: debug?.bathymetryCoordinateFrame ?? null,
      bathymetryAxisCounts: debug?.bathymetryAxisCounts ?? null,
      bathymetryWetCellCount: debug?.bathymetryWetCellCount ?? 0,
      bathymetryLandCellCount: debug?.bathymetryLandCellCount ?? 0,
      bathymetryValidationStatus: debug?.bathymetryValidationStatus ?? null,
      rendererOwnsBathymetry: debug?.rendererOwnsBathymetry,
      simulationOwnsBathymetryGeneration: debug?.simulationOwnsBathymetryGeneration,
      packageUsesThree: debug?.packageUsesThree,
      packageUsesPhaser: debug?.packageUsesPhaser,
      packageUsesDom: debug?.packageUsesDom,
      currentVisualizationAvailable: debug?.currentVisualizationAvailable ?? null,
      terrainAwareValidationStatus: debug?.terrainAwareValidationStatus ?? null
    };
  }, expression);
}

function assertPackageDebug(debug) {
  expect(debug.bathymetryPackageVersion).toContain(PACKAGE_VERSION_PREFIX);
  expect(debug.bathymetryManifestDigest).toMatch(/^anchor-artifact-/);
  expect(debug.bathymetryArtifactDigest).toMatch(/^anchor-artifact-/);
  expect(debug.bathymetryCoordinateFrame).toBeTruthy();
  expect(debug.bathymetryAxisCounts?.east ?? 0).toBeGreaterThan(0);
  expect(debug.bathymetryAxisCounts?.north ?? 0).toBeGreaterThan(0);
  expect(debug.bathymetryWetCellCount).toBeGreaterThan(0);
  expect(debug.bathymetryLandCellCount).toBeGreaterThan(0);
  expect(['ok', 'PASS', 'WARN']).toContain(debug.bathymetryValidationStatus);
}

export { EXACT_TITLES };
