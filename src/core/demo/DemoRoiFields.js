import { generateROI } from '../generation/ROIFieldGenerator.js';
import { createSeededRng } from '../random/SeededRng.js';
import {
  SAMPLE_SPATIAL_PATTERNS,
  SAMPLE_TEMPORAL_BEHAVIORS,
  normalizeSampleFieldConfig,
  sampleSpatialPatternLabel,
  sampleTemporalBehaviorLabel
} from '../generation/SampleFieldConfig.js';

export const ROI_DEMO_GRID = { width: 24, height: 16 };
const EVENT_LIKELIHOOD_FIELD_CACHE = new Map();
export const ROI_DEMO_EVENT_LIKELIHOODS = [
  'uniformLikelihood',
  'gaussianLikelihood',
  'multiModalLikelihood',
  'gradientLikelihood',
  'patchyLikelihood',
  'seededTextureLikelihood',
  'sparseCandidateSites'
];
export const ROI_DEMO_LIKELIHOOD_DYNAMICS = ['static', 'dynamic'];
export const ROI_DEMO_DISTRIBUTIONS = [
  'uniformRandom',
  'gaussianHotspots',
  'clusteredHotspots',
  'gradientFront',
  'sparseTargets',
  'ridgeCorridor',
  'boundaryBand',
  'bimodalHotspots',
  'movingHotspot',
  'burstyBloom',
  'currentAdvectedPlume',
  'nonuniformRandom'
];
export const ROI_DEMO_SAMPLE_ONLY_DISTRIBUTIONS = ROI_DEMO_DISTRIBUTIONS.filter((distribution) => distribution !== 'currentAdvectedPlume');
export const ROI_DEMO_TIME_MODES = ['static', 'dynamic'];
export const ROI_DEMO_SPATIAL_PATTERNS = SAMPLE_SPATIAL_PATTERNS;
export const ROI_DEMO_PURE_SPATIAL_PATTERNS = [
  'constantField',
  'gradientField',
  'clusteredField',
  'patchyField',
  'sparseTargets',
  'linearBand',
  'frontBoundary',
  'boundaryBand',
  'monitoringStations',
  'seededTexture'
];
export const ROI_DEMO_VALUE_DISTRIBUTIONS = ['constantValue', 'uniformRandom', 'gaussianNormal'];
export const ROI_DEMO_TEMPORAL_BEHAVIORS = SAMPLE_TEMPORAL_BEHAVIORS;
export const ROI_DEMO_TEMPORAL_PATTERNS = [
  'static',
  'sustained',
  'periodic',
  'bursty',
  'intermittent',
  'rapidPulse',
  'pulseThenSilence',
  'longTailDecay',
  'gaussianEnvelope',
  'randomPulses',
  'wavyMultiFrequency',
  'seasonal'
];
export const ROI_DEMO_SPATIAL_EVOLUTIONS = ['stationary', 'continuousDrift', 'discreteJump', 'randomWalk', 'neighborPropagation'];
export const ROI_DEMO_EVOLUTION_MODELS = ROI_DEMO_SPATIAL_EVOLUTIONS;
export const ROI_DEMO_PATTERN_EVOLUTIONS = ROI_DEMO_SPATIAL_EVOLUTIONS;
export const ROI_DEMO_MOTION_SCOPES = ['perFeature', 'localNeighborhood', 'global'];
export const ROI_DEMO_STATE_MODELS = ['timeIndexed', 'frequencyBased', 'stateEvolving', 'historyAware'];
export const ROI_DEMO_DEPLETION_MODES = ['none', 'hard', 'soft', 'neighborhood', 'freshnessAge', 'revisitRecovery'];
export const ROI_DEMO_DISPLAY_MODES = ['sampleValue', 'eventLikelihood', 'sampleValueLikelihoodOverlay', 'depletedValue', 'freshnessRevisitValue', 'rawBaseValue'];
export const ROI_DEMO_DYNAMIC_COMPLEXITY = ['low', 'medium', 'high'];
export const ROI_DEMO_CLUSTER_SIZES = ['tight', 'medium', 'wide'];

export function normalizeRoiDemoDistribution(value = 'gaussianHotspots') {
  return ROI_DEMO_DISTRIBUTIONS.includes(value) ? value : 'gaussianHotspots';
}

export function normalizeRoiDemoEventLikelihood(value = 'uniformLikelihood') {
  const aliases = {
    constantField: 'uniformLikelihood',
    uniformField: 'uniformLikelihood',
    uniform: 'uniformLikelihood',
    uniformLikelihood: 'uniformLikelihood',
    gaussian: 'gaussianLikelihood',
    gaussianLikelihood: 'gaussianLikelihood',
    multiModal: 'multiModalLikelihood',
    multimodal: 'multiModalLikelihood',
    multiModalLikelihood: 'multiModalLikelihood',
    gradient: 'gradientLikelihood',
    gradientLikelihood: 'gradientLikelihood',
    patchy: 'patchyLikelihood',
    patchyLikelihood: 'patchyLikelihood',
    seededTexture: 'seededTextureLikelihood',
    seededTextureLikelihood: 'seededTextureLikelihood',
    sparseTargets: 'sparseCandidateSites',
    sparseCandidateSites: 'sparseCandidateSites'
  };
  const normalized = aliases[value] ?? value;
  return ROI_DEMO_EVENT_LIKELIHOODS.includes(normalized) ? normalized : 'uniformLikelihood';
}

export function normalizeRoiDemoLikelihoodDynamics(value = 'static') {
  return ROI_DEMO_LIKELIHOOD_DYNAMICS.includes(value) ? value : 'static';
}

export function normalizeRoiDemoTimeMode(value = 'static') {
  return ROI_DEMO_TIME_MODES.includes(value) ? value : 'static';
}

export function createDemoRoiField({
  distribution = 'burstyBloom',
  seed = 'anchor-roi-demo',
  eventLikelihood = null,
  eventLikelihoodDynamics = 'static',
  eventLikelihoodTemporalPattern = 'static',
  eventLikelihoodSpatialEvolution = 'stationary',
  hotspotCount = null,
  clusterSize = 'medium',
  noise = 0.15,
  timeMode = 'static',
  spatialPattern = null,
  valueDistribution = null,
  temporalBehavior = null,
  temporalPattern = null,
  evolutionModel = 'stationary',
  patternEvolution = null,
  spatialEvolution = null,
  motionScope = null,
  stateModel = null,
  depletionMode = 'soft',
  displayMode = 'sampleValue',
  dynamicComplexity = 'medium',
  forecastView = 'forecast',
  behaviorPresetId = null,
  time = 0,
  demoTime = null,
  grid = ROI_DEMO_GRID
} = {}) {
  const width = Math.max(1, Number(grid.width ?? ROI_DEMO_GRID.width));
  const height = Math.max(1, Number(grid.height ?? ROI_DEMO_GRID.height));
  const normalizedDistribution = normalizeRoiDemoDistribution(distribution);
  const normalizedEventLikelihood = normalizeRoiDemoEventLikelihood(eventLikelihood ?? eventLikelihoodFromLegacy(spatialPattern, normalizedDistribution));
  const normalizedEventLikelihoodDynamics = normalizeRoiDemoLikelihoodDynamics(eventLikelihoodDynamics);
  const normalizedEventLikelihoodTemporalPattern = normalizeRoiDemoTemporalPattern(eventLikelihoodTemporalPattern);
  const normalizedEventLikelihoodSpatialEvolution = normalizeRoiDemoSpatialEvolution(eventLikelihoodSpatialEvolution);
  const normalizedTimeMode = normalizeRoiDemoTimeMode(timeMode);
  const legacyClusterCount = legacyClusterCountFromPattern(spatialPattern ?? normalizedDistribution);
  const normalizedPureSpatialPattern = normalizeRoiDemoPureSpatialPattern(spatialPattern ?? pureSpatialPatternFromDistribution(normalizedDistribution));
  const normalizedValueDistribution = normalizeRoiDemoValueDistribution(valueDistribution ?? valueDistributionFromLegacy(normalizedDistribution, spatialPattern));
  const spatialDefaults = pureSpatialPatternDefaults(normalizedPureSpatialPattern);
  const normalizedTemporalPattern = normalizeRoiDemoTemporalPattern(temporalPattern ?? temporalPatternFromBehavior(temporalBehavior ?? distributionToSampleConfig(normalizedDistribution).temporalBehavior));
  const normalizedSpatialEvolution = normalizeRoiDemoSpatialEvolution(spatialEvolution ?? patternEvolution ?? evolutionModel);
  const normalizedEvolutionModel = normalizedSpatialEvolution;
  const normalizedMotionScope = normalizeRoiDemoMotionScope(motionScope ?? defaultMotionScopeForPattern(normalizedPureSpatialPattern, normalizedSpatialEvolution));
  const normalizedStateModel = normalizeRoiDemoStateModel(stateModel ?? roiStateModelForEvolutionModel(normalizedEvolutionModel));
  const normalizedDepletionMode = normalizeRoiDemoDepletionMode(depletionMode);
  const normalizedDisplayMode = normalizeRoiDemoDisplayMode(displayModeFromLegacyForecastView(displayMode, forecastView));
  const normalizedDynamicComplexity = normalizeRoiDemoDynamicComplexity(dynamicComplexity);
  const normalizedClusterSize = normalizeRoiDemoClusterSize(clusterSize);
  const effectiveTemporalBehavior = temporalBehavior ?? temporalBehaviorFromPattern(normalizedTemporalPattern, normalizedSpatialEvolution);
  const sourceTime = demoTime ?? time;
  const sampleTime = normalizedTimeMode === 'dynamic' ? Number(sourceTime) || 0 : 0;
  const likelihoodTime = normalizedEventLikelihoodDynamics === 'dynamic' ? Number(sourceTime) || 0 : 0;
  const clusterCount = clampInt(hotspotCount ?? legacyClusterCount, 1, 6, spatialDefaults.clusterCount);
  const likelihoodField = createEventLikelihoodField({
    eventLikelihood: normalizedEventLikelihood,
    seed,
    width,
    height,
    count: clusterCount,
    dynamics: normalizedEventLikelihoodDynamics,
    temporalPattern: normalizedEventLikelihoodTemporalPattern,
    spatialEvolution: normalizedEventLikelihoodSpatialEvolution,
    dynamicComplexity: normalizedDynamicComplexity,
    time: likelihoodTime
  });
  const rng = createSeededRng(`${seed}:${normalizedEventLikelihood}:${normalizedPureSpatialPattern}:${width}x${height}:${clusterCount}:${normalizedClusterSize}:${noise}`);
  const spatialBaseField = buildDistribution({
    distribution: spatialDefaults.distribution,
    rng,
    seed,
    eventLikelihood: normalizedEventLikelihood,
    eventLikelihoodDynamics: normalizedEventLikelihoodDynamics,
    eventLikelihoodTemporalPattern: normalizedEventLikelihoodTemporalPattern,
    eventLikelihoodSpatialEvolution: normalizedEventLikelihoodSpatialEvolution,
    likelihoodField,
    width,
    height,
    hotspotCount: clusterCount,
    clusterSize: normalizedClusterSize,
    noise: clamp01(noise),
    timeMode: normalizedTimeMode,
    spatialPattern: spatialDefaults.sampleSpatialPattern,
    temporalBehavior: effectiveTemporalBehavior,
    forecastView: 'truth',
    time: sampleTime,
    behaviorPresetId
  });
  const baseField = applyValueDistribution(spatialBaseField, {
    valueDistribution: normalizedValueDistribution,
    seed,
    spatialPattern: normalizedPureSpatialPattern
  });
  const behavior = sampleBehaviorMetadata({
    eventLikelihood: normalizedEventLikelihood,
    temporalPattern: normalizedTemporalPattern,
    spatialEvolution: normalizedSpatialEvolution,
    motionScope: normalizedMotionScope,
    stateModel: normalizedStateModel,
    dynamicComplexity: normalizedDynamicComplexity,
    time: sampleTime
  });
  const evolvedResult = applyEvolutionModel(baseField, {
    seed,
    behaviorPresetId,
    likelihoodField,
    time: sampleTime,
    timeMode: normalizedTimeMode,
    temporalPattern: normalizedTemporalPattern,
    spatialEvolution: normalizedSpatialEvolution,
    dynamicComplexity: normalizedDynamicComplexity,
    motionScope: normalizedMotionScope
  });
  const field = evolvedResult.field;
  const displayResult = applySampleDisplayMode(field, {
    seed,
    time: sampleTime,
    depletionMode: normalizedDepletionMode,
    displayMode: normalizedDisplayMode,
    dynamicComplexity: normalizedDynamicComplexity,
    likelihoodField
  });
  const contrastResult = enhanceSampleValueContrast(displayResult.field, {
    behaviorPresetId,
    displayMode: normalizedDisplayMode,
    temporalPattern: normalizedTemporalPattern,
    spatialEvolution: normalizedSpatialEvolution,
    spatialPattern: normalizedPureSpatialPattern,
    dynamicComplexity: normalizedDynamicComplexity
  });
  const sampleDisplayField = contrastResult.field;
  const displayedField = normalizedDisplayMode === 'eventLikelihood' ? likelihoodField : sampleDisplayField;
  const stats = summarizeField(displayedField);
  const activityDiagnostics = buildActivityDiagnostics({
    seed,
    time: sampleTime,
    behaviorPresetId,
    eventLikelihoodMode: normalizedEventLikelihood,
    spatialPattern: normalizedPureSpatialPattern,
    temporalPattern: normalizedTemporalPattern,
    spatialEvolution: normalizedSpatialEvolution,
    stateModel: normalizedStateModel,
    samplingEffect: normalizedDepletionMode,
    baseField,
    evolvedField: field,
    displayedField,
    likelihoodField,
    hotspotCount: clusterCount,
    evolutionDiagnostics: evolvedResult.diagnostics,
    displayDiagnostics: {
      ...displayResult.diagnostics,
      ...contrastResult.diagnostics
    }
  });
  return {
    field: displayedField,
    sampleValueField: sampleDisplayField,
    rawBaseField: baseField,
    evolvedField: field,
    width,
    height,
    eventLikelihood: normalizedEventLikelihood,
    eventLikelihoodLabel: roiEventLikelihoodLabel(normalizedEventLikelihood),
    eventLikelihoodDynamics: normalizedEventLikelihoodDynamics,
    eventLikelihoodDynamicsLabel: roiLikelihoodDynamicsLabel(normalizedEventLikelihoodDynamics),
    eventLikelihoodTemporalPattern: normalizedEventLikelihoodTemporalPattern,
    eventLikelihoodTemporalPatternLabel: roiTemporalPatternLabel(normalizedEventLikelihoodTemporalPattern),
    eventLikelihoodSpatialEvolution: normalizedEventLikelihoodSpatialEvolution,
    eventLikelihoodSpatialEvolutionLabel: roiLikelihoodSpatialEvolutionLabel(normalizedEventLikelihoodSpatialEvolution),
    eventLikelihoodField: likelihoodField,
    distribution: spatialDefaults.distribution,
    distributionLabel: roiDistributionLabel(spatialDefaults.distribution),
    valueDistribution: normalizedValueDistribution,
    valueDistributionLabel: roiValueDistributionLabel(normalizedValueDistribution),
    valueDistributionSeeded: normalizedValueDistribution !== 'constantValue',
    timeMode: normalizedTimeMode,
    spatialPattern: spatialDefaults.sampleSpatialPattern,
    pureSpatialPattern: normalizedPureSpatialPattern,
    pureSpatialPatternLabel: roiPureSpatialPatternLabel(normalizedPureSpatialPattern),
    clusterCount,
    clusterSize: normalizedClusterSize,
    temporalBehavior: normalizeRoiDemoTemporalBehavior(effectiveTemporalBehavior),
    temporalPattern: normalizedTemporalPattern,
    temporalPatternLabel: roiTemporalPatternLabel(normalizedTemporalPattern),
    evolutionModel: normalizedEvolutionModel,
    evolutionModelLabel: roiEvolutionModelLabel(normalizedEvolutionModel),
    patternEvolution: normalizedSpatialEvolution,
    patternEvolutionLabel: roiPatternEvolutionLabel(normalizedSpatialEvolution),
    spatialEvolution: normalizedSpatialEvolution,
    spatialEvolutionLabel: roiSpatialEvolutionLabel(normalizedSpatialEvolution),
    motionScope: normalizedMotionScope,
    motionScopeLabel: roiMotionScopeLabel(normalizedMotionScope),
    stateModel: normalizedStateModel,
    stateModelLabel: roiStateModelLabel(normalizedStateModel),
    stateModelDescription: roiStateModelDescription(normalizedStateModel),
    depletionMode: normalizedDepletionMode,
    depletionModeLabel: roiDepletionModeLabel(normalizedDepletionMode),
    displayMode: normalizedDisplayMode,
    displayModeLabel: roiDisplayModeLabel(normalizedDisplayMode),
    dynamicComplexity: normalizedDynamicComplexity,
    priorMode: normalizedStateModel,
    behavior,
    forecastView: 'truth',
    time: sampleTime,
    eventLikelihoodTime: likelihoodTime,
    sampleFieldConfig: sampleFieldConfigForDemo({
      distribution: spatialDefaults.distribution,
      eventLikelihood: normalizedEventLikelihood,
      eventLikelihoodDynamics: normalizedEventLikelihoodDynamics,
      eventLikelihoodTemporalPattern: normalizedEventLikelihoodTemporalPattern,
      eventLikelihoodSpatialEvolution: normalizedEventLikelihoodSpatialEvolution,
      valueDistribution: normalizedValueDistribution,
      timeMode: normalizedTimeMode,
      spatialPattern: spatialDefaults.sampleSpatialPattern,
      temporalBehavior: effectiveTemporalBehavior,
      hotspotCount: clusterCount,
      evolutionModel: normalizedEvolutionModel,
      spatialEvolution: normalizedSpatialEvolution,
      motionScope: normalizedMotionScope,
      dynamicComplexity: normalizedDynamicComplexity,
      stateModel: normalizedStateModel,
      depletionMode: normalizedDepletionMode
    }),
    stats,
    activityDiagnostics,
    highValueCells: findHighValueCells(displayedField, Math.max(0.68, stats.mean + stats.stdDev * 1.35))
  };
}

