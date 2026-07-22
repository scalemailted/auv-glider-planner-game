const ConnectivityValidator = require('./ConnectivityValidator.js')
function repairDeploymentConnectivity(level, mission = null, config = {}) {
  const terrain = level?.layers?.terrain;
  if (!Array.isArray(terrain)) return { repaired: false, method: 'none', summary: null };
  const maxRepairAttempts = Math.max(1, Number(config.maxRepairAttempts ?? 3));
  let repaired = false;
  let method = 'none';

  for (let attempt = 0; attempt < maxRepairAttempts; attempt += 1) {
    const deploymentCells = ConnectivityValidator.getDeploymentCells(level, mission);
    if (!deploymentCells.length) clearFirstDeploymentZone(level);
    clearDeploymentNeighbors(level, mission);
    const start = ConnectivityValidator.getDeploymentCells(level, mission)[0] ?? firstWaterCell(level);
    if (!start) break;

    const mask = ConnectivityValidator.getNavigableMask(level);
    const largest = ConnectivityValidator.findLargestNavigableRegion(mask);
    const target = nearestCell(start, largest.cells);
    if (target) {
      carveCorridor(terrain, start, target, { radius: 1 });
      repaired = true;
      method = 'corridor';
    }

    const roiTarget = nearestCell(start, ConnectivityValidator.getScoringRoiCells(level, mission));
    if (roiTarget) {
      carveCorridor(terrain, start, roiTarget, { radius: 0 });
      repaired = true;
      method = method === 'none' ? 'roiCorridor' : `${method}+roi`;
    }

    const validation = ConnectivityValidator.validateGeneratedLevelConnectivity(level, mission, config);
    if (validation.ok) {
      return {
        repaired,
        method,
        summary: validation.summary
      };
    }
  }

  return {
    repaired,
    method,
    summary: ConnectivityValidator.stripReachableSet(ConnectivityValidator.computeReachabilitySummary(level, mission))
  };
}

 function carveCorridor(terrain, startCell, targetCell, options = {}) {
  if (!Array.isArray(terrain) || !startCell || !targetCell) return false;
  const height = terrain.length;
  const width = terrain[0]?.length ?? 0;
  const radius = Math.max(0, Math.round(Number(options.radius ?? 0)));
  let x = clamp(Math.round(Number(startCell.x)), 0, width - 1);
  let y = clamp(Math.round(Number(startCell.y)), 0, height - 1);
  const tx = clamp(Math.round(Number(targetCell.x)), 0, width - 1);
  const ty = clamp(Math.round(Number(targetCell.y)), 0, height - 1);
  clearAt(terrain, x, y, radius);
  while (x !== tx) {
    x += x < tx ? 1 : -1;
    clearAt(terrain, x, y, radius);
  }
  while (y !== ty) {
    y += y < ty ? 1 : -1;
    clearAt(terrain, x, y, radius);
  }
  return true;
}

function clearDeploymentNeighbors(level, mission) {
  for (const cell of ConnectivityValidator.getDeploymentCells(level, mission)) {
    clearAt(level.layers.terrain, cell.x, cell.y, 1);
    if (level.layers.hazards) clearAt(level.layers.hazards, cell.x, cell.y, 0);
  }
}

function clearFirstDeploymentZone(level) {
  const zone = level?.zones?.find((candidate) => candidate.type === 'deployment');
  for (const cell of zone?.cells ?? []) {
    clearAt(level.layers.terrain, cell.x, cell.y, 0);
    if (level.layers.hazards) clearAt(level.layers.hazards, cell.x, cell.y, 0);
  }
}

function firstWaterCell(level) {
  for (let y = 0; y < (level?.world?.grid?.height ?? 0); y += 1) {
    for (let x = 0; x < (level?.world?.grid?.width ?? 0); x += 1) {
      if (!level.layers?.terrain?.[y]?.[x]) return { x, y };
    }
  }
  return null;
}

function nearestCell(start, cells = []) {
  if (!start || !cells.length) return null;
  return [...cells].sort((a, b) => distance(start, a) - distance(start, b))[0] ?? null;
}

function distance(a, b) {
  return Math.abs(Number(a.x) - Number(b.x)) + Math.abs(Number(a.y) - Number(b.y));
}

function clearAt(grid, x, y, radius) {
  const height = grid?.length ?? 0;
  const width = grid?.[0]?.length ?? 0;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
      grid[yy][xx] = 0;
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = {carveCorridor}