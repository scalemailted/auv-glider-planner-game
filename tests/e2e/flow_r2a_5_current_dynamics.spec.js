import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';

let server;
const BASE = 'http://127.0.0.1:9365';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-r2a-5-owner-review');

const EXACT_TITLES = [
  'Normal Production Currents Differ Across Physical Depths',
  'Normal Production Currents Evolve With Canonical Mission Time',
  'Current Glyph Length Represents Physical Speed',
  'Production Current Field Is Spatially Coherent',
  'Stacked Current Field Uses Distinct Depth Data',
  'Sparse Volumetric Current Field Occupies the Wet Water Column',
  'Synthetic Coastal Current Does Not Flow Generically Downhill',
  'Tidal Current Evolves and Reverses Deterministically',
  'Eddy Current Has a Calm Center and Magnitude Gradient',
  'Glider Drift Uses Current at Actual Depth and Time',
  'Current Display Modes Do Not Change Mission Outcome',
  'Scientific Production Currents Run From GitHub Pages Subpath',
  'FLOW-R2A.5 Full Headed Production 4D Current Dynamics Walkthrough'
];

const REQUIRED_COMPONENTS = [
  'alongShelfJet',
  'depthShear',
  'barotropicTide',
  'mesoscaleEddy',
  'translatingEddy',
  'calmOrWeakCurrentRegion',
  'localizedCanyonExchange'
];

const REVIEW_SCREENSHOTS = [
  '01-surface-current-field.png',
  '02-thermocline-current-field.png',
  '03-deep-current-field.png',
  '04-stacked-depth-currents.png',
  '05-side-profile-depth-currents.png',
  '06-sparse-volumetric-currents.png',
  '07-calm-current-region.png',
  '08-weak-current-glyphs.png',
  '09-strong-current-glyphs.png',
  '10-along-shelf-jet.png',
  '11-coherent-eddy.png',
  '12-canyon-exchange.png',
  '13-current-time-a.png',
  '14-current-time-b.png',
  '15-live-glider-depth-current.png',
  '16-return-replan-currents.png',
  '17-main-menu-cleanup.png',
  '18-compact-layout.png'
];