export function roiDistributionLabel(value) {
  return {
    uniformRandom: 'Uniform Random',
    gaussianHotspots: 'Gaussian Hotspots',
    clusteredHotspots: 'Clustered Hotspots',
    gradientFront: 'Gradient / Front',
    sparseTargets: 'Sparse Targets',
    ridgeCorridor: 'Ridge / Corridor',
    boundaryBand: 'Boundary Band',
    bimodalHotspots: 'Bimodal Hotspots',
    movingHotspot: 'Moving Hotspot',
    burstyBloom: 'Bursty Bloom',
    currentAdvectedPlume: 'Current-Advected Plume',
    nonuniformRandom: 'Nonuniform Random'
  }[value] ?? 'Gaussian Hotspots';
}

export function normalizeRoiDemoSpatialPattern(value = 'multiHotspot') {
  return ROI_DEMO_SPATIAL_PATTERNS.includes(value) ? value : 'multiHotspot';
}

export function normalizeRoiDemoPureSpatialPattern(value = 'clusteredField') {
  if (ROI_DEMO_PURE_SPATIAL_PATTERNS.includes(value)) return value;
  const aliases = {
    uniform: 'constantField',
    uniformField: 'constantField',
    constant: 'constantField',
    constantField: 'constantField',
    noSpatialStructure: 'constantField',
    gradient: 'gradientField',
    singleHotspot: 'clusteredField',
    singleCluster: 'clusteredField',
    multiHotspot: 'clusteredField',
    multipleClusters: 'clusteredField',
    bimodal: 'clusteredField',
    channelCorridor: 'linearBand',
    plume: 'frontBoundary',
    randomTexture: 'seededTexture',
    seededTexture: 'seededTexture',
    texturedField: 'seededTexture',
    edgeBand: 'boundaryBand',
    boundaryBand: 'boundaryBand',
    gaussianHotspots: 'clusteredField',
    clusteredHotspots: 'clusteredField',
    sparseTargets: 'sparseTargets',
    ridgeCorridor: 'linearBand',
    bimodalHotspots: 'clusteredField',
    movingHotspot: 'clusteredField',
    burstyBloom: 'clusteredField',
    nonuniformRandom: 'seededTexture'
  };
  return aliases[value] ?? 'clusteredField';
}

export function normalizeRoiDemoValueDistribution(value = 'constantValue') {
  const aliases = {
    constant: 'constantValue',
    constantValue: 'constantValue',
    uniform: 'uniformRandom',
    uniformRandom: 'uniformRandom',
    randomUniform: 'uniformRandom',
    gaussian: 'gaussianNormal',
    gaussianNormal: 'gaussianNormal',
    normal: 'gaussianNormal'
  };
  return ROI_DEMO_VALUE_DISTRIBUTIONS.includes(aliases[value] ?? value) ? (aliases[value] ?? value) : 'constantValue';
}

export function normalizeRoiDemoTemporalBehavior(value = 'static') {
  return ROI_DEMO_TEMPORAL_BEHAVIORS.includes(value) ? value : 'static';
}

export function normalizeRoiDemoTemporalPattern(value = 'bursty') {
  return ROI_DEMO_TEMPORAL_PATTERNS.includes(value) ? value : 'bursty';
}

export function normalizeRoiDemoEvolutionModel(value = 'stationary') {
  return normalizeRoiDemoSpatialEvolution(value);
}

export function normalizeRoiDemoSpatialEvolution(value = 'stationary') {
  const aliases = {
    timeIndexed: 'stationary',
    fixedInPlace: 'stationary',
    fixed: 'stationary',
    growFade: 'stationary',
    growthDecay: 'stationary',
    stationary: 'stationary',
    moving: 'continuousDrift',
    movingFeature: 'continuousDrift',
    movingHotspot: 'continuousDrift',
    currentAdvectedPlume: 'continuousDrift',
    continuous: 'continuousDrift',
    drift: 'continuousDrift',
    continuousDrift: 'continuousDrift',
    jump: 'discreteJump',
    discrete: 'discreteJump',
    splitMerge: 'discreteJump',
    discreteJump: 'discreteJump',
    randomWalk: 'randomWalk',
    walk: 'randomWalk',
    diffuse: 'neighborPropagation',
    diffusion: 'neighborPropagation',
    clusteredHotspots: 'neighborPropagation',
    neighborActivation: 'neighborPropagation',
    propagation: 'neighborPropagation',
    neighborPropagation: 'neighborPropagation',
    revisitRecovery: 'stationary',
    historyAware: 'stationary'
  };
  const normalized = aliases[value] ?? value;
  return ROI_DEMO_SPATIAL_EVOLUTIONS.includes(normalized) ? normalized : 'stationary';
}

export function normalizeRoiDemoPatternEvolution(value = 'stationary') {
  return normalizeRoiDemoSpatialEvolution(value);
}

export function normalizeRoiDemoMotionScope(value = 'perFeature') {
  const aliases = {
    perFeature: 'perFeature',
    feature: 'perFeature',
    regional: 'perFeature',
    perRegion: 'perFeature',
    local: 'localNeighborhood',
    localNeighborhood: 'localNeighborhood',
    neighborhood: 'localNeighborhood',
    neighbor: 'localNeighborhood',
    global: 'global',
    domain: 'global',
    globalShift: 'global'
  };
  const normalized = aliases[value] ?? value;
  return ROI_DEMO_MOTION_SCOPES.includes(normalized) ? normalized : 'perFeature';
}

export function normalizeRoiDemoStateModel(value = 'stateEvolving') {
  const aliases = {
    timeIndexed: 'timeIndexed',
    memoryless: 'timeIndexed',
    frequencyBased: 'frequencyBased',
    frequency: 'frequencyBased',
    spectral: 'frequencyBased',
    stateEvolving: 'stateEvolving',
    stateful: 'stateEvolving',
    markovian: 'stateEvolving',
    historyAware: 'historyAware',
    historyDependent: 'historyAware',
    nonMarkovian: 'historyAware'
  };
  return ROI_DEMO_STATE_MODELS.includes(aliases[value] ?? value) ? (aliases[value] ?? value) : 'stateEvolving';
}

export function normalizeRoiDemoDepletionMode(value = 'soft') {
  const aliases = {
    none: 'none',
    hard: 'hard',
    hardDepletion: 'hard',
    soft: 'soft',
    softDepletion: 'soft',
    neighborhood: 'neighborhood',
    neighborhoodDepletion: 'neighborhood',
    freshness: 'freshnessAge',
    freshnessAge: 'freshnessAge',
    ageOfInformation: 'freshnessAge',
    revisit: 'revisitRecovery',
    recovery: 'revisitRecovery',
    revisitRecovery: 'revisitRecovery'
  };
  return ROI_DEMO_DEPLETION_MODES.includes(aliases[value] ?? value) ? (aliases[value] ?? value) : 'soft';
}

export function normalizeRoiDemoDisplayMode(value = 'sampleValue') {
  const aliases = {
    sample: 'sampleValue',
    value: 'sampleValue',
    sampleValue: 'sampleValue',
    eventLikelihood: 'eventLikelihood',
    likelihood: 'eventLikelihood',
    likelihoodField: 'eventLikelihood',
    sampleValueLikelihoodOverlay: 'sampleValueLikelihoodOverlay',
    likelihoodOverlay: 'sampleValueLikelihoodOverlay',
    sampleWithLikelihoodOverlay: 'sampleValueLikelihoodOverlay',
    depleted: 'depletedValue',
    depletedValue: 'depletedValue',
    freshness: 'freshnessRevisitValue',
    freshnessRevisitValue: 'freshnessRevisitValue',
    revisitValue: 'freshnessRevisitValue',
    base: 'rawBaseValue',
    raw: 'rawBaseValue',
    rawBaseValue: 'rawBaseValue'
  };
  return ROI_DEMO_DISPLAY_MODES.includes(aliases[value] ?? value) ? (aliases[value] ?? value) : 'sampleValue';
}

export function normalizeRoiDemoDynamicComplexity(value = 'medium') {
  return ROI_DEMO_DYNAMIC_COMPLEXITY.includes(value) ? value : 'medium';
}

export function normalizeRoiDemoClusterSize(value = 'medium') {
  return ROI_DEMO_CLUSTER_SIZES.includes(value) ? value : 'medium';
}

export function roiClusterSizeLabel(value) {
  return {
    tight: 'Tight',
    medium: 'Medium',
    wide: 'Wide'
  }[value] ?? 'Medium';
}

export function roiTemporalPatternLabel(value) {
  return {
    static: 'Static',
    sustained: 'Sustained',
    periodic: 'Periodic / Cyclic',
    bursty: 'Bursty',
    rapidPulse: 'Rapid Pulse',
    pulseThenSilence: 'Pulse Then Silence',
    longTailDecay: 'Long-Tail Decay',
    gaussianEnvelope: 'Gaussian Time Envelope',
    randomPulses: 'Random Pulses',
    intermittent: 'Intermittent Activity',
    wavyMultiFrequency: 'Wavy / Multi-Frequency',
    seasonal: 'Seasonal / Long Cycle'
  }[value] ?? 'Bursty';
}

export function roiEvolutionModelLabel(value) {
  return roiSpatialEvolutionLabel(value);
}

export function roiSpatialEvolutionLabel(value) {
  return {
    stationary: 'Stationary',
    fixed: 'Stationary',
    growthDecay: 'Stationary',
    continuousDrift: 'Continuous Drift',
    movingFeature: 'Continuous Drift',
    discreteJump: 'Discrete Jump',
    splitMerge: 'Discrete Jump',
    randomWalk: 'Random Walk',
    neighborPropagation: 'Neighbor Propagation',
    diffusion: 'Neighbor Propagation',
    neighborActivation: 'Neighbor Propagation'
  }[value] ?? 'Stationary';
}

export function roiMotionScopeLabel(value) {
  return {
    perFeature: 'Per Feature',
    localNeighborhood: 'Local / Neighborhood',
    global: 'Global'
  }[value] ?? 'Per Feature';
}

export function roiPureSpatialPatternLabel(value) {
  return {
    constantField: 'Constant Field',
    uniformField: 'Constant Field',
    gradientField: 'Gradient / Trend',
    clusteredField: 'Clustered Field',
    singleCluster: 'Clustered Field',
    multipleClusters: 'Clustered Field',
    patchyField: 'Patchy / Correlated Field',
    sparseTargets: 'Sparse Targets',
    linearBand: 'Linear Band',
    frontBoundary: 'Front / Boundary',
    boundaryBand: 'Boundary Band',
    edgeBand: 'Boundary Band',
    coastalBand: 'Boundary Band',
    monitoringStations: 'Monitoring Stations',
    seededTexture: 'Seeded Texture',
    randomTexture: 'Seeded Texture',
    texturedField: 'Seeded Texture'
  }[value] ?? 'Clustered Field';
}

export function roiValueDistributionLabel(value) {
  return {
    constantValue: 'Constant Value',
    uniformRandom: 'Uniform Random',
    gaussianNormal: 'Gaussian / Normal'
  }[value] ?? 'Constant Value';
}

export function roiEventLikelihoodLabel(value) {
  return {
    uniformLikelihood: 'Uniform Likelihood',
    gaussianLikelihood: 'Gaussian Likelihood',
    multiModalLikelihood: 'Multi-Modal Likelihood',
    gradientLikelihood: 'Gradient Likelihood',
    patchyLikelihood: 'Patchy Likelihood',
    seededTextureLikelihood: 'Seeded Texture Likelihood',
    sparseCandidateSites: 'Sparse Candidate Sites'
  }[value] ?? 'Uniform Likelihood';
}

