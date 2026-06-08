export const PLAN_SOURCE_LABELS = {
  manual: 'Player Plan',
  temporalGreedy: 'Greedy Planner',
  greedyBaseline: 'Legacy Greedy Result',
  importedSolver: 'Imported Solver',
  unknown: 'Unknown Plan'
};

export function summarizePlanResult(entryOrResult, fallbackSource = 'unknown') {
  const entry = normalizeEntry(entryOrResult, fallbackSource);
  const result = entry.result ?? entryOrResult;
  const summary = result?.summary ?? {};
  const risk = result?.risk ?? {};
  const source = normalizeSource(entry.source ?? result?.source ?? fallbackSource);
  const planMeta = entry.plan?.meta ?? result?.planMetadata ?? result?.planMeta ?? {};
  const greedyStop = planMeta.greedyStop ?? result?.planMetadata?.greedyStop ?? result?.planMeta?.greedyStop ?? null;
  const waypointCount = (entry.plan?.agentPlans ?? result?.plan?.agentPlans ?? [])
    .reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
  const riskExposure = getMetric(summary, ['riskExposure', 'mobileHazardExposureCount', 'hazardExposureCount'], risk.mobileHazardExposure ?? null);
  return {
    source,
    planName: planNameFor(source, planMeta, result),
    solverName: planMeta.solver ?? result?.solverName ?? null,
    levelId: result?.levelId ?? entry.plan?.levelId ?? null,
    instanceId: result?.instanceId ?? entry.plan?.instanceId ?? null,
    missionId: result?.missionId ?? entry.plan?.missionId ?? null,
    challengeMode: result?.challengeMode ?? null,
    expectedValue: getMetric(summary, ['expectedValue', 'expectedSampleValue', 'expectedSampleScore']),
    realizedValue: getMetric(summary, ['realizedValue', 'realizedSampleValue', 'realizedSampleScore', 'sampleScore']),
    finalScore: getMetric(summary, ['finalScore']),
    energyUsed: getMetric(summary, ['energyUsed']),
    staticHazardsHit: getMetric(summary, ['hazardsHit']),
    mobileHazardsHit: getMetric(summary, ['mobileHazardsHit'], risk.mobileHazardContacts),
    depthExposure: getMetric(summary, ['shallowEnergyPenalty', 'depthEnergyExposure', 'depthExposure'], risk.depthEnergyPenalty ?? risk.shallowExposure),
    riskExposure,
    forecastRegret: getMetric(summary, ['expectedValueRegret', 'forecastRegret', 'regret'], risk.forecastRegret ?? result?.regret?.forecastRegret),
    completedWaypoints: getMetric(summary, ['completedWaypoints']),
    missedWaypoints: getMetric(summary, ['missedWaypoints']),
    finalTime: getMetric(summary, ['elapsedTime', 'finalTime'], greedyStop?.stopTime ?? null),
    waypointCount,
    greedyStop,
    stopReason: summary.stopReason?.title ?? summary.stopReason?.code ?? greedyStop?.stopReason ?? null,
    remainingMissionTime: greedyStop?.remainingMissionTime ?? null,
    remainingFuel: greedyStop?.remainingFuel ?? null,
    summary
  };
}

export function comparePlanResults(resultStore = {}) {
  const rows = ['manual', 'temporalGreedy', 'greedyBaseline', 'importedSolver', 'unknown']
    .map((source) => resultStore[source] ? summarizePlanResult(resultStore[source], source) : null)
    .filter(Boolean);
  const winner = chooseWinner(rows);
  const notes = winner ? explainPlanOutcome(winner, rows) : [];
  return {
    rows,
    winner,
    notes
  };
}

export function chooseWinner(rows) {
  const scored = rows.filter((row) => typeof row.finalScore === 'number' && Number.isFinite(row.finalScore));
  if (!scored.length) return null;
  return [...scored].sort((a, b) => b.finalScore - a.finalScore)[0];
}

export function explainPlanOutcome(winner, rows) {
  if (!winner) return [];
  const notes = [`${winner.planName} currently leads by final score.`];
  const others = rows.filter((row) => row !== winner);
  if (!others.length) return notes;
  if (beatsMost(winner, others, 'realizedValue')) notes.push('It collected higher realized sample value.');
  if (beatsMost(winner, others, 'energyUsed', true)) notes.push('It used less energy.');
  if (beatsMost(winner, others, 'staticHazardsHit', true) || beatsMost(winner, others, 'mobileHazardsHit', true)) notes.push('It hit fewer hazards.');
  if (beatsMost(winner, others, 'riskExposure', true)) notes.push('It had lower risk exposure.');
  if (beatsMost(winner, others, 'forecastRegret', true)) notes.push('It was more robust to forecast uncertainty.');
  return notes;
}

export function formatMetric(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

export function getMetricOrNA(row, metricName) {
  return formatMetric(row?.[metricName]);
}

function normalizeEntry(value, fallbackSource) {
  if (value?.result || value?.plan || value?.summary) return { source: fallbackSource, ...value };
  return { source: fallbackSource, result: value };
}

function normalizeSource(source) {
  if (source === 'temporalGreedy' || source === 'browser-temporal-greedy') return 'temporalGreedy';
  if (source === 'greedy' || source === 'greedyBaseline') return 'greedyBaseline';
  if (source === 'solver' || source === 'imported' || source === 'importedSolver') return 'importedSolver';
  if (source === 'manual' || source === 'player') return 'manual';
  return 'unknown';
}

function planNameFor(source, planMeta, result) {
  if (planMeta?.name) return planMeta.name;
  if (result?.planName) return result.planName;
  if (planMeta?.solver) return `${PLAN_SOURCE_LABELS[source] ?? 'Solver'} (${planMeta.solver})`;
  return PLAN_SOURCE_LABELS[source] ?? PLAN_SOURCE_LABELS.unknown;
}

function getMetric(object, keys, fallback = null) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== '') return Number.isFinite(Number(value)) ? Number(value) : value;
  }
  return fallback;
}

function beatsMost(winner, others, key, lowerIsBetter = false) {
  if (winner[key] === null || winner[key] === undefined) return false;
  const comparable = others.filter((row) => row[key] !== null && row[key] !== undefined);
  if (!comparable.length) return false;
  return comparable.every((row) => lowerIsBetter ? winner[key] <= row[key] : winner[key] >= row[key]);
}
