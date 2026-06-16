import { missionObjectiveById, normalizeMissionObjectiveId } from './MissionObjectiveTaxonomy.js';

export const ADAPTIVE_LEG_RECORD_VERSION = 'adaptive-leg-record-p8';

const LEG_STATUS_VALUES = new Set([
  'planned',
  'executed',
  'surfaced',
  'diagnosed',
  'nextObjectiveRecommended',
  'accepted',
  'skipped',
  'failed'
]);

export function createAdaptiveLegRecord(options = {}) {
  const context = options.runtimeContext ?? options.context ?? {};
  const objectiveId = normalizeMissionObjectiveId(
    options.objectiveId
      ?? options.activeObjectiveId
      ?? options.objective?.id
      ?? context.activeObjective?.id
      ?? context.adaptiveManagerState?.currentObjectiveId
      ?? 'reconnaissanceSurvey'
  );
  const objective = missionObjectiveById(objectiveId);
  const result = options.result ?? {};
  const routeExecutionRecord = cloneJson(options.routeExecutionRecord ?? null);
  const runRecord = cloneJson(options.runRecord ?? null);
  return {
    type: 'anchor.benchmark.adaptive-leg',
    version: ADAPTIVE_LEG_RECORD_VERSION,
    episodeId: stringOrNull(options.episodeId ?? context.episodeId ?? result.benchmarkMetadata?.episodeId) ?? 'adaptive-preview-episode',
    benchmarkMode: 'adaptiveBenchmark',
    legIndex: Math.max(0, Math.round(finiteNumber(options.legIndex ?? context.activeLegIndex ?? result.adaptiveBenchmark?.activeLegIndex, 0))),
    objectiveId: objective.id,
    objectiveLabel: options.objectiveLabel ?? objective.label,
    objectiveAuthority: 'missionManager',
    routeAuthority: 'playerOrSolver',
    planId: stringOrNull(options.planId ?? options.plan?.planId ?? options.plan?.id ?? result.planId),
    resultId: stringOrNull(options.resultId ?? result.resultId ?? result.id),
    runRecord,
    routeExecutionRecord,
    evidence: compactObject(options.evidence ?? null),
    surfacingEvent: compactObject(options.surfacingEvent ?? null),
    diagnosis: compactObject(options.diagnosis ?? null),
    objectiveTransition: compactObject(options.objectiveTransition ?? null),
    nextLegHandoff: compactObject(options.nextLegHandoff ?? null),
    status: normalizeLegStatus(options.status ?? inferLegStatus(options)),
    metrics: normalizeLegMetrics(options.metrics ?? routeExecutionRecord?.metrics ?? runRecord?.metrics ?? runRecord?.summary ?? result.summary ?? {}),
    warnings: normalizeStringList(options.warnings),
    notes: normalizeStringList(options.notes),
    createdAt: options.createdAt ?? new Date().toISOString(),
    updatedAt: options.updatedAt ?? new Date().toISOString()
  };
}

export function createAdaptiveLegResultRecord(options = {}) {
  const result = options.result ?? {};
  return createAdaptiveLegRecord({
    ...options,
    result,
    status: options.status ?? 'executed',
    metrics: options.metrics ?? result.summary ?? {},
    notes: [
      'Adaptive leg record built from an existing simulation result. Scores are copied, not recomputed.',
      ...normalizeStringList(options.notes)
    ]
  });
}

