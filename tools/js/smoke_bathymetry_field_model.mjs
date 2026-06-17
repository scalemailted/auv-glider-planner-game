import assert from 'node:assert/strict';
import {
  bathymetryFieldStats,
  bathymetryGradientField,
  bathymetrySlopeField,
  createBathymetryHazardField,
  createDepthAccessibilityField,
  createLandSeaMaskFromBathymetry,
  createSyntheticBathymetryField,
  sampleBathymetryAt,
  validateBathymetryField
} from '../../src/core/science/BathymetryFieldModel.js';

const a = createSyntheticBathymetryField({ seed: 'env-r1-repeat', width: 18, height: 12 });
const b = createSyntheticBathymetryField({ seed: 'env-r1-repeat', width: 18, height: 12 });
assert.deepEqual(a.depthMeters, b.depthMeters, 'seeded bathymetry is deterministic');
assert.equal(validateBathymetryField(a).valid, true);
const stats = bathymetryFieldStats(a);
assert.equal(stats.finite, true);
assert.ok(stats.maxDepthMeters > stats.minDepthMeters);
assert.equal(createLandSeaMaskFromBathymetry(a).length, a.height);
assert.equal(createDepthAccessibilityField(a).length, a.height);
assert.equal(createBathymetryHazardField(a).length, a.height);
const gradients = bathymetryGradientField(a).flat();
assert.ok(gradients.every((cell) => Number.isFinite(cell.magnitude)));
const slopes = bathymetrySlopeField(a).flat();
assert.ok(slopes.every(Number.isFinite));
assert.ok(Number.isFinite(sampleBathymetryAt(a, 3.4, 5.6)));
console.log('smoke_bathymetry_field_model: ok');