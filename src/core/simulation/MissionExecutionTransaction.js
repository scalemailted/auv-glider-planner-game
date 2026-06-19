export const MISSION_EXECUTION_TRANSACTION_VERSION = 'three-r1-1d';

const STAGE_ORDER = [
  'executeRequested',
  'planningToolCancelled',
  'planSnapshotBuilt',
  'planValidated',
  'launchPayloadBuilt',
  'sceneTransitionRequested',
  'simulationSceneInitialized',
  'engineInitialized',
  'rendererMounted',
  'firstStepCompleted',
  'running',
  'terminal',
  'resultBuilt',
  'debriefRequested',
  'failed'
];

const STAGE_INDEX = new Map(STAGE_ORDER.map((stage, index) => [stage, index]));

export function createMissionExecutionTransaction(options = {}) {
  const now = options.requestedAt ?? new Date().toISOString();
  const transaction = {
    type: 'anchor.simulation.execution-transaction',
    version: MISSION_EXECUTION_TRANSACTION_VERSION,
    transactionId: options.transactionId ?? createTransactionId(options),
    missionId: options.missionId ?? options.mission?.missionId ?? null,
    levelId: options.levelId ?? options.level?.levelId ?? null,
    episodeId: options.episodeId ?? options.plan?.meta?.benchmarkMetadata?.episodeId ?? options.plan?.meta?.adaptiveBenchmark?.episodeId ?? null,
    seed: options.seed ?? options.level?.meta?.seed ?? options.mission?.rules?.stochasticSeed ?? null,
    requestedAt: now,
    currentStage: null,
    stages: [],
    planSummary: options.planSummary ?? null,
    validationSummary: options.validationSummary ?? null,
    launchPayloadSummary: options.launchPayloadSummary ?? null,
    engineSummary: options.engineSummary ?? null,
    failed: false,
    failureStage: null,
    failureReason: null,
    boundaryFlags: {
      rendererOwnsExecution: false,
      rendererOwnsSimulationState: false,
      rendererOwnsScoring: false,
      usesCanonicalPlan: true
    }
  };
  return advanceMissionExecutionTransaction(transaction, 'executeRequested', {
    source: options.source ?? 'visibleExecuteControl'
  });
}

export function advanceMissionExecutionTransaction(transaction, stage, details = {}) {
  if (!transaction || typeof transaction !== 'object') {
    throw new Error('Mission execution transaction must be an object.');
  }
  if (!STAGE_INDEX.has(stage)) {
    throw new Error(`Unknown mission execution stage: ${stage}`);
  }
  const lastStage = transaction.currentStage;
  const lastIndex = STAGE_INDEX.get(lastStage) ?? -1;
  const nextIndex = STAGE_INDEX.get(stage);
  if (stage !== 'failed' && nextIndex < lastIndex) {
    throw new Error(`Mission execution stage cannot move backward from ${lastStage} to ${stage}.`);
  }
  const entry = {
    stage,
    at: details.at ?? new Date().toISOString(),
    details: publicClone(details)
  };
  delete entry.details.at;
  transaction.currentStage = stage;
  transaction.stages.push(entry);
  if (details.planSummary) transaction.planSummary = publicClone(details.planSummary);
  if (details.validationSummary) transaction.validationSummary = publicClone(details.validationSummary);
  if (details.launchPayloadSummary) transaction.launchPayloadSummary = publicClone(details.launchPayloadSummary);
  if (details.engineSummary) transaction.engineSummary = publicClone(details.engineSummary);
  return transaction;
}

export function failMissionExecutionTransaction(transaction, stage, reason, details = {}) {
  const failed = advanceMissionExecutionTransaction(transaction, 'failed', {
    ...details,
    failedStage: stage,
    reason: String(reason ?? 'unknown')
  });
  failed.failed = true;
  failed.failureStage = stage ?? failed.currentStage ?? null;
  failed.failureReason = String(reason ?? 'unknown');
  return failed;
}

export function completeMissionExecutionTransaction(transaction, details = {}) {
  return advanceMissionExecutionTransaction(transaction, 'terminal', details);
}

