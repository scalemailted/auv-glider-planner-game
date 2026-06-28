export const OCEAN_CURRENT_SOURCE_METADATA_VERSION = 'ocean-current-source-metadata-flow-r2a-5-1';

export const OCEAN_CURRENT_SOURCE_TIERS = Object.freeze([
  'manufacturedAnalytical',
  'scientificallyConstrainedSynthetic',
  'checkedInImportedFixture',
  'externalOperationalProduct'
]);

export const OCEAN_CURRENT_REQUIRED_SYNTHETIC_WARNING = 'Scientifically constrained synthetic current field. Not a calibrated ocean forecast. Not real HYCOM or Marine Copernicus data.';

export function normalizeOceanCurrentSourceMetadata(input = {}, defaults = {}) {
  const seed = finite(input.seed ?? defaults.seed, 17);
  const sourceTier = normalizeSourceTier(input.sourceTier ?? defaults.sourceTier ?? input.tier ?? tierFromSourceType(input.sourceType));
  const sourceType = input.sourceType ?? sourceTypeFromTier(sourceTier);
  const sourceId = input.sourceId ?? input.fieldId ?? input.id ?? defaults.sourceId ?? `current-field-${seed}`;
  const sourceLabel = input.sourceLabel ?? input.label ?? defaults.sourceLabel ?? labelForTier(sourceTier);
  const equationFamily = input.equationFamily ?? defaults.equationFamily ?? (sourceTier === 'manufacturedAnalytical' ? 'manufacturedAnalyticalCurrentCatalog' : 'bathymetryConditionedSyntheticV1');
  const includesVerticalVelocity = input.includesVerticalVelocity === true || input.wComponentSupplied === true;
  const calibratedForecast = input.calibratedForecast === true;
  const usesRealHycom = input.usesRealHycom === true;
  const usesRealMarineCopernicus = input.usesRealMarineCopernicus === true;
  const warnings = uniqueStrings([
    ...(Array.isArray(input.warnings) ? input.warnings : []),
    ...(sourceTier === 'scientificallyConstrainedSynthetic' ? [OCEAN_CURRENT_REQUIRED_SYNTHETIC_WARNING] : []),
    ...(sourceTier === 'manufacturedAnalytical' ? ['Manufactured analytical validation fixture. Not an ocean forecast.'] : []),
    ...(calibratedForecast || usesRealHycom || usesRealMarineCopernicus ? ['Operational or imported-data source claims require explicit attribution and fixture provenance.'] : [])
  ]);
  return {
    version: input.version ?? OCEAN_CURRENT_SOURCE_METADATA_VERSION,
    sourceTier,
    sourceType,
    sourceId,
    fieldId: input.fieldId ?? sourceId,
    id: input.id ?? sourceId,
    sourceLabel,
    label: sourceLabel,
    equationFamily,
    coordinateFrame: input.coordinateFrame ?? defaults.coordinateFrame ?? 'localEastNorthDown',
    units: {
      eastAxis: 'meters',
      northAxis: 'meters',
      depthAxis: 'meters positive down',
      timeAxis: 'seconds',
      uEastMetersPerSecond: 'm/s eastward',
      vNorthMetersPerSecond: 'm/s northward',
      ...(input.units ?? {})
    },
    depthDependent: input.depthDependent !== false,
    timeDependent: input.timeDependent !== false,
    temporalBoundaryMode: normalizeTemporalBoundaryMode(input.temporalBoundaryMode ?? defaults.temporalBoundaryMode ?? 'bounded'),
    temporalPeriodSeconds: finiteOrNull(input.temporalPeriodSeconds ?? defaults.temporalPeriodSeconds),
    validTimeStartSeconds: finiteOrNull(input.validTimeStartSeconds ?? defaults.validTimeStartSeconds),
    validTimeEndSeconds: finiteOrNull(input.validTimeEndSeconds ?? defaults.validTimeEndSeconds),
    usesBathymetryMask: input.usesBathymetryMask === true,
    usesCoastlineBoundary: input.usesCoastlineBoundary === true,
    usesIsobathSteering: input.usesIsobathSteering === true,
    includesVerticalVelocity,
    calibratedForecast,
    validatedAgainstObservation: input.validatedAgainstObservation === true,
    ...(input.hiddenTruthIncluded === true || defaults.hiddenTruthIncluded === true ? { hiddenTruthIncluded: true } : {}),
    ...(input.publicSafe === false || defaults.publicSafe === false ? { publicSafe: false } : {}),
    usesRealHycom,
    usesRealMarineCopernicus,
    usesRealCopernicus: usesRealMarineCopernicus,
    operationalOceanPrediction: input.operationalOceanPrediction === true,
    expectedDiagnostics: input.expectedDiagnostics ?? defaults.expectedDiagnostics ?? {},
    componentIds: Array.isArray(input.componentIds) ? input.componentIds : (Array.isArray(input.components) ? input.components.map((component) => component?.id).filter(Boolean) : []),
    components: Array.isArray(input.components) ? input.components : [],
    parameters: input.parameters ?? {},
    calmThresholdMetersPerSecond: Number.isFinite(Number(input.calmThresholdMetersPerSecond)) ? Number(input.calmThresholdMetersPerSecond) : null,
    displayMagnitudeRangeMetersPerSecond: input.displayMagnitudeRangeMetersPerSecond ?? null,
    perturbationPolicy: input.perturbationPolicy ?? null,
    manufacturedFieldId: input.manufacturedFieldId ?? null,
    analyticalEvaluatorId: input.analyticalEvaluatorId ?? input.manufacturedFieldId ?? null,
    environmentGeneratorBackendId: input.environmentGeneratorBackendId ?? defaults.environmentGeneratorBackendId ?? null,
    environmentGeneratorBackendVersion: input.environmentGeneratorBackendVersion ?? defaults.environmentGeneratorBackendVersion ?? null,
    environmentManifestDigest: input.environmentManifestDigest ?? defaults.environmentManifestDigest ?? null,
    environmentArtifactDigest: input.environmentArtifactDigest ?? defaults.environmentArtifactDigest ?? null,
    ...(input.referenceFixtureId != null || defaults.referenceFixtureId != null ? { referenceFixtureId: input.referenceFixtureId ?? defaults.referenceFixtureId } : {}),
    ...(input.referenceBathymetryPatch != null || defaults.referenceBathymetryPatch != null ? { referenceBathymetryPatch: input.referenceBathymetryPatch === true || defaults.referenceBathymetryPatch === true } : {}),
    ...(input.bathymetryConditionedSynthetic != null || defaults.bathymetryConditionedSynthetic != null ? { bathymetryConditionedSynthetic: input.bathymetryConditionedSynthetic === true || defaults.bathymetryConditionedSynthetic === true } : {}),
    ...(input.sourceDataset != null || defaults.sourceDataset != null ? { sourceDataset: input.sourceDataset ?? defaults.sourceDataset } : {}),
    ...(input.fieldPolicy != null || defaults.fieldPolicy != null ? { fieldPolicy: input.fieldPolicy ?? defaults.fieldPolicy } : {}),
    ...(input.sourcePhase != null || defaults.sourcePhase != null ? { sourcePhase: input.sourcePhase ?? defaults.sourcePhase } : {}),
    ...(input.generatorBackend != null ? { generatorBackend: input.generatorBackend } : {}),
    ...(input.generatorVersion != null ? { generatorVersion: input.generatorVersion } : {}),
    ...(input.verticalStructureId != null ? { verticalStructureId: input.verticalStructureId } : {}),
    ...(input.verticalStructureVersion != null ? { verticalStructureVersion: input.verticalStructureVersion } : {}),
    ...(input.verticalProfileFamilies != null ? { verticalProfileFamilies: input.verticalProfileFamilies } : {}),
    ...(input.verticalStructure != null ? { verticalStructure: input.verticalStructure } : {}),
    ...(input.currentVerticalProfileContractVersion != null ? { currentVerticalProfileContractVersion: input.currentVerticalProfileContractVersion } : {}),
    ...(input.sourceDepthRegime != null ? { sourceDepthRegime: input.sourceDepthRegime } : {}),
    ...(input.mixedRegionalRegimeId != null ? { mixedRegionalRegimeId: input.mixedRegionalRegimeId } : {}),
    ...(input.barotropicControl != null ? { barotropicControl: input.barotropicControl === true } : {}),
    ...(input.rendererOwnsVerticalStructure != null ? { rendererOwnsVerticalStructure: input.rendererOwnsVerticalStructure === true } : {}),
    ...(input.displayChangesVerticalStructure != null ? { displayChangesVerticalStructure: input.displayChangesVerticalStructure === true } : {}),
    adapterVersion: input.adapterVersion ?? defaults.adapterVersion ?? null,
    equation: input.equation ?? null,
    references: Array.isArray(input.references) ? input.references : [],
    warnings,
    synthetic: sourceTier === 'scientificallyConstrainedSynthetic' || input.synthetic === true,
    checkedInFixture: sourceTier === 'checkedInImportedFixture' || input.checkedInFixture === true,
    importedOceanModel: sourceTier === 'checkedInImportedFixture' || sourceTier === 'externalOperationalProduct' || input.importedOceanModel === true,
    manufacturedAnalytical: sourceTier === 'manufacturedAnalytical',
    scientificallyConstrainedSynthetic: sourceTier === 'scientificallyConstrainedSynthetic',
    seed,
    boundaryFlags: {
      rendererOwnsCurrent: false,
      displayLayerChangesCurrent: false,
      changesOfficialScoring: false,
      usesNewPlanner: false,
      usesWebGpu: false,
      usesRealHycom,
      usesRealMarineCopernicus,
      calibratedForecast,
      ...(input.boundaryFlags ?? {})
    }
  };
}

