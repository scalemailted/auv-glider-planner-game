export function buildRoiGridGraphTopology({
  width = 1,
  height = 1,
  topology = '8-neighbor',
  communities = null,
  directionalBias = null,
  communityBoundaryPenalty = 0.55
} = {}) {
  const w = Math.max(1, Math.floor(Number(width) || 1));
  const h = Math.max(1, Math.floor(Number(height) || 1));
  const mode = topology === '4-neighbor' ? '4-neighbor' : '8-neighbor';
  const nodes = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const id = nodeId(x, y, w);
      nodes.push({
        id,
        x,
        y,
        row: y,
        col: x,
        communityId: communityAt(communities, x, y)
      });
    }
  }
  const offsets = mode === '4-neighbor'
    ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const edges = [];
  const incoming = Array.from({ length: h * w }, () => []);
  const outgoing = Array.from({ length: h * w }, () => []);
  for (const node of nodes) {
    for (const [dx, dy] of offsets) {
      const tx = node.x + dx;
      const ty = node.y + dy;
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
      const source = node.id;
      const target = nodeId(tx, ty, w);
      const distance = Math.hypot(dx, dy);
      const sameCommunity = node.communityId === communityAt(communities, tx, ty);
      const bias = directionalWeight(dx, dy, directionalBias);
      const weight = round3((1 / distance) * bias * (sameCommunity ? 1 : communityBoundaryPenalty));
      const edge = {
        source,
        target,
        sourceNodeId: source,
        targetNodeId: target,
        weight,
        distance: round3(distance),
        direction: { x: dx, y: dy },
        spreadProbability: round3(Math.min(1, weight)),
        driftBias: round3(bias),
        barrier: sameCommunity ? 0 : round3(1 - communityBoundaryPenalty),
        communityBoundaryPenalty: sameCommunity ? 0 : round3(communityBoundaryPenalty)
      };
      edges.push(edge);
      outgoing[source].push(edge);
      incoming[target].push(edge);
    }
  }
  return {
    topology: mode,
    width: w,
    height: h,
    nodes,
    edges,
    incoming,
    outgoing,
    nodeCount: nodes.length,
    edgeCount: edges.length
  };
}

export function nodeId(x, y, width) {
  return y * width + x;
}

function communityAt(communities, x, y) {
  return communities?.[y]?.[x] ?? 0;
}

function directionalWeight(dx, dy, bias) {
  if (!bias) return 1;
  const bx = Number(bias.x) || 0;
  const by = Number(bias.y) || 0;
  const magnitude = Math.hypot(bx, by);
  if (magnitude <= 0.0001) return 1;
  const dot = (dx * bx + dy * by) / Math.max(0.0001, Math.hypot(dx, dy) * magnitude);
  return Math.max(0.25, 1 + dot * 0.65);
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