export function validateAdaptiveLegRecord(record = {}) {
  const errors = [];
  const warnings = [];
  if (!record || typeof record !== 'object') errors.push('Adaptive leg record must be an object.');
  if (record?.type !== 'anchor.benchmark.adaptive-leg') errors.push(`Expected type anchor.benchmark.adaptive-leg, got ${record?.type ?? 'missing'}.`);
  if (!stringOrNull(record?.episodeId)) errors.push('episodeId is required.');
  if (record?.benchmarkMode !== 'adaptiveBenchmark') errors.push('benchmarkMode must be adaptiveBenchmark.');
  if (!Number.isFinite(Number(record?.legIndex))) errors.push('legIndex must be finite.');
  if (!stringOrNull(record?.objectiveId)) warnings.push('objectiveId is missing; this leg is partial.');
  if (record?.objectiveAuthority !== 'missionManager') errors.push('objectiveAuthority must be missionManager.');
  if (record?.routeAuthority !== 'playerOrSolver') errors.push('routeAuthority must be playerOrSolver.');
  if (!LEG_STATUS_VALUES.has(record?.status)) warnings.push(`Unknown adaptive leg status: ${record?.status ?? 'missing'}.`);
  if (record?.nextLegHandoff?.waypoints || record?.nextLegHandoff?.route || record?.nextLegHandoff?.agentPlans) warnings.push('Next-leg handoff should not include generated routes or waypoints.');
  return { status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', valid: errors.length === 0, errors, warnings };
}

export function adaptiveLegRecordSummary(recordInput = {}) {
  const record = recordInput?.type === 'anchor.benchmark.adaptive-leg' ? recordInput : createAdaptiveLegRecord(recordInput);
  const validation = validateAdaptiveLegRecord(record);
  return {
    type: record.type,
    version: record.version,
    episodeId: record.episodeId,
    benchmarkMode: record.benchmarkMode,
    legIndex: record.legIndex,
    objectiveId: record.objectiveId,
    objectiveLabel: record.objectiveLabel,
    status: record.status,
    planId: record.planId,
    resultId: record.resultId,
    hasRunRecord: Boolean(record.runRecord),
    hasRouteExecutionRecord: Boolean(record.routeExecutionRecord),
    hasEvidence: Boolean(record.evidence),
    hasSurfacingDecision: Boolean(record.diagnosis || record.objectiveTransition),
    recommendedObjectiveId: record.nextLegHandoff?.recommendedObjectiveId ?? record.objectiveTransition?.toObjectiveId ?? null,
    metrics: cloneJson(record.metrics),
    valid: validation.valid,
    warnings: [...record.warnings, ...validation.warnings]
  };
}

function inferLegStatus(options = {}) {
  if (options.nextLegHandoff) return 'nextObjectiveRecommended';
  if (options.objectiveTransition || options.diagnosis) return 'diagnosed';
  if (options.surfacingEvent || options.evidence) return 'surfaced';
  if (options.result || options.runRecord || options.routeExecutionRecord) return 'executed';
  return 'planned';
}

function normalizeLegStatus(value) {
  const status = String(value ?? 'planned');
  return LEG_STATUS_VALUES.has(status) ? status : 'planned';
}

export function normalizeLegMetrics(metrics = {}) {
  const source = metrics ?? {};
  return {
    score: finiteOrNull(source.score ?? source.finalScore ?? source.totalScore),
    finalScore: finiteOrNull(source.finalScore ?? source.score ?? source.totalScore),
    roiCollected: finiteOrNull(source.roiCollected ?? source.sampleScore ?? source.roiScore ?? source.realizedSampleScore),
    energyUsed: finiteOrNull(source.energyUsed ?? source.energy ?? source.totalEnergyUsed),
    distanceTraveled: finiteOrNull(source.distanceTraveled ?? source.totalDistance ?? source.distance),
    collisions: finiteOrNull(source.collisions ?? source.collisionCount),
    nearMisses: finiteOrNull(source.nearMisses ?? source.nearMissCount),
    hazards: finiteOrNull(source.hazards ?? source.hazardsHit ?? source.mobileHazardsHit),
    duplicateSamples: finiteOrNull(source.duplicateSamples),
    returnSuccess: source.returnSuccess == null ? null : Boolean(source.returnSuccess),
    completed: source.completed == null ? null : Boolean(source.completed),
    steps: finiteOrNull(source.steps ?? source.stepCount),
    simTime: finiteOrNull(source.simTime ?? source.elapsedTime ?? source.time)
  };
}

function compactObject(value, depth = 0) {
  if (value == null) return null;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 120).map((entry) => compactObject(entry, depth + 1));
  if (typeof value !== 'object') return value;
  const omitted = new Set(['truth', 'truthField', 'truthFields', 'hiddenTruth', 'hiddenOcean', 'forecastMembers', 'frames', 'trajectories', 'debugTrace', 'simulationTrace', 'rawResult', 'rawLevel', 'level', 'mission', 'plan']);
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (omitted.has(key)) continue;
    if (Array.isArray(entry) && entry.length > 120) {
      out[key] = entry.slice(0, 120).map((item) => compactObject(item, depth + 1));
      out[`${key}Truncated`] = entry.length - 120;
    } else {
      out[key] = compactObject(entry, depth + 1);
    }
  }
  return out;
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
