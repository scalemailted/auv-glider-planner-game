 const MOTION_COST_GRAPH_SCHEMA_VERSION = 'motion-cost-graph-schema-sim-r1';

 const MOTION_COST_METRIC_IDS = Object.freeze([
  'distance',
  'time',
  'energy',
  'currentAssist',
  'currentOpposition',
  'crossCurrent',
  'trackError',
  'bathymetryRisk',
  'sciencePriority',
  'balanced'
]);

 const MOTION_COST_NODE_SOURCE_IDS = Object.freeze([
  'regularGrid',
  'bathymetryAccessibleGrid',
  'samplingPriorityCandidates',
  'planWaypoints',
  'importedSolverNodes',
  'manualFixture'
]);

 const MOTION_COST_EDGE_STATUS_IDS = Object.freeze([
  'feasible',
  'warning',
  'blocked',
  'outOfBounds',
  'constraintViolation',
  'insufficientEnergy',
  'bottomClearanceRisk',
  'missingData'
]);

 const MOTION_COST_TIME_MODE_IDS = Object.freeze([
  'staticSnapshot',
  'configuredDepartureTimes'
]);

 const MOTION_COST_MATRIX_FORMAT_IDS = Object.freeze([
  'sparse',
  'dense',
  'auto'
]);

 const MOTION_COST_NEIGHBOR_MODE_IDS = Object.freeze([
  'grid4',
  'grid8',
  'radius',
  'planSequence',
  'allPairsSmallGraph'
]);

const DEFAULT_WEIGHTS = Object.freeze({
  distance: 0.15,
  time: 0.15,
  energy: 0.25,
  currentOpposition: 0.10,
  crossCurrent: 0.10,
  trackError: 0.10,
  bathymetryRisk: 0.10,
  sciencePriority: -0.05
});

