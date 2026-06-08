import { generateCurrentFrames } from './CurrentFieldGenerator.js';
import { generateROI, createHotspots } from './ROIFieldGenerator.js';
import { generateHazards } from './HazardGenerator.js';
import { makeForecastEnsembleFromTruth, makeForecastFromTruth } from './ForecastGenerator.js';
import { generateTerrain } from './TerrainGenerator.js';
import { generateDepth } from './DepthGenerator.js';
import { applyDifficultyPreset } from './DifficultyPresets.js';
import { createSeededRandom, hashSeed } from './Random.js';
import { ensureLevelIdentity } from '../identity/GameInstanceId.js';
import { normalizeROIGrid } from '../sim/ROIValue.js';
import { buildFluidGeneratorMetadata, isFluidCurrentPattern, normalizeFluidPreset } from '../fluids/FluidPresets.js';
import { computeCurrentFrameSetStats } from '../fluids/FluidFieldStats.js';
import { validateTemporalFrames } from '../validation/TemporalFrameValidator.js';
import { repairDeploymentConnectivity } from './ConnectivityRepair.js';
import { validateGeneratedLevelConnectivity } from '../validation/ConnectivityValidator.js';
import { getVectorPresetConfig, normalizeVectorPreset } from './VectorFieldPresets.js';
import { normalizeForecastRules } from '../forecast/ForecastDecay.js';
import { buildReplaySeedContract, deriveReplaySeeds, GENERATION_VERSION } from '../random/ReplaySeedContract.js';
import { currentFieldConfigToGeneratorConfig, normalizeCurrentFieldConfig } from './FlowFieldConfig.js';

