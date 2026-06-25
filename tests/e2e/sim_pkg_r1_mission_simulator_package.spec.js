import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';

export const EXACT_TITLES = [
  'Production Simulation Uses Package Mission Kernel',
  'Play Pause Step Finish Preserve Canonical Package Semantics',
  'Browser and Headless Share Mission Simulation Outcomes',
  'Mission Simulator Package Runs From GitHub Pages Subpath'
];

test.setTimeout(180000);
test.use({ viewport: { width: 1280, height: 800 } });

test.beforeAll(async () => {
  server = await startStaticServer({ port: 9391 });
});

test.afterAll(async () => {
  await new Promise((resolve) => server?.close(resolve));
});

test(EXACT_TITLES[0], async ({ page }) => {
  const browserErrors = attachBrowserErrorCollector(page, { ignoreFavicon: true });
  await page.goto(BASE + '/');
  const result = await runBrowserSimulation(page, { mode: 'single-step' });
  expect(result.packageDebug.packageVersion).toBe('mission-simulator-kernel-sim-pkg-r1');
  expect(result.packageDebug.inputDigest).toMatch(/^fnv1a32:/);
  expect(result.packageDebug.stateDigest).toMatch(/^fnv1a32:/);
  expect(result.packageDebug.timeSeconds).toBeGreaterThan(0);
  expect(result.packageDebug.simulatorStepCount).toBeGreaterThanOrEqual(1);
  expect(result.packageDebug.packageOwnsEnvironmentGeneration).toBe(false);
  expect(result.packageDebug.packageOwnsPlanning).toBe(false);
  expect(result.packageDebug.packageOwnsScoring).toBe(false);
  expect(result.packageDebug.packageOwnsRendering).toBe(false);
  expect(result.packageDebug.packageUsesThree).toBe(false);
  expect(result.packageDebug.packageUsesPhaser).toBe(false);
  expect(result.packageDebug.packageUsesDom).toBe(false);
  browserErrors.assertClean();
});

test(EXACT_TITLES[1], async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await runBrowserSimulation(page, { mode: 'controls' });
  expect(result.afterPlayTime).toBeGreaterThan(result.initialTime);
  expect(result.afterPausedStepTime).toBe(result.afterPauseTime);
  expect(result.afterStepOnceTime).toBeGreaterThan(result.afterPausedStepTime);
  expect(result.terminal).toBe(true);
  expect(result.packageDebug.terminal).toBe(true);
  expect(result.packageDebug.simulatorFinishCount).toBeGreaterThanOrEqual(1);
  expect(result.packageDebug.rawMetricSummary.completed).toBe(true);
});

test(EXACT_TITLES[2], async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await page.evaluate(async () => {
    const pkg = await import('/packages/mission-simulator/src/index.js');
    const { runHeadlessMission } = await import('/src/core/headless/runtime/HeadlessMissionRunner.js');
    const episode = runHeadlessMission({ seed: 'sim-pkg-r1-browser-headless', scenario: 'coastalBloomFront', grid: { width: 8, height: 8, depthCount: 3 }, missionConfig: { planningRules: { stepDistance: 2 } } });
    const restored = pkg.restoreMissionSimulationSnapshot(episode.missionSimulation.snapshot, { input: episode.missionSimulation.input });
    const restoredDigest = pkg.missionSimulationResultDigest(restored);
    return {
      packageVersion: pkg.PACKAGE_VERSION,
      inputDigest: episode.missionSimulation.inputDigest,
      restoredInputDigest: restored.input.inputDigest,
      environmentArtifactDigest: episode.missionSimulation.environmentArtifactDigest,
      planDigest: episode.missionSimulation.planDigest,
      headlessDigest: episode.missionSimulation.resultDigest,
      restoredDigest,
      headlessDebug: episode.missionSimulation.debug,
      headlessTerminal: episode.missionSimulation.debug.terminal,
      headlessRawMetrics: episode.missionSimulation.debug.rawMetricSummary
    };
  });
  expect(result.packageVersion).toBe('anchor-mission-simulator-sim-pkg-r1');
  expect(result.inputDigest).toMatch(/^fnv1a32:/);
  expect(result.restoredInputDigest).toBe(result.inputDigest);
  expect(result.environmentArtifactDigest).toBe(null);
  expect(result.planDigest).toMatch(/^fnv1a32:/);
  expect(result.headlessDigest).toMatch(/^fnv1a32:/);
  expect(result.restoredDigest).toBe(result.headlessDigest);
  expect(result.headlessDebug.packageUsesDom).toBe(false);
  expect(result.headlessTerminal).toBe(true);
  expect(result.headlessRawMetrics.observationCount).toBeGreaterThan(0);
});