const COST_GRAPH_NOT_A = Object.freeze([
  'not route planner',
  'not route optimizer',
  'not official scoring',
  'not operational certification',
  'not SeaExplorer-validated',
  'not MARL/RL'
]);

 function normalizeMotionCostMetricId(id) {
  return normalizeEnum(id, MOTION_COST_METRIC_IDS, 'energy', { cost: 'energy', duration: 'time', battery: 'energy' });
}

 function normalizeMotionCostNodeSourceId(id) {
  return normalizeEnum(id, MOTION_COST_NODE_SOURCE_IDS, 'regularGrid', { grid: 'regularGrid', bathymetry: 'bathymetryAccessibleGrid', waypoints: 'planWaypoints', imported: 'importedSolverNodes' });
}

 function normalizeMotionCostEdgeStatusId(id) {
  return normalizeEnum(id, MOTION_COST_EDGE_STATUS_IDS, 'missingData', { ok: 'feasible', pass: 'feasible', blockedCell: 'blocked' });
}

 function normalizeMotionCostTimeModeId(id) {
  return normalizeEnum(id, MOTION_COST_TIME_MODE_IDS, 'staticSnapshot', { snapshot: 'staticSnapshot', times: 'configuredDepartureTimes' });
}

 function normalizeMotionCostMatrixFormatId(id) {
  return normalizeEnum(id, MOTION_COST_MATRIX_FORMAT_IDS, 'auto', { adjacency: 'sparse' });
}

 function normalizeMotionCostNeighborModeId(id) {
  return normalizeEnum(id, MOTION_COST_NEIGHBOR_MODE_IDS, 'grid8', { four: 'grid4', eight: 'grid8', all: 'allPairsSmallGraph' });
}

 function createMotionCostGraphConfig(options = {}) {
  const metricId = normalizeMotionCostMetricId(options.metricId ?? options.metric ?? options.costMetric);
  const nodeSourceId = normalizeMotionCostNodeSourceId(options.nodeSourceId ?? options.nodeSource ?? options.costGraphNodeSource);
  const timeMode = normalizeMotionCostTimeModeId(options.timeMode ?? (options.departureTimesSeconds?.length > 1 ? 'configuredDepartureTimes' : 'staticSnapshot'));
  const departureTimesSeconds = normalizeDepartureTimes(options.departureTimesSeconds ?? options.departureTimes ?? [0], timeMode);
  const maxNodes = clampInt(options.maxNodes ?? options.costGraphMaxNodes ?? 80, 1, options.allowLargeGraph === true ? 2000 : 500);
  return {
    type: 'anchor.motion.cost-graph-config',
    version: MOTION_COST_GRAPH_SCHEMA_VERSION,
    metricId,
    nodeSourceId,
    directed: options.directed !== false,
    includeReverseEdges: options.includeReverseEdges !== false,
    neighborMode: normalizeMotionCostNeighborModeId(options.neighborMode ?? options.costGraphNeighborMode),
    gridStep: Math.max(1, Math.round(finiteNumber(options.gridStep ?? options.costGraphGridStep, 4))),
    maxNodes: Math.min(maxNodes, options.allowLargeGraph === true ? maxNodes : 500),
    maxEdgeDistance: Math.max(0, finiteNumber(options.maxEdgeDistance, 1000000000)),
    neighborRadius: Math.max(0.1, finiteNumber(options.neighborRadius ?? options.radius ?? options.costGraphRadius, 2.25)),
    diveProfileId: options.diveProfileId ?? options.diveProfile ?? null,
    motionModelId: options.motionModelId ?? options.motionModel ?? 'depthLayerKinematic',
    visibilityTier: options.visibilityTier ?? 'publicScenario',
    timeMode,
    departureTimesSeconds,
    matrixFormat: normalizeMotionCostMatrixFormatId(options.matrixFormat ?? options.costMatrixFormat),
    weights: normalizeWeights(options.weights),
    cellSizeMeters: Math.max(0.01, finiteNumber(options.cellSizeMeters, 1000)),
    sampleCount: clampInt(options.sampleCount ?? 5, 2, 9),
    publicSafe: options.publicSafe !== false,
    deterministic: true,
    educationalDefaults: true,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    notA: COST_GRAPH_NOT_A.slice()
  };
}

 function createMotionCostGraphNode(options = {}) {
  const row = Math.round(finiteNumber(options.row ?? options.y, 0));
  const col = Math.round(finiteNumber(options.col ?? options.x, 0));
  const z = Math.max(0, Math.round(finiteNumber(options.z ?? options.zIndex, 0)));
  const depthLayerId = options.depthLayerId ?? options.depthLayer ?? 'surface';
  const timeSeconds = finiteOrNull(options.timeSeconds);
  const source = normalizeMotionCostNodeSourceId(options.source ?? options.nodeSourceId ?? 'manualFixture');
  return {
    type: 'anchor.motion.cost-graph-node',
    version: MOTION_COST_GRAPH_SCHEMA_VERSION,
    nodeId: String(options.nodeId ?? `node-${source}-z${z}-r${row}-c${col}${timeSeconds === null ? '' : `-t${Math.round(timeSeconds)}`}`),
    x: finiteNumber(options.x ?? col, col),
    y: finiteNumber(options.y ?? row, row),
    z,
    zIndex: z,
    row,
    col,
    depthLayerId,
    depthMeters: finiteOrNull(options.depthMeters),
    timeSeconds,
    source,
    accessible: options.accessible !== false,
    hazard: finiteNumber(options.hazard, 0),
    constraint: finiteNumber(options.constraint, 0),
    sciencePriority: finiteNumber(options.sciencePriority, 0),
    uncertainty: finiteNumber(options.uncertainty, 0),
    waterColumnLayer: options.waterColumnLayer ?? null,
    bathymetryDepthMeters: finiteOrNull(options.bathymetryDepthMeters),
    publicSafe: options.publicSafe !== false,
    warnings: Array.isArray(options.warnings) ? options.warnings.slice() : []
  };
}

 function createMotionCostGraphEdge(options = {}) {
  const status = normalizeMotionCostEdgeStatusId(options.status ?? 'missingData');
  const weightedCost = status === 'feasible' || status === 'warning' ? finiteOrNull(options.weightedCost) : finiteOrNull(options.weightedCost);
  return {
    type: 'anchor.motion.cost-graph-edge',
    version: MOTION_COST_GRAPH_SCHEMA_VERSION,
    edgeId: String(options.edgeId ?? `${options.fromNodeId ?? 'from'}->${options.toNodeId ?? 'to'}@${Math.round(finiteNumber(options.departureTimeSeconds, 0))}`),
    fromNodeId: String(options.fromNodeId ?? ''),
    toNodeId: String(options.toNodeId ?? ''),
    directed: options.directed !== false,
    departureTimeSeconds: finiteNumber(options.departureTimeSeconds, 0),
    arrivalTimeSeconds: finiteOrNull(options.arrivalTimeSeconds),
    status,
    distanceMeters: finiteNumber(options.distanceMeters, 0),
    durationSeconds: finiteOrNull(options.durationSeconds),
    energyCost: finiteOrNull(options.energyCost),
    batteryFractionCost: finiteOrNull(options.batteryFractionCost),
    currentAssistMean: finiteNumber(options.currentAssistMean, 0),
    currentOppositionMean: finiteNumber(options.currentOppositionMean, 0),
    crossCurrentMean: finiteNumber(options.crossCurrentMean, 0),
    expectedTrackError: finiteNumber(options.expectedTrackError, 0),
    bathymetryRisk: finiteNumber(options.bathymetryRisk, 0),
    bottomClearanceMinMeters: finiteOrNull(options.bottomClearanceMinMeters),
    hazardExposure: finiteNumber(options.hazardExposure, 0),
    depthAccessible: options.depthAccessible !== false,
    diveProfileId: options.diveProfileId ?? null,
    motionModelId: options.motionModelId ?? null,
    destinationSciencePriority: finiteNumber(options.destinationSciencePriority, 0),
    destinationUncertainty: finiteNumber(options.destinationUncertainty, 0),
    metricCosts: normalizeMetricCosts(options.metricCosts),
    weightedCost,
    evaluationMethod: options.evaluationMethod ?? 'sampledApproximation',
    publicSafe: options.publicSafe !== false,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    warnings: Array.isArray(options.warnings) ? options.warnings.slice() : [],
    notA: COST_GRAPH_NOT_A.slice()
  };
}

 function validateMotionCostGraphConfig(config = {}) {
  const errors = [];
  const warnings = [];
  if (config?.type !== 'anchor.motion.cost-graph-config') errors.push(`Expected anchor.motion.cost-graph-config, got ${config?.type ?? 'missing'}.`);
  if (!MOTION_COST_METRIC_IDS.includes(config?.metricId)) errors.push(`Unknown metric ${config?.metricId ?? 'missing'}.`);
  if (!MOTION_COST_NODE_SOURCE_IDS.includes(config?.nodeSourceId)) errors.push(`Unknown node source ${config?.nodeSourceId ?? 'missing'}.`);
  if (!MOTION_COST_TIME_MODE_IDS.includes(config?.timeMode)) errors.push(`Unknown time mode ${config?.timeMode ?? 'missing'}.`);
  if (!MOTION_COST_MATRIX_FORMAT_IDS.includes(config?.matrixFormat)) errors.push(`Unknown matrix format ${config?.matrixFormat ?? 'missing'}.`);
  if (!Array.isArray(config?.departureTimesSeconds) || config.departureTimesSeconds.length < 1) errors.push('departureTimesSeconds must contain at least one departure time.');
  if ((config?.departureTimesSeconds?.length ?? 0) > 3) errors.push('SIM-R1 supports at most three configured departure-time slices.');
  if (Number(config?.maxNodes) > 500 && config?.allowLargeGraph !== true) errors.push('maxNodes exceeds SIM-R1 hard safety limit of 500.');
  if (config?.usesNewPlanner === true || config?.usesRouteOptimizer === true) errors.push('Cost graph config must not claim planning or route optimization.');
  if (config?.usesMARL === true) errors.push('Cost graph config must not claim MARL/RL.');
  if (config?.matrixFormat === 'dense' && Number(config?.maxNodes ?? 0) > 128) warnings.push('Dense matrices should remain bounded; sparse is recommended for larger graphs.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function validateMotionCostGraphNode(node = {}) {
  const errors = [];
  if (node?.type !== 'anchor.motion.cost-graph-node') errors.push(`Expected anchor.motion.cost-graph-node, got ${node?.type ?? 'missing'}.`);
  if (!node?.nodeId) errors.push('nodeId is required.');
  for (const field of ['x', 'y', 'z', 'row', 'col']) if (!Number.isFinite(Number(node?.[field]))) errors.push(`${field} must be finite.`);
  if (node?.publicSafe === false) errors.push('Cost graph nodes must be public-safe for public .');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : 'PASS', errors, warnings: [] };
}

 function validateMotionCostGraphEdge(edge = {}) {
  const errors = [];
  const warnings = [];
  if (edge?.type !== 'anchor.motion.cost-graph-edge') errors.push(`Expected anchor.motion.cost-graph-edge, got ${edge?.type ?? 'missing'}.`);
  if (!edge?.edgeId) errors.push('edgeId is required.');
  if (!edge?.fromNodeId || !edge?.toNodeId) errors.push('fromNodeId and toNodeId are required.');
  if (edge?.fromNodeId === edge?.toNodeId) errors.push('Self-edges are not allowed.');
  if (!MOTION_COST_EDGE_STATUS_IDS.includes(edge?.status)) errors.push(`Unknown edge status ${edge?.status ?? 'missing'}.`);
  if (['feasible', 'warning'].includes(edge?.status)) {
    for (const field of ['distanceMeters', 'durationSeconds', 'energyCost', 'weightedCost']) {
      if (!Number.isFinite(Number(edge?.[field]))) errors.push(`${field} must be finite for ${edge.status} edges.`);
    }
  }
  if (edge?.usesNewPlanner === true || edge?.usesRouteOptimizer === true) errors.push('Cost graph edges must not claim planning or route optimization.');
  if (edge?.usesMARL === true) errors.push('Cost graph edges must not claim MARL/RL.');
  if (edge?.weightedCost !== null && Number(edge?.weightedCost) < 0) warnings.push('Weighted cost is negative; check educational weights.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings };
}

 function motionCostGraphConfigSummary(configInput = {}) {
  const config = configInput?.type === 'anchor.motion.cost-graph-config' ? configInput : createMotionCostGraphConfig(configInput);
  return {
    type: 'anchor.motion.cost-graph-config-summary',
    version: MOTION_COST_GRAPH_SCHEMA_VERSION,
    metricId: config.metricId,
    nodeSourceId: config.nodeSourceId,
    directed: config.directed === true,
    includeReverseEdges: config.includeReverseEdges === true,
    neighborMode: config.neighborMode,
    maxNodes: config.maxNodes,
    timeMode: config.timeMode,
    departureTimeCount: config.departureTimesSeconds?.length ?? 0,
    matrixFormat: config.matrixFormat,
    publicSafe: config.publicSafe !== false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    notA: COST_GRAPH_NOT_A.slice()
  };
}

 function defaultMotionCostGraphWeights() {
  return { ...DEFAULT_WEIGHTS };
}

function normalizeEnum(id, ids, fallback, aliases = {}) {
  const raw = String(id ?? '').trim();
  const value = aliases[raw] ?? raw;
  return ids.includes(value) ? value : fallback;
}

function normalizeDepartureTimes(value, timeMode) {
  const list = (Array.isArray(value) ? value : String(value ?? '0').split(','))
    .map((entry) => Number(entry))
    .filter(Number.isFinite)
    .map((entry) => Math.max(0, entry));
  const unique = [...new Set((list.length ? list : [0]).map((entry) => Number(entry.toFixed(6))))].sort((a, b) => a - b);
  return (timeMode === 'configuredDepartureTimes' ? unique.slice(0, 3) : [unique[0] ?? 0]);
}

function normalizeWeights(weights = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_WEIGHTS).map(([key, value]) => [key, finiteNumber(weights[key], value)]));
}

function normalizeMetricCosts(costs = {}) {
  const normalized = {};
  for (const id of MOTION_COST_METRIC_IDS) normalized[id] = finiteNumber(costs[id], 0);
  return normalized;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampInt(value, min, max) {
  const number = Math.round(finiteNumber(value, min));
  return Math.max(min, Math.min(max, number));
}



module.exports = {MOTION_COST_GRAPH_SCHEMA_VERSION, MOTION_COST_METRIC_IDS, MOTION_COST_NODE_SOURCE_IDS, MOTION_COST_EDGE_STATUS_IDS, MOTION_COST_TIME_MODE_IDS, MOTION_COST_MATRIX_FORMAT_IDS, MOTION_COST_NEIGHBOR_MODE_IDS, normalizeMotionCostMetricId, normalizeMotionCostNodeSourceId, normalizeMotionCostEdgeStatusId, normalizeMotionCostTimeModeId, normalizeMotionCostMatrixFormatId, normalizeMotionCostNeighborModeId, createMotionCostGraphConfig, createMotionCostGraphNode, createMotionCostGraphEdge, validateMotionCostGraphConfig, validateMotionCostGraphNode, validateMotionCostGraphEdge, motionCostGraphConfigSummary, defaultMotionCostGraphWeights}