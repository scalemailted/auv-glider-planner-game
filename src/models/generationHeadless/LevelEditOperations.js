const CurrentFieldGenerator = require('./CurrentFieldGenerator.js')
const AgentSpecs = require('./AgentSpecs.js')
const ForecastGenerator = require('./ForecastGenerator.js')
const Random = require('./Random.js')
const GameInstanceId = require('./GameInstanceId.js')
const TemporalFrameTimes = require('./TemporalFrameTimes.js')
function normalizeLevelForEditor(rawLevel) {
  const level = GameInstanceId.ensureLevelIdentity(rawLevel);
  const width = clampInt(level.world?.grid?.width, 8, 64);
  const height = clampInt(level.world?.grid?.height, 8, 64);
  level.schemaVersion ??= '2.0';
  level.type = 'anchor.level';
  level.world ??= {};
  level.world.grid = { width, height, cellSizeMeters: level.world.grid?.cellSizeMeters ?? 100 };
  level.world.time ??= { dt: 1, duration: 24, planningWindow: 3, displayUnits: 'hours' };
  level.layers ??= {};
  level.layers.terrain = normalizeGrid(level.layers.terrain, width, height, 0);
  level.layers.hazards = normalizeGrid(level.layers.hazards, width, height, 0);
  level.layers.depth = level.layers.depth ? normalizeGrid(level.layers.depth, width, height, 0.5) : level.layers.depth;
  level.layers.bases = level.layers.bases?.length ? level.layers.bases : [{ id: 'base_alpha', x: 1, y: 1, radius: 1 }];
  level.layers.truth ??= {};
  level.layers.truth.frames = normalizeFrames(level.layers.truth.frames, level);
  if (level.layers.forecast?.frames?.length) {
    level.layers.forecast.frames = normalizeFrames(level.layers.forecast.frames, level);
  }
  level.layers.mobileHazards ??= [];
  level.meta ??= {};
  level.meta.editorConfig ??= {};
  return level;
}

 function applyEditorCellBrush(level, mission, x, y, brush, config = {}) {
  normalizeLevelForEditor(level);
  const frameIndex = clampInt(config.frameIndex ?? 0, 0, (level.layers.truth.frames?.length ?? 1) - 1);
  if (!inBounds(level, x, y)) return false;
  const radialBrushes = new Set(['terrain', 'hazard', 'depth', 'shallow', 'clear', 'roi', 'deploymentZone']);
  const radius = radialBrushes.has(brush) ? Math.max(0, Number(config.radius ?? 0)) : 0;
  if (radialBrushes.has(brush)) {
    let applied = false;
    forEachRadius(level, x, y, radius, (cellX, cellY, falloff) => {
      if (brush === 'terrain') {
        if (isBaseCell(level, cellX, cellY)) return;
        level.layers.terrain[cellY][cellX] = 1;
        level.layers.hazards[cellY][cellX] = 0;
      } else if (brush === 'hazard') {
        if (!level.layers.terrain[cellY][cellX]) level.layers.hazards[cellY][cellX] = 1;
      } else if (brush === 'depth') {
        level.layers.depth ??= normalizeGrid(null, level.world.grid.width, level.world.grid.height, 0.5);
        level.layers.depth[cellY][cellX] = round(Number(config.depthValue ?? 0.85));
      } else if (brush === 'shallow') {
        level.layers.depth ??= normalizeGrid(null, level.world.grid.width, level.world.grid.height, 0.5);
        level.layers.depth[cellY][cellX] = round(Number(config.depthValue ?? 0.18));
      } else if (brush === 'clear') {
        level.layers.terrain[cellY][cellX] = 0;
        level.layers.hazards[cellY][cellX] = 0;
      } else if (brush === 'roi') {
        const boost = Number(config.roiDelta ?? config.intensity ?? 0.2) * Math.max(0.15, falloff);
        editROI(level, cellX, cellY, boost, frameIndex, config.frameScope);
      } else if (brush === 'deploymentZone') {
        if (!level.layers.terrain[cellY][cellX]) addDeploymentCell(level, cellX, cellY);
      }
      applied = true;
    });
    if (!applied) return false;
  } else if (brush === 'base') {
    level.layers.terrain[y][x] = 0;
    level.layers.hazards[y][x] = 0;
    level.layers.bases = [{ id: 'base_alpha', x, y, radius: Number(config.baseRadius ?? 1) }];
  } else if (brush === 'agentStart') {
    const agent = getSelectedAgent(mission, config.agentId);
    if (!agent || level.layers.terrain[y][x]) return false;
    agent.start = { x, y };
  }
  stampEditorMetadata(level, config);
  return true;
}

