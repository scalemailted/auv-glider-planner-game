const SeededRng = require('./mission-simulator/src/SeededRng.js')
const NAVIGATION_UNCERTAINTY_LEVELS = ['off', 'low', 'medium', 'high'];

 const NAVIGATION_UNCERTAINTY_PRESETS = {
  off: {
    label: 'Off',
    baseConeWidthCells: 0,
    growthPerHour: 0,
    currentSensitivity: 0,
    maneuverSensitivity: 0,
    maxConeWidthCells: 0,
    riskPenaltyScale: 0
  },
  low: {
    label: 'Low',
    baseConeWidthCells: 0.15,
    growthPerHour: 0.045,
    currentSensitivity: 0.1,
    maneuverSensitivity: 0.035,
    maxConeWidthCells: 1.1,
    riskPenaltyScale: 0.75
  },
  medium: {
    label: 'Medium',
    baseConeWidthCells: 0.25,
    growthPerHour: 0.085,
    currentSensitivity: 0.18,
    maneuverSensitivity: 0.055,
    maxConeWidthCells: 1.8,
    riskPenaltyScale: 1
  },
  high: {
    label: 'High',
    baseConeWidthCells: 0.38,
    growthPerHour: 0.135,
    currentSensitivity: 0.28,
    maneuverSensitivity: 0.08,
    maxConeWidthCells: 2.7,
    riskPenaltyScale: 1.25
  }
};

 function createDefaultNavigationUncertaintyConfig(level = 'off') {
  return normalizeNavigationUncertaintyConfig({ level });
}

 function normalizeNavigationUncertaintyConfig(config = {}) {
  const source = typeof config === 'string' ? { level: config } : (config ?? {});
  const level = NAVIGATION_UNCERTAINTY_LEVELS.includes(source.level) ? source.level : 'off';
  const preset = NAVIGATION_UNCERTAINTY_PRESETS[level] ?? NAVIGATION_UNCERTAINTY_PRESETS.off;
  return {
    enabled: level !== 'off',
    level,
    label: preset.label,
    seeded: source.seeded !== false,
    showCone: source.showCone !== false,
    gpsCorrectionOnSurface: source.gpsCorrectionOnSurface !== false,
    baseConeWidthCells: finiteNumber(source.baseConeWidthCells, preset.baseConeWidthCells),
    growthPerHour: finiteNumber(source.growthPerHour, preset.growthPerHour),
    currentSensitivity: finiteNumber(source.currentSensitivity, preset.currentSensitivity),
    maneuverSensitivity: finiteNumber(source.maneuverSensitivity, preset.maneuverSensitivity),
    maxConeWidthCells: finiteNumber(source.maxConeWidthCells, preset.maxConeWidthCells),
    riskPenaltyScale: finiteNumber(source.riskPenaltyScale, preset.riskPenaltyScale)
  };
}

 function navigationUncertaintyLabel(value) {
  const config = normalizeNavigationUncertaintyConfig(typeof value === 'object' ? value : { level: value });
  return config.label;
}

 function getNavigationUncertaintyConfig({ level = null, mission = null, generationConfig = null } = {}) {
  return normalizeNavigationUncertaintyConfig(
    level
      ? { level }
      : mission?.rules?.navigationUncertainty
        ?? mission?.meta?.navigationUncertainty
        ?? generationConfig?.navigationUncertainty
        ?? generationConfig?.scenarioSetup?.navigationUncertainty
        ?? {}
  );
}

 function estimateDeadReckoningCone({
  from,
  to,
  durationHours = 0,
  level = null,
  mission = null,
  frame = null,
  segmentCells = [],
  segmentIndex = 0,
  agentId = null
} = {}) {
  const config = getNavigationUncertaintyConfig({ mission, generationConfig: level?.meta?.generationConfig });
  if (!config.enabled) {
    return {
      enabled: false,
      level: 'off',
      coneWidthCells: 0,
      radiusCells: 0,
      durationHours: round(durationHours),
      risk: createEmptyRisk()
    };
  }

  const distance = isFinitePoint(from) && isFinitePoint(to)
    ? Math.hypot(Number(to.x) - Number(from.x), Number(to.y) - Number(from.y))
    : Math.max(0, segmentCells.length - 1);
  const currentMagnitude = averageCurrentMagnitude(frame, segmentCells);
  const gridWidth = Number(level?.width ?? level?.world?.grid?.width ?? level?.layers?.terrain?.[0]?.length ?? 12);
  const maneuverLoad = Math.min(1, distance / Math.max(1, gridWidth));
  const coneWidthCells = Math.min(
    config.maxConeWidthCells,
    config.baseConeWidthCells
      + Math.max(0, Number(durationHours) || 0) * config.growthPerHour
      + currentMagnitude * config.currentSensitivity
      + maneuverLoad * config.maneuverSensitivity
  );
  const cone = {
    enabled: true,
    level: config.level,
    coneWidthCells: round(coneWidthCells),
    radiusCells: round(coneWidthCells),
    maxConeWidthCells: config.maxConeWidthCells,
    durationHours: round(durationHours),
    currentMagnitude: round(currentMagnitude),
    gpsCorrectionOnSurface: config.gpsCorrectionOnSurface,
    seeded: config.seeded,
    showCone: config.showCone,
    segmentIndex,
    agentId
  };
  return {
    ...cone,
    seededOffset: config.seeded
      ? sampleSeededNavigationOffset({
        seed: level?.meta?.derivedSeeds?.truth ?? level?.meta?.generationConfig?.derivedSeeds?.truth ?? level?.instanceId ?? level?.levelId,
        agentId,
        segmentIndex,
        timeFraction: 1,
        coneWidthCells
      })
      : { lateralCells: 0, alongTrackCells: 0 },
    risk: assessDeadReckoningConeRisk({ level, segmentCells, cone, config })
  };
}

 function sampleSeededNavigationOffset({
  seed,
  agentId = 'agent',
  segmentIndex = 0,
  timeFraction = 1,
  coneWidthCells = 0
} = {}) {
  const rng = SeededRng.createSeededRng(`${seed ?? 'anchor'}:navigation:${agentId}:${segmentIndex}`);
  const phase = rng() * Math.PI * 2;
  const amplitude = Math.sqrt(rng()) * Math.max(0, Number(coneWidthCells) || 0);
  const smooth = 0.5 - 0.5 * Math.cos(Math.max(0, Math.min(1, Number(timeFraction) || 0)) * Math.PI);
  return {
    lateralCells: round(Math.sin(phase) * amplitude * smooth),
    alongTrackCells: round(Math.cos(phase) * amplitude * 0.35 * smooth)
  };
}

 function assessDeadReckoningConeRisk({ level, segmentCells = [], cone = {}, config = null } = {}) {
  if (!cone.enabled || !segmentCells.length) return createEmptyRisk();
  const radius = Math.max(1, Math.ceil(Number(cone.coneWidthCells ?? 0)));
  const width = Number(level?.width ?? level?.world?.grid?.width ?? level?.layers?.terrain?.[0]?.length ?? 0);
  const height = Number(level?.height ?? level?.world?.grid?.height ?? level?.layers?.terrain?.length ?? 0);
  const nearby = new Set();
  for (const cell of segmentCells) {
    const cx = Math.round(Number(cell?.x));
    const cy = Math.round(Number(cell?.y));
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.hypot(dx, dy) > radius + 0.15) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        nearby.add(`${x},${y}`);
      }
    }
  }
  let landOverlapCells = 0;
  let hazardOverlapCells = 0;
  for (const key of nearby) {
    const [x, y] = key.split(',').map(Number);
    if (isLand(level?.layers?.terrain?.[y]?.[x])) landOverlapCells += 1;
    if (Number(level?.layers?.hazards?.[y]?.[x] ?? 0) > 0) hazardOverlapCells += 1;
  }
  const denominator = Math.max(1, nearby.size);
  const landRisk = landOverlapCells / denominator;
  const hazardRisk = hazardOverlapCells / denominator;
  const scale = config?.riskPenaltyScale ?? NAVIGATION_UNCERTAINTY_PRESETS[cone.level]?.riskPenaltyScale ?? 1;
  return {
    checkedCells: nearby.size,
    landOverlapCells,
    hazardOverlapCells,
    landRisk: round(landRisk),
    hazardRisk: round(hazardRisk),
    penalty: round(Math.min(26, (landRisk * 32 + hazardRisk * 22) * scale)),
    warning: landOverlapCells > 0 || hazardOverlapCells > 0
  };
}

