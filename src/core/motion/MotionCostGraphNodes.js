import { sampleNearest3d } from '../headless/runtime/HeadlessGrid.js';
import { sampleMotionEnvironment } from './MotionEnvironmentSampler.js';
import {
  createMotionCostGraphConfig,
  createMotionCostGraphNode
} from './MotionCostGraphSchema.js';

export const MOTION_COST_GRAPH_NODES_VERSION = 'motion-cost-graph-nodes-sim-r1';

export function createMotionCostGraphNodes({
  config: configInput = {},
  fieldPack = null,
  waterColumnConfig = null,
  bathymetry = null,
  plan = null,
  importedNodes = null
} = {}) {
  const config = configInput?.type === 'anchor.motion.cost-graph-config'
    ? configInput
    : createMotionCostGraphConfig(configInput);
  const grid = fieldPack?.grid ?? config.grid ?? { width: 1, height: 1, depthLayers: ['surface'], depthCount: 1 };
  const baseNodes = nodesForSource(config, { fieldPack, waterColumnConfig, bathymetry, plan, importedNodes, grid });
  const nodes = expandTimeSlices(baseNodes, config).slice(0, config.maxNodes);
  return {
    type: 'anchor.motion.cost-graph-node-set',
    version: MOTION_COST_GRAPH_NODES_VERSION,
    nodeSourceId: config.nodeSourceId,
    timeMode: config.timeMode,
    nodes,
    summary: motionCostNodeSummary(nodes, config),
    warnings: baseNodes.length > nodes.length ? [`Node count clipped from ${baseNodes.length} to ${nodes.length}.`] : [],
    publicSafe: true,
    hiddenTruthIncluded: false,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    notA: ['not route planner', 'not route optimizer', 'not official scoring', 'not MARL/RL']
  };
}

