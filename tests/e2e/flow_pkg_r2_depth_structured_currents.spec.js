import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9377';

const EXACT_TITLES = [
  'Depth Uniform Current Is Explicitly Labeled Barotropic',
  'Mixed Regional Current Varies Across Physical Depth',
  'Current Layer Explorer Shows a Vertical Velocity Profile',
  'Different Dive Profiles Experience Different Currents',
  'Barotropic Control Produces Depth-Independent Drift',
  'Depth Structured Currents Run From GitHub Pages Subpath'
];

test.setTimeout(180000);

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9377 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function flowPkgR2Probe(page, path = '/') {
  await page.goto(BASE + path);
  return page.evaluate(async () => {
    const currents = await import('./packages/currents/src/index.js');
    const { buildWaterColumnLayerExplorerViewModel } = await import('./src/core/rendering/WaterColumnLayerExplorerViewModel.js');
    const { createMissionWorldCoordinateTransform } = await import('./src/core/rendering/MissionWorldCoordinates.js');
    const { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } = await import('./src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js');

    const grid = { width: 12, height: 8, cellSizeMeters: 250 };
    const depthAxisMeters = [0, 10, 35, 75, 150];
    const timeAxisSeconds = [0, 600, 1200, 1800];
    const landMask = Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false));
    const waterColumnConfig = { enabled: true, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' };
    const baseOptions = {
      grid,
      depthAxisMeters,
      timeAxisSeconds,
      landMask,
      seed: 'flow-pkg-r2-browser-depth-structure',
      temporalBoundaryMode: 'bounded',
      validTimeEndSeconds: 1800,
      environmentGeneratorBackendId: currents.CURRENT_GENERATION_BACKEND_V3_ID
    };
    const mixed = currents.createBathymetryConditionedCurrentField({ ...baseOptions, verticalStructureId: 'mixedRegionalBaroclinicV1' });
    const barotropic = currents.createBathymetryConditionedCurrentField({ ...baseOptions, verticalStructureId: 'barotropicDepthUniform' });
    const column = chooseWetMaterialColumn(mixed, depthAxisMeters, 600, currents);
    const coordinateSystem = createMissionWorldCoordinateTransform({ grid });
    const level = { currentField4D: mixed, world: { grid, time: { duration: 1800, dt: 60 }, waterColumnConfig }, layers: { terrain: landMask, truth: { frames: [] } }, bathymetry: { depthMeters: mixed.bottomDepthMeters } };
    const baseViewModel = { grid, coordinateSystem, scalarFieldLayer: { values: Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => 1)) }, selectedCell: { x: column.xIndex, y: column.yIndex } };
    const explorer = buildWaterColumnLayerExplorerViewModel({ level, waterColumnConfig, grid, baseViewModel, currentField4D: mixed, activeLayerId: 'thermocline', activeTimeSeconds: 600, selectedLocation: { x: column.xIndex, y: column.yIndex }, displayMode: 'currentVerticalProfile' });
    const glyphLayer = createThreeInstancedCurrentGlyphLayer();
    updateThreeInstancedCurrentGlyphLayer(glyphLayer, { grid, coordinateSystem, waterColumnExplorer: explorer, waterColumn: { currentDisplayMode: 'stackedDepthField', currentVectorDensity: 'sparse', showContextCurrents: true } });
    const renderSummary = threeInstancedCurrentGlyphLayerSummary(glyphLayer, { waterColumnExplorer: explorer, waterColumn: { currentDisplayMode: 'stackedDepthField', showContextCurrents: true } });

    const mixedSamples = depthAxisMeters.map((depthMeters) => slimSample(currents.sampleOceanCurrent({ field: mixed, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters, timeSeconds: 600 })));
    const barotropicSamples = depthAxisMeters.map((depthMeters) => slimSample(currents.sampleOceanCurrent({ field: barotropic, eastMeters: column.eastMeters, northMeters: column.northMeters, depthMeters, timeSeconds: 600 })));
    const renderedSamples = explorer.layers.map((layer) => {
      const vector = (layer.currentField?.vectors ?? []).find((candidate) => candidate.x === column.xIndex && candidate.y === column.yIndex);
      return {
        layerId: layer.id,
        depthMeters: layer.representativeDepthMeters,
        uEastMetersPerSecond: vector?.uEastMetersPerSecond ?? null,
        vNorthMetersPerSecond: vector?.vNorthMetersPerSecond ?? null,
        magnitudeMetersPerSecond: vector?.magnitudeMetersPerSecond ?? null,
        bearingDegrees: vector?.bearingDegrees ?? null,
        wet: vector?.wet === true,
        masked: vector?.masked === true,
        sourceDigest: vector?.sourceDigest ?? null
      };
    });
    const renderParityDeltas = renderedSamples.map((rendered) => {
      const canonical = mixedSamples.find((sample) => Math.abs(sample.depthMeters - rendered.depthMeters) <= 1e-6);
      return canonical ? vectorDelta(canonical, rendered) : Infinity;
    });
    const route = [
      { xIndex: column.xIndex, yIndex: column.yIndex, timeSeconds: 0 },
      { xIndex: column.xIndex, yIndex: column.yIndex, timeSeconds: 600 },
      { xIndex: column.xIndex, yIndex: column.yIndex, timeSeconds: 1200 }
    ];
    const shallowHistory = routeHistory(mixed, route, 10, currents);
    const deepHistory = routeHistory(mixed, route, 150, currents);
    const barotropicShallowHistory = routeHistory(barotropic, route, 10, currents);
    const barotropicDeepHistory = routeHistory(barotropic, route, 150, currents);
    const mixedSummary = currents.oceanCurrentField4DSummary(mixed);
    const barotropicSummary = currents.oceanCurrentField4DSummary(barotropic);

    return {
      packageVersion: currents.PACKAGE_VERSION,
      backendV3: currents.CURRENT_GENERATION_BACKEND_V3_ID,
      column,
      mixedDigest: mixed.digest,
      barotropicDigest: barotropic.digest,
      mixedSummary,
      barotropicSummary,
      mixedSamples,
      barotropicSamples,
      renderedSamples,
      renderParityDeltas,
      renderSummary,
      explorerProfile: explorer.selectedCurrentProfile,
      shallowHistory,
      deepHistory,
      barotropicShallowHistory,
      barotropicDeepHistory,
      mixedExposureDelta: historyDelta(shallowHistory, deepHistory),
      barotropicExposureDelta: historyDelta(barotropicShallowHistory, barotropicDeepHistory)
    };

    function chooseWetMaterialColumn(field, depths, timeSeconds, api) {
      let best = null;
      for (let y = 0; y < grid.height; y += 1) {
        for (let x = 0; x < grid.width; x += 1) {
          const eastMeters = field.eastAxisMeters[x];
          const northMeters = field.northAxisMeters[y];
          const samples = depths.map((depthMeters) => api.sampleOceanCurrent({ field, eastMeters, northMeters, depthMeters, timeSeconds }));
          const wet = samples.filter((sample) => sample.wet === true && sample.masked !== true);
          if (wet.length < depths.length) continue;
          const shallowDeepDelta = vectorDelta(samples[1] ?? samples[0], samples.at(-1));
          const pairwiseDelta = maxPairwiseDelta(wet);
          if (pairwiseDelta > 0.01 && (!best || shallowDeepDelta > best.shallowDeepDelta)) {
            best = { xIndex: x, yIndex: y, eastMeters, northMeters, bottomDepthMeters: field.bottomDepthMeters[y][x], shallowDeepDelta };
          }
        }
      }
      if (best) return best;
      throw new Error('No full-depth wet material-depth current column found for FLOW-PKG-R2 probe.');
    }

    function routeHistory(field, points, depthMeters, api) {
      return points.map((point) => slimSample(api.sampleOceanCurrent({
        field,
        eastMeters: field.eastAxisMeters[point.xIndex],
        northMeters: field.northAxisMeters[point.yIndex],
        depthMeters,
        timeSeconds: point.timeSeconds
      })));
    }

    function slimSample(sample) {
      return {
        depthMeters: sample.depthMeters,
        resolvedLayerDepthMeters: sample.lowerDepthMeters === sample.upperDepthMeters ? sample.lowerDepthMeters : null,
        lowerDepthMeters: sample.lowerDepthMeters,
        upperDepthMeters: sample.upperDepthMeters,
        depthInterpolationFraction: sample.depthInterpolationFraction,
        uEastMetersPerSecond: sample.uEastMetersPerSecond,
        vNorthMetersPerSecond: sample.vNorthMetersPerSecond,
        magnitudeMetersPerSecond: sample.magnitudeMetersPerSecond,
        bearingDegrees: sample.bearingDegrees,
        wet: sample.wet === true,
        masked: sample.masked === true,
        sourceDigest: sample.source?.digest ?? null
      };
    }

    function maxPairwiseDelta(samples) {
      let max = 0;
      for (let i = 0; i < samples.length; i += 1) {
        for (let j = i + 1; j < samples.length; j += 1) max = Math.max(max, vectorDelta(samples[i], samples[j]));
      }
      return max;
    }

    function vectorDelta(a, b) {
      return Math.hypot(Number(a.uEastMetersPerSecond ?? 0) - Number(b.uEastMetersPerSecond ?? 0), Number(a.vNorthMetersPerSecond ?? 0) - Number(b.vNorthMetersPerSecond ?? 0));
    }

    function historyDelta(a, b) {
      return Math.max(...a.map((entry, index) => vectorDelta(entry, b[index] ?? {})));
    }
  });
}

