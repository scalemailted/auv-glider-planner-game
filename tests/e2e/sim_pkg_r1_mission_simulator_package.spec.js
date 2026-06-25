import { expect, test } from '@playwright/test';
import { startStaticServer } from './static-server.mjs';
import { attachBrowserErrorCollector } from './helpers/BrowserErrorCollector.js';
import './helpers/SmokeSpecShared.js';

let server;
const BASE = 'http://127.0.0.1:9391';

export const EXACT_TITLES = [
  'Browser Simulation Uses Package Kernel as Sole Authority',
  'Package Kernel Preserves Play Pause Step Finish and Reset',
  'Surfacing Replan Resumes the Same Package Simulation',
  'Browser Headless and Pages Share the Authoritative Kernel'
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
  expect(result.packageDebug.packageVersion).toBe('mission-simulator-kernel-sim-pkg-r2');
  expect(result.packageDebug.engineId).toBe('packages/mission-simulator');
  expect(result.packageDebug.inputDigest).toMatch(/^fnv1a32:/);
  expect(result.packageDebug.stateDigest).toMatch(/^fnv1a32:/);
  expect(result.packageDebug.timeSeconds).toBeGreaterThan(0);
  expect(result.packageDebug.simulatorStepCount).toBeGreaterThanOrEqual(1);
  expect(result.packageDebug.packageTransitionCount).toBeGreaterThanOrEqual(1);
  expect(result.packageDebug.legacyProductionTransitionCount).toBe(0);
  expect(result.packageDebug.duplicateEngineCount).toBe(0);
  expect(result.packageDebug.packageOwnsPhysics).toBe(true);
  expect(result.packageDebug.packageOwnsRouteProgress).toBe(true);
  expect(result.packageDebug.packageOwnsEnvironmentSampling).toBe(true);
  expect(result.packageDebug.packageOwnsTerminalEvaluation).toBe(true);
  expect(result.packageDebug.packageOwnsRawMetrics).toBe(true);
  expect(result.packageDebug.packageOwnsEnvironmentGeneration).toBe(false);
  expect(result.packageDebug.packageOwnsPlanning).toBe(false);
  expect(result.packageDebug.packageOwnsOfficialScoring).toBe(false);
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
  expect(result.afterResetTime).toBe(result.initialTime);
  expect(result.afterResetDigest).toBe(result.initialDigest);
});

