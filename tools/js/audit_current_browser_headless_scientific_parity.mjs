import assert from 'node:assert/strict';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';

const field = createBathymetryConditionedCurrentField({ grid: { width: 8, height: 6 }, timeAxisSeconds: [0, 600, 1200, 1800] });
const browserLike = sampleOceanCurrent({ field: structuredClone(field), eastMeters: 3, northMeters: 3, depthMeters: 35, timeSeconds: 600 });
const headlessLike = sampleOceanCurrent({ field: JSON.parse(JSON.stringify(field)), eastMeters: 3, northMeters: 3, depthMeters: 35, timeSeconds: 600 });
assert.deepEqual([browserLike.uEastMetersPerSecond, browserLike.vNorthMetersPerSecond], [headlessLike.uEastMetersPerSecond, headlessLike.vNorthMetersPerSecond]);
console.log('[audit_current_browser_headless_scientific_parity] PASS', browserLike.source.sourceTier);