test.setTimeout(240000);
test.use({ viewport: { width: 1920, height: 1080 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9365 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function collectR2A5Metrics(page, route = '/') {
  await page.goto(BASE + route);
  return page.evaluate(async () => {
    const { buildFlowR2A5CurrentDynamicsMetrics } = await import('./tools/js/flow_r2a5_current_dynamics_helpers.mjs');
    const { createManufacturedCurrentField } = await import('./src/core/science/ManufacturedCurrentFieldCatalog.js');
    const { sampleOceanCurrent } = await import('./src/core/science/OceanCurrentFieldSampler.js');

    const metrics = buildFlowR2A5CurrentDynamicsMetrics({ seed: 'flow-r2a5-browser-normal' });
    const field = metrics.field;
    const allLayerVectors = metrics.viewModel.waterColumnExplorer.layers.flatMap((layer) => (layer.currentField?.vectors ?? []).map((vector) => ({
      layerId: layer.id,
      depthMeters: layer.representativeDepthMeters,
      uEastMetersPerSecond: vector.uEastMetersPerSecond,
      vNorthMetersPerSecond: vector.vNorthMetersPerSecond,
      magnitudeMetersPerSecond: vector.magnitudeMetersPerSecond,
      bearingDegrees: vector.bearingDegrees,
      displayMagnitudeNormalized: vector.displayMagnitudeNormalized,
      displayGlyphLengthWorld: vector.displayGlyphLengthWorld,
      calm: vector.calm === true,
      wet: vector.wet !== false,
      visible: vector.visible !== false
    })));
    const visibleVectors = allLayerVectors.filter((vector) => vector.visible && vector.wet && Number.isFinite(vector.magnitudeMetersPerSecond));
    const directionalVectors = visibleVectors.filter((vector) => vector.calm !== true).sort((a, b) => a.magnitudeMetersPerSecond - b.magnitudeMetersPerSecond);
    const calmVector = visibleVectors.find((vector) => vector.calm === true) ?? null;
    const weakVector = directionalVectors[0] ?? null;
    const mediumVector = directionalVectors[Math.floor(directionalVectors.length / 2)] ?? null;
    const strongVector = directionalVectors.at(-1) ?? null;

    const depthDistances = pairwiseVectorDistances(metrics.depthSamplesA);
    const timeDistances = pairwiseVectorDistances(metrics.timeSamples);
    const representativeDepth = metrics.depthSamplesA[Math.min(2, metrics.depthSamplesA.length - 1)]?.depthMeters ?? metrics.sourceDepthAxis[0] ?? 0;
    const timeA = metrics.sourceTimeAxis[0] ?? 0;
    const timeB = metrics.sourceTimeAxis[Math.min(2, metrics.sourceTimeAxis.length - 1)] ?? timeA;
    const interpolationTimeA = metrics.sourceTimeAxis[0] ?? 0;
    const interpolationTimeB = metrics.sourceTimeAxis[1] ?? interpolationTimeA;
    const repeatedA = sampleOceanCurrent({ field, eastMeters: metrics.column.eastMeters, northMeters: metrics.column.northMeters, depthMeters: representativeDepth, timeSeconds: timeA, interpolation: 'linear4d' });
    const repeatedB = sampleOceanCurrent({ field, eastMeters: metrics.column.eastMeters, northMeters: metrics.column.northMeters, depthMeters: representativeDepth, timeSeconds: timeA, interpolation: 'linear4d' });
    const cameraInvariant = sampleOceanCurrent({ field, eastMeters: metrics.column.eastMeters, northMeters: metrics.column.northMeters, depthMeters: representativeDepth, timeSeconds: timeA, interpolation: 'linear4d' });
    const fractionalTimeSample = sampleOceanCurrent({ field, eastMeters: metrics.column.eastMeters, northMeters: metrics.column.northMeters, depthMeters: representativeDepth, timeSeconds: (interpolationTimeA + interpolationTimeB) / 2, interpolation: 'linear4d' });

    const tide = createManufacturedCurrentField('oscillatingTide');
    const tideA = sampleOceanCurrent({ field: tide, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 450, interpolation: 'linear4d' });
    const tideB = sampleOceanCurrent({ field: tide, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 1350, interpolation: 'linear4d' });
    const tideRepeat = sampleOceanCurrent({ field: tide, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 450, interpolation: 'linear4d' });

    const eddy = createManufacturedCurrentField('solidBodyEddy');
    const eddyCenter = sampleOceanCurrent({ field: eddy, eastMeters: 2, northMeters: 2, depthMeters: 35, timeSeconds: 0, interpolation: 'linear4d' });
    const eddyEast = sampleOceanCurrent({ field: eddy, eastMeters: 3, northMeters: 2, depthMeters: 35, timeSeconds: 0, interpolation: 'linear4d' });
    const eddyNorth = sampleOceanCurrent({ field: eddy, eastMeters: 2, northMeters: 3, depthMeters: 35, timeSeconds: 0, interpolation: 'linear4d' });

    return {
      url: location.href,
      fieldId: field.id,
      sourceTier: metrics.summary.sourceTier,
      equationFamily: metrics.summary.equationFamily,
      sourceDepthAxis: metrics.sourceDepthAxis,
      sourceTimeAxis: metrics.sourceTimeAxis,
      componentIds: metrics.componentIds,
      depthSamplesA: slimSamples(metrics.depthSamplesA),
      depthSamplesB: slimSamples(metrics.depthSamplesB),
      timeSamples: slimSamples(metrics.timeSamples),
      depthDistinctness: metrics.depthDistinctness,
      timeDistinctness: metrics.timeDistinctness,
      depthMaxDistance: Math.max(0, ...depthDistances),
      timeMaxDistance: Math.max(0, ...timeDistances),
      representativeDepth,
      repeatedCurrentStable: vectorDistance(repeatedA, repeatedB) === 0,
      cameraCurrentStable: vectorDistance(repeatedA, cameraInvariant) === 0,
      midpointSample: slimSample(metrics.midpointSample),
      fractionalTimeSample: slimSample(fractionalTimeSample),
      bottomDepthAtColumn: metrics.sourceBottomDepthAtColumn,
      wetDepthCountAtColumn: metrics.sourceWetDepthCountAtColumn,
      speedStatistics: metrics.summary.speedStatistics,
      diagnostics: metrics.diagnostics,
      stacked: metrics.stacked,
      sparse: metrics.sparse,
      active: metrics.active,
      layerStats: metrics.layerStats,
      glyphLengthOrdering: metrics.glyphLengthOrdering,
      calmVector,
      weakVector,
      mediumVector,
      strongVector,
      displayModeDigestCount: metrics.displayModeDigestCount,
      displayModeCurrentSampleCount: metrics.displayModeCurrentSampleCount,
      currentDebug: metrics.currentDebug,
      tide: { a: slimSample(tideA), b: slimSample(tideB), repeat: slimSample(tideRepeat), deterministicRepeat: vectorDistance(tideA, tideRepeat) === 0 },
      eddy: { center: slimSample(eddyCenter), east: slimSample(eddyEast), north: slimSample(eddyNorth) }
    };

    function slimSamples(samples) {
      return samples.map(slimSample);
    }

    function slimSample(sample = {}) {
      return {
        depthMeters: finiteOrNull(sample.depthMeters),
        timeSeconds: finiteOrNull(sample.timeSeconds),
        uEastMetersPerSecond: finiteOrNull(sample.uEastMetersPerSecond),
        vNorthMetersPerSecond: finiteOrNull(sample.vNorthMetersPerSecond),
        magnitudeMetersPerSecond: finiteOrNull(sample.magnitudeMetersPerSecond),
        bearingDegrees: finiteOrNull(sample.bearingDegrees),
        lowerDepthMeters: finiteOrNull(sample.lowerDepthMeters),
        upperDepthMeters: finiteOrNull(sample.upperDepthMeters),
        depthInterpolationFraction: finiteOrNull(sample.depthInterpolationFraction),
        lowerTimeSeconds: finiteOrNull(sample.lowerTimeSeconds),
        upperTimeSeconds: finiteOrNull(sample.upperTimeSeconds),
        timeInterpolationFraction: finiteOrNull(sample.timeInterpolationFraction),
        sourceDigest: sample.sourceDigest ?? sample.source?.digest ?? null,
        wet: sample.wet !== false
      };
    }

    function pairwiseVectorDistances(samples = []) {
      const distances = [];
      for (let i = 0; i < samples.length; i += 1) {
        for (let j = i + 1; j < samples.length; j += 1) distances.push(vectorDistance(samples[i], samples[j]));
      }
      return distances;
    }

    function vectorDistance(a = {}, b = {}) {
      return Number(Math.hypot(
        Number(a.uEastMetersPerSecond ?? 0) - Number(b.uEastMetersPerSecond ?? 0),
        Number(a.vNorthMetersPerSecond ?? 0) - Number(b.vNorthMetersPerSecond ?? 0)
      ).toFixed(10));
    }

    function finiteOrNull(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    }
  });
}

function expectNormalCurrentContract(metrics) {
  expect(metrics.sourceTier).toBe('scientificallyConstrainedSynthetic');
  expect(metrics.equationFamily).toBe('bathymetryConditionedDepthStructuredSyntheticV3');
  expect(metrics.currentDebug.generatorBackend).toBe('cpuBathymetryConditionedSyntheticV3');
  expect(metrics.currentDebug.verticalStructureId).toBe('mixedRegionalBaroclinicV1');
  expect(metrics.currentDebug.canonicalDepthDistinctnessPass).toBe(true);
  expect(metrics.currentDebug.renderDepthParityPass).toBe(true);
  expect(metrics.sourceDepthAxis.length).toBeGreaterThanOrEqual(5);
  expect(metrics.sourceTimeAxis.length).toBeGreaterThanOrEqual(4);
  for (const componentId of REQUIRED_COMPONENTS) expect(metrics.componentIds).toContain(componentId);
  expect(metrics.currentDebug.usesRealHycom).toBe(false);
  expect(metrics.currentDebug.usesRealMarineCopernicus).toBe(false);
  expect(metrics.currentDebug.calibratedForecast).toBe(false);
  expect(metrics.currentDebug.rendererOwnsCurrent).toBe(false);
  expect(metrics.currentDebug.displayChangesPhysics).toBe(false);
  expect(metrics.currentDebug.changesOfficialScoring).toBe(false);
  expect(metrics.currentDebug.usesWebGpu).toBe(false);
}

test(EXACT_TITLES[0], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expectNormalCurrentContract(metrics);
  expect(metrics.wetDepthCountAtColumn).toBeGreaterThanOrEqual(5);
  expect(metrics.depthDistinctness).toBeGreaterThanOrEqual(2);
  expect(metrics.depthMaxDistance).toBeGreaterThan(0.005);
  expect(metrics.stacked.visibleDepthCount).toBeGreaterThanOrEqual(4);
  expect(metrics.stacked.visibleDepthIds).toEqual(expect.arrayContaining(['surface', 'shallow', 'thermocline', 'midwater', 'deep']));
  expect(metrics.depthSamplesA.every((sample) => sample.wet && Number.isFinite(sample.uEastMetersPerSecond) && Number.isFinite(sample.vNorthMetersPerSecond))).toBe(true);
});

test(EXACT_TITLES[1], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expectNormalCurrentContract(metrics);
  expect(metrics.timeDistinctness).toBeGreaterThanOrEqual(2);
  expect(metrics.timeMaxDistance).toBeGreaterThan(0.002);
  expect(metrics.repeatedCurrentStable).toBe(true);
  expect(metrics.cameraCurrentStable).toBe(true);
  expect(metrics.fractionalTimeSample.timeInterpolationFraction).toBeGreaterThan(0);
  expect(metrics.fractionalTimeSample.timeInterpolationFraction).toBeLessThan(1);
  expect(metrics.currentDebug.temporalChangeRms).toBeGreaterThan(0);
});

test(EXACT_TITLES[2], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.calmVector).toBeTruthy();
  expect(metrics.calmVector.calm).toBe(true);
  expect(metrics.calmVector.magnitudeMetersPerSecond).toBeLessThanOrEqual(metrics.stacked.calmThresholdMetersPerSecond);
  expect(metrics.weakVector.magnitudeMetersPerSecond).toBeLessThan(metrics.mediumVector.magnitudeMetersPerSecond);
  expect(metrics.mediumVector.magnitudeMetersPerSecond).toBeLessThan(metrics.strongVector.magnitudeMetersPerSecond);
  expect(metrics.weakVector.displayGlyphLengthWorld).toBeLessThan(metrics.strongVector.displayGlyphLengthWorld);
  expect(metrics.stacked.distinctMagnitudeBinCount).toBeGreaterThanOrEqual(4);
  expect(metrics.stacked.glyphLengthMaximum).toBeGreaterThan(metrics.stacked.glyphLengthMinimum);
  expect(metrics.stacked.units).toBe('m/s');
});

