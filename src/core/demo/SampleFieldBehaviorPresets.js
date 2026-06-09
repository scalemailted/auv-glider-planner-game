export const CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID = 'custom';

export const SAMPLE_FIELD_BEHAVIOR_PRESETS = [
  {
    id: 'recurringHotspots',
    label: 'Recurring Hotspots',
    category: 'Hotspot dynamics',
    description: 'Several preferred regions flare up repeatedly over time.',
    strategy: 'Learn recurring event regions and time routes for active windows.',
    notA: 'Not a one-shot extinction event; ordinary bursts regenerate from the event likelihood field.',
    config: {
      eventLikelihood: 'multiModalLikelihood',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'static',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'clusteredField',
      hotspotCount: 4,
      clusterSize: 'medium',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'bursty',
      temporalBehavior: 'bursty',
      spatialEvolution: 'stationary',
      patternEvolution: 'stationary',
      evolutionModel: 'stationary',
      motionScope: 'perFeature',
      stateModel: 'frequencyBased',
      depletionMode: 'soft',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'The likelihood view shows persistent separated regions where events tend to recur. The sample value view shows which recurring basins are currently active; not every likely basin must be active at every moment.',
      goodForTeaching: 'Recurring-event timing, assignment across known basins, and routes that wait for active windows.'
    }
  },
  {
    id: 'migratingPatch',
    label: 'Migrating Patch',
    category: 'Moving features',
    description: 'One value patch moves smoothly through adjacent or intermediate locations.',
    strategy: 'Plan where the feature will be, not only where it is now.',
    notA: 'Not current advection; flow-driven motion belongs in the Coupled Fields Demo.',
    config: {
      eventLikelihood: 'gaussianLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'sustained',
      eventLikelihoodSpatialEvolution: 'continuousDrift',
      spatialPattern: 'clusteredField',
      hotspotCount: 1,
      clusterSize: 'medium',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'sustained',
      temporalBehavior: 'periodic',
      spatialEvolution: 'continuousDrift',
      patternEvolution: 'continuousDrift',
      evolutionModel: 'continuousDrift',
      motionScope: 'perFeature',
      stateModel: 'timeIndexed',
      depletionMode: 'none',
      timeMode: 'dynamic',
      dynamicComplexity: 'high',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'One active patch moves smoothly through adjacent/intermediate locations.',
      goodForTeaching: 'Lead-time planning and intercepting a moving opportunity.'
    }
  },
  {
    id: 'expandingFront',
    label: 'Expanding Front',
    category: 'Spreading boundaries',
    description: 'An active boundary or region spreads into nearby cells.',
    strategy: 'Sample along the active edge or intercept the advancing boundary.',
    notA: 'Not a current front; this is pure sample-value propagation.',
    config: {
      eventLikelihood: 'gradientLikelihood',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'wavyMultiFrequency',
      eventLikelihoodSpatialEvolution: 'randomWalk',
      spatialPattern: 'frontBoundary',
      hotspotCount: 2,
      clusterSize: 'wide',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'sustained',
      temporalBehavior: 'periodic',
      spatialEvolution: 'neighborPropagation',
      patternEvolution: 'neighborPropagation',
      evolutionModel: 'neighborPropagation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'none',
      timeMode: 'dynamic',
      dynamicComplexity: 'high',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'An active boundary/front spreads into nearby cells.',
      goodForTeaching: 'Sampling along a moving edge and anticipating local spread.'
    }
  },
  {
    id: 'patchyRainfall',
    label: 'Patchy Rainfall',
    category: 'Irregular pulses',
    description: 'Scattered seeded patches intensify, fade, and reappear.',
    strategy: 'Navigate an irregular field where value is distributed but not cleanly clustered.',
    notA: 'Not meteorological rainfall; this is a simplified sample-value texture.',
    config: {
      eventLikelihood: 'seededTextureLikelihood',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'static',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'patchyField',
      hotspotCount: 5,
      clusterSize: 'wide',
      valueDistribution: 'uniformRandom',
      temporalPattern: 'randomPulses',
      temporalBehavior: 'nonuniformRandom',
      spatialEvolution: 'randomWalk',
      patternEvolution: 'randomWalk',
      evolutionModel: 'randomWalk',
      motionScope: 'localNeighborhood',
      stateModel: 'timeIndexed',
      depletionMode: 'none',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'Many medium-scale patches across the domain strengthen, fade, and reappear in a seeded way.',
      goodForTeaching: 'Planning over irregular distributed value instead of clean targets.'
    }
  },
  {
    id: 'driftingStormCells',
    label: 'Drifting Storm Cells',
    category: 'Moving bursts',
    description: 'Compact activity cells grow, move, and fade.',
    strategy: 'Intercept high-value moving events before they fade.',
    notA: 'Not a current-advected storm model; flow-driven motion belongs in the Coupled Fields Demo.',
    config: {
      eventLikelihood: 'multiModalLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'rapidPulse',
      eventLikelihoodSpatialEvolution: 'continuousDrift',
      spatialPattern: 'clusteredField',
      hotspotCount: 3,
      clusterSize: 'tight',
      valueDistribution: 'constantValue',
      temporalPattern: 'rapidPulse',
      temporalBehavior: 'periodic',
      spatialEvolution: 'continuousDrift',
      patternEvolution: 'continuousDrift',
      evolutionModel: 'continuousDrift',
      motionScope: 'perFeature',
      stateModel: 'stateEvolving',
      depletionMode: 'none',
      timeMode: 'dynamic',
      dynamicComplexity: 'high',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'Two or three compact high-value cells move independently through the domain and pulse rapidly without collapsing between windows.',
      goodForTeaching: 'Timing routes to moving, fading high-value cells.'
    }
  },
  {
    id: 'freshnessRevisitValue',
    label: 'Freshness / Revisit Value',
    category: 'Monitoring',
    description: 'Recently visited places cool down while stale places warm back up.',
    strategy: 'Plan revisits at the right time rather than sampling the same place too soon.',
    notA: 'Freshness is demo-only unless tied to actual mission visit history.',
    config: {
      eventLikelihood: 'sparseCandidateSites',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'static',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'monitoringStations',
      hotspotCount: 6,
      clusterSize: 'tight',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'sustained',
      temporalBehavior: 'periodic',
      spatialEvolution: 'stationary',
      patternEvolution: 'stationary',
      evolutionModel: 'stationary',
      motionScope: 'perFeature',
      stateModel: 'historyAware',
      depletionMode: 'freshnessAge',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium',
      displayMode: 'freshnessRevisitValue'
    },
    explanation: {
      expectedBehavior: 'Synthetic visited regions lose value, while unvisited or stale regions become valuable again.',
      goodForTeaching: 'Persistent monitoring, revisit cadence, and avoiding premature resampling.'
    }
  },
  {
    id: 'neighborSpread',
    label: 'Neighbor Spread',
    category: 'Local propagation',
    description: 'Activity spreads locally from active regions.',
    strategy: 'Use prior activity to infer where nearby future value may appear.',
    notA: 'Propagation is sample-value spread, not fluid advection.',
    config: {
      eventLikelihood: 'patchyLikelihood',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'static',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'patchyField',
      hotspotCount: 4,
      clusterSize: 'medium',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'sustained',
      temporalBehavior: 'markovNeighbor',
      spatialEvolution: 'neighborPropagation',
      patternEvolution: 'neighborPropagation',
      evolutionModel: 'neighborPropagation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      timeMode: 'dynamic',
      dynamicComplexity: 'high',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'Active cells warm nearby cells over time.',
      goodForTeaching: 'Local inference and spread-aware sampling.'
    }
  },
  {
    id: 'oscillatingEcologicalField',
    label: 'Oscillating Ecological Field',
    category: 'Cyclic processes',
    description: 'Spatial regions rise and fall with replayable cycles.',
    strategy: 'Time arrivals around predictable cycles and phase differences.',
    notA: 'A simplified cyclic ecology-inspired field, not a validated ecological process model.',
    config: {
      eventLikelihood: 'multiModalLikelihood',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'static',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'clusteredField',
      hotspotCount: 4,
      clusterSize: 'medium',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'wavyMultiFrequency',
      temporalBehavior: 'periodic',
      spatialEvolution: 'stationary',
      patternEvolution: 'stationary',
      evolutionModel: 'stationary',
      motionScope: 'perFeature',
      stateModel: 'frequencyBased',
      depletionMode: 'none',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'Different patches rise and fall with mixed-frequency seeded waves and phase offsets.',
      goodForTeaching: 'Scheduling around recurring peaks.'
    }
  },
  {
    id: 'forestFireFrontInspired',
    label: 'Forest Fire Front (inspired)',
    category: 'Inspired processes',
    description: 'A front-like active boundary advances, leaving lower-value regions behind.',
    strategy: 'Focus on active boundary regions instead of stale areas behind the front.',
    notA: 'Inspired by spreading-front processes; not a physical wildfire model.',
    config: {
      eventLikelihood: 'gradientLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'sustained',
      eventLikelihoodSpatialEvolution: 'neighborPropagation',
      spatialPattern: 'frontBoundary',
      hotspotCount: 3,
      clusterSize: 'wide',
      valueDistribution: 'gaussianNormal',
      temporalPattern: 'bursty',
      temporalBehavior: 'bursty',
      spatialEvolution: 'neighborPropagation',
      patternEvolution: 'neighborPropagation',
      evolutionModel: 'neighborPropagation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'hard',
      timeMode: 'dynamic',
      dynamicComplexity: 'high',
      displayMode: 'depletedValue'
    },
    explanation: {
      expectedBehavior: 'An active front advances; cells behind it cool or become less useful.',
      goodForTeaching: 'Boundary tracking and sampling active edges.'
    }
  },
  {
    id: 'lifeLikeCellularEmergenceInspired',
    label: 'Life-Like Cellular Emergence (inspired)',
    category: 'Inspired processes',
    description: 'Local activation rules create emergent patch patterns.',
    strategy: 'Observe how local rules create global structure.',
    notA: 'Life-inspired local-rule process; not exact Conway rules.',
    config: {
      eventLikelihood: 'seededTextureLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'intermittent',
      eventLikelihoodSpatialEvolution: 'neighborPropagation',
      spatialPattern: 'patchyField',
      hotspotCount: 5,
      clusterSize: 'medium',
      valueDistribution: 'uniformRandom',
      temporalPattern: 'intermittent',
      temporalBehavior: 'markovNeighbor',
      spatialEvolution: 'neighborPropagation',
      patternEvolution: 'neighborPropagation',
      evolutionModel: 'neighborPropagation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'none',
      timeMode: 'dynamic',
      dynamicComplexity: 'high',
      displayMode: 'sampleValue'
    },
    explanation: {
      expectedBehavior: 'Local rules create activity that appears, disappears, and forms structured patches.',
      goodForTeaching: 'Emergence from local neighbor activation.'
    }
  }
];