export function motionCostNodeSummary(nodes = [], configInput = {}) {
  const config = configInput?.type === 'anchor.motion.cost-graph-config' ? configInput : createMotionCostGraphConfig(configInput);
  const list = Array.isArray(nodes) ? nodes : [];
  const byDepth = {};
  const bySource = {};
  let accessibleCount = 0;
  let blockedCount = 0;
  let maxHazard = 0;
  let maxSciencePriority = 0;
  for (const node of list) {
    byDepth[node.depthLayerId ?? `z${node.zIndex ?? 0}`] = (byDepth[node.depthLayerId ?? `z${node.zIndex ?? 0}`] ?? 0) + 1;
    bySource[node.source ?? 'unknown'] = (bySource[node.source ?? 'unknown'] ?? 0) + 1;
    if (node.accessible !== false) accessibleCount += 1;
    else blockedCount += 1;
    maxHazard = Math.max(maxHazard, Number(node.hazard ?? 0));
    maxSciencePriority = Math.max(maxSciencePriority, Number(node.sciencePriority ?? 0));
  }
  return {
    type: 'anchor.motion.cost-graph-node-summary',
    version: MOTION_COST_GRAPH_NODES_VERSION,
    nodeSourceId: config.nodeSourceId,
    nodeCount: list.length,
    accessibleCount,
    blockedCount,
    byDepth,
    bySource,
    timeMode: config.timeMode,
    departureTimeCount: config.departureTimesSeconds?.length ?? 0,
    maxHazard: round(maxHazard),
    maxSciencePriority: round(maxSciencePriority),
    publicSafe: true,
    hiddenTruthIncluded: false,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

function nodesForSource(config, context) {
  if (Array.isArray(context.importedNodes) && context.importedNodes.length) {
    return context.importedNodes.map((node, index) => normalizeNodeFromInput(node, config, context, index));
  }
  if (config.nodeSourceId === 'planWaypoints') return nodesFromPlan(config, context);
  if (config.nodeSourceId === 'samplingPriorityCandidates') return nodesFromPriority(config, context);
  return nodesFromGrid(config, context, config.nodeSourceId === 'bathymetryAccessibleGrid');
}

function nodesFromGrid(config, { fieldPack, waterColumnConfig, bathymetry, grid }, accessibleOnly) {
  const nodes = [];
  const width = Math.max(1, Number(grid.width ?? 1));
  const height = Math.max(1, Number(grid.height ?? 1));
  const depthLayers = grid.depthLayers?.length ? grid.depthLayers : ['surface'];
  const step = Math.max(1, Number(config.gridStep ?? 4));
  for (let z = 0; z < depthLayers.length; z += 1) {
    for (let row = 0; row < height; row += step) {
      for (let col = 0; col < width; col += step) {
        const node = buildNode({ col, row, z, config, fieldPack, waterColumnConfig, bathymetry, source: config.nodeSourceId });
        if (accessibleOnly && node.accessible === false) continue;
        nodes.push(node);
      }
    }
  }
  return nodes;
}

function nodesFromPriority(config, { fieldPack, waterColumnConfig, bathymetry, grid }) {
  const priority = fieldPack?.fields?.A_global ?? fieldPack?.fields?.P_unknown ?? fieldPack?.fields?.U_uncertainty;
  const width = Math.max(1, Number(grid.width ?? 1));
  const height = Math.max(1, Number(grid.height ?? 1));
  const depthLayers = grid.depthLayers?.length ? grid.depthLayers : ['surface'];
  const candidates = [];
  for (let z = 0; z < depthLayers.length; z += 1) {
    for (let row = 0; row < height; row += 1) {
      for (let col = 0; col < width; col += 1) {
        const value = sampleNearest3d(priority, col, row, z);
        if (!Number.isFinite(Number(value))) continue;
        candidates.push({ col, row, z, value: Number(value) });
      }
    }
  }
  candidates.sort((a, b) => b.value - a.value || a.z - b.z || a.row - b.row || a.col - b.col);
  const selected = [];
  const minSpacing = Math.max(1, Math.floor(Number(config.gridStep ?? 3) * 0.75));
  for (const candidate of candidates) {
    if (selected.some((node) => node.z === candidate.z && Math.hypot(node.col - candidate.col, node.row - candidate.row) < minSpacing)) continue;
    selected.push(candidate);
    if (selected.length >= config.maxNodes) break;
  }
  return selected.map(({ col, row, z }) => buildNode({ col, row, z, config, fieldPack, waterColumnConfig, bathymetry, source: 'samplingPriorityCandidates' }));
}

function nodesFromPlan(config, { fieldPack, waterColumnConfig, bathymetry, plan }) {
  const waypoints = collectPlanWaypoints(plan);
  return waypoints.map((waypoint, index) => buildNode({
    col: finiteNumber(waypoint.x, 0),
    row: finiteNumber(waypoint.y, 0),
    z: finiteNumber(waypoint.zIndex ?? waypoint.z, 0),
    timeSeconds: waypoint.estimatedArrivalTime ?? waypoint.timeSeconds ?? waypoint.t ?? null,
    config,
    fieldPack,
    waterColumnConfig,
    bathymetry,
    source: 'planWaypoints',
    nodeId: waypoint.waypointId ?? waypoint.id ?? `plan-node-${index + 1}`
  }));
}

function normalizeNodeFromInput(node, config, { fieldPack, waterColumnConfig, bathymetry }, index) {
  return buildNode({
    col: finiteNumber(node.x ?? node.col, 0),
    row: finiteNumber(node.y ?? node.row, 0),
    z: finiteNumber(node.zIndex ?? node.z, 0),
    timeSeconds: node.timeSeconds ?? null,
    config,
    fieldPack,
    waterColumnConfig,
    bathymetry,
    source: 'importedSolverNodes',
    nodeId: node.nodeId ?? node.id ?? `imported-node-${index + 1}`
  });
}

function buildNode({ col, row, z, timeSeconds = null, config, fieldPack, waterColumnConfig, bathymetry, source, nodeId = null }) {
  const zIndex = clampInt(Math.round(Number(z) || 0), 0, Math.max(0, (fieldPack?.grid?.depthCount ?? fieldPack?.grid?.depthLayers?.length ?? 1) - 1));
  const depthLayerId = fieldPack?.grid?.depthLayers?.[zIndex] ?? waterColumnConfig?.depthLayerIds?.[zIndex] ?? 'surface';
  const env = sampleMotionEnvironment({
    fieldPack,
    waterColumnConfig,
    bathymetry,
    state: { x: col, y: row, z: zIndex, zIndex, depthLayerId },
    timeSeconds: timeSeconds ?? 0,
    options: { minimumBottomClearanceMeters: config.minimumBottomClearanceMeters ?? 2 }
  });
  const sciencePriority = sampleNearest3d(fieldPack?.fields?.A_global, col, row, zIndex);
  const uncertainty = sampleNearest3d(fieldPack?.fields?.U_uncertainty, col, row, zIndex);
  const node = createMotionCostGraphNode({
    nodeId,
    x: col,
    y: row,
    row,
    col,
    z: zIndex,
    zIndex,
    depthLayerId,
    depthMeters: env.depthMeters,
    timeSeconds,
    source,
    accessible: env.depthAccessible !== false && Number(env.constraint ?? 0) < 0.5,
    hazard: env.hazard,
    constraint: env.constraint,
    sciencePriority,
    uncertainty,
    waterColumnLayer: env.waterColumnLayer,
    bathymetryDepthMeters: env.bathymetryDepthMeters,
    warnings: env.warnings ?? []
  });
  node.nodeId = nodeId ?? node.nodeId;
  node.sourceIndex = null;
  return node;
}

function expandTimeSlices(baseNodes, config) {
  if (config.timeMode !== 'configuredDepartureTimes') return baseNodes;
  const times = config.departureTimesSeconds?.length ? config.departureTimesSeconds : [0];
  return baseNodes.flatMap((node) => times.map((timeSeconds) => ({
    ...node,
    timeSeconds,
    nodeId: `${node.nodeId}-t${Math.round(timeSeconds)}`
  })));
}

function collectPlanWaypoints(plan) {
  if (Array.isArray(plan?.waypoints)) return plan.waypoints;
  const agentPlans = Array.isArray(plan?.agentPlans) ? plan.agentPlans : [];
  const selected = agentPlans.find((entry) => Array.isArray(entry.waypoints) && entry.waypoints.length) ?? agentPlans[0];
  const waypoints = [];
  if (selected?.selectedStart) waypoints.push({ ...selected.selectedStart, waypointId: `${selected.agentId ?? 'agent'}-selected-start` });
  waypoints.push(...(selected?.waypoints ?? []));
  return waypoints;
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : min));
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