export function roiLikelihoodDynamicsLabel(value) {
  return {
    static: 'Static',
    dynamic: 'Dynamic'
  }[value] ?? 'Static';
}

export function roiLikelihoodSpatialEvolutionLabel(value) {
  return {
    stationary: 'Stationary',
    continuousDrift: 'Continuous Movement',
    discreteJump: 'Discrete Jump',
    randomWalk: 'Random Walk',
    neighborPropagation: 'Neighbor Propagation'
  }[value] ?? 'Stationary';
}

export function roiSpatialPatternHelp(value) {
  const key = normalizeRoiDemoPureSpatialPattern(value);
  return {
    constantField: {
      tooltip: 'No spatial structure; every cell starts from the same base value before the value distribution is applied.',
      meaning: 'No spatial geometry is introduced by the spatial pattern.',
      behavior: 'With Constant Value this is a flat heatmap; with Uniform Random or Gaussian / Normal, values vary without clusters, bands, fronts, or gradients.',
      parameters: ['Value Distribution', 'Seed'],
      pairings: ['Static + No Depletion', 'Sustained + Soft Depletion', 'Freshness / Age of Information'],
      strategy: 'Teaches coverage efficiency and depletion/freshness effects.',
      not: 'Not a uniform random distribution by itself; random value likelihood is controlled by Value Distribution.'
    },
    gradientField: {
      tooltip: 'A smooth value trend across space, such as low-to-high from one side of the map to another.',
      meaning: 'Value changes smoothly across the map.',
      behavior: 'One side or corner has higher value; the field is directional and smooth rather than clustered.',
      parameters: ['Gradient Direction', 'Gradient Strength', 'Smoothness', 'Noise Level'],
      pairings: ['Static', 'Periodic', 'Continuous Drift'],
      strategy: 'Teaches travel-vs-reward tradeoffs along a value trend.',
      not: 'Not isolated targets or a current front.'
    },
    clusteredField: {
      tooltip: 'One or more coherent value clusters. Use Cluster Count to control how many.',
      meaning: 'Value appears in one or more coherent blobs.',
      behavior: 'Cluster Count controls how many modes are generated; Cluster Size controls spread.',
      parameters: ['Cluster Count', 'Cluster Size', 'Cluster Separation', 'Cluster Intensity Variation', 'Edge Softness'],
      pairings: ['Bursty + Stationary', 'Bursty + Discrete Jump', 'Periodic + Continuous Drift'],
      strategy: 'Teaches target selection and multi-agent assignment.',
      not: 'Not a flow-driven plume or current-advected feature.'
    },
    patchyField: {
      tooltip: 'Irregular patches with spatial correlation; nearby cells tend to have similar values.',
      meaning: 'Value is irregular but neighboring cells tend to be related.',
      behavior: 'Spatially coherent patches, not clean Gaussian clusters and not independent per-cell noise.',
      parameters: ['Correlation Length', 'Patch Size', 'Smoothness', 'Contrast', 'Noise Level'],
      pairings: ['Neighbor Propagation', 'Intermittent', 'State-Evolving'],
      strategy: 'Teaches local exploration: a high-value cell may imply nearby value.',
      not: 'Not arbitrary frame noise.'
    },
    sparseTargets: {
      tooltip: 'A few isolated valuable targets in an otherwise low-value field.',
      meaning: 'Value exists at isolated target cells or small target regions.',
      behavior: 'Most cells are low, with a small number of discrete high-value locations.',
      parameters: ['Target Count', 'Target Radius', 'Target Value', 'Target Spread'],
      pairings: ['Static', 'Intermittent', 'Bursty', 'Revisit Recovery'],
      strategy: 'Teaches routing between discrete sampling objectives.',
      not: 'Not clustered neighborhoods or Gold Star targets.'
    },
    linearBand: {
      tooltip: 'A long narrow value band, useful for transect-like or ridge-like sampling patterns.',
      meaning: 'A long narrow strip of elevated sample value.',
      behavior: 'Value is elevated along a straight or gently curved strip.',
      parameters: ['Band Orientation', 'Band Width', 'Band Position', 'Band Softness', 'Band Contrast'],
      pairings: ['Static', 'Periodic', 'Continuous Drift'],
      strategy: 'Teaches following, crossing, or sampling along elongated value regions.',
      not: 'Not channel transport or current alignment.'
    },
    frontBoundary: {
      tooltip: 'A spatial transition between low and high value; useful for edge or boundary sampling.',
      meaning: 'A sharp or soft transition between low-value and high-value regions.',
      behavior: 'Value differs across a boundary; the transition can be sharp or soft.',
      parameters: ['Front Orientation', 'Front Position', 'Front Sharpness', 'Front Contrast', 'Boundary Value Mode'],
      pairings: ['Static', 'Periodic', 'Continuous Drift', 'Discrete Jump'],
      strategy: 'Teaches boundary-following, boundary-crossing, and edge-sampling strategies.',
      not: 'Not a current front or coastal front.'
    },
    boundaryBand: {
      tooltip: 'A value band near a boundary or edge of the domain.',
      meaning: 'Value is concentrated near a generic boundary or domain edge.',
      behavior: 'Value is concentrated along one or more domain edges and decays inward.',
      parameters: ['Boundary Side', 'Band Width', 'Band Softness', 'Band Intensity'],
      pairings: ['Sustained', 'Periodic', 'Bursty'],
      strategy: 'Teaches boundary coverage and edge-following.',
      not: 'Not coastline, current, or terrain behavior.'
    },
    monitoringStations: {
      tooltip: 'Fixed locations that become valuable to visit or revisit over time.',
      meaning: 'Fixed stations are valuable to visit or revisit over time.',
      behavior: 'Station-like points remain fixed and work well with freshness or recovery effects.',
      parameters: ['Station Count', 'Station Radius', 'Station Value', 'Revisit Interval', 'Recovery Rate'],
      pairings: ['Revisit Recovery', 'History-Aware', 'Periodic', 'Freshness / Age of Information'],
      strategy: 'Teaches persistent monitoring and revisit timing.',
      not: 'Not one-time sparse targets when recovery is enabled.'
    },
    seededTexture: {
      tooltip: 'A deterministic textured value field; irregular but replayable.',
      meaning: 'A deterministic irregular texture field.',
      behavior: 'Irregular spatial values are deterministic from seed, not random every frame.',
      parameters: ['Texture Scale', 'Smoothness', 'Contrast', 'Seed', 'Noise Level'],
      pairings: ['Static', 'Intermittent', 'State-Evolving', 'Neighbor Propagation'],
      strategy: 'Teaches planning over irregular value landscapes without obvious clusters or fronts.',
      not: 'Not arbitrary frame noise or forecast uncertainty.'
    }
  }[key] ?? {
    tooltip: 'Generic sample-value spatial pattern.',
    meaning: 'Generic sample-value spatial pattern.',
    behavior: 'The heatmap shows deterministic sample value over space.',
    parameters: ['Seed', 'Noise Level'],
    pairings: ['Static'],
    strategy: 'Teaches spatial sample-value planning.',
    not: 'Not flow, terrain, or uncertainty behavior.'
  };
}

export function roiPatternEvolutionLabel(value) {
  return roiSpatialEvolutionLabel(value);
}

export function roiDepletionModeLabel(value) {
  return {
    none: 'None',
    hard: 'Hard Depletion',
    soft: 'Soft Depletion',
    neighborhood: 'Neighborhood Depletion',
    freshnessAge: 'Freshness / Age of Information',
    revisitRecovery: 'Knowledge Decay / Revisit Recovery'
  }[value] ?? 'Soft Depletion';
}

export function roiDisplayModeLabel(value) {
  return {
    sampleValue: 'Sample Value',
    eventLikelihood: 'Event Likelihood',
    sampleValueLikelihoodOverlay: 'Sample Value + Likelihood Overlay',
    depletedValue: 'Depleted Value',
    freshnessRevisitValue: 'Freshness / Revisit Value',
    rawBaseValue: 'Raw Base Value'
  }[value] ?? 'Sample Value';
}

export function roiStateModelForEvolutionModel(value) {
  const normalized = normalizeRoiDemoEvolutionModel(value);
  if (normalized === 'stationary' || normalized === 'continuousDrift' || normalized === 'discreteJump') return 'timeIndexed';
  return 'stateEvolving';
}

export function roiStateModelLabel(value) {
  return {
    timeIndexed: 'Time-Indexed',
    frequencyBased: 'Frequency-Based',
    stateEvolving: 'State-Evolving',
    historyAware: 'History-Aware'
  }[value] ?? 'State-Evolving';
}

export function roiStateModelDescription(value) {
  return {
    timeIndexed: 'Computed directly from position and time.',
    frequencyBased: 'Follows repeated cycles or frequency structure.',
    stateEvolving: 'Next state depends on the current field state.',
    historyAware: 'Depends on longer sampling or observation history.'
  }[value] ?? 'Next state depends on the current field state.';
}

