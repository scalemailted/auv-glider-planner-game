import { missionObjectiveById, normalizeMissionObjectiveId } from '../benchmark/MissionObjectiveTaxonomy.js';
import { normalizeHeadlessVisibilityTier } from './HeadlessSchemaContract.js';
import { createHeadlessFieldDescriptor } from './HeadlessFieldSchema.js';

export const HEADLESS_MISSION_SCHEMA_VERSION = 'headless-mission-schema-h0';

export function createHeadlessMissionConfig(options = {}) {
  const mission = options.mission ?? options;
  const world = createHeadlessWorldConfig(options.world ?? mission.world ?? {});
  const gliders = normalizeArray(options.gliders ?? mission.gliders ?? mission.agents).map(createHeadlessGliderConfig);
  const objectives = normalizeArray(options.objectives ?? mission.objectives).map(createHeadlessObjectiveConfig);
  const informationAccessTier = normalizeHeadlessVisibilityTier(options.informationAccessTier ?? mission.informationAccessTier ?? mission.visibilityTier ?? 'publicScenario');
  return compactObject({
    type: 'anchor.headless.mission-config',
    version: HEADLESS_MISSION_SCHEMA_VERSION,
    missionId: stringOrNull(options.missionId ?? mission.missionId ?? mission.id) ?? 'headless-mission',
    scenarioId: stringOrNull(options.scenarioId ?? mission.scenarioId ?? mission.levelId ?? mission.instanceId),
    seed: options.seed ?? mission.seed ?? mission.meta?.seed ?? null,
    benchmarkMode: options.benchmarkMode ?? mission.benchmarkMode ?? mission.meta?.benchmarkMetadata?.benchmarkMode ?? null,
    informationAccessTier,
    fairnessLabel: options.fairnessLabel ?? mission.fairnessLabel ?? mission.meta?.benchmarkMetadata?.fairnessLabel ?? null,
    world,
    gliders,
    objectives,
    allowedFields: normalizeStringList(options.allowedFields ?? mission.allowedFields),
    hiddenFields: normalizeStringList(options.hiddenFields ?? mission.hiddenFields),
    visibleFields: normalizeStringList(options.visibleFields ?? mission.visibleFields),
    planningRules: cloneJson(options.planningRules ?? mission.planningRules ?? mission.rules ?? {}),
    scoringRules: cloneJson(options.scoringRules ?? mission.scoringRules ?? mission.scoring ?? {}),
    exportPolicy: cloneJson(options.exportPolicy ?? { includeHiddenTruth: informationAccessTier === 'hiddenTruth' || informationAccessTier === 'oracle' || informationAccessTier === 'debugAll' }),
    notes: normalizeStringList(options.notes)
  });
}

export function createHeadlessWorldConfig(options = {}) {
  const grid = options.grid ?? options.world?.grid ?? options;
  const time = options.time ?? options.world?.time ?? {};
  const width = Math.max(0, Math.round(finiteNumber(options.width ?? grid.width, 0)));
  const height = Math.max(0, Math.round(finiteNumber(options.height ?? grid.height, 0)));
  const fieldDescriptors = normalizeArray(options.fieldDescriptors).map(createHeadlessFieldDescriptor);
  return compactObject({
    width,
    height,
    depthLayers: normalizeStringList(options.depthLayers ?? ['surface']),
    depthLayerModel: options.depthLayerModel ?? null,
    waterColumnConfig: cloneJson(options.waterColumnConfig ?? null),
    dx: finiteNumber(options.dx, 1),
    dy: finiteNumber(options.dy, 1),
    dz: finiteNumber(options.dz, 1),
    timeStepSeconds: finiteNumber(options.timeStepSeconds ?? time.dt ?? time.timeStepSeconds, 1),
    durationSeconds: finiteNumber(options.durationSeconds ?? time.duration ?? time.durationSeconds, 0),
    coordinateFrame: options.coordinateFrame ?? 'grid-cell-center-top-left',
    masks: cloneJson(options.masks ?? {}),
    fieldDescriptors
  });
}