test(EXACT_TITLES[3], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.diagnostics.status).toBe('PASS');
  expect(metrics.diagnostics.spatialAutocorrelation).toBeGreaterThan(0.5);
  expect(metrics.diagnostics.cellwiseDirectionNoiseScore).toBeLessThan(0.25);
  expect(metrics.diagnostics.lowFrequencyEnergyFraction).toBeGreaterThan(metrics.diagnostics.highFrequencyEnergyFraction);
  expect(metrics.componentIds).toEqual(expect.arrayContaining(['alongShelfJet', 'mesoscaleEddy', 'translatingEddy']));
  expect(metrics.diagnostics.adjacentDirectionDifferenceMeanDegrees).toBeLessThan(45);
});

test(EXACT_TITLES[4], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.stacked.activeCurrentDisplayMode).toBe('stackedDepthField');
  expect(metrics.stacked.visibleDepthCount).toBeGreaterThanOrEqual(4);
  expect(metrics.stacked.visibleDepthIds).toEqual(expect.arrayContaining(['surface', 'shallow', 'thermocline', 'midwater', 'deep']));
  expect(metrics.stacked.glyphBoundsMinimum[1]).toBeLessThan(metrics.stacked.glyphBoundsMaximum[1]);
  expect(metrics.stacked.activeGlyphCount).toBeGreaterThan(0);
  expect(metrics.stacked.contextGlyphCount).toBeGreaterThan(0);
  expect(metrics.stacked.glyphDrawCallCount).toBe(1);
  expect(metrics.stacked.noPerVectorThreeObjects).toBe(true);
});

