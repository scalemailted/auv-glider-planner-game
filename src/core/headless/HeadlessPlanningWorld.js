export function buildHeadlessPlanningWorld(context) {
  const level = context.level ?? {};
  const mission = context.mission ?? {};
  const visible = context.visibleFields ?? {};
  const terrain = visible.terrain ?? level.layers?.terrain ?? [];
  const hazards = visible.hazards ?? level.layers?.hazards ?? [];
  const frame = chooseVisiblePlanningFrame(visible, { oracle: context.oracle });
  const grid = level.world?.grid ?? {};
  const time = level.world?.time ?? {};
  const width = Number(grid.width ?? terrain?.[0]?.length ?? 0);
  const height = Number(grid.height ?? terrain?.length ?? 0);
  const duration = Number(time.duration ?? 1);
  const planningWindow = Number(time.planningWindow ?? (duration || 1));
  return {
    context,
    level,
    mission,
    width,
    height,
    duration,
    planningWindow,
    windowCount: Math.max(1, Math.ceil(duration / Math.max(0.001, planningWindow))),
    terrain,
    hazards,
    depth: visible.depth ?? level.layers?.depth ?? [],
    roi: frame?.roi ?? visible.roi ?? [],
    current: frame?.current ?? [],
    frame,
    agents: mission.agents ?? [],
    deploymentAgents: context.packet?.deployment?.agents ?? [],
    visiblePlanningSource: context.packet?.visiblePlanningSource ?? null,
    oracle: context.oracle
  };
}

export function solveGreedyHeadlessPlan(world, { maxWaypoints = 4 } = {}) {
  const candidates = makeCandidates(world);
  const usedTargets = new Set();
  return (world.agents ?? []).map((agent) => solveAgent(agent, world, candidates, usedTargets, { maxWaypoints }));
}

function solveAgent(agent, world, candidates, usedTargets, { maxWaypoints }) {
  const agentId = String(agent.id ?? '');
  const start = chooseStart(agent, world);
  let current = { x: start.x, y: start.y };
  let elapsed = 0;
  let fuelUsed = 0;
  const speed = Math.max(0.05, Number(agent.maxSpeed ?? 1));
  const fuelBudget = Number(agent.battery ?? agent.maxBattery ?? world.mission?.rules?.energyBudget ?? 100);
  const energyPerCell = Number(world.mission?.physics?.energyPerCell ?? 1);
  const waypoints = [];

  for (let index = 0; index < Math.min(maxWaypoints, world.windowCount); index += 1) {
    const target = chooseTarget(current, world, candidates, usedTargets);
    if (!target) break;
    const distance = Math.hypot(target.x - current.x, target.y - current.y);
    const travelTime = distance / speed;
    const energy = distance * energyPerCell;
    const nextTime = elapsed + travelTime;
    if (Number.isFinite(world.duration) && nextTime > world.duration) break;
    if (Number.isFinite(fuelBudget) && fuelUsed + energy > fuelBudget) break;
    elapsed = nextTime;
    fuelUsed += energy;
    current = { x: target.x, y: target.y };
    usedTargets.add(cellKey(target.x, target.y));
    waypoints.push({
      id: `${agentId}_node_wp_${String(index + 1).padStart(3, '0')}`,
      window: Math.min(index, world.windowCount - 1),
      t: round(elapsed),
      estimatedArrivalTime: round(elapsed),
      segmentTravelTime: round(travelTime),
      segmentEnergy: round(energy),
      cumulativeEnergy: round(fuelUsed),
      remainingFuelEstimate: round(Math.max(0, fuelBudget - fuelUsed)),
      x: target.x,
      y: target.y,
      action: 'sample',
      note: `node-headless-greedy-v1 expectedValue=${round(target.value)}`
    });
  }

  return {
    agentId,
    ...(start.selectedStart ? { selectedStart: { x: start.x, y: start.y } } : {}),
    waypoints
  };
}

