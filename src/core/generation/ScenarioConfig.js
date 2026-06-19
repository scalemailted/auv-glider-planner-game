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
import { createDefaultSampleFieldConfig, normalizeSampleFieldConfig } from './SampleFieldConfig.js';
import { DEFAULT_MISSION_MODE_ID, applyMissionModeDefaults, getMissionModePreset, normalizeMissionModeId } from '../missions/MissionModeRegistry.js';
import { normalizeNavigationUncertaintyConfig } from '../navigation/NavigationUncertainty.js';
import { ensureModernWaterColumnMissionConfig } from '../science/WaterColumnMissionDefaults.js';

export const SCENARIO_SIZE_PRESETS = {
  small: { label: 'Small', width: 12, height: 12, duration: 12, surfaceInterval: 3, agentCount: 1, fuel: 100 },
  medium: { label: 'Medium', width: 20, height: 20, duration: 24, surfaceInterval: 3, agentCount: 2, fuel: 120 },
  large: { label: 'Large', width: 32, height: 32, duration: 48, surfaceInterval: 6, agentCount: 3, fuel: 150 },
  huge: { label: 'Huge / Experimental', width: 48, height: 48, duration: 72, surfaceInterval: 12, agentCount: 4, fuel: 200 }
};

export function createDefaultScenarioConfig(mode = 'perfectKnowledge') {
  const stochastic = mode === 'forecast';
  const preset = stochastic ? 'medium' : 'small';
  const missionMode = stochastic ? 'uncertainWaters' : DEFAULT_MISSION_MODE_ID;
  return normalizeScenarioConfig({
    mode,
    missionMode,
    preset,
    difficulty: stochastic ? 'hard' : 'medium',
    currentPreset: stochastic ? 'eddyField' : 'currentCorridor',
    currentStrength: stochastic ? 1.05 : 0.85,
    currentVariability: stochastic ? 0.65 : 0.4,
    currentFieldConfig: createDefaultCurrentFieldConfig(mode),
    sampleFieldConfig: createDefaultSampleFieldConfig(mode),
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
  const missionDefaults = applyMissionModeDefaults(config);
  const presetKey = SCENARIO_SIZE_PRESETS[missionDefaults.preset] ? missionDefaults.preset : 'small';
  const preset = SCENARIO_SIZE_PRESETS[presetKey];
  const mode = missionDefaults.mode === 'forecast' ? 'forecast' : 'perfectKnowledge';
  const importedFlowField = missionDefaults.importedFlowField ?? missionDefaults.flowFieldImport ?? null;
  const normalizedCurrentField = normalizeCurrentFieldConfig(importedFlowField?.syntheticConfig ?? missionDefaults.currentFieldConfig ?? missionDefaults.currentField ?? {
    fieldMode: missionDefaults.temporalEvolution === false ? 'static' : 'dynamic',
    basePreset: missionDefaults.vectorPreset ?? missionDefaults.currentPreset ?? (mode === 'forecast' ? 'eddyField' : 'currentCorridor'),
    strength: missionDefaults.currentStrength,
    directionVariation: missionDefaults.currentVariability === 0 ? 'off' : undefined,
    magnitudeVariation: missionDefaults.currentVariability === 0 ? 'off' : undefined
  }, {
    mode,
    currentPreset: missionDefaults.vectorPreset ?? missionDefaults.currentPreset,
    currentStrength: missionDefaults.currentStrength
  });
  const currentGeneratorConfig = currentFieldConfigToGeneratorConfig(normalizedCurrentField, { mode });
  const normalizedSampleField = normalizeSampleFieldConfig(missionDefaults.sampleFieldConfig ?? missionDefaults.sampleField ?? createDefaultSampleFieldConfig(mode), {
    mode,
    roiHotspots: missionDefaults.roiHotspots ?? (mode === 'forecast' ? 5 : 4)
  });
  const missionMode = normalizeMissionModeId(missionDefaults.missionMode);
  const missionModePreset = getMissionModePreset(missionMode);
  const navigationUncertainty = normalizeNavigationUncertaintyConfig(missionDefaults.navigationUncertainty);
  return {
    mode,
    missionMode,
    missionModePreset: {
      id: missionModePreset.id,
      label: missionModePreset.label,
      concept: missionModePreset.concept,
      description: missionModePreset.description,
      difficulty: missionModePreset.difficulty,
      tags: missionModePreset.tags,
      recommendedLenses: missionModePreset.recommendedLenses,
      strategyHint: missionModePreset.strategyHint
    },
    preset: presetKey,
    agentCount: clampInt(missionDefaults.agentCount ?? preset.agentCount, 1, 8),
    width: clampInt(missionDefaults.width ?? preset.width, 8, 48),
    height: clampInt(missionDefaults.height ?? preset.height, 8, 48),
    duration: clampInt(missionDefaults.duration ?? preset.duration, 6, 96),
    surfaceInterval: clampInt(missionDefaults.surfaceInterval ?? preset.surfaceInterval, 1, 24),
    fuel: clampInt(missionDefaults.fuel ?? preset.fuel, 25, 400),
    gliderSpeed: finiteNumber(missionDefaults.gliderSpeed, mode === 'forecast' ? 1.2 : 1.25),
    difficulty: missionDefaults.difficulty ?? (mode === 'forecast' ? 'hard' : 'medium'),
    terrainDensity: clamp01(finiteNumber(missionDefaults.terrainDensity, 0.08)),
    hazardDensity: clamp01(finiteNumber(missionDefaults.hazardDensity, mode === 'forecast' ? 0.08 : 0.06)),
    currentStrength: currentGeneratorConfig.currentStrength,
    currentVariability: clamp01(missionDefaults.currentFieldConfig || missionDefaults.currentField
      ? currentGeneratorConfig.currentVariability
      : finiteNumber(missionDefaults.currentVariability ?? missionDefaults.variability, currentGeneratorConfig.currentVariability)),
    currentPreset: normalizeVectorPreset(currentGeneratorConfig.currentPreset),
    currentFieldConfig: normalizedCurrentField,
    currentFieldSource: importedFlowField ? 'imported' : (missionDefaults.currentFieldSource === 'imported' ? 'imported' : 'procedural'),
    importedFlowField,
    roiHotspots: clampInt(missionDefaults.roiHotspots ?? (mode === 'forecast' ? 5 : 4), 1, 12),
    sampleFieldConfig: normalizedSampleField,
    sampleField: normalizedSampleField,
    priorityTargetFrequency: clamp01(finiteNumber(missionDefaults.priorityTargetFrequency, 0.35)),
    forecastNoise: clamp01(finiteNumber(missionDefaults.forecastNoise, mode === 'forecast' ? 0.22 : 0)),
    forecastDecay: booleanValue(missionDefaults.forecastDecay, mode === 'forecast'),
    forecastDecayModel: missionDefaults.forecastDecayModel === 'linear' ? 'linear' : 'exponential',
    forecastMinConfidence: clamp01(finiteNumber(missionDefaults.forecastMinConfidence, 0.35)),
    forecastDecayRate: Math.max(0, finiteNumber(missionDefaults.forecastDecayRate, 0.04)),
    uncertaintyGrowth: normalizedCurrentField.stochastic?.uncertaintyGrowth ?? missionDefaults.uncertaintyGrowth ?? 'moderate',
    hiddenTruthVariation: normalizedCurrentField.stochastic?.hiddenTruthVariation ?? missionDefaults.hiddenTruthVariation ?? 'medium',
    forecastConfidence: normalizedCurrentField.stochastic?.forecastConfidence ?? missionDefaults.forecastConfidence ?? 'medium',
    multipleDropZones: booleanValue(missionDefaults.multipleDropZones, false),
    agentSpecMode: missionDefaults.agentSpecMode === 'varied' ? 'varied' : 'uniform',
    ensembleCount: clampInt(missionDefaults.ensembleCount ?? (mode === 'forecast' ? 3 : 0), 0, 8),
    sampling: missionDefaults.sampling ?? null,
    navigationUncertainty,
    scoringWeights: missionDefaults.scoringWeights ?? {},
    routeGradeWeights: missionDefaults.routeGradeWeights ?? {},
    medals: missionDefaults.medals ?? [],
    plannerDefaults: missionDefaults.plannerDefaults ?? {}
  };
}

export function buildScenarioGenerationConfig(config = {}) {
  const normalized = normalizeScenarioConfig(config);
  return {
    mode: normalized.mode === 'forecast' ? 'stochastic' : 'deterministic',
    missionMode: normalized.missionMode,
    missionModePreset: normalized.missionModePreset,
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
    sampleFieldConfig: normalized.sampleFieldConfig,
    sampleField: normalized.sampleFieldConfig,
    sampling: normalized.sampling,
    navigationUncertainty: normalized.navigationUncertainty,
    scoringWeights: normalized.scoringWeights,
    routeGradeWeights: normalized.routeGradeWeights,
    medals: normalized.medals,
    plannerDefaults: normalized.plannerDefaults,
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
    missionMode: normalized.missionMode,
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
    sampleFieldConfig: normalized.sampleFieldConfig,
    sampleField: normalized.sampleFieldConfig,
    navigationUncertainty: normalized.navigationUncertainty,
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
  const generatedCurrentFieldConfig = level.meta.generationConfig.currentFieldConfig ?? normalized.currentFieldConfig;
  level.meta.generationConfig.currentFieldConfig = generatedCurrentFieldConfig;
  level.meta.generationConfig.currentField = generatedCurrentFieldConfig;
  level.meta.generationConfig.currentFieldSource = normalized.currentFieldSource;
  level.meta.generationConfig.importedFlowField = normalized.importedFlowField;
  level.meta.generationConfig.sampleFieldConfig = normalized.sampleFieldConfig;
  level.meta.generationConfig.sampleField = normalized.sampleFieldConfig;
  level.meta.generationConfig.navigationUncertainty = normalized.navigationUncertainty;
  level.meta.missionMode = normalized.missionMode;
  level.meta.missionModePreset = normalized.missionModePreset;
  level.meta.generationConfig.missionMode = normalized.missionMode;
  level.meta.generationConfig.missionModePreset = normalized.missionModePreset;
  level.meta.generationConfig.scoringWeights = normalized.scoringWeights;
  level.meta.generationConfig.routeGradeWeights = normalized.routeGradeWeights;
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
  mission.meta.currentFieldConfig = generatedCurrentFieldConfig;
  mission.meta.importedFlowField = normalized.importedFlowField;
  mission.meta.sampleFieldConfig = normalized.sampleFieldConfig;
  mission.meta.navigationUncertainty = normalized.navigationUncertainty;
  mission.meta.missionMode = normalized.missionMode;
  mission.meta.missionModePreset = normalized.missionModePreset;
  mission.rules ??= {};
  if (normalized.sampling) mission.rules.sampling = { ...(mission.rules.sampling ?? {}), ...normalized.sampling };
  mission.rules.navigationUncertainty = normalized.navigationUncertainty;
  mission.rules.missionMode = normalized.missionMode;
  mission.rules.scoringWeights = normalized.scoringWeights;
  mission.rules.routeGradeWeights = normalized.routeGradeWeights;
  mission.scoring = {
    ...(mission.scoring ?? {}),
    missionMode: normalized.missionMode,
    weights: normalized.scoringWeights
  };
  mission.objectives = [
    ...(mission.objectives ?? []),
    {
      id: `mission_mode_${normalized.missionMode}`,
      label: normalized.missionModePreset.label,
      description: normalized.missionModePreset.description,
      metric: normalized.missionModePreset.concept,
      operator: 'mode',
      value: normalized.missionMode
    }
  ];
  mission.meta.replaySeedContract = replaySeedContract;
  ensureModernWaterColumnMissionConfig(level, mission, { source: 'generatedModernMission', scenarioMode: normalized.mode });
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
    missionMode: setup.missionMode,
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
    sampleFieldConfig: setup.sampleFieldConfig ?? setup.sampleField,
    navigationUncertainty: setup.navigationUncertainty,
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
