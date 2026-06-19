import assert from 'node:assert/strict';
import { evaluateDepthAwareProfileValue } from '../../src/core/science/DepthAwareScienceValue.js';

const config = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'fullProfile' };
const samples = [
  { observationId: 's1', x: 1, y: 1, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0, observedValue: 1 },
  { observationId: 's2', x: 1, y: 1, depthLayerId: 'thermocline', depthMeters: 35, timeSeconds: 60, observedValue: 3 },
  { observationId: 's3', x: 1, y: 1, depthLayerId: 'deep', depthMeters: 150, timeSeconds: 120, observedValue: 4 },
  { observationId: 's4', x: 1, y: 1, depthLayerId: 'deep', depthMeters: 151, timeSeconds: 125, observedValue: 4 }
];
const result = evaluateDepthAwareProfileValue({ samples, waterColumnConfig: config, missionObjective: 'integratedHydrographicProfile', A_global_topdown: [[99]] });
assert.equal(result.sampleCount, 4);
assert.ok(result.summary.sampledLayerIds.includes('surface') && result.summary.sampledLayerIds.includes('thermocline') && result.summary.sampledLayerIds.includes('deep'), 'profile samples several layers');
assert.ok(result.samples[3].noveltyFactor < result.samples[2].noveltyFactor, 'vertical redundancy reduces dense repeated samples');
assert.ok(result.totalScienceValue < 99 * result.sampleCount, 'top-down field is not double-counted as profile sample value');
assert.equal(result.boundaryFlags.creditedFromActualSamples, true);
console.log('smoke_depth_profile_science_value: PASS');
