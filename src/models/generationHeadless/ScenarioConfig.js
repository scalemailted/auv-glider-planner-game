const LevelGenerator = require('./LevelGenerator.js')
const GameInstanceId = require('./GameInstanceId.js')
const LevelEditOperations = require('./LevelEditOperations.js')
const VectorFieldPresets = require('./VectorFieldPresets.js')
const ForecastDecay = require('./ForecastDecay.js')
const ReplaySeedContract = require('./ReplaySeedContract.js')
const FlowFieldConfig = require('./FlowFieldConfig.js')
const SampleFieldConfig = require('./SampleFieldConfig.js')
const MissionModeRegistry = require('./MissionModeRegistry.js')
const NavigationUncertainty = require('./NavigationUncertainty.js')
const WaterColumnMissionDefaults = require('./WaterColumnMissionDefaults.js')
const OperationalDomainSpec = require('./OperationalDomainSpec.js')
const MissionResolutionProfile = require('./MissionResolutionProfile.js')
const RegionalMissionDefaults = require('./RegionalMissionDefaults.js')
const ForecastGenerator = require('./ForecastGenerator.js')
const Random = require('./Random.js')
const SCENARIO_SIZE_PRESETS = {
  small: { label: 'Compact Inspection Lattice', width: 12, height: 12, duration: 12, surfaceInterval: 3, agentCount: 1, fuel: 100 },
  medium: { label: 'Standard Inspection Lattice', width: 20, height: 20, duration: 24, surfaceInterval: 3, agentCount: 2, fuel: 120 },
  large: { label: 'Compact Inspection Lattice', width: 12, height: 12, duration: 30, surfaceInterval: 3, agentCount: 1, fuel: 100 },
  huge: { label: 'Dense Inspection Lattice / Experimental', width: 12, height: 12, duration: 12, surfaceInterval: 3, agentCount: 1, fuel: 100 }
};

 const OPERATIONAL_DOMAIN_CHOICES = Object.freeze({
  compactTrainingArea: Object.freeze({ label: 'Compact Training Area', resolutionProfileId: 'tutorialCompact', widthKm: 1.2, heightKm: 0.8, duration: 12, surfaceInterval: 3, agentCount: 1, fuel: 100 }),
  coastalMissionArea: Object.freeze({ label: 'Coastal Mission Area', resolutionProfileId: 'coastalStandard', widthKm: 32, heightKm: 20, duration: 36, surfaceInterval: 6, agentCount: 2, fuel: 140 }),
  regionalFleetArea: Object.freeze({ label: 'Regional Fleet Area', resolutionProfileId: 'regionalFleet', widthKm: 80, heightKm: 50, duration: 48, surfaceInterval: 8, agentCount: 3, fuel: 190 })
});

 function createDefaultScenarioConfig(mode = 'perfectKnowledge') {
  const stochastic = mode === 'forecast';
  const preset = stochastic ? 'medium' : 'small';
  const missionMode = stochastic ? 'uncertainWaters' : MissionModeRegistry.DEFAULT_MISSION_MODE_ID;
  return normalizeScenarioConfig({
    mode,
    missionMode,
    preset,
    difficulty: stochastic ? 'hard' : 'medium',
    currentPreset: stochastic ? 'eddyField' : 'currentCorridor',
    currentStrength: stochastic ? 1.05 : 0.85,
    currentVariability: stochastic ? 0.65 : 0.4,
    currentFieldConfig: FlowFieldConfig.createDefaultCurrentFieldConfig(mode),
    sampleFieldConfig: SampleFieldConfig.createDefaultSampleFieldConfig(mode),
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
    gliderSpeed: stochastic ? 1.2 : 1.25,
    operationalDomainProfileId: 'compactTrainingArea'
  });
}

 function normalizeScenarioConfig(config = {}) {
  const missionDefaults = MissionModeRegistry.applyMissionModeDefaults(config);
  const presetKey = SCENARIO_SIZE_PRESETS[missionDefaults.preset] ? missionDefaults.preset : 'small';
  const preset = SCENARIO_SIZE_PRESETS[presetKey];
  const mode = missionDefaults.mode === 'forecast' ? 'forecast' : 'perfectKnowledge';
  const importedFlowField = missionDefaults.importedFlowField ?? missionDefaults.flowFieldImport ?? null;
  const normalizedCurrentField = FlowFieldConfig.normalizeCurrentFieldConfig(importedFlowField?.syntheticConfig ?? missionDefaults.currentFieldConfig ?? missionDefaults.currentField ?? {
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
  const currentGeneratorConfig = FlowFieldConfig.currentFieldConfigToGeneratorConfig(normalizedCurrentField, { mode });
  const normalizedSampleField = SampleFieldConfig.normalizeSampleFieldConfig(missionDefaults.sampleFieldConfig ?? missionDefaults.sampleField ?? SampleFieldConfig.createDefaultSampleFieldConfig(mode), {
    mode,
    roiHotspots: missionDefaults.roiHotspots ?? (mode === 'forecast' ? 5 : 4)
  });
  const missionMode = MissionModeRegistry.normalizeMissionModeId(missionDefaults.missionMode);
  const missionModePreset = MissionModeRegistry.getMissionModePreset(missionMode);
  const navigationUncertainty = NavigationUncertainty.normalizeNavigationUncertaintyConfig(missionDefaults.navigationUncertainty);
  const requestedDomainProfile = missionDefaults.operationalDomainProfileId ?? missionDefaults.domainProfileId ?? missionDefaults.operationalDomainChoice;
  const domainProfileRequested = Boolean(requestedDomainProfile);
  const operationalDomainProfileId = normalizeOperationalDomainProfileId(requestedDomainProfile);
  const domainChoice = OPERATIONAL_DOMAIN_CHOICES[operationalDomainProfileId];
  const resolutionProfile = MissionResolutionProfile.normalizeMissionResolutionProfile(requestedDomainProfile ? domainChoice.resolutionProfileId : missionDefaults.resolutionProfile ?? domainChoice.resolutionProfileId);
  const operationalDomain = requestedDomainProfile ? createDomainForChoice(operationalDomainProfileId) : missionDefaults.operationalDomain ?? createDomainForChoice(operationalDomainProfileId);
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
    operationalDomainProfileId,
    operationalDomainProfile: domainChoice,
    agentCount: clampInt(domainProfileRequested ? domainChoice.agentCount : missionDefaults.agentCount ?? domainChoice.agentCount ?? preset.agentCount, 1, 8),
    width: 12,
    height: 12,
    duration: clampInt(domainChoice.duration ?? missionDefaults.duration ?? preset.duration, 6, 96),
    surfaceInterval: clampInt(domainChoice.surfaceInterval ?? missionDefaults.surfaceInterval ?? preset.surfaceInterval, 1, 24),
    fuel: clampInt(domainProfileRequested ? domainChoice.fuel : missionDefaults.fuel ?? domainChoice.fuel ?? preset.fuel, 25, 400),
    gliderSpeed: finiteNumber(missionDefaults.gliderSpeed, mode === 'forecast' ? 1.2 : 1.25),
    difficulty: missionDefaults.difficulty ?? (mode === 'forecast' ? 'hard' : 'medium'),
    terrainDensity: clamp01(finiteNumber(missionDefaults.terrainDensity, 0.08)),
    hazardDensity: clamp01(finiteNumber(missionDefaults.hazardDensity, mode === 'forecast' ? 0.08 : 0.06)),
    currentStrength: currentGeneratorConfig.currentStrength,
    currentVariability: clamp01(missionDefaults.currentFieldConfig || missionDefaults.currentField
      ? currentGeneratorConfig.currentVariability
      : finiteNumber(missionDefaults.currentVariability ?? missionDefaults.variability, currentGeneratorConfig.currentVariability)),
    currentPreset: VectorFieldPresets.normalizeVectorPreset(currentGeneratorConfig.currentPreset),
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
    plannerDefaults: missionDefaults.plannerDefaults ?? {},
    operationalDomain,
    resolutionProfile
  };
}

 function buildScenarioGenerationConfig(config = {}) {
  const normalized = normalizeScenarioConfig(config);
  return {
    mode: normalized.mode === 'forecast' ? 'stochastic' : 'deterministic',
    operationalDomainProfileId: normalized.operationalDomainProfileId,
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
    vectorField: VectorFieldPresets.getVectorPresetConfig(normalized.currentPreset, {
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
    operationalDomain: normalized.operationalDomain,
    resolutionProfile: normalized.resolutionProfile,
    priorityTargetFrequency: normalized.priorityTargetFrequency,
    forecastNoise: normalized.forecastNoise,
    forecastConfidence: normalized.forecastConfidence,
    uncertaintyGrowth: normalized.uncertaintyGrowth,
    hiddenTruthVariation: normalized.hiddenTruthVariation,
    forecastDecay: normalized.forecastDecay,
    forecastRules: ForecastDecay.normalizeForecastRules({
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

 function generateScenarioFromConfig(config = {}) {
  const normalized = normalizeScenarioConfig(config);
  const stochastic = normalized.mode === 'forecast';
  const challengeId = String(config.challengeId ?? config.uuid ?? config.instanceId ?? GameInstanceId.createGameInstanceId('CHALLENGE'));
  const seed = config.seed ?? ReplaySeedContract.deriveSeedFromUuid(challengeId, 'mission') ?? makeChallengeSeed(normalized.mode);
  if (normalized.operationalDomainProfileId === 'regionalFleetArea') {
    const regionalLevelName = config.name ?? (stochastic ? `Stochastic Challenge ${seed}` : `Deterministic Challenge ${seed}`);
    const bundle = RegionalMissionDefaults.createRegionalMissionBundle({ seed, levelId: `regional_fleet_survey_${challengeId}`, missionId: `regional_fleet_mission_${challengeId}`, domain: normalized.operationalDomain, resolutionProfile: normalized.resolutionProfile, agentCount: 1, name: regionalLevelName });
    const level = GameInstanceId.ensureLevelIdentity(bundle.level);
    level.challengeMode = normalized.mode;
    level.instanceId = challengeId;
    level.meta ??= {};
    level.meta.name = regionalLevelName;
    level.meta.replaySeedAnchor = challengeId;
    level.meta.generationVersion = ReplaySeedContract.GENERATION_VERSION;
    const regionalGenerationConfig = buildScenarioGenerationConfig({ ...normalized, seed, challengeId });
    level.meta.generationConfig = {
      ...regionalGenerationConfig,
      challengeId,
      replaySeedAnchor: challengeId,
      generationVersion: ReplaySeedContract.GENERATION_VERSION,
      scenarioSetup: {
        ...regionalGenerationConfig,
        challengeId,
        replaySeedAnchor: challengeId,
        generationVersion: ReplaySeedContract.GENERATION_VERSION
      }
    };
    const mission = bundle.mission;
    mission.meta ??= {};
    mission.meta.scenarioSetup = level.meta.generationConfig.scenarioSetup;
    mission.meta.operationalDomain = normalized.operationalDomain;
    mission.meta.resolutionProfile = normalized.resolutionProfile;
    mission.meta.operationalDomainProfileId = normalized.operationalDomainProfileId;
    WaterColumnMissionDefaults.ensureModernWaterColumnMissionConfig(level, mission, { source: 'generatedModernMission', scenarioMode: normalized.mode });
    for (const config of [level.world?.waterColumnConfig, mission.waterColumnConfig, mission.world?.waterColumnConfig]) {
      if (config) config.defaultPlanningCameraPresetId = 'tacticalTopDown';
    }
    if (true) applyRegionalForecastCompatibility(level, normalized, seed);
    return { level, mission, config: normalized, generationConfig: level.meta.generationConfig, replaySeedContract: null };
  }
  const generationConfig = {
    ...buildScenarioGenerationConfig({ ...normalized, seed }),
    challengeId,
    replaySeedAnchor: challengeId,
    generationVersion: ReplaySeedContract.GENERATION_VERSION
  };
  const replaySeedContract = ReplaySeedContract.buildReplaySeedContract({ challengeId, generationConfig });
  const vectorPreset = VectorFieldPresets.getVectorPresetConfig(normalized.currentPreset, {
    currentStrength: normalized.currentStrength,
    currentVariability: normalized.currentVariability,
    seed: replaySeedContract?.derivedSeeds?.currents ?? seed
  });
  const forecastRules = generationConfig.forecastRules;
  const level = GameInstanceId.ensureLevelIdentity(LevelGenerator.generateLevel({
    challengeId,
    instanceId: challengeId,
    replaySeedAnchor: challengeId,
    generationVersion: ReplaySeedContract.GENERATION_VERSION,
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
  level.meta.generationVersion = ReplaySeedContract.GENERATION_VERSION;
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
  level.meta.generationConfig.generationVersion = ReplaySeedContract.GENERATION_VERSION;
  level.meta.generationConfig.derivedSeeds = replaySeedContract?.derivedSeeds ?? {};
  if (normalized.operationalDomain) {
    level.operationalDomain = normalized.operationalDomain;
    level.world.operationalDomain = normalized.operationalDomain;
    level.meta.operationalDomain = normalized.operationalDomain;
    level.meta.generationConfig.operationalDomain = normalized.operationalDomain;
  }
  if (normalized.resolutionProfile) {
    level.resolutionProfile = normalized.resolutionProfile;
    level.world.resolutionProfile = normalized.resolutionProfile;
    level.meta.resolutionProfile = normalized.resolutionProfile;
    level.meta.generationConfig.resolutionProfile = normalized.resolutionProfile;
  }

  const mission = LevelEditOperations.buildDefaultMissionForLevel(level, {
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
  mission.meta.operationalDomain = normalized.operationalDomain ?? null;
  mission.meta.resolutionProfile = normalized.resolutionProfile ?? null;
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
  WaterColumnMissionDefaults.ensureModernWaterColumnMissionConfig(level, mission, { source: 'generatedModernMission', scenarioMode: normalized.mode });
  mission.rules ??= {};
  mission.rules.stochasticSeed ??= replaySeedContract?.derivedSeeds?.truth ?? seed;
  mission.rules.rngSeed ??= replaySeedContract?.derivedSeeds?.truth ?? seed;
  return { level, mission, config: normalized, generationConfig, replaySeedContract };
}

 function describeScenarioComplexity(config = {}) {
  const normalized = normalizeScenarioConfig(config);
  const cells = normalized.width * normalized.height;
  const frames = Math.max(1, Math.ceil(normalized.duration));
  const load = cells * frames;
  return {
    cells,
    frames,
    vectorStride: cells >= 1600 ? 3 : cells >= 625 ? 2 : 1,
    warning: cells >= 1600 || load >= 60000
      ? 'Dense inspection lattices are experimental and may be slower on some browsers; they do not define physical mission extent.'
      : cells >= 900
        ? 'Detailed inspection lattices work best with camera zoom and vector stride; physical domain is separate.'
        : 'Browser-safe inspection lattice.'
  };
}

function applyRegionalForecastCompatibility(level, normalized, seed) {
  const baseFrame = level?.layers?.truth?.frames?.[0];
  if (!baseFrame?.current || !baseFrame?.roi) return;
  const frameCount = 13;
  const dt = 1;
  const truthFrames = Array.from({ length: frameCount }, (_value, index) => ({
    t: index * dt,
    current: shiftRegionalCurrentFrame(baseFrame.current, index),
    roi: shiftRegionalRoiFrame(baseFrame.roi, index)
  }));
  const forecastConfig = {
    forecastMode: 'noisy',
    forecastNoise: normalized.forecastNoise,
    forecastDecay: normalized.forecastDecay,
    forecastRules: ForecastDecay.normalizeForecastRules({
      mode: normalized.forecastDecay ? 'decay' : 'none',
      minConfidence: normalized.forecastMinConfidence,
      decayRate: normalized.forecastDecayRate,
      decayModel: normalized.forecastDecayModel
    }),
    ensembleCount: Math.max(1, Number(normalized.ensembleCount ?? 3) || 3)
  };
  level.layers.truth.frames = truthFrames;
  level.layers.forecast = {
    ...(level.layers.forecast ?? {}),
    frames: ForecastGenerator.makeForecastFromTruth(truthFrames, forecastConfig, Random.createSeededRandom(`${seed}:regional-forecast`))
  };
  level.layers.forecasts = ForecastGenerator.makeForecastEnsembleFromTruth(
    truthFrames,
    forecastConfig,
    Random.createSeededRandom(`${seed}:regional-forecast-ensemble`)
  );
  level.meta ??= {};
  level.meta.generationConfig ??= {};
  level.meta.generationConfig.ensembleCount = forecastConfig.ensembleCount;
  level.meta.generationConfig.forecastMode = 'noisy';
  level.meta.generationConfig.forecastRules = forecastConfig.forecastRules;
  level.meta.generationConfig.scenarioSetup ??= {};
  level.meta.generationConfig.scenarioSetup.ensembleCount = forecastConfig.ensembleCount;
  level.meta.generationConfig.scenarioSetup.forecastMode = 'noisy';
  level.meta.generationConfig.scenarioSetup.forecastRules = forecastConfig.forecastRules;
}

function shiftRegionalCurrentFrame(current = [], frameIndex = 0) {
  const phase = frameIndex * 0.37;
  return current.map((row, y) => row.map((vector, x) => {
    const u = Number(vector?.[0] ?? 0);
    const v = Number(vector?.[1] ?? 0);
    const wobble = 0.018 * Math.sin(phase + x * 0.17 + y * 0.11);
    return [roundScenarioValue(u + wobble), roundScenarioValue(v - wobble * 0.7)];
  }));
}

function shiftRegionalRoiFrame(roi = [], frameIndex = 0) {
  const phase = frameIndex * 0.23;
  return roi.map((row, y) => row.map((cell, x) => {
    const wobble = 0.025 * Math.sin(phase + x * 0.19 - y * 0.13);
    if (cell && typeof cell === 'object') {
      const value = clamp01(Number(cell.value ?? cell.expectedValue ?? 0) + wobble);
      const probability = clamp01(Number(cell.probability ?? 1) + wobble * 0.5);
      return {
        ...cell,
        value: roundScenarioValue(value),
        probability: roundScenarioValue(probability),
        expectedValue: roundScenarioValue(value * probability)
      };
    }
    return roundScenarioValue(clamp01(Number(cell ?? 0) + wobble));
  }));
}

function roundScenarioValue(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
function normalizeOperationalDomainProfileId(value) {
  if (value === 'regionalFleet' || value === 'regionalFleetArea') return 'regionalFleetArea';
  if (value === 'coastalStandard' || value === 'coastalMissionArea') return 'coastalMissionArea';
  if (value === 'tutorialCompact' || value === 'compactTrainingArea') return 'compactTrainingArea';
  return 'compactTrainingArea';
}

function createDomainForChoice(profileId) {
  const choice = OPERATIONAL_DOMAIN_CHOICES[normalizeOperationalDomainProfileId(profileId)] ?? OPERATIONAL_DOMAIN_CHOICES.compactTrainingArea;
  const id = normalizeOperationalDomainProfileId(profileId);
  return OperationalDomainSpec.createOperationalDomainSpec({
    domainId: id === 'regionalFleetArea' ? 'synthetic-regional-shelf-80x50km' : id === 'coastalMissionArea' ? 'synthetic-coastal-mission-32x20km' : 'synthetic-compact-training-1p2x0p8km',
    label: choice.label,
    horizontal: { minEastMeters: 0, maxEastMeters: choice.widthKm * 1000, minNorthMeters: 0, maxNorthMeters: choice.heightKm * 1000 },
    time: { durationSeconds: choice.duration * 3600, dtSeconds: 300 },
    source: {
      kind: 'syntheticEducational',
      synthetic: true,
      realData: false,
      calibrated: false,
      operationalForecast: false,
      description: 'Synthetic educational operating area. Not real Gulf of Mexico bathymetry or forecast data.'
    }
  });
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
    ensembleCount: setup.ensembleCount,
    operationalDomainProfileId: setup.operationalDomainProfileId,
    operationalDomain: setup.operationalDomain,
    resolutionProfile: setup.resolutionProfile
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

module.exports = {OPERATIONAL_DOMAIN_CHOICES, createDefaultScenarioConfig, normalizeScenarioConfig, buildScenarioGenerationConfig, generateScenarioFromConfig, describeScenarioComplexity}