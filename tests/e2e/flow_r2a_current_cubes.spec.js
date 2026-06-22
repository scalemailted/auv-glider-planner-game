import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9336';

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9336 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function currentProbe(page, path = '/') {
  await page.goto(BASE + path);
  return page.evaluate(async () => {
    const { createSyntheticCurrentCubeFixture } = await import('./src/core/science/SyntheticCurrentCubeAdapter.js');
    const { sampleOceanCurrent } = await import('./src/core/science/OceanCurrentFieldSampler.js');
    const { buildWaterColumnLayerExplorerViewModel } = await import('./src/core/rendering/WaterColumnLayerExplorerViewModel.js');
    const { createMissionWorldCoordinateTransform } = await import('./src/core/rendering/MissionWorldCoordinates.js');
    const { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } = await import('./src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js');
    const { TruthWorld } = await import('./src/core/sim/TruthWorld.js');

    const grid = { width: 6, height: 5 };
    const waterColumnConfig = { enabled: true, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], defaultLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'sawtoothProfile' };
    const field = createSyntheticCurrentCubeFixture({ grid, waterColumnConfig, depthAxisMeters: [0, 15, 35, 75, 150], timeAxisSeconds: [0, 600, 1800], seed: 83 });
    const sample = (depth, time = 600) => sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: depth, timeSeconds: time, interpolation: 'linear4d' });
    const depths = { surface: sample(0), thermocline: sample(35), midwater: sample(75), deep: sample(150) };
    const level = { levelId: 'flow-r2a-e2e', world: { grid, time: { duration: 1800, dt: 60 }, waterColumnConfig }, layers: { terrain: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false)), truth: { frames: [] } }, bathymetry: { depthMeters: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 220)) } };
    const baseViewModel = { grid, coordinateSystem: createMissionWorldCoordinateTransform({ grid }), scalarFieldLayer: { id: 'sampleValue', values: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 1)) }, vectorFieldLayer: { id: 'legacy', vectors: [] }, selectedCell: { x: 2, y: 2 } };
    const explorer = buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, baseViewModel, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 600, displayMode: 'activeCurrentSlice', selectedLocation: { x: 2, y: 2 } });
    const layer = createThreeInstancedCurrentGlyphLayer();
    updateThreeInstancedCurrentGlyphLayer(layer, { grid, coordinateSystem: baseViewModel.coordinateSystem, waterColumnExplorer: explorer, waterColumn: { currentVectorDensity: 1 } });
    const glyphSummary = threeInstancedCurrentGlyphLayerSummary(layer, { waterColumnExplorer: explorer });
    const world = new TruthWorld(level, { waterColumnConfig, agents: [{ id: 'glider-1' }] });
    const currentSurface = world.sampleCurrent(2, 2, 600, 0);
    const currentDeep = world.sampleCurrent(2, 2, 600, 150);
    const plan = { agentPlans: [{ agentId: 'glider-1', waypoints: [{ x: 2, y: 2 }, { x: 4, y: 2 }] }] };
    const digest = JSON.stringify(plan);
    const displayDigests = ['activeCurrentSlice', 'stackedCurrentSlabs', 'explodedCurrentSlabs', 'currentVerticalProfile', 'depthAverageCurrent'].map((displayMode) => {
      buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, baseViewModel, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: 600, displayMode, selectedLocation: { x: 2, y: 2 } });
      return JSON.stringify(plan);
    });
    return { field, depths, early: sample(35, 0), late: sample(35, 1800), explorer, glyphSummary, layerChildCount: layer.group.children.length, currentSurface, currentDeep, digest, displayDigests };
  });
}

test('Current Vectors Differ Across Water Column Depths', async ({ page }) => {
  const result = await currentProbe(page);
  const distance = Math.hypot(result.depths.surface.uEastMetersPerSecond - result.depths.deep.uEastMetersPerSecond, result.depths.surface.vNorthMetersPerSecond - result.depths.deep.vNorthMetersPerSecond);
  expect(distance).toBeGreaterThan(0.01);
  expect(result.depths.thermocline.wet).toBe(true);
  expect(result.digest).toBe(result.displayDigests[0]);
});

test('Current Vectors Change With Canonical Mission Time', async ({ page }) => {
  const result = await currentProbe(page);
  const distance = Math.hypot(result.early.uEastMetersPerSecond - result.late.uEastMetersPerSecond, result.early.vNorthMetersPerSecond - result.late.vNorthMetersPerSecond);
  expect(distance).toBeGreaterThan(0.01);
  expect(result.early.source.digest).toBe(result.late.source.digest);
});

test('Active Current Slab Uses Instanced Three Glyphs', async ({ page }) => {
  const result = await currentProbe(page);
  expect(result.glyphSummary.glyphInstanceCount).toBeGreaterThan(0);
  expect(result.glyphSummary.glyphDrawCallCount).toBe(1);
  expect(result.glyphSummary.standaloneVectorObjectCount).toBe(0);
  expect(result.layerChildCount).toBe(1);
});

test('Glider Drift Uses Current at Actual Dive Depth', async ({ page }) => {
  const result = await currentProbe(page);
  const distance = Math.hypot(result.currentSurface[0] - result.currentDeep[0], result.currentSurface[1] - result.currentDeep[1]);
  expect(distance).toBeGreaterThan(0.01);
});

test('Current Display Modes Do Not Change Mission Outcome', async ({ page }) => {
  const result = await currentProbe(page);
  expect(new Set(result.displayDigests).size).toBe(1);
  expect(result.displayDigests[0]).toBe(result.digest);
});

test('Current Vertical Profile Uses One Four Dimensional Field', async ({ page }) => {
  const result = await currentProbe(page);
  expect(result.explorer.selectedCurrentProfile.samplesByDepth.length).toBeGreaterThanOrEqual(5);
  expect(result.explorer.selectedCurrentProfile.derivedDepthAverage.derived).toBe(true);
  expect(result.explorer.selectedCurrentProfile.derivedDepthAverage.physicalDepthPlane).toBe(false);
  expect(result.explorer.currentFieldSummary.type).toBe('anchor.science.ocean-current-field-4d-summary');
  expect(result.explorer.selectedCurrentProfile.samplesByDepth.every((sample) => Number.isFinite(sample.magnitudeMetersPerSecond))).toBe(true);
  const sourceDigests = new Set(result.explorer.selectedCurrentProfile.samplesByDepth.map((sample) => sample.sourceDigest));
  expect(sourceDigests.size).toBe(1);
});

test('Volumetric Current Slabs Run From GitHub Pages Subpath', async ({ page }) => {
  const failed = [];
  page.on('requestfailed', (request) => failed.push(request.url()));
  const result = await currentProbe(page, '/auv-glider-planner-game/');
  expect(result.glyphSummary.glyphInstanceCount).toBeGreaterThan(0);
  expect(result.explorer.currentDisplayModes).toContain('stackedCurrentSlabs');
  expect(result.explorer.currentDisplayModes).toContain('explodedCurrentSlabs');
  expect(failed).toEqual([]);
});
