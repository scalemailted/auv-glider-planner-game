export const SCALAR_SOURCE_METADATA_VERSION = 'scalar-source-metadata-process-pkg-r1';

export const SCALAR_SOURCE_TIERS = Object.freeze([
  'manufacturedAnalytical',
  'educationalSynthetic',
  'scientificallyConstrainedSynthetic',
  'externalDataset'
]);

export const SCALAR_REQUIRED_SYNTHETIC_WARNING = 'Synthetic scalar-process field for ANCHOR education/regression use; not a calibrated ocean forecast, ecological forecast, or operational product.';

export function normalizeScalarSourceMetadata(input = {}, context = {}) {
  const sourceTier = normalizeSourceTier(input.sourceTier ?? input.tier ?? 'educationalSynthetic');
  const synthetic = input.synthetic !== false && sourceTier !== 'externalDataset';
  const calibratedForecast = input.calibratedForecast === true || input.calibratedOceanForecast === true || input.calibratedBiogeochemicalForecast === true;
  const metadata = {
    type: 'anchor.scalar-processes.source-metadata',
    version: SCALAR_SOURCE_METADATA_VERSION,
    sourceId: stringOr(input.sourceId ?? input.id, 'synthetic-scalar-source'),
    fieldId: stringOr(input.fieldId, null),
    label: stringOr(input.label ?? input.sourceLabel, 'Synthetic scalar process'),
    sourceTier,
    sourceType: stringOr(input.sourceType, synthetic ? 'synthetic-process' : 'external-dataset'),
    processKind: stringOr(input.processKind ?? input.equationFamily, 'synthetic-scalar-process'),
    equationFamily: stringOr(input.equationFamily ?? input.processKind, 'synthetic-scalar-process'),
    generatorBackend: stringOr(input.generatorBackend ?? input.environmentGeneratorBackendId, null),
    generatorVersion: stringOr(input.generatorVersion, null),
    seed: input.seed ?? context.seed ?? null,
    synthetic,
    calibratedForecast,
    calibratedOceanForecast: input.calibratedOceanForecast === true,
    calibratedBiogeochemicalForecast: input.calibratedBiogeochemicalForecast === true,
    usesRealHycom: input.usesRealHycom === true,
    usesRealMarineCopernicus: input.usesRealMarineCopernicus === true,
    publicSafe: input.publicSafe !== false,
    hiddenTruthIncluded: input.hiddenTruthIncluded === true,
    visibilityTier: stringOr(input.visibilityTier, input.hiddenTruthIncluded === true ? 'hiddenTruth' : 'publicScenario'),
    depthDependent: input.depthDependent !== false,
    timeDependent: input.timeDependent !== false,
    units: stringOr(input.units ?? input.scalarUnits, 'normalized science value'),
    notCalibratedClaim: input.notCalibratedClaim ?? SCALAR_REQUIRED_SYNTHETIC_WARNING,
    warnings: uniqueStrings([...(input.warnings ?? []), synthetic ? SCALAR_REQUIRED_SYNTHETIC_WARNING : null]),
    notes: uniqueStrings(input.notes),
    boundaryFlags: {
      rendererOwnsScalarTruth: false,
      displayLayerChangesScalarTruth: false,
      changesOfficialScoring: false,
      ownsVehiclePhysics: false,
      ownsObservationNoise: false,
      ownsBathymetry: false,
      ownsCurrents: false,
      calibratedForecast,
      ...(input.boundaryFlags ?? {})
    }
  };
  return metadata;
}

export function validateScalarSourceMetadata(input = {}) {
  const metadata = normalizeScalarSourceMetadata(input);
  const errors = [];
  const warnings = [];
  if (!SCALAR_SOURCE_TIERS.includes(metadata.sourceTier)) errors.push(`Unsupported scalar source tier: ${metadata.sourceTier}`);
  if (metadata.hiddenTruthIncluded === true && metadata.visibilityTier !== 'hiddenTruth') errors.push('Hidden truth scalar metadata must use visibilityTier=hiddenTruth.');
  if (metadata.synthetic && (metadata.usesRealHycom || metadata.usesRealMarineCopernicus)) errors.push('Synthetic scalar metadata must not claim real HYCOM or Marine Copernicus fields.');
  if (metadata.synthetic && metadata.calibratedForecast) errors.push('Synthetic scalar metadata must not claim calibrated forecast skill.');
  const warningText = metadata.warnings.join(' ');
  if (metadata.synthetic && !/not a calibrated ocean forecast/i.test(warningText)) errors.push('Synthetic scalar metadata must state it is not a calibrated ocean forecast.');
  if (metadata.boundaryFlags?.rendererOwnsScalarTruth === true) errors.push('Renderer must not own scalar truth.');
  if (metadata.boundaryFlags?.displayLayerChangesScalarTruth === true) errors.push('Display layer must not change scalar truth.');
  if (metadata.boundaryFlags?.changesOfficialScoring === true) errors.push('Scalar source metadata must not change official scoring.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, metadata };
}

export function scalarSourceClaimBoundary(metadata = {}) {
  const normalized = normalizeScalarSourceMetadata(metadata);
  return {
    sourceTier: normalized.sourceTier,
    synthetic: normalized.synthetic,
    calibratedForecast: normalized.calibratedForecast,
    publicSafe: normalized.publicSafe,
    hiddenTruthIncluded: normalized.hiddenTruthIncluded,
    warning: normalized.notCalibratedClaim,
    boundaryFlags: { ...normalized.boundaryFlags }
  };
}

function normalizeSourceTier(value) {
  const text = String(value ?? '').trim();
  return SCALAR_SOURCE_TIERS.includes(text) ? text : 'educationalSynthetic';
}

function stringOr(value, fallback) {
  const text = value == null ? '' : String(value).trim();
  return text || fallback;
}

function uniqueStrings(value) {
  const source = Array.isArray(value) ? value : [value];
  return [...new Set(source.map((entry) => entry == null ? '' : String(entry).trim()).filter(Boolean))];
}
