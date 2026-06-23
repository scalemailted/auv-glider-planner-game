import assert from 'node:assert/strict';
import { buildSimulationTimeProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildSimulationTimeProbe({ seed: 'flow-runtime-r1-simulation-time' });
assert.equal(probe.viewModel.phase, 'simulation', 'simulation view model phase is simulation');
assert.equal(probe.viewModel.simulationStatus.timeSeconds, probe.timeSeconds, 'simulation status time is canonical');
assert.equal(probe.viewModel.currentPresentationTimeSeconds, probe.timeSeconds, 'simulation time reaches currentPresentationTimeSeconds');
assert.equal(probe.viewModel.waterColumnExplorer.activeTimeSeconds, probe.timeSeconds, 'simulation time reaches current sampler');
assert.ok(Number.isFinite(Number(probe.sample?.uEastMetersPerSecond)), 'simulation current sample u is finite');
console.log('[smoke_current_simulation_time_binding] PASS', { timeSeconds: probe.timeSeconds, u: probe.sample.uEastMetersPerSecond, v: probe.sample.vNorthMetersPerSecond });