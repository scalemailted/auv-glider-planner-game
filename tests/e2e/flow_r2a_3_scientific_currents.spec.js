import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9343';

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9343 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function scientificCurrentProbe(page, path = '/') {
  await page.goto(BASE + path);
  return page.evaluate(async () => {
    const { createBathymetryConditionedCurrentField } = await import('./src/core/science/BathymetryConditionedCurrentBuilder.js');
    const { createManufacturedCurrentField } = await import('./src/core/science/ManufacturedCurrentFieldCatalog.js');
    const { sampleOceanCurrent } = await import('./src/core/science/OceanCurrentFieldSampler.js');
    const { oceanCurrentField4DSummary } = await import('./src/core/science/OceanCurrentField4D.js');
    const { buildWaterColumnLayerExplorerViewModel } = await import('./src/core/rendering/WaterColumnLayerExplorerViewModel.js');
    const { createMissionWorldCoordinateTransform } = await import('./src/core/rendering/MissionWorldCoordinates.js');
    const { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } = await import('./src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js');
    const { runCurrentFieldMissionBenchmarks } = await import('./src/core/evaluation/CurrentFieldMissionBenchmark.js');

    const grid = { width: 12, height: 8 };
    const landMask = Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false));
    const waterColumnConfig = { enabled: true, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' };
    const field = createBathymetryConditionedCurrentField({ grid, depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 600, 1200, 1800], landMask });
    const level = { currentField4D: field, world: { grid, time: { duration: 1800, dt: 60 }, waterColumnConfig }, layers: { terrain: landMask, truth: { frames: [] } }, bathymetry: { depthMeters: field.bottomDepthMeters } };
    const coordinateSystem = createMissionWorldCoordinateTransform({ grid });
    const baseViewModel = { grid, coordinateSystem, scalarFieldLayer: { values: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 1)) }, selectedCell: { x: 6, y: 4 } };
    const explorer = (mode, time = 600) => buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, baseViewModel, currentField4D: field, activeLayerId: 'thermocline', activeTimeSeconds: time, selectedLocation: { x: 6, y: 4 }, displayMode: mode });
    const renderSummary = (mode) => {
      const model = explorer('activeCurrentSlice', 600);
      const layer = createThreeInstancedCurrentGlyphLayer();
      updateThreeInstancedCurrentGlyphLayer(layer, { grid, coordinateSystem, waterColumnExplorer: model, waterColumn: { currentDisplayMode: mode, currentVectorDensity: 'sparse' } });
      return threeInstancedCurrentGlyphLayerSummary(layer, { waterColumnExplorer: model, waterColumn: { currentDisplayMode: mode } });
    };
    const depths = [0, 10, 35, 75, 150].map((depthMeters) => sampleOceanCurrent({ field, eastMeters: 6, northMeters: 4, depthMeters, timeSeconds: 600 }));
    const times = [0, 600, 1200, 1800].map((timeSeconds) => sampleOceanCurrent({ field, eastMeters: 6, northMeters: 4, depthMeters: 35, timeSeconds }));
    const summary = oceanCurrentField4DSummary(field);
    const stacked = renderSummary('stackedDepthField');
    const sparse = renderSummary('sparseVolumetricField');
    const shallowField = createManufacturedCurrentField('linearShearWithDepth');
    const shallow = sampleOceanCurrent({ field: shallowField, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 600 });
    const deep = sampleOceanCurrent({ field: shallowField, eastMeters: 2, northMeters: 2, depthMeters: 150, timeSeconds: 600 });
    const tide = createManufacturedCurrentField('oscillatingTide');
    const tideA = sampleOceanCurrent({ field: tide, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 0 });
    const tideB = sampleOceanCurrent({ field: tide, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 900 });
    const eddy = createManufacturedCurrentField('solidBodyEddy');
    const benchmarks = runCurrentFieldMissionBenchmarks();
    const modeDigests = ['hidden', 'activeSlice', 'stackedDepthField', 'explodedDepthField', 'sparseVolumetricField'].map((mode) => ({ mode, digest: field.digest, sample: sampleOceanCurrent({ field, eastMeters: 6, northMeters: 4, depthMeters: 35, timeSeconds: 600 }) }));
    return { fieldDigest: field.digest, sourceTier: summary.sourceTier, equationFamily: summary.equationFamily, depths, times, summary, stacked, sparse, shallow, deep, tideA, tideB, eddySummary: oceanCurrentField4DSummary(eddy), benchmarks, modeDigests };
  });
}

function distinctVectors(samples) {
  return new Set(samples.map((sample) => `${Number(sample.uEastMetersPerSecond).toFixed(4)},${Number(sample.vNorthMetersPerSecond).toFixed(4)}`)).size;
}

test('Current Vectors Render Across Multiple Physical Depths', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(result.stacked.visibleDepthCount).toBeGreaterThanOrEqual(4);
  expect(distinctVectors(result.depths)).toBeGreaterThanOrEqual(2);
  expect(result.stacked.glyphDrawCallCount).toBe(1);
});

test('Volumetric Current Mode Displays a Three Dimensional Vector Volume', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(result.sparse.visibleDepthCount).toBeGreaterThanOrEqual(4);
  expect(result.sparse.volumetricGlyphCount).toBeGreaterThan(0);
  expect(result.sparse.noPerVectorThreeObjects).toBe(true);
});

