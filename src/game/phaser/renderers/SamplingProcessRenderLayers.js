import { normalizeRoiDemoViewFilters } from '../../../core/demo/DemoRoiFields.js';

export function drawSamplingProcessHeatmap(context = {}) {
  const { graphics, field: fieldModel, map } = context;
  if (!graphics || !fieldModel || !map) return;
  const field = fieldModel.field;
  const width = fieldModel.width;
  const height = fieldModel.height;
  const cellW = map.width / width;
  const cellH = map.height / height;
  const displayMode = fieldModel.displayMode;
  if (displayMode === 'graphCommunities') {
    drawCommunityLayer(context, cellW, cellH, { showHeatmap: false, showCenters: true, showCentroids: true });
    if (context.viewFilters?.showTopologyEdges) drawGraphTopologyLayer(context, cellW, cellH, { alphaScale: 0.38 });
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.2);
    return;
  }
  if (displayMode === 'graphTopology') {
    drawMutedSamplingHeatmap({ ...context, values: field }, cellW, cellH, 0.14);
    drawCommunityLayer(context, cellW, cellH, { showHeatmap: true, showCenters: false, showCentroids: true });
    drawGraphTopologyLayer(context, cellW, cellH, { alphaScale: 1 });
    drawCellNodeStateLayer(context, cellW, cellH, { showInactive: true, compact: true });
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.12);
    return;
  }
  if (displayMode === 'nodeStates') {
    drawMutedSamplingHeatmap({ ...context, values: field }, cellW, cellH, 0.24);
    drawCellNodeStateLayer(context, cellW, cellH, { showInactive: Boolean(context.viewFilters?.nodeStates?.inactive) });
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.2);
    return;
  }
  if (displayMode === 'graphMessages') {
    drawMutedSamplingHeatmap({ ...context, values: field }, cellW, cellH, 0.18);
    if (context.viewFilters?.showTopologyEdges) drawGraphTopologyLayer(context, cellW, cellH, { alphaScale: 0.2 });
    if (context.viewFilters?.showActiveMessageEdges) drawProcessMessages(context, cellW, cellH, { showDirections: true, maxEdges: context.viewFilters?.maxMessages ?? 110 });
    drawCellNodeStateLayer(context, cellW, cellH, { showInactive: false, compact: true });
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.16);
    return;
  }
  if (displayMode === 'communityMessages') {
    drawCommunityLayer(context, cellW, cellH, { showHeatmap: true, showCenters: true, showCentroids: false });
    if (context.viewFilters?.showTopologyEdges) drawGraphTopologyLayer(context, cellW, cellH, { alphaScale: 0.22 });
    if (context.viewFilters?.showActiveMessageEdges) drawProcessMessages(context, cellW, cellH, { showDirections: true, maxEdges: context.viewFilters?.maxMessages ?? 90 });
    drawCellNodeStateLayer(context, cellW, cellH, { showInactive: false, compact: true });
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.18);
    return;
  }
  if (displayMode === 'stateTransitions') {
    drawMutedSamplingHeatmap({ ...context, values: field }, cellW, cellH, 0.16);
    if (context.viewFilters?.showTopologyEdges) drawGraphTopologyLayer(context, cellW, cellH, { alphaScale: 0.18 });
    drawStateTransitionLayer(context, cellW, cellH);
    drawCellNodeStateLayer(context, cellW, cellH, { showInactive: false, compact: true });
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.16);
    return;
  }
  if (displayMode === 'roiMeaning') {
    drawRoiMeaningLayer(context, cellW, cellH);
    if (context.viewFilters?.showActiveMessageEdges) drawProcessMessages(context, cellW, cellH, { showDirections: false, maxEdges: Math.min(40, context.viewFilters?.maxMessages ?? 40), alphaScale: 0.45 });
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.18);
    return;
  }
  if (displayMode === 'diagnosticsOverlay') {
    drawMutedSamplingHeatmap({ ...context, values: field }, cellW, cellH, 0.36);
    drawSourceFieldMesh(context, cellW, cellH);
    if (context.viewFilters?.showTopologyEdges) drawGraphTopologyLayer(context, cellW, cellH, { alphaScale: 0.14 });
    if (context.viewFilters?.showActiveMessageEdges) drawProcessMessages(context, cellW, cellH, { showDirections: false, maxEdges: Math.min(60, context.viewFilters?.maxMessages ?? 60), alphaScale: 0.62 });
    drawDiagnosticsOverlayLayer(context, cellW, cellH);
    drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.18);
    return;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(field[y]?.[x] ?? 0);
      const color = heatColor(value);
      graphics.fillStyle(color, 0.24 + value * 0.72);
      graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
    }
  }
  drawSamplingProcessGrid(context, cellW, cellH, width, height, 0.28);
  if (fieldModel.displayMode === 'sampleValueLikelihoodOverlay' || fieldModel.displayMode === 'eventLikelihood') {
    drawSourceFieldMesh(context, cellW, cellH);
  }
}

