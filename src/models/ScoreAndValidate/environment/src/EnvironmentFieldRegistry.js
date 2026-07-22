const EnvironmentUtil = require('./EnvironmentUtil.js')
const ENVIRONMENT_FIELD_REGISTRY_VERSION = 'environment-field-registry-env-pkg-r1';

 function createEnvironmentFieldRegistry(options = {}) {
  const entries = [
    ...normalizeEntries(options.entries),
    ...entriesFromBathymetry(options.bathymetry, options.fieldRoles?.bathymetry),
    ...entriesFromCurrents(options.currentFields, options.fieldRoles?.currentFields),
    ...entriesFromScalars(options.scalarFields, options.fieldRoles?.scalarFields)
  ];
  const registry = {
    type: 'anchor.environment.field-registry',
    version: ENVIRONMENT_FIELD_REGISTRY_VERSION,
    entries: sortEntries(entries)
  };
  return { ...registry, registryDigest: options.registryDigest ?? environmentFieldRegistryDigest(registry) };
}

 function normalizeEnvironmentFieldRegistry(value = {}) {
  if (value?.type === 'anchor.environment.field-registry' && Array.isArray(value.entries)) {
    return {
      ...value,
      entries: sortEntries(normalizeEntries(value.entries)),
      registryDigest: value.registryDigest ?? environmentFieldRegistryDigest(value)
    };
  }
  return createEnvironmentFieldRegistry(value);
}

 function validateEnvironmentFieldRegistry(value = {}) {
  const registry = normalizeEnvironmentFieldRegistry(value);
  const errors = [];
  const warnings = [];
  const ids = new Set();
  for (const entry of registry.entries) {
    if (!entry.id) errors.push('Environment field registry entries require id.');
    if (ids.has(entry.id)) errors.push(`Duplicate environment field id: ${entry.id}.`);
    ids.add(entry.id);
    if (!['bathymetry', 'current', 'scalar'].includes(entry.fieldType)) errors.push(`Field ${entry.id} has unsupported fieldType ${entry.fieldType}.`);
    if (!entry.artifactDigest) warnings.push(`Field ${entry.id} has no artifact digest.`);
    if (entry.containsHiddenTruth === true && entry.publicVisibility !== 'hidden') errors.push(`Hidden-truth field ${entry.id} must use publicVisibility=hidden.`);
    if (entry.epistemicRole === 'derivedPriority' && entry.derivedFromObservation !== true && entry.derivedFromForecast !== true) warnings.push(`Priority field ${entry.id} should declare a derivation source.`);
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, registry };
}

 function environmentFieldRegistrySummary(value = {}) {
  const registry = normalizeEnvironmentFieldRegistry(value);
  const roleCounts = {};
  for (const entry of registry.entries) roleCounts[entry.epistemicRole] = (roleCounts[entry.epistemicRole] ?? 0) + 1;
  return {
    type: 'anchor.environment.field-registry-summary',
    version: ENVIRONMENT_FIELD_REGISTRY_VERSION,
    fieldCount: registry.entries.length,
    roleCounts,
    hiddenTruthFieldCount: registry.entries.filter((entry) => entry.containsHiddenTruth === true).length,
    publicFieldCount: registry.entries.filter((entry) => entry.publicVisibility !== 'hidden').length,
    registryDigest: registry.registryDigest ?? environmentFieldRegistryDigest(registry)
  };
}

 function environmentFieldRegistryDigest(value = {}) {
  const copy = { ...value, entries: normalizeEntries(value.entries ?? []) };
  delete copy.registryDigest;
  return EnvironmentUtil.stableDigest(copy);
}

 function fieldRoleSummary(registryOrEntries = {}) {
  const entries = Array.isArray(registryOrEntries) ? registryOrEntries : normalizeEnvironmentFieldRegistry(registryOrEntries).entries;
  return entries.map((entry) => ({
    id: entry.id,
    fieldType: entry.fieldType,
    variableId: entry.variableId,
    epistemicRole: entry.epistemicRole,
    publicVisibility: entry.publicVisibility,
    containsHiddenTruth: entry.containsHiddenTruth === true,
    artifactDigest: entry.artifactDigest ?? null
  }));
}

function entriesFromBathymetry(bathymetry = null, role = null) {
  if (!bathymetry) return [];
  return [normalizeEntry({
    id: 'bathymetry.bottomDepthMeters',
    fieldType: 'bathymetry',
    variableId: 'bottomDepthMeters',
    units: 'meters positive down',
    epistemicRole: role?.epistemicRole ?? 'publicReference',
    publicVisibility: role?.publicVisibility ?? 'publicScenario',
    artifactDigest: EnvironmentUtil.fieldDigestOf(bathymetry),
    sourceTier: bathymetry.sourceMetadata?.sourceTier ?? 'scientificallyConstrainedSynthetic',
    sourceId: bathymetry.sourceMetadata?.sourceId ?? bathymetry.id ?? null,
    temporalBoundaryMode: 'static',
    containsHiddenTruth: false,
    tags: ['bottom-boundary', 'mask-authority']
  })];
}