export const SAMPLE_FIELD_BEHAVIOR_PRESET_OPTIONS = [
  { id: CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID, label: 'Custom' },
  ...SAMPLE_FIELD_BEHAVIOR_PRESETS.map(({ id, label }) => ({ id, label }))
];

export function normalizeSampleFieldBehaviorPresetId(value = CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID) {
  const id = String(value ?? CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID);
  if (id === CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID) return CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID;
  return SAMPLE_FIELD_BEHAVIOR_PRESETS.some((preset) => preset.id === id) ? id : CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID;
}

export function sampleFieldBehaviorPresetById(value) {
  const id = normalizeSampleFieldBehaviorPresetId(value);
  return SAMPLE_FIELD_BEHAVIOR_PRESETS.find((preset) => preset.id === id) ?? null;
}

export function sampleFieldBehaviorPresetLabel(value) {
  return sampleFieldBehaviorPresetById(value)?.label ?? 'Custom';
}

export function sampleFieldBehaviorPresetMetadata(value, modified = false) {
  const preset = sampleFieldBehaviorPresetById(value);
  return {
    id: preset?.id ?? CUSTOM_SAMPLE_FIELD_BEHAVIOR_PRESET_ID,
    label: preset?.label ?? 'Custom',
    modified: Boolean(preset && modified),
    category: preset?.category ?? 'Custom composition'
  };
}

export function sampleFieldBehaviorPresetSummary(value) {
  const preset = sampleFieldBehaviorPresetById(value);
  if (!preset) return 'Custom primitive composition.';
  return [
    `Event Likelihood: ${preset.config.eventLikelihood}`,
    `Spatial Pattern: ${preset.config.spatialPattern}`,
    `Temporal Pattern: ${preset.config.temporalPattern}`,
    `Spatial Evolution: ${preset.config.spatialEvolution}`,
    `State Model: ${preset.config.stateModel}`,
    `Sampling Effect: ${preset.config.depletionMode}`
  ].join(' | ');
}
