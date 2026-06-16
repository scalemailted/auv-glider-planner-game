export const BENCHMARK_ROUTE_GEOMETRY_ADAPTER_VERSION = 'benchmark-route-geometry-adapter-p4';

export const WAYPOINT_ONLY_SEGMENT_WARNING = 'Segment-level metrics unavailable; using waypoint geometry only.';

export function extractRouteGeometryFromPlan(plan) {
  const waypoints = [];
  const segments = [];
  const warnings = [];
  if (!plan || typeof plan !== 'object') {
    return normalizeBenchmarkRouteGeometry({
      version: BENCHMARK_ROUTE_GEOMETRY_ADAPTER_VERSION,
      planId: null,
      routeSourceLabel: 'No route geometry',
      waypoints,
      segments,
      warnings: ['Plan geometry is not available.'],
      partial: true
    });
  }

  for (const agentPlan of Array.isArray(plan.agentPlans) ? plan.agentPlans : []) {
    const agentId = stringOrNull(agentPlan?.agentId) ?? `agent-${waypoints.length + 1}`;
    let from = normalizeWaypointPoint(agentPlan?.selectedStart ?? agentPlan?.start ?? null, waypoints.length, {
      id: `${agentId}-start`,
      label: `${agentId} start`,
      status: 'start',
      completed: true
    });
    if (from) waypoints.push(from);
    for (const [localIndex, waypoint] of (Array.isArray(agentPlan?.waypoints) ? agentPlan.waypoints : []).entries()) {
      const to = normalizeWaypointPoint(waypoint, waypoints.length, {
        id: waypoint?.id ?? `${agentId}-wp-${localIndex + 1}`,
        label: waypoint?.label ?? waypoint?.note ?? `Waypoint ${localIndex + 1}`,
        status: waypoint?.validity?.valid === false ? 'invalidPlan' : waypoint?.status ?? 'planned',
        completed: Boolean(waypoint?.completed),
        missed: Boolean(waypoint?.missed),
        warning: Boolean(waypoint?.warning ?? waypoint?.warnings?.length),
        metrics: waypointMetrics(waypoint)
      });
      if (to) waypoints.push(to);
      if (from && to) {
        segments.push(normalizeSegmentRecord({
          id: `${agentId}-segment-${localIndex + 1}`,
          index: segments.length,
          agentId,
          fromWaypointId: from.id,
          toWaypointId: to.id,
          from,
          to,
          distance: waypoint?.segmentDistance ?? waypoint?.distance,
          duration: waypoint?.duration,
          energyCost: waypoint?.segmentEnergy ?? waypoint?.consumedFuel ?? waypoint?.energyCost,
          currentAssist: waypoint?.currentAssist,
          currentOpposition: waypoint?.currentOpposition,
          crossCurrent: waypoint?.crossCurrent,
          hazardPenalty: waypoint?.hazardPenalty ?? waypoint?.components?.hazardPenalty,
          redundancyPenalty: waypoint?.redundancyPenalty ?? waypoint?.components?.redundancyPenalty,
          sampleValue: waypoint?.sampleValue ?? waypoint?.expectedValue ?? waypoint?.actionValue,
          status: waypoint?.validity?.valid === false ? 'invalidPlan' : waypoint?.status ?? 'planned',
          warnings: waypoint?.warnings
        }));
      }
      if (to) from = to;
    }
  }

  if (!waypoints.length) warnings.push('Plan has no waypoint geometry available.');
  if (segments.length) warnings.push(WAYPOINT_ONLY_SEGMENT_WARNING);
  return normalizeBenchmarkRouteGeometry({
    version: BENCHMARK_ROUTE_GEOMETRY_ADAPTER_VERSION,
    routeId: plan.routeId ?? plan.id ?? plan.planId ?? plan.meta?.planId ?? null,
    planId: plan.planId ?? plan.id ?? plan.meta?.planId ?? null,
    attemptId: plan.meta?.attemptId ?? null,
    attemptSource: plan.planner?.type ?? plan.meta?.planner?.type ?? null,
    routeSourceLabel: plan.meta?.name ?? plan.planner?.name ?? plan.planner?.label ?? 'Planned Route',
    fairnessLabel: plan.meta?.fairnessLabel ?? null,
    waypoints,
    segments,
    warnings,
    partial: true
  });
}

