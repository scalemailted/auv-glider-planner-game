import assert from 'node:assert/strict';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { validateOceanCurrentSourceMetadata, currentSourceClaimBoundary } from '../../src/core/science/OceanCurrentSourceMetadata.js';

const field = createBathymetryConditionedCurrentField({ grid: { width: 8, height: 6 }, timeAxisSeconds: [0, 600, 1200, 1800] });
const validation = validateOceanCurrentSourceMetadata(field.sourceMetadata);
assert.equal(validation.valid, true, validation.errors.join('\n'));
const boundary = currentSourceClaimBoundary(field.sourceMetadata);
assert.equal(boundary.publicClaimSafe, true);
assert.equal(boundary.usesRealHycom, false);
assert.equal(boundary.usesRealMarineCopernicus, false);
assert.equal(boundary.calibratedForecast, false);
console.log('[audit_current_scientific_claim_boundaries] PASS', boundary.sourceTier);
