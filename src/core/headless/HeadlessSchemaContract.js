export const HEADLESS_SCHEMA_CONTRACT_VERSION = 'headless-schema-contract-h0';

export const HEADLESS_ARTIFACT_TYPES = Object.freeze([
  'anchor.headless.bundle',
  'anchor.headless.manifest',
  'anchor.headless.mission-config',
  'anchor.headless.field-pack',
  'anchor.headless.trajectory',
  'anchor.headless.observations',
  'anchor.headless.belief-state',
  'anchor.headless.priority-state',
  'anchor.headless.benchmark-episode',
  'anchor.headless.replay',
  'anchor.headless.score-report',
  'anchor.headless.colab-notebook-config'
]);

export const HEADLESS_DATA_VISIBILITY_TIERS = Object.freeze([
  'hiddenTruth',
  'oracle',
  'forecastOnly',
  'beliefOnly',
  'publicScenario',
  'debugAll'
]);

export const HEADLESS_FIELD_IDS = Object.freeze([
  'T_hiddenTruth',
  'E_forecast',
  'mu_belief',
  'U_uncertainty',
  'P_unknown',
  'A_global',
  'Q_glider',
  'F_u',
  'F_v',
  'F_w',
  'constraintMask',
  'hazard',
  'staleness',
  'sampleValue',
  'eventIntensity',
  'trueRoi',
  'beliefRoi',
  'boundaryStrength',
  'forecastValidation',
  'hiddenEventProbability'
]);

export const HEADLESS_ENTITY_TYPES = Object.freeze([
  'world',
  'field',
  'glider',
  'observation',
  'action',
  'objective',
  'surfacingEvent',
  'episode',
  'benchmarkRecord',
  'solverPacket',
  'result'
]);

export const HEADLESS_EPISODE_PHASES = Object.freeze([
  'configured',
  'planned',
  'executing',
  'surfacing',
  'diagnosing',
  'adapting',
  'complete',
  'aborted'
]);

export const HEADLESS_RUNTIME_TARGETS = Object.freeze([
  'browser',
  'nodeHeadless',
  'pythonOceanBox',
  'colabNotebook'
]);

const ARTIFACT_ALIASES = new Map([
  ['bundle', 'anchor.headless.bundle'],
  ['manifest', 'anchor.headless.manifest'],
  ['missionConfig', 'anchor.headless.mission-config'],
  ['mission-config', 'anchor.headless.mission-config'],
  ['fieldPack', 'anchor.headless.field-pack'],
  ['field-pack', 'anchor.headless.field-pack'],
  ['episode', 'anchor.headless.benchmark-episode'],
  ['benchmarkEpisode', 'anchor.headless.benchmark-episode'],
  ['scoreReport', 'anchor.headless.score-report']
]);

const VISIBILITY_ALIASES = new Map([
  ['truth', 'hiddenTruth'],
  ['hidden', 'hiddenTruth'],
  ['oracleTruth', 'oracle'],
  ['forecast', 'forecastOnly'],
  ['belief', 'beliefOnly'],
  ['public', 'publicScenario'],
  ['debug', 'debugAll']
]);

const FIELD_ALIASES = new Map([
  ['truth', 'T_hiddenTruth'],
  ['hiddenTruth', 'T_hiddenTruth'],
  ['forecast', 'E_forecast'],
  ['expected', 'E_forecast'],
  ['belief', 'mu_belief'],
  ['uncertainty', 'U_uncertainty'],
  ['unknown', 'P_unknown'],
  ['hiddenEvent', 'P_unknown'],
  ['priority', 'A_global'],
  ['actionValue', 'Q_glider'],
  ['u', 'F_u'],
  ['v', 'F_v'],
  ['w', 'F_w'],
  ['flowU', 'F_u'],
  ['flowV', 'F_v'],
  ['terrain', 'constraintMask'],
  ['mask', 'constraintMask'],
  ['roi', 'trueRoi'],
  ['roiTruth', 'trueRoi']
]);

export function normalizeHeadlessArtifactType(id) {
  if (HEADLESS_ARTIFACT_TYPES.includes(id)) return id;
  return ARTIFACT_ALIASES.get(id) ?? 'anchor.headless.bundle';
}

export function normalizeHeadlessVisibilityTier(id) {
  if (HEADLESS_DATA_VISIBILITY_TIERS.includes(id)) return id;
  return VISIBILITY_ALIASES.get(id) ?? 'publicScenario';
}