export function generateLevel(config = {}) {
  const merged = applyDifficultyPreset(config);
  const width = clampInt(merged.width, 8, 32);
  const height = clampInt(merged.height, 8, 32);
  const dt = Number(merged.dt ?? 1);
  const duration = clampInt(merged.duration, 10, 200);
  const planningWindow = clampInt(merged.planningWindow, 2, duration);
  const seed = merged.seed ?? Date.now();
  const challengeId = String(merged.challengeId ?? merged.instanceId ?? merged.replaySeedAnchor ?? seed);
  const generationVersion = merged.generationVersion ?? merged.generationConfig?.generationVersion ?? GENERATION_VERSION;
  const derivedSeeds = {
    ...deriveReplaySeeds(challengeId),
    ...(merged.replaySeedContract?.derivedSeeds ?? merged.derivedSeeds ?? merged.generationConfig?.derivedSeeds ?? {})
  };
  const currentFieldConfig = normalizeCurrentFieldConfig(merged.currentFieldConfig ?? merged.currentField ?? merged.generationConfig?.currentFieldConfig ?? null, {
    mode: merged.challengeMode === 'forecast' || merged.forecastMode === 'noisy' ? 'forecast' : 'perfectKnowledge',
    currentPreset: merged.currentPreset ?? merged.vectorPreset,
    currentStrength: merged.currentStrength
  });
  const currentConfig = currentFieldConfigToGeneratorConfig(currentFieldConfig, {
    mode: merged.challengeMode === 'forecast' || merged.forecastMode === 'noisy' ? 'forecast' : 'perfectKnowledge'
  });
  const vectorPreset = getVectorPresetConfig(currentConfig.currentPreset ?? merged.vectorPreset ?? merged.currentPreset ?? merged.currentGenerator?.preset ?? merged.currentPattern, {
    currentStrength: currentConfig.currentStrength,
    currentVariability: currentConfig.currentVariability,
    seed: derivedSeeds.currents ?? seed
  });
  if (merged.vectorPreset || merged.currentPreset || merged.currentGenerator?.preset) merged.currentPattern = vectorPreset.currentPattern;
  const generationAttempt = clampInt(merged.__connectivityAttempt ?? 0, 0, 100);
  const random = createSeededRandom(seed);
  const terrainRandom = createSeededRandom(derivedSeeds.terrain ?? seed);
  const hazardRandom = createSeededRandom(derivedSeeds.hazards ?? seed);
  const roiRandom = createSeededRandom(derivedSeeds.roi ?? seed);
  const truthRandom = createSeededRandom(derivedSeeds.truth ?? seed);
  const forecastRandom = createSeededRandom(derivedSeeds.forecast ?? seed);
  const depthRandom = createSeededRandom(derivedSeeds.depth ?? seed);
  const targetsRandom = createSeededRandom(derivedSeeds.targets ?? seed);
  const levelSeedHash = hashSeed(seed).toString(36);
  const terrain = generateTerrain(width, height, Number(merged.terrainDensity ?? 0.08), terrainRandom);
  const hazards = generateHazards(width, height, Number(merged.hazardDensity ?? 0.06), terrain, hazardRandom);
  const hotspots = createHotspots(width, height, clampInt(merged.roiHotspots, 1, 8), merged.roiPattern, roiRandom);
  const eddies = makeEddies(width, height, createSeededRandom(derivedSeeds.currents ?? seed));
  const currentFrames = generateCurrentFrames({
    ...merged,
    width,
    height,
    dt,
    duration,
    seed: derivedSeeds.currents ?? seed,
    terrain,
    eddies,
    pattern: merged.currentPattern,
    currentFieldConfig,
    currentGenerator: vectorPreset,
    currentVariability: vectorPreset.variability
  });
  const frameCount = currentFrames.length;
  const probabilisticROI = merged.roiProbabilityMode === 'variable' || merged.probabilisticROI || merged.challengeMode === 'forecast';
  const temporalHotspots = merged.temporalHotspots ?? true;
  const truthFrames = Array.from({ length: frameCount }, (_, index) => {
    const roi = generateROI(width, height, index, { ...merged, hotspots, temporalHotspots });
    return {
      t: currentFrames[index]?.t ?? index * dt,
      current: currentFrames[index]?.current ?? currentFrames.at(-1)?.current ?? [],
      roi: probabilisticROI ? normalizeROIGrid(roi, 'variable', truthRandom) : roi
    };
  });
  const forecastFrames = makeForecastFromTruth(truthFrames, merged, forecastRandom);
  const ensembleCount = clampInt(merged.ensembleCount ?? (merged.challengeMode === 'forecast' ? 3 : 0), 0, 8);
  const forecasts = makeForecastEnsembleFromTruth(truthFrames, { ...merged, ensembleCount }, createSeededRandom(`${derivedSeeds.forecast ?? seed}:ensemble`));
  const depth = merged.depthVariation === 0 ? null : generateDepth(width, height, merged, depthRandom);
  const mobileHazards = makeMobileHazards(width, height, clampInt(merged.mobileHazardsCount ?? (merged.challengeMode === 'forecast' ? 1 : 0), 0, 8), duration, hazardRandom);
  const zones = makeDeploymentZones(width, height, terrain, hazards, Boolean(merged.multipleDropZones));
  for (const cell of zones.flatMap((zone) => zone.cells)) {
    terrain[cell.y][cell.x] = 0;
    hazards[cell.y][cell.x] = 0;
  }

  const explicitParametricPreset = Boolean(merged.vectorPreset || merged.currentPreset || merged.currentGenerator?.type === 'parametric');
  const fluidEnabled = merged.currentGenerator?.type === 'fluid'
    || Boolean(merged.fluidPreset)
    || (!explicitParametricPreset && isFluidCurrentPattern(merged.currentPattern));
  const currentGenerator = fluidEnabled
    ? {
      ...buildFluidGeneratorMetadata({ ...merged, seed: derivedSeeds.currents ?? seed }),
      stats: computeCurrentFrameSetStats(currentFrames)
    }
    : {
      type: 'parametric',
      pattern: vectorPreset.currentPattern ?? merged.currentPattern ?? 'wave',
      strength: Number(merged.currentStrength ?? vectorPreset.strength ?? 1),
      variability: Number(vectorPreset.variability ?? 0.5),
      preset: normalizeVectorPreset(merged.vectorPreset ?? merged.currentPreset ?? merged.currentGenerator?.preset ?? merged.currentPattern),
      seed: derivedSeeds.currents ?? seed,
      temporalEvolution: true,
      currentFieldConfig,
      layers: currentFieldConfig.layers,
      notes: 'Synthetic ocean-inspired current field for gameplay.',
      stats: computeCurrentFrameSetStats(currentFrames),
      synthetic: true
    };
  const forecastRules = normalizeForecastRules(merged.forecastRules ?? {
    mode: merged.forecastDecay ? 'decay' : 'none',
    minConfidence: merged.forecastMinConfidence,
    decayRate: merged.forecastDecayRate,
    decayModel: merged.forecastDecayModel
  });
  const generationConfig = {
    width,
    height,
    dt,
    duration,
    planningWindow,
    difficulty: merged.difficulty ?? 'medium',
    currentPattern: merged.currentPattern,
    currentStrength: merged.currentStrength,
    currentVariability: vectorPreset.variability,
    currentGenerator,
    vectorField: currentGenerator,
    currentFieldConfig,
    currentField: currentFieldConfig,
    currentPreset: vectorPreset.preset,
    vectorPreset: vectorPreset.preset,
    fluidPreset: fluidEnabled ? normalizeFluidPreset(merged) : undefined,
    fluidViscosity: fluidEnabled ? currentGenerator.viscosity : undefined,
    fluidIterations: fluidEnabled ? currentGenerator.iterations : undefined,
    fluidVorticityConfinement: fluidEnabled ? currentGenerator.vorticityConfinement : undefined,
    roiPattern: merged.roiPattern,
    roiHotspots: merged.roiHotspots,
    hazardDensity: merged.hazardDensity,
    terrainDensity: merged.terrainDensity,
    forecastMode: merged.forecastMode,
    forecastRules,
    challengeMode: merged.challengeMode ?? (merged.forecastMode === 'none' ? 'perfectKnowledge' : 'forecast'),
    roiScoringMode: merged.roiScoringMode ?? 'expectedValue',
    ensembleCount,
    probabilisticROI,
    temporalHotspots,
    mobileHazardsCount: mobileHazards.length,
    priorityTargets: {
      enabled: merged.enablePriorityTargets !== false && merged.enableGoldStars !== false,
      count: clampInt(merged.priorityTargetCount ?? merged.starCount ?? (merged.difficulty === 'easy' ? 1 : 2), 0, 8),
      valueRange: merged.priorityTargetValueRange ?? merged.starValueRange ?? [180, 320],
      probabilityNoStarPerWindow: Number(merged.probabilityNoStarPerWindow ?? merged.priorityTargetProbabilityNoStarPerWindow ?? 0.45),
      allowNoStarAtStart: merged.allowNoStarAtStart !== false,
      minFirstAppearanceWindow: clampInt(merged.minFirstAppearanceWindow ?? merged.firstAppearanceWindowMin ?? (merged.allowNoStarAtStart === false ? 0 : 1), 0, 99),
      maxFirstAppearanceWindow: merged.maxFirstAppearanceWindow ?? merged.firstAppearanceWindowMax ?? null,
      activeWindowDuration: clampInt(merged.priorityTargetActiveWindowDuration ?? merged.starActiveWindowDuration ?? 1, 1, 8),
      movementMode: merged.priorityTargetMovementMode ?? merged.priorityTargetMovement ?? 'jumping'
    },
    depthVariation: merged.depthVariation ?? 0.45,
    connectivity: normalizeConnectivityConfig(merged.connectivity),
    challengeId,
    replaySeedAnchor: challengeId,
    generationVersion,
    derivedSeeds
  };
  const priorityTargets = generationConfig.priorityTargets.enabled
    ? makePriorityTargets(width, height, terrain, hazards, duration, planningWindow, generationConfig.priorityTargets, targetsRandom)
    : [];
  const replaySeedContract = buildReplaySeedContract({
    challengeId,
    generationConfig,
    generationVersion,
    derivedSeeds
  });

  const level = {
    schemaVersion: '2.0',
    type: 'anchor.level',
    levelId: merged.levelId ?? `LVL-${levelSeedHash}-${width}x${height}`,
    instanceId: merged.instanceId ?? challengeId,
    challengeMode: merged.challengeMode ?? (merged.forecastMode === 'none' ? 'perfectKnowledge' : 'forecast'),
    meta: {
      name: merged.name ?? `Generated ${merged.difficulty ?? 'medium'} ${levelSeedHash}`,
      description: 'Ocean-inspired synthetic planning level generated in the browser.',
      generated: true,
      seed,
      replaySeedAnchor: challengeId,
      generationVersion,
      derivedSeeds,
      replaySeedContract,
      difficulty: merged.difficulty ?? 'medium',
      generationConfig
    },
    world: {
      grid: { width, height, cellSizeMeters: 100 },
      time: { dt, duration, planningWindow, displayUnits: 'hours' }
    },
    layers: {
      terrain,
      hazards,
      depth,
      truth: { frames: truthFrames },
      forecast: { frames: forecastFrames },
      forecasts,
      mobileHazards,
      priorityTargets,
      bases: [{ id: 'base_alpha', x: 1, y: 1, radius: 1 }]
    },
    zones
  };
  const connectivityConfig = generationConfig.connectivity;
  let connectivity = validateGeneratedLevelConnectivity(level, null, connectivityConfig);
  let repaired = false;
  let repairMethod = 'none';
  if (connectivityConfig.ensurePlayable && !connectivity.ok) {
    const repair = repairDeploymentConnectivity(level, null, connectivityConfig);
    repaired = Boolean(repair.repaired);
    repairMethod = repair.method ?? 'none';
    connectivity = validateGeneratedLevelConnectivity(level, null, connectivityConfig);
  }
  if (connectivityConfig.ensurePlayable && !connectivity.ok && generationAttempt + 1 < connectivityConfig.maxRegenerationAttempts) {
    return generateLevel({
      ...config,
      seed: `${seed}:retry:${generationAttempt + 1}`,
      __connectivityAttempt: generationAttempt + 1
    });
  }
  level.meta.connectivity = {
    ...(connectivity.summary ?? {}),
    validated: true,
    repaired,
    repairMethod,
    attempts: generationAttempt + (repaired ? 1 : 0)
  };
  level.meta.generationConfig.connectivity = {
    ...level.meta.generationConfig.connectivity,
    result: level.meta.connectivity
  };
  level.meta.temporalValidation = validateTemporalFrames(level);
  return ensureLevelIdentity(level, { generationConfig });
}

