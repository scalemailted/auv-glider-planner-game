export function buildRoiClusterModel({
  width = 1,
  height = 1,
  likelihoodNodes = [],
  likelihoodField = [],
  seed = 'anchor-roi-cluster',
  time = 0,
  temporalPattern = 'static',
  behaviorPresetId = null
} = {}) {
  const nodes = Array.isArray(likelihoodNodes) ? likelihoodNodes : [];
  const clusters = nodes.length
    ? nodes.map((node, index) => clusterFromLikelihoodNode({ node, index, width, height, seed, time, temporalPattern, behaviorPresetId }))
    : fallbackClustersFromField({ width, height, likelihoodField, seed, time, temporalPattern });
  const membership = clusterMembershipField({ width, height, clusters, likelihoodField });
  const withMembers = clusters.map((cluster) => ({
    ...cluster,
    memberCellCount: membership.flat().filter((id) => id === cluster.communityId).length
  }));
  return {
    clusters: withMembers,
    membership,
    diagnostics: summarizeClusters(withMembers)
  };
}

export function clusterForCommunity(clusters = [], communityId = 0) {
  return clusters.find((cluster) => cluster.communityId === communityId) ?? null;
}

export function nearestClusterForCell(clusters = [], col = 0, row = 0, width = 1, height = 1) {
  const nx = width > 1 ? col / (width - 1) : 0;
  const ny = height > 1 ? row / (height - 1) : 0;
  let best = null;
  for (const cluster of clusters) {
    const distance = Math.hypot(nx - cluster.x, ny - cluster.y);
    if (!best || distance < best.distance) best = { ...cluster, distance: round3(distance) };
  }
  return best;
}

function clusterFromLikelihoodNode({ node, index, width, height, seed, time, temporalPattern, behaviorPresetId }) {
  const phase = Number(node.phase) || seededUnit(`${seed}:cluster-phase:${index}`) * Math.PI * 2;
  const amplitude = clamp01(node.amplitude ?? node.probability ?? 1);
  const forcing = temporalClusterForcing({ temporalPattern, time, phase, seed: `${seed}:${index}` });
  const cooldown = clamp01(1 - forcing);
  const x = clamp01(node.x ?? 0);
  const y = clamp01(node.y ?? 0);
  const likelihood = clamp01((node.probability ?? amplitude) * (0.38 + forcing * 0.62));
  return {
    id: `cluster-${index + 1}`,
    communityId: index + 1,
    sourceNodeId: node.id ?? null,
    center: {
      x: round3(x * Math.max(0, width - 1)),
      y: round3(y * Math.max(0, height - 1))
    },
    x: round3(x),
    y: round3(y),
    radius: round3(node.radius ?? 0.14),
    likelihood: round3(likelihood),
    phase: round3(phase),
    amplitude: round3(amplitude),
    cooldown: round3(cooldown),
    recovery: round3(forcing),
    growthRate: round3(0.02 + seededUnit(`${seed}:cluster-growth:${index}`) * 0.05),
    mobility: behaviorPresetId === 'driftingStormCells' ? 'directedDrift' : behaviorPresetId === 'wanderingHotspot' ? 'randomWalk' : 'stationary',
    eventType: clusterEventType(behaviorPresetId),
    state: clusterState(forcing, cooldown)
  };
}

function fallbackClustersFromField({ width, height, likelihoodField, seed, time, temporalPattern }) {
  const values = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      values.push({ x, y, value: Number(likelihoodField?.[y]?.[x] ?? 0) });
    }
  }
  values.sort((a, b) => b.value - a.value);
  const picked = [];
  for (const value of values) {
    if (picked.length >= 3) break;
    const nx = width > 1 ? value.x / (width - 1) : 0;
    const ny = height > 1 ? value.y / (height - 1) : 0;
    if (picked.some((entry) => Math.hypot(nx - entry.x, ny - entry.y) < 0.25)) continue;
    picked.push({ x: nx, y: ny, probability: value.value, radius: 0.12 + seededUnit(`${seed}:fallback-radius:${picked.length}`) * 0.08 });
  }
  if (!picked.length) picked.push({ x: 0.5, y: 0.5, probability: 1, radius: 0.18 });
  return picked.map((node, index) => clusterFromLikelihoodNode({ node, index, width, height, seed, time, temporalPattern, behaviorPresetId: null }));
}