export function extractRouteGeometryFromResult(result) {
  if (result?.routeExecutionRecord?.type === 'anchor.benchmark.route-execution') {
    return extractRouteGeometryFromRouteExecutionRecord(result.routeExecutionRecord);
  }
  if (result?.routeExecution?.type === 'anchor.benchmark.route-execution') {
    return extractRouteGeometryFromRouteExecutionRecord(result.routeExecution);
  }

  const points = extractResultPoints(result);
  const waypoints = points.map((point, index) => normalizeWaypointPoint(point, index, {
    id: point.id ?? `result-point-${index + 1}`,
    label: point.label ?? `Frame ${index}`,
    status: index === points.length - 1 ? 'completed' : 'executed',
    completed: true,
    metrics: point.metrics
  })).filter(Boolean);
  const segments = buildRouteSegmentGeometry(waypoints, {
    idPrefix: 'result-segment',
    status: 'executed'
  });
  const warnings = [];
  if (!waypoints.length) warnings.push('Result does not contain route frame or trajectory geometry.');
  else warnings.push(WAYPOINT_ONLY_SEGMENT_WARNING);
  return normalizeBenchmarkRouteGeometry({
    version: BENCHMARK_ROUTE_GEOMETRY_ADAPTER_VERSION,
    routeId: result?.routeId ?? result?.resultId ?? result?.id ?? null,
    resultId: result?.resultId ?? result?.id ?? null,
    attemptId: result?.attemptId ?? result?.resultId ?? result?.id ?? null,
    attemptSource: result?.attemptSource ?? result?.source ?? null,
    routeSourceLabel: result?.planName ?? result?.source ?? 'Executed Route',
    fairnessLabel: result?.fairnessLabel ?? result?.benchmarkMetadata?.fairnessLabel ?? null,
    waypoints,
    segments,
    warnings,
    partial: true
  });
}

