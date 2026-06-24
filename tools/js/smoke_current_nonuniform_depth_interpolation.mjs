import assert from 'node:assert/strict';
import { createCurrentField4D, sampleOceanCurrent } from '../../packages/currents/src/index.js';
const field = createCurrentField4D({
  id: 'nonuniform-depth-interpolation-current',
  eastAxisMeters: [0],
  northAxisMeters: [0],
  depthAxisMeters: [0, 20, 80],
  timeAxisSeconds: [0],
  uEastMetersPerSecond: [[[[0]], [[2]], [[8]]]],
  vNorthMetersPerSecond: [[[[0]], [[0]], [[0]]]],
  wetMask: [[true]],
  bottomDepthMeters: [[100]],
  sourceMetadata: { sourceTier: 'manufacturedAnalytical', sourceType: 'manufactured', sourceId: 'nonuniform-depth-interpolation-current', sourceLabel: 'Nonuniform depth interpolation current', equationFamily: 'manufactured:linearDepthU', depthDependent: true, timeDependent: false }
});
const sample = sampleOceanCurrent({ field, eastMeters: 0, northMeters: 0, depthMeters: 50, timeSeconds: 0 });
assert.equal(sample.lowerDepthMeters, 20);
assert.equal(sample.upperDepthMeters, 80);
assert.equal(sample.depthInterpolationFraction, 0.5);
assert.equal(sample.uEastMetersPerSecond, 5);
console.log('smoke_current_nonuniform_depth_interpolation: ok', { u: sample.uEastMetersPerSecond, lower: sample.lowerDepthMeters, upper: sample.upperDepthMeters, fraction: sample.depthInterpolationFraction });