import { generateLevel } from './LevelGenerator.js';
import { createGameInstanceId, ensureLevelIdentity } from '../identity/GameInstanceId.js';
import { buildDefaultMissionForLevel } from '../editor/LevelEditOperations.js';
import { getVectorPresetConfig, normalizeVectorPreset } from './VectorFieldPresets.js';
import { normalizeForecastRules } from '../forecast/ForecastDecay.js';
import { buildReplaySeedContract, deriveSeedFromUuid, GENERATION_VERSION } from '../random/ReplaySeedContract.js';
import {
  createDefaultCurrentFieldConfig,
  currentFieldConfigToGeneratorConfig,
  normalizeCurrentFieldConfig
} from './FlowFieldConfig.js';

export const SCENARIO_SIZE_PRESETS = {
  small: { label: 'Small', width: 12, height: 12, duration: 12, surfaceInterval: 3, agentCount: 1, fuel: 100 },
  medium: { label: 'Medium', width: 20, height: 20, duration: 24, surfaceInterval: 3, agentCount: 2, fuel: 120 },
  large: { label: 'Large', width: 32, height: 32, duration: 48, surfaceInterval: 6, agentCount: 3, fuel: 150 },
  huge: { label: 'Huge / Experimental', width: 48, height: 48, duration: 72, surfaceInterval: 12, agentCount: 4, fuel: 200 }
};

export function createDefaultScenarioConfig(mode = 'perfectKnowledge') {
  const stochastic = mode === 'forecast';
  const preset = stochastic ? 'medium' : 'small';
  return normalizeScenarioConfig({
    mode,
    preset,
    difficulty: stochastic ? 'hard' : 'medium',
    currentPreset: stochastic ? 'eddyField' : 'currentCorridor',
    currentStrength: stochastic ? 1.05 : 0.85,
    currentVariability: stochastic ? 0.65 : 0.4,
    currentFieldConfig: createDefaultCurrentFieldConfig(mode),
    hazardDensity: stochastic ? 0.08 : 0.06,
    terrainDensity: stochastic ? 0.1 : 0.08,
    roiHotspots: stochastic ? 5 : 4,
    priorityTargetFrequency: 0.35,
    forecastNoise: stochastic ? 0.22 : 0,
    forecastDecay: stochastic,
    forecastDecayModel: 'exponential',
    multipleDropZones: false,
    agentSpecMode: stochastic ? 'varied' : 'uniform',
    ensembleCount: stochastic ? 3 : 0,
    gliderSpeed: stochastic ? 1.2 : 1.25
  });
}

