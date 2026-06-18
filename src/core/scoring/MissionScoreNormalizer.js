import { missionScoreComponentById } from './MissionScoreComponents.js';

export const MISSION_SCORE_NORMALIZER_VERSION = 'mission-score-normalizer-score-r1';

export function normalizeHigherIsBetter(value, bounds = {}) {
  const min = Number(bounds?.min ?? 0);
  const max = Number(bounds?.max ?? 1);
  if (!validBounds(min, max)) return unavailable('invalid higher-is-better bounds');
  return available((Number(value) - min) / (max - min));
}

export function normalizeLowerIsBetter(value, bounds = {}) {
  const min = Number(bounds?.min ?? 0);
  const max = Number(bounds?.max ?? 1);
  if (!validBounds(min, max)) return unavailable('invalid lower-is-better bounds');
  return available(1 - ((Number(value) - min) / (max - min)));
}

export function normalizeTargetRange(value, targetRange = {}, bounds = {}) {
  const number = Number(value);
  const min = Number(targetRange?.min ?? targetRange?.value ?? bounds?.min);
  const max = Number(targetRange?.max ?? targetRange?.value ?? bounds?.max);
  if (!Number.isFinite(number) || !Number.isFinite(min) || !Number.isFinite(max)) return unavailable('invalid target-range values');
  if (number >= min && number <= max) return available(1);
  const span = Math.max(1e-9, Number(bounds?.max ?? max) - Number(bounds?.min ?? min));
  const distance = number < min ? min - number : number - max;
  return available(1 - distance / span);
}

export function normalizeBinaryPass(value) {
  if (value === true || value === 1 || value === 'true' || value === 'pass' || value === 'passed') return available(1);
  if (value === false || value === 0 || value === 'false' || value === 'fail' || value === 'failed') return available(0);
  return unavailable('binary value unavailable');
}

export function normalizeMissionScoreMetric(metric = {}, componentDefinition = null, options = {}) {
  const definition = componentDefinition ?? missionScoreComponentById(metric.componentId);
  const warnings = [];
  if (!definition) return missingMetric(metric, ['Unknown component definition.']);
  if (metric.available !== true || metric.rawValue === null || metric.rawValue === undefined) return missingMetric(metric, metric.caveats ?? ['Metric unavailable.'], definition);
  const bounds = metric.bounds ?? definition.defaultBounds;
  const target = metric.target ?? definition.defaultTarget;
  if (!bounds && !['binaryPass', 'categorical'].includes(definition.direction)) {
    return missingMetric(metric, ['No bounds were available; metric is not scored.'], definition);
  }
  let normalized;
  if (definition.direction === 'higherIsBetter') normalized = normalizeHigherIsBetter(metric.rawValue, bounds);
  else if (definition.direction === 'lowerIsBetter') normalized = normalizeLowerIsBetter(metric.rawValue, bounds);
  else if (definition.direction === 'targetRange') normalized = normalizeTargetRange(metric.rawValue, target, bounds);
  else if (definition.direction === 'binaryPass') normalized = normalizeBinaryPass(metric.rawValue);
  else normalized = unavailable('categorical metrics require an explicit mapping');
  warnings.push(...(normalized.warnings ?? []));
  return {
    componentId: metric.componentId,
    rawValue: metric.rawValue,
    normalizedValue: normalized.available ? normalized.value : null,
    unit: metric.unit ?? definition.unit,
    direction: definition.direction,
    bounds,
    target,
    available: normalized.available,
    dataSource: metric.dataSource,
    confidence: metric.confidence ?? 0,
    warnings,
    refereeOnlyDerived: metric.refereeOnlyDerived === true
  };
}

export function normalizeMissionOutcomeMetrics(metricsRecord = {}, profile = {}, options = {}) {
  const inputMetrics = Array.isArray(metricsRecord?.metrics) ? metricsRecord.metrics : Array.isArray(metricsRecord) ? metricsRecord : [];
  const normalizedMetrics = inputMetrics.map((metric) => normalizeMissionScoreMetric(metric, missionScoreComponentById(metric.componentId), options));
  return {
    type: 'anchor.benchmark.mission-score-normalization',
    version: MISSION_SCORE_NORMALIZER_VERSION,
    profileId: profile?.id ?? profile?.profileId ?? null,
    profileVersion: profile?.version ?? profile?.profileVersion ?? null,
    metrics: normalizedMetrics,
    missingMetrics: normalizedMetrics.filter((metric) => !metric.available).map((metric) => metric.componentId),
    warnings: normalizedMetrics.flatMap((metric) => metric.warnings ?? []),
    publicSafe: true
  };
}

export function missionScoreNormalizationSummary(result = {}) {
  const metrics = Array.isArray(result?.metrics) ? result.metrics : [];
  return {
    type: 'anchor.benchmark.mission-score-normalization-summary',
    version: MISSION_SCORE_NORMALIZER_VERSION,
    profileId: result?.profileId ?? null,
    metricCount: metrics.length,
    availableMetricCount: metrics.filter((metric) => metric.available).length,
    missingMetricCount: metrics.filter((metric) => !metric.available).length,
    warnings: result?.warnings ?? []
  };
}

function validBounds(min, max) {
  return Number.isFinite(min) && Number.isFinite(max) && max > min;
}

function available(value) {
  const number = Math.max(0, Math.min(1, Number(value)));
  return { available: Number.isFinite(number), value: Number.isFinite(number) ? Number(number.toFixed(6)) : null, warnings: Number.isFinite(number) ? [] : ['normalized value was not finite'] };
}

function unavailable(reason) {
  return { available: false, value: null, warnings: [reason] };
}

function missingMetric(metric, warnings, definition = null) {
  return {
    componentId: metric.componentId,
    rawValue: metric.rawValue ?? null,
    normalizedValue: null,
    unit: metric.unit ?? definition?.unit ?? null,
    direction: definition?.direction ?? null,
    bounds: definition?.defaultBounds ?? null,
    target: definition?.defaultTarget ?? null,
    available: false,
    dataSource: metric.dataSource ?? null,
    confidence: metric.confidence ?? 0,
    warnings,
    refereeOnlyDerived: metric.refereeOnlyDerived === true
  };
}
