export function normalizeDeploymentState(level, mission, plan = null) {
  normalizeLevelDeploymentZones(level);
  normalizeMissionDeployments(level, mission);
  applyPlanSelectedStarts(level, mission, plan);
  return { level, mission, plan };
}

export function normalizeLevelDeploymentZones(level) {
  if (!level) return [];
  level.zones = Array.isArray(level.zones) ? level.zones : [];
  const existingIds = new Set(level.zones.map((zone) => zone.id));
  const legacyZones = level.layers?.deploymentZones ?? level.layers?.zones ?? [];
  for (const zone of legacyZones) {
    if (!zone || existingIds.has(zone.id)) continue;
    level.zones.push(normalizeZone(zone, level, level.zones.length));
    existingIds.add(zone.id);
  }
  for (const base of level.layers?.bases ?? []) {
    const id = `${base.id ?? 'base'}_deployment`;
    if (existingIds.has(id)) continue;
    level.zones.push({
      id,
      type: 'deployment',
      label: `${base.label ?? base.id ?? 'Base'} Drop Zone`,
      cells: cellsFromCircle(level, base.x, base.y, base.radius ?? 1)
    });
    existingIds.add(id);
  }
  level.zones = level.zones.map((zone, index) => normalizeZone(zone, level, index)).filter((zone) => zone.cells.length);
  return level.zones;
}

export function normalizeMissionDeployments(level, mission) {
  if (!mission) return mission;
  const zones = normalizeLevelDeploymentZones(level);
  const firstDeploymentZone = zones.find((zone) => zone.type === 'deployment');
  for (const agent of mission.agents ?? []) {
    const deployment = agent.deployment ?? {};
    const mode = deployment.mode ?? (agent.start ? 'fixedStart' : 'chooseFromZone');
    const explicitSelectedStart = deployment.selectedStart ?? agent.selectedStart ?? null;
    const zoneIds = Array.isArray(deployment.zoneIds) && deployment.zoneIds.length
      ? deployment.zoneIds
      : [deployment.zoneId ?? firstDeploymentZone?.id ?? null].filter(Boolean);
    agent.deployment = {
      mode,
      zoneId: deployment.zoneId ?? (mode === 'chooseFromZone' ? firstDeploymentZone?.id ?? null : null),
      zoneIds,
      selectedZoneId: deployment.selectedZoneId ?? deployment.zoneId ?? zoneIds[0] ?? null,
      selectedStart: mode === 'chooseFromZone' || mode === 'chooseFromZones' ? explicitSelectedStart : explicitSelectedStart ?? agent.start ?? null
    };
    if (mode === 'fixedStart') {
      const start = deployment.selectedStart ?? agent.start ?? agent.deployment.selectedStart;
      if (isFiniteCell(start)) {
        agent.start = { x: Number(start.x), y: Number(start.y) };
        agent.deployment.selectedStart = { ...agent.start };
      }
    } else if (!isValidSelectedStart(level, mission, agent.id, agent.deployment.selectedStart).valid) {
      agent.deployment.selectedStart = null;
      delete agent.start;
    } else {
      agent.deployment.selectedStart = agent.deployment.selectedStart;
      agent.start = { ...agent.deployment.selectedStart };
    }
  }
  return mission;
}

export function getDeploymentZones(level) {
  return (normalizeLevelDeploymentZones(level) ?? []).filter((zone) => zone.type === 'deployment');
}

export function getAgentDeployment(mission, agentId) {
  return mission?.agents?.find((agent) => agent.id === agentId)?.deployment ?? null;
}

export function getSelectedStart(agent) {
  const selected = agent?.deployment?.mode === 'chooseFromZone' || agent?.deployment?.mode === 'chooseFromZones'
    ? agent?.deployment?.selectedStart ?? agent?.selectedStart
    : agent?.deployment?.selectedStart ?? agent?.selectedStart ?? agent?.start;
  return isFiniteCell(selected) ? selected : null;
}

export function requiresDeploymentSelection(mission, agentId) {
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  return Boolean((agent?.deployment?.mode === 'chooseFromZone' || agent?.deployment?.mode === 'chooseFromZones') && !getSelectedStart(agent));
}

export function getDeploymentZoneForAgent(level, mission, agentId) {
  const deployment = getAgentDeployment(mission, agentId);
  const zones = getDeploymentZones(level);
  return zones.find((zone) => zone.id === deployment?.zoneId) ?? zones[0] ?? null;
}

export function getDeploymentZonesForAgent(level, mission, agentId) {
  const deployment = getAgentDeployment(mission, agentId);
  const zones = getDeploymentZones(level);
  if (deployment?.mode === 'chooseFromZones') {
    const allowed = new Set(deployment.zoneIds ?? []);
    const filtered = zones.filter((zone) => allowed.has(zone.id));
    return filtered.length ? filtered : zones;
  }
  const single = getDeploymentZoneForAgent(level, mission, agentId);
  return single ? [single] : [];
}