function pureSpatialPatternDefaults(pattern) {
  return {
    constantField: { distribution: 'constantField', sampleSpatialPattern: 'uniform', clusterCount: 1 },
    uniformField: { distribution: 'constantField', sampleSpatialPattern: 'uniform', clusterCount: 1 },
    gradientField: { distribution: 'gradientFront', sampleSpatialPattern: 'gradient', clusterCount: 1 },
    clusteredField: { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 3 },
    singleCluster: { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 1 },
    multipleClusters: { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 3 },
    patchyField: { distribution: 'clusteredHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 4 },
    sparseTargets: { distribution: 'sparseTargets', sampleSpatialPattern: 'multiHotspot', clusterCount: 5 },
    frontBoundary: { distribution: 'gradientFront', sampleSpatialPattern: 'gradient', clusterCount: 2 },
    linearBand: { distribution: 'ridgeCorridor', sampleSpatialPattern: 'coastalBand', clusterCount: 2 },
    boundaryBand: { distribution: 'boundaryBand', sampleSpatialPattern: 'coastalBand', clusterCount: 2 },
    edgeBand: { distribution: 'boundaryBand', sampleSpatialPattern: 'coastalBand', clusterCount: 2 },
    coastalBand: { distribution: 'boundaryBand', sampleSpatialPattern: 'coastalBand', clusterCount: 2 },
    monitoringStations: { distribution: 'sparseTargets', sampleSpatialPattern: 'multiHotspot', clusterCount: 6 },
    seededTexture: { distribution: 'nonuniformRandom', sampleSpatialPattern: 'randomTexture', clusterCount: 4 },
    randomTexture: { distribution: 'nonuniformRandom', sampleSpatialPattern: 'randomTexture', clusterCount: 4 }
  }[pattern] ?? { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 3 };
}

function defaultMotionScopeForPattern(spatialPattern, spatialEvolution) {
  if (spatialEvolution === 'stationary') return 'perFeature';
  if (spatialEvolution === 'neighborPropagation') return 'localNeighborhood';
  if (spatialPattern === 'patchyField' || spatialPattern === 'seededTexture') return 'localNeighborhood';
  return 'perFeature';
}

function pureSpatialPatternFromDistribution(distribution) {
  return {
    uniformRandom: 'constantField',
    gaussianHotspots: 'clusteredField',
    clusteredHotspots: 'patchyField',
    gradientFront: 'gradientField',
    sparseTargets: 'sparseTargets',
    ridgeCorridor: 'linearBand',
    boundaryBand: 'boundaryBand',
    bimodalHotspots: 'clusteredField',
    movingHotspot: 'clusteredField',
    burstyBloom: 'clusteredField',
    currentAdvectedPlume: 'frontBoundary',
    nonuniformRandom: 'seededTexture'
  }[distribution] ?? 'clusteredField';
}

function legacyClusterCountFromPattern(value) {
  return {
    single: 1,
    singleHotspot: 1,
    singleCluster: 1,
    movingHotspot: 1,
    bimodal: 2,
    bimodalHotspots: 2,
    multiHotspot: 3,
    multipleClusters: 3,
    gaussianHotspots: 3,
    burstyBloom: 3
  }[value] ?? null;
}

function displayModeFromLegacyForecastView(displayMode, forecastView) {
  if (displayMode) return displayMode;
  if (forecastView === 'depleted') return 'depletedValue';
  return 'sampleValue';
}

export function roiDemoDistributionDefaults(distribution = 'gaussianHotspots') {
  const defaults = distributionToSampleConfig(normalizeRoiDemoDistribution(distribution));
  return {
    spatialPattern: defaults.spatialPattern,
    temporalBehavior: defaults.temporalBehavior,
    temporalPattern: temporalPatternFromBehavior(defaults.temporalBehavior),
    evolutionModel: spatialEvolutionFromDistribution(distribution),
    spatialEvolution: spatialEvolutionFromDistribution(distribution),
    distribution: defaults.distribution,
    eventLikelihood: eventLikelihoodFromLegacy(defaults.spatialPattern, distribution),
    valueDistribution: valueDistributionFromLegacy(distribution)
  };
}

export { sampleSpatialPatternLabel, sampleTemporalBehaviorLabel };

function buildDistribution({ distribution, rng, seed, eventLikelihood, likelihoodField, width, height, hotspotCount, clusterSize, noise, timeMode, spatialPattern, temporalBehavior, forecastView, time, behaviorPresetId }) {
  if (distribution === 'constantField') return createUniformField(width, height, 0.42);
  if (distribution === 'uniformRandom' && spatialPattern === 'uniform') return createUniformField(width, height, 0.42);
  if (distribution === 'uniformRandom') return withNoise(createUniformRandom(width, height, rng), rng, noise * 0.35);
  if (behaviorPresetId === 'recurringHotspots') {
    return createRecurringHotspotsField({
      width,
      height,
      seed,
      time,
      hotspotCount,
      clusterSize,
      likelihoodField,
      eventLikelihood,
      noise,
      rng
    });
  }
  const likelihoodHotspots = createLikelihoodHotspots(width, height, hotspotCount, 'clustered', rng, likelihoodField, seed, eventLikelihood);
  if (distribution === 'clusteredHotspots') {
    return withNoise(generateROI(width, height, time, {
      roiPattern: 'clustered',
      temporalHotspots: timeMode === 'dynamic',
      hotspots: scaleHotspotRadii(likelihoodHotspots, clusterSize)
    }), rng, noise);
  }
  if (distribution === 'gradientFront') return createGradientFront({ width, height, rng, noise, time });
  if (distribution === 'sparseTargets') return createSparseTargets({ width, height, rng, hotspotCount, noise, time, likelihoodField, seed, eventLikelihood });
  if (distribution === 'ridgeCorridor') return createRidgeCorridor({ width, height, rng, noise, time });
  if (distribution === 'boundaryBand') return createBoundaryBand({ width, height, rng, noise, time });
  const sampleFieldConfig = sampleFieldConfigForDemo({ distribution, eventLikelihood, timeMode, spatialPattern, temporalBehavior, hotspotCount });
  const generatedHotspots = createLikelihoodHotspots(width, height, hotspotCount, legacyPattern(sampleFieldConfig), createSeededRng(`${seed}:sample-hotspots:${eventLikelihood}:${hotspotCount}`), likelihoodField, seed, eventLikelihood);
  const generated = generateROI(width, height, time, {
    seed,
    sampleFieldSeed: `${seed}:${distribution}:sample-field`,
    sampleFieldConfig,
    temporalHotspots: timeMode === 'dynamic',
    currentFrame: makeDemoCurrentFrame(width, height, time),
    hotspots: scaleHotspotRadii(generatedHotspots, clusterSize)
  });
  const viewAdjusted = applyForecastView(generated, forecastView, seed, time);
  return withNoise(viewAdjusted, rng, noise);
}

function sampleFieldConfigForDemo({ distribution, eventLikelihood, timeMode, spatialPattern, temporalBehavior, hotspotCount, evolutionModel, spatialEvolution, motionScope, dynamicComplexity, stateModel, depletionMode }) {
  const defaults = distributionToSampleConfig(distribution);
  const selectedTemporal = timeMode === 'dynamic'
    ? temporalBehavior ?? defaults.temporalBehavior
    : 'static';
  const complexity = normalizeRoiDemoDynamicComplexity(dynamicComplexity);
  return normalizeSampleFieldConfig({
    ...defaults,
    spatialPattern: spatialPattern ?? defaults.spatialPattern,
    temporalBehavior: selectedTemporal,
    eventLikelihood: normalizeRoiDemoEventLikelihood(eventLikelihood),
    stateModel,
    motionScope: normalizeRoiDemoMotionScope(motionScope),
    mode: timeMode === 'dynamic' ? 'dynamic' : 'static',
    hotspotCount,
    spatialCorrelation: { enabled: true, radiusCells: 3, anisotropy: 'none' },
    neighborInfluence: {
      enabled: ['neighborPropagation', 'randomWalk'].includes(spatialEvolution ?? evolutionModel) || selectedTemporal === 'diffusive' || selectedTemporal === 'markovNeighbor',
      diffusionRate: complexityValue(complexity, 0.08, 0.14, 0.22),
      growthRate: complexityValue(complexity, 0.025, 0.04, 0.065),
      decayRate: complexityValue(complexity, 0.02, 0.03, 0.045)
    },
    currentCoupling: { enabled: false, advectionStrength: 0 },
    depletion: {
      mode: depletionMode === 'none' ? 'none' : depletionMode === 'hard' ? 'hard' : 'soft',
      radiusCells: depletionMode === 'neighborhood' ? 2 : 1,
      recoveryRate: depletionMode === 'revisitRecovery' ? 0.18 : 0
    }
  }, { roiHotspots: hotspotCount });
}

function distributionToSampleConfig(distribution) {
  return {
    uniformRandom: { spatialPattern: 'randomTexture', temporalBehavior: 'uniformRandom', distribution: 'uniform' },
    gaussianHotspots: { spatialPattern: 'multiHotspot', temporalBehavior: 'periodic', distribution: 'multimodal' },
    clusteredHotspots: { spatialPattern: 'multiHotspot', temporalBehavior: 'moving', distribution: 'clustered' },
    gradientFront: { spatialPattern: 'gradient', temporalBehavior: 'periodic', distribution: 'uniform' },
    sparseTargets: { spatialPattern: 'multiHotspot', temporalBehavior: 'bursty', distribution: 'multimodal' },
    ridgeCorridor: { spatialPattern: 'channelCorridor', temporalBehavior: 'periodic', distribution: 'gaussian' },
    boundaryBand: { spatialPattern: 'coastalBand', temporalBehavior: 'periodic', distribution: 'gaussian' },
    bimodalHotspots: { spatialPattern: 'bimodal', temporalBehavior: 'periodic', distribution: 'bimodal' },
    movingHotspot: { spatialPattern: 'singleHotspot', temporalBehavior: 'moving', distribution: 'gaussian' },
    burstyBloom: { spatialPattern: 'multiHotspot', temporalBehavior: 'bursty', distribution: 'multimodal' },
    currentAdvectedPlume: { spatialPattern: 'plume', temporalBehavior: 'currentAdvected', distribution: 'heavyTail' },
    nonuniformRandom: { spatialPattern: 'randomTexture', temporalBehavior: 'nonuniformRandom', distribution: 'heavyTail' }
  }[distribution] ?? { spatialPattern: 'multiHotspot', temporalBehavior: 'periodic', distribution: 'multimodal' };
}

function temporalPatternFromBehavior(behavior) {
  return {
    static: 'static',
    periodic: 'periodic',
    bursty: 'bursty',
    moving: 'sustained',
    diffusive: 'sustained',
    currentAdvected: 'sustained',
    uniformRandom: 'randomPulses',
    nonuniformRandom: 'randomPulses',
    markovNeighbor: 'intermittent'
  }[behavior] ?? 'bursty';
}

function temporalBehaviorFromPattern(pattern, spatialEvolution) {
  if (pattern === 'static') return 'static';
  if (pattern === 'periodic' || pattern === 'seasonal' || pattern === 'rapidPulse' || pattern === 'gaussianEnvelope' || pattern === 'wavyMultiFrequency') return 'periodic';
  if (pattern === 'randomPulses') return 'nonuniformRandom';
  if (pattern === 'intermittent') return 'markovNeighbor';
  if (spatialEvolution === 'neighborPropagation') return 'markovNeighbor';
  return pattern === 'bursty' || pattern === 'pulseThenSilence' || pattern === 'longTailDecay' ? 'bursty' : 'periodic';
}

function spatialEvolutionFromDistribution(distribution) {
  return {
    uniformRandom: 'stationary',
    gaussianHotspots: 'stationary',
    clusteredHotspots: 'neighborPropagation',
    gradientFront: 'stationary',
    sparseTargets: 'stationary',
    ridgeCorridor: 'stationary',
    bimodalHotspots: 'stationary',
    movingHotspot: 'continuousDrift',
    burstyBloom: 'stationary',
    currentAdvectedPlume: 'continuousDrift',
    nonuniformRandom: 'stationary'
  }[distribution] ?? 'stationary';
}

function createRecurringHotspotsField({ width, height, seed, time, hotspotCount, clusterSize, likelihoodField, eventLikelihood, noise, rng }) {
  const count = clampInt(hotspotCount, 3, 5, 4);
  const centers = recurringHotspotModeCenters({ seed, width, height, count, eventLikelihood });
  const radiusScale = {
    tight: 1.55,
    medium: 2.15,
    wide: 2.75
  }[normalizeRoiDemoClusterSize(clusterSize)] ?? 2.15;
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const value = centers.reduce((sum, center, index) => {
      const phase = seededUnitLike(`${seed}:recurring-hotspot-phase:${index}`) * Math.PI * 2;
      const cycle = 22 + seededUnitLike(`${seed}:recurring-hotspot-cycle:${index}`) * 8;
      const localTime = positiveModulo(time + phase / Math.PI * cycle * 0.5, cycle);
      const primary = Math.exp(-((localTime - cycle * 0.28) ** 2) / (2 * (cycle * 0.13) ** 2));
      const secondary = Math.exp(-((localTime - cycle * 0.72) ** 2) / (2 * (cycle * 0.09) ** 2)) * 0.42;
      const envelope = 0.1 + Math.max(primary, secondary);
      const jitterX = Math.sin(time * (0.035 + index * 0.006) + phase) * 0.018;
      const jitterY = Math.cos(time * (0.031 + index * 0.005) + phase * 0.7) * 0.014;
      const cx = clampRange(center.x + jitterX, 0.05, 0.95);
      const cy = clampRange(center.y + jitterY, 0.05, 0.95);
      const sigmaX = radiusScale / Math.max(1, width - 1);
      const sigmaY = radiusScale / Math.max(1, height - 1);
      const d2 = ((nx - cx) ** 2) / (2 * sigmaX ** 2) + ((ny - cy) ** 2) / (2 * sigmaY ** 2);
      const amplitude = (0.68 + center.strength * 0.32) * (0.86 + seededUnitLike(`${seed}:recurring-hotspot-amp:${index}`) * 0.24);
      return sum + amplitude * envelope * Math.exp(-d2);
    }, 0);
    const likelihood = likelihoodAtCell(likelihoodField, x, y);
    const background = 0.018 + likelihood * 0.028;
    return round3(clamp01(background + value + (rng() - 0.5) * noise * 0.16));
  }));
}

function recurringHotspotModeCenters({ seed, width, height, count, eventLikelihood }) {
  const normalizedEventLikelihood = normalizeRoiDemoEventLikelihood(eventLikelihood);
  const rng = createSeededRng(`${seed}:event-likelihood:${normalizedEventLikelihood}:${width}x${height}:${count}`);
  return createSeparatedLikelihoodCenters({
    seed,
    width,
    height,
    count,
    kind: normalizedEventLikelihood === 'multiModalLikelihood' ? 'multiModalLikelihood' : 'patchyLikelihood',
    rng
  });
}

function sampleBehaviorMetadata({ eventLikelihood, temporalPattern, spatialEvolution, motionScope, stateModel: selectedStateModel, dynamicComplexity, time }) {
  const stateModel = normalizeRoiDemoStateModel(selectedStateModel ?? roiStateModelForEvolutionModel(spatialEvolution));
  const normalizedMotionScope = normalizeRoiDemoMotionScope(motionScope);
  const normalizedEventLikelihood = normalizeRoiDemoEventLikelihood(eventLikelihood);
  const cycle = temporalPattern === 'seasonal' ? 72 : temporalPattern === 'intermittent' ? 18 : 24;
  const phase = positiveModulo(time, cycle) / cycle;
  return {
    eventLikelihood: normalizedEventLikelihood,
    eventLikelihoodLabel: roiEventLikelihoodLabel(normalizedEventLikelihood),
    temporalPattern,
    evolutionModel: spatialEvolution,
    spatialEvolution,
    spatialEvolutionLabel: roiSpatialEvolutionLabel(spatialEvolution),
    motionScope: normalizedMotionScope,
    motionScopeLabel: roiMotionScopeLabel(normalizedMotionScope),
    dynamicComplexity,
    stateModel,
    stateModelLabel: roiStateModelLabel(stateModel),
    stateModelDescription: roiStateModelDescription(stateModel),
    priorMode: stateModel,
    burstPhase: burstPhaseLabel(phase),
    neighborInfluence: spatialEvolution === 'neighborPropagation' ? dynamicComplexity : 'off',
    featureMotion: featureMotionDescription(spatialEvolution, normalizedMotionScope),
    explanation: `${spatialEvolutionDescription(spatialEvolution, normalizedMotionScope)} Event origins are biased by ${roiEventLikelihoodLabel(normalizedEventLikelihood).toLowerCase()}.`
  };
}

function applyEvolutionModel(field, { seed, behaviorPresetId, likelihoodField, time, timeMode, temporalPattern, spatialEvolution, dynamicComplexity, motionScope }) {
  if (timeMode !== 'dynamic' || behaviorPresetId === 'recurringHotspots') {
    return {
      field: field.map((row) => row.map(round3)),
      diagnostics: activityDiagnosticsForStage(field, field, field, {
        temporalEnvelope: 1,
        injectedActivity: 0,
        regenerationAmount: 0,
        activityLostToDecay: 0,
        activityLostToBoundaries: 0,
        normalized: false
      })
    };
  }
  const complexityScale = complexityValue(dynamicComplexity, 0.65, 1, 1.35);
  const normalizedMotionScope = normalizeRoiDemoMotionScope(motionScope);
  const temporalEnvelope = temporalEnvelopeForPattern(temporalPattern, time, seed);
  const retained = field.map((row) => row.map((value) => clamp01(value * temporalEnvelope)));
  let evolved = retained;
  if (spatialEvolution === 'continuousDrift') {
    const dx = Math.sin(time * 0.16) * 0.2 * complexityScale;
    const dy = Math.cos(time * 0.12) * 0.15 * complexityScale;
    evolved = normalizedMotionScope === 'global'
      ? shiftField(retained, dx, dy)
      : warpField(retained, (x, y) => continuousMotionOffset({ seed, x, y, time, complexityScale, motionScope: normalizedMotionScope }));
  } else if (spatialEvolution === 'discreteJump') {
    const cycle = temporalPattern === 'bursty' ? 24 : temporalPattern === 'intermittent' ? 18 : 16;
    const jumpIndex = Math.floor(Math.max(0, time) / cycle);
    if (normalizedMotionScope === 'global') {
      const bias = likelihoodGradient(likelihoodField, 0.5, 0.5);
      evolved = shiftField(retained, (seededUnitLike(`${seed}:jump-x:${jumpIndex}`) - 0.5) * 0.72 * complexityScale + bias.dx * 0.16 * complexityScale, (seededUnitLike(`${seed}:jump-y:${jumpIndex}`) - 0.5) * 0.54 * complexityScale + bias.dy * 0.12 * complexityScale);
    } else {
      evolved = warpField(retained, (x, y) => discreteJumpOffset({ seed, likelihoodField, x, y, jumpIndex, complexityScale, motionScope: normalizedMotionScope }));
    }
  } else if (spatialEvolution === 'randomWalk') {
    const step = Math.floor(Math.max(0, time) / 3);
    if (normalizedMotionScope === 'global') {
      let dx = 0;
      let dy = 0;
      for (let index = 0; index <= step; index += 1) {
        dx += (seededUnitLike(`${seed}:walk-x:${index}`) - 0.5) * 0.035 * complexityScale;
        dy += (seededUnitLike(`${seed}:walk-y:${index}`) - 0.5) * 0.028 * complexityScale;
      }
      const bias = likelihoodGradient(likelihoodField, 0.5, 0.5);
      evolved = shiftField(retained, clampRange(dx + bias.dx * 0.06 * complexityScale, -0.26, 0.26), clampRange(dy + bias.dy * 0.05 * complexityScale, -0.22, 0.22));
    } else {
      evolved = warpField(retained, (x, y) => randomWalkOffset({ seed, likelihoodField, x, y, step, complexityScale, motionScope: normalizedMotionScope }));
    }
  } else if (spatialEvolution === 'neighborPropagation') {
    const activated = diffuseField(retained, complexityValue(dynamicComplexity, 0.12, 0.2, 0.3));
    evolved = retained.map((row, y) => row.map((value, x) => {
      const likelihood = likelihoodAtCell(likelihoodField, x, y);
      const block = seededUnitLike(`${seed}:activation:${Math.floor(x / 3)}:${Math.floor(y / 3)}:${Math.floor(time / 4)}`);
      const threshold = 0.74 - likelihood * 0.26;
      return clamp01(value * 0.66 + activated[y][x] * (0.18 + likelihood * 0.16) + (block > threshold ? (0.08 + likelihood * 0.12) * complexityScale : 0));
    }));
  }
  const balanced = applyPersistentActivityBalance(evolved, {
    seed,
    likelihoodField,
    time,
    temporalPattern,
    spatialEvolution,
    dynamicComplexity
  });
  return {
    field: balanced.field,
    diagnostics: activityDiagnosticsForStage(field, retained, balanced.field, {
      temporalEnvelope,
      injectedActivity: balanced.injectedActivity,
      regenerationAmount: balanced.regenerationAmount,
      activityLostToDecay: Math.max(0, fieldTotal(field) - fieldTotal(retained)),
      activityLostToBoundaries: Math.max(0, fieldTotal(retained) - fieldTotal(evolved)),
      normalized: false
    })
  };
}