function addDeploymentCell(level, x, y) {
  level.zones ??= [];
  let zone = level.zones.find((candidate) => candidate.type === 'deployment');
  if (!zone) {
    zone = { id: 'drop_alpha', type: 'deployment', label: 'Deployment Zone Alpha', cells: [] };
    level.zones.push(zone);
  }
  if (!zone.cells.some((cell) => cell.x === x && cell.y === y)) zone.cells.push({ x, y });
}

 function editCurrentVector(level, startCell, endCell, config = {}) {
  normalizeLevelForEditor(level);
  if (!startCell || !inBounds(level, startCell.x, startCell.y)) return false;
  const frameIndices = getFrameIndices(level, config);
  const intensity = Number(config.intensity ?? 0.4);
  const radius = Math.max(0, Number(config.radius ?? 1));
  const dx = endCell ? endCell.x - startCell.x : 1;
  const dy = endCell ? endCell.y - startCell.y : 0;
  const rawLength = Math.hypot(dx, dy);
  const length = Math.max(1, rawLength);
  const magnitude = Math.min(
    Number(config.maxCurrentEditMagnitude ?? 2),
    Math.max(Number(config.minCurrentEditMagnitude ?? 0.05), (rawLength || 1) * intensity)
  );
  const tool = config.currentTool ?? 'directional';
  for (const frameIndex of frameIndices) {
    const current = level.layers.truth.frames[frameIndex].current;
    forEachRadius(level, startCell.x, startCell.y, radius, (x, y, falloff) => {
      if (tool === 'calm') {
        current[y][x] = [0, 0];
      } else if (tool === 'vortex') {
        const rx = x - startCell.x;
        const ry = y - startCell.y;
        const dist = Math.max(0.5, Math.hypot(rx, ry));
        current[y][x] = [
          round((current[y][x]?.[0] ?? 0) + (-ry / dist) * magnitude * falloff),
          round((current[y][x]?.[1] ?? 0) + (rx / dist) * magnitude * falloff)
        ];
      } else if (tool === 'corridor') {
        current[y][x] = [
          round((current[y][x]?.[0] ?? 0) + magnitude * falloff),
          round((current[y][x]?.[1] ?? 0) + 0.04 * magnitude * falloff)
        ];
      } else {
        current[y][x] = [
          round((current[y][x]?.[0] ?? 0) + (dx / length) * magnitude * falloff),
          round((current[y][x]?.[1] ?? 0) + (dy / length) * magnitude * falloff)
        ];
      }
    });
  }
  maybeRefreshForecast(level, config);
  stampEditorMetadata(level, config);
  return true;
}

 function copyCurrentFrameToAll(level, frameIndex = 0) {
  normalizeLevelForEditor(level);
  const source = cloneGrid(level.layers.truth.frames[clampInt(frameIndex, 0, level.layers.truth.frames.length - 1)]?.current);
  for (const frame of level.layers.truth.frames) frame.current = cloneGrid(source);
}

 function regenerateCurrentSequence(level, config = {}) {
  normalizeLevelForEditor(level);
  const width = level.world.grid.width;
  const height = level.world.grid.height;
  const time = level.world.time ?? {};
  const frames = CurrentFieldGenerator.generateCurrentFrames({
    ...level.meta?.generationConfig,
    ...config,
    width,
    height,
    dt: time.dt ?? 1,
    duration: time.duration ?? level.layers.truth.frames.length,
    seed: config.seed ?? level.meta?.seed ?? level.instanceId,
    terrain: level.layers.terrain
  });
  level.layers.truth.frames = level.layers.truth.frames.map((frame, index) => ({
    ...frame,
    current: cloneGrid(frames[index]?.current ?? frames.at(-1)?.current ?? frame.current)
  }));
  maybeRefreshForecast(level, { ...config, refreshForecast: true });
  stampEditorMetadata(level, config);
}

 function updateLevelTime(level, config = {}) {
  normalizeLevelForEditor(level);
  const dt = Math.max(0.1, Number(config.dt ?? level.world.time.dt ?? 1));
  const duration = Math.max(dt, Number(config.duration ?? level.world.time.duration ?? 24));
  const planningWindow = Math.max(dt, Number(config.planningWindow ?? level.world.time.planningWindow ?? 3));
  level.world.time = { ...level.world.time, dt, duration, planningWindow, displayUnits: level.world.time.displayUnits ?? 'hours' };
  level.layers.truth.frames = normalizeFrames(level.layers.truth.frames, level);
}

 function buildDefaultMissionForLevel(level, config = {}) {
  normalizeLevelForEditor(level);
  const base = level.layers.bases?.[0] ?? { x: 1, y: 1 };
  const count = clampInt(config.agentCount ?? 1, 1, 8);
  const battery = Number(config.battery ?? 100);
  const maxSpeed = Number(config.maxSpeed ?? 1.25);
  const deploymentMode = config.deploymentMode === 'chooseFromZones' ? 'chooseFromZones' : config.deploymentMode === 'chooseFromZone' ? 'chooseFromZone' : 'fixedStart';
  const deploymentZoneIds = Array.isArray(config.deploymentZoneIds) && config.deploymentZoneIds.length
    ? config.deploymentZoneIds
    : [config.deploymentZoneId ?? level.zones?.find((zone) => zone.type === 'deployment')?.id ?? 'drop_alpha'];
  const agents = Array.from({ length: count }, (_, index) => {
    const specs = AgentSpecs.buildAgentSpecs(index, {
      ...config,
      battery,
      maxSpeed,
      fuel: battery,
      gliderSpeed: maxSpeed
    });
    const start = { x: base.x, y: Math.min(level.world.grid.height - 1, base.y + index) };
    return {
      id: `glider_${String(index + 1).padStart(2, '0')}`,
      label: `Glider ${String(index + 1).padStart(2, '0')}`,
      start: deploymentMode === 'fixedStart' ? start : undefined,
      deployment: deploymentMode === 'chooseFromZone' || deploymentMode === 'chooseFromZones'
        ? { mode: deploymentMode, zoneId: deploymentZoneIds[0] ?? null, zoneIds: deploymentZoneIds, selectedZoneId: null, selectedStart: null }
        : { mode: 'fixedStart', zoneId: null, selectedStart: start },
      ...specs,
      collisionRadius: 0.5
    };
  });
  return {
    schemaVersion: '2.0',
    type: 'anchor.mission',
    missionId: config.missionId ?? 'custom_editor_mission',
    meta: {
      name: config.name ?? 'Custom Editor Mission',
      description: 'Default mission criteria generated from the edited level.'
    },
    agents,
    rules: {
      roiThreshold: 0.15,
      allowStartPlacement: true,
      endCondition: {
        mode: config.endConditionMode ?? 'none',
        requiredByMissionEnd: Boolean(config.endConditionRequired),
        targetZoneId: level.layers.bases?.[0]?.id ?? 'base_alpha',
        bonus: Number(config.endConditionBonus ?? 0),
        penalty: Number(config.endConditionPenalty ?? 0)
      },
      sampling: {
        mode: config.samplingMode ?? 'unique',
        duplicateValueMultiplier: Number(config.duplicateValueMultiplier ?? 0),
        localDepletionRadius: Number(config.localDepletionRadius ?? 0),
        depletionFactor: Number(config.depletionFactor ?? 0),
        cooldownWindows: Number(config.cooldownWindows ?? 0),
        persistentWindowMultiplier: Number(config.persistentWindowMultiplier ?? 1)
      },
      communication: {
        mode: 'surfaceOnly',
        surfaceInterval: Number(config.surfaceInterval ?? level.world.time?.planningWindow ?? 3),
        surfaceDuration: 0.25,
        allowReplanningOnSurface: true,
        updatePenalty: 2
      },
      drift: {
        mode: config.stochasticDrift ? 'forecastUncertain' : 'deterministic',
        driftGain: Number(config.driftGain ?? 0.6),
        stochasticDrift: Boolean(config.stochasticDrift),
        noiseScale: Number(config.driftNoiseScale ?? 0),
        seed: config.driftSeed ?? config.seed ?? level.meta?.seed ?? level.instanceId ?? level.levelId
      },
      forecast: config.forecastRules ?? { mode: 'none' }
    },
    objectives: [
      { id: 'collect_samples', label: 'Collect valuable samples', metric: 'sampleScore', operator: '>=', value: 0.5 },
      { id: 'avoid_hazards', label: 'Avoid hazards', metric: 'hazardsHit', operator: '<=', value: 0 }
    ],
    physics: {
      driftGain: Number(config.driftGain ?? 0.6),
      energyPerCell: 1.0
    },
    scoring: {
      sampleWeight: 100,
      energyPenalty: 0.05,
      hazardPenalty: 150,
      elapsedTimePenalty: 0.01,
      updatePenalty: 2
    }
  };
}

 function updateMissionAgents(mission, level, config = {}) {
  const updated = mission ?? buildDefaultMissionForLevel(level, config);
  const desired = clampInt(config.agentCount ?? updated.agents?.length ?? 1, 1, 8);
  const template = buildDefaultMissionForLevel(level, config).agents;
  updated.agents = Array.from({ length: desired }, (_, index) => ({
    ...(updated.agents?.[index] ?? template[index]),
    id: updated.agents?.[index]?.id ?? template[index].id,
    label: updated.agents?.[index]?.label ?? template[index].label,
    deployment: updated.agents?.[index]?.deployment ?? template[index].deployment,
    start: updated.agents?.[index]?.start ?? template[index].start,
    battery: Number(config.battery ?? updated.agents?.[index]?.battery ?? 100),
    maxSpeed: Number(config.maxSpeed ?? updated.agents?.[index]?.maxSpeed ?? 1.25)
  }));
  updated.rules ??= {};
  updated.rules.allowStartPlacement = true;
  updated.rules.endCondition = {
    ...(updated.rules.endCondition ?? {}),
    mode: config.endConditionMode ?? updated.rules.endCondition?.mode ?? 'none',
    requiredByMissionEnd: Boolean(config.endConditionRequired ?? updated.rules.endCondition?.requiredByMissionEnd ?? false),
    targetZoneId: updated.rules.endCondition?.targetZoneId ?? level?.layers?.bases?.[0]?.id ?? 'base_alpha',
    bonus: Number(config.endConditionBonus ?? updated.rules.endCondition?.bonus ?? 0),
    penalty: Number(config.endConditionPenalty ?? updated.rules.endCondition?.penalty ?? 0)
  };
  updated.rules.sampling = {
    ...(updated.rules.sampling ?? {}),
    mode: config.samplingMode ?? updated.rules.sampling?.mode ?? 'unique',
    duplicateValueMultiplier: Number(config.duplicateValueMultiplier ?? updated.rules.sampling?.duplicateValueMultiplier ?? 0),
    localDepletionRadius: Number(config.localDepletionRadius ?? updated.rules.sampling?.localDepletionRadius ?? 0),
    depletionFactor: Number(config.depletionFactor ?? updated.rules.sampling?.depletionFactor ?? 0),
    cooldownWindows: Number(config.cooldownWindows ?? updated.rules.sampling?.cooldownWindows ?? 0),
    persistentWindowMultiplier: Number(config.persistentWindowMultiplier ?? updated.rules.sampling?.persistentWindowMultiplier ?? 1)
  };
  return updated;
}

