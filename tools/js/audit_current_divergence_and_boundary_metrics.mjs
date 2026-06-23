import assert from 'node:assert/strict';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { computeCurrentFieldScientificDiagnostics } from '../../src/core/science/CurrentFieldScientificDiagnostics.js';

const field = createBathymetryConditionedCurrentField({ grid: { width: 12, height: 8 }, timeAxisSeconds: [0, 600, 1200, 1800] });
const diagnostics = computeCurrentFieldScientificDiagnostics(field);
assert.equal(Number.isFinite(diagnostics.divergenceRms), true);
assert.equal(Number.isFinite(diagnostics.coastlineNormalSpeedRms), true);
assert.equal(diagnostics.landVectorCount, 0);
assert.equal(diagnostics.belowBottomVectorCount, 0);
console.log('[audit_current_divergence_and_boundary_metrics] PASS', { divergenceRms: diagnostics.divergenceRms, coastlineNormalSpeedRms: diagnostics.coastlineNormalSpeedRms });