function averageCurrentMagnitude(frame, cells = []) {
  const current = frame?.current ?? frame?.currents ?? null;
  if (!current || !cells.length) return 0;
  let total = 0;
  let count = 0;
  for (const cell of cells) {
    const x = Math.round(Number(cell?.x));
    const y = Math.round(Number(cell?.y));
    const vector = current?.[y]?.[x];
    const vx = Number(vector?.vx ?? vector?.x ?? vector?.u ?? 0);
    const vy = Number(vector?.vy ?? vector?.y ?? vector?.v ?? 0);
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) continue;
    total += Math.hypot(vx, vy);
    count += 1;
  }
  return count ? total / count : 0;
}

function isLand(value) {
  if (typeof value === 'string') return value === 'land' || value === 'shore' || value === 'blocked';
  return Number(value ?? 0) > 0;
}

function createEmptyRisk() {
  return {
    checkedCells: 0,
    landOverlapCells: 0,
    hazardOverlapCells: 0,
    landRisk: 0,
    hazardRisk: 0,
    penalty: 0,
    warning: false
  };
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 3) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

module.exports = {NAVIGATION_UNCERTAINTY_PRESETS, createDefaultNavigationUncertaintyConfig, normalizeNavigationUncertaintyConfig, navigationUncertaintyLabel, getNavigationUncertaintyConfig, estimateDeadReckoningCone, sampleSeededNavigationOffset, assessDeadReckoningConeRisk}