test(EXACT_TITLES[2], async ({ page }) => {
  await page.goto(BASE + '/');
  const result = await page.evaluate(async () => {
    const pkg = await import('/packages/mission-simulator/src/index.js');
    const input = pkg.createMissionSimulationInput({
      deterministicSeed: 'sim-pkg-r2-surfacing-replan',
      agentConfigurations: [{ id: 'g1', start: { x: 0, y: 0 }, maxSpeed: 1, battery: 100 }],
      plan: { agentPlans: [{ agentId: 'g1', waypoints: [{ id: 'w1', x: 1, y: 0 }, { id: 'w2', x: 2, y: 0 }] }] },
      missionDurationSeconds: 6,
      timeStepSeconds: 1
    });
    const simulator = pkg.createMissionSimulator(input);
    pkg.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
    simulator.pendingDecision = {
      type: 'surfacingDecision',
      reason: 'scheduledSurfacing',
      agentId: 'g1',
      actionChoices: ['resumeWithReplan', 'finishMission'],
      timeSeconds: simulator.state.timeSeconds
    };
    simulator.state = pkg.normalizeMissionSimulationState({
      ...simulator.state,
      pendingDecision: simulator.pendingDecision,
      rawMetrics: simulator.rawMetrics
    });
    const decisionSnapshot = pkg.missionSimulationSnapshot(simulator);
    const restoredAtDecision = pkg.restoreMissionSimulationSnapshot(decisionSnapshot, { input });
    const restoredDecisionDigest = restoredAtDecision.state.stateDigest;
    const decision = pkg.stepMissionSimulator(restoredAtDecision, {
      type: 'resumeWithReplan',
      decision: { action: 'resumeWithReplan', replacementPlanDigest: 'fnv1a32:testreplan' }
    });
    const afterDecisionSnapshot = pkg.missionSimulationSnapshot(restoredAtDecision);
    const afterDecisionDebug = pkg.missionSimulatorDebugSummary(restoredAtDecision);
    pkg.stepMissionSimulator(restoredAtDecision, { type: 'step', dtSeconds: 1 });
    const continuedDigest = pkg.missionSimulationResultDigest(restoredAtDecision);
    const replayedContinuation = pkg.restoreMissionSimulationSnapshot(afterDecisionSnapshot, { input });
    pkg.stepMissionSimulator(replayedContinuation, { type: 'step', dtSeconds: 1 });
    const replayedDigest = pkg.missionSimulationResultDigest(replayedContinuation);
    const replayedDebug = pkg.missionSimulatorDebugSummary(replayedContinuation);
    return {
      packageVersion: pkg.PACKAGE_VERSION,
      authoritativeRuntimeVersion: pkg.MISSION_SIMULATOR_AUTHORITATIVE_RUNTIME_VERSION,
      snapshotPendingDecision: decisionSnapshot.pendingDecision,
      snapshotStateDigest: decisionSnapshot.state.stateDigest,
      restoredDecisionDigest,
      decisionStatus: decision.status,
      decisionAction: decision.action,
      pendingAfterDecision: restoredAtDecision.pendingDecision,
      eventTypes: restoredAtDecision.events.map((event) => event.type),
      continuedDigest,
      replayedDigest,
      afterDecisionDebug,
      replayedDebug
    };
  });
  expect(result.packageVersion).toBe('anchor-mission-simulator-sim-pkg-r1');
  expect(result.authoritativeRuntimeVersion).toBe('mission-simulator-authoritative-runtime-sim-pkg-r2');
  expect(result.snapshotPendingDecision?.type).toBe('surfacingDecision');
  expect(result.restoredDecisionDigest).toBe(result.snapshotStateDigest);
  expect(result.decisionStatus).toBe('accepted');
  expect(result.decisionAction).toBeUndefined();
  expect(result.pendingAfterDecision).toBe(null);
  expect(result.eventTypes).toContain('surfaceDecision');
  expect(result.continuedDigest).toBe(result.replayedDigest);
  expect(result.afterDecisionDebug.engineId).toBe('packages/mission-simulator');
  expect(result.afterDecisionDebug.legacyProductionTransitionCount).toBe(0);
  expect(result.afterDecisionDebug.duplicateEngineCount).toBe(0);
  expect(result.afterDecisionDebug.packageTransitionCount).toBeGreaterThanOrEqual(1);
  expect(result.replayedDebug.simulatorRestoreCount).toBeGreaterThanOrEqual(1);
  expect(result.replayedDebug.legacyProductionTransitionCount).toBe(0);
  expect(result.replayedDebug.duplicateEngineCount).toBe(0);
});

