import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9367';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-r2a-5-2-timeline-to-gpu');

const EXACT_TITLES = [
  'Canonical Current Timeline Updates Three GPU Current Attributes',
  'Adaptive Current Density Classifies Rendered and Filtered Samples',
  'FLOW-R2A.5.2 Pixel Evidence Shows Dynamic Current Frames'
];

test.setTimeout(180000);
test.use({ viewport: { width: 1280, height: 820 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9367 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function evaluateTimelineBinding(page) {
  await page.goto(BASE + '/');
  return page.evaluate(async () => {
    const { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel } = await import('./tools/js/flow_r2a4_production_helpers.mjs');
    const { currentPresentationCacheSignature, currentSourceTimeFrameSignature } = await import('./src/core/rendering/CurrentPresentationState.js');
    const { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } = await import('./src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js');

    const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-r2a5-2-e2e-binding' });
    fixture.state.ui.waterColumn.currentDisplayMode = 'stackedDepthField';
    fixture.state.ui.waterColumn.showContextCurrents = true;
    fixture.state.ui.waterColumn.currentVectorDensity = 'balanced';
    const vmAt = (timeSeconds) => {
      fixture.state.planningTime = timeSeconds;
      return buildNormalGeneratedCurrentViewModel({ fixture }).viewModel;
    };
    const times = vmAt(0).waterColumnExplorer.currentCube.timeAxisSeconds;
    const t0 = times[0] ?? 0;
    const t1 = times[Math.min(2, times.length - 1)] ?? t0;
    const layer = createThreeInstancedCurrentGlyphLayer();
    const firstVm = vmAt(t0);
    updateThreeInstancedCurrentGlyphLayer(layer, firstVm);
    const first = threeInstancedCurrentGlyphLayerSummary(layer, firstVm);
    updateThreeInstancedCurrentGlyphLayer(layer, firstVm);
    const repeated = threeInstancedCurrentGlyphLayerSummary(layer, firstVm);
    const laterVm = vmAt(t1);
    updateThreeInstancedCurrentGlyphLayer(layer, laterVm);
    const later = threeInstancedCurrentGlyphLayerSummary(layer, laterVm);
    return {
      t0,
      t1,
      first,
      repeated,
      later,
      firstCacheSignature: currentPresentationCacheSignature(firstVm),
      laterCacheSignature: currentPresentationCacheSignature(laterVm),
      firstSourceFrameSignature: currentSourceTimeFrameSignature(firstVm),
      laterSourceFrameSignature: currentSourceTimeFrameSignature(laterVm)
    };
  });
}

async function evaluateDensity(page) {
  await page.goto(BASE + '/');
  return page.evaluate(async () => {
    const { buildFlowR2A5CurrentDynamicsMetrics, renderSummaryFor } = await import('./tools/js/flow_r2a5_current_dynamics_helpers.mjs');
    const metrics = buildFlowR2A5CurrentDynamicsMetrics({ seed: 'flow-r2a5-2-e2e-density' });
    const withDensity = (density) => {
      const vm = {
        ...metrics.viewModel,
        waterColumn: { ...(metrics.viewModel.waterColumn ?? {}), currentDisplayMode: 'stackedDepthField', showContextCurrents: true, currentVectorDensity: density },
        displaySettings: {
          ...(metrics.viewModel.displaySettings ?? {}),
          waterColumn: { ...(metrics.viewModel.displaySettings?.waterColumn ?? {}), currentDisplayMode: 'stackedDepthField', showContextCurrents: true, currentVectorDensity: density }
        }
      };
      return renderSummaryFor(vm, 'stackedDepthField');
    };
    return { sparse: withDensity('sparse'), balanced: withDensity('balanced'), source: withDensity('sourceDensity') };
  });
}

test(EXACT_TITLES[0], async ({ page }) => {
  const result = await evaluateTimelineBinding(page);
  expect(result.t1).not.toBe(result.t0);
  expect(result.first.currentPresentationTimeSeconds).toBe(result.t0);
  expect(result.later.currentPresentationTimeSeconds).toBe(result.t1);
  expect(result.repeated.currentDataUploadSkipped).toBe(true);
  expect(result.repeated.glyphBufferUpdateCount).toBe(result.first.glyphBufferUpdateCount);
  expect(result.later.glyphBufferUpdateCount).toBeGreaterThan(result.repeated.glyphBufferUpdateCount);
  expect(result.later.currentDataDigest).not.toBe(result.first.currentDataDigest);
  expect(result.later.currentDirectionDigest).not.toBe(result.first.currentDirectionDigest);
  expect(result.firstCacheSignature).not.toBe(result.laterCacheSignature);
  expect(result.firstSourceFrameSignature).not.toBe(result.laterSourceFrameSignature);
});

test(EXACT_TITLES[1], async ({ page }) => {
  const result = await evaluateDensity(page);
  for (const summary of [result.sparse, result.balanced, result.source]) {
    expect(summary.currentSampleConservationCheck).toBe(true);
    expect(summary.visibleVectorInstanceCount).toBeGreaterThan(0);
    expect(summary.glyphDrawCallCount).toBe(1);
    expect(summary.noPerVectorThreeObjects).toBe(true);
    expect(summary.rendererOwnsCurrent).toBe(false);
    expect(summary.changesOfficialScoring).toBe(false);
  }
  expect(result.balanced.visibleVectorInstanceCount).toBeGreaterThanOrEqual(result.sparse.visibleVectorInstanceCount);
  expect(result.source.visibleVectorInstanceCount).toBeGreaterThanOrEqual(result.balanced.visibleVectorInstanceCount);
  expect(result.balanced.visibleDepthCount).toBeGreaterThanOrEqual(3);
});

test(EXACT_TITLES[2], async ({ page }) => {
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  const setup = await page.evaluate(async () => {
    const { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel } = await import('./tools/js/flow_r2a4_production_helpers.mjs');
    const { createThreeMissionWorldRenderer, updateThreeMissionWorldRenderer, setThreeMissionWorldCamera } = await import('./src/game/three/ThreeMissionWorldRenderer.js');
    const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-r2a5-2-pixel-evidence' });
    fixture.state.ui.waterColumn.currentDisplayMode = 'stackedDepthField';
    fixture.state.ui.waterColumn.showContextCurrents = true;
    fixture.state.ui.waterColumn.currentVectorDensity = 'balanced';
    fixture.state.ui.waterColumn.currentMagnitudeScale = 3.2;
    const host = document.createElement('div');
    host.id = 'flow-r2a52-current-canvas-host';
    host.style.cssText = 'position:fixed;left:24px;top:24px;width:760px;height:520px;background:#06111f;z-index:9999;border:1px solid #5eead4;';
    document.body.appendChild(host);
    const vmAt = (timeSeconds) => {
      fixture.state.planningTime = timeSeconds;
      const vm = buildNormalGeneratedCurrentViewModel({ fixture }).viewModel;
      vm.presentationDirtyCategories = ['currentVectors', 'waterColumn'];
      return vm;
    };
    const times = vmAt(0).waterColumnExplorer.currentCube.timeAxisSeconds;
    const t0 = times[0] ?? 0;
    const t1 = times[Math.min(2, times.length - 1)] ?? t0;
    const renderer = createThreeMissionWorldRenderer(host, { width: 760, height: 520, qualityProfile: 'balanced' });
    setThreeMissionWorldCamera(renderer, { preset: 'obliqueMission' });
    window.__flowR2A52 = { renderer, fixture, vmAt, t0, t1, updateThreeMissionWorldRenderer };
    updateThreeMissionWorldRenderer(renderer, vmAt(t0));
    renderer.renderer.render(renderer.scene, renderer.camera);
    return { t0, t1, first: renderer.instancedCurrentGlyphLayer.lastSummary };
  });
  expect(setup.t1).not.toBe(setup.t0);
  const hostExists = await page.evaluate(() => Boolean(document.getElementById('flow-r2a52-current-canvas-host')));
  expect(hostExists).toBe(true);
  await page.waitForTimeout(100);
  const firstPng = await page.screenshot({ path: path.join(REVIEW_DIR, 'current-frame-t0.png'), fullPage: true });
  const after = await page.evaluate(() => {
    const state = window.__flowR2A52;
    const vm = state.vmAt(state.t1);
    state.updateThreeMissionWorldRenderer(state.renderer, vm);
    state.renderer.renderer.render(state.renderer.scene, state.renderer.camera);
    return state.renderer.instancedCurrentGlyphLayer.lastSummary;
  });
  await page.waitForTimeout(100);
  const laterPng = await page.screenshot({ path: path.join(REVIEW_DIR, 'current-frame-t1.png'), fullPage: true });
  const changedBytes = countByteDelta(firstPng, laterPng);
  expect(after.currentPresentationTimeSeconds).toBe(setup.t1);
  expect(after.currentDataDigest).not.toBe(setup.first.currentDataDigest);
  expect(changedBytes).toBeGreaterThan(2048);
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify({ setup, after, changedBytes }, null, 2));
});

function countByteDelta(a, b) {
  const length = Math.min(a.length, b.length);
  let changed = Math.abs(a.length - b.length);
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) changed += 1;
  }
  return changed;
}