function normalizeConnectivityConfig(config = {}) {
  return {
    ensurePlayable: config.ensurePlayable !== false,
    maxRepairAttempts: clampInt(config.maxRepairAttempts ?? 3, 1, 12),
    maxRegenerationAttempts: clampInt(config.maxRegenerationAttempts ?? 1, 1, 10),
    minReachableNavigableRatio: Number(config.minReachableNavigableRatio ?? 0.65),
    requireRoiReachability: config.requireRoiReachability !== false,
    requireRecoveryReachability: config.requireRecoveryReachability !== false
  };
}

function makeDeploymentCells(width, height, terrain, hazards) {
  const cells = [];
  for (let y = 1; y <= Math.min(height - 2, 3); y += 1) {
    for (let x = 1; x <= Math.min(width - 2, 3); x += 1) {
      cells.push({ x, y });
    }
  }
  return cells.slice(0, 6);
}

function makeDeploymentZones(width, height, terrain, hazards, multiple = false) {
  const alpha = {
    id: 'drop_alpha',
    type: 'deployment',
    label: 'Deployment Zone Alpha',
    cells: makeDeploymentCells(width, height, terrain, hazards)
  };
  if (!multiple) return [alpha];
  const betaCells = [];
  for (let y = Math.max(1, height - 4); y <= height - 2; y += 1) {
    for (let x = Math.max(1, width - 4); x <= width - 2; x += 1) {
      betaCells.push({ x, y });
    }
  }
  return [
    alpha,
    {
      id: 'drop_beta',
      type: 'deployment',
      label: 'Deployment Zone Beta',
      cells: betaCells.slice(0, 6)
    }
  ];
}

