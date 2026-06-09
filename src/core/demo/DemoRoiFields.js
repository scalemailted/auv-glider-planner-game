import { generateROI, createHotspots } from '../generation/ROIFieldGenerator.js';
import { createSeededRng } from '../random/SeededRng.js';
import {
  SAMPLE_SPATIAL_PATTERNS,
  SAMPLE_TEMPORAL_BEHAVIORS,
  normalizeSampleFieldConfig,
  sampleSpatialPatternLabel,
  sampleTemporalBehaviorLabel
} from '../generation/SampleFieldConfig.js';

export const ROI_DEMO_GRID = { width: 24, height: 16 };
export const ROI_DEMO_DISTRIBUTIONS = [
  'uniformRandom',
  'gaussianHotspots',
  'clusteredHotspots',
  'gradientFront',
  'sparseTargets',
  'ridgeCorridor',
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
  'uniformField',
  'gradientField',
  'clusteredField',
  'patchyField',
  'sparseTargets',
  'linearBand',
  'frontBoundary',
  'edgeBand',
  'monitoringStations',
  'randomTexture'
];
export const ROI_DEMO_TEMPORAL_BEHAVIORS = SAMPLE_TEMPORAL_BEHAVIORS;
export const ROI_DEMO_TEMPORAL_PATTERNS = ['static', 'sustained', 'periodic', 'bursty', 'seasonal', 'randomPulses', 'intermittent'];
export const ROI_DEMO_SPATIAL_EVOLUTIONS = ['stationary', 'continuousDrift', 'discreteJump', 'randomWalk', 'neighborPropagation'];
export const ROI_DEMO_EVOLUTION_MODELS = ROI_DEMO_SPATIAL_EVOLUTIONS;
export const ROI_DEMO_PATTERN_EVOLUTIONS = ROI_DEMO_SPATIAL_EVOLUTIONS;
export const ROI_DEMO_STATE_MODELS = ['timeIndexed', 'frequencyBased', 'stateEvolving', 'historyAware'];
export const ROI_DEMO_DEPLETION_MODES = ['none', 'hard', 'soft', 'neighborhood', 'freshnessAge', 'revisitRecovery'];
export const ROI_DEMO_DISPLAY_MODES = ['sampleValue', 'depletedValue', 'freshnessRevisitValue', 'rawBaseValue'];
export const ROI_DEMO_DYNAMIC_COMPLEXITY = ['low', 'medium', 'high'];
export const ROI_DEMO_CLUSTER_SIZES = ['tight', 'medium', 'wide'];

export function normalizeRoiDemoDistribution(value = 'gaussianHotspots') {
  return ROI_DEMO_DISTRIBUTIONS.includes(value) ? value : 'gaussianHotspots';
}

export function normalizeRoiDemoTimeMode(value = 'static') {
  return ROI_DEMO_TIME_MODES.includes(value) ? value : 'static';
}

