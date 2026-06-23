import { assert } from './current_r2a3_test_helpers.mjs';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const bottomDepthMeters = Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => 80));
const field = createBathymetryConditionedCurrentField({ grid: { width: 6, height: 5 }, bottomDepthMeters, landMask: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => false)), depthAxisMeters: [0, 10, 35, 75, 150], timeAxisSeconds: [0, 600, 1200, 1800] });
const below = sampleOceanCurrent({ field, eastMeters: 3, northMeters: 2, depthMeters: 150, timeSeconds: 600 });
assert.equal(below.wet, false);
assert.equal(below.belowBottom, true);
assert.equal(below.uEastMetersPerSecond, 0);
assert.equal(below.vNorthMetersPerSecond, 0);
console.log('[smoke_current_below_bottom_mask] PASS', below.maskReason);