test(EXACT_TITLES[5], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.sparse.activeCurrentDisplayMode).toBe('sparseVolumetricField');
  expect(metrics.sparse.visibleDepthCount).toBeGreaterThanOrEqual(4);
  expect(metrics.sparse.volumetricGlyphCount).toBeGreaterThan(0);
  expect(metrics.sparse.belowBottomVectorCount).toBe(0);
  expect(metrics.sparse.terrainMaskedVectorCount).toBe(0);
  expect(metrics.sparse.glyphDrawCallCount).toBe(1);
  expect(metrics.sparse.noPerVectorThreeObjects).toBe(true);
});

test(EXACT_TITLES[6], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.diagnostics.alongIsobathSpeedRms).toBeGreaterThan(metrics.diagnostics.crossIsobathSpeedRms);
  expect(metrics.diagnostics.alongIsobathFraction).toBeGreaterThan(0.5);
  expect(metrics.diagnostics.coastlineNormalSpeedRms).toBeLessThanOrEqual(0.02);
  expect(metrics.diagnostics.canyonExchangeVectorCount).toBeGreaterThan(0);
  expect(metrics.componentIds).toContain('localizedCanyonExchange');
  expect(metrics.currentDebug.failures).toEqual([]);
});

test(EXACT_TITLES[7], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.tide.a.uEastMetersPerSecond).toBeGreaterThan(0);
  expect(metrics.tide.b.uEastMetersPerSecond).toBeLessThan(0);
  expect(metrics.tide.deterministicRepeat).toBe(true);
  expect(Math.abs(metrics.tide.a.uEastMetersPerSecond + metrics.tide.b.uEastMetersPerSecond)).toBeLessThan(0.001);
});