export function createHeadlessGliderConfig(options = {}) {
  const start = options.start ?? options.selectedStart ?? {};
  return compactObject({
    id: stringOrNull(options.id ?? options.agentId) ?? 'glider-1',
    label: stringOrNull(options.label ?? options.name) ?? 'Glider 1',
    start: pointOrNull(start) ?? { x: 0, y: 0, z: 0 },
    speed: finiteNumber(options.speed ?? options.maxSpeed, 1),
    energyBudget: finiteNumber(options.energyBudget ?? options.battery ?? options.maxBattery, 100),
    sensorSuite: normalizeStringList(options.sensorSuite ?? options.sensors ?? ['science-sampler']),
    diveProfile: cloneJson(options.diveProfile ?? { mode: 'surface-2d' }),
    diveProfileId: options.diveProfileId ?? options.diveProfile?.id ?? options.diveProfile?.profileId ?? null,
    communicationPolicy: cloneJson(options.communicationPolicy ?? { surfacingRequired: false }),
    constraints: cloneJson(options.constraints ?? {})
  });
}

export function createHeadlessObjectiveConfig(options = {}) {
  const objectiveId = normalizeMissionObjectiveId(options.id ?? options.objectiveId ?? options.type ?? 'reconnaissanceSurvey');
  const taxonomy = missionObjectiveById(objectiveId);
  return compactObject({
    id: taxonomy.id,
    label: options.label ?? taxonomy.label,
    type: options.type ?? taxonomy.id,
    description: options.description ?? taxonomy.description ?? 'Headless mission objective.',
    authority: options.authority ?? 'missionManagerOrFixedBenchmark',
    targetFields: normalizeStringList(options.targetFields),
    successCriteria: cloneJson(options.successCriteria ?? {}),
    notes: normalizeStringList(options.notes)
  });
}

export function validateHeadlessMissionConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (!config || typeof config !== 'object') errors.push('Headless mission config must be an object.');
  if (config?.type !== 'anchor.headless.mission-config') errors.push(`Expected type anchor.headless.mission-config, got ${config?.type ?? 'missing'}.`);
  if (!config?.missionId) errors.push('missionId is required.');
  if (!Number.isFinite(Number(config?.world?.width)) || Number(config.world.width) <= 0) errors.push('world.width must be positive.');
  if (!Number.isFinite(Number(config?.world?.height)) || Number(config.world.height) <= 0) errors.push('world.height must be positive.');
  if (!Array.isArray(config?.gliders)) errors.push('gliders must be an array.');
  if (!Array.isArray(config?.objectives)) errors.push('objectives must be an array.');
  if ((config?.hiddenFields ?? []).length && !['hiddenTruth', 'oracle', 'debugAll'].includes(config?.informationAccessTier)) {
    warnings.push('hiddenFields are present but informationAccessTier is not hiddenTruth, oracle, or debugAll.');
  }
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

export function headlessMissionConfigSummary(config = {}) {
  const normalized = createHeadlessMissionConfig(config);
  const validation = validateHeadlessMissionConfig(normalized);
  return {
    missionId: normalized.missionId,
    scenarioId: normalized.scenarioId,
    benchmarkMode: normalized.benchmarkMode,
    informationAccessTier: normalized.informationAccessTier,
    width: normalized.world.width,
    height: normalized.world.height,
    gliderCount: normalized.gliders.length,
    objectiveCount: normalized.objectives.length,
    visibleFieldCount: normalized.visibleFields.length,
    hiddenFieldCount: normalized.hiddenFields.length,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

function normalizeArray(values = []) {
  return Array.isArray(values) ? values : values ? [values] : [];
}

function normalizeStringList(values = []) {
  return normalizeArray(values).map((value) => String(value)).filter(Boolean);
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function pointOrNull(point) {
  if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) return null;
  return compactObject({ x: Number(point.x), y: Number(point.y), z: Number(point.z ?? 0), timeSeconds: point.timeSeconds ?? null });
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
}

function compactObject(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined));
}