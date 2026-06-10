import { buildRoiGridGraphTopology } from './RoiGraphTopology.js';
import { summarizeRoiGraphField } from './RoiGraphDiagnostics.js';
import { applyRoiGraphUpdateRule, selectRoiGraphUpdateRule } from './RoiGraphUpdateRules.js';
import { buildRoiClusterModel } from './RoiClusterModel.js';

export function buildRoiGraphField({
  width = 1,
  height = 1,
  seed = 'anchor-roi-graph',
  time = 0,
  baseSampleField = [],
  likelihoodField = [],
  likelihoodNodes = [],
  behaviorPresetId = null,
  temporalPattern = 'static',
  spatialEvolution = 'stationary',
  stateModel = 'timeIndexed',
  samplingEffect = 'none',
  dynamicComplexity = 'medium'
} = {}) {
  const rule = selectRoiGraphUpdateRule({
    behaviorPresetId,
    spatialEvolution,
    stateModel,
    depletionMode: samplingEffect,
    temporalPattern
  });
  const clusterModel = buildRoiClusterModel({
    width,
    height,
    likelihoodNodes,
    likelihoodField,
    seed,
    time,
    temporalPattern,
    behaviorPresetId
  });
  const directionalBias = directionalBiasFor({ seed, behaviorPresetId, spatialEvolution });
  const graph = buildRoiGridGraphTopology({
    width,
    height,
    topology: '8-neighbor',
    communities: clusterModel.membership,
    directionalBias,
    communityBoundaryPenalty: behaviorPresetId === 'recurringHotspots' ? 0.42 : 0.68
  });
  const result = applyRoiGraphUpdateRule({
    graph,
    baseSampleField,
    likelihoodField,
    sourceNodes: clusterModel.clusters.length ? clusterModel.clusters : likelihoodNodes,
    clusters: clusterModel.clusters,
    updateRule: rule,
    seed: `${seed}:roi-graph:${behaviorPresetId ?? 'custom'}`,
    time,
    temporalPattern,
    dynamicComplexity,
    samplingEffect
  });
  const diagnostics = summarizeRoiGraphField({
    graph,
    nodes: result.nodes,
    clusters: clusterModel.clusters,
    likelihoodField: result.likelihoodField,
    sampleValueField: result.sampleValueField,
    updateRule: result.updateRule
  });
  return {
    ...result,
    graph: {
      topology: graph.topology,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      updateRule: result.updateRule,
      hierarchy: 'cluster-cell-edge',
      nodeStateFields: result.nodeStateFields,
      diagnostics,
      clusters: clusterModel.clusters,
      clusterDiagnostics: clusterModel.diagnostics,
      directionalBias,
      communityBoundaryPenalty: behaviorPresetId === 'recurringHotspots' ? 0.42 : 0.68
    },
    clusters: clusterModel.clusters,
    clusterDiagnostics: clusterModel.diagnostics,
    diagnostics
  };
}

function directionalBiasFor({ seed, behaviorPresetId, spatialEvolution }) {
  if (!['continuousDrift', 'randomWalk'].includes(spatialEvolution) && !['patchyRainfall', 'driftingStormCells'].includes(behaviorPresetId)) {
    return null;
  }
  const angle = seededUnit(`${seed}:roi-graph-direction:${behaviorPresetId ?? spatialEvolution}`) * Math.PI * 2;
  return {
    x: Number(Math.cos(angle).toFixed(3)),
    y: Number(Math.sin(angle).toFixed(3))
  };
}

function seededUnit(seed) {
  let hash = 2166136261;
  const text = String(seed);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967295);
}