export function drawSamplingProcessGrid(context = {}, cellW, cellH, width, height, alpha = 0.28) {
  const { graphics, map } = context;
  if (!graphics || !map) return;
  graphics.lineStyle(1, 0x163747, alpha);
  for (let x = 0; x <= width; x += 1) {
    graphics.lineBetween(map.x + x * cellW, map.y, map.x + x * cellW, map.y + map.height);
  }
  for (let y = 0; y <= height; y += 1) {
    graphics.lineBetween(map.x, map.y + y * cellH, map.x + map.width, map.y + y * cellH);
  }
}

export function drawMutedSamplingHeatmap(context = {}, cellW, cellH, alphaScale = 0.24) {
  const { graphics, map } = context;
  const field = context.values ?? context.field?.field;
  const height = field?.length ?? 0;
  const width = field?.[0]?.length ?? 0;
  if (!graphics || !map) return;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(field[y]?.[x] ?? 0);
      graphics.fillStyle(heatColor(value), alphaScale * (0.35 + value * 0.65));
      graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
    }
  }
}

export function drawSourceFieldMesh(context = {}, cellW, cellH) {
  const { graphics, field, map, demoTime = 0 } = context;
  if (!graphics || !field || !map) return;
  const likelihood = field?.likelihoodField?.values ?? field?.eventLikelihoodField ?? [];
  const mesh = field?.likelihoodField?.mesh ?? {};
  const activeThreshold = Number(mesh.activeThreshold ?? 0.25);
  const highThreshold = Number(mesh.highThreshold ?? 0.7);
  const nearTriggerThreshold = Number(mesh.nearTriggerThreshold ?? 0.9);
  const width = field.width;
  const height = field.height;
  const minCell = Math.min(cellW, cellH);
  const propagationMode = ['neighborPropagation'].includes(field?.eventLikelihoodSpatialEvolution)
    || ['neighborPropagation'].includes(field?.spatialEvolution)
    || (field?.graphField?.graph?.updateRule && field.graphField.graph.updateRule !== 'memoryless');
  if (propagationMode) drawSourceNeighborLinks(context, cellW, cellH, likelihood, highThreshold);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(likelihood[y]?.[x] ?? 0);
      const cx = map.x + (x + 0.5) * cellW;
      const cy = map.y + (y + 0.5) * cellH;
      const visibleValue = Math.max(0.08, value);
      const radius = Math.max(0.75, minCell * (0.035 + visibleValue * 0.22));
      const alpha = value < 0.15 ? 0.08 + value * 0.3 : 0.14 + value * 0.42;
      const color = value >= nearTriggerThreshold ? 0xffffff : value >= highThreshold ? 0xf7f7c6 : value >= activeThreshold ? 0xbbe7d2 : 0x7ebf78;
      graphics.fillStyle(color, alpha);
      graphics.fillCircle(cx, cy, radius);
      if (value >= activeThreshold) {
        const ringColor = value >= nearTriggerThreshold ? 0xffffff : value >= highThreshold ? 0xf4d35e : 0x9ee7c8;
        const ringAlpha = value >= nearTriggerThreshold ? 0.72 : value >= highThreshold ? 0.48 : 0.26;
        graphics.lineStyle(value >= nearTriggerThreshold ? 2 : 1, ringColor, ringAlpha);
        graphics.strokeCircle(cx, cy, radius + minCell * (value >= nearTriggerThreshold ? 0.15 : 0.08));
      }
      if (value >= nearTriggerThreshold && (Math.floor(demoTime * 4 + x + y) % 2 === 0)) {
        graphics.lineStyle(1, 0xffffff, 0.28);
        graphics.strokeCircle(cx, cy, radius + minCell * 0.25);
      }
      const graphNode = field?.graphField?.nodeGrid?.[y]?.[x];
      if (graphNode?.state && graphNode.state !== 'inactive') {
        const stateStyle = graphStateStyle(graphNode.state);
        graphics.lineStyle(stateStyle.width, stateStyle.color, stateStyle.alpha);
        graphics.strokeCircle(cx, cy, radius + minCell * stateStyle.radiusScale);
      }
    }
  }
}