export function normalizeHeadlessFieldId(id) {
  if (HEADLESS_FIELD_IDS.includes(id)) return id;
  return FIELD_ALIASES.get(id) ?? String(id ?? 'unknownField');
}

export function createHeadlessSchemaDescriptor(options = {}) {
  const artifactTypes = uniqueStrings(options.artifactTypes ?? HEADLESS_ARTIFACT_TYPES);
  const visibilityTiers = uniqueStrings(options.visibilityTiers ?? HEADLESS_DATA_VISIBILITY_TIERS);
  const fieldIds = uniqueStrings(options.fieldIds ?? HEADLESS_FIELD_IDS);
  const runtimeTargets = uniqueStrings(options.runtimeTargets ?? HEADLESS_RUNTIME_TARGETS);
  const entityTypes = uniqueStrings(options.entityTypes ?? HEADLESS_ENTITY_TYPES);
  return compactObject({
    type: 'anchor.headless.schema-descriptor',
    version: HEADLESS_SCHEMA_CONTRACT_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    runtimeTargets,
    artifactTypes,
    visibilityTiers,
    fieldIds,
    entityTypes,
    episodePhases: uniqueStrings(options.episodePhases ?? HEADLESS_EPISODE_PHASES),
    boundary: {
      implementsPythonPackage: false,
      implementsNewSimulator: false,
      implementsNewPlanner: false,
      implementsMARL: false,
      note: 'H0 defines schema alignment contracts and audits only.'
    },
    notes: normalizeStringList(options.notes)
  });
}

export function validateHeadlessSchemaDescriptor(descriptor = {}) {
  const errors = [];
  const warnings = [];
  if (!descriptor || typeof descriptor !== 'object') errors.push('Headless schema descriptor must be an object.');
  if (descriptor?.type !== 'anchor.headless.schema-descriptor') errors.push(`Expected type anchor.headless.schema-descriptor, got ${descriptor?.type ?? 'missing'}.`);
  if (!descriptor?.version) errors.push('version is required.');
  for (const type of HEADLESS_ARTIFACT_TYPES) {
    if (!descriptor?.artifactTypes?.includes(type)) errors.push(`Missing headless artifact type ${type}.`);
  }
  for (const tier of HEADLESS_DATA_VISIBILITY_TIERS) {
    if (!descriptor?.visibilityTiers?.includes(tier)) errors.push(`Missing visibility tier ${tier}.`);
  }
  for (const target of HEADLESS_RUNTIME_TARGETS) {
    if (!descriptor?.runtimeTargets?.includes(target)) errors.push(`Missing runtime target ${target}.`);
  }
  if (descriptor?.boundary?.implementsPythonPackage) warnings.push('H0 descriptor must not claim a Python OceanBox package is implemented.');
  if (descriptor?.boundary?.implementsNewSimulator) warnings.push('H0 descriptor must not claim a new simulator is implemented.');
  if (descriptor?.boundary?.implementsNewPlanner) warnings.push('H0 descriptor must not claim a new planner is implemented.');
  if (descriptor?.boundary?.implementsMARL) warnings.push('H0 descriptor must not claim MARL/RL is implemented.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function headlessSchemaSummary(descriptor = createHeadlessSchemaDescriptor()) {
  const validation = validateHeadlessSchemaDescriptor(descriptor);
  return {
    version: descriptor.version,
    artifactTypeCount: descriptor.artifactTypes?.length ?? 0,
    fieldCount: descriptor.fieldIds?.length ?? 0,
    visibilityTierCount: descriptor.visibilityTiers?.length ?? 0,
    runtimeTargetCount: descriptor.runtimeTargets?.length ?? 0,
    h0Only: true,
    implementsPythonPackage: Boolean(descriptor.boundary?.implementsPythonPackage),
    implementsNewSimulator: Boolean(descriptor.boundary?.implementsNewSimulator),
    implementsNewPlanner: Boolean(descriptor.boundary?.implementsNewPlanner),
    implementsMARL: Boolean(descriptor.boundary?.implementsMARL),
    valid: validation.valid,
    warnings: validation.warnings
  };
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value)).filter(Boolean))];
}

function normalizeStringList(values = []) {
  return (Array.isArray(values) ? values : [values]).map((value) => String(value)).filter(Boolean);
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined));
}