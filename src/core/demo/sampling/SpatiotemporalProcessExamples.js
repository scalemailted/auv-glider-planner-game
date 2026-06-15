import {
  ROI_REFERENCE_SIGNATURES,
  referenceSignatureById,
  referenceSignatureMetadata
} from '../roi/RoiReferenceSignatures.js';

export const SPATIOTEMPORAL_PROCESS_EXAMPLE_TYPES = [
  'foundationalCaModel',
  'observableProcessPattern'
];

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

export const OBSERVABLE_PROCESS_PATTERNS = ROI_REFERENCE_SIGNATURES.map((signature) => observablePatternFromSignature(signature));

export const SPATIOTEMPORAL_PROCESS_EXAMPLES = [
  ...FOUNDATIONAL_CA_MODELS,
  ...OBSERVABLE_PROCESS_PATTERNS
];

export function spatiotemporalProcessExampleById(id) {
  if (isNoProcessExampleId(id)) return null;
  const normalized = normalizeSpatiotemporalProcessExampleId(id);
  return SPATIOTEMPORAL_PROCESS_EXAMPLES.find((example) => example.id === normalized) ?? null;
}

export function normalizeSpatiotemporalProcessExampleId(id = 'stationaryTemporalBursts') {
  if (isNoProcessExampleId(id)) return null;
  const value = String(id ?? '');
  const exact = SPATIOTEMPORAL_PROCESS_EXAMPLES.find((example) => example.id === value);
  if (exact) return exact.id;
  const alias = SPATIOTEMPORAL_PROCESS_EXAMPLES.find((example) => example.aliases?.includes(value));
  if (alias) return alias.id;
  const reference = referenceSignatureById(value);
  if (reference) return reference.id;
  return 'stationaryTemporalBursts';
}

export function spatiotemporalProcessExampleLabel(id) {
  return spatiotemporalProcessExampleById(id)?.label ?? 'Recurrent Stationary Hotspots';
}

export function spatiotemporalProcessExamplesByType(type) {
  return SPATIOTEMPORAL_PROCESS_EXAMPLES.filter((example) => example.exampleType === type);
}

export function spatiotemporalProcessExampleOptions() {
  return SPATIOTEMPORAL_PROCESS_EXAMPLE_TYPES.map((type) => ({
    type,
    label: processExampleTypeLabel(type),
    options: spatiotemporalProcessExamplesByType(type).map((example) => ({
      id: example.id,
      label: example.label,
      referenceSignatureId: example.referenceSignatureId
    }))
  }));
}

export function processExampleTypeLabel(type) {
  return {
    foundationalCaModel: 'Foundational CA Models',
    observableProcessPattern: 'Observable Process Patterns'
  }[type] ?? 'Process Examples';
}

export function processExampleCoverageMatrix() {
  return SPATIOTEMPORAL_PROCESS_EXAMPLES.map((example) => ({
    id: example.id,
    label: example.label,
    exampleType: example.exampleType,
    ruleFamilyId: example.ruleFamilyId,
    referenceSignatureId: example.referenceSignatureId,
    implementationFidelity: example.implementationFidelity,
    hasRuleStatement: Array.isArray(example.ruleStatement) && example.ruleStatement.length > 0,
    hasLocalUpdateFunction: Boolean(example.localUpdateFunction),
    hasQaExpectations: Boolean(example.qaExpectations),
    relatedFoundationalModels: example.relatedFoundationalModels ?? [],
    relatedObservablePatterns: example.relatedObservablePatterns ?? []
  }));
}

export function referenceSignatureIdForProcessExample(id) {
  return spatiotemporalProcessExampleById(id)?.referenceSignatureId ?? null;
}

export function processExampleMetadata(id, modified = false) {
  const example = spatiotemporalProcessExampleById(id);
  if (!example) return null;
  return {
    ...example,
    modified: Boolean(modified),
    referenceSignature: referenceSignatureMetadata(example.referenceSignatureId, modified)
  };
}

function foundationalCaModel(entry) {
  return {
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
    aliases: [entry.id, entry.label, entry.referenceSignatureId],
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
    stationaryTemporalBursts: 'freshnessRecovery',
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
