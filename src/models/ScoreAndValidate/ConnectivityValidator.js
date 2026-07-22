const DeploymentZones = require('./DeploymentZones.js')
const ROIValue = require('./ROIValue.js')
const MissionRules = require('./MissionRules.js')
function getNavigableMask(level) {
  const width = Number(level?.world?.grid?.width ?? 0);
  const height = Number(level?.world?.grid?.height ?? 0);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => isNavigableCell(level, x, y)));
}

 function getDeploymentCells(level, mission = null, agentId = null) {
  if (mission) DeploymentZones.normalizeDeploymentState(level, mission);
  const zones = DeploymentZones.getDeploymentZones(level);
  const allowedZoneIds = new Set();
  if (mission) {
    for (const agent of mission.agents ?? []) {
      if (agentId && agent.id !== agentId) continue;
      if (agent.deployment?.zoneId) allowedZoneIds.add(agent.deployment.zoneId);
      if (agent.deployment?.selectedZoneId) allowedZoneIds.add(agent.deployment.selectedZoneId);
      for (const zoneId of agent.deployment?.zoneIds ?? []) allowedZoneIds.add(zoneId);
    }
  }
  const filtered = allowedZoneIds.size
    ? zones.filter((zone) => allowedZoneIds.has(zone.id))
    : zones;
  return uniqueCells(filtered.flatMap((zone) => zone.cells ?? []))
    .filter((cell) => isNavigableCell(level, cell.x, cell.y));
}

 function floodFillReachable(mask, startCells = []) {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  const reachable = new Set();
  const queue = [];
  for (const cell of startCells) {
    const x = Math.round(Number(cell.x));
    const y = Math.round(Number(cell.y));
    if (!isInBounds(x, y, width, height) || !mask[y][x]) continue;
    const key = cellKey(x, y);
    if (reachable.has(key)) continue;
    reachable.add(key);
    queue.push({ x, y });
  }
  for (let index = 0; index < queue.length; index += 1) {
    const cell = queue[index];
    for (const next of neighbors4(cell.x, cell.y)) {
      if (!isInBounds(next.x, next.y, width, height) || !mask[next.y][next.x]) continue;
      const key = cellKey(next.x, next.y);
      if (reachable.has(key)) continue;
      reachable.add(key);
      queue.push(next);
    }
  }
  return reachable;
}

 function findLargestNavigableRegion(mask) {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  const visited = new Set();
  const regions = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = cellKey(x, y);
      if (!mask[y][x] || visited.has(key)) continue;
      const region = floodFillReachable(mask, [{ x, y }]);
      for (const item of region) visited.add(item);
      regions.push({
        size: region.size,
        cells: [...region].map(parseCellKey)
      });
    }
  }
  regions.sort((a, b) => b.size - a.size);
  return regions[0] ?? { size: 0, cells: [] };
}

 function computeReachabilitySummary(level, mission = null) {
  if (mission) DeploymentZones.normalizeDeploymentState(level, mission);
  const mask = getNavigableMask(level);
  const totalNavigableCells = mask.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const deploymentCells = getDeploymentCells(level, mission);
  const reachableCells = floodFillReachable(mask, deploymentCells);
  const largest = findLargestNavigableRegion(mask);
  const roiTargets = getScoringRoiCells(level, mission);
  const reachableRoi = roiTargets.filter((cell) => reachableCells.has(cellKey(cell.x, cell.y))).length;
  const recoveryCells = getRecoveryCells(level, mission);
  const reachableRecovery = recoveryCells.filter((cell) => reachableCells.has(cellKey(cell.x, cell.y))).length;
  const warnings = [];
  if (!deploymentCells.length) warnings.push('No valid water deployment cells.');
  // if (deploymentCells.length && reachableCells.size === 0) warnings.push('Deployment zone is disconnected from navigable water.');
  if (totalNavigableCells && reachableCells.size / totalNavigableCells < 0.65) warnings.push('Deployment reaches only a small part of navigable water.');
  if (roiTargets.length && reachableRoi < roiTargets.length) warnings.push('Some high-value ROI cells are unreachable from deployment.');
  if (recoveryCells.length && reachableRecovery < recoveryCells.length) warnings.push('Recovery or communication zone is unreachable from deployment.');

  return {
    validated: true,
    deploymentConnected: deploymentCells.length > 0 && reachableCells.size > 0,
    deploymentReachable: deploymentCells.length > 0 && reachableCells.size > 0,
    validDeploymentCells: deploymentCells.length,
    reachableCells,
    reachableCount: reachableCells.size,
    totalNavigableCells,
    reachableNavigableRatio: totalNavigableCells ? round(reachableCells.size / totalNavigableCells) : 0,
    roiReachableRatio: roiTargets.length ? round(reachableRoi / roiTargets.length) : 1,
    recoveryReachable: recoveryCells.length ? reachableRecovery === recoveryCells.length : true,
    largestRegionSize: largest.size,
    isolatedRegions: Math.max(0, countRegions(mask) - 1),
    warnings
  };
}

 function validateGeneratedLevelConnectivity(level, mission = null, config = {}) {
  const summary = computeReachabilitySummary(level, mission);
  const minRatio = Number(config.minReachableNavigableRatio ?? 0.65);
  const requireRoi = config.requireRoiReachability !== false;
  const requireRecovery = config.requireRecoveryReachability !== false;
  const ok = summary.deploymentConnected
    && summary.reachableNavigableRatio >= minRatio
    && (!requireRoi || summary.roiReachableRatio >= 1)
    && (!requireRecovery || summary.recoveryReachable);
  return {
    ok,
    summary: stripReachableSet(summary),
    warnings: summary.warnings
  };
}

 function stripReachableSet(summary) {
  const { reachableCells, ...rest } = summary ?? {};
  return rest;
}

 function isNavigableCell(level, x, y) {
  const grid = level?.world?.grid ?? {};
  if (!isInBounds(x, y, Number(grid.width ?? 0), Number(grid.height ?? 0))) return false;
  if (level?.layers?.terrain?.[y]?.[x]) return false;
  return true;
}

 function getScoringRoiCells(level, mission = null) {
  const frame = level?.layers?.truth?.frames?.[0] ?? level?.layers?.forecast?.frames?.[0] ?? {};
  const roi = frame.roi ?? [];
  const threshold = Number(mission?.rules?.roiThreshold ?? 0.15);
  const cells = [];
  for (let y = 0; y < roi.length; y += 1) {
    for (let x = 0; x < (roi[y]?.length ?? 0); x += 1) {
      if (ROIValue.roiScalar(roi[y][x], 'expectedValue') >= threshold && isNavigableCell(level, x, y)) cells.push({ x, y });
    }
  }
  cells.sort((a, b) => ROIValue.roiScalar(roi[b.y][b.x], 'expectedValue') - ROIValue.roiScalar(roi[a.y][a.x], 'expectedValue'));
  return cells.slice(0, Math.max(1, Math.min(24, cells.length)));
}

 function getRecoveryCells(level, mission = null) {
  if (!mission) return [];
  const config = MissionRules.normalizeEndCondition(mission);
  if (config.mode === 'none' || !config.targetZoneId) return [];
  const zones = [
    ...(mission.rules?.endCondition?.zones ?? []),
    ...(mission.rules?.recoveryZones ?? []),
    ...(mission.rules?.communicationZones ?? []),
    ...(level?.zones ?? [])
  ];
  const zone = zones.find((candidate) => candidate.id === config.targetZoneId);
  if (Array.isArray(zone?.cells)) return zone.cells.filter((cell) => isNavigableCell(level, cell.x, cell.y));
  if (Number.isFinite(Number(zone?.x)) && Number.isFinite(Number(zone?.y))) return [{ x: Math.round(Number(zone.x)), y: Math.round(Number(zone.y)) }];
  return [];
}

