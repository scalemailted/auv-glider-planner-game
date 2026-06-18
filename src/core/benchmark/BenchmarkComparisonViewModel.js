import { normalizeBenchmarkAttemptSource } from './BenchmarkEpisodeContract.js';
import { attemptSourceFromRouteSourceLabel, routeSourceLabelFromAttemptSource } from './BenchmarkAttemptSourceMapping.js';

export const BENCHMARK_COMPARISON_VIEW_MODEL_VERSION = 'benchmark-comparison-view-model-p3';

const METRIC_DEFINITIONS = [
  { id: 'finalScore', label: 'Final Score', direction: 'higherIsBetter', description: 'Existing final score from the simulator/debrief summary.', unit: 'pts', missingLabel: 'No score' },
  { id: 'sampleScore', label: 'Sample Score', direction: 'higherIsBetter', description: 'Existing sample or realized science score.', unit: 'pts', missingLabel: 'No sample score' },
  { id: 'scienceValue', label: 'Science Value', direction: 'higherIsBetter', description: 'Existing science-value estimate when available.', unit: 'pts', missingLabel: 'No science value' },
  { id: 'energyUsed', label: 'Energy Used', direction: 'lowerIsBetter', description: 'Energy consumed by the executed route.', unit: 'energy', missingLabel: 'No energy value' },
  { id: 'elapsedTime', label: 'Elapsed Time', direction: 'lowerIsBetter', description: 'Elapsed mission time for the attempt.', unit: 'time', missingLabel: 'No elapsed time' },
  { id: 'hazardsHit', label: 'Hazards Hit', direction: 'lowerIsBetter', description: 'Hazard contacts recorded by the existing simulation/debrief.', unit: 'count', missingLabel: 'No hazard count' },
  { id: 'duplicateSamples', label: 'Duplicate Samples', direction: 'lowerIsBetter', description: 'Duplicate or redundant samples recorded by the existing result.', unit: 'count', missingLabel: 'No duplicate count' },
  { id: 'completedWaypoints', label: 'Completed Waypoints', direction: 'higherIsBetter', description: 'Waypoints completed by the existing execution.', unit: 'count', missingLabel: 'No completion count' },
  { id: 'missedWaypoints', label: 'Missed Waypoints', direction: 'lowerIsBetter', description: 'Waypoints missed or left incomplete.', unit: 'count', missingLabel: 'No missed count' },
  { id: 'forecastRegret', label: 'Forecast Regret', direction: 'lowerIsBetter', description: 'Existing forecast regret or expected-value regret, when recorded.', unit: 'pts', missingLabel: 'No regret value' },
  { id: 'routeLength', label: 'Route Length', direction: 'lowerIsBetter', description: 'Existing route-length metric, when recorded.', unit: 'cells', missingLabel: 'No route length' },
  { id: 'averageCurrentAssist', label: 'Avg Current Assist', direction: 'higherIsBetter', description: 'Average current assistance from route-quality diagnostics.', unit: 'model', missingLabel: 'No assist value' },
  { id: 'averageCrossCurrent', label: 'Avg Cross Current', direction: 'lowerIsBetter', description: 'Average cross-current exposure from route-quality diagnostics.', unit: 'model', missingLabel: 'No cross-current value' },
  { id: 'objectiveCompletion', label: 'Objective Completion', direction: 'higherIsBetter', description: 'Existing objective completion fraction, when recorded.', unit: 'ratio', missingLabel: 'No completion value' },
  { id: 'missionCompositeScore', label: 'Shadow Outcome', direction: 'higherIsBetter', description: 'SCORE-R1 composite mission-outcome score when a compatible report is present.', unit: 'pts', missingLabel: 'No shadow score' },
  { id: 'missionScienceScore', label: 'Shadow Science', direction: 'higherIsBetter', description: 'SCORE-R1 science group score when present.', unit: 'pts', missingLabel: 'No science score' },
  { id: 'missionFeasibilityScore', label: 'Shadow Feasibility', direction: 'higherIsBetter', description: 'SCORE-R1 feasibility group score when present.', unit: 'pts', missingLabel: 'No feasibility score' },
  { id: 'missionEfficiencyScore', label: 'Shadow Efficiency', direction: 'higherIsBetter', description: 'SCORE-R1 efficiency group score when present.', unit: 'pts', missingLabel: 'No efficiency score' },
  { id: 'missionSafetyScore', label: 'Shadow Safety', direction: 'higherIsBetter', description: 'SCORE-R1 safety group score when present.', unit: 'pts', missingLabel: 'No safety score' },
  { id: 'missionScoreCoverage', label: 'Shadow Coverage', direction: 'higherIsBetter', description: 'SCORE-R1 data coverage fraction when present.', unit: 'ratio', missingLabel: 'No coverage' }
];