function normalizeFrames(frames, level) {
  const width = level.world.grid.width;
  const height = level.world.grid.height;
  const dt = Number(level.world.time?.dt ?? 1);
  const duration = Number(level.world.time?.duration ?? frames?.length ?? 24);
  const times = TemporalFrameTimes.buildTemporalFrameTimes({ duration, dt: Math.max(0.1, dt) });
  const fallbackCurrent = normalizeCurrent(null, width, height);
  const fallbackRoi = normalizeGrid(null, width, height, 0);
  return times.map((time, index) => {
    const frame = frames?.[index] ?? frames?.at(-1) ?? {};
    const normalized = {
      t: time,
      current: normalizeCurrent(frame.current ?? fallbackCurrent, width, height),
      roi: normalizeGrid(frame.roi ?? fallbackRoi, width, height, 0)
    };
    if (frame.confidence) normalized.confidence = normalizeGrid(frame.confidence, width, height, 1);
    if (frame.uncertainty) normalized.uncertainty = normalizeGrid(frame.uncertainty, width, height, 0);
    if (frame.forecastConfidence !== undefined) normalized.forecastConfidence = Number(frame.forecastConfidence);
    return normalized;
  });
}

function normalizeCurrent(grid, width, height) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const value = grid?.[y]?.[x] ?? [0, 0];
    return [round(Number(value[0] ?? 0)), round(Number(value[1] ?? 0))];
  }));
}

