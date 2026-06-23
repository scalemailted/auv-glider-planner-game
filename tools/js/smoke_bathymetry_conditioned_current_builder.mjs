import { assert } from './current_r2a3_test_helpers.mjs';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { validateOceanCurrentField4D, oceanCurrentField4DSummary } from '../../src/core/science/OceanCurrentField4D.js';

const field = createBathymetryConditionedCurrentField({ grid: { width: 12, height: 8 }, timeAxisSeconds: [0, 600, 1200, 1800] });
const validation = validateOceanCurrentField4D(field);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const summary = oceanCurrentField4DSummary(field);
assert.equal(summary.sourceTier, 'scientificallyConstrainedSynthetic');
assert.equal(summary.depthSampleCount >= 4, true);
assert.equal(summary.timeSampleCount >= 4, true);
assert.equal(Number.isFinite(summary.verticalShearRms), true);
assert.equal(Number.isFinite(summary.temporalChangeRms), true);
console.log('[smoke_bathymetry_conditioned_current_builder] PASS', { depth: summary.depthSampleCount, time: summary.timeSampleCount, status: summary.diagnostics.status });
