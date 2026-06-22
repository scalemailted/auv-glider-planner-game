import assert from 'node:assert/strict';
import { makeCurrentCubeFixture } from './current_cube_test_helpers.mjs';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = makeCurrentCubeFixture();
const browserLike = sampleOceanCurrent({ field: structuredClone(field), eastMeters: 2.25, northMeters: 1.5, depthMeters: 35, timeSeconds: 900 });
const headlessLike = sampleOceanCurrent({ field: JSON.parse(JSON.stringify(field)), eastMeters: 2.25, northMeters: 1.5, depthMeters: 35, timeSeconds: 900 });
assert.deepEqual(browserLike, headlessLike);
console.log('[audit_current_browser_headless_parity] PASS', browserLike.source.digest);
