import assert from 'node:assert/strict';
import * as missionSimulator from '../../packages/mission-simulator/src/index.js';
import { createFixtureEnvironment } from './environment_package_test_helpers.mjs';
import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';

export { assert, missionSimulator };

export function createMissionSimulationInputFixture(options = {}) {
  const environmentArtifact = options.environmentArtifact ?? createFixtureEnvironment({ id: options.environmentId ?? 'mission-sim-pkg-r1-env' });
  const agents = options.agents ?? [{ id: 'g1', label: 'Glider 1', start: { x: 0, y: 0 }, maxSpeed: 2, battery: 100, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline' }];
  const plan = options.plan ?? {
    schemaVersion: '2.0',
    type: 'anchor.plan',
    coordinateProfileId: 'continuousGridV1',
    agentPlans: [{
      agentId: 'g1',
      selectedStart: { x: 0, y: 0 },
      waypoints: [
        { id: 'w1', x: 5, y: 0, t: 5, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'thermocline', depthMeters: 35 },
        { id: 'w2', x: 10, y: 10, t: 15, diveProfileId: 'deepDive', targetDepthLayerId: 'deep', depthMeters: 100 }
      ]
    }]
  };
  return missionSimulator.createMissionSimulationInput({
    id: options.id ?? 'mission-sim-pkg-r1-fixture',
    deterministicSeed: options.seed ?? 'mission-sim-pkg-r1-seed',
    environmentArtifact,
    environmentArtifactDigest: environmentArtifact.artifactDigest,
    environmentManifestDigest: environmentArtifact.manifestDigest,
    plan,
    agentConfigurations: agents,
    timeStepSeconds: options.timeStepSeconds ?? 1,
    missionDurationSeconds: options.missionDurationSeconds ?? 20,
    missionRules: options.missionRules ?? { sampling: { mode: 'unique' } },
    terminalRules: options.terminalRules ?? { mode: 'none' },
    observationModel: { sampleOnWaypoint: true },
    noiseModel: { deterministic: true }
  });
}

export function createSmallEngineFixture() {
  const zeros = (w, h, value = 0) => Array.from({ length: h }, () => Array(w).fill(value));
  const currents = (w, h) => Array.from({ length: h }, () => Array.from({ length: w }, () => [0, 0]));
  const environmentArtifact = createFixtureEnvironment({ id: 'mission-sim-engine-env' });
  const level = {
    levelId: 'mission-sim-engine-level',
    environmentArtifact,
    environmentArtifactDigest: environmentArtifact.artifactDigest,
    environmentArtifactSummary: missionSimulator.stable(environmentArtifact.summary ?? null),
    world: { grid: { width: 6, height: 6 }, time: { dt: 1, duration: 8 } },
    layers: { terrain: zeros(6, 6), hazards: zeros(6, 6), truth: { frames: [{ t: 0, current: currents(6, 6), roi: zeros(6, 6, 0.2) }] } },
    meta: { seed: 'mission-sim-engine', environmentArtifactDigest: environmentArtifact.artifactDigest, environmentManifestDigest: environmentArtifact.manifestDigest }
  };
  const mission = { missionId: 'mission-sim-engine-mission', agents: [{ id: 'g1', label: 'Glider 1', start: { x: 1, y: 1 }, maxSpeed: 1.5, battery: 100 }], rules: {}, scoring: {} };
  const plan = { schemaVersion: '2.0', type: 'anchor.plan', agentPlans: [{ agentId: 'g1', selectedStart: { x: 1, y: 1 }, waypoints: [{ id: 'w1', x: 4, y: 1, action: 'sample', t: 3 }] }] };
  return { level, mission, plan };
}

export function runSmallEngineRecord() {
  const { level, mission, plan } = createSmallEngineFixture();
  const engine = new SimulationEngine({ level, mission, plan, time: 0 });
  const checkpoints = [];
  checkpoints.push(engineCheckpoint(engine, 'initial'));
  engine.stepOnce();
  checkpoints.push(engineCheckpoint(engine, 'step-1'));
  engine.runUntilComplete(30);
  checkpoints.push(engineCheckpoint(engine, 'final'));
  const result = engine.getResult();
  return {
    inputDigest: engine.missionSimulationInput.inputDigest,
    manifestDigest: engine.missionSimulationInput.manifest.manifestDigest,
    environmentArtifactDigest: engine.missionSimulationInput.environmentArtifactDigest,
    planDigest: engine.missionSimulationInput.planDigest,
    stateDigest: engine.missionSimulator.state.stateDigest,
    resultDigest: engine.debug?.missionSimulationResultDigest ?? result.debug?.missionSimulationResultDigest ?? null,
    terminal: engine.missionSimulator.terminal,
    terminalReason: engine.missionSimulator.terminalReason,
    rawMetrics: engine.missionSimulator.rawMetrics,
    checkpoints
  };
}

export function engineCheckpoint(engine, label) {
  return {
    label,
    timeSeconds: Number(Number(engine.t ?? 0).toFixed(6)),
    stepCount: engine.stepCount,
    stateDigest: engine.missionSimulator?.state?.stateDigest ?? null,
    agentCount: engine.agents?.length ?? 0,
    eventCount: engine.events?.length ?? 0,
    observationCount: (engine.events ?? []).filter((event) => event.type === 'sample' || event.type === 'observation').length,
    terminal: engine.complete === true,
    terminalReason: engine.abortReason ?? engine.routeFailureDecision?.reason ?? engine.missionState?.stopReason?.code ?? null
  };
}