function clusterMembershipField({ width, height, clusters, likelihoodField }) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    if (!clusters.length) {
      const value = Number(likelihoodField?.[y]?.[x] ?? 0);
      return value >= 0.7 ? 2 : value >= 0.35 ? 1 : 0;
    }
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    let best = clusters[0];
    let bestScore = -Infinity;
    for (const cluster of clusters) {
      const distance = Math.hypot(nx - cluster.x, ny - cluster.y);
      const score = cluster.likelihood - distance / Math.max(0.04, cluster.radius);
      if (score > bestScore) {
        bestScore = score;
        best = cluster;
      }
    }
    return best.communityId;
  }));
}

function summarizeClusters(clusters) {
  const active = clusters.filter((cluster) => cluster.state === 'active');
  const cooling = clusters.filter((cluster) => cluster.state === 'cooling');
  const recovering = clusters.filter((cluster) => cluster.state === 'recovering');
  const spread = clusterSpread(clusters);
  return {
    clusterCount: clusters.length,
    activeClusterCount: active.length,
    coolingClusterCount: cooling.length,
    recoveringClusterCount: recovering.length,
    minClusterSeparation: spread.minSeparation,
    clusterSpread: spread.spread,
    clusterDomainCoverage: spread.domainCoverage,
    oneBlobCollapseWarning: clusters.length > 1 && spread.minSeparation < 0.16,
    tooFewClustersWarning: clusters.length < 2,
    clusterStates: Object.fromEntries(['active', 'cooling', 'recovering', 'inactive'].map((state) => [state, clusters.filter((cluster) => cluster.state === state).length]))
  };
}

function clusterSpread(clusters) {
  if (!clusters.length) return { minSeparation: 0, spread: 0, domainCoverage: 0 };
  let minSeparation = Infinity;
  let meanX = 0;
  let meanY = 0;
  clusters.forEach((cluster, index) => {
    meanX += cluster.x;
    meanY += cluster.y;
    for (let otherIndex = index + 1; otherIndex < clusters.length; otherIndex += 1) {
      minSeparation = Math.min(minSeparation, Math.hypot(cluster.x - clusters[otherIndex].x, cluster.y - clusters[otherIndex].y));
    }
  });
  meanX /= clusters.length;
  meanY /= clusters.length;
  const spread = clusters.reduce((sum, cluster) => sum + Math.hypot(cluster.x - meanX, cluster.y - meanY), 0) / clusters.length;
  const domainCoverage = Math.min(1, clusters.reduce((sum, cluster) => sum + Math.PI * cluster.radius * cluster.radius, 0));
  return {
    minSeparation: round3(Number.isFinite(minSeparation) ? minSeparation : 0),
    spread: round3(spread),
    domainCoverage: round3(domainCoverage)
  };
}

function temporalClusterForcing({ temporalPattern, time, phase, seed }) {
  if (temporalPattern === 'static' || temporalPattern === 'sustained') return 0.72 + 0.18 * Math.sin(phase);
  if (temporalPattern === 'bursty') return Math.max(0, Math.sin(time * 0.22 + phase));
  if (temporalPattern === 'intermittent') return seededUnit(`${seed}:intermittent:${Math.floor(time / 8)}`) > 0.45 ? 0.88 : 0.22;
  if (temporalPattern === 'rapidPulse') return 0.5 + 0.5 * Math.sin(time * 0.62 + phase);
  if (temporalPattern === 'randomPulses') return seededUnit(`${seed}:pulse:${Math.floor(time / 4)}`) > 0.7 ? 0.94 : 0.26;
  if (temporalPattern === 'wavyMultiFrequency') return clamp01(0.52 + 0.25 * Math.sin(time * 0.2 + phase) + 0.2 * Math.sin(time * 0.43 + phase * 0.7));
  return 0.5 + 0.5 * Math.sin(time * 0.16 + phase);
}

function clusterState(activity, cooldown) {
  if (activity >= 0.68) return 'active';
  if (cooldown >= 0.68) return 'cooling';
  if (activity >= 0.34) return 'recovering';
  return 'inactive';
}

function clusterEventType(behaviorPresetId) {
  return {
    recurringHotspots: 'recurring-hotspot',
    forestFireFrontInspired: 'front-source',
    expandingFront: 'front-source',
    rippleActivation: 'wave-source',
    freshnessRevisitValue: 'monitoring-station',
    patchyRainfall: 'rainfall-cell',
    driftingStormCells: 'drifting-cell'
  }[behaviorPresetId] ?? 'event-prone-basin';
}

function seededUnit(seed) {
  let hash = 2166136261;
  const text = String(seed);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return ((hash >>> 0) / 4294967295);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
