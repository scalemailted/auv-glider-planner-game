export const SAMPLE_FIELD_MODES = ['static', 'dynamic'];
export const SAMPLE_OBJECTIVE_MODELS = ['coverage', 'hotspot', 'tracking', 'uncertainty', 'mixed'];
export const SAMPLE_SPATIAL_PATTERNS = [
  'uniform',
  'gradient',
  'singleHotspot',
  'multiHotspot',
  'bimodal',
  'coastalBand',
  'channelCorridor',
  'plume',
  'randomTexture'
];
export const SAMPLE_TEMPORAL_BEHAVIORS = [
  'static',
  'periodic',
  'bursty',
  'moving',
  'diffusive',
  'currentAdvected',
  'uniformRandom',
  'nonuniformRandom',
  'markovNeighbor'
];
export const SAMPLE_STATE_MODELS = ['timeIndexed', 'stateEvolving', 'historyAware'];
export const SAMPLE_DISTRIBUTIONS = ['uniform', 'gaussian', 'bimodal', 'multimodal', 'heavyTail', 'clustered'];

export function createDefaultSampleFieldConfig(mode = 'perfectKnowledge') {
  const stochastic = mode === 'forecast';
  return normalizeSampleFieldConfig({
    mode: 'dynamic',
    objectiveModel: stochastic ? 'uncertainty' : 'mixed',
    spatialPattern: stochastic ? 'plume' : 'bimodal',
    temporalBehavior: stochastic ? 'currentAdvected' : 'moving',
    distribution: stochastic ? 'multimodal' : 'bimodal',
    spatialCorrelation: {
      enabled: true,
      radiusCells: stochastic ? 4 : 3,
      anisotropy: stochastic ? 'currentAligned' : 'none'
    },
    neighborInfluence: {
      enabled: stochastic,
      diffusionRate: stochastic ? 0.14 : 0.08,
      growthRate: stochastic ? 0.05 : 0.03,
      decayRate: stochastic ? 0.035 : 0.02
    },
    currentCoupling: {
      enabled: stochastic,
      advectionStrength: stochastic ? 0.7 : 0.35
    },
    stochasticity: {
      forecastNoise: stochastic ? 'medium' : 'low',
      truthVariation: stochastic ? 'medium' : 'low',
      uncertaintyGrowth: stochastic ? 'moderate' : 'slow'
    },
    depletion: {
      mode: 'soft',
      radiusCells: 1,
      recoveryRate: 0
    }
  }, { mode });
}

export function normalizeSampleFieldConfig(config = {}, { mode = 'perfectKnowledge', roiHotspots = 4 } = {}) {
  const source = config && typeof config === 'object' ? config : {};
  const stochastic = mode === 'forecast';
  const normalized = {
    mode: normalizeChoice(source.mode, SAMPLE_FIELD_MODES, 'dynamic'),
    objectiveModel: normalizeChoice(source.objectiveModel, SAMPLE_OBJECTIVE_MODELS, stochastic ? 'uncertainty' : 'mixed'),
    spatialPattern: normalizeChoice(source.spatialPattern, SAMPLE_SPATIAL_PATTERNS, source.distribution === 'bimodal' ? 'bimodal' : 'multiHotspot'),
    temporalBehavior: normalizeChoice(source.temporalBehavior, SAMPLE_TEMPORAL_BEHAVIORS, source.mode === 'static' ? 'static' : 'moving'),
    stateModel: null,
    distribution: normalizeChoice(source.distribution, SAMPLE_DISTRIBUTIONS, source.spatialPattern === 'bimodal' ? 'bimodal' : 'multimodal'),
    hotspotCount: clampInt(source.hotspotCount ?? roiHotspots, 1, 12),
    spatialCorrelation: {
      enabled: source.spatialCorrelation?.enabled !== false,
      radiusCells: clampNumber(source.spatialCorrelation?.radiusCells, 0.5, 12, 3),
      anisotropy: normalizeChoice(source.spatialCorrelation?.anisotropy, ['none', 'currentAligned', 'shorelineAligned'], 'none')
    },
    neighborInfluence: {
      enabled: Boolean(source.neighborInfluence?.enabled),
      diffusionRate: clampNumber(source.neighborInfluence?.diffusionRate, 0, 1, 0.12),
      growthRate: clampNumber(source.neighborInfluence?.growthRate, 0, 1, 0.04),
      decayRate: clampNumber(source.neighborInfluence?.decayRate, 0, 1, 0.03)
    },
    currentCoupling: {
      enabled: Boolean(source.currentCoupling?.enabled),
      advectionStrength: clampNumber(source.currentCoupling?.advectionStrength, 0, 2, 0.6)
    },
    stochasticity: {
      forecastNoise: normalizeChoice(source.stochasticity?.forecastNoise, ['none', 'low', 'medium', 'high'], stochastic ? 'medium' : 'low'),
      truthVariation: normalizeChoice(source.stochasticity?.truthVariation, ['none', 'low', 'medium', 'high'], stochastic ? 'medium' : 'low'),
      uncertaintyGrowth: normalizeChoice(source.stochasticity?.uncertaintyGrowth, ['none', 'slow', 'moderate', 'fast'], stochastic ? 'moderate' : 'slow')
    },
    depletion: {
      mode: normalizeChoice(source.depletion?.mode, ['none', 'hard', 'soft', 'informationGain'], source.depletion?.mode ?? 'soft'),
      radiusCells: clampNumber(source.depletion?.radiusCells, 0, 8, 1),
      recoveryRate: clampNumber(source.depletion?.recoveryRate, 0, 1, 0)
    }
  };
  if (normalized.mode === 'static') normalized.temporalBehavior = 'static';
  if (normalized.temporalBehavior !== 'static') normalized.mode = 'dynamic';
  normalized.stateModel = normalizeStateModel(source.stateModel ?? source.stateDependency ?? source.dependencyModel, normalized.temporalBehavior);
  return normalized;
}

