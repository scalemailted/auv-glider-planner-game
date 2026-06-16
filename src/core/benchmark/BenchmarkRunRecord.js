import {
  benchmarkModeById,
  createBenchmarkModeConfig,
  informationAccessTierById,
  validateBenchmarkModeConfig,
  worldModelTierById
} from './BenchmarkModeContract.js';

export const BENCHMARK_RUN_RECORD_VERSION = 'benchmark-run-record-p0';

export function createBenchmarkRunRecord(options = {}) {
  const hasBenchmarkMode = options.benchmarkMode != null || options.mode != null;
  const config = hasBenchmarkMode
    ? createBenchmarkModeConfig(options)
    : {
        benchmarkMode: null,
        worldModelTier: options.worldModelTier ?? null,
        informationAccessTier: options.informationAccessTier ?? null,
        objectiveAuthority: options.objectiveAuthority ?? null,
        routeAuthority: options.routeAuthority ?? null,
        fairnessLabel: options.fairnessLabel ?? null
      };
  return {
    type: 'anchor.benchmark.run',
    version: BENCHMARK_RUN_RECORD_VERSION,
    benchmarkMode: config.benchmarkMode,
    worldModelTier: config.worldModelTier,
    informationAccessTier: config.informationAccessTier,
    objectiveAuthority: config.objectiveAuthority,
    routeAuthority: config.routeAuthority,
    fairnessLabel: config.fairnessLabel,
    scenarioId: stringOrNull(options.scenarioId),
    seed: stringOrNull(options.seed),
    startedAt: options.startedAt ?? new Date().toISOString(),
    completedAt: options.completedAt ?? null,
    objectives: normalizeRecords(options.objectives, createBenchmarkObjectiveRecord),
    observations: normalizeRecords(options.observations, createBenchmarkObservationRecord),
    actions: normalizeRecords(options.actions, createBenchmarkActionRecord),
    rewards: normalizeRecords(options.rewards, createBenchmarkRewardRecord),
    diagnostics: plainObject(options.diagnostics),
    exports: plainObject(options.exports),
    notes: normalizeNotes(options.notes)
  };
}

export function createBenchmarkEpisodeTrace(options = {}) {
  const run = createBenchmarkRunRecord(options);
  return {
    type: 'anchor.benchmark.episode-trace',
    version: BENCHMARK_RUN_RECORD_VERSION,
    benchmarkMode: run.benchmarkMode,
    scenarioId: run.scenarioId,
    seed: run.seed,
    phases: Array.isArray(options.phases) ? options.phases.map((phase) => ({ ...phase })) : [],
    observations: run.observations,
    actions: run.actions,
    rewards: run.rewards,
    objectives: run.objectives,
    diagnostics: run.diagnostics
  };
}

export function createBenchmarkObservationRecord(options = {}) {
  const observedValue = finiteOrNull(options.observedValue);
  const expectedValue = finiteOrNull(options.expectedValue);
  return {
    time: finiteOrZero(options.time),
    gliderId: stringOrNull(options.gliderId),
    position: normalizePosition(options.position),
    sensorType: stringOrNull(options.sensorType),
    observedValue,
    expectedValue,
    innovation: options.innovation == null && observedValue != null && expectedValue != null
      ? round(observedValue - expectedValue)
      : finiteOrNull(options.innovation),
    surprise: finiteOrNull(options.surprise),
    beliefUpdateId: stringOrNull(options.beliefUpdateId)
  };
}

export function createBenchmarkActionRecord(options = {}) {
  return {
    time: finiteOrZero(options.time),
    gliderId: stringOrNull(options.gliderId),
    actionType: String(options.actionType ?? 'unspecified'),
    target: normalizePosition(options.target),
    source: String(options.source ?? 'unknown'),
    allowedInformation: informationAccessTierById(options.allowedInformation ?? options.informationAccessTier).id,
    actionValue: finiteOrNull(options.actionValue),
    routeId: stringOrNull(options.routeId)
  };
}

export function createBenchmarkRewardRecord(options = {}) {
  return {
    time: finiteOrZero(options.time),
    rewardType: String(options.rewardType ?? 'evaluationPlaceholder'),
    value: finiteOrZero(options.value),
    components: plainObject(options.components),
    note: String(options.note ?? '')
  };
}

export function createBenchmarkObjectiveRecord(options = {}) {
  return {
    time: finiteOrZero(options.time),
    objectiveId: String(options.objectiveId ?? 'objective-placeholder'),
    objectiveType: String(options.objectiveType ?? 'reconnaissanceSurvey'),
    authority: String(options.authority ?? 'fixed'),
    rationale: String(options.rationale ?? ''),
    status: String(options.status ?? 'active')
  };
}

export function validateBenchmarkRunRecord(record = {}) {
  const errors = [];
  if (record?.type !== 'anchor.benchmark.run') errors.push('Run record type must be anchor.benchmark.run.');
  if (record?.version !== BENCHMARK_RUN_RECORD_VERSION) errors.push(`Run record version must be ${BENCHMARK_RUN_RECORD_VERSION}.`);
  const modeConfig = {
    benchmarkMode: record?.benchmarkMode,
    worldModelTier: record?.worldModelTier,
    informationAccessTier: record?.informationAccessTier,
    objectiveAuthority: record?.objectiveAuthority,
    routeAuthority: record?.routeAuthority
  };
  const modeValidation = validateBenchmarkModeConfig(modeConfig);
  errors.push(...modeValidation.errors);
  for (const key of ['objectives', 'observations', 'actions', 'rewards']) {
    if (!Array.isArray(record?.[key])) errors.push(`${key} must be an array.`);
  }
  return {
    status: errors.length ? 'FAIL' : modeValidation.warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings: modeValidation.warnings
  };
}

export function summarizeBenchmarkRunRecord(record = {}) {
  const mode = benchmarkModeById(record.benchmarkMode);
  return {
    benchmarkMode: record.benchmarkMode,
    label: mode.label,
    fairnessLabel: record.fairnessLabel ?? informationAccessTierById(record.informationAccessTier).fairnessLabel,
    worldModel: worldModelTierById(record.worldModelTier).label,
    objectiveCount: Array.isArray(record.objectives) ? record.objectives.length : 0,
    observationCount: Array.isArray(record.observations) ? record.observations.length : 0,
    actionCount: Array.isArray(record.actions) ? record.actions.length : 0,
    rewardCount: Array.isArray(record.rewards) ? record.rewards.length : 0,
    totalReward: Array.isArray(record.rewards)
      ? round(record.rewards.reduce((sum, reward) => sum + finiteOrZero(reward.value), 0))
      : 0,
    completed: Boolean(record.completedAt)
  };
}

function normalizeRecords(records, factory) {
  return Array.isArray(records) ? records.map((record) => factory(record)) : [];
}

function normalizePosition(position) {
  if (!position || typeof position !== 'object') return null;
  return {
    x: finiteOrZero(position.x),
    y: finiteOrZero(position.y)
  };
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

function normalizeNotes(notes) {
  return Array.isArray(notes) ? notes.map((note) => String(note ?? '')).filter(Boolean) : [];
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : null;
}

function finiteOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : 0;
}

function round(value) {
  return Math.round(Number(value) * 1_000_000) / 1_000_000;
}