function makeMobileHazards(width, height, count, duration, random) {
  return Array.from({ length: count }, (_, index) => {
    const startX = 2 + random() * Math.max(1, width - 4);
    const startY = 2 + random() * Math.max(1, height - 4);
    const dx = (random() - 0.5) * Math.max(2, width * 0.25);
    const dy = (random() - 0.5) * Math.max(2, height * 0.25);
    return {
      id: `mobile_hazard_${index + 1}`,
      type: 'drifter',
      penalty: 20,
      frames: [
        { t: 0, x: Number(startX.toFixed(2)), y: Number(startY.toFixed(2)), radius: 0.75 },
        { t: duration, x: Number(Math.max(1, Math.min(width - 2, startX + dx)).toFixed(2)), y: Number(Math.max(1, Math.min(height - 2, startY + dy)).toFixed(2)), radius: 0.75 }
      ]
    };
  });
}

function makePriorityTargets(width, height, terrain, hazards, duration, planningWindow, config, random) {
  const count = clampInt(config.count ?? 2, 0, 8);
  const valueRange = Array.isArray(config.valueRange) ? config.valueRange : [180, 320];
  const minValue = Number(valueRange[0] ?? 180);
  const maxValue = Number(valueRange[1] ?? 320);
  const windowDuration = Math.max(1, Number(planningWindow ?? 3));
  const totalWindows = Math.max(1, Math.floor(Number(duration ?? 24) / windowDuration));
  const activeWindows = clampInt(config.activeWindowDuration ?? 1, 1, Math.max(1, totalWindows));
  const latestStartWindow = Math.max(0, totalWindows - activeWindows);
  const minStartWindow = Math.min(latestStartWindow, clampInt(config.minFirstAppearanceWindow ?? 1, 0, latestStartWindow));
  const rawMaxFirstWindow = config.maxFirstAppearanceWindow;
  const configuredMax = rawMaxFirstWindow === null || rawMaxFirstWindow === undefined ? NaN : Number(rawMaxFirstWindow);
  const maxStartWindow = Math.max(minStartWindow, Math.min(latestStartWindow, Number.isFinite(configuredMax) ? Math.round(configuredMax) : latestStartWindow));
  const probabilityNoStar = Math.max(0, Math.min(0.95, Number(config.probabilityNoStarPerWindow ?? 0.45)));
  const candidateWindows = [];
  for (let window = minStartWindow; window <= maxStartWindow; window += 1) {
    if (window === 0 && config.allowNoStarAtStart !== false) continue;
    if (random() >= probabilityNoStar) candidateWindows.push(window);
  }
  if (candidateWindows.length < count) {
    for (let window = minStartWindow; window <= maxStartWindow && candidateWindows.length < count; window += 1) {
      if (window === 0 && config.allowNoStarAtStart !== false) continue;
      if (!candidateWindows.includes(window)) candidateWindows.push(window);
    }
  }
  if (!candidateWindows.length && count > 0) {
    candidateWindows.push(Math.min(latestStartWindow, Math.max(minStartWindow, config.allowNoStarAtStart === false ? 0 : 1)));
  }
  const targets = [];
  const usedWindows = new Set();
  const availableWindows = [...candidateWindows];
  for (let index = 0; index < count; index += 1) {
    const sourceWindows = availableWindows.length ? availableWindows : candidateWindows;
    const selectedWindowIndex = Math.floor(random() * sourceWindows.length);
    const startWindow = sourceWindows[selectedWindowIndex] ?? minStartWindow;
    if (availableWindows.length) availableWindows.splice(selectedWindowIndex, 1);
    usedWindows.add(startWindow);
    const startTime = Math.max(0, startWindow * windowDuration);
    const endTime = Math.min(Number(duration ?? 24), (startWindow + activeWindows) * windowDuration);
    const start = randomOpenWaterCell(width, height, terrain, hazards, random);
    const end = config.movementMode === 'static' ? start : nudgeCell(start, width, height, terrain, hazards, random);
    const value = Math.round(minValue + random() * Math.max(0, maxValue - minValue));
    const frames = [];
    for (let window = 0; window < startWindow; window += 1) {
      frames.push({ t: Number((window * windowDuration).toFixed(2)), active: false });
    }
    frames.push({ t: Number(startTime.toFixed(2)), x: start.x, y: start.y, active: true });
    if (activeWindows > 1 || config.movementMode !== 'static') {
      frames.push({
        t: Number(Math.min(endTime, startTime + windowDuration * Math.max(0.5, activeWindows - 0.35)).toFixed(2)),
        x: end.x,
        y: end.y,
        active: true
      });
    }
    frames.push({ t: Number(endTime.toFixed(2)), active: false });
    targets.push({
      id: `star_${index + 1}`,
      label: 'Gold Star Target',
      value,
      radius: 0.8,
      captureMode: 'once',
      frames
    });
  }
  return targets;
}

