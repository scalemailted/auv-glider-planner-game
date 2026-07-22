const HeadlessSchemaContract = require('./HeadlessSchemaContract.js')
const HEADLESS_EPISODE_SCHEMA_VERSION = 'headless-episode-schema-h0';

 function createHeadlessEpisode(options = {}) {
  const episode = options.episode ?? options;
  return compactObject({
    type: 'anchor.headless.episode',
    version: HEADLESS_EPISODE_SCHEMA_VERSION,
    episodeId: stringOrNull(episode.episodeId ?? episode.id) ?? 'headless-episode',
    benchmarkMode: episode.benchmarkMode ?? null,
    runtimeTarget: episode.runtimeTarget ?? 'browser',
    informationAccessTier: HeadlessSchemaContract.normalizeHeadlessVisibilityTier(episode.informationAccessTier ?? 'publicScenario'),
    fairnessLabel: episode.fairnessLabel ?? null,
    seed: episode.seed ?? null,
    steps: normalizeArray(episode.steps).map(createHeadlessStepRecord),
    observations: normalizeArray(episode.observations).map(createHeadlessObservationRecord),
    actions: normalizeArray(episode.actions).map(createHeadlessActionRecord),
    rewards: normalizeArray(episode.rewards).map(createHeadlessRewardRecord),
    surfacingEvents: cloneJson(normalizeArray(episode.surfacingEvents)),
    objectives: cloneJson(normalizeArray(episode.objectives)),
    diagnostics: cloneJson(episode.diagnostics ?? {}),
    s: cloneJson(normalizeArray(episode.s)),
    notes: normalizeStringList(episode.notes)
  });
}

 function createHeadlessStepRecord(options = {}) {
  return compactObject({
    t: finiteNumber(options.t ?? options.stepIndex, 0),
    timeSeconds: finiteNumber(options.timeSeconds ?? options.time, finiteNumber(options.t, 0)),
    gliderId: stringOrNull(options.gliderId ?? options.agentId),
    stateRef: options.stateRef ?? null,
    observationRef: options.observationRef ?? null,
    actionRef: options.actionRef ?? null,
    rewardRef: options.rewardRef ?? null,
    done: Boolean(options.done),
    info: createHeadlessInfoRecord(options.info ?? {})
  });
}

 function createHeadlessObservationRecord(options = {}) {
  return compactObject({
    id: stringOrNull(options.id ?? options.observationId) ?? null,
    type: options.type ?? 'fieldSample',
    timeSeconds: finiteNumber(options.timeSeconds ?? options.time, 0),
    gliderId: stringOrNull(options.gliderId ?? options.agentId),
    position: pointOrNull(options.position ?? options),
    fieldId: options.fieldId ?? options.field ?? null,
    value: options.value ?? null,
    sensor: options.sensor ?? null,
    visibilityTier: HeadlessSchemaContract.normalizeHeadlessVisibilityTier(options.visibilityTier ?? 'publicScenario'),
    payload: cloneJson(options.payload ?? null)
  });
}

 function createHeadlessActionRecord(options = {}) {
  return compactObject({
    id: stringOrNull(options.id ?? options.actionId) ?? null,
    type: options.type ?? options.actionType ?? 'waypointTarget',
    timeSeconds: finiteNumber(options.timeSeconds ?? options.time, 0),
    gliderId: stringOrNull(options.gliderId ?? options.agentId),
    target: pointOrNull(options.target ?? options.waypoint ?? options),
    objectiveId: options.objectiveId ?? null,
    policyId: options.policyId ?? null,
    payload: cloneJson(options.payload ?? null),
    note: options.note ?? null
  });
}

 function createHeadlessRewardRecord(options = {}) {
  return compactObject({
    id: stringOrNull(options.id ?? options.rewardId) ?? null,
    timeSeconds: finiteNumber(options.timeSeconds ?? options.time, 0),
    gliderId: stringOrNull(options.gliderId ?? options.agentId),
    value: finiteOrNull(options.value ?? options.reward),
    components: cloneJson(options.components ?? {}),
    educationalBenchmarkSpecific: options.educationalBenchmarkSpecific ?? true,
    note: options.note ?? 'Reward records are optional benchmark vocabulary for future RL/MARL alignment; H0 does not implement learning.'
  });
}

 function createHeadlessInfoRecord(options = {}) {
  return compactObject({
    phase: options.phase ?? null,
    objectiveId: options.objectiveId ?? null,
    benchmarkMode: options.benchmarkMode ?? null,
    diagnostics: cloneJson(options.diagnostics ?? {}),
    warnings: normalizeStringList(options.warnings)
  });
}

 function validateHeadlessEpisode(episode = {}) {
  const errors = [];
  const warnings = [];
  if (!episode || typeof episode !== 'object') errors.push('Headless episode must be an object.');
  if (episode?.type !== 'anchor.headless.episode') errors.push(`Expected type anchor.headless.episode, got ${episode?.type ?? 'missing'}.`);
  if (!episode?.episodeId) errors.push('episodeId is required.');
  for (const key of ['steps', 'observations', 'actions', 'rewards', 'surfacingEvents', 'objectives']) {
    if (!Array.isArray(episode?.[key])) errors.push(`${key} must be an array.`);
  }
  if (episode?.notes?.some?.((note) => /implements\s+(marl|rl|new planner)/i.test(note))) warnings.push('Episode notes should not claim H0 implements planner or learning behavior.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function headlessEpisodeSummary(episodeInput = {}) {
  const episode = createHeadlessEpisode(episodeInput);
  const validation = validateHeadlessEpisode(episode);
  return {
    episodeId: episode.episodeId,
    benchmarkMode: episode.benchmarkMode,
    runtimeTarget: episode.runtimeTarget,
    informationAccessTier: episode.informationAccessTier,
    stepCount: episode.steps.length,
    observationCount: episode.observations.length,
    actionCount: episode.actions.length,
    rewardCount: episode.rewards.length,
    surfacingEventCount: episode.surfacingEvents.length,
    objectiveCount: episode.objectives.length,
    valid: validation.valid,
    warnings: validation.warnings
  };
}

function normalizeArray(values = []) { return Array.isArray(values) ? values : values ? [values] : []; }
function normalizeStringList(values = []) { return normalizeArray(values).map((value) => String(value)).filter(Boolean); }
function finiteNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function finiteOrNull(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function stringOrNull(value) { return typeof value === 'string' && value.trim() ? value : null; }
function pointOrNull(point) { return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)) ? compactObject({ x: Number(point.x), y: Number(point.y), z: Number(point.z ?? 0) }) : null; }
function cloneJson(value) { if (value === undefined || value === null) return value ?? null; try { return JSON.parse(JSON.stringify(value)); } catch { return value; } }
function compactObject(value = {}) { return Object.fromEntries(Object.entries(value).filter(([_key, entry]) => entry !== undefined)); }
module.exports = {createHeadlessEpisode, createHeadlessStepRecord, createHeadlessObservationRecord, createHeadlessActionRecord, createHeadlessRewardRecord, createHeadlessInfoRecord, validateHeadlessEpisode, headlessEpisodeSummary}