function applySampleDisplayMode(field, { seed, time, depletionMode, displayMode, dynamicComplexity, likelihoodField }) {
  const normalizedDepletion = normalizeRoiDemoDepletionMode(depletionMode);
  const normalizedDisplay = normalizeRoiDemoDisplayMode(displayMode);
  if (normalizedDisplay === 'freshnessRevisitValue' || normalizedDepletion === 'freshnessAge') {
    const freshness = createFreshnessField(field, { seed, time, dynamicComplexity, likelihoodField });
    return {
      field: freshness.field,
      diagnostics: {
        activityLostToDepletion: freshness.activityLostToDepletion,
        regenerationAmount: freshness.regenerationAmount,
        syntheticVisitedCells: freshness.syntheticVisitedCells
      }
    };
  }
  if (normalizedDisplay === 'rawBaseValue' || normalizedDepletion === 'none') {
    return {
      field: field.map((row) => row.map(round3)),
      diagnostics: { activityLostToDepletion: 0, regenerationAmount: 0, syntheticVisitedCells: 0 }
    };
  }
  const complexityScale = complexityValue(dynamicComplexity, 0.85, 1, 1.18);
  let syntheticVisitedCells = 0;
  const depleted = field.map((row, y) => row.map((value, x) => {
    const centerX = 0.3 + 0.22 * Math.sin(time * 0.12);
    const centerY = 0.54 + 0.1 * Math.cos(time * 0.09);
    const nx = field[0]?.length > 1 ? x / (field[0].length - 1) : 0;
    const ny = field.length > 1 ? y / (field.length - 1) : 0;
    const d2 = (nx - centerX) ** 2 + (ny - centerY) ** 2;
    const neighborhood = Math.exp(-d2 / (2 * 0.07 ** 2));
    const visitWindow = Math.floor(Math.max(0, time) / 8);
    const sampled = seededUnitLike(`${seed}:demo-sampled:${Math.floor(x / 3)}:${Math.floor(y / 3)}:${visitWindow}`) > 0.91 ? 1 : 0;
    if (sampled) syntheticVisitedCells += 1;
    const recovery = 0.5 + 0.5 * Math.sin(time * 0.11 + seededUnitLike(`${seed}:recovery-phase:${x}:${y}`) * Math.PI * 2);
    let multiplier = 1;
    if (normalizedDepletion === 'hard') multiplier = sampled ? 0.12 : 1 - neighborhood * 0.35;
    if (normalizedDepletion === 'soft') multiplier = 1 - Math.max(sampled * 0.42, neighborhood * 0.28) * complexityScale;
    if (normalizedDepletion === 'neighborhood') multiplier = 1 - Math.max(sampled * 0.34, neighborhood * 0.62) * complexityScale;
    if (normalizedDepletion === 'revisitRecovery') multiplier = 0.52 + recovery * 0.48;
    return round3(clamp01(value * multiplier));
  }));
  const blended = normalizedDisplay === 'depletedValue'
    ? depleted
    : field.map((row, y) => row.map((value, x) => round3(clamp01(value * 0.88 + depleted[y][x] * 0.12))));
  return {
    field: blended,
    diagnostics: {
      activityLostToDepletion: Math.max(0, fieldTotal(field) - fieldTotal(depleted)),
      regenerationAmount: 0,
      syntheticVisitedCells
    }
  };
}

function enhanceSampleValueContrast(field, { behaviorPresetId, displayMode, temporalPattern, spatialEvolution, spatialPattern, dynamicComplexity }) {
  const normalizedDisplay = normalizeRoiDemoDisplayMode(displayMode);
  if (normalizedDisplay === 'eventLikelihood' || normalizedDisplay === 'rawBaseValue' || behaviorPresetId === 'recurringHotspots') {
    return {
      field: field.map((row) => row.map(round3)),
      diagnostics: { contrastEnhanced: false, contrastStrength: 0, dynamicRangeBefore: fieldRange(field), dynamicRangeAfter: fieldRange(field) }
    };
  }
  const values = field.flat().map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (values.length < 2) {
    return {
      field: field.map((row) => row.map(round3)),
      diagnostics: { contrastEnhanced: false, contrastStrength: 0, dynamicRangeBefore: 0, dynamicRangeAfter: 0 }
    };
  }
  const min = values[0];
  const max = values[values.length - 1];
  const range = max - min;
  if (range < 0.0001) {
    return {
      field: field.map((row) => row.map(round3)),
      diagnostics: { contrastEnhanced: false, contrastStrength: 0, dynamicRangeBefore: round3(range), dynamicRangeAfter: round3(range) }
    };
  }
  const p08 = percentileSorted(values, 0.08);
  const p92 = percentileSorted(values, 0.92);
  const activeFraction = values.filter((value) => value >= 0.07).length / values.length;
  const highFraction = values.filter((value) => value >= 0.68).length / values.length;
  const needsRangeHelp = range < 0.62 || activeFraction > 0.94 || highFraction < 0.015;
  if (!needsRangeHelp) {
    return {
      field: field.map((row) => row.map(round3)),
      diagnostics: { contrastEnhanced: false, contrastStrength: 0, dynamicRangeBefore: round3(range), dynamicRangeAfter: round3(range) }
    };
  }
  const strength = contrastStrengthForField({ temporalPattern, spatialEvolution, spatialPattern, dynamicComplexity, activeFraction, highFraction, range });
  const denominator = Math.max(0.0001, p92 - p08);
  const enhanced = field.map((row) => row.map((value) => {
    const stretched = clamp01((Number(value) - p08) / denominator);
    const shaped = Math.pow(stretched, 0.82);
    return round3(clamp01(Number(value) * (1 - strength) + shaped * strength));
  }));
  return {
    field: enhanced,
    diagnostics: {
      contrastEnhanced: strength > 0,
      contrastStrength: round3(strength),
      dynamicRangeBefore: round3(range),
      dynamicRangeAfter: fieldRange(enhanced),
      percentile08: round3(p08),
      percentile92: round3(p92)
    }
  };
}

function contrastStrengthForField({ temporalPattern, spatialEvolution, spatialPattern, dynamicComplexity, activeFraction, highFraction, range }) {
  let strength = complexityValue(dynamicComplexity, 0.18, 0.26, 0.34);
  if (temporalPattern === 'bursty' || temporalPattern === 'randomPulses' || temporalPattern === 'intermittent') strength += 0.08;
  if (spatialEvolution === 'neighborPropagation') strength -= 0.08;
  if (spatialEvolution === 'continuousDrift') strength -= 0.14;
  if (spatialPattern === 'monitoringStations') strength -= 0.1;
  if (activeFraction > 0.97) strength += 0.08;
  if (highFraction < 0.01) strength += 0.08;
  if (range > 0.75) strength -= 0.12;
  return clampRange(strength, 0.12, 0.42);
}

function percentileSorted(values, percentile) {
  const index = clampRange(percentile, 0, 1) * Math.max(0, values.length - 1);
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  const t = index - lo;
  return values[lo] * (1 - t) + values[hi] * t;
}

function fieldRange(field) {
  const values = field.flat().map(Number).filter(Number.isFinite);
  if (!values.length) return 0;
  return round3(Math.max(...values) - Math.min(...values));
}

function createFreshnessField(field, { seed, time, dynamicComplexity, likelihoodField }) {
  const complexityScale = complexityValue(dynamicComplexity, 0.8, 1, 1.25);
  let syntheticVisitedCells = 0;
  const output = field.map((row, y) => row.map((value, x) => {
    const agePhase = 0.5 + 0.5 * Math.sin(time * 0.09 + seededUnitLike(`${seed}:freshness-phase:${x}:${y}`) * Math.PI * 2);
    const visitWindow = Math.floor(Math.max(0, time) / 8);
    const recentlySampled = seededUnitLike(`${seed}:freshness-sampled:${Math.floor(x / 3)}:${Math.floor(y / 3)}:${visitWindow}`) > 0.88 ? 1 : 0;
    if (recentlySampled) syntheticVisitedCells += 1;
    const localRecovery = clamp01(agePhase * complexityScale);
    const likelihood = likelihoodAtCell(likelihoodField, x, y);
    const staleWarmth = 0.24 + localRecovery * 0.5 + likelihood * 0.22;
    return round3(clamp01(recentlySampled ? Math.max(value * 0.32, localRecovery * 0.35) : Math.max(value * 0.55, staleWarmth)));
  }));
  return {
    field: output,
    activityLostToDepletion: Math.max(0, fieldTotal(field) - fieldTotal(output)),
    regenerationAmount: Math.max(0, fieldTotal(output) - fieldTotal(field)),
    syntheticVisitedCells
  };
}

function applyPersistentActivityBalance(field, { seed, likelihoodField, time, temporalPattern, spatialEvolution, dynamicComplexity }) {
  if (temporalPattern === 'pulseThenSilence') {
    return {
      field: field.map((row) => row.map(round3)),
      injectedActivity: 0,
      regenerationAmount: 0
    };
  }
  const complexityScale = complexityValue(dynamicComplexity, 0.85, 1, 1.18);
  const envelope = temporalEnvelopeForPattern(temporalPattern, time, `${seed}:activity-balance`);
  const backgroundFloor = temporalPattern === 'static' || temporalPattern === 'longTailDecay'
    ? 0
    : complexityValue(dynamicComplexity, 0.065, 0.095, 0.125);
  const regenerationRate = regenerationRateForPattern(temporalPattern, envelope, dynamicComplexity);
  const burstSeed = Math.floor(Math.max(0, time) / (temporalPattern === 'bursty' ? 24 : temporalPattern === 'intermittent' ? 12 : temporalPattern === 'randomPulses' ? 4 : 6));
  let injectedActivity = 0;
  let regenerationAmount = 0;
  const balanced = field.map((row, y) => row.map((value, x) => {
    const likelihood = likelihoodAtCell(likelihoodField, x, y);
    const pulse = seededUnitLike(`${seed}:activity-emergence:${x}:${y}:${burstSeed}`);
    const eventGate = pulse > 0.62 - likelihood * 0.28 ? 1 : 0;
    const injection = likelihood * regenerationRate * (0.42 + eventGate * 0.58) * complexityScale;
    const floor = backgroundFloor * (0.32 + likelihood * 0.68);
    const propagated = spatialEvolution === 'neighborPropagation' ? likelihood * 0.025 * complexityScale : 0;
    const next = clamp01(Math.max(value, floor) + injection + propagated);
    injectedActivity += Math.max(0, next - Math.max(value, floor));
    regenerationAmount += Math.max(0, next - value);
    return round3(next);
  }));
  return {
    field: balanced,
    injectedActivity: round3(injectedActivity),
    regenerationAmount: round3(regenerationAmount)
  };
}

function regenerationRateForPattern(pattern, envelope, dynamicComplexity) {
  const scale = complexityValue(dynamicComplexity, 0.8, 1, 1.15);
  if (pattern === 'static') return 0;
  if (pattern === 'pulseThenSilence') return 0;
  if (pattern === 'longTailDecay') return 0.006 * scale;
  if (pattern === 'sustained') return 0.044 * scale;
  if (pattern === 'periodic' || pattern === 'seasonal') return (0.018 + envelope * 0.035) * scale;
  if (pattern === 'rapidPulse') return (0.024 + envelope * 0.052) * scale;
  if (pattern === 'gaussianEnvelope') return (0.012 + envelope * 0.042) * scale;
  if (pattern === 'wavyMultiFrequency') return (0.022 + envelope * 0.042) * scale;
  if (pattern === 'randomPulses') return (0.014 + envelope * 0.045) * scale;
  if (pattern === 'intermittent') return (0.012 + envelope * 0.04) * scale;
  return (0.014 + envelope * 0.052) * scale;
}

function activityDiagnosticsForStage(baseField, retainedField, finalField, extra = {}) {
  return {
    temporalEnvelope: round3(extra.temporalEnvelope ?? 1),
    injectedActivity: round3(extra.injectedActivity ?? 0),
    regenerationAmount: round3(extra.regenerationAmount ?? 0),
    activityLostToDecay: round3(extra.activityLostToDecay ?? Math.max(0, fieldTotal(baseField) - fieldTotal(retainedField))),
    activityLostToBoundaries: round3(extra.activityLostToBoundaries ?? Math.max(0, fieldTotal(retainedField) - fieldTotal(finalField))),
    normalized: Boolean(extra.normalized)
  };
}