function entriesFromCurrents(fields = [], roles = {}) {
  return normalizeArray(fields).map((field, index) => {
    const id = field.id ?? field.sourceMetadata?.fieldId ?? `current-${index + 1}`;
    const role = roleFor(roles, id);
    const source = field.sourceMetadata ?? {};
    const hidden = source.hiddenTruthIncluded === true || role.containsHiddenTruth === true || role.publicVisibility === 'hidden';
    return normalizeEntry({
      id,
      fieldType: 'current',
      variableId: role.variableId ?? 'oceanCurrentVector',
      units: 'meters per second east/north/down',
      epistemicRole: role.epistemicRole ?? source.epistemicRole ?? 'truth',
      publicVisibility: hidden ? 'hidden' : role.publicVisibility ?? source.visibilityTier ?? 'publicScenario',
      artifactDigest: EnvironmentUtil.fieldDigestOf(field),
      sourceTier: source.sourceTier ?? null,
      sourceId: source.sourceId ?? source.fieldId ?? id,
      temporalBoundaryMode: field.temporalBoundaryMode ?? source.temporalBoundaryMode ?? 'bounded',
      containsHiddenTruth: hidden,
      derivedFromObservation: source.derivedFromObservation === true || role.derivedFromObservation === true,
      derivedFromForecast: source.derivedFromForecast === true || role.derivedFromForecast === true,
      tags: ['current', ...(role.tags ?? [])]
    });
  });
}

function entriesFromScalars(fields = [], roles = {}) {
  return normalizeArray(fields).map((field, index) => {
    const id = field.id ?? field.sourceMetadata?.fieldId ?? `scalar-${index + 1}`;
    const role = roleFor(roles, id);
    const source = field.sourceMetadata ?? {};
    const hidden = source.hiddenTruthIncluded === true || role.containsHiddenTruth === true || role.publicVisibility === 'hidden';
    const priority = role.epistemicRole === 'derivedPriority' || source.processKind === 'priority';
    return normalizeEntry({
      id,
      fieldType: 'scalar',
      variableId: role.variableId ?? source.variableId ?? 'scalarValue',
      units: source.units ?? field.units?.scalarValue ?? 'normalized science value',
      epistemicRole: role.epistemicRole ?? source.epistemicRole ?? (priority ? 'derivedPriority' : 'truth'),
      publicVisibility: hidden ? 'hidden' : role.publicVisibility ?? source.visibilityTier ?? 'publicScenario',
      artifactDigest: EnvironmentUtil.fieldDigestOf(field),
      sourceTier: source.sourceTier ?? null,
      sourceId: source.sourceId ?? source.fieldId ?? id,
      temporalBoundaryMode: source.temporalBoundaryMode ?? 'bounded',
      containsHiddenTruth: hidden,
      derivedFromObservation: source.derivedFromObservation === true || role.derivedFromObservation === true,
      derivedFromForecast: source.derivedFromForecast === true || role.derivedFromForecast === true,
      tags: ['scalar', ...(priority ? ['priority'] : []), ...(role.tags ?? [])]
    });
  });
}

function normalizeEntries(entries = []) {
  return normalizeArray(entries).map(normalizeEntry);
}

function normalizeEntry(entry = {}) {
  return {
    id: String(entry.id ?? entry.fieldId ?? ''),
    fieldType: String(entry.fieldType ?? 'scalar'),
    variableId: String(entry.variableId ?? entry.variable ?? 'value'),
    units: entry.units ?? null,
    epistemicRole: String(entry.epistemicRole ?? entry.role ?? 'truth'),
    publicVisibility: String(entry.publicVisibility ?? entry.visibilityTier ?? 'publicScenario'),
    artifactDigest: entry.artifactDigest ?? entry.digest ?? null,
    sourceTier: entry.sourceTier ?? null,
    sourceId: entry.sourceId ?? null,
    temporalBoundaryMode: entry.temporalBoundaryMode ?? 'bounded',
    containsHiddenTruth: entry.containsHiddenTruth === true || entry.hiddenTruthIncluded === true,
    derivedFromObservation: entry.derivedFromObservation === true,
    derivedFromForecast: entry.derivedFromForecast === true,
    tags: Array.isArray(entry.tags) ? [...entry.tags] : []
  };
}

function sortEntries(entries = []) {
  return entries.filter((entry) => entry.id).sort((a, b) => a.id.localeCompare(b.id));
}

function roleFor(roles = {}, id) {
  if (Array.isArray(roles)) return roles.find((role) => role.id === id || role.fieldId === id) ?? {};
  return roles?.[id] ?? {};
}

function normalizeArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

module.exports = {createEnvironmentFieldRegistry, normalizeEnvironmentFieldRegistry, validateEnvironmentFieldRegistry, environmentFieldRegistrySummary, environmentFieldRegistryDigest, fieldRoleSummary}