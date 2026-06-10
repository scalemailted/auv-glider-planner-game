export const ROI_LIKELIHOOD_MESH_THRESHOLDS = {
  active: 0.25,
  high: 0.7,
  nearTrigger: 0.9
};

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
    mesh: {
      activeThreshold: ROI_LIKELIHOOD_MESH_THRESHOLDS.active,
      highThreshold: ROI_LIKELIHOOD_MESH_THRESHOLDS.high,
      nearTriggerThreshold: ROI_LIKELIHOOD_MESH_THRESHOLDS.nearTrigger,
      encoding: 'cell-centered dot mesh; radius and opacity increase with L(x,y,t)'
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
    range: round3(max - min),
    activeLikelihoodCellFraction: round3(flat.filter((value) => value >= ROI_LIKELIHOOD_MESH_THRESHOLDS.active).length / count),
    highLikelihoodCellFraction: round3(flat.filter((value) => value >= ROI_LIKELIHOOD_MESH_THRESHOLDS.high).length / count),
    nearTriggerLikelihoodCellFraction: round3(flat.filter((value) => value >= ROI_LIKELIHOOD_MESH_THRESHOLDS.nearTrigger).length / count),
    activeLikelihoodArea: round3(flat.filter((value) => value >= ROI_LIKELIHOOD_MESH_THRESHOLDS.active).length / count),
    highLikelihoodArea: round3(flat.filter((value) => value >= ROI_LIKELIHOOD_MESH_THRESHOLDS.high).length / count),
    highConnectedComponentCount: connectedComponentCount(values, ROI_LIKELIHOOD_MESH_THRESHOLDS.high),
    localNeighborCorrelation: round3(localNeighborCorrelation(values))
  };
}

function connectedComponentCount(values, threshold) {
  const height = values?.length ?? 0;
  const width = values?.[0]?.length ?? 0;
  const visited = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  let components = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (visited[y][x] || Number(values[y]?.[x] ?? 0) < threshold) continue;
      components += 1;
      const stack = [{ x, y }];
      visited[y][x] = true;
      while (stack.length) {
        const cell = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = cell.x + dx;
          const yy = cell.y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height || visited[yy][xx]) continue;
          if (Number(values[yy]?.[xx] ?? 0) < threshold) continue;
          visited[yy][xx] = true;
          stack.push({ x: xx, y: yy });
        }
      }
    }
  }
  return components;
}

function localNeighborCorrelation(values) {
  const left = [];
  const right = [];
  const height = values?.length ?? 0;
  const width = values?.[0]?.length ?? 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      left.push(Number(values[y]?.[x] ?? 0));
      right.push(Number(values[y]?.[x + 1] ?? 0));
    }
  }
  return pearson(left, right);
}

function pearson(a, b) {
  const count = Math.min(a.length, b.length);
  if (!count) return 0;
  const meanA = a.reduce((sum, value) => sum + value, 0) / count;
  const meanB = b.reduce((sum, value) => sum + value, 0) / count;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let index = 0; index < count; index += 1) {
    const da = a[index] - meanA;
    const db = b[index] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  return numerator / Math.max(0.000001, Math.sqrt(denomA * denomB));
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
