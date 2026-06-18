import {
  createMotionCostGraphConfig,
  validateMotionCostGraphConfig,
  validateMotionCostGraphEdge,
  validateMotionCostGraphNode,
  motionCostGraphConfigSummary
} from './MotionCostGraphSchema.js';
import { createMotionCostGraphNodes } from './MotionCostGraphNodes.js';
import { createMotionCostGraphNeighborPairs } from './MotionCostGraphNeighbors.js';
import { estimateMotionEdgeCost, edgeCostEstimatorSummary } from './MotionEdgeCostEstimator.js';
import { sanitizeMotionCostGraphForPublicExport, validateMotionCostGraphPublicSafety } from './MotionCostGraphPublicSafety.js';

export const MOTION_COST_GRAPH_BUILDER_VERSION = 'motion-cost-graph-builder-sim-r1';

export function buildMotionCostGraph({
  config: configInput = {},
  fieldPack = null,
  waterColumnConfig = null,
  bathymetry = null,
  plan = null,
  motionConfig = null,
  importedNodes = null,
  sanitize = true
} = {}) {
  const config = configInput?.type === 'anchor.motion.cost-graph-config' ? configInput : createMotionCostGraphConfig(configInput);
  const nodeSet = createMotionCostGraphNodes({ config, fieldPack, waterColumnConfig, bathymetry, plan, importedNodes });
  const neighborSet = createMotionCostGraphNeighborPairs(nodeSet.nodes, config);
  const nodeById = new Map(nodeSet.nodes.map((node) => [node.nodeId, node]));
  const edges = neighborSet.pairs.map((pair) => estimateMotionEdgeCost({
    fromNode: nodeById.get(pair.fromNodeId) ?? pair.from,
    toNode: nodeById.get(pair.toNodeId) ?? pair.to,
    fieldPack,
    waterColumnConfig,
    bathymetry,
    motionConfig,
    config,
    departureTimeSeconds: pair.departureTimeSeconds
  }));
  const graph = {
    type: 'anchor.benchmark.feasibility-cost-graph',
    version: MOTION_COST_GRAPH_BUILDER_VERSION,
    schemaVersion: '1.0',
    visibilityTier: 'publicScenario',
    publicSafe: true,
    hiddenTruthIncluded: false,
    graphId: `motion-cost-graph-${config.metricId}-${config.nodeSourceId}`,
    config,
    configSummary: motionCostGraphConfigSummary(config),
    nodes: nodeSet.nodes,
    edges,
    nodeSummary: nodeSet.summary,
    neighborSummary: neighborSet.summary,
    edgeSummary: edgeCostEstimatorSummary(edges),
    summary: null,
    warnings: [...(nodeSet.warnings ?? []), ...(neighborSet.warnings ?? [])],
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    browserOfficialScoring: false,
    notA: ['not route planner', 'not route optimizer', 'not official scoring', 'not operational certification', 'not SeaExplorer-validated', 'not MARL/RL']
  };
  graph.summary = motionCostGraphSummary(graph);
  return sanitize ? sanitizeMotionCostGraphForPublicExport(graph) : graph;
}

export function validateMotionCostGraph(graph = {}) {
  const errors = [];
  const warnings = [];
  if (graph?.type !== 'anchor.benchmark.feasibility-cost-graph') errors.push(`Expected anchor.benchmark.feasibility-cost-graph, got ${graph?.type ?? 'missing'}.`);
  const configValidation = validateMotionCostGraphConfig(graph?.config ?? {});
  errors.push(...configValidation.errors.map((entry) => `config: ${entry}`));
  warnings.push(...configValidation.warnings.map((entry) => `config: ${entry}`));
  if (!Array.isArray(graph?.nodes) || graph.nodes.length < 1) errors.push('Cost graph must include nodes[].');
  if (!Array.isArray(graph?.edges)) errors.push('Cost graph must include edges[].');
  for (const [index, node] of (graph.nodes ?? []).entries()) {
    const validation = validateMotionCostGraphNode(node);
    errors.push(...validation.errors.map((entry) => `node ${index + 1}: ${entry}`));
  }
  for (const [index, edge] of (graph.edges ?? []).entries()) {
    const validation = validateMotionCostGraphEdge(edge);
    errors.push(...validation.errors.map((entry) => `edge ${index + 1}: ${entry}`));
    warnings.push(...validation.warnings.map((entry) => `edge ${index + 1}: ${entry}`));
  }
  const safety = validateMotionCostGraphPublicSafety(graph);
  errors.push(...safety.errors);
  warnings.push(...safety.warnings);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, safety };
}

export function motionCostGraphSummary(graph = {}) {
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const statusCounts = countBy(edges, 'status');
  const feasible = edges.filter((edge) => edge.status === 'feasible' || edge.status === 'warning');
  return {
    type: 'anchor.benchmark.feasibility-cost-graph-summary',
    version: MOTION_COST_GRAPH_BUILDER_VERSION,
    graphId: graph.graphId ?? null,
    metricId: graph.config?.metricId ?? null,
    nodeSourceId: graph.config?.nodeSourceId ?? null,
    neighborMode: graph.config?.neighborMode ?? null,
    directed: graph.config?.directed !== false,
    nodeCount: graph.nodes?.length ?? 0,
    edgeCount: edges.length,
    feasibleEdgeCount: feasible.length,
    blockedEdgeCount: edges.length - feasible.length,
    statusCounts,
    meanWeightedCost: mean(feasible.map((edge) => edge.weightedCost)),
    meanEnergyCost: mean(feasible.map((edge) => edge.energyCost)),
    meanDurationSeconds: mean(feasible.map((edge) => edge.durationSeconds)),
    meanCurrentAssist: mean(feasible.map((edge) => edge.currentAssistMean)),
    meanCurrentOpposition: mean(feasible.map((edge) => edge.currentOppositionMean)),
    meanCrossCurrent: mean(feasible.map((edge) => edge.crossCurrentMean)),
    matrixFormat: graph.config?.matrixFormat ?? 'auto',
    publicSafe: graph.publicSafe !== false,
    hiddenTruthIncluded: graph.hiddenTruthIncluded === true,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    browserOfficialScoring: false
  };
}

function countBy(items, key) {
  return (Array.isArray(items) ? items : []).reduce((acc, item) => {
    const value = item?.[key] ?? 'unknown';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? Number((finite.reduce((sum, value) => sum + value, 0) / finite.length).toFixed(6)) : 0;
}
