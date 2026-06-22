import assert from 'node:assert/strict';

import { createRegionalContinentalShelfScenario } from '../../src/core/generation/RegionalMissionDefaults.js';
import {
  multiResolutionSamplerSummary,
  sampleBathymetryAtPhysicalPoint,
  sampleScalarAtPhysicalPoint,
  sampleVectorAtPhysicalPoint
} from '../../src/core/domain/MultiResolutionFieldSampler.js';

const level = createRegionalContinentalShelfScenario({ seed: 'world-r1-sampler-smoke' });
const point = { eastMeters: 42000, northMeters: 25000, depthMeters: 45 };
const summary = multiResolutionSamplerSummary({ domain: level.operationalDomain, profile: level.resolutionProfile });
assert.equal(summary.ownsSimulation, false);
assert.equal(summary.calibratedOceanForecast, false);

const science = sampleScalarAtPhysicalPoint({
  field: level.regionalFields.scienceValue,
  point,
  domain: level.operationalDomain,
  profile: level.resolutionProfile,
  role: 'science'
});
assert.equal(science.valid, true);
assert.equal(Number.isFinite(Number(science.value)), true);

const current = sampleVectorAtPhysicalPoint({
  field: level.regionalFields.currentVector,
  point,
  domain: level.operationalDomain,
  profile: level.resolutionProfile,
  role: 'current'
});
assert.equal(current.valid, true);
assert.equal(Number.isFinite(Number(current.vector.u)), true);
assert.equal(Number.isFinite(Number(current.vector.v)), true);

const bathymetry = sampleBathymetryAtPhysicalPoint({
  field: level.regionalFields.bathymetryDepthMeters,
  point,
  domain: level.operationalDomain,
  profile: level.resolutionProfile,
  role: 'terrain'
});
assert.equal(bathymetry.valid, true);
assert.ok(bathymetry.bottomDepthMeters >= 0);

console.log('smoke_multiresolution_field_sampler: ok');