export function normalizeScenarioConfig(config = {}) {
  const presetKey = SCENARIO_SIZE_PRESETS[config.preset] ? config.preset : 'small';
  const preset = SCENARIO_SIZE_PRESETS[presetKey];
  const mode = config.mode === 'forecast' ? 'forecast' : 'perfectKnowledge';
  const importedFlowField = config.importedFlowField ?? config.flowFieldImport ?? null;
  const normalizedCurrentField = normalizeCurrentFieldConfig(importedFlowField?.syntheticConfig ?? config.currentFieldConfig ?? config.currentField ?? {
    fieldMode: config.temporalEvolution === false ? 'static' : 'dynamic',
    basePreset: config.vectorPreset ?? config.currentPreset ?? (mode === 'forecast' ? 'eddyField' : 'currentCorridor'),
    strength: config.currentStrength,
    directionVariation: config.currentVariability === 0 ? 'off' : undefined,
    magnitudeVariation: config.currentVariability === 0 ? 'off' : undefined
  }, {
    mode,
    currentPreset: config.vectorPreset ?? config.currentPreset,
    currentStrength: config.currentStrength
  });
  const currentGeneratorConfig = currentFieldConfigToGeneratorConfig(normalizedCurrentField, { mode });
  return {
    mode,
    preset: presetKey,
    agentCount: clampInt(config.agentCount ?? preset.agentCount, 1, 8),
    width: clampInt(config.width ?? preset.width, 8, 48),
    height: clampInt(config.height ?? preset.height, 8, 48),
    duration: clampInt(config.duration ?? preset.duration, 6, 96),
    surfaceInterval: clampInt(config.surfaceInterval ?? preset.surfaceInterval, 1, 24),
    fuel: clampInt(config.fuel ?? preset.fuel, 25, 400),
    gliderSpeed: finiteNumber(config.gliderSpeed, mode === 'forecast' ? 1.2 : 1.25),
    difficulty: config.difficulty ?? (mode === 'forecast' ? 'hard' : 'medium'),
    terrainDensity: clamp01(finiteNumber(config.terrainDensity, 0.08)),
    hazardDensity: clamp01(finiteNumber(config.hazardDensity, mode === 'forecast' ? 0.08 : 0.06)),
    currentStrength: currentGeneratorConfig.currentStrength,
    currentVariability: clamp01(config.currentFieldConfig || config.currentField
      ? currentGeneratorConfig.currentVariability
      : finiteNumber(config.currentVariability ?? config.variability, currentGeneratorConfig.currentVariability)),
    currentPreset: normalizeVectorPreset(currentGeneratorConfig.currentPreset),
    currentFieldConfig: normalizedCurrentField,
    currentFieldSource: importedFlowField ? 'imported' : (config.currentFieldSource === 'imported' ? 'imported' : 'procedural'),
    importedFlowField,
    roiHotspots: clampInt(config.roiHotspots ?? (mode === 'forecast' ? 5 : 4), 1, 12),
    priorityTargetFrequency: clamp01(finiteNumber(config.priorityTargetFrequency, 0.35)),
    forecastNoise: clamp01(finiteNumber(config.forecastNoise, mode === 'forecast' ? 0.22 : 0)),
    forecastDecay: booleanValue(config.forecastDecay, mode === 'forecast'),
    forecastDecayModel: config.forecastDecayModel === 'linear' ? 'linear' : 'exponential',
    forecastMinConfidence: clamp01(finiteNumber(config.forecastMinConfidence, 0.35)),
    forecastDecayRate: Math.max(0, finiteNumber(config.forecastDecayRate, 0.04)),
    uncertaintyGrowth: normalizedCurrentField.stochastic?.uncertaintyGrowth ?? config.uncertaintyGrowth ?? 'moderate',
    hiddenTruthVariation: normalizedCurrentField.stochastic?.hiddenTruthVariation ?? config.hiddenTruthVariation ?? 'medium',
    forecastConfidence: normalizedCurrentField.stochastic?.forecastConfidence ?? config.forecastConfidence ?? 'medium',
    multipleDropZones: booleanValue(config.multipleDropZones, false),
    agentSpecMode: config.agentSpecMode === 'varied' ? 'varied' : 'uniform',
    ensembleCount: clampInt(config.ensembleCount ?? (mode === 'forecast' ? 3 : 0), 0, 8)
  };
}

export function buildScenarioGenerationConfig(config = {}) {
  const normalized = normalizeScenarioConfig(config);
  return {
    mode: normalized.mode === 'forecast' ? 'stochastic' : 'deterministic',
    agentCount: normalized.agentCount,
    grid: { width: normalized.width, height: normalized.height },
    durationHours: normalized.duration,
    surfaceIntervalHours: normalized.surfaceInterval,
    fuelPerAgent: normalized.fuel,
    gliderSpeed: normalized.gliderSpeed,
    difficulty: normalized.difficulty,
    terrainDensity: normalized.terrainDensity,
    hazardDensity: normalized.hazardDensity,
    currentStrength: normalized.currentStrength,
    currentVariability: normalized.currentVariability,
    currentPreset: normalized.currentPreset,
    vectorPreset: normalized.currentPreset,
    currentFieldConfig: normalized.currentFieldConfig,
    currentField: normalized.currentFieldConfig,
    currentFieldSource: normalized.currentFieldSource,
    importedFlowField: normalized.importedFlowField,
    vectorField: getVectorPresetConfig(normalized.currentPreset, {
      currentStrength: normalized.currentStrength,
      currentVariability: normalized.currentVariability
    }),
    roiHotspots: normalized.roiHotspots,
    priorityTargetFrequency: normalized.priorityTargetFrequency,
    forecastNoise: normalized.forecastNoise,
    forecastConfidence: normalized.forecastConfidence,
    uncertaintyGrowth: normalized.uncertaintyGrowth,
    hiddenTruthVariation: normalized.hiddenTruthVariation,
    forecastDecay: normalized.forecastDecay,
    forecastRules: normalizeForecastRules({
      mode: normalized.forecastDecay && normalized.mode === 'forecast' ? 'decay' : 'none',
      minConfidence: normalized.forecastMinConfidence,
      decayRate: normalized.forecastDecayRate,
      decayModel: normalized.forecastDecayModel
    }),
    multipleDropZones: normalized.multipleDropZones,
    agentSpecMode: normalized.agentSpecMode,
    ensembleCount: normalized.ensembleCount
  };
}