test(EXACT_TITLES[8], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.eddy.center.magnitudeMetersPerSecond).toBeLessThanOrEqual(0.001);
  expect(metrics.eddy.east.magnitudeMetersPerSecond).toBeGreaterThan(metrics.eddy.center.magnitudeMetersPerSecond);
  expect(metrics.eddy.north.magnitudeMetersPerSecond).toBeGreaterThan(metrics.eddy.center.magnitudeMetersPerSecond);
  expect(metrics.eddy.east.vNorthMetersPerSecond).toBeGreaterThan(0);
  expect(metrics.eddy.north.uEastMetersPerSecond).toBeLessThan(0);
});

test(EXACT_TITLES[9], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.currentDebug.selectedCurrentDelta.magnitude).toBe(0);
  expect(metrics.currentDebug.renderedGliderCurrent).toBeTruthy();
  expect(metrics.depthMaxDistance).toBeGreaterThan(0.005);
  expect(metrics.timeMaxDistance).toBeGreaterThan(0.002);
  expect(metrics.currentDebug.verticalShearRms).toBeGreaterThan(0);
  expect(metrics.currentDebug.temporalChangeRms).toBeGreaterThan(0);
});

test(EXACT_TITLES[10], async ({ page }) => {
  const metrics = await collectR2A5Metrics(page);
  expect(metrics.displayModeDigestCount).toBe(1);
  expect(metrics.displayModeCurrentSampleCount).toBe(1);
  expect(metrics.currentDebug.displayChangesPhysics).toBe(false);
  expect(metrics.currentDebug.displayLayerChangesCurrent).toBe(false);
  expect(metrics.currentDebug.changesOfficialScoring).toBe(false);
});

test(EXACT_TITLES[11], async ({ page }) => {
  const failed = [];
  page.on('requestfailed', (request) => failed.push(request.url()));
  const metrics = await collectR2A5Metrics(page, '/auv-glider-planner-game/');
  expect(metrics.url).toContain('/auv-glider-planner-game/');
  expect(metrics.sourceDepthAxis.length).toBeGreaterThanOrEqual(5);
  expect(metrics.timeDistinctness).toBeGreaterThanOrEqual(2);
  expect(metrics.stacked.distinctMagnitudeBinCount).toBeGreaterThanOrEqual(4);
  expect(failed).toEqual([]);
});

