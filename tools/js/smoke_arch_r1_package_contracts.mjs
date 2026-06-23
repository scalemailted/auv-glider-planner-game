import {
  artifactDigest,
  normalizeBathymetryArtifact,
  normalizeBathymetryManifest,
  normalizeCurrentField4D,
  normalizeGeneratedEnvironmentArtifactContract,
  normalizeScalarField4D,
  stableDigest,
  validateBathymetryArtifact,
  validateBathymetryManifest,
} from '../../packages/contracts/src/index.js';
import {
  bathymetryContractSummary,
  normalizeBathymetryPackageArtifact,
  normalizeBathymetryPackageManifest,
  validateBathymetryPackageArtifact,
} from '../../packages/bathymetry/src/index.js';
import * as Currents from '../../packages/currents/src/index.js';
import * as ScalarProcesses from '../../packages/scalar-processes/src/index.js';
import * as Environment from '../../packages/environment/src/index.js';
import * as MissionSimulator from '../../packages/mission-simulator/src/index.js';
import * as Validation from '../../packages/validation/src/index.js';
import * as Codecs from '../../packages/codecs/src/index.js';
import { auditPackageBoundaries } from './audit_package_boundaries.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDigest(value, label) {
  assert(typeof value === 'string' && value.includes(':'), `${label} should be a digest string`);
}

function assertNoCalibratedSyntheticClaim(item, label) {
  const provenance = item?.provenance || item?.manifest?.provenance;
  assert(!(provenance?.calibrated === true && provenance?.synthetic !== false), `${label} must not claim calibrated synthetic data`);
}

const unorderedA = { z: [3, 2, 1], a: { b: 2, a: 1 } };
const unorderedB = { a: { a: 1, b: 2 }, z: [3, 2, 1] };
assert(stableDigest(unorderedA) === stableDigest(unorderedB), 'stable digest should ignore object key order');
assert(artifactDigest(unorderedA) === artifactDigest(unorderedB), 'artifact digest should ignore object key order');

const bathymetryManifestInput = {
  id: 'arch-r1-shelf-proof',
  axes: {
    x: { size: 4, min: 0, max: 3000, spacing: 1000 },
    y: { size: 3, min: 0, max: 2000, spacing: 1000 },
    z: { size: 5, min: 0, max: 200, spacing: 50 },
  },
  layers: ['depthMeters', 'landSeaMask', 'slope'],
  provenance: {
    generatedBy: 'smoke_arch_r1_package_contracts',
    generatorVersion: 'arch-r1',
    source: 'synthetic fixture',
    synthetic: true,
    calibrated: false,
  },
};

const bathymetryManifest = normalizeBathymetryManifest(bathymetryManifestInput);
const packageManifest = normalizeBathymetryPackageManifest(bathymetryManifestInput);
assert(bathymetryManifest.digest === packageManifest.digest, 'bathymetry package wrapper should preserve contract digest');
assert(validateBathymetryManifest(bathymetryManifest).status !== 'error', 'bathymetry manifest should validate');
assertDigest(bathymetryManifest.digest, 'bathymetry manifest');
assertNoCalibratedSyntheticClaim(bathymetryManifest, 'bathymetry manifest');

const bathymetryArtifact = normalizeBathymetryArtifact({
  manifest: bathymetryManifest,
  fields: {
    depthMeters: {
      arrayType: 'Float32Array',
      dimensions: [3, 4],
      values: [3, 7, 12, 18, 20, 30, 45, 60, 80, 95, 120, 150],
    },
    landSeaMask: {
      arrayType: 'Uint8Array',
      dimensions: [3, 4],
      values: [0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    },
  },
});
const packageArtifact = normalizeBathymetryPackageArtifact(bathymetryArtifact);
assert(validateBathymetryArtifact(bathymetryArtifact).status !== 'error', 'bathymetry artifact should validate');
assert(validateBathymetryPackageArtifact(packageArtifact).status !== 'error', 'bathymetry package artifact should validate');
assertDigest(bathymetryArtifact.digest, 'bathymetry artifact');

const currentArtifact = normalizeCurrentField4D({
  id: 'arch-r1-current-proof',
  axes: {
    t: { size: 2, min: 0, max: 60, spacing: 60 },
    z: { size: 2, min: 0, max: 50, spacing: 50 },
    y: { size: 2, min: 0, max: 1000, spacing: 1000 },
    x: { size: 2, min: 0, max: 1000, spacing: 1000 },
  },
  fields: { vector: { layout: 'component-last', components: ['u', 'v', 'w'], values: [0.1, 0, 0, 0.2, 0, 0] } },
  provenance: { synthetic: true, calibrated: false, source: 'synthetic fixture' },
});
assertDigest(currentArtifact.digest, 'current artifact');
assertNoCalibratedSyntheticClaim(currentArtifact, 'current artifact');

const scalarArtifact = normalizeScalarField4D({
  id: 'arch-r1-scalar-proof',
  processKind: 'depth-varying-science-value',
  fields: { value: { values: [0.2, 0.5, 0.8] } },
  provenance: { synthetic: true, calibrated: false, source: 'synthetic fixture' },
});
assertDigest(scalarArtifact.digest, 'scalar artifact');
assertNoCalibratedSyntheticClaim(scalarArtifact, 'scalar artifact');

const environmentArtifact = normalizeGeneratedEnvironmentArtifactContract({
  id: 'arch-r1-environment-proof',
  components: [bathymetryArtifact, currentArtifact, scalarArtifact].map((artifact) => artifact.digest),
  provenance: { synthetic: true, calibrated: false, source: 'synthetic fixture' },
});
assertDigest(environmentArtifact.digest, 'environment artifact');
assertNoCalibratedSyntheticClaim(environmentArtifact, 'environment artifact');

const summary = bathymetryContractSummary(bathymetryManifestInput);
assert(summary.xSize === 4 && summary.ySize === 3, 'bathymetry summary should expose grid sizes');
assertDigest(summary.digest, 'bathymetry summary');

for (const module of [Currents, ScalarProcesses, Environment, MissionSimulator, Validation, Codecs]) {
  assert(typeof module.packageBoundarySummary === 'function', `${module.PACKAGE_BOUNDARY?.package || 'package'} should expose packageBoundarySummary`);
  const boundary = module.packageBoundarySummary();
  assert(Array.isArray(boundary.owns) && boundary.owns.length > 0, `${boundary.package} should declare ownership`);
}

const boundaryViolations = await auditPackageBoundaries();
assert(boundaryViolations.length === 0, `package boundary audit failed: ${boundaryViolations.join('; ')}`);

console.log('smoke_arch_r1_package_contracts: ok');
