import { artifactDigest, createValidationReport } from '../../contracts/src/index.js';
import { createBathymetrySourceMetadata, normalizeBathymetrySourceMetadata } from './BathymetrySourceMetadata.js';

export const BATHYMETRY_MANIFEST_VERSION = 'bathymetry-manifest-bathy-pkg-r1';

export function createBathymetryManifest(options = {}) {
  return normalizeBathymetryManifest(options);
}

export function normalizeBathymetryManifest(value = {}) {
  const source = value.manifest ?? value.config ?? value;
  const resolution = normalizeResolution(source.resolution ?? source.grid ?? source.axes ?? source);
  const physicalExtentMeters = normalizeExtent(source.physicalExtentMeters ?? source.extentMeters ?? source.operationalDomain?.horizontal ?? source.domain?.horizontal, resolution);
  const sourceMetadata = normalizeBathymetrySourceMetadata
    ? normalizeBathymetrySourceMetadata(source.sourceMetadata ?? source.source ?? {})
    : createBathymetrySourceMetadata(source.sourceMetadata ?? source.source ?? {});
  const manifest = {
    type: 'anchor.bathymetry.manifest',
    version: source.version ?? BATHYMETRY_MANIFEST_VERSION,
    id: String(source.id ?? source.manifestId ?? source.seed ?? 'bathymetry-manifest'),
    seed: source.seed == null ? null : String(source.seed),
    generatorId: String(source.generatorId ?? source.config?.type ?? source.type ?? 'anchor.science.bathymetry-field'),
    generatorVersion: String(source.generatorVersion ?? source.config?.version ?? source.version ?? 'unknown'),
    coordinateFrame: String(source.coordinateFrame ?? source.operationalDomain?.coordinateFrame ?? source.domain?.coordinateFrame ?? 'localTangentPlaneMetersV1'),
    physicalExtentMeters,
    resolution,
    archetype: String(source.archetype ?? source.scenarioId ?? source.config?.scenarioId ?? 'syntheticBathymetry'),
    components: normalizeComponents(source.components ?? source.features ?? source.featureIds ?? source.config?.features),
    elevationConvention: 'signedElevationMeters: positive above sea level, zero at sea level, negative below sea level',
    depthConvention: 'bottomDepthMeters: nonnegative physical water depth, zero on land or legacy dry cells',
    sourceMetadata,
    claimBoundary: normalizeClaimBoundary(source.claimBoundary ?? source.boundaryFlags ?? {})
  };
  return {
    ...manifest,
    manifestDigest: bathymetryManifestDigest(manifest)
  };
}

export function validateBathymetryManifest(value = {}) {
  const manifest = normalizeBathymetryManifest(value);
  const errors = [];
  const warnings = [];
  if (manifest.type !== 'anchor.bathymetry.manifest') errors.push('Bathymetry manifest type must be anchor.bathymetry.manifest.');
  if (!manifest.id) errors.push('Bathymetry manifest requires id.');
  if (manifest.resolution.eastCount <= 0 || manifest.resolution.northCount <= 0) errors.push('Bathymetry manifest resolution must be positive.');
  if (manifest.physicalExtentMeters.east <= 0 || manifest.physicalExtentMeters.north <= 0) errors.push('Bathymetry manifest physical extent must be positive.');
  if (manifest.claimBoundary.synthetic !== true) warnings.push('Current BATHY-PKG-R1 manifests should be explicit synthetic educational artifacts.');
  if (manifest.claimBoundary.calibratedBathymetry === true) errors.push('Synthetic bathymetry manifest must not claim calibratedBathymetry=true.');
  if (manifest.claimBoundary.operationalNavigationProduct === true) errors.push('Bathymetry manifest must not claim operationalNavigationProduct=true.');
  return createValidationReport({ errors, warnings, checks: [{ id: 'bathymetry-manifest-shape', passed: errors.length === 0 }] });
}

export function bathymetryManifestSummary(value = {}) {
  const manifest = normalizeBathymetryManifest(value);
  return {
    type: 'anchor.bathymetry.manifest-summary',
    version: BATHYMETRY_MANIFEST_VERSION,
    id: manifest.id,
    seed: manifest.seed,
    generatorId: manifest.generatorId,
    coordinateFrame: manifest.coordinateFrame,
    eastCount: manifest.resolution.eastCount,
    northCount: manifest.resolution.northCount,
    eastExtentMeters: manifest.physicalExtentMeters.east,
    northExtentMeters: manifest.physicalExtentMeters.north,
    archetype: manifest.archetype,
    componentCount: manifest.components.length,
    synthetic: manifest.claimBoundary.synthetic === true,
    calibratedBathymetry: manifest.claimBoundary.calibratedBathymetry === true,
    operationalNavigationProduct: manifest.claimBoundary.operationalNavigationProduct === true,
    manifestDigest: manifest.manifestDigest
  };
}

export function bathymetryManifestDigest(value = {}) {
  const payload = { ...value };
  delete payload.manifestDigest;
  return artifactDigest(payload);
}

function normalizeResolution(value = {}) {
  return {
    eastCount: positiveInteger(value.eastCount ?? value.width ?? value.columns ?? value.xSize ?? value.x?.size, 1),
    northCount: positiveInteger(value.northCount ?? value.height ?? value.rows ?? value.ySize ?? value.y?.size, 1)
  };
}

function normalizeExtent(value = {}, resolution = {}) {
  const east = finite(value.east ?? value.widthMeters ?? (Number(value.maxEastMeters) - Number(value.minEastMeters)), Math.max(1, resolution.eastCount - 1));
  const north = finite(value.north ?? value.heightMeters ?? (Number(value.maxNorthMeters) - Number(value.minNorthMeters)), Math.max(1, resolution.northCount - 1));
  return { east: Math.max(1, round(east)), north: Math.max(1, round(north)), units: 'meters' };
}

function normalizeComponents(value = []) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  return list.map((entry) => {
    const id = typeof entry === 'string' ? entry : entry?.id;
    return id ? { id: String(id), enabled: entry?.enabled !== false, synthetic: entry?.synthetic !== false } : null;
  }).filter(Boolean);
}

function normalizeClaimBoundary(value = {}) {
  return {
    synthetic: value.synthetic !== false,
    calibratedBathymetry: value.calibratedBathymetry === true || value.calibratedSurveyData === true ? false : false,
    operationalNavigationProduct: false,
    renderingOwnsBathymetry: false
  };
}

function positiveInteger(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}