export function drawSourceNeighborLinks(context = {}, cellW, cellH, likelihood, highThreshold) {
  const { graphics, map } = context;
  if (!graphics || !map) return;
  const height = likelihood?.length ?? 0;
  const width = likelihood?.[0]?.length ?? 0;
  graphics.lineStyle(1, 0xdfffe5, 0.13);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(likelihood[y]?.[x] ?? 0);
      if (value < highThreshold) continue;
      const cx = map.x + (x + 0.5) * cellW;
      const cy = map.y + (y + 0.5) * cellH;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const other = Number(likelihood[y + dy]?.[x + dx] ?? 0);
        if (other < highThreshold) continue;
        graphics.lineBetween(cx, cy, map.x + (x + dx + 0.5) * cellW, map.y + (y + dy + 0.5) * cellH);
      }
    }
  }
}

export function drawCommunityLayer(context = {}, cellW, cellH, { showHeatmap = false, showCenters = true, showCentroids = true } = {}) {
  const { graphics, field, map } = context;
  if (!graphics || !field || !map) return;
  const nodes = field?.graphField?.nodeGrid ?? [];
  const clusters = field?.graphField?.clusters ?? [];
  const values = field?.sampleValueField ?? field?.field ?? [];
  const height = field?.height ?? nodes.length;
  const width = field?.width ?? nodes[0]?.length ?? 0;
  if (showHeatmap) drawMutedSamplingHeatmap({ ...context, values }, cellW, cellH, 0.2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const communityId = nodes[y]?.[x]?.communityId ?? 0;
      const color = communityColor(communityId);
      graphics.fillStyle(color, showHeatmap ? 0.16 : 0.28);
      graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
      const east = nodes[y]?.[x + 1]?.communityId;
      const south = nodes[y + 1]?.[x]?.communityId;
      if (east !== undefined && east !== communityId) {
        graphics.lineStyle(1, 0xf3f7d4, 0.42);
        graphics.lineBetween(map.x + (x + 1) * cellW, map.y + y * cellH, map.x + (x + 1) * cellW, map.y + (y + 1) * cellH);
      }
      if (south !== undefined && south !== communityId) {
        graphics.lineStyle(1, 0xf3f7d4, 0.42);
        graphics.lineBetween(map.x + x * cellW, map.y + (y + 1) * cellH, map.x + (x + 1) * cellW, map.y + (y + 1) * cellH);
      }
    }
  }
  if (showCentroids) {
    for (const centroid of communityCentroids(nodes)) {
      const cx = map.x + (centroid.x + 0.5) * cellW;
      const cy = map.y + (centroid.y + 0.5) * cellH;
      graphics.fillStyle(0xffffff, 0.6);
      graphics.fillCircle(cx, cy, Math.max(1.5, Math.min(cellW, cellH) * 0.08));
      graphics.lineStyle(1, communityColor(centroid.communityId), 0.8);
      graphics.strokeCircle(cx, cy, Math.max(3, Math.min(cellW, cellH) * 0.18));
    }
  }
  if (showCenters) {
    for (const cluster of clusters) {
      const cx = map.x + (Number(cluster.center?.x ?? cluster.x * (width - 1)) + 0.5) * cellW;
      const cy = map.y + (Number(cluster.center?.y ?? cluster.y * (height - 1)) + 0.5) * cellH;
      const radius = Math.max(4, Math.min(cellW, cellH) * (0.22 + Number(cluster.likelihood ?? 0) * 0.18));
      graphics.lineStyle(2, communityColor(cluster.communityId), 0.92);
      graphics.strokeCircle(cx, cy, radius);
      graphics.fillStyle(0xffffff, cluster.state === 'active' ? 0.72 : 0.42);
      graphics.fillCircle(cx, cy, Math.max(2, radius * 0.28));
    }
  }
}