export function generateScenarioFromConfig(config = {}) {
  const normalized = normalizeScenarioConfig(config);
  const stochastic = normalized.mode === 'forecast';
  const challengeId = String(config.challengeId ?? config.uuid ?? config.instanceId ?? createGameInstanceId('CHALLENGE'));
  const seed = config.seed ?? deriveSeedFromUuid(challengeId, 'mission') ?? makeChallengeSeed(normalized.mode);
  const generationConfig = {
    ...buildScenarioGenerationConfig({ ...normalized, seed }),
    challengeId,
    replaySeedAnchor: challengeId,
    generationVersion: GENERATION_VERSION
  };
  const replaySeedContract = buildReplaySeedContract({ challengeId, generationConfig });
  const vectorPreset = getVectorPresetConfig(normalized.currentPreset, {
    currentStrength: normalized.currentStrength,
    currentVariability: normalized.currentVariability,
    seed: replaySeedContract?.derivedSeeds?.currents ?? seed
  });
  const forecastRules = generationConfig.forecastRules;
  const level = ensureLevelIdentity(generateLevel({
    challengeId,
    instanceId: challengeId,
    replaySeedAnchor: challengeId,
    generationVersion: GENERATION_VERSION,
    seed,
    name: stochastic ? `Stochastic Challenge ${seed}` : `Deterministic Challenge ${seed}`,
    width: normalized.width,
    height: normalized.height,
    dt: 1,
    duration: normalized.duration,
    planningWindow: normalized.surfaceInterval,
    difficulty: normalized.difficulty,
    currentPattern: vectorPreset.currentPattern,
    vectorPreset: vectorPreset.preset,
    currentGenerator: vectorPreset,
    currentFieldConfig: normalized.currentFieldConfig,
    importedFlowField: normalized.importedFlowField,
    currentStrength: normalized.currentStrength,
    currentVariability: normalized.currentVariability,
    roiPattern: 'moving',
    roiHotspots: normalized.roiHotspots,
    temporalHotspots: true,
    temporalCurrents: true,
    challengeMode: normalized.mode,
    forecastMode: stochastic ? 'noisy' : 'none',
    forecastNoise: normalized.forecastNoise,
    forecastRules,
    forecastDecay: stochastic && normalized.forecastDecay,
    forecastMinConfidence: normalized.forecastMinConfidence,
    forecastDecayRate: normalized.forecastDecayRate,
    forecastDecayModel: normalized.forecastDecayModel,
    ensembleCount: stochastic ? normalized.ensembleCount : 0,
    roiProbabilityMode: stochastic ? 'variable' : 'certain',
    mobileHazardsCount: stochastic ? Math.max(1, Math.round(normalized.agentCount / 2)) : 0,
    depthVariation: stochastic ? 0.55 : 0.35,
    priorityTargetCount: Math.max(1, Math.round(normalized.priorityTargetFrequency * 6)),
    probabilityNoStarPerWindow: 1 - normalized.priorityTargetFrequency,
    multipleDropZones: normalized.multipleDropZones,
    generationConfig,
    replaySeedContract
  }));
  level.instanceId = challengeId;
  level.meta ??= {};
  level.meta.replaySeedAnchor = challengeId;
  level.meta.generationVersion = GENERATION_VERSION;
  level.meta.derivedSeeds = replaySeedContract?.derivedSeeds ?? {};
  level.meta.replaySeedContract = replaySeedContract;
  level.meta.generationConfig ??= {};
  level.meta.generationConfig.scenarioSetup = generationConfig;
  level.meta.generationConfig.currentFieldConfig = normalized.currentFieldConfig;
  level.meta.generationConfig.currentField = normalized.currentFieldConfig;
  level.meta.generationConfig.currentFieldSource = normalized.currentFieldSource;
  level.meta.generationConfig.importedFlowField = normalized.importedFlowField;
  level.meta.generationConfig.challengeId = challengeId;
  level.meta.generationConfig.replaySeedAnchor = challengeId;
  level.meta.generationConfig.generationVersion = GENERATION_VERSION;
  level.meta.generationConfig.derivedSeeds = replaySeedContract?.derivedSeeds ?? {};

  const mission = buildDefaultMissionForLevel(level, {
    missionId: stochastic ? 'stochastic_challenge_mission' : 'deterministic_challenge_mission',
    name: stochastic ? 'Stochastic Challenge Mission' : 'Deterministic Challenge Mission',
    agentCount: normalized.agentCount,
    battery: normalized.fuel,
    maxSpeed: normalized.gliderSpeed,
    agentSpecMode: normalized.agentSpecMode,
    surfaceInterval: normalized.surfaceInterval,
    deploymentMode: normalized.multipleDropZones ? 'chooseFromZones' : 'chooseFromZone',
    deploymentZoneId: 'drop_alpha',
    deploymentZoneIds: normalized.multipleDropZones ? ['drop_alpha', 'drop_beta'] : ['drop_alpha'],
    forecastRules,
    stochasticDrift: stochastic,
    driftNoiseScale: stochastic ? Math.max(0.04, normalized.forecastNoise * 0.35) : 0,
    driftSeed: replaySeedContract?.derivedSeeds?.truth ?? level.meta?.seed ?? level.instanceId
  });
  mission.meta ??= {};
  mission.meta.scenarioSetup = generationConfig;
  mission.meta.currentFieldConfig = normalized.currentFieldConfig;
  mission.meta.importedFlowField = normalized.importedFlowField;
  mission.meta.replaySeedContract = replaySeedContract;
  mission.rules ??= {};
  mission.rules.stochasticSeed ??= replaySeedContract?.derivedSeeds?.truth ?? seed;
  mission.rules.rngSeed ??= replaySeedContract?.derivedSeeds?.truth ?? seed;
  return { level, mission, config: normalized, generationConfig, replaySeedContract };
}