function normalizeGrid(grid, width, height, fill) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => grid?.[y]?.[x] ?? fill));
}

function editROI(level, x, y, delta, frameIndex, scope = 'current') {
  const indices = scope === 'all' ? level.layers.truth.frames.map((_frame, index) => index) : [frameIndex];
  for (const index of indices) {
    const cell = level.layers.truth.frames[index].roi[y][x];
    if (cell && typeof cell === 'object') {
      const value = Math.max(0, Math.min(1, Number(cell.value ?? 0) + delta));
      const probability = Math.max(0, Math.min(1, Number(cell.probability ?? 1)));
      level.layers.truth.frames[index].roi[y][x] = { ...cell, value: round(value), probability, expectedValue: round(value * probability) };
    } else {
      level.layers.truth.frames[index].roi[y][x] = round(Math.max(0, Math.min(1, Number(cell ?? 0) + delta)));
    }
  }
}

function maybeRefreshForecast(level, config) {
  if (!config.refreshForecast && level.challengeMode !== 'forecast') return;
  const random = Random.createSeededRandom(config.seed ?? level.meta?.seed ?? level.instanceId ?? 'editor');
  level.layers.forecast = {
    frames: ForecastGenerator.makeForecastFromTruth(level.layers.truth.frames, { forecastMode: 'noisy', forecastNoise: Number(config.forecastNoise ?? 0.12) }, random)
  };
}

