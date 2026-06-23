export * from './BathymetryManifest.js';
export * from './BathymetryArtifact.js';
export * from './BathymetrySampler.js';
export * from './BathymetryValidation.js';
export * from './BathymetrySourceMetadata.js';
export * from './SignedTerrainSurface.js';

import {
  normalizeBathymetryArtifact as normalizeArchBathymetryArtifact,
  normalizeBathymetryManifest as normalizeArchBathymetryManifest,
  validateBathymetryArtifact as validateArchBathymetryArtifact,
  validateBathymetryManifest as validateArchBathymetryManifest
} from '../../contracts/src/index.js';
import { normalizeBathymetryManifest, bathymetryManifestSummary, validateBathymetryManifest } from './BathymetryManifest.js';
import { normalizeBathymetryArtifact, bathymetryArtifactSummary, validateBathymetryArtifact } from './BathymetryArtifact.js';

export const BATHYMETRY_PACKAGE_VERSION = 'anchor-bathymetry-bathy-pkg-r1';
export const BATHYMETRY_PACKAGE_BOUNDARY = Object.freeze({
  package: '@anchor/bathymetry',
  owns: ['bathymetry manifests', 'bathymetry artifacts', 'canonical bathymetry sampling', 'source metadata', 'signed terrain authority'],
  dependsOn: ['@anchor/contracts'],
  doesNotOwn: ['rendering', 'mission scoring', 'browser input', 'headless execution', 'current generation', 'scalar field generation'],
});

export function normalizeBathymetryPackageManifest(input = {}) {
  return normalizeArchBathymetryManifest(input);
}

export function normalizeBathymetryPackageArtifact(input = {}) {
  return normalizeArchBathymetryArtifact(input);
}

export function validateBathymetryPackageManifest(input = {}) {
  return validateArchBathymetryManifest(input);
}

export function validateBathymetryPackageArtifact(input = {}) {
  return validateArchBathymetryArtifact(input);
}

export function bathymetryContractSummary(input = {}) {
  const manifest = normalizeBathymetryPackageManifest(input.manifest || input);
  const summary = bathymetryManifestSummary(manifest);
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

export function packageBoundarySummary() {
  return {
    package: BATHYMETRY_PACKAGE_BOUNDARY.package,
    version: BATHYMETRY_PACKAGE_VERSION,
    owns: BATHYMETRY_PACKAGE_BOUNDARY.owns.slice(),
    dependsOn: BATHYMETRY_PACKAGE_BOUNDARY.dependsOn.slice(),
    doesNotOwn: BATHYMETRY_PACKAGE_BOUNDARY.doesNotOwn.slice(),
  };
}

export { bathymetryArtifactSummary };