export function drawCellNodeStateLayer(context = {}, cellW, cellH, { showInactive = false, compact = false } = {}) {
  const { graphics, field, map, viewFilters = {} } = context;
  if (!graphics || !field || !map) return;
  const nodes = field?.graphField?.nodeGrid ?? [];
  const height = field?.height ?? nodes.length;
  const width = field?.width ?? nodes[0]?.length ?? 0;
  const minCell = Math.min(cellW, cellH);
  const transitionCells = new Set((field?.graphField?.nodeTransitions ?? []).map((transition) => `${transition.col},${transition.row}`));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const node = nodes[y]?.[x];
      if (!node) continue;
      if (!nodeVisibleByFilters(node, viewFilters, transitionCells, x, y)) continue;
      if (!showInactive && (!node.state || node.state === 'inactive' || node.state === 'susceptible')) continue;
      const style = graphStateStyle(node.state);
      const activation = Math.max(0.08, Number(node.activation ?? node.cellLikelihood ?? node.likelihood ?? 0));
      const cx = map.x + (x + 0.5) * cellW;
      const cy = map.y + (y + 0.5) * cellH;
      const radius = Math.max(1.1, minCell * (compact ? 0.08 + activation * 0.1 : 0.06 + activation * 0.18));
      const inactiveAlpha = viewFilters.fadeInactiveNodes ? 0.08 : 0.18;
      graphics.fillStyle(style.color, node.state === 'inactive' ? inactiveAlpha : Math.max(0.18, style.alpha * 0.72));
      graphics.fillCircle(cx, cy, radius);
      graphics.lineStyle(style.width, style.color, node.state === 'inactive' ? inactiveAlpha : style.alpha);
      graphics.strokeCircle(cx, cy, radius + minCell * style.radiusScale);
      if (node.state === 'consumed' || node.state === 'inhibited') {
        graphics.lineStyle(1, style.color, 0.55);
        graphics.lineBetween(cx - radius, cy - radius, cx + radius, cy + radius);
        graphics.lineBetween(cx + radius, cy - radius, cx - radius, cy + radius);
      }
    }
  }
}

export function drawProcessMessages(context = {}, cellW, cellH, { showDirections = true, maxEdges = 100, alphaScale = 1 } = {}) {
  const { graphics, field, map, viewFilters = {}, selectedCell = null } = context;
  if (!graphics || !field || !map) return;
  const messages = topGraphMessages(field?.graphField, {
    maxEdges,
    threshold: viewFilters.messageStrengthThreshold ?? 0.04,
    filters: viewFilters,
    selectedCell
  });
  const maxStrength = Math.max(0.0001, ...messages.map((message) => message.strength));
  for (const message of messages) {
    const alpha = Math.min(0.68, (0.12 + message.strength / maxStrength * 0.48) * alphaScale);
    const color = message.sameCommunity ? communityColor(message.communityId) : 0xf4d35e;
    const sx = map.x + (message.source.x + 0.5) * cellW;
    const sy = map.y + (message.source.y + 0.5) * cellH;
    const tx = map.x + (message.target.x + 0.5) * cellW;
    const ty = map.y + (message.target.y + 0.5) * cellH;
    graphics.lineStyle(message.sameCommunity ? 1 : 2, color, alpha);
    graphics.lineBetween(sx, sy, tx, ty);
    if (showDirections) {
      const mx = sx * 0.42 + tx * 0.58;
      const my = sy * 0.42 + ty * 0.58;
      const angle = Math.atan2(ty - sy, tx - sx);
      const size = Math.max(2.4, Math.min(cellW, cellH) * 0.12);
      graphics.fillStyle(color, alpha);
      graphics.fillTriangle(
        mx + Math.cos(angle) * size,
        my + Math.sin(angle) * size,
        mx + Math.cos(angle + 2.45) * size,
        my + Math.sin(angle + 2.45) * size,
        mx + Math.cos(angle - 2.45) * size,
        my + Math.sin(angle - 2.45) * size
      );
    }
  }
}