function buildActivityDiagnostics({ seed, time, behaviorPresetId, eventLikelihoodMode, spatialPattern, temporalPattern, spatialEvolution, stateModel, samplingEffect, baseField, evolvedField, displayedField, likelihoodField, hotspotCount, evolutionDiagnostics, displayDiagnostics }) {
  const stats = summarizeField(displayedField);
  const activeCellCount = countCells(displayedField, 0.35);
  const highValueCellCount = countCells(displayedField, 0.65);
  const cellCount = Math.max(1, (displayedField?.length ?? 0) * (displayedField?.[0]?.length ?? 0));
  const spatialMetrics = spatialActivityMetrics(displayedField, 0.35);
  const hotspotMetrics = spatialActivityMetrics(displayedField, 0.65);
  const modeDiagnostics = behaviorPresetId === 'recurringHotspots'
    ? recurringHotspotDiagnostics({ seed, time, eventLikelihoodMode, hotspotCount, displayedField, likelihoodField })
    : null;
  const highValueFraction = highValueCellCount / cellCount;
  const warnings = roiDiagnosticsWarnings({
    eventLikelihoodMode,
    spatialPattern,
    stats,
    activeFraction: activeCellCount / cellCount,
    highValueFraction,
    spatialMetrics
  });
  return {
    time: round3(time),
    eventLikelihoodMode,
    spatialPattern,
    temporalPattern,
    spatialEvolution,
    stateModel,
    samplingEffect,
    minValue: stats.min,
    meanValue: stats.mean,
    maxValue: stats.max,
    variance: stats.variance,
    stdDev: stats.stdDev,
    percentile10: stats.percentile10,
    percentile50: stats.percentile50,
    percentile90: stats.percentile90,
    activeCellCount,
    activeFraction: round3(activeCellCount / cellCount),
    highValueCellCount,
    highValueFraction: round3(highValueFraction),
    activeBoundingBoxCoverage: spatialMetrics.boundingBoxCoverage,
    activeBoundingBox: spatialMetrics.boundingBox,
    centerOfMass: spatialMetrics.centerOfMass,
    connectedComponentCount: spatialMetrics.connectedComponentCount,
    hotspotComponentCount: hotspotMetrics.connectedComponentCount,
    activeHotspotCount: modeDiagnostics?.activeHotspotCount ?? hotspotMetrics.connectedComponentCount,
    highValueComponentCount: modeDiagnostics?.highValueComponentCount ?? hotspotMetrics.connectedComponentCount,
    hotspotBoundingBoxCoverage: hotspotMetrics.boundingBoxCoverage,
    quadrantOccupancy: spatialMetrics.quadrantOccupancy,
    likelihoodSampleCorrelation: round3(fieldCorrelation(likelihoodField, displayedField)),
    recurringHotspots: modeDiagnostics,
    diagnosticWarnings: warnings,
    totalActivityMass: stats.totalValue,
    rawActivityMass: round3(fieldTotal(baseField)),
    evolvedActivityMass: round3(fieldTotal(evolvedField)),
    injectedActivity: round3(evolutionDiagnostics?.injectedActivity ?? 0),
    activityLostToDecay: round3(evolutionDiagnostics?.activityLostToDecay ?? 0),
    activityLostToDepletion: round3(displayDiagnostics?.activityLostToDepletion ?? 0),
    activityLostToBoundaries: round3(evolutionDiagnostics?.activityLostToBoundaries ?? 0),
    regenerationAmount: round3((evolutionDiagnostics?.regenerationAmount ?? 0) + (displayDiagnostics?.regenerationAmount ?? 0)),
    syntheticVisitedCells: displayDiagnostics?.syntheticVisitedCells ?? 0,
    contrastEnhanced: Boolean(displayDiagnostics?.contrastEnhanced),
    contrastStrength: round3(displayDiagnostics?.contrastStrength ?? 0),
    dynamicRangeBeforeContrast: round3(displayDiagnostics?.dynamicRangeBefore ?? (stats.max - stats.min)),
    dynamicRangeAfterContrast: round3(displayDiagnostics?.dynamicRangeAfter ?? (stats.max - stats.min)),
    normalized: Boolean(evolutionDiagnostics?.normalized)
  };
}

function spatialActivityMetrics(field, threshold = 0.07) {
  const height = field?.length ?? 0;
  const width = field?.[0]?.length ?? 0;
  if (!height || !width) {
    return {
      boundingBoxCoverage: 0,
      boundingBox: null,
      centerOfMass: null,
      connectedComponentCount: 0,
      quadrantOccupancy: [0, 0, 0, 0]
    };
  }
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let mass = 0;
  let weightedX = 0;
  let weightedY = 0;
  const quadrants = [0, 0, 0, 0];
  const active = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = Number(field[y]?.[x] ?? 0);
      if (value < threshold) continue;
      active[y][x] = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      mass += value;
      weightedX += x * value;
      weightedY += y * value;
      const quadrant = (x >= width / 2 ? 1 : 0) + (y >= height / 2 ? 2 : 0);
      quadrants[quadrant] += 1;
    }
  }
  if (maxX < minX || maxY < minY) {
    return {
      boundingBoxCoverage: 0,
      boundingBox: null,
      centerOfMass: null,
      connectedComponentCount: 0,
      quadrantOccupancy: [0, 0, 0, 0]
    };
  }
  const bboxArea = (maxX - minX + 1) * (maxY - minY + 1);
  const activeTotal = Math.max(1, quadrants.reduce((sum, value) => sum + value, 0));
  return {
    boundingBoxCoverage: round3(bboxArea / Math.max(1, width * height)),
    boundingBox: { minX, minY, maxX, maxY },
    centerOfMass: {
      x: round3(weightedX / Math.max(0.0001, mass)),
      y: round3(weightedY / Math.max(0.0001, mass))
    },
    connectedComponentCount: connectedComponentCount(active),
    quadrantOccupancy: quadrants.map((value) => round3(value / activeTotal))
  };
}

function connectedComponentCount(active) {
  const height = active.length;
  const width = active[0]?.length ?? 0;
  const visited = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  let components = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!active[y][x] || visited[y][x]) continue;
      components += 1;
      const stack = [{ x, y }];
      visited[y][x] = true;
      while (stack.length) {
        const cell = stack.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = cell.x + dx;
          const yy = cell.y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height || visited[yy][xx] || !active[yy][xx]) continue;
          visited[yy][xx] = true;
          stack.push({ x: xx, y: yy });
        }
      }
    }
  }
  return components;
}

function roiDiagnosticsWarnings({ eventLikelihoodMode, spatialPattern, stats, activeFraction, highValueFraction, spatialMetrics }) {
  const warnings = [];
  const range = stats.max - stats.min;
  const broadExpected = ['multiModalLikelihood', 'patchyLikelihood', 'seededTextureLikelihood'].includes(eventLikelihoodMode)
    || ['patchyField', 'frontBoundary', 'boundaryBand', 'seededTexture'].includes(spatialPattern);
  if (broadExpected && spatialMetrics.boundingBoxCoverage > 0 && spatialMetrics.boundingBoxCoverage < 0.18) warnings.push('low_domain_coverage');
  if (eventLikelihoodMode === 'multiModalLikelihood' && spatialMetrics.connectedComponentCount <= 1 && activeFraction < 0.38) warnings.push('multi_modal_collapsed');
  if (range < 0.15 && spatialPattern !== 'constantField') warnings.push('low_value_range');
  if (stats.variance < 0.006 && spatialPattern !== 'constantField') warnings.push('low_variance');
  if (highValueFraction > 0.82 || activeFraction > 0.985) warnings.push('possible_saturation');
  return warnings;
}

function recurringHotspotDiagnostics({ seed, time, eventLikelihoodMode, hotspotCount, displayedField, likelihoodField }) {
  const width = displayedField?.[0]?.length ?? ROI_DEMO_GRID.width;
  const height = displayedField?.length ?? ROI_DEMO_GRID.height;
  const count = clampInt(hotspotCount, 3, 5, 4);
  const modeCenters = recurringHotspotModeCenters({ seed, width, height, count, eventLikelihood: eventLikelihoodMode });
  const distances = [];
  for (let i = 0; i < modeCenters.length; i += 1) {
    for (let j = i + 1; j < modeCenters.length; j += 1) {
      distances.push(distance2d(modeCenters[i].x, modeCenters[i].y, modeCenters[j].x, modeCenters[j].y));
    }
  }
  const xs = modeCenters.map((center) => center.x);
  const ys = modeCenters.map((center) => center.y);
  const bbox = {
    minX: round3(Math.min(...xs)),
    maxX: round3(Math.max(...xs)),
    minY: round3(Math.min(...ys)),
    maxY: round3(Math.max(...ys))
  };
  const activeHotspotCount = modeCenters.filter((center) => {
    const x = Math.round(center.x * Math.max(1, width - 1));
    const y = Math.round(center.y * Math.max(1, height - 1));
    return likelihoodAtCell(displayedField, x, y) >= 0.35;
  }).length;
  return {
    modeCount: modeCenters.length,
    modeCenters: modeCenters.map((center) => ({
      x: round3(center.x),
      y: round3(center.y),
      radius: round3(center.radius),
      strength: round3(center.strength)
    })),
    minPairwiseDistance: round3(Math.min(...distances)),
    meanPairwiseDistance: round3(distances.reduce((sum, value) => sum + value, 0) / Math.max(1, distances.length)),
    modeCenterBBox: {
      ...bbox,
      width: round3(bbox.maxX - bbox.minX),
      height: round3(bbox.maxY - bbox.minY)
    },
    activeHotspotCount,
    highValueComponentCount: spatialActivityMetrics(displayedField, 0.65).connectedComponentCount,
    likelihoodSampleCorrelation: round3(fieldCorrelation(likelihoodField, displayedField)),
    temporalPhase: round3(positiveModulo(time, 24) / 24),
    burstWindowActive: activeHotspotCount > 0
  };
}

function fieldCorrelation(a, b) {
  const valuesA = a?.flat?.().map(Number).filter(Number.isFinite) ?? [];
  const valuesB = b?.flat?.().map(Number).filter(Number.isFinite) ?? [];
  const count = Math.min(valuesA.length, valuesB.length);
  if (!count) return 0;
  const sliceA = valuesA.slice(0, count);
  const sliceB = valuesB.slice(0, count);
  const meanA = sliceA.reduce((sum, value) => sum + value, 0) / count;
  const meanB = sliceB.reduce((sum, value) => sum + value, 0) / count;
  let numerator = 0;
  let denomA = 0;
  let denomB = 0;
  for (let index = 0; index < count; index += 1) {
    const da = sliceA[index] - meanA;
    const db = sliceB[index] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  return numerator / Math.max(0.000001, Math.sqrt(denomA * denomB));
}

function scaleHotspotRadii(hotspots, clusterSize = 'medium') {
  const scale = {
    tight: 0.62,
    medium: 1,
    wide: 1.45
  }[normalizeRoiDemoClusterSize(clusterSize)] ?? 1;
  return hotspots.map((hotspot) => ({
    ...hotspot,
    radius: Math.max(0.45, Number(hotspot.radius ?? 2.5) * scale)
  }));
}

function spatialEvolutionDescription(value, motionScope = 'perFeature') {
  const scope = roiMotionScopeLabel(motionScope);
  return {
    stationary: 'The pattern changes intensity but stays in the same location.',
    continuousDrift: motionScope === 'global'
      ? 'The whole field shifts together because Motion Scope is Global.'
      : `Features move smoothly through nearby/intermediate locations using ${scope} motion.`,
    discreteJump: motionScope === 'global'
      ? 'The whole active field can relocate on the next burst or window because Motion Scope is Global.'
      : `Active features can fade and reappear elsewhere by ${scope} region on the next burst or window.`,
    randomWalk: motionScope === 'global'
      ? 'The whole field wanders together because Motion Scope is Global.'
      : `Features wander by small seeded local steps using ${scope} motion.`,
    neighborPropagation: 'Active cells influence nearby cells, spreading activity locally.'
  }[value] ?? 'The pattern changes intensity but stays in the same location.';
}

function featureMotionDescription(spatialEvolution, motionScope = 'perFeature') {
  if (spatialEvolution === 'stationary') return 'none; pattern anchored in place';
  if (spatialEvolution === 'neighborPropagation') return 'local spread; nearby cells influence each other';
  if (motionScope === 'global') return 'global domain shift; the whole field moves together';
  if (spatialEvolution === 'continuousDrift') return `${roiMotionScopeLabel(motionScope)} smooth drift; regions use independent seeded trajectories`;
  if (spatialEvolution === 'randomWalk') return `${roiMotionScopeLabel(motionScope)} seeded walk; regions move by bounded local steps`;
  if (spatialEvolution === 'discreteJump') return `${roiMotionScopeLabel(motionScope)} seeded relocation; events can reappear in new regions`;
  return roiMotionScopeLabel(motionScope);
}

function temporalEnvelopeForPattern(pattern, time, seed) {
  if (pattern === 'static') return 1;
  if (pattern === 'sustained') return 0.78 + 0.12 * Math.sin(time * 0.08);
  if (pattern === 'periodic') return 0.5 + 0.56 * (0.5 + 0.5 * Math.sin(time * 0.32));
  if (pattern === 'rapidPulse') return 0.34 + 0.82 * (0.5 + 0.5 * Math.sin(time * 1.08));
  if (pattern === 'seasonal') return 0.5 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.075));
  if (pattern === 'gaussianEnvelope') {
    const cycle = 36;
    const centered = positiveModulo(time + cycle / 2, cycle) - cycle / 2;
    return 0.24 + 0.96 * Math.exp(-(centered ** 2) / (2 * 7.5 ** 2));
  }
  if (pattern === 'wavyMultiFrequency') {
    const phase = seededUnitLike(`${seed}:wavy-phase`) * Math.PI * 2;
    const waveA = 0.5 + 0.5 * Math.sin(time * 0.19 + phase);
    const waveB = 0.5 + 0.5 * Math.sin(time * 0.43 + phase * 0.37);
    return 0.36 + 0.46 * waveA + 0.26 * waveB;
  }
  if (pattern === 'randomPulses') {
    const window = Math.floor(Math.max(0, time) / 4);
    const pulse = seededUnitLike(`${seed}:pulse:${window}`);
    const nextPulse = seededUnitLike(`${seed}:pulse:${window + 1}`);
    const blend = positiveModulo(time, 4) / 4;
    const smoothed = pulse * (1 - blend) + nextPulse * blend;
    return smoothed > 0.52 ? 0.92 + smoothed * 0.3 : 0.32 + smoothed * 0.32;
  }
  if (pattern === 'intermittent') {
    const window = Math.floor(Math.max(0, time) / 6);
    const gate = seededUnitLike(`${seed}:intermittent:${window}`) > 0.42 ? 1 : 0;
    const ramp = 0.5 + 0.5 * Math.sin(positiveModulo(time, 6) / 6 * Math.PI * 2 - Math.PI / 2);
    return gate ? 0.62 + ramp * 0.42 : 0.22 + ramp * 0.16;
  }
  if (pattern === 'pulseThenSilence') {
    const peak = 10;
    if (time > 32) return 0;
    return 1.18 * Math.exp(-((time - peak) ** 2) / (2 * 5.2 ** 2));
  }
  if (pattern === 'longTailDecay') {
    const onset = 4;
    if (time < onset) return 0.35 + time / onset * 0.75;
    return 0.22 + 0.86 * Math.exp(-(time - onset) / 34);
  }
  const cycle = 24;
  const centered = Math.min(positiveModulo(time - 8, cycle), positiveModulo(8 - time, cycle));
  return 0.18 + 1.08 * Math.exp(-(centered ** 2) / (2 * 3.2 ** 2));
}

function burstPhaseLabel(phase) {
  if (phase < 0.18 || phase > 0.82) return 'quiet';
  if (phase < 0.4) return 'growing';
  if (phase < 0.58) return 'peak';
  return 'decaying';
}

function seededPulse(seed, x, y, time) {
  const phase = seededUnitLike(`${seed}:pulse-phase:${x}:${y}`) * Math.PI * 2;
  return 0.5 + 0.5 * Math.sin(time * (0.16 + seededUnitLike(`${seed}:pulse-rate:${x}:${y}`) * 0.18) + phase);
}