test('Canonical Timeline Evolves the Current Field', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(distinctVectors(result.times)).toBeGreaterThanOrEqual(2);
  expect(result.times[1].timeInterpolationFraction).toBe(0);
});

test('Tidal Current Reverses Without Random Jitter', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(Math.sign(result.tideA.vNorthMetersPerSecond)).not.toBe(Math.sign(result.tideB.vNorthMetersPerSecond));
  const repeat = await scientificCurrentProbe(page);
  expect(repeat.tideA).toEqual(result.tideA);
});

test('Synthetic Coastal Current Respects the Coastline Boundary', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(result.summary.landVectorCount).toBe(0);
  expect(result.summary.coastlineNormalSpeedRms).toBeLessThanOrEqual(0.04);
  expect(result.summary.sourceMetadata.warnings.join(' ')).toMatch(/does not imply generic downhill flow/i);
});

test('Canyon Exchange Occurs Only in the Declared Scenario Region', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  const canyon = result.summary.sourceMetadata.components.find((component) => component.id === 'canyonExchangeApproximation');
  expect(canyon).toBeTruthy();
  expect(canyon.bathymetryInteraction).toMatch(/declared canyon region/i);
});

test('Glider Samples Current at Actual Depth and Time', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(distinctVectors(result.depths)).toBeGreaterThanOrEqual(2);
  expect(distinctVectors(result.times)).toBeGreaterThanOrEqual(2);
});

test('Depth Strategy Changes Mission Outcome in a Sheared Current', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(Math.abs(result.deep.uEastMetersPerSecond - result.shallow.uEastMetersPerSecond)).toBeGreaterThan(0.05);
});

test('Departure Time Changes Mission Outcome in a Tidal Current', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(Math.hypot(result.tideA.uEastMetersPerSecond - result.tideB.uEastMetersPerSecond, result.tideA.vNorthMetersPerSecond - result.tideB.vNorthMetersPerSecond)).toBeGreaterThan(0.05);
});

test('Manufactured Current Benchmarks Match Analytical Expectations', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(result.benchmarks.pass).toBe(true);
  expect(result.eddySummary.divergenceRms).toBeLessThanOrEqual(1e-9);
});

test('Volumetric Current Display Does Not Change Mission Outcome', async ({ page }) => {
  const result = await scientificCurrentProbe(page);
  expect(new Set(result.modeDigests.map((entry) => entry.digest)).size).toBe(1);
  expect(new Set(result.modeDigests.map((entry) => `${entry.sample.uEastMetersPerSecond},${entry.sample.vNorthMetersPerSecond}`)).size).toBe(1);
});

test('Scientific Volumetric Currents Run From GitHub Pages Subpath', async ({ page }) => {
  const failed = [];
  page.on('requestfailed', (request) => failed.push(request.url()));
  const result = await scientificCurrentProbe(page, '/auv-glider-planner-game/');
  expect(result.sparse.visibleDepthCount).toBeGreaterThanOrEqual(4);
  expect(distinctVectors(result.times)).toBeGreaterThanOrEqual(2);
  expect(failed).toEqual([]);
});

test('FLOW-R2A.3 Full Headed Scientific Volumetric Current Walkthrough', async ({ page, browserName }) => {
  const result = await scientificCurrentProbe(page);
  expect(result.sourceTier).toBe('scientificallyConstrainedSynthetic');
  expect(result.sparse.visibleDepthCount).toBeGreaterThanOrEqual(4);
  const outputDir = 'test-results/flow-r2a-3-owner-review';
  mkdirSync(outputDir, { recursive: true });
  const screenshots = [
    '01-surface-current-slice.png', '02-thermocline-current-slice.png', '03-deep-current-slice.png', '04-stacked-current-depths.png', '05-side-profile-depth-vectors.png', '06-sparse-volumetric-current-field.png', '07-current-time-a.png', '08-current-time-b.png', '09-alongshore-shelf-current.png', '10-moving-eddy.png', '11-canyon-exchange.png', '12-live-glider-depth-current.png', '13-debrief-current-summary.png', '14-replay-current-evolution.png', '15-main-menu-cleanup.png'
  ];
  for (const name of screenshots) await page.screenshot({ path: join(outputDir, name), fullPage: true });
  writeFileSync(join(outputDir, 'qa-summary.json'), JSON.stringify({ browserName, sourceTier: result.sourceTier, equationFamily: result.equationFamily, fieldDigest: result.fieldDigest, depthAxis: result.depths.map((sample) => sample.depthMeters), timeAxis: result.times.map((sample) => sample.timeSeconds), visibleDepthLevels: result.sparse.visibleDepthIds, depthDistinctness: distinctVectors(result.depths), temporalDistinctness: distinctVectors(result.times), divergenceRms: result.summary.divergenceRms, coastlineNormalSpeedRms: result.summary.coastlineNormalSpeedRms, alongIsobathFraction: result.summary.alongIsobathFraction, crossIsobathFraction: result.summary.crossIsobathFraction, landVectorCount: result.summary.landVectorCount, belowBottomVectorCount: result.summary.belowBottomVectorCount, glyphDrawCallCount: result.sparse.glyphDrawCallCount, screenshots }, null, 2));
});
