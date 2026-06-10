export function summarizeRoiGraphField({
  graph,
  nodes = [],
  clusters = [],
  likelihoodField = [],
  sampleValueField = [],
  updateRule = 'memoryless'
} = {}) {
  const activeNodes = nodes.filter((node) => isActiveState(node.state));
  const highLikelihoodNodes = nodes.filter((node) => Number(node.likelihood) >= 0.7);
  const incomingValues = nodes.map((node) => Number(node.incomingMessage) || 0);
  const outgoingValues = nodes.map((node) => Number(node.outgoingMessage) || 0);
  const stateCounts = countBy(nodes, (node) => node.state ?? 'inactive');
  const clusterDiagnostics = summarizeClusters(clusters);
  const activeComponents = activeComponentStats(graph, nodes);
  const nodeCount = Math.max(1, nodes.length);
  const saturationFraction = highLikelihoodNodes.length / nodeCount;
  const activeFraction = activeNodes.length / nodeCount;
  const diagnostics = {
    updateRule,
    activeNodeCount: activeNodes.length,
    highLikelihoodNodeCount: highLikelihoodNodes.length,
    stateCounts,
    edgeMessageTotal: round3(incomingValues.reduce((sum, value) => sum + value, 0)),
    outgoingMessageTotal: round3(outgoingValues.reduce((sum, value) => sum + value, 0)),
    meanIncomingMessage: round3(mean(incomingValues)),
    maxIncomingMessage: round3(Math.max(0, ...incomingValues)),
    componentCount: activeComponents.count,
    largestActiveComponent: activeComponents.largest,
    frontLength: frontLength(graph, nodes),
    activationBirths: nodes.filter((node) => node.birth).length,
    activationDeaths: nodes.filter((node) => node.death).length,
    coolingCount: nodes.filter((node) => node.state === 'cooling').length,
    recoveringCount: nodes.filter((node) => node.state === 'recovering').length,
    consumedCount: nodes.filter((node) => node.state === 'consumed').length,
    clusterCount: clusterDiagnostics.clusterCount,
    activeClusterCount: clusterDiagnostics.activeClusterCount,
    coolingClusterCount: clusterDiagnostics.coolingClusterCount,
    recoveringClusterCount: clusterDiagnostics.recoveringClusterCount,
    minClusterSeparation: clusterDiagnostics.minClusterSeparation,
    clusterSpread: clusterDiagnostics.clusterSpread,
    clusterDomainCoverage: clusterDiagnostics.clusterDomainCoverage,
    clusterCommunityOccupancy: countBy(nodes, (node) => String(node.communityId ?? 0)),
    likelihoodSampleCorrelation: round3(fieldCorrelation(likelihoodField, sampleValueField)),
    extinctionWarning: activeFraction < 0.006,
    saturationWarning: saturationFraction > 0.78,
    randomFlickerWarning: activeComponents.count > Math.max(18, activeNodes.length * 0.55),
    oneBlobCollapseWarning: clusterDiagnostics.oneBlobCollapseWarning,
    tooFewClustersWarning: clusterDiagnostics.tooFewClustersWarning
  };
  return diagnostics;
}

function summarizeClusters(clusters) {
  if (!clusters?.length) {
    return {
      clusterCount: 0,
      activeClusterCount: 0,
      coolingClusterCount: 0,
      recoveringClusterCount: 0,
      minClusterSeparation: 0,
      clusterSpread: 0,
      clusterDomainCoverage: 0,
      oneBlobCollapseWarning: false,
      tooFewClustersWarning: true
    };
  }
  const activeClusterCount = clusters.filter((cluster) => cluster.state === 'active').length;
  const coolingClusterCount = clusters.filter((cluster) => cluster.state === 'cooling').length;
  const recoveringClusterCount = clusters.filter((cluster) => cluster.state === 'recovering').length;
  let minClusterSeparation = Infinity;
  let meanX = 0;
  let meanY = 0;
  clusters.forEach((cluster, index) => {
    meanX += Number(cluster.x) || 0;
    meanY += Number(cluster.y) || 0;
    for (let otherIndex = index + 1; otherIndex < clusters.length; otherIndex += 1) {
      minClusterSeparation = Math.min(minClusterSeparation, Math.hypot((cluster.x ?? 0) - (clusters[otherIndex].x ?? 0), (cluster.y ?? 0) - (clusters[otherIndex].y ?? 0)));
    }
  });
  meanX /= clusters.length;
  meanY /= clusters.length;
  const clusterSpread = clusters.reduce((sum, cluster) => sum + Math.hypot((cluster.x ?? 0) - meanX, (cluster.y ?? 0) - meanY), 0) / clusters.length;
  const clusterDomainCoverage = Math.min(1, clusters.reduce((sum, cluster) => sum + Math.PI * (Number(cluster.radius) || 0) ** 2, 0));
  return {
    clusterCount: clusters.length,
    activeClusterCount,
    coolingClusterCount,
    recoveringClusterCount,
    minClusterSeparation: round3(Number.isFinite(minClusterSeparation) ? minClusterSeparation : 0),
    clusterSpread: round3(clusterSpread),
    clusterDomainCoverage: round3(clusterDomainCoverage),
    oneBlobCollapseWarning: clusters.length > 1 && minClusterSeparation < 0.16,
    tooFewClustersWarning: clusters.length < 2
  };
}

function activeComponentStats(graph, nodes) {
  if (!graph || !nodes.length) return { count: 0, largest: 0 };
  const active = new Set(nodes.filter((node) => isActiveState(node.state)).map((node) => node.id));
  const visited = new Set();
  let count = 0;
  let largest = 0;
  for (const id of active) {
    if (visited.has(id)) continue;
    count += 1;
    let size = 0;
    const stack = [id];
    visited.add(id);
    while (stack.length) {
      const current = stack.pop();
      size += 1;
      for (const edge of graph.outgoing[current] ?? []) {
        if (!active.has(edge.target) || visited.has(edge.target)) continue;
        visited.add(edge.target);
        stack.push(edge.target);
      }
    }
    largest = Math.max(largest, size);
  }
  return { count, largest };
}

function frontLength(graph, nodes) {
  if (!graph || !nodes.length) return 0;
  const states = new Map(nodes.map((node) => [node.id, node.state]));
  let length = 0;
  for (const edge of graph.edges ?? []) {
    const a = states.get(edge.source);
    const b = states.get(edge.target);
    if ((a === 'active' && b === 'susceptible') || (b === 'active' && a === 'susceptible')) length += 1;
  }
  return Math.round(length / 2);
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function isActiveState(state) {
  return ['active', 'igniting', 'crest', 'alive'].includes(state);
}

function fieldCorrelation(a, b) {
  const av = [];
  const bv = [];
  const height = Math.min(a?.length ?? 0, b?.length ?? 0);
  for (let y = 0; y < height; y += 1) {
    const width = Math.min(a[y]?.length ?? 0, b[y]?.length ?? 0);
    for (let x = 0; x < width; x += 1) {
      av.push(Number(a[y]?.[x] ?? 0));
      bv.push(Number(b[y]?.[x] ?? 0));
    }
  }
  const count = Math.min(av.length, bv.length);
  if (!count) return 0;
  const meanA = mean(av);
  const meanB = mean(bv);
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let index = 0; index < count; index += 1) {
    const da = av[index] - meanA;
    const db = bv[index] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  return numerator / Math.max(0.000001, Math.sqrt(denomA * denomB));
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