function chooseVisiblePlanningFrame(visible, { oracle = false } = {}) {
  const forecastFrames = visible.forecast?.frames ?? [];
  if (forecastFrames.length) return forecastFrames[0];
  for (const member of visible.forecasts ?? []) {
    if (member?.frames?.length) return member.frames[0];
  }
  if (oracle) {
    const truthFrames = visible.truth?.frames ?? [];
    if (truthFrames.length) return truthFrames[0];
  }
  return {};
}

function makeCandidates(world) {
  const candidates = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (isBlocked(world, x, y) || isHazard(world, x, y)) continue;
      const value = roiExpectedValue(valueAt(world.roi, x, y, 0));
      if (value <= 0) continue;
      candidates.push({ x, y, value });
    }
  }
  candidates.sort((a, b) => (b.value - a.value) || (a.y - b.y) || (a.x - b.x));
  return candidates;
}

function chooseStart(agent, world) {
  const deployment = (world.deploymentAgents ?? []).find((candidate) => candidate.agentId === agent.id);
  const selectedStart = deployment?.selectedStart;
  if (isPoint(selectedStart) && !isBlocked(world, Number(selectedStart.x), Number(selectedStart.y))) {
    return { x: Math.round(Number(selectedStart.x)), y: Math.round(Number(selectedStart.y)), selectedStart: true };
  }
  for (const cell of deployment?.allowedCells ?? []) {
    if (isPoint(cell) && !isBlocked(world, Number(cell.x), Number(cell.y))) {
      return { x: Math.round(Number(cell.x)), y: Math.round(Number(cell.y)), selectedStart: true };
    }
  }
  const start = agent.start ?? {};
  return { x: Math.round(Number(start.x ?? 0)), y: Math.round(Number(start.y ?? 0)), selectedStart: false };
}

function chooseTarget(current, world, candidates, usedTargets) {
  let best = null;
  for (const candidate of candidates) {
    if (usedTargets.has(cellKey(candidate.x, candidate.y))) continue;
    if (!clearLine(world, current, candidate)) continue;
    const distance = Math.max(1, Math.hypot(candidate.x - current.x, candidate.y - current.y));
    const score = candidate.value / distance;
    if (!best || score > best.score || (score === best.score && candidate.value > best.value)) {
      best = { ...candidate, score };
    }
  }
  return best;
}

function clearLine(world, start, end) {
  for (const cell of bresenhamLine(Math.round(start.x), Math.round(start.y), Math.round(end.x), Math.round(end.y))) {
    if (isBlocked(world, cell.x, cell.y) || isHazard(world, cell.x, cell.y)) return false;
  }
  return true;
}

function bresenhamLine(x0, y0, x1, y1) {
  const cells = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    cells.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
  return cells;
}

function roiExpectedValue(cell) {
  if (cell && typeof cell === 'object') {
    const value = Number(cell.value ?? cell.rewardValue ?? cell.expectedValue ?? 0);
    const probability = Math.max(0, Math.min(1, Number(cell.probability ?? 1)));
    return Number(cell.expectedValue ?? value * probability) || 0;
  }
  return Number(cell ?? 0) || 0;
}

function isBlocked(world, x, y) {
  return Boolean(valueAt(world.terrain, Math.round(x), Math.round(y), 1));
}

function isHazard(world, x, y) {
  return Number(valueAt(world.hazards, Math.round(x), Math.round(y), 0)) > 0;
}

function valueAt(grid, x, y, fallback = null) {
  if (!Array.isArray(grid) || y < 0 || x < 0 || y >= grid.length || x >= (grid[y]?.length ?? 0)) return fallback;
  return grid[y][x];
}

function isPoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function cellKey(x, y) {
  return `${Math.round(Number(x))},${Math.round(Number(y))}`;
}

function round(value) {
  return Math.round(Number(value ?? 0) * 1000) / 1000;
}
