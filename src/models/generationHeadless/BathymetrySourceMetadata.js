 const BATHYMETRY_SOURCE_METADATA_VERSION = 'bathymetry-source-metadata-three-r1-2b';

 function createBathymetrySourceMetadata(options = {}) {
  const synthetic = options.synthetic !== false;
  return {
    type: 'anchor.science.bathymetry-source-metadata',
    version: BATHYMETRY_SOURCE_METADATA_VERSION,
    sourceType: normalizeSourceType(options.sourceType),
    sourceId: String(options.sourceId ?? options.id ?? options.seed ?? 'synthetic-bathymetry'),
    sourceVersion: String(options.sourceVersion ?? BATHYMETRY_SOURCE_METADATA_VERSION),
    label: String(options.label ?? 'Deterministic synthetic educational bathymetry'),
    attribution: options.attribution ?? 'Generated locally by ANCHOR educational terrain rules.',
    license: options.license ?? 'project-local synthetic fixture',
    citation: options.citation ?? null,
    coordinateReferenceSystem: options.coordinateReferenceSystem ?? 'local continuous grid',
    verticalDatum: options.verticalDatum ?? 'surface zero, positive depth downward',
    horizontalResolution: options.horizontalResolution ?? 'one canonical grid cell',
    verticalUnits: options.verticalUnits ?? 'meters',
    interpolationProfileId: options.interpolationProfileId ?? 'bilinearCellCenterV1',
    noDataValue: options.noDataValue ?? null,
    synthetic,
    calibrated: options.calibrated === true && synthetic === false,
    operationallyValidated: options.operationallyValidated === true && synthetic === false,
    warnings: [
      ...(options.warnings ?? []),
      ...(synthetic ? ['Synthetic educational bathymetry; not calibrated, operational, or survey-derived.'] : [])
    ]
  };
}

 function normalizeBathymetrySourceMetadata(value = {}) {
  if (value?.type === 'anchor.science.bathymetry-source-metadata') return { ...value, warnings: [...(value.warnings ?? [])] };
  return createBathymetrySourceMetadata(value);
}

 function validateBathymetrySourceMetadata(metadata = {}) {
  const errors = [];
  const warnings = [...(metadata.warnings ?? [])];
  if (metadata.type !== 'anchor.science.bathymetry-source-metadata') errors.push('Bathymetry source metadata type is invalid.');
  if (!['syntheticGenerated', 'checkedInFixture', 'importedLocalArtifact'].includes(metadata.sourceType)) errors.push(`Unsupported bathymetry sourceType ${metadata.sourceType ?? 'missing'}.`);
  if (metadata.synthetic !== false && metadata.calibrated === true) errors.push('Synthetic bathymetry must not claim calibrated=true.');
  if (metadata.synthetic !== false && metadata.operationallyValidated === true) errors.push('Synthetic bathymetry must not claim operationallyValidated=true.');
  if (claimsExternalDataset(metadata)) errors.push('Bathymetry metadata must not claim external operational datasets unless a checked-in attributed fixture exists.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function bathymetrySourceMetadataSummary(metadata = {}) {
  return {
    type: 'anchor.science.bathymetry-source-metadata-summary',
    version: BATHYMETRY_SOURCE_METADATA_VERSION,
    sourceType: metadata.sourceType ?? null,
    sourceId: metadata.sourceId ?? null,
    synthetic: metadata.synthetic !== false,
    calibrated: metadata.calibrated === true,
    operationallyValidated: metadata.operationallyValidated === true,
    interpolationProfileId: metadata.interpolationProfileId ?? null,
    warnings: [...(metadata.warnings ?? [])]
  };
}

function normalizeSourceType(value) {
  const text = String(value ?? '').trim();
  if (['checkedInFixture', 'importedLocalArtifact'].includes(text)) return text;
  return 'syntheticGenerated';
}

function claimsExternalDataset(metadata = {}) {
  const text = JSON.stringify(metadata).toLowerCase();
  return /(gebco|etopo|copernicus|natural earth|noaa)/i.test(text)
    && metadata.sourceType !== 'checkedInFixture'
    && metadata.synthetic !== false;
}

module.exports = {BATHYMETRY_SOURCE_METADATA_VERSION, createBathymetrySourceMetadata, normalizeBathymetrySourceMetadata, validateBathymetrySourceMetadata, bathymetrySourceMetadataSummary}