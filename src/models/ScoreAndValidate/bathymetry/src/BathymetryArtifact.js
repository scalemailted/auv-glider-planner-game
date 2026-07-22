const index = require('../../contracts/src/index.js')
const BathymetryManifest = require('./BathymetryManifest.js')
const BathymetrySourceMetadata = require('./BathymetrySourceMetadata.js')
const BATHYMETRY_ARTIFACT_VERSION = 'bathymetry-artifact-bathy-pkg-r1';

 function createBathymetryArtifact(options = {}) {
  return normalizeBathymetryArtifact(options);
}

 function normalizeBathymetryArtifact(value = {}) {
  const bathymetry = value.bathymetry ?? value.field ?? value;
  const bottomDepthMeters = normalizeNumberGrid(value.bottomDepthMeters ?? bathymetry.bottomDepthMeters ?? bathymetry.depthMeters, bathymetry.width ?? value.width, bathymetry.height ?? value.height, 0);
  const northCount = bottomDepthMeters.length;
  const eastCount = bottomDepthMeters[0]?.length ?? 0;
  const landMask = normalizeLandMask(value.landMask ?? bathymetry.landMask ?? bathymetry.landSeaMask, bottomDepthMeters);
  const wetMask = normalizeWetMask(value.wetMask ?? bathymetry.wetMask, bottomDepthMeters, landMask);
  const signedElevationMeters = normalizeSignedElevation(value.signedElevationMeters ?? value.signedTerrainSurface?.elevationMeters ?? bathymetry.signedTerrainSurface?.elevationMeters, bottomDepthMeters, landMask, value.seaLevelMeters ?? bathymetry.seaLevelMeters ?? 0);
  const physicalExtentMeters = normalizeExtent(value.physicalExtentMeters ?? bathymetry.physicalExtentMeters ?? bathymetry.operationalDomain?.horizontal, eastCount, northCount);
  const manifest = BathymetryManifest.normalizeBathymetryManifest(value.manifest ?? {
    id: value.manifestId ?? value.id ?? bathymetry.id ?? bathymetry.seed ?? 'bathymetry-artifact',
    seed: bathymetry.seed ?? value.seed,
    generatorId: bathymetry.type ?? 'anchor.science.bathymetry-field',
    generatorVersion: bathymetry.version ?? value.generatorVersion,
    coordinateFrame: value.coordinateFrame ?? bathymetry.coordinateFrame ?? bathymetry.operationalDomain?.coordinateFrame,
    physicalExtentMeters,
    resolution: { eastCount, northCount },
    archetype: value.archetype ?? bathymetry.scenarioId ?? bathymetry.config?.defaultViewMode,
    components: bathymetry.featureIds ?? bathymetry.config?.features,
    sourceMetadata: value.sourceMetadata ?? bathymetry.sourceMetadata
  });
  const eastAxisMeters = value.eastAxisMeters ?? createAxis(eastCount, physicalExtentMeters.east);
  const northAxisMeters = value.northAxisMeters ?? createAxis(northCount, physicalExtentMeters.north);
  const artifactBase = {
    type: 'anchor.bathymetry.artifact',
    version: value.version ?? BATHYMETRY_ARTIFACT_VERSION,
    id: String(value.id ?? bathymetry.id ?? bathymetry.seed ?? manifest.id ?? 'bathymetry-artifact'),
    coordinateFrame: manifest.coordinateFrame,
    axisOrdering: 'row-major [northIndex][eastIndex]',
    units: {
      eastAxisMeters: 'meters',
      northAxisMeters: 'meters',
      signedElevationMeters: 'meters relative to sea level',
      bottomDepthMeters: 'meters positive downward',
      wetMask: 'boolean wet=true',
      landMask: 'boolean land=true'
    },
    eastAxisMeters,
    northAxisMeters,
    signedElevationMeters,
    bottomDepthMeters,
    wetMask,
    landMask,
    coastline: normalizeCoastline(value.coastline ?? bathymetry.coastline ?? bathymetry.coastlineEdges ?? value.signedTerrainSurface?.coastline),
    featureMetadata: value.featureMetadata ?? bathymetry.terrainFeatures ?? bathymetry.featureSummary ?? null,
    sourceMetadata: BathymetrySourceMetadata.createBathymetrySourceMetadata(value.sourceMetadata ?? bathymetry.sourceMetadata ?? {}),
    provenance: normalizeProvenance(value.provenance ?? bathymetry.provenance ?? {}),
    manifest,
    manifestDigest: value.manifestDigest ?? manifest.manifestDigest ?? BathymetryManifest.bathymetryManifestDigest(manifest),
    boundaryFlags: normalizeBoundaryFlags(value.boundaryFlags ?? bathymetry.boundaryFlags ?? {})
  };
  const validationReport = validateBathymetryArtifact(artifactBase);
  const artifact = {
    ...artifactBase,
    validationReport
  };
  return {
    ...artifact,
    artifactDigest: value.artifactDigest ?? bathymetryArtifactDigest(artifact)
  };
}

 function validateBathymetryArtifact(value = {}) {
  const artifact = value.type === 'anchor.bathymetry.artifact' ? value : normalizeBathymetryArtifact(value);
  const errors = [];
  const warnings = [];
  const height = artifact.bottomDepthMeters?.length ?? 0;
  const width = artifact.bottomDepthMeters?.[0]?.length ?? 0;
  if (artifact.type !== 'anchor.bathymetry.artifact') errors.push('Bathymetry artifact type must be anchor.bathymetry.artifact.');
  if (!width || !height) errors.push('Bathymetry artifact requires non-empty bottomDepthMeters.');
  if ((artifact.eastAxisMeters?.length ?? 0) !== width) errors.push('eastAxisMeters length must match field width.');
  if ((artifact.northAxisMeters?.length ?? 0) !== height) errors.push('northAxisMeters length must match field height.');
  for (const [name, grid] of [['signedElevationMeters', artifact.signedElevationMeters], ['bottomDepthMeters', artifact.bottomDepthMeters], ['wetMask', artifact.wetMask], ['landMask', artifact.landMask]]) {
    if (!Array.isArray(grid) || grid.length !== height || grid.some((row) => !Array.isArray(row) || row.length !== width)) {
      errors.push(`${name} dimensions must match bottomDepthMeters.`);
    }
  }
  const depths = artifact.bottomDepthMeters?.flat?.() ?? [];
  const elevations = artifact.signedElevationMeters?.flat?.() ?? [];
  if (!depths.every((value) => Number.isFinite(Number(value)))) errors.push('All bottomDepthMeters values must be finite.');
  if (!elevations.every((value) => Number.isFinite(Number(value)))) errors.push('All signedElevationMeters values must be finite.');
  let wetCount = 0;
  let landCount = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const wet = artifact.wetMask[y]?.[x] === true;
      const land = artifact.landMask[y]?.[x] === true;
      const depth = Number(artifact.bottomDepthMeters[y]?.[x] ?? 0);
      if (wet) wetCount += 1;
      if (land) landCount += 1;
      if (wet && land) errors.push(`Cell ${x},${y} cannot be both wet and land.`);
      if (wet && depth <= 0) errors.push(`Wet cell ${x},${y} must have positive bottom depth.`);
      if (land && depth > 0) warnings.push(`Land cell ${x},${y} has positive bottom depth under legacy compatibility semantics.`);
    }
  }
  if (!artifact.manifestDigest) errors.push('manifestDigest is required.');
  if (artifact.boundaryFlags?.rendererOwnsBathymetry === true) errors.push('Renderer must not own bathymetry truth.');
  return index.createValidationReport({
    errors,
    warnings,
    checks: [
      { id: 'bathymetry-artifact-dimensions', passed: errors.every((entry) => !entry.includes('dimensions')) },
      { id: 'bathymetry-artifact-finite-values', passed: depths.every((value) => Number.isFinite(Number(value))) && elevations.every((value) => Number.isFinite(Number(value))) },
      { id: 'bathymetry-artifact-mask-consistency', passed: errors.every((entry) => !entry.includes('cell')) },
      { id: 'bathymetry-artifact-mask-counts', wetCount, landCount }
    ]
  });
}

 function bathymetryArtifactSummary(value = {}) {
  const artifact = value.type === 'anchor.bathymetry.artifact' ? value : normalizeBathymetryArtifact(value);
  const depths = artifact.bottomDepthMeters.flat().map(Number).filter(Number.isFinite);
  const elevations = artifact.signedElevationMeters.flat().map(Number).filter(Number.isFinite);
  return {
    type: 'anchor.bathymetry.artifact-summary',
    version: BATHYMETRY_ARTIFACT_VERSION,
    id: artifact.id,
    coordinateFrame: artifact.coordinateFrame,
    eastCount: artifact.eastAxisMeters.length,
    northCount: artifact.northAxisMeters.length,
    eastExtentMeters: round(Math.max(...artifact.eastAxisMeters) - Math.min(...artifact.eastAxisMeters)),
    northExtentMeters: round(Math.max(...artifact.northAxisMeters) - Math.min(...artifact.northAxisMeters)),
    minSignedElevationMeters: elevations.length ? round(Math.min(...elevations)) : null,
    maxSignedElevationMeters: elevations.length ? round(Math.max(...elevations)) : null,
    minBottomDepthMeters: depths.length ? round(Math.min(...depths)) : null,
    maxBottomDepthMeters: depths.length ? round(Math.max(...depths)) : null,
    wetCellCount: artifact.wetMask.flat().filter(Boolean).length,
    landCellCount: artifact.landMask.flat().filter(Boolean).length,
    coastlineSegmentCount: artifact.coastline.length,
    manifestDigest: artifact.manifestDigest,
    artifactDigest: artifact.artifactDigest ?? bathymetryArtifactDigest(artifact),
    validationStatus: artifact.validationReport?.status ?? validateBathymetryArtifact(artifact).status,
    rendererOwnsBathymetry: artifact.boundaryFlags?.rendererOwnsBathymetry === true
  };
}

 function bathymetryArtifactDigest(value = {}) {
  const payload = { ...value };
  delete payload.artifactDigest;
  delete payload.validationReport;
  return index.artifactDigest(payload);
}

