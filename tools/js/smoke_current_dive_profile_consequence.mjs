import assert from 'node:assert/strict';
import { createBarotropicControlField, createDepthStructuredField } from './current_vertical_structure_test_helpers.mjs';
import { sampleOceanCurrent } from '../../packages/currents/src/index.js';
function routeExposure(field, depthMeters) {
  const points = [[2, 2], [4, 3], [6, 4], [8, 5]];
  return points.map(([x, y], index) => sampleOceanCurrent({ field, eastMeters: x, northMeters: y, depthMeters, timeSeconds: field.timeAxisSeconds[Math.min(index, field.timeAxisSeconds.length - 1)] }));
}
function exposureDigest(samples) { return samples.map((s) => `${s.uEastMetersPerSecond},${s.vNorthMetersPerSecond}`).join('|'); }
const structured = createDepthStructuredField();
const shallow = routeExposure(structured, 0);
const deep = routeExposure(structured, 75);
assert.notEqual(exposureDigest(shallow), exposureDigest(deep));
const barotropic = createBarotropicControlField({ depthAxisMeters: [0, 10, 35, 75] });
const b0 = routeExposure(barotropic, 0).filter((s) => s.wet);
const b75 = routeExposure(barotropic, 75).filter((s) => s.wet);
assert.equal(exposureDigest(b0), exposureDigest(b75));
console.log('smoke_current_dive_profile_consequence: ok', { structuredDifferent: true, barotropicEqual: true });