export function validateOceanCurrentSourceMetadata(metadata = {}) {
  const normalized = normalizeOceanCurrentSourceMetadata(metadata);
  const errors = [];
  const warnings = [...normalized.warnings];
  if (!OCEAN_CURRENT_SOURCE_TIERS.includes(normalized.sourceTier)) errors.push(`Unsupported sourceTier: ${normalized.sourceTier}.`);
  if (normalized.sourceTier === 'scientificallyConstrainedSynthetic') {
    const claimText = `${normalized.sourceLabel} ${(normalized.warnings ?? []).join(' ')}`;
    if (!/Scientifically constrained synthetic current field/i.test(claimText)) errors.push('Synthetic current source must use the required scientifically constrained synthetic wording.');
    if (!/Not a calibrated ocean forecast/i.test(claimText)) errors.push('Synthetic current source must state that it is not a calibrated ocean forecast.');
    if (!/Not real HYCOM or Marine Copernicus data/i.test(claimText)) errors.push('Synthetic current source must state that it is not real HYCOM or Marine Copernicus data.');
    if (normalized.calibratedForecast || normalized.usesRealHycom || normalized.usesRealMarineCopernicus) errors.push('Synthetic current source cannot claim calibrated HYCOM/Copernicus data.');
  }
  if (normalized.sourceTier === 'manufacturedAnalytical' && !/manufactured/i.test(normalized.equationFamily)) warnings.push('Manufactured analytical source should identify its equation family.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, metadata: normalized };
}

export function currentSourceClaimBoundary(metadata = {}) {
  const normalized = normalizeOceanCurrentSourceMetadata(metadata);
  return {
    sourceTier: normalized.sourceTier,
    sourceLabel: normalized.sourceLabel,
    requiredSyntheticWarning: normalized.sourceTier === 'scientificallyConstrainedSynthetic' ? OCEAN_CURRENT_REQUIRED_SYNTHETIC_WARNING : null,
    usesRealHycom: normalized.usesRealHycom === true,
    usesRealMarineCopernicus: normalized.usesRealMarineCopernicus === true,
    calibratedForecast: normalized.calibratedForecast === true,
    publicClaimSafe: normalized.sourceTier !== 'scientificallyConstrainedSynthetic' || (!normalized.usesRealHycom && !normalized.usesRealMarineCopernicus && !normalized.calibratedForecast),
    warnings: [...(normalized.warnings ?? [])]
  };
}

function normalizeSourceTier(value) {
  const text = String(value ?? '').trim();
  if (OCEAN_CURRENT_SOURCE_TIERS.includes(text)) return text;
  if (text === 'synthetic') return 'scientificallyConstrainedSynthetic';
  if (text === 'manufactured') return 'manufacturedAnalytical';
  if (text === 'importedOceanModel' || text === 'checkedInFixture') return 'checkedInImportedFixture';
  if (text === 'operationalProduct') return 'externalOperationalProduct';
  return 'scientificallyConstrainedSynthetic';
}

function tierFromSourceType(sourceType) {
  if (sourceType === 'manufactured' || sourceType === 'manufacturedAnalytical') return 'manufacturedAnalytical';
  if (sourceType === 'checkedInFixture' || sourceType === 'importedOceanModel') return 'checkedInImportedFixture';
  if (sourceType === 'externalOperationalProduct') return 'externalOperationalProduct';
  return 'scientificallyConstrainedSynthetic';
}

function sourceTypeFromTier(sourceTier) {
  if (sourceTier === 'manufacturedAnalytical') return 'manufactured';
  if (sourceTier === 'checkedInImportedFixture') return 'checkedInFixture';
  if (sourceTier === 'externalOperationalProduct') return 'externalOperationalProduct';
  return 'synthetic';
}

function labelForTier(sourceTier) {
  if (sourceTier === 'manufacturedAnalytical') return 'Manufactured analytical current benchmark';
  if (sourceTier === 'checkedInImportedFixture') return 'Checked-in imported ocean-model current fixture';
  if (sourceTier === 'externalOperationalProduct') return 'External operational ocean current product';
  return 'Scientifically constrained synthetic current field';
}

function normalizeTemporalBoundaryMode(value) {
  return String(value ?? '').trim() === 'periodic' ? 'periodic' : 'bounded';
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
