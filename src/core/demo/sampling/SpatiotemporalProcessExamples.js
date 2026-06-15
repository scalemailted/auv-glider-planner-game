import {
  ROI_REFERENCE_SIGNATURES,
  referenceSignatureById,
  referenceSignatureMetadata
} from '../roi/RoiReferenceSignatures.js';

export const SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS = [
  { id: 'foundationalCaModels', label: 'Foundational CA Models' },
  { id: 'oceanRelevantProcessAnalogs', label: 'Ocean-Relevant Process Analogs' }
];

export const SPATIOTEMPORAL_PROCESS_EXAMPLE_TYPES = [
  'foundationalCaModel',
  'oceanProcessAnalog',
  'observableProcessPattern'
];

export const OBSERVABLE_PROCESS_PATTERN_TAGS = ['propagatingFront', 'excitableWave', 'localBirthDeath', 'recurrentHotspot', 'diffusiveSpread', 'directedFeatureTransport', 'cyclicDominance', 'domainFormation', 'thresholdCascade', 'interactingPopulation', 'freshnessRecovery', 'morphogenesis', 'congestionWave', 'structuredSignal'];

const FLOW_BOUNDARY_NOTE = 'This analog represents the event/process layer only. Physical current-driven advection belongs in the Flow Fields and Coupled Dynamic Sampling Space demos.';

