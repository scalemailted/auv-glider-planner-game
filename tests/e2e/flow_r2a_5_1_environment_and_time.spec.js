import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9366';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-r2a-5-1-owner-review');

const EXACT_TITLES = [
  'Normal Generated Currents Span Full Mission Time',
  'Periodic Current Fields Wrap Instead of Clamping',
  'Current Depth Layer Filters Hide Only Requested Layers',
  'Calm Wet Cells Render Neutral Current Markers',
  'Environment Generator Manifest Is Reproducible In Browser',
  'FLOW-R2A.5.1 Full Headed Environment Time and Layer Walkthrough'
];

test.setTimeout(180000);
test.use({ viewport: { width: 1600, height: 900 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9366 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function evaluateFlowR2A51(page) {
  await page.goto(BASE + '/');
  return page.evaluate(async () => {
    const { buildFlowR2A5CurrentDynamicsMetrics } = await import('./tools/js/flow_r2a5_current_dynamics_helpers.mjs');
    const { sampleOceanCurrent } = await import('./src/core/science/OceanCurrentFieldSampler.js');
    const { createOceanCurrentField4D } = await import('./src/core/science/OceanCurrentField4D.js');
    const { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } = await import('./src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js');
    const { createSyntheticEnvironmentManifest } = await import('./src/core/environment/SyntheticEnvironmentManifest.js');
    const { createGeneratedEnvironmentArtifact, generatedEnvironmentArtifactSummary } = await import('./src/core/environment/GeneratedEnvironmentArtifact.js');

    const metrics = buildFlowR2A5CurrentDynamicsMetrics({ seed: 'flow-r2a5-1-browser' });
    const duration = Number(metrics.fixture.level.world?.operationalDomain?.time?.durationSeconds ?? metrics.fixture.level.operationalDomain?.time?.durationSeconds ?? metrics.fixture.level.world?.time?.durationSeconds ?? metrics.fixture.level.world?.time?.duration ?? 0);
    const late = sampleOceanCurrent({ field: metrics.field, eastMeters: metrics.column.eastMeters, northMeters: metrics.column.northMeters, depthMeters: metrics.sourceDepthAxis[1] ?? 0, timeSeconds: duration, interpolation: 'linear4d' });

    const periodic = createOceanCurrentField4D({
      grid: { width: 2, height: 2 },
      depthAxisMeters: [0],
      timeAxisSeconds: [0, 300, 600],
      temporalBoundaryMode: 'periodic',
      temporalPeriodSeconds: 600,
      validTimeStartSeconds: 0,
      validTimeEndSeconds: 600,
      uEastMetersPerSecond: [0.1, 0.2, 0.3].map((u) => [[Array.from({ length: 2 }, () => u), Array.from({ length: 2 }, () => u)]]),
      vNorthMetersPerSecond: [0, 0, 0].map((v) => [[Array.from({ length: 2 }, () => v), Array.from({ length: 2 }, () => v)]])
    });
    const wrapped = sampleOceanCurrent({ field: periodic, eastMeters: 0, northMeters: 0, depthMeters: 0, timeSeconds: 750 });

    const hiddenLayer = 'deep';
    const filteredViewModel = {
      ...metrics.viewModel,
      waterColumn: { ...(metrics.viewModel.waterColumn ?? {}), currentDisplayMode: 'stackedDepthField', showContextCurrents: true, hiddenLayerIds: [hiddenLayer] },
      displaySettings: {
        ...(metrics.viewModel.displaySettings ?? {}),
        waterColumn: { ...(metrics.viewModel.displaySettings?.waterColumn ?? {}), currentDisplayMode: 'stackedDepthField', showContextCurrents: true, hiddenLayerIds: [hiddenLayer] }
      }
    };
    const layer = createThreeInstancedCurrentGlyphLayer();
    updateThreeInstancedCurrentGlyphLayer(layer, filteredViewModel);
    const filtered = threeInstancedCurrentGlyphLayerSummary(layer, filteredViewModel);

    const manifestA = createSyntheticEnvironmentManifest({ seed: 'browser-env-seed', grid: { width: 6, height: 5 }, depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 200, 400, 600], validTimeEndSeconds: 3600 });
    const manifestB = createSyntheticEnvironmentManifest({ seed: 'browser-env-seed', grid: { width: 6, height: 5 }, depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 200, 400, 600], validTimeEndSeconds: 3600 });
    const manifestC = createSyntheticEnvironmentManifest({ seed: 'browser-env-other-seed', grid: { width: 6, height: 5 }, depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 200, 400, 600], validTimeEndSeconds: 3600 });
    const artifact = createGeneratedEnvironmentArtifact(manifestA, { level: { world: { grid: { width: 6, height: 5 }, operationalDomain: { time: { durationSeconds: 3600 } } } } });
    globalThis.ANCHOR_ENVIRONMENT_GENERATOR_DEBUG = generatedEnvironmentArtifactSummary(artifact);

    return {
      duration,
      sourceTimeAxis: metrics.field.timeAxisSeconds,
      fieldTemporalBoundaryMode: metrics.field.temporalBoundaryMode,
      late: slim(late),
      currentDebug: metrics.currentDebug,
      periodic: slim(wrapped),
      stacked: metrics.stacked,
      filtered,
      hiddenLayer,
      environmentDebug: globalThis.ANCHOR_ENVIRONMENT_GENERATOR_DEBUG,
      manifestA: manifestA.digest,
      manifestB: manifestB.digest,
      manifestC: manifestC.digest,
      artifactDigest: artifact.digest
    };

    function slim(sample = {}) {
      return {
        timeSeconds: sample.timeSeconds,
        currentSampleTimeSeconds: sample.currentSampleTimeSeconds,
        wrappedCurrentTimeSeconds: sample.wrappedCurrentTimeSeconds,
        lowerTimeSeconds: sample.lowerTimeSeconds,
        upperTimeSeconds: sample.upperTimeSeconds,
        temporalBoundaryMode: sample.temporalBoundaryMode,
        timeWrappedPeriodically: sample.timeWrappedPeriodically === true,
        timeClampedUnexpectedly: sample.timeClampedUnexpectedly === true,
        uEastMetersPerSecond: sample.uEastMetersPerSecond,
        vNorthMetersPerSecond: sample.vNorthMetersPerSecond
      };
    }
  });
}