function getFrameIndices(level, config) {
  const frameIndex = clampInt(config.frameIndex ?? 0, 0, level.layers.truth.frames.length - 1);
  return config.frameScope === 'all'
    ? level.layers.truth.frames.map((_frame, index) => index)
    : [frameIndex];
}

function forEachRadius(level, cx, cy, radius, callback) {
  for (let y = Math.max(0, cy - radius); y <= Math.min(level.world.grid.height - 1, cy + radius); y += 1) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(level.world.grid.width - 1, cx + radius); x += 1) {
      const distance = Math.hypot(x - cx, y - cy);
      if (distance > radius) continue;
      callback(x, y, radius === 0 ? 1 : 1 - distance / Math.max(1, radius));
    }
  }
}

function getSelectedAgent(mission, agentId) {
  return mission?.agents?.find((agent) => agent.id === agentId) ?? mission?.agents?.[0] ?? null;
}

function isBaseCell(level, x, y) {
  return (level.layers.bases ?? []).some((base) => Math.round(base.x) === x && Math.round(base.y) === y);
}

function inBounds(level, x, y) {
  return x >= 0 && y >= 0 && x < level.world.grid.width && y < level.world.grid.height;
}

function stampEditorMetadata(level, config) {
  level.meta ??= {};
  level.meta.generated = false;
  level.meta.editorConfig = {
    ...(level.meta.editorConfig ?? {}),
    lastTool: config.brush ?? config.currentTool ?? level.meta.editorConfig?.lastTool ?? null,
    updatedAt: new Date().toISOString()
  };
}

function cloneGrid(grid) {
  return (grid ?? []).map((row) => row.map((cell) => Array.isArray(cell) ? [...cell] : (cell && typeof cell === 'object' ? { ...cell } : cell)));
}

function round(value) {
  return Number(Number(value).toFixed(3));
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

module.exports = {applyEditorCellBrush, editCurrentVector, copyCurrentFrameToAll, regenerateCurrentSequence, updateLevelTime, buildDefaultMissionForLevel, updateMissionAgents}