export function drawGraphTopologyLayer(context = {}, cellW, cellH, { alphaScale = 1 } = {}) {
  const { graphics, field, map, viewFilters = {} } = context;
  if (!graphics || !field || !map) return;
  const nodeGrid = field?.graphField?.nodeGrid ?? [];
  const height = field?.height ?? nodeGrid.length;
  const width = field?.width ?? nodeGrid[0]?.length ?? 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = nodeGrid[y]?.[x];
      if (!source) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        const target = nodeGrid[y + dy]?.[x + dx];
        if (!target) continue;
        const sameCommunity = source.communityId === target.communityId;
        if (sameCommunity && viewFilters.sameCommunity === false) continue;
        if (!sameCommunity && viewFilters.crossCommunity === false) continue;
        const sx = map.x + (x + 0.5) * cellW;
        const sy = map.y + (y + 0.5) * cellH;
        const tx = map.x + (x + dx + 0.5) * cellW;
        const ty = map.y + (y + dy + 0.5) * cellH;
        graphics.lineStyle(sameCommunity ? 1 : 2, sameCommunity ? communityColor(source.communityId) : 0xf4d35e, (sameCommunity ? 0.14 : 0.28) * alphaScale);
        graphics.lineBetween(sx, sy, tx, ty);
      }
    }
  }
}

export function drawStateTransitionLayer(context = {}, cellW, cellH) {
  const { graphics, field, map, viewFilters = {} } = context;
  if (!graphics || !field || !map) return;
  const transitions = (field?.graphField?.nodeTransitions ?? []).filter((transition) => transitionVisibleByFilters(transition, viewFilters));
  const minCell = Math.min(cellW, cellH);
  for (const transition of transitions) {
    const x = Number(transition.col);
    const y = Number(transition.row);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const cx = map.x + (x + 0.5) * cellW;
    const cy = map.y + (y + 0.5) * cellH;
    const color = graphStateStyle(transition.nextState ?? transition.state).color;
    const radius = Math.max(3, minCell * 0.3);
    graphics.lineStyle(2, color, 0.82);
    graphics.strokeCircle(cx, cy, radius);
    graphics.lineStyle(2, 0xffffff, 0.55);
    graphics.lineBetween(cx - radius * 0.55, cy, cx + radius * 0.55, cy);
    graphics.lineBetween(cx + radius * 0.25, cy - radius * 0.3, cx + radius * 0.55, cy);
    graphics.lineBetween(cx + radius * 0.25, cy + radius * 0.3, cx + radius * 0.55, cy);
  }
}

export function drawRoiMeaningLayer(context = {}, cellW, cellH) {
  const { graphics, field, map, viewFilters = {} } = context;
  if (!graphics || !field || !map) return;
  const sample = field?.sampleValueField ?? field?.field ?? [];
  const likelihood = field?.eventLikelihoodField ?? [];
  const transitions = new Set((field?.graphField?.nodeTransitions ?? []).map((transition) => `${transition.col},${transition.row}`));
  const nodes = field?.graphField?.nodeGrid ?? [];
  const height = field?.height ?? sample.length;
  const width = field?.width ?? sample[0]?.length ?? 0;
  const layer = viewFilters.roiMeaningLayer ?? 'all';
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(sample[y]?.[x] ?? 0);
      const like = Number(likelihood[y]?.[x] ?? 0);
      const node = nodes[y]?.[x] ?? {};
      const roles = roiMeaningRoles({ value, likelihood: like, node, isTransition: transitions.has(`${x},${y}`) });
      if (!roiMeaningLayerVisible(roles, layer)) {
        graphics.fillStyle(0x081827, 0.28);
        graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
        continue;
      }
      const style = roiMeaningStyle(roles);
      graphics.fillStyle(style.color, style.alpha);
      graphics.fillRect(map.x + x * cellW, map.y + y * cellH, cellW + 1, cellH + 1);
      if (roles.transitionBoundary) {
        graphics.lineStyle(1.5, 0xffffff, 0.52);
        graphics.strokeRect(map.x + x * cellW + 2, map.y + y * cellH + 2, Math.max(1, cellW - 4), Math.max(1, cellH - 4));
      }
    }
  }
  drawSourceFieldMesh(context, cellW, cellH);
}