test(EXACT_TITLES[0], async ({ page }) => {
  const result = await evaluateFlowR2A51(page);
  expect(result.duration).toBeGreaterThan(0);
  expect(result.sourceTimeAxis.at(-1)).toBeGreaterThanOrEqual(result.duration);
  expect(result.fieldTemporalBoundaryMode).toBe('bounded');
  expect(result.late.timeClampedUnexpectedly).toBe(false);
  expect(result.late.lowerTimeSeconds).toBeLessThanOrEqual(result.duration);
  expect(result.late.upperTimeSeconds).toBeGreaterThanOrEqual(result.duration);
  expect(result.currentDebug.timeClampedUnexpectedly).toBe(false);
});

test(EXACT_TITLES[1], async ({ page }) => {
  const result = await evaluateFlowR2A51(page);
  expect(result.periodic.temporalBoundaryMode).toBe('periodic');
  expect(result.periodic.timeWrappedPeriodically).toBe(true);
  expect(result.periodic.wrappedCurrentTimeSeconds).toBe(150);
  expect(result.periodic.timeClampedUnexpectedly).toBe(false);
});

test(EXACT_TITLES[2], async ({ page }) => {
  const result = await evaluateFlowR2A51(page);
  expect(result.filtered.visibleDepthIds).not.toContain(result.hiddenLayer);
  expect(result.filtered.visibleDepthCount).toBeLessThan(result.stacked.visibleDepthCount);
  expect(result.filtered.glyphDrawCallCount).toBe(1);
});

test(EXACT_TITLES[3], async ({ page }) => {
  const result = await evaluateFlowR2A51(page);
  expect(result.stacked.calmVectorCount).toBeGreaterThan(0);
  expect(result.stacked.calmMarkerInstanceCount).toBeGreaterThan(0);
  expect(result.stacked.calmMarkerPolicy).toMatch(/neutral instanced markers/);
  expect(result.stacked.glyphDrawCallCount).toBe(1);
});

test(EXACT_TITLES[4], async ({ page }) => {
  const result = await evaluateFlowR2A51(page);
  expect(result.manifestA).toBe(result.manifestB);
  expect(result.manifestA).not.toBe(result.manifestC);
  expect(result.environmentDebug.backendId).toBe('cpuBathymetryConditionedSyntheticV3');
  expect(result.environmentDebug.backendImplemented).toBe(true);
  expect(result.environmentDebug.calibratedForecast).toBe(false);
  expect(result.environmentDebug.usesRealHycom).toBe(false);
  expect(result.environmentDebug.usesRealMarineCopernicus).toBe(false);
  expect(result.environmentDebug.validTimeEndSeconds).toBeGreaterThanOrEqual(3600);
});

test(EXACT_TITLES[5], async ({ page }) => {
  const result = await evaluateFlowR2A51(page);
  expect(result.sourceTimeAxis.at(-1)).toBeGreaterThanOrEqual(result.duration);
  expect(result.stacked.calmMarkerInstanceCount).toBeGreaterThan(0);
  expect(result.environmentDebug.backendImplemented).toBe(true);
  await page.screenshot({ path: path.join(REVIEW_DIR, 'flow-r2a-5-1-current-stack.png'), fullPage: true });
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify({ status: 'PASS', result }, null, 2));
});