function randomOpenWaterCell(width, height, terrain, hazards, random) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = clampInt(2 + random() * Math.max(1, width - 4), 1, width - 2);
    const y = clampInt(2 + random() * Math.max(1, height - 4), 1, height - 2);
    if (!terrain[y]?.[x] && !hazards[y]?.[x]) return { x, y };
  }
  return { x: Math.min(width - 2, 2), y: Math.min(height - 2, 2) };
}

function nudgeCell(cell, width, height, terrain, hazards, random) {
  const candidates = [
    { x: cell.x + (random() > 0.5 ? 1 : -1), y: cell.y },
    { x: cell.x, y: cell.y + (random() > 0.5 ? 1 : -1) },
    { x: cell.x + (random() > 0.5 ? 2 : -2), y: cell.y + (random() > 0.5 ? 1 : -1) },
    { x: cell.x, y: cell.y }
  ].map((candidate) => ({
    x: Math.max(1, Math.min(width - 2, candidate.x)),
    y: Math.max(1, Math.min(height - 2, candidate.y))
  }));
  return candidates.find((candidate) => !terrain[candidate.y]?.[candidate.x] && !hazards[candidate.y]?.[candidate.x]) ?? cell;
}

function makeEddies(width, height, random) {
  return Array.from({ length: 4 }, () => ({
    x: 2 + random() * Math.max(1, width - 4),
    y: 2 + random() * Math.max(1, height - 4),
    strength: random() > 0.5 ? 1 : -1
  }));
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}
