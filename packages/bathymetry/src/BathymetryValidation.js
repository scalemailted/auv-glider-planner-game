import { validateBathymetryArtifact } from './BathymetryArtifact.js';
import { validateBathymetryManifest } from './BathymetryManifest.js';
import { createBathymetrySampler, sampleBathymetry } from './BathymetrySampler.js';
import { createValidationReport } from '../../contracts/src/index.js';

export const BATHYMETRY_VALIDATION_VERSION = 'bathymetry-validation-bathy-pkg-r1';

export function validateBathymetryPackageModel({ manifest = null, artifact = null } = {}) {
  const reports = [];
  if (manifest) reports.push(validateBathymetryManifest(manifest));
  if (artifact) reports.push(validateBathymetryArtifact(artifact));
  if (artifact) {
    const sampler = createBathymetrySampler(artifact);
    const outside = sampleBathymetry(sampler, sampler.maxEastMeters + 1, sampler.maxNorthMeters + 1);
    reports.push(createValidationReport({
      errors: outside.outsideDomain ? [] : ['Outside-domain bathymetry sample must be flagged outsideDomain.'],
      checks: [{ id: 'bathymetry-sampler-outside-domain', passed: outside.outsideDomain === true }]
    }));
  }
  const errors = reports.flatMap((report) => report.errors ?? []);
  const warnings = reports.flatMap((report) => report.warnings ?? []);
  return createValidationReport({
    errors,
    warnings,
    checks: reports.flatMap((report) => report.checks ?? [])
  });
}