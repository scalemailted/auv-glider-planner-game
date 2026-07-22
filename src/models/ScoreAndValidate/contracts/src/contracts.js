const digests = require('./digests.js');

const ANCHOR_CONTRACTS_VERSION = 'anchor-contracts-arch-r1';

const COORDINATE_FRAMES = Object.freeze({
  GRID: 'grid-index',
  LOCAL_METERS: 'local-meters',
  GEODETIC_WGS84: 'geodetic-wgs84',
});

const PHYSICAL_UNITS = Object.freeze({
  DISTANCE_METERS: 'm',
  DEPTH_METERS: 'm_below_surface',
  SPEED_METERS_PER_SECOND: 'm/s',
  TIME_SECONDS: 's',
  SCALAR_VALUE: 'model_unit',
});

const TYPED_ARRAY_LAYOUTS = Object.freeze({
  ROW_MAJOR_XY: 'row-major-yx',
  ROW_MAJOR_XYZ: 'row-major-zyx',
  ROW_MAJOR_TZYX: 'row-major-tzyx',
  VECTOR_COMPONENT_LAST: 'component-last',
});

function createValidationReport(input = {}) {
  const errors = Array.isArray(input.errors) ? input.errors.map(String) : [];
  const warnings = Array.isArray(input.warnings) ? input.warnings.map(String) : [];
  const checks = Array.isArray(input.checks) ? input.checks : [];
  return {
    schemaVersion: 'anchor.validation-report.arch-r1',
    status: input.status || (errors.length ? 'error' : warnings.length ? 'warning' : 'ok'),
    errors,
    warnings,
    checks,
  };
}

function createProvenanceMetadata(input = {}) {
  return {
    generatedBy: input.generatedBy || 'anchor-local-generator',
    generatorVersion: input.generatorVersion || 'unknown',
    source: input.source || 'synthetic',
    calibrated: input.calibrated === true,
    synthetic: input.synthetic !== false,
    notes: Array.isArray(input.notes) ? input.notes.map(String) : [],
  };
}

function normalizeAxisDefinition(axis = {}, fallbackName = 'axis', units = PHYSICAL_UNITS.SCALAR_VALUE) {
  const size = Number(axis.size ?? axis.count ?? 0);
  return {
    name: String(axis.name || fallbackName),
    units: String(axis.units || units),
    size: Number.isFinite(size) && size > 0 ? Math.floor(size) : 0,
    min: Number.isFinite(Number(axis.min)) ? Number(axis.min) : 0,
    max: Number.isFinite(Number(axis.max)) ? Number(axis.max) : Math.max(0, size - 1),
    spacing: Number.isFinite(Number(axis.spacing)) ? Number(axis.spacing) : 1,
  };
}

function normalizeBathymetryManifest(input = {}) {
  const axes = input.axes || {};
  const manifest = {
    schemaVersion: 'anchor.bathymetry.manifest.arch-r1',
    type: 'anchor.bathymetry.manifest',
    id: String(input.id || input.name || 'bathymetry-manifest'),
    coordinateFrame: input.coordinateFrame || COORDINATE_FRAMES.LOCAL_METERS,
    axes: {
      x: normalizeAxisDefinition(axes.x, 'x', PHYSICAL_UNITS.DISTANCE_METERS),
      y: normalizeAxisDefinition(axes.y, 'y', PHYSICAL_UNITS.DISTANCE_METERS),
      z: normalizeAxisDefinition(axes.z, 'z', PHYSICAL_UNITS.DEPTH_METERS),
    },
    units: {
      depth: PHYSICAL_UNITS.DEPTH_METERS,
      slope: 'rise/run',
      mask: 'boolean',
      ...(input.units || {}),
    },
    layers: Array.isArray(input.layers) ? input.layers.map(String) : ['depthMeters', 'landSeaMask'],
    provenance: createProvenanceMetadata(input.provenance),
  };
  return {
    ...manifest,
    digest: digests.artifactDigest(manifest),
  };
}

function validateBathymetryManifest(input = {}) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object') errors.push('Bathymetry manifest must be an object.');
  if (!input.axes?.x?.size || !input.axes?.y?.size) warnings.push('Bathymetry manifest should declare x/y axis sizes.');
  if (input.provenance?.calibrated === true && input.provenance?.synthetic !== false) {
    warnings.push('Synthetic bathymetry should not be marked calibrated.');
  }
  return createValidationReport({ errors, warnings });
}

function normalizeBathymetryArtifact(input = {}) {
  const manifest = normalizeBathymetryManifest(input.manifest || input);
  const artifact = {
    schemaVersion: 'anchor.bathymetry.artifact.arch-r1',
    type: 'anchor.bathymetry.artifact',
    manifest,
    layout: input.layout || TYPED_ARRAY_LAYOUTS.ROW_MAJOR_XY,
    fields: input.fields || {},
    validationReport: createValidationReport(input.validationReport || {}),
  };
  return {
    ...artifact,
    digest: digests.artifactDigest(artifact),
  };
}

function validateBathymetryArtifact(input = {}) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object') errors.push('Bathymetry artifact must be an object.');
  if (!input.manifest) errors.push('Bathymetry artifact requires a manifest.');
  if (!input.fields || typeof input.fields !== 'object') errors.push('Bathymetry artifact requires fields.');
  if (!input.layout) warnings.push('Bathymetry artifact should declare typed-array layout.');
  return createValidationReport({ errors, warnings });
}

