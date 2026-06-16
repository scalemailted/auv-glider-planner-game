import {
  extractRouteGeometryFromRouteExecutionRecord,
  normalizeBenchmarkRouteGeometry,
  routeGeometryStats
} from './BenchmarkRouteGeometryAdapter.js';

export const BENCHMARK_ROUTE_OVERLAY_VIEW_MODEL_VERSION = 'benchmark-route-overlay-view-model-p4';

const DEFAULT_LAYER = 'routeStatus';

const LAYERS = [
  { id: 'routeStatus', label: 'Route Status', description: 'Completion, blocked, warning, or partial segment status.' },
  { id: 'scoreContribution', label: 'Score Contribution', description: 'Approximate contribution from available sample, energy, hazard, and redundancy metrics.' },
  { id: 'energyCost', label: 'Energy Cost', description: 'Energy cost when segment energy is available.' },
  { id: 'hazards', label: 'Hazards', description: 'Hazard penalties and hazard warnings from existing route/debrief data.' },
  { id: 'currentAssist', label: 'Current Assist', description: 'Segments with available favorable current assistance.' },
  { id: 'currentOpposition', label: 'Current Opposition', description: 'Segments with available opposing current or negative assist.' },
  { id: 'crossCurrentRisk', label: 'Cross-Current Risk', description: 'Segments with available cross-current exposure.' },
  { id: 'sampleValue', label: 'Sample Value', description: 'Sample or expected-value contribution when available.' },
  { id: 'waypointCompletion', label: 'Waypoint Completion', description: 'Waypoint completed, missed, warning, or pending status.' },
  { id: 'attemptComparison', label: 'Attempt Comparison', description: 'Active route plus available attempt labels for the same benchmark episode.' }
];

