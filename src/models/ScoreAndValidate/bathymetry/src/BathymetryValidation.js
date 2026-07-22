const BathymetryArtifact = require('./BathymetryArtifact.js')
const BathymetryManifest = require('./BathymetryManifest.js')
const BathymetrySampler = require('./BathymetrySampler.js')
const index = require('../../contracts/src/index.js')
const BATHYMETRY_VALIDATION_VERSION = 'bathymetry-validation-bathy-pkg-r1';

 function validateBathymetryPackageModel({ manifest = null, artifact = null } = {}) {
  const reports = [];
  if (manifest) reports.push(BathymetryManifest.validateBathymetryManifest(manifest));
  if (artifact) reports.push(BathymetryArtifact.validateBathymetryArtifact(artifact));
  if (artifact) {
    const sampler = BathymetrySampler.createBathymetrySampler(artifact);
    const outside = BathymetrySampler.sampleBathymetry(sampler, sampler.maxEastMeters + 1, sampler.maxNorthMeters + 1);
    reports.push(index.createValidationReport({
      errors: outside.outsideDomain ? [] : ['Outside-domain bathymetry sample must be flagged outsideDomain.'],
      checks: [{ id: 'bathymetry-sampler-outside-domain', passed: outside.outsideDomain === true }]
    }));
  }
  const errors = reports.flatMap((report) => report.errors ?? []);
  const warnings = reports.flatMap((report) => report.warnings ?? []);
  return index.createValidationReport({
    errors,
    warnings,
    checks: reports.flatMap((report) => report.checks ?? [])
  });
}
module.exports = {validateBathymetryPackageModel}