export function extractRouteGeometryFromRouteExecutionRecord(routeExecutionRecord) {
  if (!routeExecutionRecord || typeof routeExecutionRecord !== 'object') {
    return normalizeBenchmarkRouteGeometry({
      version: BENCHMARK_ROUTE_GEOMETRY_ADAPTER_VERSION,
      routeSourceLabel: 'No route execution record',
      waypoints: [],
      segments: [],
      warnings: ['Route execution record is not available.'],
      partial: true
    });
  }

  const rawSegments = Array.isArray(routeExecutionRecord.segments) ? routeExecutionRecord.segments : [];
  const waypoints = [];
  const segments = [];
  const warnings = [];
  const pointKeyToWaypointId = new Map();

  for (const [index, rawSegment] of rawSegments.entries()) {
    const fromPoint = normalizePoint(rawSegment?.from);
    const toPoint = normalizePoint(rawSegment?.to ?? rawSegment?.target);
    if (!fromPoint || !toPoint) continue;
    const fromWaypoint = waypointFromSegmentPoint(fromPoint, index === 0 ? 0 : waypoints.length, rawSegment, 'from', pointKeyToWaypointId, waypoints);
    const toWaypoint = waypointFromSegmentPoint(toPoint, waypoints.length, rawSegment, 'to', pointKeyToWaypointId, waypoints);
    segments.push(normalizeSegmentRecord({
      id: rawSegment.id ?? `route-segment-${index + 1}`,
      index,
      agentId: rawSegment.agentId,
      fromWaypointId: fromWaypoint.id,
      toWaypointId: toWaypoint.id,
      from: fromWaypoint,
      to: toWaypoint,
      distance: rawSegment.distance ?? rawSegment.segmentDistance,
      duration: rawSegment.duration ?? durationFromTimes(rawSegment.startTime ?? rawSegment.t0, rawSegment.endTime ?? rawSegment.t1 ?? rawSegment.estimatedArrivalTime ?? rawSegment.t),
      energyCost: rawSegment.energyCost ?? rawSegment.energy ?? rawSegment.segmentEnergy,
      currentAssist: rawSegment.currentAssist,
      currentOpposition: rawSegment.currentOpposition,
      crossCurrent: rawSegment.crossCurrent,
      hazardPenalty: rawSegment.hazardPenalty ?? rawSegment.components?.hazardPenalty ?? rawSegment.components?.shorelineRiskPenalty,
      redundancyPenalty: rawSegment.redundancyPenalty ?? rawSegment.components?.redundancyPenalty,
      sampleValue: rawSegment.sampleValue ?? rawSegment.expectedValue ?? rawSegment.actionValue,
      status: rawSegment.status ?? routeExecutionRecord.validation?.status ?? 'executed',
      warnings: rawSegment.warnings
    }));
  }

  if (!segments.length && Array.isArray(routeExecutionRecord.waypoints)) {
    const normalizedWaypoints = routeExecutionRecord.waypoints
      .map((waypoint, index) => normalizeWaypointPoint(waypoint, index, { id: waypoint?.id ?? `record-waypoint-${index + 1}` }))
      .filter(Boolean);
    waypoints.push(...normalizedWaypoints);
    segments.push(...buildRouteSegmentGeometry(normalizedWaypoints, { idPrefix: 'record-segment' }));
  }

  const segmentMetricsMissing = segments.some((segment) => !hasSegmentOutcomeMetrics(segment));
  if (!segments.length) warnings.push('Route execution record does not contain waypoint or segment geometry.');
  if (segmentMetricsMissing || !rawSegments.length) warnings.push(WAYPOINT_ONLY_SEGMENT_WARNING);
  if (Array.isArray(routeExecutionRecord.validation?.warnings)) warnings.push(...routeExecutionRecord.validation.warnings);

  return normalizeBenchmarkRouteGeometry({
    version: BENCHMARK_ROUTE_GEOMETRY_ADAPTER_VERSION,
    routeId: routeExecutionRecord.routeId ?? routeExecutionRecord.planId ?? routeExecutionRecord.resultId ?? null,
    planId: routeExecutionRecord.planId ?? null,
    resultId: routeExecutionRecord.resultId ?? null,
    attemptId: routeExecutionRecord.attemptId ?? routeExecutionRecord.resultId ?? routeExecutionRecord.planId ?? null,
    attemptSource: routeExecutionRecord.attemptSource ?? null,
    routeSourceLabel: routeExecutionRecord.routeSourceLabel ?? 'Benchmark Route',
    fairnessLabel: routeExecutionRecord.fairnessLabel ?? null,
    waypoints,
    segments,
    warnings,
    partial: segmentMetricsMissing || !segments.length
  });
}

export function normalizeBenchmarkRouteGeometry(input) {
  const source = input && typeof input === 'object' ? input : {};
  const waypoints = Array.isArray(source.waypoints)
    ? source.waypoints.map((waypoint, index) => normalizeWaypointPoint(waypoint, index, waypoint)).filter(Boolean)
    : [];
  const waypointById = new Map(waypoints.map((waypoint) => [waypoint.id, waypoint]));
  const segments = Array.isArray(source.segments)
    ? source.segments.map((segment, index) => normalizeSegmentRecord(resolveSegmentWaypoints(segment, index, waypointById))).filter(Boolean)
    : [];
  const warnings = normalizeWarnings(source.warnings);
  if (!waypoints.length && !segments.length && !warnings.length) warnings.push('Route geometry is empty.');
  const geometry = {
    version: BENCHMARK_ROUTE_GEOMETRY_ADAPTER_VERSION,
    routeId: stringOrNull(source.routeId),
    planId: stringOrNull(source.planId),
    resultId: stringOrNull(source.resultId),
    attemptId: stringOrNull(source.attemptId),
    attemptSource: stringOrNull(source.attemptSource),
    routeSourceLabel: stringOrNull(source.routeSourceLabel) ?? 'Benchmark Route',
    fairnessLabel: stringOrNull(source.fairnessLabel),
    bounds: null,
    waypoints,
    segments,
    warnings: uniqueStrings(warnings),
    partial: Boolean(source.partial) || segments.some((segment) => !hasSegmentOutcomeMetrics(segment)) || !segments.length
  };
  geometry.bounds = routeGeometryBounds(geometry);
  return geometry;
}

