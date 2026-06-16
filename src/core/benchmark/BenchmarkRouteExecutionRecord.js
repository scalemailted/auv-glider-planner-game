import {
  BENCHMARK_ATTEMPT_SOURCE_IDS,
  BENCHMARK_EXECUTION_STATUS_IDS,
  normalizeBenchmarkAttemptSource,
  normalizeBenchmarkExecutionStatus
} from './BenchmarkEpisodeContract.js';
import { benchmarkModeById } from './BenchmarkModeContract.js';

export const BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION = 'benchmark-route-execution-record-p1';

export function createRouteExecutionRecord(options = {}) {
  const validation = createRouteValidationSummary(options.validation ?? options);
  const metrics = createRouteExecutionMetrics(options.metrics ?? options.result ?? options);
  const segments = Array.isArray(options.segments)
    ? options.segments.map((segment, index) => createRouteSegmentRecord({ segmentIndex: index, ...segment }))
    : deriveSegmentsFromPlan(options.plan);
  return {
    type: 'anchor.benchmark.route-execution',
    version: BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION,
    benchmarkMode: benchmarkModeById(options.benchmarkMode ?? options.benchmarkModeConfig?.benchmarkMode).id,
    episodeId: stringOrNull(options.episodeId),
    attemptId: stringOrNull(options.attemptId),
    attemptSource: normalizeBenchmarkAttemptSource(options.attemptSource),
    routeSourceLabel: String(options.routeSourceLabel ?? routeSourceLabel(options.attemptSource)),
    fairnessLabel: String(options.fairnessLabel ?? options.benchmarkModeConfig?.fairnessLabel ?? 'Unknown fairness'),
    levelId: stringOrNull(options.levelId ?? options.level?.levelId),
    missionId: stringOrNull(options.missionId ?? options.mission?.missionId ?? options.mission?.id),
    planId: stringOrNull(options.planId ?? options.plan?.planId ?? options.plan?.id ?? options.plan?.meta?.planId),
    resultId: stringOrNull(options.resultId ?? options.result?.resultId ?? options.result?.id),
    agentCount: integerOrZero(options.agentCount ?? options.mission?.agents?.length ?? options.plan?.agentPlans?.length),
    waypointCount: integerOrZero(options.waypointCount ?? countWaypoints(options.plan)),
    segmentCount: integerOrZero(options.segmentCount ?? segments.length),
    validation,
    segments,
    metrics,
    diagnostics: plainObject(options.diagnostics),
    exportRefs: plainObject(options.exportRefs),
    notes: normalizeStringList(options.notes)
  };
}

export function createRouteSegmentRecord(options = {}) {
  return {
    segmentIndex: integerOrZero(options.segmentIndex ?? options.index),
    agentId: stringOrNull(options.agentId),
    from: normalizePoint(options.from),
    to: normalizePoint(options.to ?? options.target),
    startTime: finiteOrNull(options.startTime ?? options.t0),
    endTime: finiteOrNull(options.endTime ?? options.t1 ?? options.estimatedArrivalTime ?? options.t),
    distance: finiteOrNull(options.distance ?? options.segmentDistance),
    energy: finiteOrNull(options.energy ?? options.segmentEnergy),
    currentAssist: finiteOrNull(options.currentAssist),
    crossCurrent: finiteOrNull(options.crossCurrent),
    status: normalizeBenchmarkExecutionStatus(options.status ?? 'notStarted'),
    warnings: normalizeStringList(options.warnings)
  };
}

export function createRouteValidationSummary(options = {}) {
  const hardFailures = normalizeStringList(options.hardFailures ?? options.errors);
  const warnings = normalizeStringList(options.warnings);
  const executable = Boolean(options.executable ?? options.ok ?? (hardFailures.length === 0 && options.status !== 'invalidPlan'));
  return {
    status: normalizeBenchmarkExecutionStatus(options.status ?? (executable ? 'executable' : 'invalidPlan')),
    executable,
    hardFailures,
    warnings,
    invalidWaypointCount: integerOrZero(options.invalidWaypointCount ?? countIssueMatches(hardFailures, /waypoint|coordinate|outside/i)),
    blockedSegmentCount: integerOrZero(options.blockedSegmentCount ?? countIssueMatches(hardFailures, /blocked|terrain|navigable/i)),
    overDurationCount: integerOrZero(options.overDurationCount ?? countIssueMatches(warnings, /duration|time limit|mission time/i)),
    fuelFailureCount: integerOrZero(options.fuelFailureCount ?? countIssueMatches(hardFailures, /fuel|battery|energy/i)),
    terrainFailureCount: integerOrZero(options.terrainFailureCount ?? countIssueMatches(hardFailures, /terrain|shore|land|navigable/i)),
    startFailureCount: integerOrZero(options.startFailureCount ?? countIssueMatches(hardFailures, /start|deployment/i))
  };
}