function distinctVectorCount(samples) {
  return new Set(samples.filter((sample) => sample.wet && !sample.masked).map((sample) => `${Number(sample.uEastMetersPerSecond).toFixed(4)},${Number(sample.vNorthMetersPerSecond).toFixed(4)}`)).size;
}

test(EXACT_TITLES[0], async ({ page }) => {
  const result = await flowPkgR2Probe(page);
  expect(result.barotropicSummary.generatorBackend).toBe(result.backendV3);
  expect(result.barotropicSummary.verticalStructureId).toBe('barotropicDepthUniform');
  expect(result.barotropicSummary.barotropicControl).toBe(true);
  expect(result.barotropicSummary.verticalStructureStatus).toBe('PASS');
  expect(distinctVectorCount(result.barotropicSamples)).toBe(1);
});

test(EXACT_TITLES[1], async ({ page }) => {
  const result = await flowPkgR2Probe(page);
  expect(result.mixedSummary.generatorBackend).toBe(result.backendV3);
  expect(result.mixedSummary.verticalStructureId).toBe('mixedRegionalBaroclinicV1');
  expect(result.mixedSummary.materiallyDistinctColumnFraction).toBeGreaterThanOrEqual(0.5);
  expect(distinctVectorCount(result.mixedSamples)).toBeGreaterThanOrEqual(3);
  expect(Math.max(...result.renderParityDeltas)).toBeLessThanOrEqual(1e-6);
});