function normalizeCurrentFieldManifest(input = {}) {
  const axes = input.axes || {};
  const manifest = {
    schemaVersion: 'anchor.current-field.manifest.arch-r1',
    type: 'anchor.current-field.manifest',
    id: String(input.id || 'current-field-manifest'),
    coordinateFrame: input.coordinateFrame || COORDINATE_FRAMES.LOCAL_METERS,
    axes: {
      t: normalizeAxisDefinition(axes.t, 't', PHYSICAL_UNITS.TIME_SECONDS),
      z: normalizeAxisDefinition(axes.z, 'z', PHYSICAL_UNITS.DEPTH_METERS),
      y: normalizeAxisDefinition(axes.y, 'y', PHYSICAL_UNITS.DISTANCE_METERS),
      x: normalizeAxisDefinition(axes.x, 'x', PHYSICAL_UNITS.DISTANCE_METERS),
    },
    vectorComponents: Array.isArray(input.vectorComponents) ? input.vectorComponents.map(String) : ['u', 'v', 'w'],
    units: { velocity: PHYSICAL_UNITS.SPEED_METERS_PER_SECOND, ...(input.units || {}) },
    provenance: createProvenanceMetadata(input.provenance),
  };
  return { ...manifest, digest: digests.artifactDigest(manifest) };
}

function normalizeCurrentField4D(input = {}) {
  const artifact = {
    schemaVersion: 'anchor.current-field-4d.artifact.arch-r1',
    type: 'anchor.current-field-4d.artifact',
    manifest: normalizeCurrentFieldManifest(input.manifest || input),
    layout: input.layout || TYPED_ARRAY_LAYOUTS.ROW_MAJOR_TZYX,
    fields: input.fields || {},
    diagnostics: input.diagnostics || {},
    validationReport: createValidationReport(input.validationReport || {}),
  };
  return { ...artifact, digest: digests.artifactDigest(artifact) };
}

function normalizeScalarProcessManifest(input = {}) {
  const manifest = {
    schemaVersion: 'anchor.scalar-process.manifest.arch-r1',
    type: 'anchor.scalar-process.manifest',
    id: String(input.id || 'scalar-process-manifest'),
    processKind: String(input.processKind || 'synthetic-scalar-process'),
    coordinateFrame: input.coordinateFrame || COORDINATE_FRAMES.LOCAL_METERS,
    units: { scalar: PHYSICAL_UNITS.SCALAR_VALUE, time: PHYSICAL_UNITS.TIME_SECONDS, ...(input.units || {}) },
    axes: input.axes || {},
    provenance: createProvenanceMetadata(input.provenance),
  };
  return { ...manifest, digest: digests.artifactDigest(manifest) };
}

function normalizeScalarField4D(input = {}) {
  const artifact = {
    schemaVersion: 'anchor.scalar-field-4d.artifact.arch-r1',
    type: 'anchor.scalar-field-4d.artifact',
    manifest: normalizeScalarProcessManifest(input.manifest || input),
    layout: input.layout || TYPED_ARRAY_LAYOUTS.ROW_MAJOR_TZYX,
    fields: input.fields || {},
    diagnostics: input.diagnostics || {},
    validationReport: createValidationReport(input.validationReport || {}),
  };
  return { ...artifact, digest: digests.artifactDigest(artifact) };
}

function normalizeSyntheticEnvironmentManifestContract(input = {}) {
  const manifest = {
    schemaVersion: 'anchor.synthetic-environment.manifest.arch-r1',
    type: 'anchor.synthetic-environment.manifest',
    id: String(input.id || 'synthetic-environment-manifest'),
    components: Array.isArray(input.components) ? input.components : [],
    provenance: createProvenanceMetadata(input.provenance),
    validationReport: createValidationReport(input.validationReport || {}),
  };
  return { ...manifest, digest: digests.artifactDigest(manifest) };
}

function normalizeGeneratedEnvironmentArtifactContract(input = {}) {
  const artifact = {
    schemaVersion: 'anchor.generated-environment.artifact.arch-r1',
    type: 'anchor.generated-environment.artifact',
    manifest: normalizeSyntheticEnvironmentManifestContract(input.manifest || input),
    components: input.components || {},
    validationReport: createValidationReport(input.validationReport || {}),
  };
  return { ...artifact, digest: digests.artifactDigest(artifact) };
}

module.exports = {
  ANCHOR_CONTRACTS_VERSION,
  COORDINATE_FRAMES,
  PHYSICAL_UNITS,
  TYPED_ARRAY_LAYOUTS ,
  createValidationReport,
  createProvenanceMetadata,
  normalizeAxisDefinition,
  normalizeBathymetryManifest,
  validateBathymetryManifest,
  normalizeBathymetryArtifact,
  validateBathymetryArtifact,
  normalizeCurrentFieldManifest,
  normalizeCurrentField4D,
  normalizeScalarProcessManifest,
  normalizeScalarField4D,
  normalizeSyntheticEnvironmentManifestContract,
  normalizeGeneratedEnvironmentArtifactContract
}
