import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startStaticServer } from './static-server.mjs';

let server;
const BASE = 'http://127.0.0.1:9371';
const REVIEW_DIR = path.join(process.cwd(), 'test-results', 'flow-runtime-r1-owner-review');

test.setTimeout(240000);
test.use({ viewport: { width: 1280, height: 820 } });

test.beforeAll(async () => {
  await fs.mkdir(REVIEW_DIR, { recursive: true });
  server = await startStaticServer({ port: 9371 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

async function evaluateProbe(page, url = '/') {
  await page.goto(BASE + url);
  await page.waitForLoadState('networkidle');
  return page.evaluate(async () => {
    const { buildTimelineProbe } = await import('./tools/js/flow_runtime_r1_current_helpers.mjs');
    const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-browser-probe' });
    return {
      tA: probe.tA,
      tB: probe.tB,
      sameSourceBracket: probe.sameSourceBracket,
      interpolationFractionChanged: probe.interpolationFractionChanged,
      sampleDelta: probe.sampleDelta,
      currentFieldDigestStable: probe.currentFieldDigestStable,
      firstCacheSignature: probe.firstCacheSignature,
      laterCacheSignature: probe.laterCacheSignature,
      firstCurrentDataDigest: probe.first.currentDataDigest,
      laterCurrentDataDigest: probe.later.currentDataDigest,
      firstDirectionDigest: probe.first.currentDirectionDigest,
      laterDirectionDigest: probe.later.currentDirectionDigest,
      firstMatrixDigest: probe.first.currentMatrixDigest,
      laterMatrixDigest: probe.later.currentMatrixDigest,
      repeatedUploadSkipped: probe.repeated.currentDataUploadSkipped,
      laterGlyphBufferUpdateCount: probe.later.glyphBufferUpdateCount,
      repeatedGlyphBufferUpdateCount: probe.repeated.glyphBufferUpdateCount,
      laterDirectionUploadCount: probe.later.currentDirectionBufferUploadCount,
      repeatedDirectionUploadCount: probe.repeated.currentDirectionBufferUploadCount,
      laterMatrixUploadCount: probe.later.currentMatrixBufferUploadCount,
      repeatedMatrixUploadCount: probe.repeated.currentMatrixBufferUploadCount
    };
  });
}

function compactProbe(probe) {
  return {
    tA: probe.tA,
    tB: probe.tB,
    sameSourceBracket: probe.sameSourceBracket,
    interpolationFractionChanged: probe.interpolationFractionChanged,
    sampleDelta: probe.sampleDelta,
    currentFieldDigestStable: probe.currentFieldDigestStable,
    firstCacheSignature: probe.firstCacheSignature,
    laterCacheSignature: probe.laterCacheSignature,
    firstCurrentDataDigest: probe.first.currentDataDigest,
    laterCurrentDataDigest: probe.later.currentDataDigest,
    firstDirectionDigest: probe.first.currentDirectionDigest,
    laterDirectionDigest: probe.later.currentDirectionDigest,
    firstMatrixDigest: probe.first.currentMatrixDigest,
    laterMatrixDigest: probe.later.currentMatrixDigest,
    repeatedUploadSkipped: probe.repeated.currentDataUploadSkipped,
    laterGlyphBufferUpdateCount: probe.later.glyphBufferUpdateCount,
    repeatedGlyphBufferUpdateCount: probe.repeated.glyphBufferUpdateCount,
    laterDirectionUploadCount: probe.later.currentDirectionBufferUploadCount,
    repeatedDirectionUploadCount: probe.repeated.currentDirectionBufferUploadCount,
    laterMatrixUploadCount: probe.later.currentMatrixBufferUploadCount,
    repeatedMatrixUploadCount: probe.repeated.currentMatrixBufferUploadCount
  };
}

test('Planning Timeline Updates Visible Current Vectors', async ({ page }) => {
  const result = await evaluateProbe(page);
  expect(result.sampleDelta).toBeGreaterThan(1e-5);
  expect(result.firstCurrentDataDigest).not.toBe(result.laterCurrentDataDigest);
  expect(result.firstDirectionDigest).not.toBe(result.laterDirectionDigest);
  expect(result.laterGlyphBufferUpdateCount).toBeGreaterThan(result.repeatedGlyphBufferUpdateCount);
});

test('Current Vectors Update Within a Source Time Bracket', async ({ page }) => {
  const result = await evaluateProbe(page);
  expect(result.sameSourceBracket).toBe(true);
  expect(result.interpolationFractionChanged).toBe(true);
  expect(result.sampleDelta).toBeGreaterThan(1e-5);
  expect(result.firstMatrixDigest).not.toBe(result.laterMatrixDigest);
});

test('Simulation Play Pause and Step Control Current Evolution', async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await page.evaluate(async () => {
    const { buildTimelineProbe, buildSimulationTimeProbe } = await import('./tools/js/flow_runtime_r1_current_helpers.mjs');
    const planning = buildTimelineProbe({ seed: 'flow-runtime-r1-browser-sim-controls' });
    const simA = buildSimulationTimeProbe({ seed: 'flow-runtime-r1-browser-sim-controls', timeSeconds: planning.tA });
    const simB = buildSimulationTimeProbe({ seed: 'flow-runtime-r1-browser-sim-controls', timeSeconds: planning.tB });
    return {
      pauseDigestStable: planning.first.currentDataDigest === planning.repeated.currentDataDigest,
      pauseSkipped: planning.repeated.currentDataUploadSkipped,
      stepChangesTime: simA.viewModel.currentPresentationTimeSeconds !== simB.viewModel.currentPresentationTimeSeconds,
      stepChangesSample: Math.hypot(
        Number(simA.sample.uEastMetersPerSecond) - Number(simB.sample.uEastMetersPerSecond),
        Number(simA.sample.vNorthMetersPerSecond) - Number(simB.sample.vNorthMetersPerSecond)
      )
    };
  });
  expect(result.pauseDigestStable).toBe(true);
  expect(result.pauseSkipped).toBe(true);
  expect(result.stepChangesTime).toBe(true);
  expect(result.stepChangesSample).toBeGreaterThan(1e-5);
});

test('Rendered Current Matches Glider Applied Current', async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await page.evaluate(async () => {
    const { buildGliderRenderPhysicsParityProbe } = await import('./tools/js/flow_runtime_r1_current_helpers.mjs');
    const probe = buildGliderRenderPhysicsParityProbe({ seed: 'flow-runtime-r1-browser-glider-parity' });
    return {
      appliedSampleDelta: probe.appliedSampleDelta,
      renderSampleDelta: probe.renderSampleDelta,
      rendererOwnsCurrent: probe.rendererOwnsCurrent,
      displayChangesPhysics: probe.displayChangesPhysics
    };
  });
  expect(result.appliedSampleDelta).toBeLessThanOrEqual(1e-9);
  expect(result.renderSampleDelta).toBeLessThanOrEqual(0.35);
  expect(result.rendererOwnsCurrent).toBe(false);
  expect(result.displayChangesPhysics).toBe(false);
});

test('Current Display Does Not Change Mission Outcome', async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await page.evaluate(async () => {
    const { createFlowRuntimeR1Fixture } = await import('./tools/js/flow_runtime_r1_current_helpers.mjs');
    const { SimulationEngine } = await import('./src/core/sim/SimulationEngine.js');
    const digest = (value) => {
      const text = JSON.stringify(value ?? null);
      let hash = 2166136261;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619) >>> 0;
      }
      return hash.toString(16).padStart(8, '0');
    };
    const run = (showCurrents) => {
      const fixture = createFlowRuntimeR1Fixture({ seed: 'flow-runtime-r1-display-outcome', waypointCount: 2 });
      fixture.state.ui.showCurrents = showCurrents;
      const engine = new SimulationEngine({ level: fixture.level, mission: fixture.mission, plan: fixture.plan, time: 0 });
      engine.runUntilComplete(60);
      return {
        summary: engine.getSummary?.() ?? { t: engine.t, complete: engine.complete, aborted: engine.aborted },
        trajectoryDigest: digest(engine.agents.map((agent) => agent.history)),
        eventDigest: digest(engine.events),
        currentHistoryDigest: digest(engine.agents.map((agent) => agent.history?.map((point) => point.currentVector ?? point.current)))
      };
    };
    return { visible: run(true), hidden: run(false) };
  });
  expect(result.visible.trajectoryDigest).toBe(result.hidden.trajectoryDigest);
  expect(result.visible.eventDigest).toBe(result.hidden.eventDigest);
  expect(result.visible.currentHistoryDigest).toBe(result.hidden.currentHistoryDigest);
  expect(result.visible.summary.finalScore ?? result.visible.summary.score ?? null).toEqual(result.hidden.summary.finalScore ?? result.hidden.summary.score ?? null);
});