function countRegions(mask) {
  const height = mask.length;
  const width = mask[0]?.length ?? 0;
  const visited = new Set();
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const key = cellKey(x, y);
      if (!mask[y][x] || visited.has(key)) continue;
      count += 1;
      const region = floodFillReachable(mask, [{ x, y }]);
      for (const item of region) visited.add(item);
    }
  }
  return count;
}

function uniqueCells(cells) {
  const seen = new Set();
  return cells.filter((cell) => {
    if (!Number.isFinite(Number(cell?.x)) || !Number.isFinite(Number(cell?.y))) return false;
    const key = cellKey(Math.round(Number(cell.x)), Math.round(Number(cell.y)));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((cell) => ({ x: Math.round(Number(cell.x)), y: Math.round(Number(cell.y)) }));
}

function neighbors4(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
}

function isInBounds(x, y, width, height) {
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < width && y < height;
}

function cellKey(x, y) {
  return `${Math.round(Number(x))},${Math.round(Number(y))}`;
}

function parseCellKey(key) {
  const [x, y] = String(key).split(',').map(Number);
  return { x, y };
}

function round(value) {
  return Number(Number(value).toFixed(3));
}

module.exports = {getDeploymentCells, floodFillReachable, findLargestNavigableRegion, computeReachabilitySummary, validateGeneratedLevelConnectivity, stripReachableSet, isNavigableCell, getScoringRoiCells, getRecoveryCells}