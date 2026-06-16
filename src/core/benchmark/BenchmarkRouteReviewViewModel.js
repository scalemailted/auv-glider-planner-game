import { normalizeBenchmarkAttemptSource } from './BenchmarkEpisodeContract.js';
import { attemptSourceFromRouteSourceLabel, routeSourceLabelFromAttemptSource } from './BenchmarkAttemptSourceMapping.js';

export const BENCHMARK_ROUTE_REVIEW_VIEW_MODEL_VERSION = 'benchmark-route-review-view-model-p3';

export function buildBenchmarkRouteReviewViewModel({ routeExecutionRecord = null, plan = null, result = null } = {}) {
  const metrics = routeExecutionRecord?.metrics ?? result?.summary ?? {};
  const segments = normalizeSegments(routeExecutionRecord?.segments, plan);
  const events = Array.isArray(result?.events) ? result.events : [];
  const warnings = [];
  if (!routeExecutionRecord) warnings.push('Route execution record is not available; route review is partial.');
  if (!Array.isArray(routeExecutionRecord?.segments) || routeExecutionRecord.segments.length === 0) {
    warnings.push('Segment-level review is partial because detailed execution segments are not available.');
  }
  const routeLength = finiteOrNull(metrics.routeLength) ?? sumFinite(segments.map((segment) => segment.distance));
  const energyUsed = finiteOrNull(metrics.energyUsed) ?? sumFinite(segments.map((segment) => segment.energyCost));
  const elapsedTime = finiteOrNull(metrics.elapsedTime) ?? maxFinite(segments.map((segment) => segment.endTime));
  const hazardEvents = countEvents(events, /hazard/i, finiteOrNull(metrics.hazardsHit));
  const duplicateSampleEvents = countEvents(events, /duplicate|redundant/i, finiteOrNull(metrics.duplicateSamples));
  const missedWaypointEvents = countEvents(events, /missed|waypoint_missed|incomplete/i, finiteOrNull(metrics.missedWaypoints));
  const segmentCards = segments.map((segment, index) => ({
    segmentIndex: segment.segmentIndex ?? index,
    from: segment.from ?? null,
    to: segment.to ?? null,
    distance: finiteOrNull(segment.distance),
    duration: segment.duration ?? durationFromSegment(segment),
    energyCost: finiteOrNull(segment.energyCost ?? segment.energy),
    currentAssist: finiteOrNull(segment.currentAssist),
    crossCurrent: finiteOrNull(segment.crossCurrent),
    hazardPenalty: finiteOrNull(segment.hazardPenalty),
    status: String(segment.status ?? 'notStarted'),
    warnings: normalizeWarnings(segment.warnings)
  }));
  return {
    version: BENCHMARK_ROUTE_REVIEW_VIEW_MODEL_VERSION,
    attemptId: routeExecutionRecord?.attemptId ?? routeExecutionRecord?.resultId ?? result?.attemptId ?? result?.resultId ?? null,
    attemptSource: normalizeBenchmarkAttemptSource(routeExecutionRecord?.attemptSource ?? attemptSourceFromRouteSourceLabel(routeExecutionRecord?.routeSourceLabel ?? result?.planName ?? result?.source)),
    attemptSourceLabel: routeSourceLabelFromAttemptSource(routeExecutionRecord?.attemptSource ?? attemptSourceFromRouteSourceLabel(routeExecutionRecord?.routeSourceLabel ?? result?.planName ?? result?.source)),
    routeSourceLabel: routeExecutionRecord?.routeSourceLabel ?? result?.planName ?? result?.source ?? 'Benchmark Attempt',
    fairnessLabel: routeExecutionRecord?.fairnessLabel ?? result?.benchmarkMetadata?.fairnessLabel ?? 'No fairness label',
    waypointCount: integerOrZero(routeExecutionRecord?.waypointCount ?? countPlanWaypoints(plan)),
    segmentCount: integerOrZero(routeExecutionRecord?.segmentCount ?? segmentCards.length),
    routeLength,
    elapsedTime,
    energyUsed,
    hazardEvents,
    duplicateSampleEvents,
    missedWaypointEvents,
    segmentCards,
    segmentRisk: segmentRiskSummary(segmentCards),
    warnings,
    explanation: 'Route review explains what happened during execution; it is not an optimization algorithm.'
  };
}

export function segmentRiskSummary(segments = []) {
  const cards = Array.isArray(segments) ? segments : [];
  const riskySegments = cards.filter((segment) => {
    const hazardPenalty = finiteOrNull(segment.hazardPenalty);
    const crossCurrent = finiteOrNull(segment.crossCurrent);
    return hazardPenalty > 0 || crossCurrent > 0.5 || normalizeWarnings(segment.warnings).length > 0 || /invalid|failed|blocked|hazard/i.test(String(segment.status ?? ''));
  });
  return {
    segmentCount: cards.length,
    riskySegmentCount: riskySegments.length,
    warningCount: cards.reduce((sum, segment) => sum + normalizeWarnings(segment.warnings).length, 0),
    maxCrossCurrent: maxFinite(cards.map((segment) => segment.crossCurrent)),
    totalHazardPenalty: sumFinite(cards.map((segment) => segment.hazardPenalty))
  };
}