const METRIC_BY_ID = Object.fromEntries(METRIC_DEFINITIONS.map((definition) => [definition.id, definition]));

const STUDENT_SOURCE_LABELS = {
  manualPlayer: 'Manual Plan',
  greedyPlanner: 'Greedy Planner',
  importedSolver: 'Imported Solver',
  externalSolver: 'External Solver',
  oraclePlanner: 'Oracle Planner',
  benchmarkPlaceholder: 'Placeholder Attempt'
};

const FAIRNESS_LABELS = {
  oracleTruth: 'Oracle / Truth-Assisted',
  'Oracle truth': 'Oracle / Truth-Assisted',
  'Oracle Truth': 'Oracle / Truth-Assisted',
  'Truth-assisted': 'Oracle / Truth-Assisted',
  'Truth-Assisted': 'Oracle / Truth-Assisted',
  forecastOnly: 'Forecast-Only',
  'Forecast-only': 'Forecast-Only',
  'Forecast-Only': 'Forecast-Only',
  beliefOnly: 'Belief-Only',
  'Belief-only': 'Belief-Only',
  'Belief-Only': 'Belief-Only',
  debugAll: 'Debug / All Layers',
  'Debug / All Layers': 'Debug / All Layers'
};

export function buildBenchmarkComparisonViewModel({
  attemptSet = null,
  activeAttempt = null,
  benchmarkModeConfig = null,
  episodeConfig = null,
  routeExecutionRecords = [],
  runRecords = []
} = {}) {
  const attempts = normalizeAttempts({ attemptSet, activeAttempt, routeExecutionRecords, runRecords });
  const rankings = Object.fromEntries(METRIC_DEFINITIONS.map((definition) => [definition.id, rankBenchmarkAttempts(attempts, definition.id)]));
  const bestAttemptByScore = rankings.finalScore?.[0] ?? null;
  const lowestEnergyAttempt = rankings.energyUsed?.[0] ?? null;
  const safestAttempt = rankings.hazardsHit?.[0] ?? null;
  const mostEfficientAttempt = chooseMostEfficientAttempt(attempts);
  const fairnessLabels = unique(attempts.map((attempt) => attempt.fairnessLabel).filter(Boolean));
  const warnings = [];
  const scoreProfileKeys = unique(attempts.map((attempt) => attempt.missionOutcome?.profileKey).filter(Boolean));
  if (scoreProfileKeys.length > 1) warnings.push('SCORE-R1 shadow scores use mismatched profiles or versions; do not rank them as fair peers.');
  if (!attempts.length) warnings.push('No benchmark attempts are available yet.');
  if (attempts.some((attempt) => Object.values(attempt.metrics ?? {}).every((value) => value == null))) {
    warnings.push('At least one attempt has no comparable metrics yet.');
  }
  const metricCards = METRIC_DEFINITIONS.map((definition) => buildMetricCard(definition, attempts, rankings[definition.id]));
  return {
    version: BENCHMARK_COMPARISON_VIEW_MODEL_VERSION,
    benchmarkMode: attemptSet?.benchmarkMode ?? benchmarkModeConfig?.benchmarkMode ?? episodeConfig?.benchmarkMode ?? 'plannerBenchmark',
    episodeId: attemptSet?.episodeId ?? episodeConfig?.episodeId ?? attempts[0]?.episodeId ?? null,
    fairnessLabel: fairnessLabels.length === 1 ? fairnessLabels[0] : fairnessLabels.length ? 'Mixed fairness labels' : 'No fairness label',
    attemptCount: attempts.length,
    attempts,
    metricCards,
    rankings,
    bestAttemptByScore,
    lowestEnergyAttempt,
    safestAttempt,
    mostEfficientAttempt,
    missionOutcomeComparison: buildMissionOutcomeComparison(attempts, scoreProfileKeys),
    warnings,
    explanation: 'Comparison metrics are normalized from existing results. P3 does not add a new planner or redesign scoring.'
  };
}