export function buildBenchmarkRouteOverlayViewModel({
  attemptSet = null,
  activeAttempt = null,
  routeExecutionRecord = null,
  routeGeometry = null,
  routeReviewViewModel = null,
  comparisonViewModel = null,
  selectedOverlayLayer = DEFAULT_LAYER,
  selectedSegmentIndex = null,
  selectedWaypointIndex = null,
  selectedOverlayAttemptId = null
} = {}) {
  const geometry = normalizeBenchmarkRouteGeometry(routeGeometry ?? extractRouteGeometryFromRouteExecutionRecord(routeExecutionRecord));
  const layer = normalizeLayerId(selectedOverlayLayer);
  const stats = routeGeometryStats(geometry);
  const segmentStyles = Object.fromEntries(geometry.segments.map((segment) => [segment.index, segmentStyleForLayer(segment, geometry.segments, layer)]));
  const waypointStyles = Object.fromEntries(geometry.waypoints.map((waypoint) => [waypoint.index, waypointStyleForLayer(waypoint, layer)]));
  const segments = geometry.segments.map((segment) => ({
    ...segment,
    className: segmentStyles[segment.index],
    selected: selectedSegmentIndex != null && Number(selectedSegmentIndex) === segment.index
  }));
  const waypoints = geometry.waypoints.map((waypoint) => ({
    ...waypoint,
    className: waypointStyles[waypoint.index],
    selected: selectedWaypointIndex != null && Number(selectedWaypointIndex) === waypoint.index
  }));
  const selectedSegment = segments.find((segment) => segment.selected) ?? null;
  const selectedWaypoint = waypoints.find((waypoint) => waypoint.selected) ?? null;
  const attempts = normalizeAttempts(attemptSet, comparisonViewModel, activeAttempt);
  const attemptRoutes = buildAttemptRoutes({ attemptSet, activeAttempt, routeExecutionRecord, routeGeometry: geometry, selectedOverlayAttemptId });
  const requestedOverlayAttemptId = selectedOverlayAttemptId == null ? null : String(selectedOverlayAttemptId);
  const resolvedOverlayAttemptId = requestedOverlayAttemptId && attemptRoutes.some((route) => route.attemptId === requestedOverlayAttemptId)
    ? requestedOverlayAttemptId
    : attemptRoutes.find((route) => route.primary)?.attemptId ?? attempts.at(-1)?.attemptId ?? null;
  const warnings = uniqueStrings([
    ...geometry.warnings,
    ...(Array.isArray(routeReviewViewModel?.warnings) ? routeReviewViewModel.warnings : []),
    ...(attempts.length <= 1 ? ['Only one executed attempt is available in this session. Export more attempts or import solver results to compare routes.'] : [])
  ]);

  return {
    version: BENCHMARK_ROUTE_OVERLAY_VIEW_MODEL_VERSION,
    benchmarkMode: comparisonViewModel?.benchmarkMode ?? attemptSet?.benchmarkMode ?? routeExecutionRecord?.benchmarkMode ?? 'plannerBenchmark',
    episodeId: comparisonViewModel?.episodeId ?? attemptSet?.episodeId ?? routeExecutionRecord?.episodeId ?? null,
    attemptId: geometry.attemptId ?? activeAttempt?.attemptId ?? routeExecutionRecord?.attemptId ?? null,
    attemptSource: geometry.attemptSource ?? activeAttempt?.attemptSource ?? routeExecutionRecord?.attemptSource ?? null,
    routeSourceLabel: geometry.routeSourceLabel ?? activeAttempt?.routeSourceLabel ?? routeExecutionRecord?.routeSourceLabel ?? 'Benchmark Route',
    fairnessLabel: geometry.fairnessLabel ?? activeAttempt?.fairnessLabel ?? routeExecutionRecord?.fairnessLabel ?? comparisonViewModel?.fairnessLabel ?? 'No fairness label',
    selectedOverlayLayer: layer,
    selectedOverlayAttemptId: resolvedOverlayAttemptId,
    overlayLayerOptions: benchmarkRouteOverlayLayerOptions(),
    bounds: geometry.bounds,
    waypoints,
    segments,
    routePath: buildRoutePath(segments),
    attemptRoutes,
    markers: waypoints.map((waypoint) => ({ waypointId: waypoint.id, index: waypoint.index, x: waypoint.x, y: waypoint.y, label: waypoint.label, className: waypoint.className })),
    segmentStyles,
    waypointStyles,
    selectedSegment,
    selectedWaypoint,
    legend: legendForLayer(layer),
    warnings,
    explanation: {
      summary: 'Route Overlay shows the executed or planned path using the data available from the existing simulator and debrief records.',
      classes: 'Segment colors/classes explain route outcomes such as completion, energy cost, hazards, current assist, current opposition, or cross-current risk.',
      boundary: 'This visualization does not compute a new path. It reviews the path that was already planned and simulated.',
      partial: geometry.partial ? 'Segment-level metrics are partial. The route is drawn from available waypoint geometry.' : null
    },
    stats,
    attemptComparison: {
      attemptCount: attempts.length,
      attempts,
      routeGeometryCount: attemptRoutes.filter((route) => route.hasRouteGeometry).length,
      selectedOverlayAttemptId: resolvedOverlayAttemptId,
      multiAttemptOverlayAvailable: attemptRoutes.filter((route) => route.hasRouteGeometry).length > 1
    },
    usesExistingSimulation: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}

export function benchmarkRouteOverlayLayerOptions() {
  return LAYERS.map((layer) => ({ ...layer }));
}

export function benchmarkRouteOverlaySummary(viewModel = {}) {
  return {
    version: viewModel.version ?? BENCHMARK_ROUTE_OVERLAY_VIEW_MODEL_VERSION,
    benchmarkMode: viewModel.benchmarkMode ?? 'plannerBenchmark',
    episodeId: viewModel.episodeId ?? null,
    attemptId: viewModel.attemptId ?? null,
    selectedOverlayLayer: viewModel.selectedOverlayLayer ?? DEFAULT_LAYER,
    waypointCount: Array.isArray(viewModel.waypoints) ? viewModel.waypoints.length : 0,
    segmentCount: Array.isArray(viewModel.segments) ? viewModel.segments.length : 0,
    warningCount: Array.isArray(viewModel.warnings) ? viewModel.warnings.length : 0,
    routeSourceLabel: viewModel.routeSourceLabel ?? null,
    fairnessLabel: viewModel.fairnessLabel ?? null,
    selectedSegmentIndex: viewModel.selectedSegment?.index ?? null,
    selectedWaypointIndex: viewModel.selectedWaypoint?.index ?? null,
    selectedOverlayAttemptId: viewModel.selectedOverlayAttemptId ?? null,
    multiAttemptRouteGeometryCount: viewModel.attemptComparison?.routeGeometryCount ?? 0,
    multiAttemptOverlayAvailable: Boolean(viewModel.attemptComparison?.multiAttemptOverlayAvailable),
    usesExistingSimulation: true,
    usesNewPlanner: false,
    usesMissionScoringRedesign: false,
    usesMARL: false
  };
}

export function selectBenchmarkRouteSegment(viewModel, segmentIndex) {
  const index = Number(segmentIndex);
  const segments = (Array.isArray(viewModel?.segments) ? viewModel.segments : []).map((segment) => ({
    ...segment,
    selected: Number.isFinite(index) && segment.index === index
  }));
  return {
    ...viewModel,
    segments,
    selectedSegment: segments.find((segment) => segment.selected) ?? null
  };
}

export function selectBenchmarkWaypoint(viewModel, waypointIndex) {
  const index = Number(waypointIndex);
  const waypoints = (Array.isArray(viewModel?.waypoints) ? viewModel.waypoints : []).map((waypoint) => ({
    ...waypoint,
    selected: Number.isFinite(index) && waypoint.index === index
  }));
  return {
    ...viewModel,
    waypoints,
    selectedWaypoint: waypoints.find((waypoint) => waypoint.selected) ?? null
  };
}

function buildAttemptRoutes({ attemptSet = null, activeAttempt = null, routeExecutionRecord = null, routeGeometry = null, selectedOverlayAttemptId = null } = {}) {
  const raw = [];
  if (Array.isArray(attemptSet?.attempts)) raw.push(...attemptSet.attempts);
  if (activeAttempt) raw.push(activeAttempt);
  if (!raw.length && routeExecutionRecord) raw.push({
    attemptId: routeExecutionRecord.attemptId ?? routeExecutionRecord.resultId ?? routeExecutionRecord.planId,
    attemptSource: routeExecutionRecord.attemptSource,
    routeSourceLabel: routeExecutionRecord.routeSourceLabel,
    fairnessLabel: routeExecutionRecord.fairnessLabel,
    status: routeExecutionRecord.validation?.status,
    routeExecutionRecord,
    routeGeometry
  });
  const seen = new Set();
  const rawIds = raw.map((attempt, index) => String(attempt?.attemptId ?? attempt?.resultId ?? attempt?.planId ?? `attempt-${index + 1}`));
  const requestedId = selectedOverlayAttemptId == null ? null : String(selectedOverlayAttemptId);
  const activeId = requestedId && rawIds.includes(requestedId)
    ? requestedId
    : String(activeAttempt?.attemptId ?? routeGeometry?.attemptId ?? routeExecutionRecord?.attemptId ?? routeExecutionRecord?.resultId ?? rawIds.at(-1) ?? '');
  return raw.map((attempt, index) => {
    const attemptId = String(attempt?.attemptId ?? attempt?.resultId ?? attempt?.planId ?? `attempt-${index + 1}`);
    if (seen.has(attemptId)) return null;
    seen.add(attemptId);
    let geometry = geometryForAttempt(attempt);
    if ((!geometry.segments.length && !geometry.waypoints.length) && (attemptId === activeId || (!activeId && index === raw.length - 1))) {
      geometry = normalizeBenchmarkRouteGeometry(routeGeometry);
    }
    const hasRouteGeometry = Boolean(geometry.segments.length || geometry.waypoints.length);
    const primary = activeId ? attemptId === activeId : attempt === activeAttempt || index === raw.length - 1;
    const className = primary ? 'attempt-primary' : hasRouteGeometry ? 'attempt-secondary' : 'attempt-muted';
    return {
      attemptId,
      attemptSource: attempt?.attemptSource ?? geometry.attemptSource ?? null,
      routeSourceLabel: attempt?.routeSourceLabel ?? geometry.routeSourceLabel ?? `Attempt ${index + 1}`,
      fairnessLabel: attempt?.fairnessLabel ?? geometry.fairnessLabel ?? 'No fairness label',
      status: attempt?.status ?? attempt?.routeExecutionRecord?.validation?.status ?? 'unknown',
      primary,
      selected: primary,
      className,
      hasRouteGeometry,
      geometry,
      segments: geometry.segments.map((segment) => ({ ...segment, className })),
      waypoints: geometry.waypoints.map((waypoint) => ({ ...waypoint, className: primary ? 'waypoint-complete' : 'attempt-secondary' })),
      routePath: buildRoutePath(geometry.segments.map((segment) => ({ ...segment, className })))
    };
  }).filter(Boolean).slice(0, 8);
}

function geometryForAttempt(attempt = {}) {
  if (attempt?.routeGeometry) return normalizeBenchmarkRouteGeometry(attempt.routeGeometry);
  if (attempt?.routeOverlay?.geometry) return normalizeBenchmarkRouteGeometry(attempt.routeOverlay.geometry);
  if (attempt?.routeOverlayExport?.geometry) return normalizeBenchmarkRouteGeometry(attempt.routeOverlayExport.geometry);
  if (attempt?.routeExecutionRecord) return extractRouteGeometryFromRouteExecutionRecord(attempt.routeExecutionRecord);
  return normalizeBenchmarkRouteGeometry({ waypoints: [], segments: [], warnings: ['Attempt route geometry is not embedded.'], partial: true });
}

function buildRoutePath(segments) {
  return (Array.isArray(segments) ? segments : []).map((segment) => ({
    segmentIndex: segment.index,
    from: clonePoint(segment.from),
    to: clonePoint(segment.to),
    className: segment.className,
    status: segment.status
  }));
}

function segmentStyleForLayer(segment, segments, layer) {
  const base = statusClass(segment);
  if (layer === 'routeStatus') return base;
  if (layer === 'scoreContribution') return scoreContributionClass(segment);
  if (layer === 'energyCost') return energyClass(segment, segments);
  if (layer === 'hazards') return hazardClass(segment);
  if (layer === 'currentAssist') return finite(segment.currentAssist) > 0 ? 'current-assist' : 'segment-neutral';
  if (layer === 'currentOpposition') return finite(segment.currentOpposition) > 0 || finite(segment.currentAssist) < 0 ? 'current-opposed' : 'segment-neutral';
  if (layer === 'crossCurrentRisk') return finite(segment.crossCurrent) > 0.5 ? 'cross-current-risk' : 'segment-neutral';
  if (layer === 'sampleValue') return finite(segment.sampleValue) > 0 ? 'segment-good' : 'segment-neutral';
  if (layer === 'waypointCompletion') return base;
  if (layer === 'attemptComparison') return 'attempt-primary';
  return base;
}

function waypointStyleForLayer(waypoint, layer) {
  if (waypoint.missed || /missed|failed|invalid|blocked/i.test(String(waypoint.status ?? ''))) return 'waypoint-missed';
  if (waypoint.warning || /warning|partial/i.test(String(waypoint.status ?? ''))) return 'waypoint-warning';
  if (waypoint.completed || /complete|executed|start/i.test(String(waypoint.status ?? ''))) return 'waypoint-complete';
  return layer === 'waypointCompletion' ? 'waypoint-warning' : 'waypoint-complete';
}

function statusClass(segment) {
  const status = String(segment.status ?? '').toLowerCase();
  if (/missed|invalid|failed|blocked|hazard/.test(status)) return 'segment-danger';
  if (Array.isArray(segment.warnings) && segment.warnings.length) return 'segment-warning';
  if (/partial|planned|notstarted/.test(status)) return 'segment-warning';
  if (/complete|executed|executable|success/.test(status)) return 'segment-good';
  return 'segment-neutral';
}

function scoreContributionClass(segment) {
  const sample = finite(segment.sampleValue);
  const cost = finite(segment.energyCost) + finite(segment.hazardPenalty) + finite(segment.redundancyPenalty);
  if (sample > cost && sample > 0) return 'segment-good';
  if (cost > sample && cost > 0) return 'segment-warning';
  return statusClass(segment);
}

function energyClass(segment, segments) {
  const energy = finiteOrNull(segment.energyCost);
  if (energy == null) return 'segment-neutral';
  const maxEnergy = Math.max(...segments.map((candidate) => finite(candidate.energyCost)), 0);
  if (maxEnergy > 0 && energy >= maxEnergy * 0.67) return 'energy-high';
  return 'energy-low';
}

function hazardClass(segment) {
  const hazard = finite(segment.hazardPenalty);
  if (hazard > 0 || /hazard/i.test((segment.warnings ?? []).join(' '))) return 'hazard-risk';
  return 'segment-good';
}

function legendForLayer(layer) {
  const common = {
    routeStatus: [
      ['segment-good', 'Completed/executable', 'Segment completed or executable in existing records.'],
      ['segment-warning', 'Warning/partial', 'Segment has a warning or partial data.'],
      ['segment-danger', 'Blocked/failed', 'Segment status indicates a failure, hazard, or invalid plan.']
    ],
    scoreContribution: [
      ['segment-good', 'Positive contribution', 'Available sample value exceeds available costs.'],
      ['segment-warning', 'Costly contribution', 'Available costs exceed available sample value.'],
      ['segment-neutral', 'No contribution data', 'Score contribution fields are unavailable.']
    ],
    energyCost: [
      ['energy-high', 'Higher energy', 'Segment has high available energy cost.'],
      ['energy-low', 'Lower energy', 'Segment has lower available energy cost.'],
      ['segment-neutral', 'No energy data', 'Energy data is unavailable.']
    ],
    hazards: [
      ['hazard-risk', 'Hazard risk', 'Hazard penalty or hazard warning is available.'],
      ['segment-good', 'No hazard marker', 'No hazard marker is available for this segment.']
    ],
    currentAssist: [
      ['current-assist', 'Current assist', 'Available current assist is favorable.'],
      ['segment-neutral', 'No assist marker', 'No assist marker is available.']
    ],
    currentOpposition: [
      ['current-opposed', 'Current opposed', 'Available current metric opposes the segment.'],
      ['segment-neutral', 'No opposition marker', 'No opposition marker is available.']
    ],
    crossCurrentRisk: [
      ['cross-current-risk', 'Cross-current risk', 'Available cross-current metric is elevated.'],
      ['segment-neutral', 'No cross-current marker', 'Cross-current risk is unavailable or low.']
    ],
    sampleValue: [
      ['segment-good', 'Sample value present', 'Segment has available sample or expected value.'],
      ['segment-neutral', 'No sample value', 'Sample value is unavailable.']
    ],
    waypointCompletion: [
      ['waypoint-complete', 'Complete/start', 'Waypoint is complete, executed, or a start.'],
      ['waypoint-warning', 'Warning/pending', 'Waypoint is pending or has a warning.'],
      ['waypoint-missed', 'Missed/invalid', 'Waypoint is missed, blocked, or invalid.']
    ],
    attemptComparison: [
      ['attempt-primary', 'Active attempt', 'The visible route is the active attempt.'],
      ['attempt-secondary', 'Other attempts', 'Other attempts are summarized when route geometry is available.'],
      ['attempt-muted', 'Unavailable route', 'Attempt route geometry is not available in this session.']
    ]
  };
  return (common[layer] ?? common.routeStatus).map(([className, label, description]) => ({ className, label, description }));
}

function normalizeAttempts(attemptSet, comparisonViewModel, activeAttempt) {
  const attempts = Array.isArray(attemptSet?.attempts) && attemptSet.attempts.length
    ? attemptSet.attempts
    : Array.isArray(comparisonViewModel?.attempts) ? comparisonViewModel.attempts : [];
  const merged = activeAttempt ? [...attempts, activeAttempt] : attempts;
  const seen = new Set();
  return merged.map((attempt, index) => ({
    attemptId: String(attempt?.attemptId ?? attempt?.resultId ?? `attempt-${index + 1}`),
    attemptSource: attempt?.attemptSource ?? null,
    routeSourceLabel: attempt?.routeSourceLabel ?? attempt?.attemptSourceLabel ?? `Attempt ${index + 1}`,
    fairnessLabel: attempt?.fairnessLabel ?? 'No fairness label',
    status: attempt?.status ?? attempt?.routeExecutionRecord?.validation?.status ?? 'unknown',
    hasRouteGeometry: Boolean(attempt?.routeGeometry?.segments?.length || attempt?.routeGeometry?.waypoints?.length || attempt?.routeExecutionRecord?.segments?.length)
  })).filter((attempt) => {
    const key = attempt.attemptId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeLayerId(value) {
  const text = String(value ?? '').trim();
  return LAYERS.some((layer) => layer.id === text) ? text : DEFAULT_LAYER;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function clonePoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)) ? { x: Number(point.x), y: Number(point.y) } : null;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}