export function regenerateScenarioFromReplayContract(source = {}) {
  const contract = source.replaySeedContract ?? source.replay ?? source;
  const generationConfig = contract?.generationConfig ?? source.generationConfig ?? null;
  const challengeId = contract?.challengeId ?? contract?.replaySeedAnchor ?? source.challengeId ?? source.instanceId ?? null;
  if (!challengeId || !generationConfig) return null;
  return generateScenarioFromConfig({
    ...scenarioConfigFromGenerationConfig(generationConfig, source),
    challengeId
  });
}

export function describeScenarioComplexity(config = {}) {
  const normalized = normalizeScenarioConfig(config);
  const cells = normalized.width * normalized.height;
  const frames = Math.max(1, Math.ceil(normalized.duration));
  const load = cells * frames;
  return {
    cells,
    frames,
    vectorStride: cells >= 1600 ? 3 : cells >= 625 ? 2 : 1,
    warning: cells >= 1600 || load >= 60000
      ? 'Huge maps are experimental and may be slower on some browsers.'
      : cells >= 900
        ? 'Large maps work best with camera zoom and vector stride.'
        : 'Browser-safe mission size.'
  };
}

function makeChallengeSeed(mode) {
  const prefix = mode === 'forecast' ? 'stochastic' : 'deterministic';
  const cryptoValue = globalThis.crypto?.getRandomValues ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
  return `${prefix}-${cryptoValue.toString(36)}`;
}

function scenarioConfigFromGenerationConfig(generationConfig = {}, source = {}) {
  const setup = generationConfig.scenarioSetup ?? generationConfig;
  const mode = setup.mode === 'stochastic' || setup.mode === 'forecast' || source.challengeMode === 'forecast'
    ? 'forecast'
    : 'perfectKnowledge';
  return normalizeScenarioConfig({
    mode,
    agentCount: setup.agentCount ?? source.agentCount,
    width: setup.grid?.width ?? setup.width,
    height: setup.grid?.height ?? setup.height,
    duration: setup.durationHours ?? setup.duration,
    surfaceInterval: setup.surfaceIntervalHours ?? setup.planningWindow,
    fuel: setup.fuelPerAgent ?? source.fuel,
    gliderSpeed: setup.gliderSpeed,
    difficulty: setup.difficulty,
    terrainDensity: setup.terrainDensity,
    hazardDensity: setup.hazardDensity,
    currentStrength: setup.currentStrength,
    currentVariability: setup.currentVariability,
    currentPreset: setup.currentPreset ?? setup.vectorPreset,
    currentFieldConfig: setup.currentFieldConfig ?? setup.currentField,
    importedFlowField: setup.importedFlowField,
    roiHotspots: setup.roiHotspots,
    priorityTargetFrequency: setup.priorityTargetFrequency,
    forecastNoise: setup.forecastNoise,
    forecastDecay: setup.forecastDecay,
    forecastMinConfidence: setup.forecastRules?.minConfidence,
    forecastDecayRate: setup.forecastRules?.decayRate,
    forecastDecayModel: setup.forecastRules?.decayModel,
    forecastConfidence: setup.forecastConfidence,
    uncertaintyGrowth: setup.uncertaintyGrowth,
    hiddenTruthVariation: setup.hiddenTruthVariation,
    multipleDropZones: setup.multipleDropZones,
    agentSpecMode: setup.agentSpecMode,
    ensembleCount: setup.ensembleCount
  });
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function booleanValue(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value === 'true' || value === '1' || value === 'yes';
  return Boolean(value);
}