test(EXACT_TITLES[2], async ({ page }) => {
  const result = await flowPkgR2Probe(page);
  expect(result.explorerProfile.verticalStructureId).toBe('mixedRegionalBaroclinicV1');
  expect(result.explorerProfile.samplesByDepth.length).toBeGreaterThanOrEqual(5);
  for (const sample of result.explorerProfile.samplesByDepth) {
    expect(Number.isFinite(sample.uEastMetersPerSecond)).toBe(true);
    expect(Number.isFinite(sample.vNorthMetersPerSecond)).toBe(true);
    expect(Number.isFinite(sample.magnitudeMetersPerSecond)).toBe(true);
    expect(Number.isFinite(sample.bearingDegrees)).toBe(true);
    expect(typeof sample.wet).toBe('boolean');
    expect(typeof sample.masked).toBe('boolean');
    expect(sample.deltaFromSurface).toBeTruthy();
  }
  expect(result.explorerProfile.samplesByDepth.some((sample) => sample.deltaFromLayerAbove?.magnitudeMetersPerSecond > 0)).toBe(true);
});

test(EXACT_TITLES[3], async ({ page }) => {
  const result = await flowPkgR2Probe(page);
  expect(result.mixedDigest).toBeTruthy();
  expect(result.shallowHistory.length).toBe(result.deepHistory.length);
  expect(result.mixedExposureDelta).toBeGreaterThan(0.01);
  expect(new Set([...result.shallowHistory, ...result.deepHistory].map((entry) => entry.sourceDigest)).size).toBe(1);
});

test(EXACT_TITLES[4], async ({ page }) => {
  const result = await flowPkgR2Probe(page);
  expect(result.barotropicSummary.verticalStructureId).toBe('barotropicDepthUniform');
  expect(result.barotropicExposureDelta).toBeLessThanOrEqual(1e-9);
});

test(EXACT_TITLES[5], async ({ page }) => {
  const failed = [];
  page.on('requestfailed', (request) => failed.push(request.url()));
  const result = await flowPkgR2Probe(page, '/auv-glider-planner-game/');
  expect(result.packageVersion).toBe('anchor-currents-flow-pkg-r1');
  expect(result.mixedSummary.generatorBackend).toBe(result.backendV3);
  expect(result.mixedSummary.depthLayerDigestCount).toBeGreaterThan(1);
  expect(result.renderSummary.visibleDepthCount).toBeGreaterThanOrEqual(5);
  expect(failed).toEqual([]);
});