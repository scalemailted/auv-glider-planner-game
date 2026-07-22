const BathymetryManifest = require('./BathymetryManifest.js');
const BathymetryArtifact = require('./BathymetryArtifact.js');
const BathymetrySampler = require('./BathymetrySampler.js');
const BathymetryValidation = require('./BathymetryValidation.js');
const BathymetrySourceMetadata = require('./BathymetrySourceMetadata.js');
const SignedTerrainSurface = require('./SignedTerrainSurface.js');
const index = require('../../contracts/src/index.js');

 const BATHYMETRY_PACKAGE_VERSION = 'anchor-bathymetry-bathy-pkg-r1';
 const BATHYMETRY_PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/bathymetry',
  owns: ['bathymetry manifests', 'bathymetry artifacts', 'canonical bathymetry sampling', 'source metadata', 'signed terrain authority'],
  dependsOn: ['@anchor/contracts'],
  doesNotOwn: ['rendering', 'mission scoring', 'browser input', 'headless execution', 'current generation', 'scalar field generation'],
});

 function normalizeBathymetryPackageManifest(input = {}) {
  return index.normalizeBathymetryManifest(input);
}

 function normalizeBathymetryPackageArtifact(input = {}) {
  return index.normalizeBathymetryArtifact(input);
}

 function validateBathymetryPackageManifest(input = {}) {
  return index.validateBathymetryManifest(input);
}

 function validateBathymetryPackageArtifact(input = {}) {
  return index.validateBathymetryArtifact(input);
}

 function bathymetryContractSummary(input = {}) {
  const manifest = normalizeBathymetryPackageManifest(input.manifest || input);
  const summary = BathymetryManifest.bathymetryManifestSummary(manifest);
  return {
    id: summary.id,
    type: manifest.type,
    coordinateFrame: summary.coordinateFrame,
    xSize: summary.eastCount,
    ySize: summary.northCount,
    layers: ['signedElevationMeters', 'bottomDepthMeters', 'wetMask', 'landMask'],
    digest: summary.manifestDigest,
  };
}

 function packageBoundarySummary() {
  return {
    package: BATHYMETRY_PACKAGE_BOUNDARY.package,
    version: BATHYMETRY_PACKAGE_VERSION,
    owns: BATHYMETRY_PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: BATHYMETRY_PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: BATHYMETRY_PACKAGE_BOUNDARY.doesNotOwn.slice(),
  };
}

module.exports = {BATHYMETRY_PACKAGE_VERSION, BATHYMETRY_PACKAGE_BOUNDARY, normalizeBathymetryPackageManifest, normalizeBathymetryPackageArtifact, validateBathymetryPackageManifest, validateBathymetryPackageArtifact, bathymetryContractSummary, packageBoundarySummary,
...BathymetryManifest,
...BathymetryArtifact,
...BathymetrySampler,
...BathymetryValidation,
...BathymetrySourceMetadata,
...SignedTerrainSurface
}