export function normalizeStateModel(value, temporalBehavior = 'moving') {
  const aliases = {
    priorAgnostic: 'timeIndexed',
    priorIndependent: 'timeIndexed',
    memoryless: 'timeIndexed',
    timeIndexed: 'timeIndexed',
    evolutionary: 'stateEvolving',
    stateful: 'stateEvolving',
    markovian: 'stateEvolving',
    stateEvolving: 'stateEvolving',
    historyDependent: 'historyAware',
    historyAware: 'historyAware',
    nonMarkovian: 'historyAware'
  };
  if (aliases[value]) return aliases[value];
  if (temporalBehavior === 'static' || temporalBehavior === 'periodic' || temporalBehavior === 'moving' || temporalBehavior === 'uniformRandom' || temporalBehavior === 'nonuniformRandom') return 'timeIndexed';
  if (temporalBehavior === 'markovNeighbor' || temporalBehavior === 'diffusive') return 'stateEvolving';
  return 'stateEvolving';
}

export function sampleFieldConfigFromLegacyRoi(config = {}) {
  const pattern = config.roiPattern ?? 'multiple';
  const temporal = Boolean(config.temporalHotspots || pattern === 'moving');
  const spatialPattern = {
    single: 'singleHotspot',
    multiple: 'multiHotspot',
    clustered: 'multiHotspot',
    moving: 'multiHotspot',
    bimodal: 'bimodal',
    plume: 'plume'
  }[pattern] ?? 'multiHotspot';
  return normalizeSampleFieldConfig({
    mode: temporal ? 'dynamic' : 'static',
    objectiveModel: 'mixed',
    spatialPattern,
    temporalBehavior: pattern === 'moving' ? 'moving' : temporal ? 'periodic' : 'static',
    distribution: spatialPattern === 'bimodal' ? 'bimodal' : pattern === 'clustered' ? 'clustered' : 'multimodal',
    hotspotCount: config.roiHotspots,
    spatialCorrelation: { enabled: true, radiusCells: 3, anisotropy: 'none' },
    neighborInfluence: { enabled: temporal, diffusionRate: 0.08, growthRate: 0.03, decayRate: 0.02 },
    currentCoupling: { enabled: false, advectionStrength: 0.35 }
  }, { roiHotspots: config.roiHotspots });
}

export function sampleTemporalBehaviorLabel(value) {
  return {
    static: 'Static',
    periodic: 'Periodic',
    bursty: 'Bursty Bloom',
    moving: 'Moving Hotspot',
    diffusive: 'Diffusive',
    currentAdvected: 'Current-Advected',
    uniformRandom: 'Uniform Random',
    nonuniformRandom: 'Nonuniform Random',
    markovNeighbor: 'Neighbor-Coupled'
  }[value] ?? value;
}

export function sampleSpatialPatternLabel(value) {
  return {
    uniform: 'Uniform',
    gradient: 'Gradient',
    singleHotspot: 'Single Hotspot',
    multiHotspot: 'Multi Hotspot',
    bimodal: 'Bimodal',
    coastalBand: 'Coastal Band',
    channelCorridor: 'Channel Corridor',
    plume: 'Plume',
    randomTexture: 'Random Texture'
  }[value] ?? value;
}

function normalizeChoice(value, choices, fallback) {
  return choices.includes(value) ? value : fallback;
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
