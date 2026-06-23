import {
  normalizeBathymetryArtifact,
  normalizeBathymetryManifest,
  validateBathymetryArtifact,
  validateBathymetryManifest,
} from '../../contracts/src/index.js';

export const BATHYMETRY_PACKAGE_VERSION = 'anchor-bathymetry-arch-r1';
export const BATHYMETRY_PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/bathymetry',
  owns: ['bathymetry manifests', 'bathymetry artifacts', 'terrain and wet-mask field contracts'],
  dependsOn: ['@anchor/contracts'],
  doesNotOwn: ['rendering', 'mission scoring', 'browser input', 'headless execution'],
});

export function normalizeBathymetryPackageManifest(input = {}) {
  return normalizeBathymetryManifest(input);
}

export function normalizeBathymetryPackageArtifact(input = {}) {
  return normalizeBathymetryArtifact(input);
}

export function validateBathymetryPackageManifest(input = {}) {
  return validateBathymetryManifest(input);
}

export function validateBathymetryPackageArtifact(input = {}) {
  return validateBathymetryArtifact(input);
}

export function bathymetryContractSummary(input = {}) {
  const manifest = normalizeBathymetryPackageManifest(input.manifest || input);
  return {
    id: manifest.id,
    type: manifest.type,
    coordinateFrame: manifest.coordinateFrame,
    xSize: manifest.axes.x.size,
    ySize: manifest.axes.y.size,
    layers: manifest.layers.slice(),
    digest: manifest.digest,
  };
}