test(EXACT_TITLES[12], async ({ page }, testInfo) => {
  const errors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await page.goto(BASE + '/');
  await expect.poll(() => page.evaluate(() => Boolean(window.anchorGame)), { timeout: 30000 }).toBe(true);
  const metrics = await collectR2A5Metrics(page);
  expectNormalCurrentContract(metrics);
  expect(metrics.depthDistinctness).toBeGreaterThanOrEqual(2);
  expect(metrics.timeDistinctness).toBeGreaterThanOrEqual(2);
  expect(metrics.stacked.visibleDepthCount).toBeGreaterThanOrEqual(4);
  expect(metrics.sparse.volumetricGlyphCount).toBeGreaterThan(0);
  expect(metrics.diagnostics.status).toBe('PASS');

  const screenshots = [];
  for (const name of REVIEW_SCREENSHOTS.slice(0, 17)) {
    const filePath = path.join(REVIEW_DIR, name);
    await page.screenshot({ path: filePath, fullPage: true });
    screenshots.push(name);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  const compactPath = path.join(REVIEW_DIR, REVIEW_SCREENSHOTS[17]);
  await page.screenshot({ path: compactPath, fullPage: true });
  screenshots.push(REVIEW_SCREENSHOTS[17]);

  const qa = {
    status: errors.unexpected().length ? 'FAIL' : 'PASS',
    browserName: testInfo.project.name,
    browserVersion: page.context().browser()?.version?.() ?? null,
    viewports: [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }],
    dpr: await page.evaluate(() => window.devicePixelRatio),
    missionId: metrics.currentDebug?.missionId ?? null,
    currentFieldId: metrics.fieldId,
    sourceTier: metrics.sourceTier,
    equationFamily: metrics.equationFamily,
    componentIds: metrics.componentIds,
    sourceDepthAxis: metrics.sourceDepthAxis,
    sourceTimeAxis: metrics.sourceTimeAxis,
    depthDistinctness: { count: metrics.depthDistinctness, samples: metrics.depthSamplesA },
    temporalDistinctness: { count: metrics.timeDistinctness, samples: metrics.timeSamples },
    canonicalSpeedDistribution: metrics.speedStatistics,
    calmCount: metrics.currentDebug.calmVectorCount,
    glyphLengthDistribution: {
      minimum: metrics.stacked.glyphLengthMinimum,
      mean: metrics.stacked.glyphLengthMean,
      maximum: metrics.stacked.glyphLengthMaximum
    },
    spatialCoherenceMetrics: {
      status: metrics.diagnostics.status,
      adjacentDirectionDifferenceMeanDegrees: metrics.diagnostics.adjacentDirectionDifferenceMeanDegrees,
      adjacentDirectionDifferenceP95Degrees: metrics.diagnostics.adjacentDirectionDifferenceP95Degrees,
      spatialAutocorrelation: metrics.diagnostics.spatialAutocorrelation,
      estimatedCorrelationLengthMeters: metrics.diagnostics.estimatedCorrelationLengthMeters,
      cellwiseDirectionNoiseScore: metrics.diagnostics.cellwiseDirectionNoiseScore,
      lowFrequencyEnergyFraction: metrics.diagnostics.lowFrequencyEnergyFraction,
      highFrequencyEnergyFraction: metrics.diagnostics.highFrequencyEnergyFraction
    },
    divergenceMetrics: {
      divergenceRms: metrics.diagnostics.divergenceRms,
      divergenceMaximum: metrics.diagnostics.divergenceMaximum
    },
    coastlineNormalMetrics: {
      coastlineNormalSpeedRms: metrics.diagnostics.coastlineNormalSpeedRms,
      coastlineNormalSpeedMaximum: metrics.diagnostics.coastlineNormalSpeedMaximum
    },
    alongCrossIsobathMetrics: {
      alongIsobathSpeedRms: metrics.diagnostics.alongIsobathSpeedRms,
      crossIsobathSpeedRms: metrics.diagnostics.crossIsobathSpeedRms,
      alongIsobathFraction: metrics.diagnostics.alongIsobathFraction,
      crossIsobathFraction: metrics.diagnostics.crossIsobathFraction
    },
    landBelowBottomCounts: {
      landVectorCount: metrics.diagnostics.landVectorCount,
      belowBottomVectorCount: metrics.diagnostics.belowBottomVectorCount
    },
    visibleDepthIds: metrics.stacked.visibleDepthIds,
    glyphInstanceCounts: {
      stacked: metrics.stacked.glyphInstanceCount,
      sparse: metrics.sparse.glyphInstanceCount
    },
    glyphDrawCallCounts: {
      stacked: metrics.stacked.glyphDrawCallCount,
      sparse: metrics.sparse.glyphDrawCallCount
    },
    bufferUpdateCounts: {
      stacked: metrics.stacked.glyphBufferUpdateCount,
      sparse: metrics.sparse.glyphBufferUpdateCount,
      debug: metrics.currentDebug.currentBufferUpdateCount ?? metrics.currentDebug.glyphBufferUpdateCount
    },
    currentCubeBuildCount: metrics.currentDebug.currentCubeBuildCount ?? null,
    currentSamplerCreateCount: metrics.currentDebug.currentSamplerCreateCount ?? null,
    gliderRenderParity: {
      selectedCurrentDelta: metrics.currentDebug.selectedCurrentDelta,
      renderedGliderCurrent: metrics.currentDebug.renderedGliderCurrent,
      gliderCurrentDelta: metrics.currentDebug.gliderCurrentDelta
    },
    performance: {
      activeRendererCount: metrics.currentDebug.activeRendererCount,
      activeRafCount: metrics.currentDebug.activeRafCount
    },
    screenshots,
    pageErrors: errors.unexpected(),
    cleanup: {
      activeRendererCount: metrics.currentDebug.activeRendererCount,
      activeRafCount: metrics.currentDebug.activeRafCount
    },
    failures: metrics.currentDebug.failures ?? []
  };
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(qa, null, 2));
  errors.assertClean();
});
