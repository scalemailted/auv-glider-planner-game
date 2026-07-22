const HeadlessFlow = require('./HeadlessFlow.js')
const MotionEnvironmentSampler = require('./MotionEnvironmentSampler.js')
const GliderMotionSchema = require('./GliderMotionSchema.js')
const MotionCostGraphSchema = require('./MotionCostGraphSchema.js')
const MOTION_EDGE_COST_ESTIMATOR_VERSION = 'motion-edge-cost-estimator-sim-r1';

 function estimateMotionEdgeCost({
  fromNode,
  toNode,
  fieldPack = null,
  waterColumnConfig = null,
  bathymetry = null,
  motionConfig: motionConfigInput = {},
  config: configInput = {},
  departureTimeSeconds = null
} = {}) {
  const config = configInput?.type === 'anchor.motion.cost-graph-config' ? configInput : MotionCostGraphSchema.createMotionCostGraphConfig(configInput);
  const motionConfig = motionConfigInput?.type === 'anchor.motion.config' ? motionConfigInput : GliderMotionSchema.createGliderMotionConfig(motionConfigInput);
  const from = normalizeNode(fromNode);
  const to = normalizeNode(toNode);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distanceGrid = Math.hypot(dx, dy);
  const distanceMeters = distanceGrid * Number(config.cellSizeMeters ?? 1000);
  const direction = distanceGrid > 1e-9 ? { x: dx / distanceGrid, y: dy / distanceGrid } : { x: 1, y: 0 };
  const sampleCount = Math.max(2, Math.min(9, Math.round(Number(config.sampleCount ?? 5))));
  const samples = sampleEdgeEnvironment({ from, to, sampleCount, fieldPack, waterColumnConfig, bathymetry, config, departureTimeSeconds: departureTimeSeconds ?? from.timeSeconds ?? 0 });
  const currentAssistMean = mean(samples.map((sample) => HeadlessFlow.currentAssist(sample.currentVector, direction)));
  const crossCurrentMean = mean(samples.map((sample) => HeadlessFlow.crossCurrentMagnitude(sample.currentVector, direction)));
  const currentOppositionMean = Math.max(0, -currentAssistMean);
  const hazardExposure = mean(samples.map((sample) => Number(sample.hazard ?? 0)));
  const constraintViolationCount = samples.filter((sample) => Number(sample.constraint ?? 0) >= 0.5).length;
  const depthAccessible = samples.every((sample) => sample.depthAccessible !== false);
  const bottomClearanceValues = samples.map((sample) => sample.bottomClearanceMeters).filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
  const bottomClearanceMinMeters = bottomClearanceValues.length ? Math.min(...bottomClearanceValues) : null;
  const bottomClearanceRisk = bottomClearanceMinMeters === null ? 0 : bottomClearanceMinMeters < 2 ? 1 : bottomClearanceMinMeters < 5 ? (5 - bottomClearanceMinMeters) / 3 : 0;
  const throughWaterGridPerSecond = Math.max(0.0001, Number(motionConfig.gliderSpeed ?? 1) / 60);
  const assistGridPerSecond = Number(config.currentCouplingScale ?? 1) * Number(motionConfig.driftGain ?? 1) * currentAssistMean / 60;
  const effectiveGridPerSecond = Math.max(0.0001, throughWaterGridPerSecond + assistGridPerSecond);
  const durationSeconds = distanceGrid / effectiveGridPerSecond;
  const expectedTrackError = Math.max(0, crossCurrentMean * durationSeconds / 60);
  const energyCost = estimateEnergy({ distanceGrid, durationSeconds, currentOppositionMean, crossCurrentMean, expectedTrackError, hazardExposure, motionConfig });
  const batteryFractionCost = Number(motionConfig.energyBudget ?? 0) > 0 ? energyCost / Number(motionConfig.energyBudget) : null;
  const statusInfo = edgeStatus({ from, to, distanceGrid, depthAccessible, constraintViolationCount, bottomClearanceRisk, config });
  const metricCosts = normalizeMetricCosts({
    distance: distanceMeters,
    time: durationSeconds,
    energy: energyCost,
    currentAssist: Math.max(0, 1 - currentAssistMean),
    currentOpposition: currentOppositionMean,
    crossCurrent: crossCurrentMean,
    trackError: expectedTrackError,
    bathymetryRisk: bottomClearanceRisk,
    sciencePriority: Math.max(0, 1 - Number(to.sciencePriority ?? 0))
  });
  const weightedCost = ['feasible', 'warning'].includes(statusInfo.status)
    ? costForMetric(config.metricId, metricCosts, config.weights)
    : null;
  return MotionCostGraphSchema.createMotionCostGraphEdge({
    edgeId: `${from.nodeId}->${to.nodeId}@${Math.round(Number(departureTimeSeconds ?? from.timeSeconds ?? 0))}`,
    fromNodeId: from.nodeId,
    toNodeId: to.nodeId,
    directed: config.directed !== false,
    departureTimeSeconds: Number(departureTimeSeconds ?? from.timeSeconds ?? 0) || 0,
    arrivalTimeSeconds: Number(departureTimeSeconds ?? from.timeSeconds ?? 0) + durationSeconds,
    status: statusInfo.status,
    distanceMeters,
    durationSeconds,
    energyCost,
    batteryFractionCost,
    currentAssistMean,
    currentOppositionMean,
    crossCurrentMean,
    expectedTrackError,
    bathymetryRisk: bottomClearanceRisk,
    bottomClearanceMinMeters,
    hazardExposure,
    depthAccessible,
    diveProfileId: config.diveProfileId,
    motionModelId: motionConfig.motionModelId,
    destinationSciencePriority: to.sciencePriority,
    destinationUncertainty: to.uncertainty,
    metricCosts,
    weightedCost,
    evaluationMethod: 'sampledApproximation',
    warnings: [...statusInfo.warnings, ...samples.flatMap((sample) => sample.warnings ?? [])]
  });
}

 function edgeCostEstimatorSummary(edges = []) {
  const list = Array.isArray(edges) ? edges : [];
  const feasible = list.filter((edge) => edge.status === 'feasible' || edge.status === 'warning');
  return {
    type: 'anchor.motion.edge-cost-estimator-summary',
    version: MOTION_EDGE_COST_ESTIMATOR_VERSION,
    edgeCount: list.length,
    feasibleCount: feasible.length,
    blockedCount: list.length - feasible.length,
    meanWeightedCost: mean(feasible.map((edge) => edge.weightedCost)),
    meanEnergyCost: mean(feasible.map((edge) => edge.energyCost)),
    meanDurationSeconds: mean(feasible.map((edge) => edge.durationSeconds)),
    meanCurrentAssist: mean(feasible.map((edge) => edge.currentAssistMean)),
    meanCurrentOpposition: mean(feasible.map((edge) => edge.currentOppositionMean)),
    meanCrossCurrent: mean(feasible.map((edge) => edge.crossCurrentMean)),
    publicSafe: true,
    hiddenTruthIncluded: false,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

function sampleEdgeEnvironment({ from, to, sampleCount, fieldPack, waterColumnConfig, bathymetry, config, departureTimeSeconds }) {
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const alpha = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const x = from.x + (to.x - from.x) * alpha;
    const y = from.y + (to.y - from.y) * alpha;
    const zIndex = Math.round(from.z + (to.z - from.z) * alpha);
    const depthLayerId = fieldPack?.grid?.depthLayers?.[zIndex] ?? waterColumnConfig?.depthLayerIds?.[zIndex] ?? from.depthLayerId ?? 'surface';
    samples.push(MotionEnvironmentSampler.sampleMotionEnvironment({
      fieldPack,
      waterColumnConfig,
      bathymetry,
      state: { x, y, z: zIndex, zIndex, depthLayerId },
      timeSeconds: Number(departureTimeSeconds ?? 0),
      options: { minimumBottomClearanceMeters: config.minimumBottomClearanceMeters ?? 2 }
    }));
  }
  return samples;
}

function edgeStatus({ from, to, distanceGrid, depthAccessible, constraintViolationCount, bottomClearanceRisk, config }) {
  const warnings = [];
  if (!Number.isFinite(distanceGrid) || distanceGrid <= 0) return { status: 'missingData', warnings: ['Edge has zero or invalid distance.'] };
  if (Number(config.maxEdgeDistance ?? 0) > 0 && distanceGrid > Number(config.maxEdgeDistance)) return { status: 'blocked', warnings: ['Edge exceeds configured maxEdgeDistance.'] };
  if (from.accessible === false || to.accessible === false || !depthAccessible) return { status: 'bottomClearanceRisk', warnings: ['One or more endpoint/depth samples are inaccessible.'] };
  if (constraintViolationCount > 0) return { status: 'constraintViolation', warnings: [`Constraint mask hit at ${constraintViolationCount} edge sample(s).`] };
  if (bottomClearanceRisk >= 1) return { status: 'bottomClearanceRisk', warnings: ['Bottom clearance below teaching threshold.'] };
  if (bottomClearanceRisk > 0) warnings.push('Bottom clearance is near teaching threshold.');
  return { status: warnings.length ? 'warning' : 'feasible', warnings };
}

function estimateEnergy({ distanceGrid, durationSeconds, currentOppositionMean, crossCurrentMean, expectedTrackError, hazardExposure, motionConfig }) {
  const model = motionConfig.energyModel ?? {};
  return round(
    Number(model.basePerSecond ?? 0.004) * durationSeconds
    + Number(model.distanceScale ?? 0.18) * distanceGrid
    + Number(model.oppositionScale ?? 1.8) * currentOppositionMean * durationSeconds / 60
    + Number(model.crossCurrentScale ?? 0.35) * crossCurrentMean * durationSeconds / 60
    + 0.08 * expectedTrackError
    + 0.05 * hazardExposure
  );
}

function costForMetric(metricId, metricCosts, weights = {}) {
  if (metricId && metricId !== 'balanced' && Number.isFinite(Number(metricCosts[metricId]))) return round(metricCosts[metricId]);
  const cost = Object.entries(weights ?? {}).reduce((sum, [key, weight]) => sum + Number(weight ?? 0) * Number(metricCosts[key] ?? 0), 0);
  return round(Math.max(0, cost));
}

function normalizeMetricCosts(costs) {
  return Object.fromEntries(Object.entries(costs).map(([key, value]) => [key, round(Number(value) || 0)]));
}

function normalizeNode(node = {}) {
  return {
    ...node,
    nodeId: String(node.nodeId ?? node.id ?? ''),
    x: Number(node.x ?? node.col ?? 0),
    y: Number(node.y ?? node.row ?? 0),
    z: Number(node.zIndex ?? node.z ?? 0),
    zIndex: Number(node.zIndex ?? node.z ?? 0),
    timeSeconds: Number.isFinite(Number(node.timeSeconds)) ? Number(node.timeSeconds) : null
  };
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? round(finite.reduce((sum, value) => sum + value, 0) / finite.length) : 0;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}


module.exports = {MOTION_EDGE_COST_ESTIMATOR_VERSION, estimateMotionEdgeCost, edgeCostEstimatorSummary}