function normalizeNumberGrid(input = [], widthInput = null, heightInput = null, fallback = 0) {
  const height = Math.max(1, Math.round(Number(heightInput ?? input.length ?? 1)));
  const width = Math.max(1, Math.round(Number(widthInput ?? input[0]?.length ?? 1)));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => round(Math.max(0, finite(input[y]?.[x], fallback)))));
}

function normalizeLandMask(input = [], bottomDepthMeters = []) {
  const height = bottomDepthMeters.length;
  const width = bottomDepthMeters[0]?.length ?? 0;
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const value = input?.[y]?.[x];
    if (value === true || value === 'land') return true;
    if (value === false || value === 'water') return false;
    const number = Number(value);
    if (Number.isFinite(number)) return number > 0;
    return Number(bottomDepthMeters[y]?.[x] ?? 0) <= 0;
  }));
}

function normalizeWetMask(input = [], bottomDepthMeters = [], landMask = []) {
  const height = bottomDepthMeters.length;
  const width = bottomDepthMeters[0]?.length ?? 0;
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const value = input?.[y]?.[x];
    if (value === true || value === 'wet' || value === 'water') return true;
    if (value === false || value === 'dry' || value === 'land') return false;
    const number = Number(value);
    if (Number.isFinite(number)) return number > 0;
    return landMask[y]?.[x] !== true && Number(bottomDepthMeters[y]?.[x] ?? 0) > 0;
  }));
}