export function buildRouteSegmentGeometry(waypoints, options = {}) {
  const normalizedWaypoints = (Array.isArray(waypoints) ? waypoints : [])
    .map((waypoint, index) => normalizeWaypointPoint(waypoint, index, waypoint))
    .filter(Boolean);
  const segments = [];
  for (let index = 1; index < normalizedWaypoints.length; index += 1) {
    const from = normalizedWaypoints[index - 1];
    const to = normalizedWaypoints[index];
    if (!from || !to) continue;
    segments.push(normalizeSegmentRecord({
      id: `${options.idPrefix ?? 'route-segment'}-${segments.length + 1}`,
      index: segments.length,
      fromWaypointId: from.id,
      toWaypointId: to.id,
      from,
      to,
      distance: distanceBetween(from, to),
      status: options.status ?? to.status ?? 'partial',
      warnings: options.warnings
    }));
  }
  return segments;
}

export function routeGeometryBounds(geometry) {
  const points = [];
  for (const waypoint of Array.isArray(geometry?.waypoints) ? geometry.waypoints : []) points.push(normalizePoint(waypoint));
  for (const segment of Array.isArray(geometry?.segments) ? geometry.segments : []) {
    points.push(normalizePoint(segment.from));
    points.push(normalizePoint(segment.to));
  }
  const finitePoints = points.filter(Boolean);
  if (!finitePoints.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  const xs = finitePoints.map((point) => point.x);
  const ys = finitePoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX: round(minX),
    minY: round(minY),
    maxX: round(maxX),
    maxY: round(maxY),
    width: round(maxX - minX),
    height: round(maxY - minY)
  };
}

export function routeGeometryStats(geometry) {
  const normalized = normalizeBenchmarkRouteGeometry(geometry);
  const distances = normalized.segments.map((segment) => finiteOrNull(segment.distance)).filter((value) => value != null);
  const energies = normalized.segments.map((segment) => finiteOrNull(segment.energyCost)).filter((value) => value != null);
  return {
    waypointCount: normalized.waypoints.length,
    segmentCount: normalized.segments.length,
    routeLength: round(distances.reduce((sum, value) => sum + value, 0)),
    totalEnergyCost: energies.length ? round(energies.reduce((sum, value) => sum + value, 0)) : null,
    maxEnergyCost: energies.length ? round(Math.max(...energies)) : null,
    hazardSegmentCount: normalized.segments.filter((segment) => finiteOrNull(segment.hazardPenalty) > 0 || /hazard/i.test(segment.warnings.join(' '))).length,
    currentAssistSegmentCount: normalized.segments.filter((segment) => finiteOrNull(segment.currentAssist) > 0).length,
    currentOppositionSegmentCount: normalized.segments.filter((segment) => finiteOrNull(segment.currentOpposition) > 0 || finiteOrNull(segment.currentAssist) < 0).length,
    crossCurrentRiskSegmentCount: normalized.segments.filter((segment) => finiteOrNull(segment.crossCurrent) > 0.5).length,
    warningCount: normalized.warnings.length + normalized.segments.reduce((sum, segment) => sum + segment.warnings.length, 0) + normalized.waypoints.filter((waypoint) => waypoint.warning).length,
    finiteBounds: Number.isFinite(normalized.bounds.minX) && Number.isFinite(normalized.bounds.maxX) && Number.isFinite(normalized.bounds.minY) && Number.isFinite(normalized.bounds.maxY),
    partial: normalized.partial
  };
}

