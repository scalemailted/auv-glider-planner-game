import assert from 'node:assert/strict';
import { evaluateDepthAwareSampleValue } from '../../src/core/science/DepthAwareScienceValue.js';

const config = { depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'], diveProfileId: 'sawtoothProfile' };
const priorityField = [
  [[1]],
  [[2]],
  [[8]],
  [[3]],
  [[10]]
];
const surface = evaluateDepthAwareSampleValue({ position: { x: 0, y: 0 }, depthLayerId: 'surface', observation: { observedValue: 1 }, priorityField, waterColumnConfig: config, missionObjective: 'surfaceBloom' });
const deep = evaluateDepthAwareSampleValue({ position: { x: 0, y: 0 }, depthLayerId: 'deep', observation: { observedValue: 1 }, priorityField, waterColumnConfig: config, missionObjective: 'deepPlume', A_global_topdown: [[10]] });
assert.notEqual(surface.totalScienceValue, deep.totalScienceValue, 'same x/y at different layers may yield different value');
assert.equal(surface.boundaryFlags.awardsIntegratedValueToSurfaceSample, false, 'surface sample does not claim integrated value');
assert.ok(surface.warnings.every((warning) => !/hidden truth/i.test(warning)), 'public result does not mention hidden truth');
const thermoclineObjective = evaluateDepthAwareSampleValue({ position: { x: 0, y: 0 }, depthLayerId: 'thermocline', targetDepthLayerId: 'thermocline', priorityField, waterColumnConfig: config, missionObjective: 'thermoclineFront' });
assert.ok(thermoclineObjective.objectiveMatchValue > surface.objectiveMatchValue, 'target layer changes objective contribution');
const repeat = evaluateDepthAwareSampleValue({ position: { x: 0, y: 0 }, depthLayerId: 'surface', observation: { observedValue: 1 }, waterColumnConfig: config, samplingHistory: [{ x: 0, y: 0, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0 }] });
assert.ok(repeat.noveltyFactor < 1, 'exact repeat receives redundancy penalty');
const distinctDepth = evaluateDepthAwareSampleValue({ position: { x: 0, y: 0 }, depthLayerId: 'deep', observation: { observedValue: 1 }, waterColumnConfig: config, samplingHistory: [{ x: 0, y: 0, depthLayerId: 'surface', depthMeters: 0, timeSeconds: 0 }] });
assert.equal(distinctDepth.verticalRedundancyFactor, 1, 'distinct depth retains vertical novelty');
console.log('smoke_depth_aware_sample_value: PASS');
