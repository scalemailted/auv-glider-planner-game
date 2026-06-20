import assert from 'node:assert/strict';

import { createCoastalOperationalBathymetry, validateBathymetryField } from '../../src/core/science/BathymetryFieldModel.js';
import { validateBathymetrySourceMetadata } from '../../src/core/science/BathymetrySourceMetadata.js';

const bathymetry = createCoastalOperationalBathymetry({ seed: 'metadata-fixture', width: 20, height: 12 });
assert.equal(validateBathymetryField(bathymetry).valid, true);
assert.equal(validateBathymetrySourceMetadata(bathymetry.sourceMetadata).valid, true);
assert.equal(bathymetry.sourceMetadata.sourceType, 'syntheticGenerated');
assert.equal(bathymetry.sourceMetadata.synthetic, true);
assert.equal(bathymetry.sourceMetadata.calibrated, false);
assert.equal(bathymetry.sourceMetadata.operationallyValidated, false);
assert.ok(bathymetry.terrainFeatures.some((feature) => feature.type === 'deepBasin'));
console.log('smoke_bathymetry_fixture_metadata: ok');