export const FOUNDATIONAL_CA_MODELS = [
  foundationalCaModel({
    id: 'conwayGameOfLife',
    label: "Conway's Game of Life",
    modelFamily: 'lifeLikeCa',
    ruleFamilyId: 'localBirthDeath',
    referenceSignatureId: 'birthDeathEmergence',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'A classic local birth/death rule showing how simple neighbor counts create emergent structures.',
    canonicalRuleIdea: 'Live cells survive with two or three live neighbors; dead cells become live with exactly three live neighbors.',
    ruleStatement: [
      'A live cell survives with 2 or 3 live neighbors.',
      'A dead cell becomes live with exactly 3 live neighbors.',
      'Otherwise the cell is inactive.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), n_i(t)), where n_i(t) is the active Moore-neighborhood count.',
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    neighborhoodDefinition: 'Moore neighborhood: the eight adjacent cells around cell i.',
    teaches: ['local birth/death', 'emergence', 'oscillators', 'moving structures'],
    expectedPhenotype: 'Local patches appear, disappear, oscillate, or move from repeated neighbor-count updates.',
    relatedObservablePatterns: ['birthDeathEmergence', 'patternFormationMorphogenesis']
  }),
  foundationalCaModel({
    id: 'forestFire',
    label: 'Forest Fire',
    modelFamily: 'forestFireCa',
    ruleFamilyId: 'propagatingFront',
    referenceSignatureId: 'frontPropagation',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'Susceptible cells ignite near active cells, then transition into consumed or cooling states.',
    canonicalRuleIdea: 'Susceptible -> active -> consumed, with local spread at the active boundary.',
    ruleStatement: [
      'Susceptible cells activate near active neighbors.',
      'Active cells become consumed or cooling cells.',
      'Consumed cells form the trail behind the front.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), activeNeighborPressure_i(t), source_i)',
    globalUpdateFunction: 'X(t+1) = F(X(t), Source)',
    neighborhoodDefinition: 'Local edge or extended-neighborhood pressure around the active front.',
    teaches: ['front propagation', 'state transition trail', 'depletion behind activity'],
    expectedPhenotype: 'A moving boundary with active cells at the edge and lower-value consumed cells behind it.',
    relatedObservablePatterns: ['frontPropagation', 'avalancheBurstCascades']
  }),
  foundationalCaModel({
    id: 'sirEpidemicCa',
    label: 'SIR / Epidemic CA',
    modelFamily: 'epidemicCa',
    ruleFamilyId: 'diffusiveSpread',
    referenceSignatureId: 'diffusionSpread',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'A local spread model with susceptible, active/infected, and recovering state meanings.',
    canonicalRuleIdea: 'Susceptible cells activate from nearby active cells; active cells recover or become inactive.',
    ruleStatement: [
      'Susceptible cells can become active near active neighbors.',
      'Active cells move into recovery.',
      'Recovered cells reduce repeated activation for a time.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), infectedNeighborPressure_i(t), recovery_i(t))',
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    neighborhoodDefinition: 'Local graph-neighbor contact pressure.',
    teaches: ['local diffusion', 'activation pressure', 'recovery'],
    expectedPhenotype: 'Patchy activity spreads through nearby cells and leaves recovering regions.',
    relatedObservablePatterns: ['diffusionSpread', 'freshnessRecovery']
  }),
  foundationalCaModel({
    id: 'greenbergHastingsExcitableMedia',
    label: 'Greenberg-Hastings / Excitable Media',
    modelFamily: 'excitableMediaCa',
    ruleFamilyId: 'excitableWave',
    referenceSignatureId: 'waveExcitableMedia',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'Active waves are followed by refractory states and eventual recovery.',
    canonicalRuleIdea: 'Resting cells excite near active cells; active cells become refractory; refractory cells recover.',
    ruleStatement: [
      'Resting cells can activate near an active wave crest.',
      'Active cells become refractory.',
      'Refractory cells recover back to resting.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), excitedNeighborPressure_i(t), refractoryClock_i(t))',
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    neighborhoodDefinition: 'Local neighborhood around the wave crest.',
    teaches: ['waves', 'refractory memory', 'recovery cycles'],
    expectedPhenotype: 'Crests, quiet regions, and recovery trails move through the field.',
    relatedObservablePatterns: ['waveExcitableMedia']
  }),
  foundationalCaModel({
    id: 'sandpileAvalanche',
    label: 'Sandpile / Avalanche',
    modelFamily: 'thresholdCa',
    ruleFamilyId: 'thresholdCascade',
    referenceSignatureId: 'avalancheBurstCascades',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'Cells stay quiet until local accumulation crosses a threshold and cascades.',
    canonicalRuleIdea: 'Load accumulates, threshold crossing triggers active release, and neighbors receive pressure.',
    ruleStatement: [
      'Cells accumulate local pressure.',
      'A threshold crossing activates a release.',
      'Release can trigger nearby cells.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), load_i(t), neighborRelease_i(t), threshold_i)',
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    neighborhoodDefinition: 'Local transfer from triggered cells to adjacent cells.',
    teaches: ['thresholds', 'bursts', 'cascades'],
    expectedPhenotype: 'Mostly quiet fields interrupted by localized cascades or avalanche-like bursts.',
    relatedObservablePatterns: ['avalancheBurstCascades']
  }),
  foundationalCaModel({
    id: 'watorPredatorPrey',
    label: 'Wa-Tor / Predator-Prey',
    modelFamily: 'populationCa',
    ruleFamilyId: 'interactingPopulation',
    referenceSignatureId: 'predatorPreyMigration',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'Interacting populations create pursuit, migration, and cyclic patches.',
    canonicalRuleIdea: 'Population states move and interact locally, producing chasing or migration waves.',
    ruleStatement: [
      'Prey-like activity grows or moves locally.',
      'Predator-like activity follows or suppresses prey-like activity.',
      'Local interaction creates migration waves.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), preyPressure_i(t), predatorPressure_i(t))',
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    neighborhoodDefinition: 'Local population interaction support.',
    teaches: ['interacting populations', 'migration', 'cyclic pursuit'],
    expectedPhenotype: 'Moving patches and chasing waves rather than one static hotspot.',
    relatedObservablePatterns: ['predatorPreyMigration', 'cyclicDominance']
  }),
  foundationalCaModel({
    id: 'trafficCa',
    label: 'Traffic CA',
    modelFamily: 'trafficCa',
    ruleFamilyId: 'congestionWave',
    referenceSignatureId: 'congestionDensityWaves',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'Directed density movement creates jams, gaps, and release waves.',
    canonicalRuleIdea: 'Local occupancy and forward space determine directed movement and congestion.',
    ruleStatement: [
      'Occupied cells advance when downstream space is available.',
      'Blocked cells accumulate into congestion.',
      'Release creates moving density waves.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), upstreamDensity_i(t), downstreamCapacity_i(t))',
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    neighborhoodDefinition: 'Directed neighborhood along a route or corridor.',
    teaches: ['directed density', 'congestion', 'release waves'],
    expectedPhenotype: 'Bands of activity build up and then move along a direction.',
    relatedObservablePatterns: ['congestionDensityWaves', 'driftTransport']
  }),
  foundationalCaModel({
    id: 'wireworld',
    label: 'Wireworld',
    modelFamily: 'signalCa',
    ruleFamilyId: 'structuredSignal',
    referenceSignatureId: 'structuredSignalPropagation',
    implementationFidelity: 'simplifiedFamilyAnalog',
    shortDescription: 'Structured paths carry local activation signals through conductor-like regions.',
    canonicalRuleIdea: 'Head, tail, conductor, and empty states create directed signal propagation.',
    ruleStatement: [
      'Signal-head states advance along structured paths.',
      'Signal-tail states recover into conductor-like cells.',
      'Inactive space blocks the signal.'
    ],
    localUpdateFunction: 'x_i(t+1) = f(x_i(t), signalNeighbor_i(t), conductor_i)',
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    neighborhoodDefinition: 'Structured local path or graph-neighbor support.',
    teaches: ['signal propagation', 'path constraints', 'state transitions'],
    expectedPhenotype: 'Activity follows structured paths rather than filling the full domain.',
    relatedObservablePatterns: ['structuredSignalPropagation']
  })
];

export const OCEAN_RELEVANT_PROCESS_ANALOGS = [
  oceanProcessAnalog({ id: 'bloomGrowthDecay', label: 'Bloom Growth / Decay', ruleFamilyId: 'morphogenesis', referenceSignatureId: 'patternFormationMorphogenesis', requiresFlowCoupling: false, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Bloom growth and decay', underlyingCaMechanism: 'morphogenesis + diffusive spread', observableProcessPatternTags: ['morphogenesis', 'diffusiveSpread'], relatedFoundationalModels: ["Conway's Game of Life"], recommendedSamplingStrategy: 'Sample high region, boundary, and stale/revisit zones.', missingScienceLayers: ['chlorophyll sensor model', 'advection for drifting bloom realism'] }),
  oceanProcessAnalog({ id: 'riverPlumeFront', label: 'River Plume Front', ruleFamilyId: 'propagatingFront', referenceSignatureId: 'frontPropagation', requiresFlowCoupling: true, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Coastal plume boundary', underlyingCaMechanism: 'propagating front + diffusive spread', observableProcessPatternTags: ['propagatingFront', 'diffusiveSpread'], relatedFoundationalModels: ['Forest Fire', 'SIR / Epidemic CA'], recommendedSamplingStrategy: 'Sample boundary/front, cross-plume transects, and uncertain threshold regions.', missingScienceLayers: ['river discharge', 'salinity sensor model', 'current-driven advection'] }),
  oceanProcessAnalog({ id: 'oilChemicalPlume', label: 'Oil / Chemical Plume', ruleFamilyId: 'diffusiveSpread', referenceSignatureId: 'diffusionSpread', requiresFlowCoupling: true, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Contaminant plume', underlyingCaMechanism: 'diffusive spread + directed feature transport preview', observableProcessPatternTags: ['diffusiveSpread', 'directedFeatureTransport'], relatedFoundationalModels: ['SIR / Epidemic CA'], recommendedSamplingStrategy: 'Detect plume, cross-section it, then move up-current/source-seeking in the coupled demo.', missingScienceLayers: ['chemistry', 'source term', 'current advection'] }),
  oceanProcessAnalog({ id: 'thermoclineWaterMassBoundary', label: 'Thermocline / Water-Mass Boundary', ruleFamilyId: 'domainFormation', referenceSignatureId: 'clusterFormation', requiresFlowCoupling: true, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Layer or water-mass boundary', underlyingCaMechanism: 'domain formation + propagating front', observableProcessPatternTags: ['domainFormation', 'propagatingFront'], relatedFoundationalModels: ['Forest Fire'], recommendedSamplingStrategy: 'Sample the high-gradient boundary, not just the strongest cell.', missingScienceLayers: ['depth', 'temperature/salinity profile'] }),
  oceanProcessAnalog({ id: 'eddyTrappedPatch', label: 'Eddy-Trapped Patch', ruleFamilyId: 'recurrentHotspot', referenceSignatureId: 'stationaryTemporalBursts', requiresFlowCoupling: true, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Retained patch near an eddy', underlyingCaMechanism: 'recurrent hotspot + directed transport preview', observableProcessPatternTags: ['recurrentHotspot', 'directedFeatureTransport'], relatedFoundationalModels: ['Traffic CA'], recommendedSamplingStrategy: 'Sample around retained patch and eddy perimeter in the coupled demo.', missingScienceLayers: ['vorticity', 'current field', 'particle retention model'] }),
  oceanProcessAnalog({ id: 'shorelineRunoffPulse', label: 'Shoreline Runoff Pulse', ruleFamilyId: 'thresholdCascade', referenceSignatureId: 'avalancheBurstCascades', requiresFlowCoupling: true, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Episodic coastal discharge', underlyingCaMechanism: 'threshold cascade + propagating front', observableProcessPatternTags: ['thresholdCascade', 'propagatingFront'], relatedFoundationalModels: ['Forest Fire', 'Sandpile / Avalanche'], recommendedSamplingStrategy: 'Sample river-mouth/source region, downstream gradient, and boundary.', missingScienceLayers: ['rainfall forcing', 'coastal currents'] }),
  oceanProcessAnalog({ id: 'hydrothermalDeepSourcePlume', label: 'Hydrothermal / Deep Source Plume', ruleFamilyId: 'recurrentHotspot', referenceSignatureId: 'stationaryTemporalBursts', requiresFlowCoupling: true, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Deep source plume', underlyingCaMechanism: 'recurrent stationary hotspot + diffusive spread', observableProcessPatternTags: ['recurrentHotspot', 'diffusiveSpread'], relatedFoundationalModels: ['SIR / Epidemic CA'], recommendedSamplingStrategy: 'Source confirmation, vertical/depth profile, and up-gradient search.', missingScienceLayers: ['depth', 'source term', 'chemical/thermal sensor model'] }),
  oceanProcessAnalog({ id: 'turbidityEvent', label: 'Turbidity Event', ruleFamilyId: 'thresholdCascade', referenceSignatureId: 'avalancheBurstCascades', requiresFlowCoupling: true, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Sediment/turbidity pulse', underlyingCaMechanism: 'threshold cascade + diffusive spread', observableProcessPatternTags: ['thresholdCascade', 'diffusiveSpread'], relatedFoundationalModels: ['Sandpile / Avalanche'], recommendedSamplingStrategy: 'Sample after pulse, map spread, and validate forecast.', missingScienceLayers: ['sediment settling', 'bottom resuspension'] }),
  oceanProcessAnalog({ id: 'hypoxiaRecoveryZone', label: 'Hypoxia / Recovery Zone', ruleFamilyId: 'freshnessRecovery', referenceSignatureId: 'freshnessRecovery', requiresFlowCoupling: false, requiresUncertaintyForMissionRealism: true, environmentalProcess: 'Low-oxygen recovery monitoring', underlyingCaMechanism: 'freshness recovery + domain formation', observableProcessPatternTags: ['freshnessRecovery', 'domainFormation'], relatedFoundationalModels: ['Voter / Majority Rule'], recommendedSamplingStrategy: 'Revisit monitoring, recovery tracking, and stale-region sampling.', missingScienceLayers: ['oxygen dynamics', 'depth profile'] }),
  oceanProcessAnalog({ id: 'persistentMonitoringFreshnessField', label: 'Persistent Monitoring / Freshness Field', ruleFamilyId: 'freshnessRecovery', referenceSignatureId: 'freshnessRecovery', requiresFlowCoupling: false, requiresUncertaintyForMissionRealism: false, environmentalProcess: 'Age-of-information / revisit value', underlyingCaMechanism: 'freshness recovery', observableProcessPatternTags: ['freshnessRecovery'], relatedFoundationalModels: ['Wireworld'], recommendedSamplingStrategy: 'Revisit stale high-importance regions.', missingScienceLayers: ['mission path history', 'sensor quality model'] })
];

export const OBSERVABLE_PROCESS_PATTERNS = ROI_REFERENCE_SIGNATURES.map((signature) => observablePatternFromSignature(signature));

export const SPATIOTEMPORAL_PROCESS_EXAMPLES = [
  ...FOUNDATIONAL_CA_MODELS,
  ...OCEAN_RELEVANT_PROCESS_ANALOGS,
  ...OBSERVABLE_PROCESS_PATTERNS
];

export function normalizeSpatiotemporalProcessExampleTrack(value) {
  const id = String(value ?? '').trim();
  return SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS.some((track) => track.id === id) ? id : 'foundationalCaModels';
}

export function spatiotemporalProcessExampleTrackLabel(track) {
  const id = normalizeSpatiotemporalProcessExampleTrack(track);
  return SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS.find((entry) => entry.id === id)?.label ?? 'Foundational CA Models';
}

export function spatiotemporalProcessExampleTrackForMode(mode = 'foundationalCaModels') {
  const value = String(mode ?? '').trim();
  if (value === 'oceanProcessAnalogs' || value === 'oceanRelevantProcessAnalogs') return 'oceanRelevantProcessAnalogs';
  if (value === 'foundationalCaModels' || value === 'referenceSignature' || value === 'exampleProcesses') return 'foundationalCaModels';
  return null;
}

export function processModeForSpatiotemporalProcessExampleTrack(track = 'foundationalCaModels') {
  return normalizeSpatiotemporalProcessExampleTrack(track) === 'oceanRelevantProcessAnalogs'
    ? 'oceanProcessAnalogs'
    : 'foundationalCaModels';
}

export function spatiotemporalProcessExamplesByTrack(track) {
  const id = normalizeSpatiotemporalProcessExampleTrack(track);
  return SPATIOTEMPORAL_PROCESS_EXAMPLES.filter((example) => example.track === id);
}

export function spatiotemporalProcessExampleById(id, track = null) {
  if (isNoProcessExampleId(id)) return null;
  const normalized = normalizeSpatiotemporalProcessExampleId(id, track);
  const candidates = track ? spatiotemporalProcessExamplesByTrack(track) : SPATIOTEMPORAL_PROCESS_EXAMPLES;
  return candidates.find((example) => example.id === normalized) ?? null;
}

export function normalizeSpatiotemporalProcessExampleId(id = 'birthDeathEmergence', track = null) {
  if (isNoProcessExampleId(id)) return null;
  const value = String(id ?? '');
  const candidates = track ? spatiotemporalProcessExamplesByTrack(track) : SPATIOTEMPORAL_PROCESS_EXAMPLES;
  const exact = candidates.find((example) => example.id === value);
  if (exact) return exact.id;
  const alias = candidates.find((example) => example.aliases?.includes(value));
  if (alias) return alias.id;
  if (!track) {
    const any = SPATIOTEMPORAL_PROCESS_EXAMPLES.find((example) => example.id === value || example.aliases?.includes(value));
    if (any) return any.id;
    const reference = referenceSignatureById(value);
    if (reference) return reference.id;
    return 'conwayGameOfLife';
  }
  return spatiotemporalProcessExamplesByTrack(track)[0]?.id ?? 'conwayGameOfLife';
}

export function spatiotemporalProcessExampleLabel(id) {
  return spatiotemporalProcessExampleById(id)?.label ?? "Conway's Game of Life";
}

export function spatiotemporalProcessExamplesByType(type) {
  return SPATIOTEMPORAL_PROCESS_EXAMPLES.filter((example) => example.exampleType === type);
}

export function spatiotemporalProcessExampleOptions() {
  return [
    { type: 'foundationalCaModel', label: 'Foundational CA Models', options: spatiotemporalProcessExampleOptionsByTrack('foundationalCaModels') },
    { type: 'oceanProcessAnalog', label: 'Ocean-Relevant Process Analogs', options: spatiotemporalProcessExampleOptionsByTrack('oceanRelevantProcessAnalogs') }
  ];
}

export function spatiotemporalProcessExampleOptionsByTrack(track) {
  return spatiotemporalProcessExamplesByTrack(track).map((example) => ({
    id: example.id, label: example.label, track: example.track, exampleType: example.exampleType, referenceSignatureId: example.referenceSignatureId
  }));
}

export function processExampleTypeLabel(type) {
  return {
    foundationalCaModel: 'Foundational CA Model',
    oceanProcessAnalog: 'Ocean-Relevant Process Analog',
    observableProcessPattern: 'Observable Process Pattern'
  }[type] ?? 'Process Examples';
}

export function processExampleCoverageMatrix() {
  return SPATIOTEMPORAL_PROCESS_EXAMPLES.map((example) => ({
    id: example.id,
    label: example.label,
    track: example.track,
    exampleType: example.exampleType,
    ruleFamilyId: example.ruleFamilyId,
    referenceSignatureId: example.referenceSignatureId,
    implementationFidelity: example.implementationFidelity,
    hasRuleStatement: Array.isArray(example.ruleStatement) && example.ruleStatement.length > 0,
    hasLocalUpdateFunction: Boolean(example.localUpdateFunction),
    hasQaExpectations: Boolean(example.qaExpectations),
    observableProcessPatternTags: example.observableProcessPatternTags ?? [],
    relatedFoundationalModels: example.relatedFoundationalModels ?? [],
    relatedOceanAnalogs: example.relatedOceanAnalogs ?? [],
    relatedObservablePatterns: example.relatedObservablePatterns ?? []
  }));
}

export const spatiotemporalProcessExampleCoverageMatrix = processExampleCoverageMatrix;

export function spatiotemporalProcessExampleToRecipe(id) {
  const example = spatiotemporalProcessExampleById(id);
  if (!example) return null;
  return { ...example.componentDefaults, processMode: processModeForSpatiotemporalProcessExampleTrack(example.track), patternSource: 'referenceSignature', referenceSignatureId: example.referenceSignatureId, exampleTrack: example.track, exampleProcessId: example.id, exampleProcessLabel: example.label, exampleType: example.exampleType };
}

export function referenceSignatureIdForProcessExample(id, track = null) {
  return spatiotemporalProcessExampleById(id, track)?.referenceSignatureId ?? null;
}

export function processExampleMetadata(id, modified = false, track = null) {
  const example = spatiotemporalProcessExampleById(id, track);
  if (!example) return null;
  return {
    ...example,
    modified: Boolean(modified),
    exampleProcessModified: Boolean(modified),
    exampleTrackLabel: spatiotemporalProcessExampleTrackLabel(example.track),
    referenceSignature: referenceSignatureMetadata(example.referenceSignatureId, modified)
  };
}
export function resolveActiveSpatiotemporalProcessExample(context = {}) {
  const processMode = context.processMode ?? null;
  const patternSource = context.patternSource ?? null;
  const modified = Boolean(context.exampleProcessModified ?? context.referenceSignatureModified);
  if (isCustomProcessExampleContext({ processMode, patternSource })) {
    return customActiveProcessExampleState({ processMode, patternSource, modified });
  }

  const modeTrack = spatiotemporalProcessExampleTrackForMode(processMode);
  const explicitTrack = knownSpatiotemporalProcessExampleTrack(context.exampleTrack);
  const activeTrack = modeTrack ?? explicitTrack;
  if (activeTrack) {
    const trackSpecificId = activeTrack === 'oceanRelevantProcessAnalogs'
      ? context.oceanProcessAnalogId
      : context.foundationalCaModelId;
    const explicitExample = strictSpatiotemporalProcessExample(context.exampleProcessId, activeTrack)
      ?? strictSpatiotemporalProcessExample(trackSpecificId, activeTrack);
    if (explicitExample) return activeProcessExampleState(explicitExample, { modified });
    const referenceExample = exampleForReferenceSignature(context.referenceSignatureId, activeTrack);
    if (referenceExample) return activeProcessExampleState(referenceExample, { modified, isLegacyFallback: true });
    const defaultExample = firstExampleForTrack(activeTrack);
    if (defaultExample) return activeProcessExampleState(defaultExample, { modified });
  }

  const foundationalExample = strictSpatiotemporalProcessExample(context.foundationalCaModelId, 'foundationalCaModels');
  if (foundationalExample) return activeProcessExampleState(foundationalExample, { modified });

  const oceanExample = strictSpatiotemporalProcessExample(context.oceanProcessAnalogId, 'oceanRelevantProcessAnalogs');
  if (oceanExample) return activeProcessExampleState(oceanExample, { modified });

  const directExample = strictSpatiotemporalProcessExample(context.exampleProcessId);
  if (directExample) return activeProcessExampleState(directExample, { modified });

  const referenceExample = exampleForReferenceSignature(context.referenceSignatureId);
  if (referenceExample) return activeProcessExampleState(referenceExample, { modified, isLegacyFallback: true });

  const fallback = strictSpatiotemporalProcessExample('conwayGameOfLife', 'foundationalCaModels');
  return fallback
    ? activeProcessExampleState(fallback, { modified, isLegacyFallback: true })
    : customActiveProcessExampleState({ processMode, patternSource, modified, isLegacyFallback: true });
}

export function activeProcessExampleExportBlock(active = {}) {
  if (!active || active.isCustom) return null;
  return {
    exampleTrack: active.exampleTrack,
    exampleTrackLabel: active.exampleTrackLabel,
    exampleProcessId: active.exampleProcessId,
    exampleProcessLabel: active.exampleProcessLabel,
    exampleType: active.exampleType,
    foundationalCaModelId: active.foundationalCaModelId,
    oceanProcessAnalogId: active.oceanProcessAnalogId,
    mappedReferenceSignatureId: active.referenceSignatureId,
    mappedReferenceSignatureLabel: active.referenceSignatureLabel,
    observableProcessPatternTags: active.observableProcessPatternTags,
    implementationFidelity: active.implementationFidelity,
    ruleFamilyId: active.ruleFamilyId,
    requiresFlowCoupling: active.requiresFlowCoupling,
    requiresUncertaintyForMissionRealism: active.requiresUncertaintyForMissionRealism,
    relatedFoundationalModels: active.relatedFoundationalModels,
    relatedOceanAnalogs: active.relatedOceanAnalogs,
    modified: Boolean(active.isModified)
  };
}

function knownSpatiotemporalProcessExampleTrack(value) {
  const id = String(value ?? '').trim();
  return SPATIOTEMPORAL_PROCESS_EXAMPLE_TRACKS.some((track) => track.id === id) ? id : null;
}

function strictSpatiotemporalProcessExample(id, track = null) {
  if (isNoProcessExampleId(id)) return null;
  const value = String(id ?? '').trim();
  if (!value) return null;
  const candidates = track ? spatiotemporalProcessExamplesByTrack(track) : SPATIOTEMPORAL_PROCESS_EXAMPLES;
  return candidates.find((example) => example.id === value)
    ?? candidates.find((example) => example.aliases?.includes(value))
    ?? null;
}

function firstExampleForTrack(track) {
  return spatiotemporalProcessExamplesByTrack(track)[0] ?? null;
}

function exampleForReferenceSignature(referenceSignatureId, track = null) {
  if (isNoProcessExampleId(referenceSignatureId)) return null;
  const id = String(referenceSignatureId ?? '').trim();
  if (!id) return null;
  const candidates = track ? spatiotemporalProcessExamplesByTrack(track) : SPATIOTEMPORAL_PROCESS_EXAMPLES;
  return candidates.find((example) => example.referenceSignatureId === id || example.id === id)
    ?? (!track ? OBSERVABLE_PROCESS_PATTERNS.find((example) => example.referenceSignatureId === id || example.id === id) : null)
    ?? null;
}

function activeProcessExampleState(example, { modified = false, isLegacyFallback = false } = {}) {
  const referenceSignature = referenceSignatureMetadata(example.referenceSignatureId, modified);
  return {
    exampleTrack: example.track,
    exampleTrackLabel: spatiotemporalProcessExampleTrackLabel(example.track),
    exampleProcessId: example.id,
    exampleProcessLabel: example.label,
    exampleType: example.exampleType,
    foundationalCaModelId: example.exampleType === 'foundationalCaModel' ? example.id : null,
    oceanProcessAnalogId: example.exampleType === 'oceanProcessAnalog' ? example.id : null,
    referenceSignatureId: referenceSignature?.id ?? example.referenceSignatureId,
    referenceSignatureLabel: referenceSignature?.label ?? example.referenceSignatureId,
    mappedReferenceSignatureId: referenceSignature?.id ?? example.referenceSignatureId,
    mappedReferenceSignatureLabel: referenceSignature?.label ?? example.referenceSignatureId,
    observableProcessPatternTags: example.observableProcessPatternTags ?? [],
    implementationFidelity: example.implementationFidelity ?? null,
    ruleFamilyId: example.ruleFamilyId ?? null,
    requiresFlowCoupling: example.requiresFlowCoupling ?? null,
    requiresUncertaintyForMissionRealism: example.requiresUncertaintyForMissionRealism ?? null,
    relatedFoundationalModels: example.relatedFoundationalModels ?? [],
    relatedOceanAnalogs: example.relatedOceanAnalogs ?? [],
    relatedObservablePatterns: example.relatedObservablePatterns ?? [],
    isLegacyFallback: Boolean(isLegacyFallback),
    isCustom: false,
    isModified: Boolean(modified),
    sourceExample: processExampleMetadata(example.id, modified, example.track),
    referenceSignature
  };
}

function customActiveProcessExampleState({ processMode = null, patternSource = null, modified = false, isLegacyFallback = false } = {}) {
  return {
    exampleTrack: null,
    exampleTrackLabel: null,
    exampleProcessId: null,
    exampleProcessLabel: null,
    exampleType: null,
    foundationalCaModelId: null,
    oceanProcessAnalogId: null,
    referenceSignatureId: null,
    referenceSignatureLabel: null,
    mappedReferenceSignatureId: null,
    mappedReferenceSignatureLabel: null,
    observableProcessPatternTags: [],
    implementationFidelity: null,
    ruleFamilyId: null,
    requiresFlowCoupling: null,
    requiresUncertaintyForMissionRealism: null,
    relatedFoundationalModels: [],
    relatedOceanAnalogs: [],
    relatedObservablePatterns: [],
    isLegacyFallback: Boolean(isLegacyFallback),
    isCustom: true,
    isModified: Boolean(modified),
    processMode,
    patternSource,
    sourceExample: null,
    referenceSignature: null
  };
}

function isCustomProcessExampleContext({ processMode, patternSource } = {}) {
  return patternSource === 'custom'
    || processMode === 'customComposer'
    || processMode === 'processPaint'
    || processMode === 'randomRuleLab';
}


function foundationalCaModel(entry) {
  return {
    track: 'foundationalCaModels',
    exampleType: 'foundationalCaModel',
    caTaxonomy: {
      updateSchedule: 'synchronous',
      stateSpace: 'finiteState',
      neighborhood: 'local',
      ruleUniformity: 'uniform educational rule',
      stochasticity: 'deterministic or seeded initialization'
    },
    stateVariables: ['x_i(t)', 'N_i(t)', 'parameters_i'],
    parameterDefinitions: ['seeded initial state', 'state transition thresholds', 'rule-family parameters'],
    stateVocabulary: entry.stateVocabulary ?? ['inactive', 'active', 'recovering'],
    neighborhood: entry.neighborhood ?? entry.neighborhoodDefinition ?? 'local neighborhood',
    observableProcessPatternTags: entry.observableProcessPatternTags ?? entry.relatedObservablePatterns ?? [],
    processStateMeaning: 'Cell state records local process status such as active, inactive, recovering, consumed, or signal-like.',
    observableValueMeaning: 'Observable value is a visualization of the active or sampling-relevant state.',
    samplingInterpretation: 'Active, changing, or near-future cells can be interpreted as sampling-relevant, but sampling is not the identity of the model.',
    notA: 'Not a calibrated domain simulator or AUV adaptive-sampling estimator.',
    componentDefaults: referenceSignatureById(entry.referenceSignatureId)?.componentDefaults ?? {},
    initialStateHints: ['seeded initial state', 'try node-state and transition display layers'],
    expectedTransitions: entry.ruleStatement,
    suggestedDisplayLayers: ['Node States', 'State Transitions', 'Diagnostics Overlay'],
    qaExpectations: {
      expectedRuleStatement: entry.canonicalRuleIdea,
      expectedPhenotype: entry.expectedPhenotype,
      passCriteria: ['non-empty process state', 'frame-to-frame transitions', 'local-neighborhood behavior visible']
    },
    literatureNotes: 'Grounded in cellular-automata vocabulary: cells, states, neighborhoods, and local update rules.',
    localReferenceNotes: 'Implemented through ANCHOR rule-family analogs and existing deterministic seeded recipes.',
    updateFunctionNotation: 'local-to-global',
    whatTheRuleDoes: entry.canonicalRuleIdea,
    whatTheUpdateFunctionShows: 'A local update function applied across space induces a global field evolution.',
    observablePhenotype: entry.expectedPhenotype,
    aliases: [entry.id, entry.label, entry.referenceSignatureId, entry.modelFamily],
    ...entry
  };
}

function oceanProcessAnalog(entry) {
  return {
    track: 'oceanRelevantProcessAnalogs',
    exampleType: 'oceanProcessAnalog',
    componentDefaults: referenceSignatureById(entry.referenceSignatureId)?.componentDefaults ?? {},
    shortDescription: entry.shortDescription ?? entry.whyOceanRelevant ?? entry.environmentalProcess,
    processStateMeaning: entry.processStateMeaning ?? 'Grid cells represent simplified event/process state, not physical water parcels.',
    observableValueMeaning: entry.observableValueMeaning ?? 'Observable value highlights where the process layer is active or sampling-relevant.',
    samplingInterpretation: entry.samplingInterpretation ?? 'Use this as a sampling-value analogy, then move to coupled demos for flow, constraints, and uncertainty.',
    suggestedDisplayLayers: entry.suggestedDisplayLayers ?? ['Sampling Value + Source Overlay', 'Cell / Node States', 'State Transitions'],
    qaExpectations: entry.qaExpectations ?? { expectedPhenotype: entry.shortDescription ?? entry.environmentalProcess, passCriteria: ['non-empty process layer', 'visible process region', 'clear science-boundary note'] },
    notA: entry.notA ?? 'Not a calibrated ocean simulator, fluid model, salinity forecast, biogeochemical model, or AUV mission planner.',
    coupledDemoBridgeNote: entry.coupledDemoBridgeNote ?? FLOW_BOUNDARY_NOTE,
    warning: entry.warning ?? FLOW_BOUNDARY_NOTE,
    implementationFidelity: entry.implementationFidelity ?? 'observablePatternAnalog',
    aliases: [entry.id, entry.label, entry.referenceSignatureId, entry.environmentalProcess],
    ...entry
  };
}

function observablePatternFromSignature(signature) {
  const label = signature.id === 'driftTransport' ? 'Directed Feature Transport' : signature.label;
  const localUpdateFunction = localUpdateFunctionForSignature(signature.id);
  const relatedFoundationalModels = FOUNDATIONAL_CA_MODELS
    .filter((model) => model.referenceSignatureId === signature.id || model.relatedObservablePatterns?.includes(signature.id))
    .map((model) => model.id);
  return {
    id: signature.id,
    label,
    aliases: [...new Set([signature.id, signature.label, label, ...(signature.aliases ?? [])])],
    track: 'observableProcessPatterns',
    exampleType: 'observableProcessPattern',
    shortDescription: signature.simplifiedClaim ?? signature.description,
    processPatternFamily: signature.category,
    ruleFamilyId: ruleFamilyForSignature(signature.id),
    referenceSignatureId: signature.id,
    implementationFidelity: 'observablePatternAnalog',
    componentDefaults: signature.componentDefaults,
    expectedObservableSignature: signature.expectedObservableSignature,
    expectedTransitions: signature.validationTargets ?? [],
    processStateMeaning: 'Process state records local activity, cooldown, recovery, group, or message state.',
    observableValueMeaning: 'Observable value shows where the deterministic process is active or important at this frame.',
    samplingInterpretation: signature.roiInterpretation?.samplingIntuition,
    notA: signature.id === 'driftTransport'
      ? 'Synthetic feature motion, not physical water-current transport. Physical flow-driven advection belongs in Flow Fields and Coupled Dynamic Sampling Space demos.'
      : signature.notA,
    suggestedDisplayLayers: signature.bestDisplayLayers ?? [],
    qaExpectations: signature.qaExpectations,
    relatedFoundationalModels,
    relatedOceanAnalogs: OCEAN_RELEVANT_PROCESS_ANALOGS.filter((analog) => analog.referenceSignatureId === signature.id || analog.observableProcessPatternTags?.includes(ruleFamilyForSignature(signature.id))).map((analog) => analog.id),
    observableProcessPatternTags: [ruleFamilyForSignature(signature.id)],
    coverageTags: signature.coverageTags ?? signature.referenceCoverageTags ?? [],
    ruleStatement: ruleStatementForSignature(signature),
    localUpdateFunction,
    globalUpdateFunction: 'X(t+1) = F(X(t))',
    updateFunctionNotation: 'observable-pattern local update',
    stateVariables: ['x_i(t)', 'N_i(t)', 'source_i', 'theta_i'],
    neighborhoodDefinition: signature.caTaxonomy?.neighborhood ?? 'component-defined local or graph neighborhood',
    parameterDefinitions: ['source field', 'state transition parameters', 'interaction scale', 'seeded recipe'],
    whatTheRuleDoes: signature.simplifiedClaim,
    whatTheUpdateFunctionShows: 'The observable process pattern is the phenotype produced by deterministic local updates.',
    observablePhenotype: signature.expectedObservableSignature,
    literatureNotes: 'Broad deterministic grid-process pattern, not a claim of exact CA implementation.',
    localReferenceNotes: signature.implementationNotes,
    relatedObservablePatterns: []
  };
}

function ruleFamilyForSignature(id) {
  return {
    frontPropagation: 'propagatingFront',
    waveExcitableMedia: 'excitableWave',
    birthDeathEmergence: 'localBirthDeath',
    stationaryTemporalBursts: 'recurrentHotspot',
    diffusionSpread: 'diffusiveSpread',
    driftTransport: 'directedTransport',
    cyclicDominance: 'cyclicDominance',
    clusterFormation: 'domainFormation',
    avalancheBurstCascades: 'thresholdCascade',
    predatorPreyMigration: 'interactingPopulation',
    freshnessRecovery: 'freshnessRecovery',
    patternFormationMorphogenesis: 'morphogenesis',
    congestionDensityWaves: 'congestionWave',
    structuredSignalPropagation: 'structuredSignal'
  }[id] ?? 'inert';
}

function localUpdateFunctionForSignature(id) {
  return {
    frontPropagation: 'x_i(t+1) = f(x_i(t), activeNeighborPressure_i(t), source_i)',
    waveExcitableMedia: 'x_i(t+1) = f(x_i(t), waveNeighborPressure_i(t), refractoryClock_i(t))',
    birthDeathEmergence: 'x_i(t+1) = f(x_i(t), activeNeighborCount_i(t))',
    stationaryTemporalBursts: 'x_i(t+1) = f(x_i(t), basin_i, temporalPulse_i(t))',
    diffusionSpread: 'x_i(t+1) = f(x_i(t), neighborMessage_i(t), recovery_i(t))',
    driftTransport: 'x_i(t+1) = f(x_i(t), featureMotion_i(t), source_i)',
    cyclicDominance: 'x_i(t+1) = f(x_i(t), competingNeighborStates_i(t))',
    clusterFormation: 'x_i(t+1) = f(x_i(t), localAgreement_i(t), domain_i)',
    avalancheBurstCascades: 'x_i(t+1) = f(x_i(t), load_i(t), threshold_i, neighborRelease_i(t))',
    predatorPreyMigration: 'x_i(t+1) = f(x_i(t), preyPressure_i(t), predatorPressure_i(t))',
    freshnessRecovery: 'x_i(t+1) = f(x_i(t), age_i(t), recoveryRate_i)',
    patternFormationMorphogenesis: 'x_i(t+1) = f(x_i(t), localActivator_i(t), localInhibitor_i(t))',
    congestionDensityWaves: 'x_i(t+1) = f(x_i(t), upstreamDensity_i(t), downstreamCapacity_i(t))',
    structuredSignalPropagation: 'x_i(t+1) = f(x_i(t), signalNeighbor_i(t), conductor_i)'
  }[id] ?? 'x_i(t+1) = f(x_i(t), N_i(t), theta_i)';
}

function ruleStatementForSignature(signature) {
  return [
    signature.simplifiedClaim ?? 'A deterministic local update changes the process field.',
    'Cells update from prior state, source support, and local or graph-neighborhood context.',
    'Applying the local rule across the grid creates the observable spatiotemporal pattern.'
  ];
}

function isNoProcessExampleId(id) {
  const value = String(id ?? '').trim();
  return value === '' || value === 'none' || value === 'custom';
}