export function validateBenchmarkRouteGeometry(geometry) {
  const errors = [];
  const warnings = [];
  if (!geometry || typeof geometry !== 'object') {
    return { status: 'FAIL', valid: false, errors: ['Route geometry must be an object.'], warnings };
  }
  if (!Array.isArray(geometry.waypoints)) errors.push('Route geometry waypoints must be an array.');
  if (!Array.isArray(geometry.segments)) errors.push('Route geometry segments must be an array.');
  const normalized = errors.length ? null : normalizeBenchmarkRouteGeometry(geometry);
  if (normalized && normalized.waypoints.some((waypoint) => !Number.isFinite(waypoint.x) || !Number.isFinite(waypoint.y))) {
    errors.push('Route geometry waypoints need finite x and y values.');
  }
  if (normalized && !normalized.waypoints.length && !normalized.segments.length) warnings.push('Route geometry has no drawable route path.');
  if (normalized?.partial) warnings.push('Route geometry is partial.');
  return {
    status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS',
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function waypointFromSegmentPoint(point, index, segment, endpoint, pointKeyToWaypointId, waypoints) {
  const key = `${round(point.x)}:${round(point.y)}:${endpoint === 'from' ? segment.agentId ?? '' : ''}`;
  const existingId = pointKeyToWaypointId.get(key);
  if (existingId) return waypoints.find((waypoint) => waypoint.id === existingId);
  const waypoint = normalizeWaypointPoint(point, index, {
    id: endpoint === 'from' ? `segment-${segment.segmentIndex ?? index}-from` : `segment-${segment.segmentIndex ?? index}-to`,
    label: endpoint === 'from' ? 'Segment start' : 'Segment end',
    status: endpoint === 'from' ? 'executed' : segment.status ?? 'executed',
    completed: !/missed|invalid|failed|blocked/i.test(String(segment.status ?? '')),
    missed: /missed/i.test(String(segment.status ?? '')),
    warning: normalizeWarnings(segment.warnings).length > 0,
    metrics: endpoint === 'to' ? waypointMetrics(segment) : {}
  });
  waypoints.push(waypoint);
  pointKeyToWaypointId.set(key, waypoint.id);
  return waypoint;
}

function resolveSegmentWaypoints(segment, index, waypointById) {
  const from = waypointById.get(segment?.fromWaypointId) ?? normalizeWaypointPoint(segment?.from, index, segment?.from ?? {});
  const to = waypointById.get(segment?.toWaypointId) ?? normalizeWaypointPoint(segment?.to, index + 1, segment?.to ?? {});
  return { ...segment, index: segment?.index ?? segment?.segmentIndex ?? index, from, to };
}

function normalizeSegmentRecord(segment) {
  if (!segment || typeof segment !== 'object') return null;
  const from = normalizePoint(segment.from);
  const to = normalizePoint(segment.to ?? segment.target);
  if (!from || !to) return null;
  const distance = finiteOrNull(segment.distance) ?? distanceBetween(from, to);
  return {
    id: stringOrNull(segment.id) ?? `route-segment-${integerOrZero(segment.index ?? segment.segmentIndex) + 1}`,
    index: integerOrZero(segment.index ?? segment.segmentIndex),
    agentId: stringOrNull(segment.agentId),
    fromWaypointId: stringOrNull(segment.fromWaypointId),
    toWaypointId: stringOrNull(segment.toWaypointId),
    from,
    to,
    distance,
    duration: finiteOrNull(segment.duration),
    energyCost: finiteOrNull(segment.energyCost ?? segment.energy),
    currentAssist: finiteOrNull(segment.currentAssist),
    currentOpposition: finiteOrNull(segment.currentOpposition),
    crossCurrent: finiteOrNull(segment.crossCurrent),
    hazardPenalty: finiteOrNull(segment.hazardPenalty),
    redundancyPenalty: finiteOrNull(segment.redundancyPenalty),
    sampleValue: finiteOrNull(segment.sampleValue),
    status: stringOrNull(segment.status) ?? 'partial',
    warnings: normalizeWarnings(segment.warnings)
  };
}

function normalizeWaypointPoint(point, index = 0, overrides = {}) {
  const normalized = normalizePoint(point);
  if (!normalized) return null;
  const id = stringOrNull(overrides.id ?? point?.id) ?? `route-waypoint-${index + 1}`;
  const status = stringOrNull(overrides.status ?? point?.status) ?? 'planned';
  const completed = Boolean(overrides.completed ?? point?.completed ?? /complete|executed|start/i.test(status));
  const missed = Boolean(overrides.missed ?? point?.missed ?? /missed/i.test(status));
  const warning = Boolean(overrides.warning ?? point?.warning ?? normalizeWarnings(overrides.warnings ?? point?.warnings).length > 0);
  return {
    id,
    index: integerOrZero(overrides.index ?? point?.index ?? index),
    x: normalized.x,
    y: normalized.y,
    row: integerOrNull(overrides.row ?? point?.row ?? point?.y),
    col: integerOrNull(overrides.col ?? point?.col ?? point?.x),
    label: stringOrNull(overrides.label ?? point?.label ?? point?.name) ?? `Waypoint ${index + 1}`,
    status,
    completed,
    missed,
    warning,
    metrics: cloneJson(overrides.metrics ?? point?.metrics ?? waypointMetrics(point))
  };
}

function waypointMetrics(value = {}) {
  return {
    estimatedArrivalTime: finiteOrNull(value?.estimatedArrivalTime ?? value?.t),
    distance: finiteOrNull(value?.distance ?? value?.segmentDistance),
    energyCost: finiteOrNull(value?.energyCost ?? value?.energy ?? value?.segmentEnergy ?? value?.consumedFuel),
    currentAssist: finiteOrNull(value?.currentAssist),
    currentOpposition: finiteOrNull(value?.currentOpposition),
    crossCurrent: finiteOrNull(value?.crossCurrent),
    hazardPenalty: finiteOrNull(value?.hazardPenalty ?? value?.components?.hazardPenalty),
    sampleValue: finiteOrNull(value?.sampleValue ?? value?.expectedValue ?? value?.actionValue)
  };
}

function extractResultPoints(result) {
  const frames = Array.isArray(result?.routeExecution?.frames) ? result.routeExecution.frames
    : Array.isArray(result?.frames) ? result.frames
    : Array.isArray(result?.trajectories) ? result.trajectories
    : [];
  const points = [];
  for (const [index, frame] of frames.entries()) {
    const point = pointFromFrame(frame, index);
    if (point) points.push(point);
    if (points.length > 500) break;
  }
  return points;
}

function pointFromFrame(frame, index) {
  if (!frame || typeof frame !== 'object') return null;
  const direct = normalizePoint(frame) ?? normalizePoint(frame.position) ?? normalizePoint(frame.cell);
  if (direct) return { ...direct, id: frame.id, label: frame.label ?? `Frame ${index}` };
  const agents = Array.isArray(frame.agents) ? frame.agents : Object.values(frame.agents ?? frame.agentStates ?? {});
  const firstAgent = agents.find((agent) => normalizePoint(agent) || normalizePoint(agent?.position) || normalizePoint(agent?.cell));
  const point = normalizePoint(firstAgent) ?? normalizePoint(firstAgent?.position) ?? normalizePoint(firstAgent?.cell);
  return point ? { ...point, id: firstAgent?.id, label: firstAgent?.label ?? `Frame ${index}` } : null;
}

function hasSegmentOutcomeMetrics(segment) {
  return [segment.energyCost, segment.currentAssist, segment.currentOpposition, segment.crossCurrent, segment.hazardPenalty, segment.sampleValue, segment.duration]
    .some((value) => finiteOrNull(value) != null);
}

function normalizePoint(point) {
  if (!point || typeof point !== 'object') return null;
  const x = finiteOrNull(point.x ?? point.col ?? point.column);
  const y = finiteOrNull(point.y ?? point.row);
  if (x == null || y == null) return null;
  return { x, y };
}

function distanceBetween(from, to) {
  const a = normalizePoint(from);
  const b = normalizePoint(to);
  if (!a || !b) return null;
  return round(Math.hypot(b.x - a.x, b.y - a.y));
}

function durationFromTimes(start, end) {
  const a = finiteOrNull(start);
  const b = finiteOrNull(end);
  return a != null && b != null ? Math.max(0, round(b - a)) : null;
}

function normalizeWarnings(warnings) {
  if (!warnings) return [];
  return (Array.isArray(warnings) ? warnings : [warnings]).map((warning) => String(warning ?? '').trim()).filter(Boolean);
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
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

function integerOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function stringOrNull(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function cloneJson(value) {
  if (value == null) return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function round(value) {
  return Math.round(Number(value) * 1000) / 1000;
}