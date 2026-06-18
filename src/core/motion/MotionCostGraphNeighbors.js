import { createMotionCostGraphConfig } from './MotionCostGraphSchema.js';

export const MOTION_COST_GRAPH_NEIGHBORS_VERSION = 'motion-cost-graph-neighbors-sim-r1';

export function createMotionCostGraphNeighborPairs(nodes = [], configInput = {}) {
  const config = configInput?.type === 'anchor.motion.cost-graph-config' ? configInput : createMotionCostGraphConfig(configInput);
  const list = Array.isArray(nodes) ? nodes : [];
  const warnings = [];
  let pairs = [];
  if (config.neighborMode === 'planSequence') pairs = planSequencePairs(list, config);
  else if (config.neighborMode === 'allPairsSmallGraph') {
    if (list.length > 96) warnings.push('allPairsSmallGraph was clipped to avoid browser-heavy dense graphs.');
    pairs = allPairs(list.slice(0, 96), config);
  } else {
    pairs = spatialPairs(list, config);
  }
  const unique = dedupePairs(pairs);
  return {
    type: 'anchor.motion.cost-graph-neighbor-pairs',
    version: MOTION_COST_GRAPH_NEIGHBORS_VERSION,
    neighborMode: config.neighborMode,
    directed: config.directed === true,
    includeReverseEdges: config.includeReverseEdges === true,
    pairs: unique,
    summary: motionCostNeighborSummary(unique, config),
    warnings,
    publicSafe: true,
    hiddenTruthIncluded: false,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

export function motionCostNeighborSummary(pairs = [], configInput = {}) {
  const config = configInput?.type === 'anchor.motion.cost-graph-config' ? configInput : createMotionCostGraphConfig(configInput);
  return {
    type: 'anchor.motion.cost-graph-neighbor-summary',
    version: MOTION_COST_GRAPH_NEIGHBORS_VERSION,
    neighborMode: config.neighborMode,
    pairCount: Array.isArray(pairs) ? pairs.length : 0,
    directed: config.directed === true,
    includeReverseEdges: config.includeReverseEdges === true,
    publicSafe: true,
    generatedRoute: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

function spatialPairs(nodes, config) {
  const pairs = [];
  const step = Math.max(1, Number(config.gridStep ?? 1));
  const radius = config.neighborMode === 'radius'
    ? Math.max(0.1, Number(config.neighborRadius ?? 2.25)) * step
    : config.neighborMode === 'grid4'
      ? step * 1.1
      : step * 1.6;
  const groups = groupNodes(nodes);
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i];
        const b = group[j];
        const dx = Number(b.x ?? b.col ?? 0) - Number(a.x ?? a.col ?? 0);
        const dy = Number(b.y ?? b.row ?? 0) - Number(a.y ?? a.row ?? 0);
        const distance = Math.hypot(dx, dy);
        if (distance <= 0 || distance > radius) continue;
        if (config.neighborMode === 'grid4' && Math.abs(dx) > 1e-6 && Math.abs(dy) > 1e-6) continue;
        addDirectedPair(pairs, a, b, config);
      }
    }
  }
  return pairs;
}

function allPairs(nodes, config) {
  const pairs = [];
  const groups = groupNodes(nodes);
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) addDirectedPair(pairs, group[i], group[j], config);
    }
  }
  return pairs;
}

function planSequencePairs(nodes, config) {
  const pairs = [];
  const groups = groupNodes(nodes);
  for (const group of groups.values()) {
    const ordered = [...group].sort((a, b) => Number(a.timeSeconds ?? a.sourceIndex ?? 0) - Number(b.timeSeconds ?? b.sourceIndex ?? 0));
    for (let index = 1; index < ordered.length; index += 1) addDirectedPair(pairs, ordered[index - 1], ordered[index], config);
  }
  return pairs;
}

function addDirectedPair(pairs, from, to, config) {
  pairs.push(pair(from, to));
  if (config.directed === false || config.includeReverseEdges === true) pairs.push(pair(to, from));
}

function pair(from, to) {
  return {
    fromNodeId: String(from.nodeId),
    toNodeId: String(to.nodeId),
    from,
    to,
    distanceGrid: round(Math.hypot(Number(to.x ?? 0) - Number(from.x ?? 0), Number(to.y ?? 0) - Number(from.y ?? 0))),
    sameDepthLayer: Number(from.zIndex ?? from.z ?? 0) === Number(to.zIndex ?? to.z ?? 0),
    departureTimeSeconds: Number.isFinite(Number(from.timeSeconds)) ? Number(from.timeSeconds) : 0
  };
}

function groupNodes(nodes) {
  const groups = new Map();
  for (const node of nodes) {
    const key = `${node.zIndex ?? node.z ?? 0}|${node.timeSeconds ?? 'static'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  }
  return groups;
}

function dedupePairs(pairs) {
  const seen = new Set();
  const unique = [];
  for (const item of pairs) {
    const key = `${item.fromNodeId}->${item.toNodeId}@${item.departureTimeSeconds ?? 0}`;
    if (item.fromNodeId === item.toNodeId || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function round(value) {
  return Number(Number(value ?? 0).toFixed(6));
}