export function drawDiagnosticsOverlayLayer(context = {}, cellW, cellH) {
  const { graphics, field, map } = context;
  if (!graphics || !field || !map) return;
  const graph = field?.activityDiagnostics?.graphDiagnostics ?? field?.graphField?.diagnostics ?? {};
  const legendX = map.x + 14;
  const legendY = map.y + 14;
  const states = ['active', 'cooling', 'recovering', 'susceptible', 'consumed', 'inactive'];
  graphics.fillStyle(0x081827, 0.78);
  graphics.fillRoundedRect(legendX - 8, legendY - 8, 190, 86, 6);
  states.forEach((state, index) => {
    const style = graphStateStyle(state);
    const x = legendX + (index % 3) * 58;
    const y = legendY + Math.floor(index / 3) * 34;
    graphics.fillStyle(style.color, state === 'inactive' ? 0.18 : 0.7);
    graphics.fillCircle(x, y, 5);
    graphics.lineStyle(1, style.color, style.alpha);
    graphics.strokeCircle(x, y, 9);
  });
  const barX = legendX;
  const barY = legendY + 66;
  const total = Math.max(1, Object.values(graph.stateCounts ?? {}).reduce((sum, value) => sum + Number(value || 0), 0));
  let offset = 0;
  for (const state of states) {
    const count = Number(graph.stateCounts?.[state] ?? 0);
    if (!count) continue;
    const width = 170 * count / total;
    graphics.fillStyle(graphStateStyle(state).color, 0.7);
    graphics.fillRect(barX + offset, barY, width, 7);
    offset += width;
  }
}

export function drawHighValueMarkers(context = {}) {
  const { graphics, field, map } = context;
  if (!graphics || !field || !map) return;
  const width = field.width;
  const height = field.height;
  const cellW = map.width / width;
  const cellH = map.height / height;
  for (const cell of field.highValueCells ?? []) {
    const cx = map.x + (cell.x + 0.5) * cellW;
    const cy = map.y + (cell.y + 0.5) * cellH;
    const radius = Math.max(3, Math.min(cellW, cellH) * 0.24);
    graphics.lineStyle(1, 0xf7f7c6, 0.72);
    graphics.strokeCircle(cx, cy, radius + cell.value * 3);
    if (cell.value >= 0.88) {
      graphics.fillStyle(0xffffff, 0.82);
      graphics.fillCircle(cx, cy, Math.max(1.5, radius * 0.36));
    }
  }
}

export function drawSelectedSamplingCell(context = {}) {
  const { graphics, field, map, selectedCell } = context;
  if (!graphics || !selectedCell || !field || !map) return;
  const cellW = map.width / field.width;
  const cellH = map.height / field.height;
  const x = map.x + selectedCell.col * cellW;
  const y = map.y + selectedCell.row * cellH;
  graphics.fillStyle(0x63e6be, 0.1);
  graphics.fillRect(x + 1, y + 1, Math.max(1, cellW - 2), Math.max(1, cellH - 2));
  graphics.lineStyle(3, 0x63e6be, 0.96);
  graphics.strokeRect(x + 1.5, y + 1.5, Math.max(1, cellW - 3), Math.max(1, cellH - 3));
}

export function isGraphDisplayMode(mode) {
  return ['graphTopology', 'graphCommunities', 'nodeStates', 'graphMessages', 'communityMessages', 'stateTransitions', 'roiMeaning', 'diagnosticsOverlay'].includes(mode);
}

export function heatColor(value) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  if (v < 0.22) return 0x10243b;
  if (v < 0.45) return 0x1f7a8c;
  if (v < 0.68) return 0x63c56f;
  if (v < 0.84) return 0xf4d35e;
  return 0xff7b54;
}

export function graphStateStyle(state) {
  return {
    active: { color: 0xffffff, alpha: 0.68, width: 2, radiusScale: 0.22 },
    crest: { color: 0x86e7ff, alpha: 0.56, width: 2, radiusScale: 0.24 },
    alive: { color: 0x9ee7c8, alpha: 0.5, width: 1, radiusScale: 0.18 },
    cooling: { color: 0xf4d35e, alpha: 0.45, width: 1, radiusScale: 0.18 },
    recovering: { color: 0x63e6be, alpha: 0.38, width: 1, radiusScale: 0.14 },
    consumed: { color: 0xff8a65, alpha: 0.52, width: 1, radiusScale: 0.16 },
    inhibited: { color: 0xff8a65, alpha: 0.36, width: 1, radiusScale: 0.12 },
    inactive: { color: 0x78909c, alpha: 0.16, width: 1, radiusScale: 0.08 },
    susceptible: { color: 0xcfe8ff, alpha: 0.22, width: 1, radiusScale: 0.1 }
  }[state] ?? { color: 0xbbe7d2, alpha: 0.28, width: 1, radiusScale: 0.12 };
}