test(EXACT_TITLES[3], async ({ page }) => {
  const failedResponses = [];
  const moduleResponses = [];
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.endsWith('/favicon.ico')) failedResponses.push(`${response.status()} ${url}`);
    if (url.includes('/auv-glider-planner-game/packages/mission-simulator/src/')) {
      moduleResponses.push({ url, status: response.status(), contentType: response.headers()['content-type'] ?? '' });
    }
  });
  await page.goto(BASE + '/auv-glider-planner-game/');
  const result = await page.evaluate(async () => {
    const pkg = await import('./packages/mission-simulator/src/index.js');
    const { runHeadlessMission } = await import('./src/core/headless/runtime/HeadlessMissionRunner.js');
    const input = pkg.createMissionSimulationInput({
      deterministicSeed: 'sim-pkg-r2-pages-browser',
      agentConfigurations: [{ id: 'g1', start: { x: 0, y: 0 } }],
      plan: { agentPlans: [{ agentId: 'g1', waypoints: [{ id: 'w1', x: 1, y: 0 }] }] },
      missionDurationSeconds: 3,
      timeStepSeconds: 1
    });
    const simulator = pkg.createMissionSimulator(input);
    pkg.stepMissionSimulator(simulator, { type: 'step', dtSeconds: 1 });
    const episode = runHeadlessMission({
      seed: 'sim-pkg-r2-browser-headless-pages',
      scenario: 'coastalBloomFront',
      grid: { width: 8, height: 8, depthCount: 3 },
      missionConfig: { planningRules: { stepDistance: 2 } }
    });
    const restored = pkg.restoreMissionSimulationSnapshot(episode.missionSimulation.snapshot, { input: episode.missionSimulation.input });
    const restoredDigest = pkg.missionSimulationResultDigest(restored);
    return {
      packageVersion: pkg.PACKAGE_VERSION,
      authoritativeRuntimeVersion: pkg.MISSION_SIMULATOR_AUTHORITATIVE_RUNTIME_VERSION,
      browserStateDigest: simulator.state.stateDigest,
      browserDebug: pkg.missionSimulatorDebugSummary(simulator),
      headlessInputDigest: episode.missionSimulation.inputDigest,
      restoredInputDigest: restored.input.inputDigest,
      environmentArtifactDigest: episode.missionSimulation.environmentArtifactDigest,
      planDigest: episode.missionSimulation.planDigest,
      headlessDigest: episode.missionSimulation.resultDigest,
      restoredDigest,
      headlessDebug: episode.missionSimulation.debug,
      headlessTerminal: episode.missionSimulation.debug.terminal,
      headlessRawMetrics: episode.missionSimulation.debug.rawMetricSummary,
      headlessEngineId: episode.missionSimulation.debug.engineId,
      headlessLegacyTransitions: episode.missionSimulation.debug.legacyProductionTransitionCount
    };
  });
  expect(result.packageVersion).toBe('anchor-mission-simulator-sim-pkg-r1');
  expect(result.authoritativeRuntimeVersion).toBe('mission-simulator-authoritative-runtime-sim-pkg-r2');
  expect(result.browserStateDigest).toMatch(/^fnv1a32:/);
  expect(result.browserDebug.engineId).toBe('packages/mission-simulator');
  expect(result.browserDebug.legacyProductionTransitionCount).toBe(0);
  expect(result.browserDebug.duplicateEngineCount).toBe(0);
  expect(result.headlessInputDigest).toMatch(/^fnv1a32:/);
  expect(result.restoredInputDigest).toBe(result.headlessInputDigest);
  expect(result.environmentArtifactDigest).toBe(null);
  expect(result.planDigest).toMatch(/^fnv1a32:/);
  expect(result.headlessDigest).toMatch(/^fnv1a32:/);
  expect(result.restoredDigest).toBe(result.headlessDigest);
  expect(result.headlessDebug.packageUsesDom).toBe(false);
  expect(result.headlessEngineId).toBe('packages/mission-simulator');
  expect(result.headlessLegacyTransitions).toBe(0);
  expect(result.headlessTerminal).toBe(true);
  expect(result.headlessRawMetrics.observationCount).toBeGreaterThan(0);
  expect(moduleResponses.some((entry) => entry.url.includes('/auv-glider-planner-game/packages/mission-simulator/src/index.js'))).toBe(true);
  expect(moduleResponses.every((entry) => entry.status === 200 && (entry.contentType.includes('javascript') || entry.contentType.includes('text/plain') || entry.contentType.includes('application/octet-stream')))).toBe(true);
  expect(failedResponses).toEqual([]);
});

async function runBrowserSimulation(page, { mode }) {
  return page.evaluate(async ({ mode }) => {
    const { SimulationEngine } = await import('/src/core/sim/SimulationEngine.js');
    const zeros = (w, h, value = 0) => Array.from({ length: h }, () => Array(w).fill(value));
    const currents = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => [0, 0]));
    const level = {
      levelId: 'sim-pkg-r2-browser-level',
      world: { grid: { width: 6, height: 6 }, time: { dt: 1, duration: 8 } },
      layers: { terrain: zeros(6, 6), hazards: zeros(6, 6), truth: { frames: [{ t: 0, current: currents(6, 6), roi: zeros(6, 6, 0.25) }] } },
      meta: { seed: 'sim-pkg-r2-browser' }
    };
    const mission = { missionId: 'sim-pkg-r2-browser-mission', agents: [{ id: 'g1', label: 'Glider 1', start: { x: 1, y: 1 }, maxSpeed: 1.5, battery: 100 }], rules: {}, scoring: {} };
    const plan = { schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [{ agentId: 'g1', selectedStart: { x: 1, y: 1 }, waypoints: [{ id: 'w1', x: 4, y: 1, action: 'sample', t: 3 }] }] };
    const engine = new SimulationEngine({ level, mission, plan, time: 0 });
    const initialTime = engine.t;
    engine.getSummary();
    const initialDigest = globalThis.ANCHOR_MISSION_SIMULATOR_DEBUG?.stateDigest ?? null;
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
    const terminalDebug = globalThis.ANCHOR_MISSION_SIMULATOR_DEBUG;
    const terminalBeforeReset = engine.complete;
    engine.reset();
    engine.getSummary();
    const afterResetTime = engine.t;
    const afterResetDigest = globalThis.ANCHOR_MISSION_SIMULATOR_DEBUG?.stateDigest ?? null;
    return { initialTime, initialDigest, afterPlayTime, afterPauseTime, afterPausedStepTime, afterStepOnceTime, afterResetTime, afterResetDigest, terminal: terminalBeforeReset, packageDebug: terminalDebug };
  }, { mode });
}
