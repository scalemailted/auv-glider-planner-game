 const CURRENT_FIELD_MANIFEST_VERSION = 'current-field-manifest-flow-pkg-r1';

 const CURRENT_FIELD_REQUIRED_SYNTHETIC_CLAIM_BOUNDARY = Object.freeze({
  synthetic: true,
  scientificallyConstrained: true,
  calibratedForecast: false,
  realHycom: false,
  realMarineCopernicus: false,
  operationalOceanProduct: false
});

 function createCurrentFieldManifest(options = {}) {
  const depthAxisMeters = normalizeNumberArray(options.depthAxisMeters, [0, 10, 35, 75, 150]);
  const timeAxisSeconds = normalizeNumberArray(options.timeAxisSeconds, [0, 600, 1200, 1800]);
  const sourceResolution = {
    eastCount: positiveInteger(options.sourceResolution?.eastCount ?? options.eastCount ?? options.grid?.width, 1),
    northCount: positiveInteger(options.sourceResolution?.northCount ?? options.northCount ?? options.grid?.height, 1),
    depthCount: positiveInteger(options.sourceResolution?.depthCount ?? depthAxisMeters.length, depthAxisMeters.length),
    timeCount: positiveInteger(options.sourceResolution?.timeCount ?? timeAxisSeconds.length, timeAxisSeconds.length)
  };
  const manifest = {
    type: 'anchor.currents.current-field-manifest',
    version: options.version ?? CURRENT_FIELD_MANIFEST_VERSION,
    id: String(options.id ?? options.manifestId ?? options.sourceMetadata?.sourceId ?? 'current-field-manifest'),
    seed: options.seed ?? options.sourceMetadata?.seed ?? null,
    generatorId: options.generatorId ?? options.sourceMetadata?.generatorId ?? options.sourceMetadata?.equationFamily ?? null,
    generatorVersion: options.generatorVersion ?? options.sourceMetadata?.generatorVersion ?? options.sourceMetadata?.environmentGeneratorBackendVersion ?? null,
    generatorBackend: options.generatorBackend ?? options.sourceMetadata?.environmentGeneratorBackendId ?? 'javascriptCpuV1',
    coordinateFrame: options.coordinateFrame ?? options.sourceMetadata?.coordinateFrame ?? 'localEastNorthDown',
    physicalExtentMeters: options.physicalExtentMeters ?? null,
    sourceResolution,
    depthAxisMeters,
    timeAxisSeconds,
    temporalBoundaryMode: normalizeTemporalBoundaryMode(options.temporalBoundaryMode ?? options.sourceMetadata?.temporalBoundaryMode ?? 'bounded'),
    temporalPeriodSeconds: finiteOrNull(options.temporalPeriodSeconds ?? options.sourceMetadata?.temporalPeriodSeconds),
    currentComponents: Array.isArray(options.currentComponents) ? options.currentComponents : (Array.isArray(options.sourceMetadata?.components) ? options.sourceMetadata.components : []),
    forcingMetadata: options.forcingMetadata ?? {},
    bathymetryManifestDigest: options.bathymetryManifestDigest ?? options.sourceMetadata?.bathymetryManifestDigest ?? null,
    bathymetryArtifactDigest: options.bathymetryArtifactDigest ?? options.sourceMetadata?.bathymetryArtifactDigest ?? null,
    sourceMetadata: options.sourceMetadata ?? {},
    provenance: options.provenance ?? {},
    claimBoundary: normalizeClaimBoundary(options.claimBoundary ?? options.sourceMetadata?.claimBoundary)
  };
  manifest.digest = currentFieldManifestDigest(manifest);
  return manifest;
}

 function normalizeCurrentFieldManifest(value = {}) {
  if (value?.type === 'anchor.currents.current-field-manifest' && value.version) return { ...value, digest: value.digest ?? currentFieldManifestDigest(value) };
  return createCurrentFieldManifest(value);
}

 function validateCurrentFieldManifest(value = {}) {
  const manifest = normalizeCurrentFieldManifest(value);
  const errors = [];
  const warnings = [];
  if (manifest.coordinateFrame !== 'localEastNorthDown') warnings.push(`Unexpected current coordinate frame: ${manifest.coordinateFrame}.`);
  if (!Array.isArray(manifest.depthAxisMeters) || !manifest.depthAxisMeters.length) errors.push('depthAxisMeters must be a non-empty meters-positive-down axis.');
  if (!Array.isArray(manifest.timeAxisSeconds) || !manifest.timeAxisSeconds.length) errors.push('timeAxisSeconds must be a non-empty canonical seconds axis.');
  if (!manifest.timeAxisSeconds.every(Number.isFinite)) errors.push('timeAxisSeconds must contain finite seconds.');
  if (!['bounded', 'periodic'].includes(manifest.temporalBoundaryMode)) errors.push(`Unsupported temporalBoundaryMode: ${manifest.temporalBoundaryMode}.`);
  if (manifest.claimBoundary?.synthetic === true) {
    if (manifest.claimBoundary.calibratedForecast || manifest.claimBoundary.realHycom || manifest.claimBoundary.realMarineCopernicus || manifest.claimBoundary.operationalOceanProduct) errors.push('Synthetic current manifests must not claim calibrated or operational ocean products.');
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, manifest };
}

 function currentFieldManifestSummary(value = {}) {
  const manifest = normalizeCurrentFieldManifest(value);
  return {
    type: 'anchor.currents.current-field-manifest-summary',
    version: manifest.version,
    id: manifest.id,
    generatorId: manifest.generatorId,
    generatorBackend: manifest.generatorBackend,
    coordinateFrame: manifest.coordinateFrame,
    sourceResolution: { ...manifest.sourceResolution },
    depthAxisMeters: [...manifest.depthAxisMeters],
    timeAxisSeconds: [...manifest.timeAxisSeconds],
    temporalBoundaryMode: manifest.temporalBoundaryMode,
    temporalPeriodSeconds: manifest.temporalPeriodSeconds,
    bathymetryManifestDigest: manifest.bathymetryManifestDigest,
    bathymetryArtifactDigest: manifest.bathymetryArtifactDigest,
    claimBoundary: { ...manifest.claimBoundary },
    digest: manifest.digest ?? currentFieldManifestDigest(manifest)
  };
}

 function currentFieldManifestDigest(value = {}) {
  const manifest = { ...value };
  delete manifest.digest;
  return `fnv1a32:${fnv(stable(manifest))}`;
}

function normalizeClaimBoundary(value = {}) {
  return {
    ...CURRENT_FIELD_REQUIRED_SYNTHETIC_CLAIM_BOUNDARY,
    ...(value ?? {})
  };
}

function normalizeTemporalBoundaryMode(value) {
  return String(value ?? '').trim() === 'periodic' ? 'periodic' : 'bounded';
}

function normalizeNumberArray(value, fallback) {
  const source = Array.isArray(value) && value.length ? value : fallback;
  return [...new Set(source.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
}

function positiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fnv(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
module.exports = {CURRENT_FIELD_MANIFEST_VERSION, CURRENT_FIELD_REQUIRED_SYNTHETIC_CLAIM_BOUNDARY, createCurrentFieldManifest, normalizeCurrentFieldManifest, validateCurrentFieldManifest, currentFieldManifestSummary, currentFieldManifestDigest}