export function createRouteExecutionMetrics(options = {}) {
  const summary = options.summary ?? options.scoreSummary ?? options;
  const risk = options.risk ?? options.hazards ?? {};
  const routeQuality = options.routeQuality ?? {};
  return {
    finalScore: finiteOrNull(summary.finalScore ?? options.finalScore),
    sampleScore: finiteOrNull(summary.sampleScore ?? summary.realizedSampleScore ?? options.sampleScore),
    scienceValue: finiteOrNull(summary.scienceValue ?? summary.expectedSampleScore ?? summary.expectedValue ?? options.scienceValue),
    energyUsed: finiteOrNull(summary.energyUsed ?? options.energyUsed),
    elapsedTime: finiteOrNull(summary.elapsedTime ?? summary.finalTime ?? options.elapsedTime),
    hazardsHit: finiteOrNull(summary.hazardsHit ?? risk.hazardsHit ?? risk.mobileHazardsHit ?? options.hazardsHit),
    duplicateSamples: finiteOrNull(summary.duplicateSamples ?? options.duplicateSamples),
    completedWaypoints: finiteOrNull(summary.completedWaypoints ?? options.completedWaypoints),
    missedWaypoints: finiteOrNull(summary.missedWaypoints ?? options.missedWaypoints),
    forecastRegret: finiteOrNull(summary.forecastRegret ?? summary.expectedValueRegret ?? options.regret?.forecastRegret ?? options.forecastRegret),
    routeLength: finiteOrNull(summary.routeLength ?? routeQuality.overall?.routeLength ?? options.routeLength),
    averageCurrentAssist: finiteOrNull(summary.averageCurrentAssist ?? routeQuality.overall?.averageCurrentAssist ?? options.averageCurrentAssist),
    averageCrossCurrent: finiteOrNull(summary.averageCrossCurrent ?? routeQuality.overall?.averageCrossCurrent ?? options.averageCrossCurrent),
    surfacingCount: finiteOrNull(summary.surfacingCount ?? options.surfaceUpdate?.segmentsApplied ?? options.surfacingCount),
    objectiveCompletion: finiteOrNull(summary.objectiveCompletion ?? options.objectiveCompletion),
    resultStatus: stringOrNull(summary.resultStatus ?? options.resultStatus ?? options.status)
  };
}

export function validateRouteExecutionRecord(record = {}) {
  const errors = [];
  if (record?.type !== 'anchor.benchmark.route-execution') errors.push('Route execution record type must be anchor.benchmark.route-execution.');
  if (record?.version !== BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION) errors.push(`Route execution record version must be ${BENCHMARK_ROUTE_EXECUTION_RECORD_VERSION}.`);
  if (!BENCHMARK_ATTEMPT_SOURCE_IDS.includes(record?.attemptSource)) errors.push(`Unknown attemptSource: ${record?.attemptSource ?? 'missing'}`);
  if (!record?.validation || typeof record.validation !== 'object') errors.push('Route execution record needs a validation object.');
  if (record?.validation && !BENCHMARK_EXECUTION_STATUS_IDS.includes(record.validation.status)) errors.push(`Unknown validation status: ${record.validation.status}`);
  if (!record?.metrics || typeof record.metrics !== 'object') errors.push('Route execution record needs a metrics object.');
  if (!Array.isArray(record?.segments)) errors.push('Route execution record segments must be an array.');
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}

export function summarizeRouteExecutionRecord(record = {}) {
  const metrics = record.metrics ?? {};
  const validation = record.validation ?? {};
  return {
    benchmarkMode: record.benchmarkMode ?? null,
    attemptSource: record.attemptSource ?? null,
    routeSourceLabel: record.routeSourceLabel ?? null,
    fairnessLabel: record.fairnessLabel ?? null,
    finalScore: metrics.finalScore ?? null,
    sampleScore: metrics.sampleScore ?? null,
    energyUsed: metrics.energyUsed ?? null,
    hazardsHit: metrics.hazardsHit ?? null,
    duplicateSamples: metrics.duplicateSamples ?? null,
    completedWaypoints: metrics.completedWaypoints ?? null,
    missedWaypoints: metrics.missedWaypoints ?? null,
    waypointCount: record.waypointCount ?? 0,
    segmentCount: record.segmentCount ?? 0,
    executable: Boolean(validation.executable),
    status: validation.status ?? 'notStarted'
  };
}

function deriveSegmentsFromPlan(plan) {
  const segments = [];
  for (const agentPlan of plan?.agentPlans ?? []) {
    let from = agentPlan.selectedStart ?? null;
    for (const [index, waypoint] of (agentPlan.waypoints ?? []).entries()) {
      segments.push(createRouteSegmentRecord({
        segmentIndex: segments.length,
        agentId: agentPlan.agentId,
        from,
        to: waypoint,
        endTime: waypoint.estimatedArrivalTime ?? waypoint.t,
        distance: waypoint.segmentDistance ?? waypoint.distance,
        energy: waypoint.segmentEnergy ?? waypoint.consumedFuel,
        currentAssist: waypoint.currentAssist,
        crossCurrent: waypoint.crossCurrent,
        status: waypoint.validity?.valid === false ? 'invalidPlan' : 'executable',
        warnings: waypoint.warnings
      }));
      from = waypoint;
      if (index > 500) break;
    }
  }
  return segments;
}

function routeSourceLabel(source) {
  return {
    manualPlayer: 'Manual Player Plan',
    greedyPlanner: 'Greedy Planner',
    importedSolver: 'Imported Solver Plan',
    externalSolver: 'External Solver Plan',
    oraclePlanner: 'Oracle Planner Reference',
    benchmarkPlaceholder: 'Benchmark Placeholder'
  }[normalizeBenchmarkAttemptSource(source)] ?? 'Benchmark Attempt';
}

function countWaypoints(plan) {
  return (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
}

function countIssueMatches(values, pattern) {
  return normalizeStringList(values).filter((value) => pattern.test(value)).length;
}

function normalizePoint(point) {
  if (!point || typeof point !== 'object') return null;
  return {
    x: finiteOrNull(point.x),
    y: finiteOrNull(point.y)
  };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : null;
}

function integerOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function normalizeStringList(values) {
  return Array.isArray(values) ? values.map((value) => String(value ?? '').trim()).filter(Boolean) : [];
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? cloneJson(value) : {};
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}
