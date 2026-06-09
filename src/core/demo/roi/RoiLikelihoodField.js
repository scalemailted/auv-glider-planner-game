export function buildRoiLikelihoodFieldModel({
  type = 'uniformLikelihood',
  label = 'Uniform Likelihood',
  values = [],
  nodes = [],
  dynamics = 'static',
  temporalBehavior = 'static',
  spatialEvolution = 'stationary',
  dynamicComplexity = 'medium',
  time = 0
} = {}) {
  const normalizedNodes = nodes.map((node, index) => normalizeLikelihoodNode(node, index, time));
  const diagnostics = likelihoodDiagnostics(values, normalizedNodes);
  return {
    type,
    label,
    values,
    nodes: normalizedNodes,
    metadata: {
      temporalBehavior,
      dynamics,
      spatialEvolution,
      dynamicComplexity,
      time,
      minValue: diagnostics.min,
      maxValue: diagnostics.max,
      meanValue: diagnostics.mean,
      variance: diagnostics.variance,
      entropy: diagnostics.entropy
    },
    diagnostics
  };
}

function normalizeLikelihoodNode(node, index, time) {
  const probability = clamp01(node.probability ?? node.strength ?? node.amplitude ?? 1);
  const phase = Number(node.phase) || 0;
  const activity = 0.5 + 0.5 * Math.sin((Number(time) || 0) * 0.22 + phase);
  const cooldown = round3(clamp01(1 - activity));
  return {
    id: node.id ?? `likelihood-node-${index + 1}`,
    x: round3(Number(node.x) || 0),
    y: round3(Number(node.y) || 0),
    probability: round3(probability),
    amplitude: round3(clamp01(node.amplitude ?? probability)),
    radius: round3(Number(node.radius) || 0),
    phase: round3(phase),
    cooldown,
    recoveryRate: round3(node.recoveryRate ?? 0.03),
    driftVelocity: {
      x: round3(node.driftVelocity?.x ?? 0),
      y: round3(node.driftVelocity?.y ?? 0)
    },
    state: node.state ?? likelihoodNodeState(activity, cooldown)
  };
}

function likelihoodNodeState(activity, cooldown) {
  if (activity >= 0.72) return 'active';
  if (cooldown >= 0.68) return 'cooling';
  if (activity >= 0.42) return 'recovering';
  return 'inactive';
}

function likelihoodDiagnostics(values, nodes) {
  const flat = values.flat().map(Number).filter(Number.isFinite);
  const count = Math.max(1, flat.length);
  const min = flat.length ? Math.min(...flat) : 0;
  const max = flat.length ? Math.max(...flat) : 0;
  const mean = flat.reduce((sum, value) => sum + value, 0) / count;
  const variance = flat.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
  const entropy = normalizedEntropy(flat);
  const spread = nodeSpread(nodes);
  return {
    min: round3(min),
    max: round3(max),
    mean: round3(mean),
    variance: round3(variance),
    entropy: round3(entropy),
    modeCount: nodes.length,
    activeModeCount: nodes.filter((node) => node.state === 'active').length,
    recoveringModeCount: nodes.filter((node) => node.state === 'recovering').length,
    minPairwiseNodeDistance: spread.minPairwiseDistance,
    modeCenterSpread: spread.centerSpread,
    quadrantOccupancy: spread.quadrantOccupancy,
    activeLikelihoodArea: round3(flat.filter((value) => value >= 0.35).length / count),
    highLikelihoodArea: round3(flat.filter((value) => value >= 0.65).length / count)
  };
}

function normalizedEntropy(values) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0 || values.length <= 1) return 0;
  const entropy = values.reduce((sum, value) => {
    const p = Math.max(0, value) / total;
    return p > 0 ? sum - p * Math.log2(p) : sum;
  }, 0);
  return entropy / Math.log2(values.length);
}

function nodeSpread(nodes) {
  if (!nodes.length) {
    return {
      minPairwiseDistance: 0,
      centerSpread: 0,
      quadrantOccupancy: [0, 0, 0, 0]
    };
  }
  let minPairwiseDistance = Infinity;
  let meanX = 0;
  let meanY = 0;
  const quadrants = [0, 0, 0, 0];
  nodes.forEach((node, index) => {
    meanX += node.x;
    meanY += node.y;
    const quadrant = (node.x >= 0.5 ? 1 : 0) + (node.y >= 0.5 ? 2 : 0);
    quadrants[quadrant] += 1;
    for (let otherIndex = index + 1; otherIndex < nodes.length; otherIndex += 1) {
      const other = nodes[otherIndex];
      minPairwiseDistance = Math.min(minPairwiseDistance, Math.hypot(node.x - other.x, node.y - other.y));
    }
  });
  meanX /= nodes.length;
  meanY /= nodes.length;
  const centerSpread = nodes.reduce((sum, node) => sum + Math.hypot(node.x - meanX, node.y - meanY), 0) / nodes.length;
  const total = Math.max(1, nodes.length);
  return {
    minPairwiseDistance: round3(Number.isFinite(minPairwiseDistance) ? minPairwiseDistance : 0),
    centerSpread: round3(centerSpread),
    quadrantOccupancy: quadrants.map((value) => round3(value / total))
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