function diffuseField(field, amount) {
  const height = field.length;
  const width = field[0]?.length ?? 0;
  return field.map((row, y) => row.map((value, x) => {
    let sum = 0;
    let count = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const yy = Math.max(0, Math.min(height - 1, y + dy));
        const xx = Math.max(0, Math.min(width - 1, x + dx));
        sum += Number(field[yy]?.[xx] ?? 0);
        count += 1;
      }
    }
    return round3(clamp01(value * (1 - amount) + (sum / count) * amount));
  }));
}

function shiftField(field, dxNorm, dyNorm) {
  const height = field.length;
  const width = field[0]?.length ?? 0;
  return field.map((_row, y) => Array.from({ length: width }, (_value, x) => {
    const sourceX = wrap01((x / Math.max(1, width - 1)) - dxNorm);
    const sourceY = wrap01((y / Math.max(1, height - 1)) - dyNorm);
    const sx = Math.max(0, Math.min(width - 1, Math.round(sourceX * (width - 1))));
    const sy = Math.max(0, Math.min(height - 1, Math.round(sourceY * (height - 1))));
    return round3(clamp01(field[sy]?.[sx] ?? 0));
  }));
}

function warpField(field, offsetAt) {
  const height = field.length;
  const width = field[0]?.length ?? 0;
  return field.map((_row, y) => Array.from({ length: width }, (_value, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const offset = offsetAt(nx, ny);
    const sx = Math.max(0, Math.min(width - 1, Math.round((nx - offset.dx) * Math.max(1, width - 1))));
    const sy = Math.max(0, Math.min(height - 1, Math.round((ny - offset.dy) * Math.max(1, height - 1))));
    return round3(clamp01(field[sy]?.[sx] ?? 0));
  }));
}

function continuousMotionOffset({ seed, x, y, time, complexityScale, motionScope }) {
  const cols = motionScope === 'localNeighborhood' ? 8 : 4;
  const rows = motionScope === 'localNeighborhood' ? 6 : 3;
  const amplitude = (motionScope === 'localNeighborhood' ? 0.075 : 0.16) * complexityScale;
  return interpolatedRegionalOffset({
    seed,
    x,
    y,
    cols,
    rows,
    valueAt: (ix, iy) => {
      const phaseX = seededUnitLike(`${seed}:drift-phase-x:${ix}:${iy}`) * Math.PI * 2;
      const phaseY = seededUnitLike(`${seed}:drift-phase-y:${ix}:${iy}`) * Math.PI * 2;
      const rateX = 0.11 + seededUnitLike(`${seed}:drift-rate-x:${ix}:${iy}`) * 0.09;
      const rateY = 0.1 + seededUnitLike(`${seed}:drift-rate-y:${ix}:${iy}`) * 0.08;
      return {
        dx: Math.sin(time * rateX + phaseX) * amplitude,
        dy: Math.cos(time * rateY + phaseY) * amplitude * 0.82
      };
    }
  });
}

function discreteJumpOffset({ seed, likelihoodField, x, y, jumpIndex, complexityScale, motionScope }) {
  const cols = motionScope === 'localNeighborhood' ? 8 : 4;
  const rows = motionScope === 'localNeighborhood' ? 6 : 3;
  const amplitude = (motionScope === 'localNeighborhood' ? 0.18 : 0.42) * complexityScale;
  return interpolatedRegionalOffset({
    seed,
    x,
    y,
    cols,
    rows,
    valueAt: (ix, iy) => {
      const gx = cols > 1 ? ix / (cols - 1) : 0;
      const gy = rows > 1 ? iy / (rows - 1) : 0;
      const bias = likelihoodGradient(likelihoodField, gx, gy);
      return {
        dx: (seededUnitLike(`${seed}:jump-region-x:${ix}:${iy}:${jumpIndex}`) - 0.5) * amplitude + bias.dx * 0.12 * complexityScale,
        dy: (seededUnitLike(`${seed}:jump-region-y:${ix}:${iy}:${jumpIndex}`) - 0.5) * amplitude * 0.75 + bias.dy * 0.1 * complexityScale
      };
    }
  });
}

function randomWalkOffset({ seed, likelihoodField, x, y, step, complexityScale, motionScope }) {
  const cols = motionScope === 'localNeighborhood' ? 8 : 4;
  const rows = motionScope === 'localNeighborhood' ? 6 : 3;
  const stepScale = (motionScope === 'localNeighborhood' ? 0.018 : 0.034) * complexityScale;
  const boundX = motionScope === 'localNeighborhood' ? 0.13 : 0.28;
  const boundY = motionScope === 'localNeighborhood' ? 0.105 : 0.22;
  return interpolatedRegionalOffset({
    seed,
    x,
    y,
    cols,
    rows,
    valueAt: (ix, iy) => {
      let dx = 0;
      let dy = 0;
      for (let index = 0; index <= step; index += 1) {
        dx += (seededUnitLike(`${seed}:walk-region-x:${ix}:${iy}:${index}`) - 0.5) * stepScale;
        dy += (seededUnitLike(`${seed}:walk-region-y:${ix}:${iy}:${index}`) - 0.5) * stepScale * 0.82;
      }
      const gx = cols > 1 ? ix / (cols - 1) : 0;
      const gy = rows > 1 ? iy / (rows - 1) : 0;
      const bias = likelihoodGradient(likelihoodField, gx, gy);
      dx += bias.dx * stepScale * Math.min(8, step + 1);
      dy += bias.dy * stepScale * Math.min(8, step + 1) * 0.82;
      return {
        dx: clampRange(dx, -boundX, boundX),
        dy: clampRange(dy, -boundY, boundY)
      };
    }
  });
}

function interpolatedRegionalOffset({ x, y, cols, rows, valueAt }) {
  const gx = clampRange(x, 0, 1) * Math.max(1, cols - 1);
  const gy = clampRange(y, 0, 1) * Math.max(1, rows - 1);
  const x0 = Math.max(0, Math.min(cols - 1, Math.floor(gx)));
  const y0 = Math.max(0, Math.min(rows - 1, Math.floor(gy)));
  const x1 = Math.max(0, Math.min(cols - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(rows - 1, y0 + 1));
  const tx = gx - x0;
  const ty = gy - y0;
  const a = valueAt(x0, y0);
  const b = valueAt(x1, y0);
  const c = valueAt(x0, y1);
  const d = valueAt(x1, y1);
  return {
    dx: lerp(lerp(a.dx, b.dx, tx), lerp(c.dx, d.dx, tx), ty),
    dy: lerp(lerp(a.dy, b.dy, tx), lerp(c.dy, d.dy, tx), ty)
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function legacyPattern(sampleFieldConfig) {
  if (sampleFieldConfig.spatialPattern === 'singleHotspot') return 'single';
  if (sampleFieldConfig.spatialPattern === 'bimodal') return 'bimodal';
  if (sampleFieldConfig.spatialPattern === 'plume') return 'plume';
  if (sampleFieldConfig.distribution === 'clustered') return 'clustered';
  if (sampleFieldConfig.temporalBehavior === 'moving') return 'moving';
  return 'multiple';
}

function makeDemoCurrentFrame(width, height, time) {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    return [
      0.28 + 0.16 * Math.sin(ny * Math.PI * 2 + time * 0.18),
      0.08 * Math.cos(nx * Math.PI * 2 + time * 0.12)
    ];
  }));
}

function applyForecastView(field, forecastView, seed, time) {
  if (forecastView === 'truth') return field;
  if (forecastView === 'depleted') {
    const cx = field[0]?.length ? field[0].length * (0.32 + 0.18 * Math.sin(time * 0.15)) : 0;
    const cy = field.length * 0.52;
    return field.map((row, y) => row.map((value, x) => {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      const depletion = 0.55 * Math.exp(-d2 / (2 * 2.2 ** 2));
      return round3(clamp01(value * (1 - depletion)));
    }));
  }
  if (forecastView === 'uncertainty') {
    return field.map((row, y) => row.map((_value, x) => {
      const uncertainty = 0.18 + 0.62 * seededUnitLike(`${seed}:uncertainty:${Math.floor(x / 3)}:${Math.floor(y / 3)}`);
      return round3(clamp01(uncertainty + 0.08 * Math.sin(time * 0.2 + x * 0.3)));
    }));
  }
  return field.map((row, y) => row.map((value, x) => {
    const bias = (seededUnitLike(`${seed}:forecast-bias:${x}:${y}`) - 0.5) * 0.18;
    return round3(clamp01(value + bias));
  }));
}

function seededUnitLike(seed) {
  return createSeededRng(seed)();
}

function eventLikelihoodFromLegacy(spatialPattern, distribution) {
  const pattern = normalizeRoiDemoPureSpatialPattern(spatialPattern);
  if (pattern === 'gradientField' || distribution === 'gradientFront') return 'gradientLikelihood';
  if (pattern === 'patchyField') return 'patchyLikelihood';
  if (pattern === 'seededTexture' || distribution === 'nonuniformRandom') return 'seededTextureLikelihood';
  if (pattern === 'sparseTargets') return 'sparseCandidateSites';
  if (pattern === 'clusteredField' || distribution === 'gaussianHotspots' || distribution === 'burstyBloom') return 'multiModalLikelihood';
  return 'uniformLikelihood';
}

export function createEventLikelihoodField({
  eventLikelihood = 'uniformLikelihood',
  seed = 'anchor-roi-demo',
  width = ROI_DEMO_GRID.width,
  height = ROI_DEMO_GRID.height,
  count = 3,
  dynamics = 'static',
  temporalPattern = 'static',
  spatialEvolution = 'stationary',
  dynamicComplexity = 'medium',
  time = 0
} = {}) {
  const normalized = normalizeRoiDemoEventLikelihood(eventLikelihood);
  const normalizedDynamics = normalizeRoiDemoLikelihoodDynamics(dynamics);
  const normalizedTemporalPattern = normalizeRoiDemoTemporalPattern(temporalPattern);
  const normalizedSpatialEvolution = normalizeRoiDemoSpatialEvolution(spatialEvolution);
  const cacheKey = `${seed}:${normalized}:${width}x${height}:${count}`;
  const cached = EVENT_LIKELIHOOD_FIELD_CACHE.get(cacheKey);
  if (cached) {
    return normalizedDynamics === 'dynamic'
      ? applyLikelihoodBehavior(cached, { seed, time, temporalPattern: normalizedTemporalPattern, spatialEvolution: normalizedSpatialEvolution, dynamicComplexity })
      : cached;
  }
  const rng = createSeededRng(`${seed}:event-likelihood:${normalized}:${width}x${height}:${count}`);
  const centers = createSeparatedLikelihoodCenters({
    seed,
    width,
    height,
    count: normalized === 'gaussianLikelihood' ? 1 : normalized === 'sparseCandidateSites' ? Math.max(4, count * 2) : count,
    kind: normalized,
    rng
  });
  const field = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    if (normalized === 'uniformLikelihood') return 1;
    if (normalized === 'gaussianLikelihood') {
      const cx = 0.42 + (rngSeeded(`${seed}:event-likelihood:gaussian:x`) - 0.5) * 0.18;
      const cy = 0.52 + (rngSeeded(`${seed}:event-likelihood:gaussian:y`) - 0.5) * 0.18;
      return 0.08 + 0.92 * Math.exp(-(((nx - cx) ** 2) / (2 * 0.22 ** 2) + ((ny - cy) ** 2) / (2 * 0.18 ** 2)));
    }
    if (normalized === 'multiModalLikelihood') {
      return centers.reduce((sum, center) => {
        const d2 = (nx - center.x) ** 2 + (ny - center.y) ** 2;
        return sum + center.strength * Math.exp(-d2 / (2 * center.radius ** 2));
      }, 0.04);
    }
    if (normalized === 'gradientLikelihood') {
      const angle = rngSeeded(`${seed}:event-likelihood:gradient:angle`) * Math.PI * 2;
      const projected = (nx - 0.5) * Math.cos(angle) + (ny - 0.5) * Math.sin(angle);
      return 0.1 + 0.9 * smoothstep(-0.52, 0.52, projected);
    }
    if (normalized === 'patchyLikelihood') {
      const blobs = centers.reduce((sum, center) => {
        const d2 = (nx - center.x) ** 2 + (ny - center.y) ** 2;
        return sum + center.strength * Math.exp(-d2 / (2 * center.radius ** 2));
      }, 0);
      const coarseX = Math.floor(nx * 7);
      const coarseY = Math.floor(ny * 5);
      const low = seededUnitLike(`${seed}:event-likelihood:patch:${coarseX}:${coarseY}`);
      const east = seededUnitLike(`${seed}:event-likelihood:patch:${coarseX + 1}:${coarseY}`);
      const south = seededUnitLike(`${seed}:event-likelihood:patch:${coarseX}:${coarseY + 1}`);
      const texture = low * 0.5 + east * 0.22 + south * 0.22;
      return 0.08 + blobs * 0.68 + texture * 0.34;
    }
    if (normalized === 'seededTextureLikelihood') {
      const low = seededUnitLike(`${seed}:event-likelihood:texture:${Math.floor(nx * 8)}:${Math.floor(ny * 6)}`);
      const high = seededUnitLike(`${seed}:event-likelihood:texture-fine:${x}:${y}`);
      return 0.08 + low * 0.68 + high * 0.24;
    }
    if (normalized === 'sparseCandidateSites') {
      return centers.reduce((sum, center) => {
        const d2 = (nx - center.x) ** 2 + (ny - center.y) ** 2;
        return Math.max(sum, 0.04 + center.strength * Math.exp(-d2 / (2 * 0.045 ** 2)));
      }, 0.02);
    }
    return 1;
  }));
  const normalizedField = normalizeLikelihoodField(field);
  if (EVENT_LIKELIHOOD_FIELD_CACHE.size > 80) EVENT_LIKELIHOOD_FIELD_CACHE.clear();
  EVENT_LIKELIHOOD_FIELD_CACHE.set(cacheKey, normalizedField);
  return normalizedDynamics === 'dynamic'
    ? applyLikelihoodBehavior(normalizedField, { seed, time, temporalPattern: normalizedTemporalPattern, spatialEvolution: normalizedSpatialEvolution, dynamicComplexity })
    : normalizedField;
}