function communityColor(communityId) {
  const palette = [0x63e6be, 0x86e7ff, 0xf4d35e, 0xc9a7ff, 0xff8a65, 0x9ee7c8, 0xf7f7c6, 0x7ebf78, 0xe7b7ff, 0x6fd6ff];
  const index = Math.abs(Math.floor(Number(communityId) || 0)) % palette.length;
  return palette[index];
}

function communityCentroids(nodeGrid) {
  const buckets = new Map();
  for (let y = 0; y < (nodeGrid?.length ?? 0); y += 1) {
    for (let x = 0; x < (nodeGrid[y]?.length ?? 0); x += 1) {
      const node = nodeGrid[y]?.[x];
      if (!node) continue;
      const communityId = node.communityId ?? 0;
      const bucket = buckets.get(communityId) ?? { communityId, x: 0, y: 0, count: 0 };
      bucket.x += x;
      bucket.y += y;
      bucket.count += 1;
      buckets.set(communityId, bucket);
    }
  }
  return [...buckets.values()].map((bucket) => ({
    communityId: bucket.communityId,
    x: bucket.x / Math.max(1, bucket.count),
    y: bucket.y / Math.max(1, bucket.count),
    count: bucket.count
  }));
}

function topGraphMessages(graphField, { maxEdges = 100, threshold = 0.04, filters = null, selectedCell = null } = {}) {
  const emitted = graphField?.edgeMessages ?? [];
  const normalizedFilters = normalizeRoiDemoViewFilters(filters);
  const selected = selectedCell ? { x: Number(selectedCell.col ?? selectedCell.x), y: Number(selectedCell.row ?? selectedCell.y) } : null;
  if (emitted.length) {
    return emitted
      .map((message) => ({
        source: {
          x: Number(message.sourceCell?.x ?? message.source?.x ?? graphNodeCol(message.source, graphField)),
          y: Number(message.sourceCell?.y ?? message.source?.y ?? graphNodeRow(message.source, graphField)),
          id: message.source
        },
        target: {
          x: Number(message.targetCell?.x ?? message.target?.x ?? graphNodeCol(message.target, graphField)),
          y: Number(message.targetCell?.y ?? message.target?.y ?? graphNodeRow(message.target, graphField)),
          id: message.target
        },
        strength: Number(message.messageStrength ?? message.strength ?? 0),
        sameCommunity: Boolean(message.sameCommunity),
        communityId: message.communityId ?? null,
        sourceType: 'emitted',
        cause: message.cause,
        label: message.label,
        messageType: messageTypeForGraphMessage(message)
      }))
      .filter((message) => Number.isFinite(message.strength) && message.strength >= threshold)
      .filter((message) => graphMessageVisibleByFilters(message, normalizedFilters, selected))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, Math.max(0, normalizedFilters.showTopMessagesOnly ? maxEdges : Math.max(maxEdges, emitted.length)));
  }
  const nodeGrid = graphField?.nodeGrid ?? [];
  const messages = [];
  for (let y = 0; y < nodeGrid.length; y += 1) {
    for (let x = 0; x < (nodeGrid[y]?.length ?? 0); x += 1) {
      const source = nodeGrid[y]?.[x];
      if (!source) continue;
      for (const [dx, dy] of GRAPH_MESSAGE_NEIGHBORS) {
        const target = nodeGrid[y + dy]?.[x + dx];
        if (!target) continue;
        const strength = graphMessageStrength(source, target);
        if (strength < threshold) continue;
        messages.push({
          source: { x, y, id: source.id },
          target: { x: x + dx, y: y + dy, id: target.id },
          strength: Number(strength.toFixed(4)),
          sameCommunity: source.communityId === target.communityId,
          communityId: source.communityId ?? null,
          sourceType: 'inferred',
          cause: 'diagnostic_inferred_from_node_totals',
          label: 'inferred diagnostic message',
          messageType: 'generic'
        });
      }
    }
  }
  return messages
    .filter((message) => graphMessageVisibleByFilters(message, normalizedFilters, selected))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, Math.max(0, normalizedFilters.showTopMessagesOnly ? maxEdges : Math.max(maxEdges, messages.length)));
}

