import assert from 'node:assert/strict';
import { createRegionalContinentalShelfScenario } from '../../src/core/generation/RegionalMissionDefaults.js';

const level = createRegionalContinentalShelfScenario({ seed: 'bathy-pkg-r1-adapter-smoke' });
assert.equal(level.meta.bathymetryArtifactDigest, level.bathymetryArtifact.artifactDigest);
assert.equal(level.bathymetryArtifactSummary.artifactDigest, level.bathymetryArtifact.artifactDigest);
assert.equal(level.bathymetryArtifact.validationReport.status, 'ok');
assert.equal(level.bathymetryArtifact.boundaryFlags.rendererOwnsBathymetry, false);
assert.ok(level.bathymetryArtifactSummary.wetCellCount > 0);
assert.ok(level.bathymetryArtifactSummary.landCellCount > 0);
console.log('smoke_bathymetry_package_generator_adapter: ok');