function createSeparatedLikelihoodCenters({ seed, width, height, count, kind, rng }) {
  const normalizedCount = clampInt(count, 1, 8, 3);
  const minSeparation = kind === 'sparseCandidateSites'
    ? 0.18
    : kind === 'patchyLikelihood'
      ? 0.22
      : 0.32;
  const marginX = kind === 'sparseCandidateSites' ? 0.08 : 0.12;
  const marginY = kind === 'sparseCandidateSites' ? 0.1 : 0.14;
  const quadrantAnchors = [
    { x: 0.2, y: 0.24 },
    { x: 0.8, y: 0.26 },
    { x: 0.22, y: 0.76 },
    { x: 0.78, y: 0.74 },
    { x: 0.5, y: 0.5 },
    { x: 0.16, y: 0.5 },
    { x: 0.84, y: 0.52 },
    { x: 0.5, y: 0.18 }
  ];
  const centers = [];
  for (let index = 0; index < normalizedCount; index += 1) {
    const anchor = quadrantAnchors[index % quadrantAnchors.length];
    let best = null;
    let bestScore = -Infinity;
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const jitter = attempt < 10 ? 0.18 : 0.38;
      const candidate = {
        x: clampRange(anchor.x + (rng() - 0.5) * jitter, marginX, 1 - marginX),
        y: clampRange(anchor.y + (rng() - 0.5) * jitter, marginY, 1 - marginY)
      };
      const nearest = centers.reduce((min, center) => Math.min(min, distance2d(candidate.x, candidate.y, center.x, center.y)), Infinity);
      const edgePenalty = Math.max(0, 0.12 - candidate.x) + Math.max(0, candidate.x - 0.88) + Math.max(0, 0.12 - candidate.y) + Math.max(0, candidate.y - 0.88);
      const score = nearest - edgePenalty * 0.6 + rng() * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
      if (nearest >= minSeparation) break;
    }
    const phase = seededUnitLike(`${seed}:event-likelihood:center-phase:${kind}:${index}`) * Math.PI * 2;
    centers.push({
      x: best?.x ?? anchor.x,
      y: best?.y ?? anchor.y,
      radius: kind === 'sparseCandidateSites'
        ? 0.036 + rng() * 0.028
        : kind === 'patchyLikelihood'
          ? 0.12 + rng() * 0.08
          : 0.1 + rng() * 0.08,
      strength: 0.58 + rng() * 0.34,
      phase,
      amplitude: 0.82 + rng() * 0.36
    });
  }
  return centers;
}

function distance2d(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function applyLikelihoodBehavior(field, { seed, time, temporalPattern, spatialEvolution, dynamicComplexity }) {
  const complexityScale = complexityValue(dynamicComplexity, 0.65, 1, 1.35);
  const temporalEnvelope = temporalEnvelopeForPattern(temporalPattern, time, `${seed}:event-likelihood`);
  let evolved = field.map((row) => row.map((value) => clamp01(value * temporalEnvelope)));
  if (spatialEvolution === 'stationary') return roundLikelihoodField(evolved);
  if (spatialEvolution === 'continuousDrift') {
    return roundLikelihoodField(warpField(evolved, (x, y) => continuousMotionOffset({
      seed: `${seed}:event-likelihood`,
      x,
      y,
      time,
      complexityScale,
      motionScope: 'perFeature'
    })));
  }
  if (spatialEvolution === 'discreteJump') {
    const cycle = temporalPattern === 'bursty' ? 24 : temporalPattern === 'intermittent' ? 18 : 16;
    const jumpIndex = Math.floor(Math.max(0, time) / cycle);
    return roundLikelihoodField(warpField(evolved, (x, y) => discreteJumpOffset({
      seed: `${seed}:event-likelihood`,
      likelihoodField: field,
      x,
      y,
      jumpIndex,
      complexityScale,
      motionScope: 'perFeature'
    })));
  }
  if (spatialEvolution === 'randomWalk') {
    const step = Math.floor(Math.max(0, time) / 3);
    return roundLikelihoodField(warpField(evolved, (x, y) => randomWalkOffset({
      seed: `${seed}:event-likelihood`,
      likelihoodField: field,
      x,
      y,
      step,
      complexityScale,
      motionScope: 'perFeature'
    })));
  }
  if (spatialEvolution === 'neighborPropagation') {
    const activated = diffuseField(evolved, complexityValue(dynamicComplexity, 0.1, 0.18, 0.28));
    evolved = evolved.map((row, y) => row.map((value, x) => {
      const block = seededUnitLike(`${seed}:event-likelihood:spread:${Math.floor(x / 3)}:${Math.floor(y / 3)}:${Math.floor(time / 4)}`);
      return clamp01(value * 0.7 + activated[y][x] * 0.26 + (block > 0.68 ? 0.1 * complexityScale : 0));
    }));
    return roundLikelihoodField(evolved);
  }
  return roundLikelihoodField(evolved);
}

function roundLikelihoodField(field) {
  return field.map((row) => row.map((value) => round3(clamp01(value))));
}

function rngSeeded(seed) {
  return seededUnitLike(seed);
}

function normalizeLikelihoodField(field) {
  const values = field.flat().map(Number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max) || Math.abs(max - min) < 0.0001) {
    return field.map((row) => row.map(() => 1));
  }
  return field.map((row) => row.map((value) => round3(clamp01((Number(value) - min) / (max - min)))));
}

function likelihoodAtCell(likelihoodField, x, y) {
  const height = likelihoodField?.length ?? 0;
  const width = likelihoodField?.[0]?.length ?? 0;
  if (!height || !width) return 1;
  const xx = Math.max(0, Math.min(width - 1, Math.round(Number(x) || 0)));
  const yy = Math.max(0, Math.min(height - 1, Math.round(Number(y) || 0)));
  return clamp01(likelihoodField[yy]?.[xx] ?? 1);
}

function likelihoodAtNorm(likelihoodField, x, y) {
  const height = likelihoodField?.length ?? 0;
  const width = likelihoodField?.[0]?.length ?? 0;
  if (!height || !width) return 1;
  return likelihoodAtCell(likelihoodField, clampRange(x, 0, 1) * (width - 1), clampRange(y, 0, 1) * (height - 1));
}

function likelihoodGradient(likelihoodField, x, y) {
  const amount = 0.04;
  const left = likelihoodAtNorm(likelihoodField, x - amount, y);
  const right = likelihoodAtNorm(likelihoodField, x + amount, y);
  const up = likelihoodAtNorm(likelihoodField, x, y - amount);
  const down = likelihoodAtNorm(likelihoodField, x, y + amount);
  return {
    dx: clampRange(right - left, -1, 1),
    dy: clampRange(down - up, -1, 1)
  };
}

function createLikelihoodHotspots(width, height, count, pattern, rng, likelihoodField, seed, eventLikelihood) {
  const normalizedCount = Math.max(1, Math.round(Number(count) || 1));
  const anchor = weightedLikelihoodCell(likelihoodField, rng);
  return Array.from({ length: normalizedCount }, (_, index) => {
    const cell = pattern === 'clustered' && index > 0
      ? weightedCellNearAnchor(likelihoodField, rng, anchor, width, height)
      : weightedLikelihoodCell(likelihoodField, rng);
    return {
      x: Math.max(0, Math.min(width - 1, cell.x + 0.12 + rng() * 0.76)),
      y: Math.max(0, Math.min(height - 1, cell.y + 0.12 + rng() * 0.76)),
      radius: pattern === 'single' ? 2.7 : pattern === 'clustered' ? 2.1 : 1.55 + rng() * 1.1,
      strength: 0.66 + likelihoodAtCell(likelihoodField, cell.x, cell.y) * 0.26 + rng() * 0.12,
      seed: `${seed}:${eventLikelihood}:event-origin:${index}`
    };
  });
}

function weightedCellNearAnchor(likelihoodField, rng, anchor, width, height) {
  let best = anchor;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const cell = weightedLikelihoodCell(likelihoodField, rng);
    const dx = (cell.x - anchor.x) / Math.max(1, width);
    const dy = (cell.y - anchor.y) / Math.max(1, height);
    const score = likelihoodAtCell(likelihoodField, cell.x, cell.y) - Math.sqrt(dx * dx + dy * dy) * 0.85 + rng() * 0.12;
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return best;
}

function weightedLikelihoodCell(likelihoodField, rng) {
  const height = likelihoodField?.length ?? 0;
  const width = likelihoodField?.[0]?.length ?? 0;
  if (!height || !width) return { x: 0, y: 0 };
  let total = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      total += 0.015 + likelihoodAtCell(likelihoodField, x, y) ** 1.8;
    }
  }
  let roll = rng() * Math.max(0.0001, total);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      roll -= 0.015 + likelihoodAtCell(likelihoodField, x, y) ** 1.8;
      if (roll <= 0) return { x, y };
    }
  }
  return { x: width - 1, y: height - 1 };
}

function createUniformRandom(width, height, rng) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => round3(rng())));
}

function createUniformField(width, height, value = 0.42) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => round3(value)));
}

function applyValueDistribution(field, { valueDistribution = 'constantValue', seed = 'anchor-roi-demo', spatialPattern = 'constantField' } = {}) {
  const normalized = normalizeRoiDemoValueDistribution(valueDistribution);
  if (normalized === 'constantValue') return field.map((row) => row.map(round3));
  const values = field.flat().map(Number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const flat = Math.abs(max - min) < 0.0001 || normalizeRoiDemoPureSpatialPattern(spatialPattern) === 'constantField';
  return field.map((row, y) => row.map((value, x) => {
    const rng = createSeededRng(`${seed}:value-distribution:${normalized}:${x}:${y}`);
    const draw = normalized === 'gaussianNormal' ? gaussian01(rng) : rng();
    if (flat) return round3(draw);
    return round3(clamp01(Number(value) * 0.68 + draw * 0.32));
  }));
}

function valueDistributionFromLegacy(distribution, spatialPattern = null) {
  const pattern = normalizeRoiDemoPureSpatialPattern(spatialPattern);
  if (pattern === 'constantField' && (spatialPattern === 'uniformRandom' || distribution === 'uniformRandom')) return 'uniformRandom';
  if (pattern === 'constantField' && spatialPattern != null) return 'constantValue';
  return {
    uniformRandom: 'uniformRandom',
    gaussianHotspots: 'gaussianNormal',
    clusteredHotspots: 'gaussianNormal',
    ridgeCorridor: 'gaussianNormal',
    boundaryBand: 'gaussianNormal',
    bimodalHotspots: 'gaussianNormal',
    movingHotspot: 'gaussianNormal',
    burstyBloom: 'gaussianNormal',
    sparseTargets: 'gaussianNormal',
    gradientFront: 'gaussianNormal',
    nonuniformRandom: 'uniformRandom'
  }[distribution] ?? 'constantValue';
}

function gaussian01(rng) {
  const u1 = Math.max(0.000001, rng());
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);
  return clamp01(0.5 + z * 0.16);
}

function createGradientFront({ width, height, rng, noise, time }) {
  const phase = (rng() - 0.5) * 0.12 + Math.sin(time * 0.28) * 0.16;
  const wave = 0.18 + rng() * 0.18;
  const tilt = (rng() - 0.5) * 0.32;
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const front = nx + (ny - 0.5) * tilt + Math.sin(ny * Math.PI * 2 + time * 0.18) * wave;
    const value = smoothstep(0.26 + phase, 0.74 + phase, front) + (rng() - 0.5) * noise;
    return round3(clamp01(value));
  }));
}

function createSparseTargets({ width, height, rng, hotspotCount, noise, time, likelihoodField, seed, eventLikelihood }) {
  const targetCells = createLikelihoodHotspots(width, height, Math.max(3, hotspotCount * 2), 'multiple', rng, likelihoodField, seed, eventLikelihood);
  const targets = targetCells.map((cell, index) => ({
    x: cell.x,
    y: cell.y,
    strength: 0.58 + rng() * 0.42,
    radius: 0.55 + rng() * 0.7,
    phase: rng() * Math.PI * 2 + index
  }));
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const value = targets.reduce((sum, target) => {
      const pulse = 0.8 + 0.22 * Math.sin(time * 0.35 + target.phase);
      const d2 = (x - target.x) ** 2 + (y - target.y) ** 2;
      return sum + target.strength * pulse * Math.exp(-d2 / (2 * target.radius ** 2));
    }, rng() * noise * 0.18);
    return round3(clamp01(value));
  }));
}

function createRidgeCorridor({ width, height, rng, noise, time }) {
  const amplitude = 0.12 + rng() * 0.18;
  const center = 0.36 + rng() * 0.28;
  const frequency = 1.2 + rng() * 1.4;
  const phase = rng() * Math.PI * 2 + time * 0.22;
  const thickness = 0.075 + rng() * 0.045;
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const ridgeY = center + Math.sin(nx * Math.PI * 2 * frequency + phase) * amplitude;
    const distance = Math.abs(ny - ridgeY);
    const value = Math.exp(-(distance ** 2) / (2 * thickness ** 2)) + (rng() - 0.5) * noise;
    return round3(clamp01(value));
  }));
}

function createBoundaryBand({ width, height, rng, noise, time }) {
  const side = Math.floor(rng() * 5);
  const widthNorm = 0.08 + rng() * 0.08;
  const softness = 0.018 + rng() * 0.035;
  const intensity = 0.72 + rng() * 0.24;
  const pulse = 0.88 + 0.12 * Math.sin(time * 0.18 + rng() * Math.PI * 2);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const distances = [
      ny,
      1 - ny,
      nx,
      1 - nx
    ];
    const distance = side >= 4 ? Math.min(...distances) : distances[side];
    const band = 1 - smoothstep(widthNorm, widthNorm + softness, distance);
    const value = band * intensity * pulse + (rng() - 0.5) * noise;
    return round3(clamp01(value));
  }));
}

function withNoise(field, rng, noise) {
  const amount = clamp01(noise);
  if (amount <= 0) return field;
  return field.map((row) => row.map((value) => round3(clamp01(Number(value) + (rng() - 0.5) * amount))));
}

function summarizeField(field) {
  const values = field.flat().map(Number).filter(Number.isFinite);
  const count = Math.max(1, values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: round3(min),
    max: round3(max),
    mean: round3(mean),
    variance: round3(variance),
    stdDev: round3(Math.sqrt(variance)),
    percentile10: round3(percentileSorted(sorted, 0.1)),
    percentile50: round3(percentileSorted(sorted, 0.5)),
    percentile90: round3(percentileSorted(sorted, 0.9)),
    totalValue: round3(values.reduce((sum, value) => sum + value, 0))
  };
}

function fieldTotal(field) {
  return (field ?? []).flat().reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function countCells(field, threshold) {
  return (field ?? []).flat().filter((value) => Number(value) >= threshold).length;
}

function findHighValueCells(field, threshold) {
  const cells = [];
  field.forEach((row, y) => {
    row.forEach((value, x) => {
      if (Number(value) >= threshold) cells.push({ x, y, value: Number(value) });
    });
  });
  return cells
    .sort((a, b) => b.value - a.value)
    .slice(0, 24);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function complexityValue(level, low, medium, high) {
  return { low, medium, high }[normalizeRoiDemoDynamicComplexity(level)] ?? medium;
}

function positiveModulo(value, modulo) {
  return ((Number(value) % modulo) + modulo) % modulo;
}

function wrap01(value) {
  const number = Number(value) || 0;
  return ((number % 1) + 1) % 1;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function round3(value) {
  return Number((Number(value) || 0).toFixed(3));
}