function graphMessageVisibleByFilters(message, filters, selected) {
  if (message.sameCommunity && filters.sameCommunity === false) return false;
  if (!message.sameCommunity && filters.crossCommunity === false) return false;
  const type = message.messageType ?? messageTypeForGraphMessage(message);
  if (filters.messageTypes?.[type] === false) return false;
  if (filters.incomingToSelected && selected && !(message.target.x === selected.x && message.target.y === selected.y)) return false;
  if (filters.outgoingFromSelected && selected && !(message.source.x === selected.x && message.source.y === selected.y)) return false;
  return true;
}

function messageTypeForGraphMessage(message = {}) {
  const text = `${message.rule ?? ''} ${message.cause ?? ''} ${message.label ?? ''}`.toLowerCase();
  if (/inhibit|suppress|block/.test(text)) return 'inhibition';
  if (/recover|fresh|revisit|restore/.test(text)) return 'recovery';
  if (/cool|deplet|consum|decay/.test(text)) return 'cooldown';
  if (/drift|walk|transport|advect|move/.test(text)) return 'drift';
  if (/activate|birth|spread|front|trigger|edge/.test(text)) return 'activation';
  return 'generic';
}

function nodeVisibleByFilters(node, filters, transitionCells, x, y) {
  const state = node?.state ?? 'inactive';
  if (filters.transitionNodesOnly && !transitionCells.has(`${x},${y}`)) return false;
  return filters.nodeStates?.[state] !== false;
}

function transitionVisibleByFilters(transition, filters) {
  const state = transition?.nextState ?? transition?.state ?? 'inactive';
  return filters.nodeStates?.[state] !== false;
}

function roiMeaningRoles({ value, likelihood, node, isTransition }) {
  return {
    current: value >= 0.62,
    nearFuture: likelihood >= 0.62 || Number(node?.incomingMessage ?? 0) >= 0.18,
    depleted: value <= 0.18 || ['consumed', 'inhibited'].includes(node?.state),
    transitionBoundary: Boolean(isTransition) || Math.abs(Number(node?.incomingMessage ?? 0) - Number(node?.outgoingMessage ?? 0)) >= 0.24
  };
}

function roiMeaningLayerVisible(roles, layer) {
  if (layer === 'all') return roles.current || roles.nearFuture || roles.depleted || roles.transitionBoundary;
  if (layer === 'current') return roles.current;
  if (layer === 'nearFuture') return roles.nearFuture;
  if (layer === 'depleted') return roles.depleted;
  if (layer === 'transitionBoundary') return roles.transitionBoundary;
  return true;
}

function roiMeaningStyle(roles) {
  if (roles.transitionBoundary) return { color: 0xffffff, alpha: 0.38 };
  if (roles.current && roles.nearFuture) return { color: 0x63e6be, alpha: 0.74 };
  if (roles.current) return { color: 0xf7f7c6, alpha: 0.66 };
  if (roles.nearFuture) return { color: 0x86e7ff, alpha: 0.56 };
  if (roles.depleted) return { color: 0xff8a65, alpha: 0.48 };
  return { color: 0x163747, alpha: 0.24 };
}

function graphNodeCol(id, graphField) {
  const width = graphField?.graph?.width ?? graphField?.width ?? graphField?.nodeGrid?.[0]?.length ?? 1;
  return Number.isFinite(Number(id)) ? Number(id) % width : 0;
}

function graphNodeRow(id, graphField) {
  const width = graphField?.graph?.width ?? graphField?.width ?? graphField?.nodeGrid?.[0]?.length ?? 1;
  return Number.isFinite(Number(id)) ? Math.floor(Number(id) / width) : 0;
}

const GRAPH_MESSAGE_NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1]
];

function graphMessageStrength(source, target) {
  const outgoing = Number(source.outgoingMessage ?? source.activation ?? source.cellLikelihood ?? source.likelihood ?? 0);
  const incoming = Number(target.incomingMessage ?? 0);
  const targetReadiness = Number(target.cellLikelihood ?? target.likelihood ?? target.activation ?? 0);
  const stateBoost = target.state === 'susceptible' || target.state === 'recovering' ? 1 : target.state === 'inhibited' || target.state === 'consumed' ? 0.35 : 0.75;
  const communityFactor = source.communityId === target.communityId ? 1 : 0.52;
  return Math.max(0, (outgoing * 0.62 + incoming * 0.18 + targetReadiness * 0.2) * stateBoost * communityFactor);
}
