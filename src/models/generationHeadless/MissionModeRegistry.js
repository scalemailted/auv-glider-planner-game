const FlowFieldConfig = require('./FlowFieldConfig.js')
const SampleFieldConfig = require('./SampleFieldConfig.js')
const NavigationUncertainty = require('./NavigationUncertainty.js')
const MISSION_MODE_IDS = [
  'surveySweep',
  'signalHunt',
  'surfaceAdapt',
  'fleetSplit',
  'uncertainWaters',
  'forecastChase',
  'plumeIntercept',
  'watchStations',
  'dangerRun',
  'longGlide'
];

 const DEFAULT_MISSION_MODE_ID = 'surveySweep';

 const MISSION_MODE_PRESETS = [
  {
    id: 'surveySweep',
    label: 'Survey Sweep',
    concept: 'coverage_planning',
    description: 'Cover as much unsampled water as possible before time expires.',
    difficulty: 'easy',
    tags: ['Coverage', 'Depletion', 'Efficiency'],
    recommendedLenses: ['value', 'coverage', 'travelCost'],
    strategyHint: 'Spread routes across unsampled regions and avoid revisiting depleted cells.',
    defaults: {
      mode: 'perfectKnowledge',
      agentCount: 2,
      roiHotspots: 5,
      priorityTargetFrequency: 0.15,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'coverage',
        spatialPattern: 'gradient',
        temporalBehavior: 'periodic',
        distribution: 'uniform',
        depletion: { mode: 'soft', radiusCells: 1, recoveryRate: 0 }
      },
      sampling: { mode: 'diminishing', duplicateValueMultiplier: 0.1, localDepletionRadius: 1, depletionFactor: 0.25 },
      navigationUncertainty: { level: 'low' },
      scoringWeights: { coverage: 1.35, sampling: 1.1, duplicationPenalty: 1.4 },
      routeGradeWeights: { coverageValue: 1.35, immediateSampleReward: 1.05 }
    }
  },
  {
    id: 'signalHunt',
    label: 'Signal Hunt',
    concept: 'informative_path_planning',
    description: 'Find the samples that reduce the most uncertainty.',
    difficulty: 'medium',
    tags: ['Uncertainty', 'Information', 'Forecast'],
    recommendedLenses: ['uncertainty', 'forecast', 'value'],
    strategyHint: 'The highest-value sample is not always the most informative one.',
    defaults: {
      mode: 'forecast',
      roiHotspots: 5,
      forecastNoise: 0.26,
      ensembleCount: 4,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'uncertainty',
        spatialPattern: 'randomTexture',
        temporalBehavior: 'nonuniformRandom',
        distribution: 'heavyTail',
        stochasticity: { forecastNoise: 'medium', truthVariation: 'high', uncertaintyGrowth: 'moderate' }
      },
      navigationUncertainty: { level: 'low' },
      scoringWeights: { informationGain: 1.45, sampling: 1.05 },
      routeGradeWeights: { immediateSampleReward: 1.1, futureSetupValue: 1.2 }
    }
  },
  {
    id: 'surfaceAdapt',
    label: 'Surface & Adapt',
    concept: 'adaptive_sampling',
    description: 'Surface to update the forecast, then replan.',
    difficulty: 'medium',
    tags: ['Surfacing', 'Adaptation', 'Forecast'],
    recommendedLenses: ['forecast', 'uncertainty', 'current'],
    strategyHint: 'Surface near uncertainty to reveal better future targets.',
    defaults: {
      mode: 'forecast',
      surfaceInterval: 3,
      forecastNoise: 0.28,
      forecastDecay: true,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'uncertainty',
        spatialPattern: 'multiHotspot',
        temporalBehavior: 'markovNeighbor',
        distribution: 'multimodal',
        stochasticity: { forecastNoise: 'medium', truthVariation: 'medium', uncertaintyGrowth: 'fast' }
      },
      plannerDefaults: { surfaceUpdates: true },
      navigationUncertainty: { level: 'medium' },
      scoringWeights: { replanning: 1.35, informationGain: 1.25 }
    }
  },
  {
    id: 'fleetSplit',
    label: 'Fleet Split',
    concept: 'multi_agent_coordination',
    description: 'Coordinate multiple gliders without wasting samples.',
    difficulty: 'medium',
    tags: ['Fleet', 'Assignment', 'No Duplicates'],
    recommendedLenses: ['coverage', 'value', 'agents'],
    strategyHint: 'Send gliders to different regions unless a coordinated revisit is valuable.',
    defaults: {
      mode: 'perfectKnowledge',
      agentCount: 3,
      multipleDropZones: true,
      roiHotspots: 6,
      priorityTargetFrequency: 0.45,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'mixed',
        spatialPattern: 'bimodal',
        temporalBehavior: 'periodic',
        distribution: 'bimodal'
      },
      sampling: { mode: 'diminishing', duplicateValueMultiplier: 0, localDepletionRadius: 1, depletionFactor: 0.15 },
      navigationUncertainty: { level: 'low' },
      scoringWeights: { distribution: 1.45, duplicationPenalty: 1.6 },
      routeGradeWeights: { coverageValue: 1.25, futureSetupValue: 1.2 }
    }
  },
  {
    id: 'uncertainWaters',
    label: 'Uncertain Waters',
    concept: 'stochastic_planning',
    description: 'Plan with imperfect forecasts and hidden truth.',
    difficulty: 'hard',
    tags: ['Risk', 'Hidden Truth', 'Forecast'],
    recommendedLenses: ['forecast', 'risk', 'uncertainty'],
    strategyHint: 'Balance safe known value against risky uncertain value.',
    defaults: {
      mode: 'forecast',
      difficulty: 'hard',
      forecastNoise: 0.32,
      ensembleCount: 5,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'uncertainty',
        spatialPattern: 'multiHotspot',
        temporalBehavior: 'nonuniformRandom',
        distribution: 'multimodal',
        stochasticity: { forecastNoise: 'high', truthVariation: 'high', uncertaintyGrowth: 'fast' }
      },
      navigationUncertainty: { level: 'medium' },
      scoringWeights: { riskAdjustedValue: 1.4, sampling: 1.05 }
    }
  },
  {
    id: 'forecastChase',
    label: 'Forecast Chase',
    concept: 'forecast_aware_planning',
    description: 'Use forecast windows before they go stale.',
    difficulty: 'medium',
    tags: ['Timing', 'Forecast', 'Decay'],
    recommendedLenses: ['forecast', 'time', 'value'],
    strategyHint: 'Arriving late may mean the forecast is no longer useful.',
    defaults: {
      mode: 'forecast',
      forecastDecay: true,
      forecastDecayRate: 0.075,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'tracking',
        spatialPattern: 'multiHotspot',
        temporalBehavior: 'periodic',
        distribution: 'multimodal',
        stochasticity: { forecastNoise: 'medium', truthVariation: 'medium', uncertaintyGrowth: 'moderate' }
      },
      navigationUncertainty: { level: 'low' },
      scoringWeights: { timelySampling: 1.45, forecastConfidence: 1.25 },
      routeGradeWeights: { futureSetupValue: 1.35, timeCostPenalty: 1.2 }
    }
  },
  {
    id: 'plumeIntercept',
    label: 'Plume Intercept',
    concept: 'event_interception',
    description: 'Catch a moving burst before it fades.',
    difficulty: 'medium',
    tags: ['Timing', 'Currents', 'Interception'],
    recommendedLenses: ['current', 'forecast', 'value'],
    strategyHint: 'Do not chase where the plume was; intercept where it will be.',
    defaults: {
      mode: 'forecast',
      currentPreset: 'eddyField',
      currentStrength: 1.1,
      roiHotspots: 3,
      priorityTargetFrequency: 0.55,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'tracking',
        spatialPattern: 'plume',
        temporalBehavior: 'currentAdvected',
        distribution: 'heavyTail',
        currentCoupling: { enabled: true, advectionStrength: 0.85 },
        neighborInfluence: { enabled: true, diffusionRate: 0.16, growthRate: 0.05, decayRate: 0.04 }
      },
      medals: ['burst_peak_intercept', 'plume_trail_sample'],
      navigationUncertainty: { level: 'low' },
      scoringWeights: { timing: 1.55, sampling: 1.15 },
      routeGradeWeights: { futureSetupValue: 1.45, immediateSampleReward: 1.2 }
    }
  },
  {
    id: 'watchStations',
    label: 'Watch Stations',
    concept: 'persistent_monitoring',
    description: 'Revisit key regions over time to track change.',
    difficulty: 'medium',
    tags: ['Revisit', 'Monitoring', 'Timing'],
    recommendedLenses: ['time', 'value', 'coverage'],
    strategyHint: 'A good route returns at the right time, not just once.',
    defaults: {
      mode: 'perfectKnowledge',
      surfaceInterval: 3,
      roiHotspots: 4,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'tracking',
        spatialPattern: 'multiHotspot',
        temporalBehavior: 'periodic',
        distribution: 'multimodal',
        depletion: { mode: 'informationGain', radiusCells: 1, recoveryRate: 0.25 }
      },
      sampling: { mode: 'persistent', duplicateValueMultiplier: 0.35, cooldownWindows: 2, persistentWindowMultiplier: 1.35 },
      navigationUncertainty: { level: 'low' },
      scoringWeights: { revisitTiming: 1.5, sampling: 1.1 }
    }
  },
  {
    id: 'dangerRun',
    label: 'Danger Run',
    concept: 'risk_aware_routing',
    description: 'Collect value while avoiding hazards and shoreline currents.',
    difficulty: 'hard',
    tags: ['Risk', 'Hazards', 'Safety'],
    recommendedLenses: ['risk', 'current', 'terrain'],
    strategyHint: 'A shorter path is not always a safer path.',
    defaults: {
      mode: 'perfectKnowledge',
      difficulty: 'hard',
      hazardDensity: 0.12,
      terrainDensity: 0.14,
      currentStrength: 1.05,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'mixed',
        spatialPattern: 'coastalBand',
        temporalBehavior: 'periodic',
        distribution: 'gaussian',
        spatialCorrelation: { enabled: true, radiusCells: 3, anisotropy: 'shorelineAligned' }
      },
      navigationUncertainty: { level: 'medium' },
      scoringWeights: { safety: 1.55, sampling: 1.05 },
      routeGradeWeights: { hazardPenalty: 1.45, shorelineRiskPenalty: 1.45 }
    }
  },
  {
    id: 'longGlide',
    label: 'Long Glide',
    concept: 'energy_aware_routing',
    description: 'Score efficiently while conserving battery.',
    difficulty: 'medium',
    tags: ['Energy', 'Currents', 'Efficiency'],
    recommendedLenses: ['travelCost', 'current', 'energy'],
    strategyHint: 'Ride favorable currents and avoid expensive opposing routes.',
    defaults: {
      mode: 'perfectKnowledge',
      fuel: 80,
      gliderSpeed: 1.15,
      currentPreset: 'currentCorridor',
      currentStrength: 0.95,
      sampleFieldConfig: {
        mode: 'dynamic',
        objectiveModel: 'mixed',
        spatialPattern: 'channelCorridor',
        temporalBehavior: 'periodic',
        distribution: 'gaussian'
      },
      navigationUncertainty: { level: 'off' },
      scoringWeights: { energyEfficiency: 1.55, currentAssist: 1.25 },
      routeGradeWeights: { currentAssistValue: 1.35, energyCostPenalty: 1.45 }
    }
  }
];

 function normalizeMissionModeId(value = DEFAULT_MISSION_MODE_ID) {
  return MISSION_MODE_IDS.includes(value) ? value : DEFAULT_MISSION_MODE_ID;
}

 function getMissionModePreset(value = DEFAULT_MISSION_MODE_ID) {
  const id = normalizeMissionModeId(value);
  return MISSION_MODE_PRESETS.find((preset) => preset.id === id) ?? MISSION_MODE_PRESETS[0];
}

 function applyMissionModeDefaults(config = {}) {
  const preset = getMissionModePreset(config.missionMode);
  const mode = config.mode ?? preset.defaults.mode ?? 'perfectKnowledge';
  const currentFieldConfig = FlowFieldConfig.normalizeCurrentFieldConfig(config.currentFieldConfig ?? FlowFieldConfig.createDefaultCurrentFieldConfig(mode), {
    mode,
    currentPreset: config.currentPreset ?? preset.defaults.currentPreset,
    currentStrength: config.currentStrength ?? preset.defaults.currentStrength
  });
  return {
    ...preset.defaults,
    ...config,
    missionMode: preset.id,
    mode,
    currentFieldConfig: {
      ...currentFieldConfig,
      basePreset: config.currentFieldConfig?.basePreset ?? config.currentPreset ?? preset.defaults.currentPreset ?? currentFieldConfig.basePreset,
      strength: Number(config.currentFieldConfig?.strength ?? config.currentStrength ?? preset.defaults.currentStrength ?? currentFieldConfig.strength)
    },
    sampleFieldConfig: SampleFieldConfig.normalizeSampleFieldConfig({
      ...SampleFieldConfig.createDefaultSampleFieldConfig(mode),
      ...(preset.defaults.sampleFieldConfig ?? {}),
      ...(config.sampleFieldConfig ?? config.sampleField ?? {})
    }, {
      mode,
      roiHotspots: config.roiHotspots ?? preset.defaults.roiHotspots
    }),
    scoringWeights: {
      ...(preset.defaults.scoringWeights ?? {}),
      ...(config.scoringWeights ?? {})
    },
    routeGradeWeights: {
      ...(preset.defaults.routeGradeWeights ?? {}),
      ...(config.routeGradeWeights ?? {})
    },
    navigationUncertainty: NavigationUncertainty.normalizeNavigationUncertaintyConfig({
      level: mode === 'forecast' ? 'low' : 'off',
      ...(preset.defaults.navigationUncertainty ?? {}),
      ...(config.navigationUncertainty ?? {})
    }),
    medals: config.medals ?? preset.defaults.medals ?? [],
    plannerDefaults: {
      ...(preset.defaults.plannerDefaults ?? {}),
      ...(config.plannerDefaults ?? {})
    }
  };
}

 function missionModeLabel(value) {
  return getMissionModePreset(value).label;
}

module.exports = {DEFAULT_MISSION_MODE_ID, MISSION_MODE_PRESETS, normalizeMissionModeId, getMissionModePreset, applyMissionModeDefaults, missionModeLabel}