export function routeReviewSummary(viewModel = {}) {
  return {
    attemptId: viewModel.attemptId ?? null,
    attemptSource: viewModel.attemptSource ?? null,
    routeSourceLabel: viewModel.routeSourceLabel ?? null,
    fairnessLabel: viewModel.fairnessLabel ?? null,
    waypointCount: viewModel.waypointCount ?? 0,
    segmentCount: viewModel.segmentCount ?? 0,
    routeLength: viewModel.routeLength ?? null,
    elapsedTime: viewModel.elapsedTime ?? null,
    energyUsed: viewModel.energyUsed ?? null,
    hazards: viewModel.hazardEvents ?? 0,
    duplicateSamples: viewModel.duplicateSampleEvents ?? 0,
    missedWaypoints: viewModel.missedWaypointEvents ?? 0,
    riskySegmentCount: viewModel.segmentRisk?.riskySegmentCount ?? 0,
    warnings: Array.isArray(viewModel.warnings) ? [...viewModel.warnings] : []
  };
}

function normalizeSegments(segments, plan) {
  if (Array.isArray(segments) && segments.length) {
    return segments.map((segment, index) => ({
      segmentIndex: segment.segmentIndex ?? index,
      from: normalizePoint(segment.from),
      to: normalizePoint(segment.to ?? segment.target),
      startTime: finiteOrNull(segment.startTime ?? segment.t0),
      endTime: finiteOrNull(segment.endTime ?? segment.t1 ?? segment.estimatedArrivalTime ?? segment.t),
      distance: finiteOrNull(segment.distance ?? segment.segmentDistance),
      energyCost: finiteOrNull(segment.energyCost ?? segment.energy ?? segment.segmentEnergy),
      currentAssist: finiteOrNull(segment.currentAssist),
      crossCurrent: finiteOrNull(segment.crossCurrent),
      hazardPenalty: finiteOrNull(segment.hazardPenalty ?? segment.components?.hazardPenalty ?? segment.components?.shorelineRiskPenalty),
      status: segment.status ?? 'notStarted',
      warnings: normalizeWarnings(segment.warnings)
    }));
  }
  const derived = [];
  for (const agentPlan of plan?.agentPlans ?? []) {
    let from = normalizePoint(agentPlan.selectedStart ?? agentPlan.start ?? null);
    for (const waypoint of agentPlan.waypoints ?? []) {
      const to = normalizePoint(waypoint);
      derived.push({
        segmentIndex: derived.length,
        from,
        to,
        startTime: null,
        endTime: finiteOrNull(waypoint.estimatedArrivalTime ?? waypoint.t),
        distance: finiteOrNull(waypoint.segmentDistance ?? waypoint.distance),
        energyCost: finiteOrNull(waypoint.segmentEnergy ?? waypoint.consumedFuel),
        currentAssist: finiteOrNull(waypoint.currentAssist),
        crossCurrent: finiteOrNull(waypoint.crossCurrent),
        hazardPenalty: finiteOrNull(waypoint.hazardPenalty ?? waypoint.components?.hazardPenalty),
        status: waypoint.validity?.valid === false ? 'invalidPlan' : 'partial',
        warnings: normalizeWarnings(waypoint.warnings)
      });
      from = to;
    }
  }
  return derived;
}

function countPlanWaypoints(plan) {
  return (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
}

function countEvents(events, pattern, fallback = null) {
  const count = events.filter((event) => pattern.test(String(event.type ?? event.eventType ?? event.reason ?? ''))).length;
  if (count > 0) return count;
  return integerOrZero(fallback ?? 0);
}

function durationFromSegment(segment = {}) {
  const start = finiteOrNull(segment.startTime);
  const end = finiteOrNull(segment.endTime);
  return start != null && end != null ? Math.max(0, round(end - start)) : null;
}

function normalizePoint(point) {
  if (!point || typeof point !== 'object') return null;
  return { x: finiteOrNull(point.x), y: finiteOrNull(point.y) };
}

function normalizeWarnings(warnings) {
  return Array.isArray(warnings) ? warnings.map((warning) => String(warning ?? '').trim()).filter(Boolean) : [];
}

function finiteOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : null;
}

function integerOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function sumFinite(values = []) {
  const finite = values.map(finiteOrNull).filter((value) => value != null);
  if (!finite.length) return null;
  return round(finite.reduce((sum, value) => sum + value, 0));
}

function maxFinite(values = []) {
  const finite = values.map(finiteOrNull).filter((value) => value != null);
  return finite.length ? Math.max(...finite) : null;
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}