export function compareBenchmarkAttemptMetrics(attempts = []) {
  const normalized = normalizeAttempts({ attemptSet: { attempts } });
  const rankings = Object.fromEntries(METRIC_DEFINITIONS.map((definition) => [definition.id, rankBenchmarkAttempts(normalized, definition.id)]));
  return {
    attemptCount: normalized.length,
    rankings,
    bestAttemptByScore: rankings.finalScore?.[0] ?? null,
    lowestEnergyAttempt: rankings.energyUsed?.[0] ?? null,
    safestAttempt: rankings.hazardsHit?.[0] ?? null,
    mostEfficientAttempt: chooseMostEfficientAttempt(normalized)
  };
}

export function rankBenchmarkAttempts(attempts = [], metricId = 'finalScore') {
  const definition = METRIC_BY_ID[metricId];
  if (!definition) return [];
  const normalized = normalizeAttempts({ attemptSet: { attempts } });
  const rows = normalized
    .map((attempt) => ({
      attemptId: attempt.attemptId,
      attemptSource: attempt.attemptSource,
      attemptSourceLabel: attempt.attemptSourceLabel,
      routeSourceLabel: attempt.routeSourceLabel,
      fairnessLabel: attempt.fairnessLabel,
      metricId,
      value: finiteOrNull(attempt.metrics?.[metricId]),
      displayValue: displayMetric(attempt.metrics?.[metricId], definition)
    }))
    .filter((row) => row.value != null);
  if (!rows.length) return [];
  const multiplier = definition.direction === 'lowerIsBetter' ? 1 : -1;
  return rows
    .sort((a, b) => multiplier * (a.value - b.value))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function benchmarkMetricDefinitions() {
  return METRIC_DEFINITIONS.map((definition) => ({ ...definition }));
}

export function benchmarkComparisonSummary(viewModel = {}) {
  return {
    benchmarkMode: viewModel.benchmarkMode ?? 'plannerBenchmark',
    episodeId: viewModel.episodeId ?? null,
    attemptCount: viewModel.attemptCount ?? 0,
    fairnessLabel: viewModel.fairnessLabel ?? 'No fairness label',
    bestAttemptByScore: summarizeWinner(viewModel.bestAttemptByScore),
    lowestEnergyAttempt: summarizeWinner(viewModel.lowestEnergyAttempt),
    safestAttempt: summarizeWinner(viewModel.safestAttempt),
    mostEfficientAttempt: summarizeWinner(viewModel.mostEfficientAttempt),
    warnings: Array.isArray(viewModel.warnings) ? [...viewModel.warnings] : []
  };
}

function normalizeAttempts({ attemptSet = null, activeAttempt = null, routeExecutionRecords = [], runRecords = [] } = {}) {
  const rawAttempts = [];
  if (Array.isArray(attemptSet?.attempts)) rawAttempts.push(...attemptSet.attempts);
  if (activeAttempt) rawAttempts.push(activeAttempt);
  for (const record of Array.isArray(routeExecutionRecords) ? routeExecutionRecords : []) {
    if (!record) continue;
    rawAttempts.push({
      attemptId: record.attemptId ?? record.resultId ?? record.planId,
      episodeId: record.episodeId,
      benchmarkMode: record.benchmarkMode,
      attemptSource: record.attemptSource,
      routeSourceLabel: record.routeSourceLabel,
      fairnessLabel: record.fairnessLabel,
      planId: record.planId,
      resultId: record.resultId,
      status: record.validation?.status,
      routeExecutionRecord: record,
      metrics: record.metrics
    });
  }
  for (const runRecord of Array.isArray(runRecords) ? runRecords : []) {
    if (!runRecord) continue;
    rawAttempts.push({
      attemptId: runRecord.diagnostics?.attemptId ?? runRecord.diagnostics?.resultId,
      episodeId: runRecord.diagnostics?.episodeId,
      benchmarkMode: runRecord.benchmarkMode,
      attemptSource: runRecord.diagnostics?.attemptSource,
      routeSourceLabel: runRecord.diagnostics?.routeSourceLabel,
      fairnessLabel: runRecord.fairnessLabel,
      runRecord,
      metrics: runRecord.diagnostics?.routeExecutionSummary
    });
  }
  const byKey = new Map();
  rawAttempts.forEach((attempt, index) => {
    const normalized = normalizeAttempt(attempt, index);
    const key = mergeKeyForAttempt(byKey, normalized, index);
    byKey.set(key, { ...(byKey.get(key) ?? {}), ...normalized, metrics: { ...(byKey.get(key)?.metrics ?? {}), ...normalized.metrics } });
  });
  return [...byKey.values()];
}

function normalizeAttempt(attempt = {}, index = 0) {
  const routeRecord = attempt.routeExecutionRecord ?? null;
  const runRecord = attempt.runRecord ?? null;
  const routeLabel = attempt.routeSourceLabel ?? routeRecord?.routeSourceLabel ?? runRecord?.diagnostics?.routeSourceLabel ?? null;
  const source = normalizeBenchmarkAttemptSource(attempt.attemptSource ?? routeRecord?.attemptSource ?? runRecord?.diagnostics?.attemptSource ?? attemptSourceFromRouteSourceLabel(routeLabel));
  return {
    attemptId: String(attempt.attemptId ?? routeRecord?.attemptId ?? attempt.resultId ?? routeRecord?.resultId ?? `attempt-${index + 1}`),
    episodeId: attempt.episodeId ?? routeRecord?.episodeId ?? runRecord?.diagnostics?.episodeId ?? null,
    benchmarkMode: attempt.benchmarkMode ?? routeRecord?.benchmarkMode ?? runRecord?.benchmarkMode ?? 'plannerBenchmark',
    attemptSource: source,
    attemptSourceLabel: STUDENT_SOURCE_LABELS[source] ?? labelize(routeSourceLabelFromAttemptSource(source)),
    routeSourceLabel: STUDENT_SOURCE_LABELS[source] ?? labelize(routeLabel ?? routeSourceLabelFromAttemptSource(source)),
    rawRouteSourceLabel: routeLabel ?? routeSourceLabelFromAttemptSource(source),
    fairnessLabel: normalizeFairnessLabel(attempt.fairnessLabel ?? routeRecord?.fairnessLabel ?? runRecord?.fairnessLabel),
    planId: attempt.planId ?? routeRecord?.planId ?? null,
    resultId: attempt.resultId ?? routeRecord?.resultId ?? null,
    status: attempt.status ?? routeRecord?.validation?.status ?? 'notStarted',
    missionOutcome: normalizeMissionOutcomeForAttempt(attempt, routeRecord, runRecord),
    metrics: normalizeMetrics(attempt.metrics ?? routeRecord?.metrics ?? runRecord?.diagnostics?.routeExecutionSummary ?? {}, normalizeMissionOutcomeForAttempt(attempt, routeRecord, runRecord)),
    routeExecutionRecord: routeRecord,
    runRecord
  };
}

function normalizeMetrics(metrics = {}, missionOutcome = null) {
  const merged = {
    ...(metrics ?? {}),
    missionCompositeScore: missionOutcome?.compositeScore ?? metrics?.missionCompositeScore,
    missionScienceScore: missionOutcome?.scienceScore ?? metrics?.missionScienceScore,
    missionFeasibilityScore: missionOutcome?.feasibilityScore ?? metrics?.missionFeasibilityScore,
    missionEfficiencyScore: missionOutcome?.efficiencyScore ?? metrics?.missionEfficiencyScore,
    missionSafetyScore: missionOutcome?.safetyScore ?? metrics?.missionSafetyScore,
    missionScoreCoverage: missionOutcome?.coverageFraction ?? metrics?.missionScoreCoverage
  };
  return Object.fromEntries(METRIC_DEFINITIONS.map((definition) => [definition.id, finiteOrNull(merged?.[definition.id])]));
}

function normalizeMissionOutcomeForAttempt(attempt = {}, routeRecord = null, runRecord = null) {
  const report = attempt.missionOutcomeReport ?? attempt.missionOutcome?.report ?? routeRecord?.missionOutcomeReport ?? runRecord?.missionOutcomeReport ?? attempt.result?.missionOutcomeReport ?? null;
  const score = attempt.missionScore ?? attempt.missionOutcome?.score ?? routeRecord?.missionScore ?? runRecord?.missionScore ?? attempt.result?.missionScore ?? null;
  const profileId = report?.scoreProfile?.profileId ?? score?.profile?.profileId ?? score?.scoreConfig?.profileId ?? null;
  const profileVersion = report?.scoreProfile?.profileVersion ?? score?.profile?.profileVersion ?? score?.scoreConfig?.profileVersion ?? null;
  if (!report && !score) return null;
  return {
    report,
    score,
    profileId,
    profileVersion,
    profileKey: profileId ? `${profileId}@${profileVersion ?? 'unknown'}` : null,
    compositeScore: finiteOrNull(report?.compositeScore ?? score?.compositeScore),
    scienceScore: finiteOrNull(report?.scienceScore ?? groupScore(score, 'science')),
    feasibilityScore: finiteOrNull(report?.feasibilityScore ?? groupScore(score, 'feasibility')),
    efficiencyScore: finiteOrNull(report?.efficiencyScore ?? groupScore(score, 'efficiency')),
    safetyScore: finiteOrNull(report?.safetyScore ?? groupScore(score, 'safety')),
    coverageFraction: finiteOrNull(report?.coverageFraction ?? score?.coverageFraction),
    changesOfficialBrowserScoring: false
  };
}

function buildMissionOutcomeComparison(attempts = [], profileKeys = []) {
  const withScores = attempts.filter((attempt) => attempt.missionOutcome?.compositeScore != null);
  return {
    available: withScores.length > 0,
    compatible: profileKeys.length <= 1,
    profileKeys,
    attemptsWithScores: withScores.length,
    boundary: 'SCORE-R1 shadow scores are an additional comparison dimension and do not replace existing benchmark ranks.'
  };
}

function groupScore(score = {}, groupId) {
  return (score?.groupScores ?? []).find((group) => group.groupId === groupId)?.score ?? null;
}

function buildMetricCard(definition, attempts, ranking = []) {
  const values = attempts.map((attempt) => ({
    attemptId: attempt.attemptId,
    label: attempt.routeSourceLabel,
    value: attempt.metrics?.[definition.id] ?? null,
    displayValue: displayMetric(attempt.metrics?.[definition.id], definition)
  }));
  return {
    ...definition,
    values,
    winner: ranking[0] ?? null,
    missingCount: values.filter((row) => row.value == null).length
  };
}

function chooseMostEfficientAttempt(attempts = []) {
  const rows = attempts
    .map((attempt) => {
      const score = finiteOrNull(attempt.metrics?.finalScore);
      const energy = finiteOrNull(attempt.metrics?.energyUsed);
      if (score == null || energy == null || energy <= 0) return null;
      return {
        attemptId: attempt.attemptId,
        attemptSource: attempt.attemptSource,
        attemptSourceLabel: attempt.attemptSourceLabel,
        routeSourceLabel: attempt.routeSourceLabel,
        fairnessLabel: attempt.fairnessLabel,
        metricId: 'scorePerEnergy',
        value: round(score / energy),
        displayValue: `${round(score / energy)} pts/energy`
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);
  return rows[0] ? { ...rows[0], rank: 1 } : null;
}

function summarizeWinner(winner) {
  if (!winner) return null;
  return {
    attemptId: winner.attemptId ?? null,
    attemptSource: winner.attemptSource ?? null,
    attemptSourceLabel: winner.attemptSourceLabel ?? null,
    routeSourceLabel: winner.routeSourceLabel ?? null,
    value: winner.value ?? null,
    displayValue: winner.displayValue ?? String(winner.value ?? '')
  };
}

function mergeKeyForAttempt(byKey, attempt, index) {
  const key = attemptKey(attempt, index);
  if (attempt.resultId || attempt.planId) return key;
  const sourcePrefix = [attempt.episodeId ?? 'episode', attempt.attemptSource ?? 'source'].join('::');
  const existingKey = [...byKey.keys()].find((candidate) => candidate.startsWith(`${sourcePrefix}::`));
  return existingKey ?? key;
}
function attemptKey(attempt, index) {
  return [
    attempt.episodeId ?? 'episode',
    attempt.attemptSource ?? 'source',
    attempt.resultId ?? attempt.planId ?? attempt.attemptId ?? `attempt-${index + 1}`
  ].join('::');
}

function normalizeFairnessLabel(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'No fairness label';
  return FAIRNESS_LABELS[text] ?? FAIRNESS_LABELS[text.replace(/\s+/g, '')] ?? text;
}

function displayMetric(value, definition) {
  const number = finiteOrNull(value);
  if (number == null) return definition.missingLabel;
  if (definition.unit === 'ratio') return `${round(number * 100)}%`;
  return String(round(number));
}

function finiteOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : null;
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

function unique(values) {
  return [...new Set(values)];
}

function labelize(value) {
  const text = String(value ?? '').trim();
  if (!text) return 'Benchmark Attempt';
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}