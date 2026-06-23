import { assert } from './current_r2a3_test_helpers.mjs';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { computeCurrentFieldScientificDiagnostics } from '../../src/core/science/CurrentFieldScientificDiagnostics.js';

const field = createBathymetryConditionedCurrentField({ grid: { width: 12, height: 8 }, timeAxisSeconds: [0, 900, 1800, 2700] });
const diagnostics = computeCurrentFieldScientificDiagnostics(field);
assert.equal(diagnostics.landVectorCount, 0, 'no nonzero vectors on land');
assert.equal(Number.isFinite(diagnostics.coastlineNormalSpeedRms), true, 'coastline metric finite');
assert.ok(diagnostics.coastlineNormalSpeedRms <= 0.04, `coastline normal speed ${diagnostics.coastlineNormalSpeedRms}`);
console.log('[smoke_current_coastline_boundary] PASS', { rms: diagnostics.coastlineNormalSpeedRms, max: diagnostics.coastlineNormalSpeedMaximum });