function normalizeSignedElevation(input = [], bottomDepthMeters = [], landMask = [], seaLevelMeters = 0) {
  const height = bottomDepthMeters.length;
  const width = bottomDepthMeters[0]?.length ?? 0;
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const provided = Number(input?.[y]?.[x]);
    if (Number.isFinite(provided)) return round(provided);
    if (landMask[y]?.[x] === true) return round(seaLevelMeters + 2);
    return round(seaLevelMeters - Math.max(0, Number(bottomDepthMeters[y]?.[x] ?? 0)));
  }));
}

function normalizeCoastline(input = []) {
  return (Array.isArray(input) ? input : []).map((segment, index) => ({
    id: segment.id ?? `coastline-${index + 1}`,
    start: segment.start ?? null,
    end: segment.end ?? null,
    source: segment.source ?? 'bathymetry-artifact'
  }));
}

function normalizeExtent(value = {}, eastCount, northCount) {
  const east = finite(value.east ?? value.widthMeters ?? (Number(value.maxEastMeters) - Number(value.minEastMeters)), Math.max(1, eastCount - 1));
  const north = finite(value.north ?? value.heightMeters ?? (Number(value.maxNorthMeters) - Number(value.minNorthMeters)), Math.max(1, northCount - 1));
  return { east: Math.max(1, round(east)), north: Math.max(1, round(north)) };
}

function createAxis(count, extentMeters) {
  if (count <= 1) return [0];
  return Array.from({ length: count }, (_value, index) => round((extentMeters * index) / (count - 1)));
}

function normalizeProvenance(value = {}) {
  return {
    generatedBy: value.generatedBy ?? 'anchor-bathymetry-package-adapter',
    generatorVersion: value.generatorVersion ?? BATHYMETRY_ARTIFACT_VERSION,
    synthetic: value.synthetic !== false,
    calibratedBathymetry: false,
    operationalNavigationProduct: false
  };
}

function normalizeBoundaryFlags(value = {}) {
  return {
    ...value,
    rendererOwnsBathymetry: false,
    simulationOwnsBathymetryGeneration: false,
    packageUsesThree: false,
    packageUsesPhaser: false,
    packageUsesDom: false,
    syntheticEducational: value.syntheticEducational !== false,
    calibratedBathymetry: false,
    operationalNavigationProduct: false
  };
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
module.exports = {createBathymetryArtifact, normalizeBathymetryArtifact, validateBathymetryArtifact, bathymetryArtifactSummary, bathymetryArtifactDigest}