export function validateMissionExecutionTransaction(transaction = {}) {
  const errors = [];
  const warnings = [];
  if (transaction.type !== 'anchor.simulation.execution-transaction') errors.push('Execution transaction type must be anchor.simulation.execution-transaction.');
  if (transaction.version !== MISSION_EXECUTION_TRANSACTION_VERSION) errors.push(`Execution transaction version must be ${MISSION_EXECUTION_TRANSACTION_VERSION}.`);
  if (!transaction.transactionId) errors.push('Execution transaction needs a transactionId.');
  if (!Array.isArray(transaction.stages) || transaction.stages.length === 0) errors.push('Execution transaction needs at least one stage.');
  let previous = -1;
  for (const entry of transaction.stages ?? []) {
    if (!STAGE_INDEX.has(entry.stage)) {
      errors.push(`Unknown execution stage "${entry.stage}".`);
      continue;
    }
    const index = STAGE_INDEX.get(entry.stage);
    if (entry.stage !== 'failed' && index < previous) errors.push(`Execution stage order moved backward at "${entry.stage}".`);
    if (entry.stage !== 'failed') previous = index;
    if (!isPublicSafe(entry.details)) errors.push(`Execution stage "${entry.stage}" contains a non-public-safe detail.`);
  }
  const flags = transaction.boundaryFlags ?? {};
  if (flags.rendererOwnsExecution !== false) errors.push('Renderer must not own execution.');
  if (flags.rendererOwnsSimulationState !== false) errors.push('Renderer must not own simulation state.');
  if (flags.rendererOwnsScoring !== false) errors.push('Renderer must not own scoring.');
  if (flags.usesCanonicalPlan !== true) errors.push('Execution must use the canonical plan.');
  if (transaction.failed && !transaction.failureReason) warnings.push('Failed transaction should include a failure reason.');
  return { valid: errors.length === 0, errors, warnings, summary: missionExecutionTransactionSummary(transaction) };
}

export function missionExecutionTransactionSummary(transaction = {}) {
  return {
    type: transaction.type ?? 'anchor.simulation.execution-transaction',
    version: transaction.version ?? MISSION_EXECUTION_TRANSACTION_VERSION,
    transactionId: transaction.transactionId ?? null,
    currentStage: transaction.currentStage ?? null,
    completedStages: (transaction.stages ?? []).map((entry) => entry.stage),
    missionId: transaction.missionId ?? null,
    levelId: transaction.levelId ?? null,
    episodeId: transaction.episodeId ?? null,
    seed: transaction.seed ?? null,
    requestedAt: transaction.requestedAt ?? null,
    planSummary: publicClone(transaction.planSummary ?? null),
    validationSummary: publicClone(transaction.validationSummary ?? null),
    launchPayloadSummary: publicClone(transaction.launchPayloadSummary ?? null),
    engineSummary: publicClone(transaction.engineSummary ?? null),
    failed: transaction.failed === true,
    failureStage: transaction.failureStage ?? null,
    failureReason: transaction.failureReason ?? null,
    boundaryFlags: {
      rendererOwnsExecution: false,
      rendererOwnsSimulationState: false,
      rendererOwnsScoring: false,
      usesCanonicalPlan: true
    }
  };
}

function createTransactionId(options = {}) {
  const seed = [
    options.levelId ?? options.level?.levelId ?? 'level',
    options.missionId ?? options.mission?.missionId ?? 'mission',
    options.seed ?? options.level?.meta?.seed ?? 'seed',
    Date.now().toString(36),
    Math.floor(Math.random() * 1e6).toString(36)
  ].join('-');
  return `exec-${seed.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

function publicClone(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value, (_key, nested) => {
    if (typeof nested === 'function') return undefined;
    if (nested && typeof nested === 'object') {
      const ctor = nested.constructor?.name;
      if (ctor && !['Object', 'Array'].includes(ctor)) return undefined;
    }
    return nested;
  }));
}

function isPublicSafe(value, seen = new Set()) {
  if (value === null || value === undefined) return true;
  if (['string', 'number', 'boolean'].includes(typeof value)) return Number.isFinite(value) || typeof value !== 'number';
  if (typeof value === 'function' || typeof value === 'symbol') return false;
  if (typeof value !== 'object') return false;
  if (seen.has(value)) return false;
  seen.add(value);
  const ctor = value.constructor?.name;
  if (ctor && !['Object', 'Array'].includes(ctor)) return false;
  return Object.values(value).every((nested) => isPublicSafe(nested, seen));
}