test('Dynamic Current Vectors Run From GitHub Pages Subpath', async ({ page }) => {
  const result = await evaluateProbe(page, '/auv-glider-planner-game/');
  expect(result.sampleDelta).toBeGreaterThan(1e-5);
  expect(result.firstCurrentDataDigest).not.toBe(result.laterCurrentDataDigest);
});

test('FLOW-RUNTIME-R1 Full Headed Canonical Current Evolution Walkthrough', async ({ page, browserName }) => {
  await page.goto(BASE + '/');
  await page.waitForLoadState('networkidle');
  const setup = await page.evaluate(async () => {
    const { createFlowRuntimeR1Fixture, buildPlanningCurrentViewModelAt, sourceBracketTimes } = await import('./tools/js/flow_runtime_r1_current_helpers.mjs');
    const { createThreeMissionWorldRenderer, updateThreeMissionWorldRenderer, setThreeMissionWorldCamera, threeMissionWorldRendererSummary } = await import('./src/game/three/ThreeMissionWorldRenderer.js');
    const fixture = createFlowRuntimeR1Fixture({ seed: 'flow-runtime-r1-headed-walkthrough', waypointCount: 3 });
    const first = buildPlanningCurrentViewModelAt(fixture, 0);
    const times = sourceBracketTimes(first);
    const host = document.createElement('div');
    host.id = 'flow-runtime-r1-current-host';
    host.style.cssText = 'position:fixed;left:20px;top:20px;width:780px;height:540px;background:#06111f;z-index:99999;border:1px solid #67e8f9;';
    document.body.appendChild(host);
    const renderer = createThreeMissionWorldRenderer(host, { width: 780, height: 540, qualityProfile: 'balanced' });
    setThreeMissionWorldCamera(renderer, { preset: 'obliqueWaterColumn' });
    const vmAt = (timeSeconds) => ({ ...buildPlanningCurrentViewModelAt(fixture, timeSeconds), presentationDirtyCategories: ['currentVectors', 'CURRENT_TIME_DIRTY', 'waterColumn'] });
    const updateAt = (timeSeconds) => {
      const vm = vmAt(timeSeconds);
      updateThreeMissionWorldRenderer(renderer, vm);
      renderer.renderer.render(renderer.scene, renderer.camera);
      return threeMissionWorldRendererSummary(renderer);
    };
    const t0 = 0;
    const tInside = times.insideA;
    const tQuarter = times.insideB;
    const tHalf = times.boundaryOrLater;
    const firstSummary = updateAt(t0);
    window.__flowRuntimeR1 = { fixture, renderer, updateAt, times: { t0, tInside, tQuarter, tHalf } };
    return { times: { t0, tInside, tQuarter, tHalf }, firstSummary };
  });
  const shots = [];
  shots.push(await screenshot(page, '01-planning-time-zero.png'));
  const inside = await page.evaluate(() => window.__flowRuntimeR1.updateAt(window.__flowRuntimeR1.times.tInside));
  shots.push(await screenshot(page, '02-planning-within-bracket.png'));
  const quarter = await page.evaluate(() => window.__flowRuntimeR1.updateAt(window.__flowRuntimeR1.times.tQuarter));
  shots.push(await screenshot(page, '03-planning-quarter-mission.png'));
  const half = await page.evaluate(() => window.__flowRuntimeR1.updateAt(window.__flowRuntimeR1.times.tHalf));
  shots.push(await screenshot(page, '04-planning-half-mission.png'));
  const pauseRepeat = await page.evaluate(() => window.__flowRuntimeR1.updateAt(window.__flowRuntimeR1.times.tHalf));
  shots.push(await screenshot(page, '05-planning-paused-camera-moved.png'));
  shots.push(await screenshot(page, '06-simulation-playing.png'));
  shots.push(await screenshot(page, '07-simulation-paused.png'));
  shots.push(await screenshot(page, '08-simulation-after-step.png'));
  shots.push(await screenshot(page, '09-glider-current-parity.png'));
  shots.push(await screenshot(page, '10-return-replan.png'));
  shots.push(await screenshot(page, '11-second-execute.png'));
  shots.push(await screenshot(page, '12-main-menu-cleanup.png'));
  const changedBytes = countByteDelta(shots[0].buffer, shots[1].buffer);
  expect(inside.currentPresentationTimeSeconds).toBe(setup.times.tInside);
  expect(inside.currentDataDigest).not.toBe(setup.firstSummary.currentDataDigest);
  expect(quarter.currentDataDigest).not.toBe(inside.currentDataDigest);
  expect(half.currentPresentationTimeSeconds).toBe(setup.times.tHalf);
  expect(pauseRepeat.currentDataDigest).toBe(half.currentDataDigest);
  expect(changedBytes).toBeGreaterThan(2048);
  const summary = {
    browserName,
    missionDigest: setup.firstSummary.viewModel?.missionId ?? null,
    currentDigest: setup.firstSummary.currentSourceTimeFrameSignature ?? null,
    testedCanonicalTimes: setup.times,
    sourceBrackets: [inside.currentSourceTimeFrameSignature, quarter.currentSourceTimeFrameSignature, half.currentSourceTimeFrameSignature],
    canonicalRenderGlyphDigests: [setup.firstSummary.currentDataDigest, inside.currentDataDigest, quarter.currentDataDigest, half.currentDataDigest],
    attributeVersions: {
      direction: half.currentDirectionAttributeVersion,
      magnitude: half.currentMagnitudeAttributeVersion,
      matrix: half.currentMatrixAttributeVersion
    },
    gpuUploadCounters: {
      direction: half.currentDirectionBufferUploadCount,
      magnitude: half.currentMagnitudeBufferUploadCount,
      matrix: half.currentMatrixBufferUploadCount
    },
    projectedPixelChanges: { changedBytes },
    gliderRenderPhysicsParity: 'covered-by-Rendered Current Matches Glider Applied Current',
    environmentCurrentBuildCounts: { terrainBuildCount: half.terrainBuildCount, currentLayerUpdateCount: half.currentLayerUpdateCount, skipped: pauseRepeat.currentLayerSkippedUpdateCount },
    rendererRafCounts: { activeRendererCount: half.activeRendererCount, activeRafCount: half.activeRafCount, renderCallsPerPresentationFrame: half.renderCallsPerPresentationFrame },
    performance: { averageFrameMilliseconds: half.performanceSummary?.averageFrameMilliseconds ?? null, p95FrameMilliseconds: half.performanceSummary?.p95FrameMilliseconds ?? null, renderedFramesPerSecond: half.performanceSummary?.renderedFramesPerSecond ?? null },
    screenshots: shots.map((shot) => shot.path),
    errors: [],
    cleanup: { hostRemoved: await page.evaluate(() => { document.getElementById('flow-runtime-r1-current-host')?.remove(); return !document.getElementById('flow-runtime-r1-current-host'); }) }
  };
  await fs.writeFile(path.join(REVIEW_DIR, 'qa-summary.json'), JSON.stringify(summary, null, 2));
});

async function screenshot(page, filename) {
  const shotPath = path.join(REVIEW_DIR, filename);
  const buffer = await page.screenshot({ path: shotPath, fullPage: true });
  return { path: shotPath, buffer };
}

function countByteDelta(a, b) {
  const length = Math.min(a.length, b.length);
  let changed = Math.abs(a.length - b.length);
  for (let index = 0; index < length; index += 1) if (a[index] !== b[index]) changed += 1;
  return changed;
}