test(EXACT_TITLES[3], async ({ page }) => {
  const failedResponses = [];
  const moduleResponses = [];
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
    if (url.includes('/packages/mission-simulator/src/')) moduleResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] ?? '' });
  });
  await page.goto(BASE + '/auv-glider-planner-game/');
  const result = await page.evaluate(async () => {
    const pkg = await import('/packages/mission-simulator/src/index.js');
    const input = pkg.createMissionSimulationInput({ agentConfigurations: [{ id: 'g1', start: { x: 0, y: 0 } }], plan: { agentPlans: [{ agentId: 'g1', waypoints: [{ id: 'w1', x: 1, y: 0 }] }] }, missionDurationSeconds: 3, timeStepSeconds: 1 });
    const simulator = pkg.createMissionSimulator(input);
    pkg.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
    return { packageVersion: pkg.PACKAGE_VERSION, stateDigest: simulator.state.stateDigest };
  });
  expect(result.packageVersion).toBe('anchor-mission-simulator-sim-pkg-r1');
  expect(result.stateDigest).toMatch(/^fnv1a32:/);
  expect(moduleResponses.some((entry) => entry.url.includes('/packages/mission-simulator/src/index.js'))).toBe(true);
  expect(moduleResponses.every((entry) => entry.status === 200 && (entry.contentType.includes('javascript') || entry.contentType.includes('text/plain') || entry.contentType.includes('application/octet-stream')))).toBe(true);
  expect(failedResponses).toEqual([]);
});

async function runBrowserSimulation(page, { mode }) {
  return page.evaluate(async ({ mode }) => {
    const { SimulationEngine } = await import('/src/core/sim/SimulationEngine.js');
    const zeros = (w, h, value = 0) => Array.from({ length: h }, () => Array(w).fill(value));
    const currents = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => [0, 0]));
    const level = {
      levelId: 'sim-pkg-r1-browser-level',
      world: { grid: { width: 6, height: 6 }, time: { dt: 1, duration: 8 } },
      layers: { terrain: zeros(6, 6), hazards: zeros(6, 6), truth: { frames: [{ t: 0, current: currents(6, 6), roi: zeros(6, 6, 0.25) }] } },
      meta: { seed: 'sim-pkg-r1-browser' }
    };
    const mission = { missionId: 'sim-pkg-r1-browser-mission', agents: [{ id: 'g1', label: 'Glider 1', start: { x: 1, y: 1 }, maxSpeed: 1.5, battery: 100 }], rules: {}, scoring: {} };
    const plan = { schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [{ agentId: 'g1', selectedStart: { x: 1, y: 1 }, waypoints: [{ id: 'w1', x: 4, y: 1, action: 'sample', t: 3 }] }] };
    const engine = new SimulationEngine({ level, mission, plan, time: 0 });
    const initialTime = engine.t;
    if (mode === 'single-step') {
      engine.stepOnce();
      engine.getSummary();
      return { packageDebug: globalThis.ANCHOR_MISSION_SIMULATOR_DEBUG };
    }
    engine.play();
    engine.step(1);
    const afterPlayTime = engine.t;
    engine.pause();
    const afterPauseTime = engine.t;
    engine.step(1);
    const afterPausedStepTime = engine.t;
    engine.stepOnce();
    const afterStepOnceTime = engine.t;
    engine.runUntilComplete(30);
    engine.getSummary();
    return { initialTime, afterPlayTime, afterPauseTime, afterPausedStepTime, afterStepOnceTime, terminal: engine.complete, packageDebug: globalThis.ANCHOR_MISSION_SIMULATOR_DEBUG };
  }, { mode });
}