export function isValidSelectedStart(level, mission, agentId, cell) {
  if (!isFiniteCell(cell)) return { valid: false, message: 'Choose a deployment cell first.' };
  const rounded = roundCell(cell);
  const grid = level?.world?.grid ?? {};
  if (rounded.x < 0 || rounded.y < 0 || rounded.x >= grid.width || rounded.y >= grid.height) {
    return { valid: false, message: 'Deployment cell is outside the map.' };
  }
  if (level?.layers?.terrain?.[rounded.y]?.[rounded.x]) {
    return { valid: false, message: 'Deployment cell must be water.' };
  }
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  if (agent?.deployment?.mode !== 'chooseFromZone' && agent?.deployment?.mode !== 'chooseFromZones') return { valid: true, message: '' };
  const zones = getDeploymentZonesForAgent(level, mission, agentId);
  if (!zones.length) return { valid: false, message: 'No deployment zone is available for this glider.' };
  if (!zones.some((zone) => zone.cells.some((candidate) => candidate.x === rounded.x && candidate.y === rounded.y))) {
    return { valid: false, message: 'Choose a deployment cell inside the drop zone first.' };
  }
  return { valid: true, message: '' };
}

export function setSelectedStart(level, mission, plan, agentId, cell) {
  const validation = isValidSelectedStart(level, mission, agentId, cell);
  if (!validation.valid) return validation;
  const agent = mission?.agents?.find((candidate) => candidate.id === agentId);
  if (!agent) return { valid: false, message: 'No active glider selected.' };
  const selectedStart = cell;
  agent.deployment ??= { mode: 'fixedStart', zoneId: null, selectedStart };
  agent.deployment.selectedStart = selectedStart;
  const selectedZone = getDeploymentZonesForAgent(level, mission, agentId)
    .find((zone) => zone.cells.some((candidate) => candidate.x === selectedStart.x && candidate.y === selectedStart.y));
  if (selectedZone) {
    agent.deployment.selectedZoneId = selectedZone.id;
    agent.deployment.zoneId ??= selectedZone.id;
  }
  agent.deployment.locked = true;
  agent.start = { ...selectedStart };
  const agentPlan = plan?.agentPlans?.find((candidate) => candidate.agentId === agentId);
  if (agentPlan) agentPlan.selectedStart = { ...selectedStart };
  return { valid: true, selectedStart, message: '' };
}

export function applyPlanSelectedStarts(level, mission, plan) {
  if (!mission || !plan) return mission;
  for (const agentPlan of plan.agentPlans ?? []) {
    if (!agentPlan.selectedStart) continue;
    const validation = isValidSelectedStart(level, mission, agentPlan.agentId, agentPlan.selectedStart);
    if (!validation.valid) {
      delete agentPlan.selectedStart;
      continue;
    }
    setSelectedStart(level, mission, plan, agentPlan.agentId, agentPlan.selectedStart);
  }
  return mission;
}

export function summarizeDeployment(level, mission) {
  return {
    agents: (mission?.agents ?? []).map((agent) => {
      const zone = getDeploymentZoneForAgent(level, mission, agent.id);
      return {
        agentId: agent.id,
        mode: agent.deployment?.mode ?? (agent.start ? 'fixedStart' : 'chooseFromZone'),
        zoneId: agent.deployment?.zoneId ?? zone?.id ?? null,
        zoneIds: agent.deployment?.zoneIds ?? [agent.deployment?.zoneId ?? zone?.id].filter(Boolean),
        selectedZoneId: agent.deployment?.selectedZoneId ?? null,
        allowedZones: getDeploymentZonesForAgent(level, mission, agent.id),
        allowedCells: getDeploymentZonesForAgent(level, mission, agent.id).flatMap((candidate) => candidate.cells ?? []),
        selectedStart: getSelectedStart(agent)
      };
    })
  };
}

function normalizeZone(zone, level, index) {
  const cells = Array.isArray(zone.cells) && zone.cells.length
    ? zone.cells.filter(isFiniteCell)
    : cellsFromCircle(level, zone.x ?? zone.cx ?? zone.center?.x, zone.y ?? zone.cy ?? zone.center?.y, zone.radius ?? zone.r ?? 1);
  return {
    id: zone.id ?? `zone_${index + 1}`,
    type: zone.type ?? 'deployment',
    label: zone.label ?? zone.name ?? `Zone ${index + 1}`,
    cells: uniqueCells(cells).filter((cell) => isWaterCell(level, cell))
  };
}

function cellsFromCircle(level, cx, cy, radius = 1) {
  if (!Number.isFinite(Number(cx)) || !Number.isFinite(Number(cy))) return [];
  const grid = level?.world?.grid ?? { width: 0, height: 0 };
  const r = Math.max(0, Number(radius ?? 1));
  const cells = [];
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(grid.height - 1, Math.ceil(cy + r)); y += 1) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(grid.width - 1, Math.ceil(cx + r)); x += 1) {
      if (Math.hypot(x - Number(cx), y - Number(cy)) <= r + 0.001) cells.push({ x, y });
    }
  }
  return cells;
}

function isWaterCell(level, cell) {
  return !level?.layers?.terrain?.[cell.y]?.[cell.x];
}

function uniqueCells(cells) {
  const seen = new Set();
  return cells.filter((cell) => {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function roundCell(cell) {
  return { x: Math.round(Number(cell.x)), y: Math.round(Number(cell.y)) };
}

function isFiniteCell(cell) {
  return Number.isFinite(Number(cell?.x)) && Number.isFinite(Number(cell?.y));
}