export function createDemoRoiField({
  distribution = 'burstyBloom',
  seed = 'anchor-roi-demo',
  hotspotCount = null,
  clusterSize = 'medium',
  noise = 0.15,
  timeMode = 'static',
  spatialPattern = null,
  temporalBehavior = null,
  temporalPattern = null,
  evolutionModel = 'stationary',
  patternEvolution = null,
  spatialEvolution = null,
  stateModel = null,
  depletionMode = 'soft',
  displayMode = 'sampleValue',
  dynamicComplexity = 'medium',
  forecastView = 'forecast',
  time = 0,
  demoTime = null,
  grid = ROI_DEMO_GRID
} = {}) {
  const width = Math.max(1, Number(grid.width ?? ROI_DEMO_GRID.width));
  const height = Math.max(1, Number(grid.height ?? ROI_DEMO_GRID.height));
  const normalizedDistribution = normalizeRoiDemoDistribution(distribution);
  const normalizedTimeMode = normalizeRoiDemoTimeMode(timeMode);
  const legacyClusterCount = legacyClusterCountFromPattern(spatialPattern ?? normalizedDistribution);
  const normalizedPureSpatialPattern = normalizeRoiDemoPureSpatialPattern(spatialPattern ?? pureSpatialPatternFromDistribution(normalizedDistribution));
  const spatialDefaults = pureSpatialPatternDefaults(normalizedPureSpatialPattern);
  const normalizedTemporalPattern = normalizeRoiDemoTemporalPattern(temporalPattern ?? temporalPatternFromBehavior(temporalBehavior ?? distributionToSampleConfig(normalizedDistribution).temporalBehavior));
  const normalizedSpatialEvolution = normalizeRoiDemoSpatialEvolution(spatialEvolution ?? patternEvolution ?? evolutionModel);
  const normalizedEvolutionModel = normalizedSpatialEvolution;
  const normalizedStateModel = normalizeRoiDemoStateModel(stateModel ?? roiStateModelForEvolutionModel(normalizedEvolutionModel));
  const normalizedDepletionMode = normalizeRoiDemoDepletionMode(depletionMode);
  const normalizedDisplayMode = normalizeRoiDemoDisplayMode(displayModeFromLegacyForecastView(displayMode, forecastView));
  const normalizedDynamicComplexity = normalizeRoiDemoDynamicComplexity(dynamicComplexity);
  const normalizedClusterSize = normalizeRoiDemoClusterSize(clusterSize);
  const effectiveTemporalBehavior = temporalBehavior ?? temporalBehaviorFromPattern(normalizedTemporalPattern, normalizedSpatialEvolution);
  const sourceTime = demoTime ?? time;
  const t = normalizedTimeMode === 'dynamic' ? Number(sourceTime) || 0 : 0;
  const clusterCount = clampInt(hotspotCount ?? legacyClusterCount, 1, 6, spatialDefaults.clusterCount);
  const rng = createSeededRng(`${seed}:${normalizedPureSpatialPattern}:${width}x${height}:${clusterCount}:${normalizedClusterSize}:${noise}`);
  const baseField = buildDistribution({
    distribution: spatialDefaults.distribution,
    rng,
    seed,
    width,
    height,
    hotspotCount: clusterCount,
    clusterSize: normalizedClusterSize,
    noise: clamp01(noise),
    timeMode: normalizedTimeMode,
    spatialPattern: spatialDefaults.sampleSpatialPattern,
    temporalBehavior: effectiveTemporalBehavior,
    forecastView: 'truth',
    time: t
  });
  const behavior = sampleBehaviorMetadata({
    temporalPattern: normalizedTemporalPattern,
    spatialEvolution: normalizedSpatialEvolution,
    stateModel: normalizedStateModel,
    dynamicComplexity: normalizedDynamicComplexity,
    time: t
  });
  const field = applyEvolutionModel(baseField, {
    seed,
    time: t,
    timeMode: normalizedTimeMode,
    temporalPattern: normalizedTemporalPattern,
    spatialEvolution: normalizedSpatialEvolution,
    dynamicComplexity: normalizedDynamicComplexity
  });
  const displayedField = applySampleDisplayMode(field, {
    seed,
    time: t,
    depletionMode: normalizedDepletionMode,
    displayMode: normalizedDisplayMode,
    dynamicComplexity: normalizedDynamicComplexity
  });
  const stats = summarizeField(displayedField);
  return {
    field: displayedField,
    rawBaseField: baseField,
    evolvedField: field,
    width,
    height,
    distribution: spatialDefaults.distribution,
    distributionLabel: roiDistributionLabel(spatialDefaults.distribution),
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
    time: t,
    sampleFieldConfig: sampleFieldConfigForDemo({
      distribution: spatialDefaults.distribution,
      timeMode: normalizedTimeMode,
      spatialPattern: spatialDefaults.sampleSpatialPattern,
      temporalBehavior: effectiveTemporalBehavior,
      hotspotCount: clusterCount,
      evolutionModel: normalizedEvolutionModel,
      spatialEvolution: normalizedSpatialEvolution,
      dynamicComplexity: normalizedDynamicComplexity,
      stateModel: normalizedStateModel,
      depletionMode: normalizedDepletionMode
    }),
    stats,
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
    uniform: 'uniformField',
    gradient: 'gradientField',
    singleHotspot: 'clusteredField',
    singleCluster: 'clusteredField',
    multiHotspot: 'clusteredField',
    multipleClusters: 'clusteredField',
    bimodal: 'clusteredField',
    channelCorridor: 'linearBand',
    plume: 'frontBoundary',
    randomTexture: 'randomTexture',
    gaussianHotspots: 'clusteredField',
    clusteredHotspots: 'clusteredField',
    sparseTargets: 'sparseTargets',
    ridgeCorridor: 'linearBand',
    bimodalHotspots: 'clusteredField',
    movingHotspot: 'clusteredField',
    burstyBloom: 'clusteredField',
    nonuniformRandom: 'patchyField'
  };
  return aliases[value] ?? 'clusteredField';
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
    priorAgnostic: 'stationary',
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

export function normalizeRoiDemoStateModel(value = 'stateEvolving') {
  const aliases = {
    priorAgnostic: 'timeIndexed',
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
    seasonal: 'Seasonal / Long Cycle',
    randomPulses: 'Random Pulses',
    intermittent: 'Intermittent Activity'
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

export function roiPureSpatialPatternLabel(value) {
  return {
    uniformField: 'Uniform Field',
    gradientField: 'Gradient / Trend',
    clusteredField: 'Clustered Field',
    singleCluster: 'Clustered Field',
    multipleClusters: 'Clustered Field',
    patchyField: 'Patchy / Correlated Field',
    sparseTargets: 'Sparse Targets',
    linearBand: 'Linear Band',
    frontBoundary: 'Front / Boundary',
    edgeBand: 'Edge Band',
    coastalBand: 'Edge Band',
    monitoringStations: 'Monitoring Stations',
    randomTexture: 'Random Texture'
  }[value] ?? 'Clustered Field';
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
    uniformField: { distribution: 'uniformRandom', sampleSpatialPattern: 'uniform', clusterCount: 1 },
    gradientField: { distribution: 'gradientFront', sampleSpatialPattern: 'gradient', clusterCount: 1 },
    clusteredField: { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 3 },
    singleCluster: { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 1 },
    multipleClusters: { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 3 },
    patchyField: { distribution: 'clusteredHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 4 },
    sparseTargets: { distribution: 'sparseTargets', sampleSpatialPattern: 'multiHotspot', clusterCount: 5 },
    frontBoundary: { distribution: 'gradientFront', sampleSpatialPattern: 'gradient', clusterCount: 2 },
    linearBand: { distribution: 'ridgeCorridor', sampleSpatialPattern: 'coastalBand', clusterCount: 2 },
    edgeBand: { distribution: 'ridgeCorridor', sampleSpatialPattern: 'coastalBand', clusterCount: 2 },
    coastalBand: { distribution: 'ridgeCorridor', sampleSpatialPattern: 'coastalBand', clusterCount: 2 },
    monitoringStations: { distribution: 'sparseTargets', sampleSpatialPattern: 'multiHotspot', clusterCount: 6 },
    randomTexture: { distribution: 'nonuniformRandom', sampleSpatialPattern: 'randomTexture', clusterCount: 4 }
  }[pattern] ?? { distribution: 'gaussianHotspots', sampleSpatialPattern: 'multiHotspot', clusterCount: 3 };
}

function pureSpatialPatternFromDistribution(distribution) {
  return {
    uniformRandom: 'uniformField',
    gaussianHotspots: 'clusteredField',
    clusteredHotspots: 'patchyField',
    gradientFront: 'gradientField',
    sparseTargets: 'sparseTargets',
    ridgeCorridor: 'linearBand',
    bimodalHotspots: 'clusteredField',
    movingHotspot: 'clusteredField',
    burstyBloom: 'clusteredField',
    currentAdvectedPlume: 'frontBoundary',
    nonuniformRandom: 'randomTexture'
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
    distribution: defaults.distribution
  };
}

export { sampleSpatialPatternLabel, sampleTemporalBehaviorLabel };

function buildDistribution({ distribution, rng, seed, width, height, hotspotCount, clusterSize, noise, timeMode, spatialPattern, temporalBehavior, forecastView, time }) {
  if (distribution === 'uniformRandom') return withNoise(createUniformRandom(width, height, rng), rng, noise * 0.35);
  if (distribution === 'clusteredHotspots') {
    return withNoise(generateROI(width, height, time, {
      roiPattern: 'clustered',
      temporalHotspots: timeMode === 'dynamic',
      hotspots: scaleHotspotRadii(createHotspots(width, height, hotspotCount, 'clustered', rng), clusterSize)
    }), rng, noise);
  }
  if (distribution === 'gradientFront') return createGradientFront({ width, height, rng, noise, time });
  if (distribution === 'sparseTargets') return createSparseTargets({ width, height, rng, hotspotCount, noise, time });
  if (distribution === 'ridgeCorridor') return createRidgeCorridor({ width, height, rng, noise, time });
  const sampleFieldConfig = sampleFieldConfigForDemo({ distribution, timeMode, spatialPattern, temporalBehavior, hotspotCount });
  const generated = generateROI(width, height, time, {
    seed,
    sampleFieldSeed: `${seed}:${distribution}:sample-field`,
    sampleFieldConfig,
    temporalHotspots: timeMode === 'dynamic',
    currentFrame: makeDemoCurrentFrame(width, height, time),
    hotspots: scaleHotspotRadii(createHotspots(width, height, hotspotCount, legacyPattern(sampleFieldConfig), createSeededRng(`${seed}:sample-hotspots:${hotspotCount}`)), clusterSize)
  });
  const viewAdjusted = applyForecastView(generated, forecastView, seed, time);
  return withNoise(viewAdjusted, rng, noise);
}

function sampleFieldConfigForDemo({ distribution, timeMode, spatialPattern, temporalBehavior, hotspotCount, evolutionModel, spatialEvolution, dynamicComplexity, stateModel, depletionMode }) {
  const defaults = distributionToSampleConfig(distribution);
  const selectedTemporal = timeMode === 'dynamic'
    ? temporalBehavior ?? defaults.temporalBehavior
    : 'static';
  const complexity = normalizeRoiDemoDynamicComplexity(dynamicComplexity);
  return normalizeSampleFieldConfig({
    ...defaults,
    spatialPattern: spatialPattern ?? defaults.spatialPattern,
    temporalBehavior: selectedTemporal,
    stateModel,
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
  if (pattern === 'periodic' || pattern === 'seasonal') return 'periodic';
  if (pattern === 'randomPulses') return 'nonuniformRandom';
  if (pattern === 'intermittent') return 'markovNeighbor';
  if (spatialEvolution === 'neighborPropagation') return 'markovNeighbor';
  return pattern === 'bursty' ? 'bursty' : 'periodic';
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

function sampleBehaviorMetadata({ temporalPattern, spatialEvolution, stateModel: selectedStateModel, dynamicComplexity, time }) {
  const stateModel = normalizeRoiDemoStateModel(selectedStateModel ?? roiStateModelForEvolutionModel(spatialEvolution));
  const cycle = temporalPattern === 'seasonal' ? 72 : temporalPattern === 'intermittent' ? 18 : 24;
  const phase = positiveModulo(time, cycle) / cycle;
  return {
    temporalPattern,
    evolutionModel: spatialEvolution,
    spatialEvolution,
    spatialEvolutionLabel: roiSpatialEvolutionLabel(spatialEvolution),
    dynamicComplexity,
    stateModel,
    stateModelLabel: roiStateModelLabel(stateModel),
    stateModelDescription: roiStateModelDescription(stateModel),
    priorMode: stateModel,
    burstPhase: burstPhaseLabel(phase),
    neighborInfluence: spatialEvolution === 'neighborPropagation' ? dynamicComplexity : 'off',
    explanation: spatialEvolutionDescription(spatialEvolution)
  };
}

function applyEvolutionModel(field, { seed, time, timeMode, temporalPattern, spatialEvolution, dynamicComplexity }) {
  if (timeMode !== 'dynamic') return field;
  const complexityScale = complexityValue(dynamicComplexity, 0.65, 1, 1.35);
  const temporalEnvelope = temporalEnvelopeForPattern(temporalPattern, time, seed);
  let evolved = field.map((row) => row.map((value) => clamp01(value * temporalEnvelope)));
  if (spatialEvolution === 'stationary') return evolved.map((row) => row.map(round3));
  if (spatialEvolution === 'continuousDrift') {
    const dx = Math.sin(time * 0.13) * 0.14 * complexityScale;
    const dy = Math.cos(time * 0.1) * 0.1 * complexityScale;
    return shiftField(evolved, dx, dy);
  }
  if (spatialEvolution === 'discreteJump') {
    const cycle = temporalPattern === 'bursty' ? 24 : temporalPattern === 'intermittent' ? 18 : 16;
    const jumpIndex = Math.floor(Math.max(0, time) / cycle);
    const dx = (seededUnitLike(`${seed}:jump-x:${jumpIndex}`) - 0.5) * 0.72 * complexityScale;
    const dy = (seededUnitLike(`${seed}:jump-y:${jumpIndex}`) - 0.5) * 0.54 * complexityScale;
    return shiftField(evolved, dx, dy);
  }
  if (spatialEvolution === 'randomWalk') {
    const step = Math.floor(Math.max(0, time) / 3);
    let dx = 0;
    let dy = 0;
    for (let index = 0; index <= step; index += 1) {
      dx += (seededUnitLike(`${seed}:walk-x:${index}`) - 0.5) * 0.035 * complexityScale;
      dy += (seededUnitLike(`${seed}:walk-y:${index}`) - 0.5) * 0.028 * complexityScale;
    }
    return shiftField(evolved, clampRange(dx, -0.26, 0.26), clampRange(dy, -0.22, 0.22));
  }
  if (spatialEvolution === 'neighborPropagation') {
    const activated = diffuseField(evolved, complexityValue(dynamicComplexity, 0.12, 0.2, 0.3));
    return evolved.map((row, y) => row.map((value, x) => {
      const block = seededUnitLike(`${seed}:activation:${Math.floor(x / 3)}:${Math.floor(y / 3)}:${Math.floor(time / 4)}`);
      return round3(clamp01(value * 0.7 + activated[y][x] * 0.28 + (block > 0.62 ? 0.16 * complexityScale : 0)));
    }));
  }
  return evolved.map((row) => row.map(round3));
}

function applySampleDisplayMode(field, { seed, time, depletionMode, displayMode, dynamicComplexity }) {
  const normalizedDepletion = normalizeRoiDemoDepletionMode(depletionMode);
  const normalizedDisplay = normalizeRoiDemoDisplayMode(displayMode);
  if (normalizedDisplay === 'freshnessRevisitValue' || normalizedDepletion === 'freshnessAge') return createFreshnessField(field, { seed, time, dynamicComplexity });
  if (normalizedDisplay === 'rawBaseValue' || normalizedDepletion === 'none') return field.map((row) => row.map(round3));
  const complexityScale = complexityValue(dynamicComplexity, 0.85, 1, 1.18);
  const depleted = field.map((row, y) => row.map((value, x) => {
    const centerX = 0.3 + 0.22 * Math.sin(time * 0.12);
    const centerY = 0.54 + 0.1 * Math.cos(time * 0.09);
    const nx = field[0]?.length > 1 ? x / (field[0].length - 1) : 0;
    const ny = field.length > 1 ? y / (field.length - 1) : 0;
    const d2 = (nx - centerX) ** 2 + (ny - centerY) ** 2;
    const neighborhood = Math.exp(-d2 / (2 * 0.07 ** 2));
    const sampled = seededUnitLike(`${seed}:demo-sampled:${Math.floor(x / 3)}:${Math.floor(y / 3)}`) > 0.48 ? 1 : 0;
    const recovery = 0.5 + 0.5 * Math.sin(time * 0.11 + seededUnitLike(`${seed}:recovery-phase:${x}:${y}`) * Math.PI * 2);
    let multiplier = 1;
    if (normalizedDepletion === 'hard') multiplier = sampled ? 0.12 : 1 - neighborhood * 0.35;
    if (normalizedDepletion === 'soft') multiplier = 1 - Math.max(sampled * 0.42, neighborhood * 0.28) * complexityScale;
    if (normalizedDepletion === 'neighborhood') multiplier = 1 - Math.max(sampled * 0.34, neighborhood * 0.62) * complexityScale;
    if (normalizedDepletion === 'revisitRecovery') multiplier = 0.52 + recovery * 0.48;
    return round3(clamp01(value * multiplier));
  }));
  if (normalizedDisplay === 'depletedValue') return depleted;
  return field.map((row, y) => row.map((value, x) => round3(clamp01(value * 0.78 + depleted[y][x] * 0.22))));
}

function createFreshnessField(field, { seed, time, dynamicComplexity }) {
  const complexityScale = complexityValue(dynamicComplexity, 0.8, 1, 1.25);
  return field.map((row, y) => row.map((_value, x) => {
    const agePhase = 0.5 + 0.5 * Math.sin(time * 0.09 + seededUnitLike(`${seed}:freshness-phase:${x}:${y}`) * Math.PI * 2);
    const recentlySampled = seededUnitLike(`${seed}:freshness-sampled:${Math.floor(x / 3)}:${Math.floor(y / 3)}`) > 0.54 ? 1 : 0;
    const localRecovery = clamp01(agePhase * complexityScale);
    return round3(clamp01(recentlySampled ? localRecovery * 0.42 : 0.35 + localRecovery * 0.65));
  }));
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

function spatialEvolutionDescription(value) {
  return {
    stationary: 'The pattern changes intensity but stays in the same location.',
    continuousDrift: 'The feature moves smoothly through nearby/intermediate locations.',
    discreteJump: 'The active feature can fade and reappear elsewhere on the next burst or window.',
    randomWalk: 'The feature wanders by small seeded local steps over time.',
    neighborPropagation: 'Active cells influence nearby cells, spreading activity locally.'
  }[value] ?? 'The pattern changes intensity but stays in the same location.';
}

function temporalEnvelopeForPattern(pattern, time, seed) {
  if (pattern === 'static') return 1;
  if (pattern === 'sustained') return 0.78 + 0.12 * Math.sin(time * 0.08);
  if (pattern === 'periodic') return 0.56 + 0.5 * (0.5 + 0.5 * Math.sin(time * 0.32));
  if (pattern === 'seasonal') return 0.5 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.075));
  if (pattern === 'randomPulses') {
    const pulse = seededUnitLike(`${seed}:pulse:${Math.floor(time / 3)}`);
    return pulse > 0.58 ? 1.12 : 0.42 + pulse * 0.22;
  }
  if (pattern === 'intermittent') {
    return seededUnitLike(`${seed}:intermittent:${Math.floor(time / 5)}`) > 0.42 ? 0.98 : 0.28;
  }
  const cycle = 24;
  const centered = Math.min(positiveModulo(time - 8, cycle), positiveModulo(8 - time, cycle));
  return 0.24 + 1.12 * Math.exp(-(centered ** 2) / (2 * 3.2 ** 2));
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

function createUniformRandom(width, height, rng) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => round3(rng())));
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

function createSparseTargets({ width, height, rng, hotspotCount, noise, time }) {
  const targets = Array.from({ length: Math.max(3, hotspotCount * 2) }, (_, index) => ({
    x: rng() * Math.max(1, width - 1),
    y: rng() * Math.max(1, height - 1),
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

function withNoise(field, rng, noise) {
  const amount = clamp01(noise);
  if (amount <= 0) return field;
  return field.map((row) => row.map((value) => round3(clamp01(Number(value) + (rng() - 0.5) * amount))));
}

function summarizeField(field) {
  const values = field.flat().map(Number);
  const count = Math.max(1, values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
  return {
    min: round3(min),
    max: round3(max),
    mean: round3(mean),
    stdDev: round3(Math.sqrt(variance)),
    totalValue: round3(values.reduce((sum, value) => sum + value, 0))
  };
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
