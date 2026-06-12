import {
  ROI_REFERENCE_CATALOG_VERSION,
  referenceModelsForSignature,
  referenceSignatureCoverageMatrix as catalogCoverageMatrix
} from './RoiReferenceModelCatalog.js';

export const CUSTOM_REFERENCE_SIGNATURE_ID = 'none';

const BASE_ROI_REFERENCE_SIGNATURES = [
  {
    id: 'frontPropagation',
    label: 'Propagating Fronts',
    category: 'Transition fronts',
    aliases: ['frontPropagation', 'Front Propagation'],
    referenceModels: [
      referenceModel('Forest-fire CA', 'active front, susceptible region ahead, consumed trail behind', 'Captures the sampling-relevant front signature, not a wildfire simulator.'),
      referenceModel('Eden growth', 'compact expanding boundary', 'Useful as a simplified expansion reference.'),
      referenceModel('Invasion percolation', 'irregular spread through heterogeneous resistance', 'Useful for irregular front behavior.')
    ],
    simplifiedClaim: 'A seeded scalar boundary expands locally, leaving depleted or consumed cells behind.',
    componentDefaults: {
      eventLikelihood: 'gradientLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'sustained',
      eventLikelihoodSpatialEvolution: 'expansion',
      spatialPattern: 'frontBoundary',
      hotspotCount: 3,
      clusterSize: 'wide',
      valueDistribution: 'bimodalValues',
      temporalPattern: 'sustained',
      temporalBehavior: 'periodic',
      spatialEvolution: 'expansion',
      patternEvolution: 'expansion',
      evolutionModel: 'expansion',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'hard',
      interactionScale: 'edge',
      displayMode: 'nodeStates',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium'
    },
    parameterHints: ['Use Graph Messages to inspect local front pressure.', 'Switch depletion between Hard and Neighborhood to compare trail behavior.'],
    expectedObservableSignature: observableSignature('active transition boundary', 'sustained local propagation', 'localized boundary advance with cooling/consumed trail', 'active/susceptible/consumed states', 'edge-neighbor pressure'),
    roiInterpretation: roiMeaning('active boundary', 'susceptible cells adjacent to active/front cells', 'consumed or depleted cells behind the front', 'track the moving boundary or sample just ahead of it'),
    bestDisplayLayers: ['Node States', 'Community + Messages', 'Diagnostics Overlay', 'Sample Value + Likelihood Overlay'],
    failureSigns: ['whole-domain activation', 'random speckle with no boundary', 'no consumed/depleted trail', 'no measurable front length'],
    validationTargets: ['front length > threshold', 'consumed/depleted or cooling states visible', 'active boundary exists', 'avoid full saturation'],
    educationalPrompt: 'Compare expansion, branching growth, and neighbor propagation while keeping the front geometry fixed.',
    implementationNotes: 'Uses existing component controls and graph diagnostics; no full forest-fire CA is implemented.',
    notA: 'Not a wildfire, combustion, vegetation, terrain, or physical plume model.'
  },
  {
    id: 'waveExcitableMedia',
    label: 'Excitable Waves',
    category: 'Excitable waves',
    aliases: ['waveExcitableMedia', 'Wave / Excitable Media'],
    referenceModels: [
      referenceModel("Brian's Brain", 'on, dying, and off state cycling', 'Useful for crest/refractory/recovery language.'),
      referenceModel('Greenberg-Hastings model', 'excitation waves followed by recovery', 'Useful for wavefront plus refractory trail.'),
      referenceModel('Reaction-diffusion wave analogs', 'traveling scalar activation bands', 'Used only as a visual process signature.')
    ],
    simplifiedClaim: 'A seeded scalar activation wave creates crests and recovering regions.',
    componentDefaults: {
      eventLikelihood: 'patchyLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'wavyMultiFrequency',
      eventLikelihoodSpatialEvolution: 'neighborPropagation',
      spatialPattern: 'patchyField',
      hotspotCount: 4,
      clusterSize: 'wide',
      valueDistribution: 'bimodalValues',
      temporalPattern: 'wavyMultiFrequency',
      temporalBehavior: 'periodic',
      spatialEvolution: 'neighborPropagation',
      patternEvolution: 'neighborPropagation',
      evolutionModel: 'neighborPropagation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      interactionScale: 'hybrid',
      displayMode: 'nodeStates',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['Use Node States to see crest/recovering cells.', 'Use Graph Messages to see local wave influence.'],
    expectedObservableSignature: observableSignature('crest or wavefront with recovering trail', 'periodic/ripple-like activation', 'crest motion and refractory/recovery transitions', 'active/recovering/refractory states', 'local wave influence'),
    roiInterpretation: roiMeaning('crest or active wave cells', 'cells just ahead of the crest or recovering toward activation', 'refractory or quiet regions behind the crest', 'sample the crest or the near-future activation band'),
    bestDisplayLayers: ['Node States', 'Graph Messages', 'Sample Value + Likelihood Overlay'],
    failureSigns: ['static heatmap', 'random flicker with no crest', 'no recovering/refractory regions', 'whole-domain activation'],
    validationTargets: ['crest states exist', 'recovering states visible', 'nonzero motion', 'avoid random flicker'],
    educationalPrompt: 'Change temporal pattern from Wavy to Periodic to see how crest timing changes.',
    implementationNotes: 'Uses ripple/neighbor graph update rules, not a full excitable-media solver.',
    notA: 'Not a chemical, cardiac, neural, or reaction-diffusion simulator.'
  },
  {
    id: 'birthDeathEmergence',
    label: 'Local Birth-Death Emergence',
    category: 'Local rules',
    aliases: ['birthDeathEmergence', 'Birth-Death Emergence'],
    referenceModels: [
      referenceModel("Conway's Game of Life", 'local birth/death and emergent patches', 'Reference for observable local-rule emergence only.'),
      referenceModel('Life-like B/S rules', 'different birth/survival rules create structures', 'Useful for local-rule language without exact rules.'),
      referenceModel('Seeds rule', 'birth-dominated sparse emergence', 'Useful for sparse activation examples.')
    ],
    simplifiedClaim: 'Local seeded cell rules create active patches that appear, disappear, and reorganize.',
    componentDefaults: {
      eventLikelihood: 'seededTextureLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'intermittent',
      eventLikelihoodSpatialEvolution: 'morphMutation',
      spatialPattern: 'patchyField',
      hotspotCount: 5,
      clusterSize: 'medium',
      valueDistribution: 'bimodalValues',
      temporalPattern: 'intermittent',
      temporalBehavior: 'markovNeighbor',
      spatialEvolution: 'morphMutation',
      patternEvolution: 'morphMutation',
      evolutionModel: 'morphMutation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'none',
      interactionScale: 'cell',
      displayMode: 'nodeStates',
      timeMode: 'dynamic',
      dynamicComplexity: 'high',
      updateRuleHint: 'lifeLikeLocalRules'
    },
    parameterHints: ['Use Cell / Node interaction scale.', 'Set Spatial Evolution to Branching Growth to compare emergence versus growth.'],
    expectedObservableSignature: observableSignature('emergent local patches', 'intermittent local activation', 'birth/death transitions and patch reorganization', 'alive/active/inactive local states', 'cell-neighbor rule effects'),
    roiInterpretation: roiMeaning('active or alive cells', 'transition regions where local rules may activate next', 'inactive neighborhoods without supportive neighbors', 'inspect local transitions rather than assuming one smooth field'),
    bestDisplayLayers: ['Node States', 'Graph Messages', 'Diagnostics Overlay'],
    failureSigns: ['independent pixel noise', 'no births/deaths', 'all cells dead', 'all cells active'],
    validationTargets: ['birth/death transitions exist', 'active components exist', 'state changes over time', 'avoid extinction and saturation'],
    educationalPrompt: 'Modify value distribution or interaction scale to see how local emergence changes.',
    implementationNotes: 'Uses an explicit updateRuleHint so graph selection remains transparent.',
    notA: 'Not exact Conway, HighLife, Seeds, or any full cellular automaton.'
  },
  {
    id: 'stationaryTemporalBursts',
    label: 'Recurrent Stationary Hotspots',
    category: 'Recurring basins',
    aliases: ['stationaryTemporalBursts', 'Stationary Temporal Bursts'],
    referenceModels: [
      referenceModel('Contact-process-like activation', 'local activation and deactivation windows', 'Used only as a burst/recovery analogy.'),
      referenceModel('Stationary event hotspots', 'stable spatial basins with time-varying reports', 'Useful for reporting burst examples.')
    ],
    simplifiedClaim: 'Stable likelihood basins flare up over time without large spatial drift.',
    componentDefaults: {
      eventLikelihood: 'multiModalLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'bursty',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'clusteredField',
      hotspotCount: 4,
      clusterSize: 'medium',
      valueDistribution: 'heavyTailed',
      temporalPattern: 'bursty',
      temporalBehavior: 'bursty',
      spatialEvolution: 'stationary',
      patternEvolution: 'stationary',
      evolutionModel: 'stationary',
      motionScope: 'perFeature',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      interactionScale: 'cluster',
      displayMode: 'sampleValueLikelihoodOverlay',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium'
    },
    parameterHints: ['Compare Bursty and Random Pulses.', 'Use Event Likelihood to see stable basins while S changes.'],
    expectedObservableSignature: observableSignature('stable likelihood basins', 'bursty recurrent activation', 'basin intensity changes without major relocation', 'active/cooling/recovering basins', 'cluster-specific temporal pulses'),
    roiInterpretation: roiMeaning('currently active basin cells', 'quiet high-likelihood basins likely to reactivate', 'low-likelihood background or cooled basins', 'time visits around active windows while keeping fallback routes'),
    bestDisplayLayers: ['Sample Value + Likelihood Overlay', 'Event Likelihood', 'Diagnostics Overlay'],
    failureSigns: ['global drift', 'no temporal variation', 'one broad blob', 'no likelihood-sample relationship'],
    validationTargets: ['basins mostly stationary', 'temporal variation exists', 'activity concentrated near likelihood basins', 'avoid global drift'],
    educationalPrompt: 'Change only Spatial Evolution to see how stationary bursts become moving bursts.',
    implementationNotes: 'Maps closely to the existing Recurring Hotspots recipe.',
    notA: 'Not a calibrated crime, epidemiology, or reporting model.'
  },
  {
    id: 'diffusionSpread',
    label: 'Diffusive / Epidemic Spread',
    category: 'Local spread',
    aliases: ['diffusionSpread', 'Diffusion / Spread'],
    referenceModels: [
      referenceModel('SIR/SIS/SEIR cellular epidemic models', 'local spread with susceptible/recovering regions', 'Used as a local-spread signature only.'),
      referenceModel('Contact process', 'activation spreads and recovers locally', 'Useful for neighbor influence.'),
      referenceModel('Percolation spread', 'spread through heterogeneous local structure', 'Useful for patchy domains.')
    ],
    simplifiedClaim: 'Patchy activity diffuses locally through abstract graph edges.',
    componentDefaults: {
      eventLikelihood: 'patchyLikelihood',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'static',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'patchyField',
      hotspotCount: 5,
      clusterSize: 'wide',
      valueDistribution: 'skewedHigh',
      temporalPattern: 'intermittent',
      temporalBehavior: 'markovNeighbor',
      spatialEvolution: 'neighborPropagation',
      patternEvolution: 'neighborPropagation',
      evolutionModel: 'neighborPropagation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      interactionScale: 'edge',
      displayMode: 'graphMessages',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['Graph Messages reveal local spread.', 'Switch to Expansion to compare diffusion with front growth.'],
    expectedObservableSignature: observableSignature('locally spreading active regions', 'intermittent spread/recovery', 'activity spreads to nearby cells', 'susceptible/active/recovering states', 'edge-neighbor influence'),
    roiInterpretation: roiMeaning('active spreading nodes', 'neighbors with strong incoming messages', 'isolated or cooled cells', 'sample active cells and watch message direction for likely spread'),
    bestDisplayLayers: ['Graph Messages', 'Node States', 'Diagnostics Overlay'],
    failureSigns: ['no messages', 'no local continuity', 'whole-domain saturation', 'activity does not spread'],
    validationTargets: ['local spread exists', 'messages or propagation signal visible', 'component area changes over time'],
    educationalPrompt: 'Change Interaction Scale from Edge to Global to see why local spread needs local structure.',
    implementationNotes: 'Uses graph message diagnostics; edge messages are abstract ROI influence.',
    notA: 'Not a disease simulator or diffusion PDE.'
  },
  {
    id: 'driftTransport',
    label: 'Directed Drift / Transport',
    category: 'Synthetic transport',
    aliases: ['driftTransport', 'Drift / Transport'],
    referenceModels: [
      referenceModel('Lattice gas CA / HPP / FHP', 'coherent density displacement', 'Reference for transport-like movement only.'),
      referenceModel('Lattice Boltzmann-style grids', 'moving density patches', 'Used as a conceptual grid-process analogy.'),
      referenceModel('Traffic density movement', 'coherent density waves', 'Useful for transport-like scalar displacement.')
    ],
    simplifiedClaim: 'A scalar ROI feature moves coherently with synthetic transport-like deformation.',
    componentDefaults: {
      eventLikelihood: 'seededTextureLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'sustained',
      eventLikelihoodSpatialEvolution: 'continuousDrift',
      spatialPattern: 'linearBand',
      hotspotCount: 3,
      clusterSize: 'medium',
      valueDistribution: 'skewedHigh',
      temporalPattern: 'sustained',
      temporalBehavior: 'periodic',
      spatialEvolution: 'shearStretch',
      patternEvolution: 'shearStretch',
      evolutionModel: 'shearStretch',
      motionScope: 'global',
      stateModel: 'timeIndexed',
      depletionMode: 'none',
      interactionScale: 'global',
      displayMode: 'sampleValue',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['This is not F(x,y,t). Use Flow Fields for physical current.', 'Compare Continuous Drift and Shear / Stretch.'],
    expectedObservableSignature: observableSignature('coherent moving feature or density patch', 'sustained transport-like motion', 'centroid/feature displacement with coherence', 'scalar feature deformation', 'global or per-feature synthetic motion'),
    roiInterpretation: roiMeaning('currently valuable moving feature cells', 'cells along the synthetic transport path', 'background outside transported patches', 'lead a moving opportunity while preserving the current/ROI boundary'),
    bestDisplayLayers: ['Sample Value', 'Raw Base Value', 'Sample Value + Likelihood Overlay'],
    failureSigns: ['no centroid movement', 'random flicker', 'feature breaks into speckles', 'mistaken for physical current'],
    validationTargets: ['centroid or patch movement exists', 'frame overlap remains coherent', 'avoid random flicker'],
    educationalPrompt: 'Switch to Flow Fields Demo when movement should come from physical F(x,y,t).',
    implementationNotes: 'Uses scalar field deformation only; no flow coupling is added.',
    notA: 'Not physical current, lattice gas, Lattice Boltzmann, or traffic simulation.'
  },
  {
    id: 'cyclicDominance',
    label: 'Cyclic Dominance',
    category: 'Cyclic regions',
    referenceModels: [
      referenceModel('Rock-paper-scissors spatial CA', 'phase-shifted cyclic dominance', 'Useful for rotating regional activity.'),
      referenceModel('Cyclic cellular automata', 'traveling cyclic fronts', 'Used as a visual signature reference.'),
      referenceModel('Cyclic ecological dominance', 'phase-shifted ecological regions', 'Useful for scheduling around cycles.')
    ],
    simplifiedClaim: 'Multiple regions rise and fall with phase-shifted cycles and rotating/morphing structure.',
    componentDefaults: {
      eventLikelihood: 'multiModalLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'wavyMultiFrequency',
      eventLikelihoodSpatialEvolution: 'rotationalSwirl',
      spatialPattern: 'patchyField',
      hotspotCount: 4,
      clusterSize: 'medium',
      valueDistribution: 'bimodalValues',
      temporalPattern: 'wavyMultiFrequency',
      temporalBehavior: 'periodic',
      spatialEvolution: 'rotationalSwirl',
      patternEvolution: 'rotationalSwirl',
      evolutionModel: 'rotationalSwirl',
      motionScope: 'perFeature',
      stateModel: 'frequencyBased',
      depletionMode: 'none',
      interactionScale: 'hybrid',
      displayMode: 'communityMessages',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['Use Community + Messages to inspect phase-like regional structure.', 'Seasonal timing slows the cycle.'],
    expectedObservableSignature: 'Rotating or cyclic regions, phase-shifted activity, and traveling patches/fronts.',
    roiInterpretation: roiMeaning('currently peaking cyclic regions', 'regions rising toward the next phase', 'regions in low phase', 'schedule visits around phase differences'),
    bestDisplayLayers: ['Community + Messages', 'Diagnostics Overlay', 'Sample Value + Likelihood Overlay'],
    failureSigns: ['all regions peak together', 'static field', 'no multi-region activity', 'full saturation'],
    validationTargets: ['cyclic activity exists', 'multi-region activity varies over time', 'avoid static field'],
    educationalPrompt: 'Change from Rotational Swirl to Morph / Mutation to compare cyclic motion styles.',
    implementationNotes: 'Uses seeded phase structure and scalar deformation, not species dynamics.',
    notA: 'Not a rock-paper-scissors or ecological population simulator.'
  },
  {
    id: 'clusterFormation',
    label: 'Domain / Cluster Formation',
    category: 'Local alignment',
    aliases: ['clusterFormation', 'Cluster Formation'],
    referenceModels: [
      referenceModel('Ising / Glauber-style spin dynamics', 'local domains and boundaries', 'Reference for domain/coherence language only.'),
      referenceModel('Schelling segregation model', 'local preference-driven clustering', 'Useful for cluster formation analogy.'),
      referenceModel('Voter model', 'local consensus and domain growth', 'Useful for boundary and consensus language.')
    ],
    simplifiedClaim: 'Local alignment creates coherent domains and meaningful boundaries.',
    componentDefaults: {
      eventLikelihood: 'seededTextureLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'intermittent',
      eventLikelihoodSpatialEvolution: 'convergence',
      spatialPattern: 'patchyField',
      hotspotCount: 5,
      clusterSize: 'medium',
      valueDistribution: 'bimodalValues',
      temporalPattern: 'intermittent',
      temporalBehavior: 'markovNeighbor',
      spatialEvolution: 'convergence',
      patternEvolution: 'convergence',
      evolutionModel: 'convergence',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'none',
      interactionScale: 'edge',
      displayMode: 'graphCommunities',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium'
    },
    parameterHints: ['Graph Communities reveal domains.', 'Morph / Mutation makes boundaries less stable.'],
    expectedObservableSignature: observableSignature('domains, clusters, and boundaries', 'coarsening or stabilization', 'domain boundary movement or local alignment changes', 'community/domain states', 'local consensus/alignment influence'),
    roiInterpretation: roiMeaning('active domain boundaries or coherent high-value domains', 'cells near domain boundaries that may change next', 'stable low-value or inactive domains', 'sample boundaries when domain change is informative'),
    bestDisplayLayers: ['Graph Communities', 'Node States', 'Diagnostics Overlay'],
    failureSigns: ['pure pixel noise', 'no connected domains', 'one blob collapse', 'no boundary structure'],
    validationTargets: ['clusters/domains coherent', 'spatial autocorrelation visible', 'avoid pure pixel noise'],
    educationalPrompt: 'Change Value Distribution between Bimodal and Gaussian to see domain contrast change.',
    implementationNotes: 'Uses graph/community diagnostics, not spin, voter, or segregation dynamics.',
    notA: 'Not an Ising, Schelling, or voter-model simulator.'
  },
  {
    id: 'avalancheBurstCascades',
    label: 'Threshold Cascades / Avalanches',
    category: 'Bursty cascades',
    aliases: ['avalancheBurstCascades', 'Avalanche / Burst Cascades'],
    referenceModels: [
      referenceModel('Sandpile / Bak-Tang-Wiesenfeld model', 'quiet buildup and sudden avalanche', 'Used as a cascade signature reference.'),
      referenceModel('Avalanche cascades', 'rare local bursts that propagate', 'Useful for rare burst behavior.'),
      referenceModel('Self-organized burst propagation', 'episodic cascade-like activation', 'Used only as educational language.')
    ],
    simplifiedClaim: 'Quiet buildup is interrupted by rare, locally connected burst cascades.',
    componentDefaults: {
      eventLikelihood: 'sparseCandidateSites',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'randomPulses',
      eventLikelihoodSpatialEvolution: 'branchingGrowth',
      spatialPattern: 'sparseTargets',
      hotspotCount: 6,
      clusterSize: 'tight',
      valueDistribution: 'rareExtremeEvents',
      temporalPattern: 'randomPulses',
      temporalBehavior: 'nonuniformRandom',
      spatialEvolution: 'branchingGrowth',
      patternEvolution: 'branchingGrowth',
      evolutionModel: 'branchingGrowth',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      interactionScale: 'edge',
      displayMode: 'diagnosticsOverlay',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['Use Rare Extreme Events and Random Pulses together.', 'Diagnostics Overlay makes cascade warnings visible.'],
    expectedObservableSignature: observableSignature('rare high-value cascades', 'quiet buildup with sudden bursts', 'large localized frame delta during cascade windows', 'charged/active/recovering analog states', 'threshold-like neighbor cascade'),
    roiInterpretation: roiMeaning('currently cascading high-value cells', 'nearby cells receiving burst influence', 'quiet or recovered background', 'respond quickly to cascade windows without assuming constant opportunity'),
    bestDisplayLayers: ['Diagnostics Overlay', 'Graph Messages', 'Sample Value'],
    failureSigns: ['no burst windows', 'no rare high cells', 'constant full activation', 'random speckle with no local spread'],
    validationTargets: ['bursty activation occurs', 'rare high-value event exists', 'quiet-to-active variation visible'],
    educationalPrompt: 'Change Rare Extreme Events to Heavy-Tailed to compare anomaly frequency.',
    implementationNotes: 'Uses seeded random pulses and branching growth; no sandpile state is simulated.',
    notA: 'Not a sandpile or self-organized criticality simulator.'
  },
  {
    id: 'predatorPreyMigration',
    label: 'Interacting Population Migration',
    category: 'Ecological migration',
    aliases: ['predatorPreyMigration', 'Predator-Prey Migration'],
    referenceModels: [
      referenceModel('Wa-Tor predator-prey model', 'moving predator/prey patches', 'Used as moving-patch inspiration.'),
      referenceModel('Lattice Lotka-Volterra models', 'oscillating ecological activity', 'Useful for phase-shifted basins.'),
      referenceModel('Ecological migration waves', 'chase-like moving activity', 'Used as a visual reference.')
    ],
    simplifiedClaim: 'Phase-shifted ecological activity moves among basins with migration-like motion.',
    componentDefaults: {
      eventLikelihood: 'multiModalLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'seasonal',
      eventLikelihoodSpatialEvolution: 'randomWalk',
      spatialPattern: 'clusteredField',
      hotspotCount: 4,
      clusterSize: 'medium',
      valueDistribution: 'skewedHigh',
      temporalPattern: 'seasonal',
      temporalBehavior: 'periodic',
      spatialEvolution: 'randomWalk',
      patternEvolution: 'randomWalk',
      evolutionModel: 'randomWalk',
      motionScope: 'perFeature',
      stateModel: 'frequencyBased',
      depletionMode: 'none',
      interactionScale: 'cluster',
      displayMode: 'sampleValueLikelihoodOverlay',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['Use Sample Value + Likelihood Overlay to compare current value and likely basins.', 'Rotational Swirl creates a stronger cyclic chase feel.'],
    expectedObservableSignature: observableSignature('moving interacting population patches', 'oscillating phase-shifted activity', 'migration/chase-like patch deltas', 'population/phase analog states', 'cluster-level interaction'),
    roiInterpretation: roiMeaning('currently peaking moving patches', 'basins likely to peak next', 'quiet basins in low phase', 'route between basins as activity migrates'),
    bestDisplayLayers: ['Sample Value + Likelihood Overlay', 'Community + Messages', 'Event Likelihood'],
    failureSigns: ['no movement', 'no cyclic variation', 'one basin only', 'random flicker'],
    validationTargets: ['moving or oscillating patches exist', 'multi-region activity exists', 'cyclic behavior visible'],
    educationalPrompt: 'Compare Random Walk, Divergence, and Rotational Swirl while keeping the same basins.',
    implementationNotes: 'Uses phase-shifted seeded basins, not population dynamics.',
    notA: 'Not a predator-prey or Lotka-Volterra simulator.'
  },
  {
    id: 'freshnessRecovery',
    label: 'Freshness / Recovery',
    category: 'Monitoring recovery',
    referenceModels: [
      referenceModel('Age-of-information monitoring', 'stale regions regain sampling priority', 'Directly useful for persistent monitoring.'),
      referenceModel('Refractory/recovery process analogs', 'recently active areas cool then recover', 'Useful for recovery language.'),
      referenceModel('History-aware sampling', 'visit history changes future value', 'Used as a sampling-process reference.')
    ],
    simplifiedClaim: 'Recently sampled locations cool while stale candidate sites recover value.',
    componentDefaults: {
      eventLikelihood: 'sparseCandidateSites',
      eventLikelihoodDynamics: 'static',
      eventLikelihoodTemporalPattern: 'static',
      eventLikelihoodSpatialEvolution: 'stationary',
      spatialPattern: 'monitoringStations',
      hotspotCount: 6,
      clusterSize: 'tight',
      valueDistribution: 'bimodalValues',
      temporalPattern: 'seasonal',
      temporalBehavior: 'periodic',
      spatialEvolution: 'stationary',
      patternEvolution: 'stationary',
      evolutionModel: 'stationary',
      motionScope: 'perFeature',
      stateModel: 'historyAware',
      depletionMode: 'freshnessAge',
      interactionScale: 'cell',
      displayMode: 'freshnessRevisitValue',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium'
    },
    parameterHints: ['Use Freshness / Revisit Value display.', 'Switch to Revisit Recovery to compare recovery assumptions.'],
    aliases: ['freshnessRecovery', 'Freshness / Recovery'],
    expectedObservableSignature: observableSignature('monitoring stations or stale cells', 'cooldown followed by recovery', 'cooling/recovery transitions after synthetic visits', 'fresh/cooling/recovering/stale states', 'history-aware cell value'),
    roiInterpretation: roiMeaning('stale recovered cells or stations', 'cells warming toward revisit value', 'recently sampled or cooling cells', 'avoid immediate duplicate sampling and revisit after enough recovery time'),
    bestDisplayLayers: ['Freshness / Revisit Value', 'Node States', 'Diagnostics Overlay'],
    failureSigns: ['no recovery', 'no station structure', 'recently sampled cells stay high', 'global drift'],
    validationTargets: ['freshness/recovery values exist', 'cooling/recovering states visible', 'station/candidate structure present'],
    educationalPrompt: 'Change Sampling Effect to None to see why history-aware value disappears.',
    implementationNotes: 'Freshness is demo-only unless connected to real mission visit history.',
    notA: 'Not a hidden-truth uncertainty model or mission scoring rule.'
  },
  {
    id: 'patternFormationMorphogenesis',
    label: 'Pattern Formation / Morphogenesis',
    category: 'Advanced pattern formation',
    aliases: ['patternFormationMorphogenesis', 'Pattern Formation / Morphogenesis'],
    referenceModels: [
      referenceModel('Turing pattern / reaction-diffusion analogs', 'spots and stripes self-organize', 'Used as morphology inspiration only.'),
      referenceModel('Gray-Scott-like spot/stripe analogs', 'spots split, merge, and form bands', 'No PDE or chemistry is implemented.'),
      referenceModel('Morphing patches', 'seeded patches mutate shape over time', 'Useful for ROI feature-shape change.')
    ],
    simplifiedClaim: 'Seeded scalar patches morph into spot, stripe, split, or merge patterns without solving reaction-diffusion equations.',
    componentDefaults: {
      eventLikelihood: 'seededTextureLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'wavyMultiFrequency',
      eventLikelihoodSpatialEvolution: 'morphMutation',
      spatialPattern: 'seededTexture',
      hotspotCount: 5,
      clusterSize: 'medium',
      valueDistribution: 'bimodalValues',
      temporalPattern: 'wavyMultiFrequency',
      temporalBehavior: 'periodic',
      spatialEvolution: 'morphMutation',
      patternEvolution: 'morphMutation',
      evolutionModel: 'morphMutation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'none',
      interactionScale: 'hybrid',
      displayMode: 'diagnosticsOverlay',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['Use Diagnostics Overlay to inspect splitting/merging structure.', 'Switch Value Distribution to Bimodal for clearer bands.'],
    expectedObservableSignature: observableSignature('spots, stripes, splitting, and merging', 'slow morphing or mixed-frequency evolution', 'shape mutation rather than pure translation', 'scalar pattern-state analog', 'local self-organization'),
    roiInterpretation: roiMeaning('emerging spots/stripes or active pattern boundaries', 'cells near splitting/merging structures', 'low-amplitude background', 'sample emerging structure rather than only the brightest cell'),
    bestDisplayLayers: ['Diagnostics Overlay', 'Sample Value + Likelihood Overlay', 'Raw Base Value'],
    failureSigns: ['static texture', 'pure random flicker', 'no spots/bands', 'full saturation'],
    validationTargets: ['morphing structure visible', 'nonzero frame delta', 'avoid random flicker'],
    educationalPrompt: 'Compare Morph / Mutation, Shear / Stretch, and Rotational Swirl to separate morphology from transport.',
    implementationNotes: 'Uses existing scalar morphology controls; no reaction-diffusion PDE is implemented.',
    notA: 'Not a Turing, Gray-Scott, chemical, biological morphogenesis, or reaction-diffusion simulator.'
  },
  {
    id: 'congestionDensityWaves',
    label: 'Congestion / Density Waves',
    category: 'Advanced density waves',
    aliases: ['congestionDensityWaves', 'Congestion / Density Waves'],
    referenceModels: [
      referenceModel('Nagel-Schreckenberg traffic CA', 'stop-go waves and moving density clusters', 'Traffic reference only.'),
      referenceModel('Biham-Middleton-Levine traffic model', 'jam fronts and release patterns', 'Gridlock analogy only.'),
      referenceModel('Congestion / release patterns', 'build-up and release waves', 'Useful for sample-demand density analogs.')
    ],
    simplifiedClaim: 'Scalar sample opportunity builds into density clusters, moves as waves, and releases over time.',
    componentDefaults: {
      eventLikelihood: 'gradientLikelihood',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'periodic',
      eventLikelihoodSpatialEvolution: 'continuousDrift',
      spatialPattern: 'linearBand',
      hotspotCount: 4,
      clusterSize: 'wide',
      valueDistribution: 'skewedHigh',
      temporalPattern: 'periodic',
      temporalBehavior: 'periodic',
      spatialEvolution: 'continuousDrift',
      patternEvolution: 'continuousDrift',
      evolutionModel: 'continuousDrift',
      motionScope: 'global',
      stateModel: 'frequencyBased',
      depletionMode: 'soft',
      interactionScale: 'hybrid',
      displayMode: 'sampleValueLikelihoodOverlay',
      timeMode: 'dynamic',
      dynamicComplexity: 'medium'
    },
    parameterHints: ['Use Continuous Drift for moving density waves.', 'This is congestion-like ROI density, not traffic simulation.'],
    expectedObservableSignature: observableSignature('density clusters and jam/release fronts', 'stop-go buildup and release', 'density wave moves or releases between frames', 'congested/released scalar analog states', 'band or corridor-like density interaction'),
    roiInterpretation: roiMeaning('current dense value wave or jam front', 'cells ahead of the moving density wave', 'released or cooled regions behind the wave', 'sample fronts and releases before density moves on'),
    bestDisplayLayers: ['Sample Value + Likelihood Overlay', 'Diagnostics Overlay', 'Sample Value'],
    failureSigns: ['no moving density structure', 'random speckle', 'flat band only', 'mistaken for physical flow'],
    validationTargets: ['density wave movement exists', 'periodic variation visible', 'avoid random flicker'],
    educationalPrompt: 'Compare with Directed Drift / Transport to separate density-wave buildup from generic movement.',
    implementationNotes: 'Uses scalar ROI density-wave analogs, not vehicle or traffic CA dynamics.',
    notA: 'Not a Nagel-Schreckenberg, BML, vehicle, or road traffic simulator.'
  },
  {
    id: 'structuredSignalPropagation',
    label: 'Structured Signal Propagation',
    category: 'Advanced structured signals',
    aliases: ['structuredSignalPropagation', 'Structured Signal Propagation'],
    referenceModels: [
      referenceModel('Wireworld', 'directed pulses on structured paths', 'Signal-path reference only.'),
      referenceModel('Branching signal networks', 'branching activation pathways', 'Used as relay-path inspiration.'),
      referenceModel('Relay / activation pathways', 'sequential path activation', 'Useful for route-like sampling opportunities.')
    ],
    simplifiedClaim: 'Seeded activation pulses move along structured paths or branches in the ROI field.',
    componentDefaults: {
      eventLikelihood: 'sparseCandidateSites',
      eventLikelihoodDynamics: 'dynamic',
      eventLikelihoodTemporalPattern: 'rapidPulse',
      eventLikelihoodSpatialEvolution: 'neighborPropagation',
      spatialPattern: 'linearBand',
      hotspotCount: 6,
      clusterSize: 'tight',
      valueDistribution: 'rareExtremeEvents',
      temporalPattern: 'rapidPulse',
      temporalBehavior: 'markovNeighbor',
      spatialEvolution: 'neighborPropagation',
      patternEvolution: 'neighborPropagation',
      evolutionModel: 'neighborPropagation',
      motionScope: 'localNeighborhood',
      stateModel: 'stateEvolving',
      depletionMode: 'soft',
      interactionScale: 'edge',
      displayMode: 'graphMessages',
      timeMode: 'dynamic',
      dynamicComplexity: 'high'
    },
    parameterHints: ['Use Graph Messages to see relay direction.', 'Sparse Candidate Sites create path-like activation nodes.'],
    expectedObservableSignature: observableSignature('directed pulse paths or branching relays', 'rapid sequential pulse timing', 'pulse advances along connected structure', 'active/cooling/recovering relay states', 'edge/path message propagation'),
    roiInterpretation: roiMeaning('currently active relay/path cells', 'next likely relay cells along the path', 'inactive or cooled path segments', 'sample activated paths or pre-position near likely next relays'),
    bestDisplayLayers: ['Graph Messages', 'Node States', 'Diagnostics Overlay'],
    failureSigns: ['no path structure', 'no pulse movement', 'all nodes activate together', 'random flicker'],
    validationTargets: ['messages or relay transitions visible', 'pulse timing exists', 'path-like activation visible'],
    educationalPrompt: 'Compare Graph Messages with Sample Value to see why path structure matters.',
    implementationNotes: 'Uses graph-message propagation analogs; no Wireworld or digital logic CA is implemented.',
    notA: 'Not Wireworld, circuit logic, communications simulation, or network routing.'
  }
];

export const ROI_REFERENCE_SIGNATURES = BASE_ROI_REFERENCE_SIGNATURES.map(enrichReferenceSignature);

export const REFERENCE_SIGNATURE_OPTIONS = [
  { id: CUSTOM_REFERENCE_SIGNATURE_ID, label: 'None / Custom' },
  ...ROI_REFERENCE_SIGNATURES.map(({ id, label }) => ({ id, label }))
];

export const PRESET_REFERENCE_SIGNATURES = {
  recurringHotspots: 'stationaryTemporalBursts',
  forestFireFrontInspired: 'frontPropagation',
  expandingFront: 'frontPropagation',
  rippleActivation: 'waveExcitableMedia',
  lifeLikeCellularEmergenceInspired: 'birthDeathEmergence',
  neighborSpread: 'diffusionSpread',
  patchyRainfall: 'diffusionSpread',
  driftingStormCells: 'driftTransport',
  oscillatingEcologicalField: 'cyclicDominance',
  freshnessRevisitValue: 'freshnessRecovery',
  wanderingHotspot: 'driftTransport',
  migratingPatch: 'driftTransport'
};

export function normalizeReferenceSignatureId(value = CUSTOM_REFERENCE_SIGNATURE_ID) {
  const id = String(value ?? CUSTOM_REFERENCE_SIGNATURE_ID);
  if (id === CUSTOM_REFERENCE_SIGNATURE_ID || id === 'custom' || id === 'none') return CUSTOM_REFERENCE_SIGNATURE_ID;
  const signature = ROI_REFERENCE_SIGNATURES.find((entry) => entry.id === id || entry.aliases?.includes(id));
  return signature?.id ?? CUSTOM_REFERENCE_SIGNATURE_ID;
}

export function referenceSignatureById(value) {
  const id = normalizeReferenceSignatureId(value);
  return ROI_REFERENCE_SIGNATURES.find((signature) => signature.id === id) ?? null;
}

export function referenceSignatureLabel(value) {
  return referenceSignatureById(value)?.label ?? 'None / Custom';
}

export function referenceSignatureRecipe(value) {
  const signature = referenceSignatureById(value);
  return signature ? { ...signature.componentDefaults } : {};
}

export function referenceSignatureOptions() {
  return [...REFERENCE_SIGNATURE_OPTIONS];
}

export function referenceSignatureForPreset(presetId) {
  return referenceSignatureById(PRESET_REFERENCE_SIGNATURES[presetId]);
}

export function referenceSignatureMetadata(value, modified = false) {
  const signature = referenceSignatureById(value);
  if (!signature) return null;
  return {
    id: signature.id,
    label: signature.label,
    aliases: signature.aliases ?? [],
    category: signature.category,
    modified: Boolean(modified),
    referenceModels: signature.referenceModels,
    referenceModelCatalog: signature.referenceModelCatalog,
    referenceCatalogVersion: signature.referenceCatalogVersion,
    referenceCoverageTags: signature.coverageTags,
    caTaxonomy: signature.caTaxonomy,
    expectedObservableSignature: signature.expectedObservableSignature,
    qaExpectations: signature.qaExpectations,
    phenotypeMetrics: signature.phenotypeMetrics,
    genotypeNotes: signature.genotypeNotes,
    taxonomyJustification: signature.taxonomyJustification,
    componentDefaults: signature.componentDefaults,
    roiInterpretation: signature.roiInterpretation,
    bestDisplayLayers: signature.bestDisplayLayers,
    failureSigns: signature.failureSigns,
    validationTargets: signature.validationTargets,
    simplifiedClaim: signature.simplifiedClaim,
    educationalPrompt: signature.educationalPrompt,
    implementationNotes: signature.implementationNotes,
    notA: signature.notA
  };
}

export function referenceSignatureCoverageMatrix() {
  return catalogCoverageMatrix(ROI_REFERENCE_SIGNATURES);
}

export function formatObservableSignature(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return [
    value.spatialPattern,
    value.temporalPattern,
    value.deltaPattern,
    value.statePattern,
    value.interactionPattern
  ].filter(Boolean).join(' | ');
}

function enrichReferenceSignature(signature) {
  const referenceModelCatalog = referenceModelsForSignature(signature.id);
  const referenceModels = referenceModelCatalog.length
    ? referenceModelCatalog.map((entry) => ({
        id: entry.id,
        name: entry.name,
        modelFamily: entry.modelFamily,
        usefulBehavior: entry.usefulObservableBehavior,
        usefulObservableBehavior: entry.usefulObservableBehavior,
        spatialSignature: entry.spatialSignature,
        temporalSignature: entry.temporalSignature,
        deltaSignature: entry.deltaSignature,
        caTaxonomy: entry.caTaxonomy,
        note: entry.notes,
        notA: entry.notA
      }))
    : signature.referenceModels ?? [];
  const coverageTags = [...new Set([
    ...coverageTagsForSignature(signature.id),
    ...referenceModelCatalog.flatMap((entry) => entry.coverageTags ?? [])
  ])];
  const caTaxonomy = signature.caTaxonomy ?? caTaxonomyForSignature(signature.id);
  return {
    ...signature,
    description: signature.description ?? signature.simplifiedClaim,
    aliases: [...new Set([signature.id, signature.label, ...(signature.aliases ?? [])])],
    referenceModels,
    referenceModelCatalog,
    referenceCatalogVersion: ROI_REFERENCE_CATALOG_VERSION,
    expectedObservableSignature: normalizeObservableSignature(signature.expectedObservableSignature),
    qaExpectations: signature.qaExpectations ?? qaExpectationsForSignature(signature),
    coverageTags,
    caTaxonomy,
    phenotypeMetrics: signature.phenotypeMetrics ?? defaultPhenotypeMetrics(),
    genotypeNotes: signature.genotypeNotes ?? genotypeNotesForSignature(signature),
    taxonomyJustification: signature.taxonomyJustification ?? taxonomyJustificationForSignature(signature.id, caTaxonomy, coverageTags)
  };
}

function observableSignature(spatialPattern, temporalPattern, deltaPattern, statePattern, interactionPattern) {
  return { spatialPattern, temporalPattern, deltaPattern, statePattern, interactionPattern };
}

function normalizeObservableSignature(value) {
  if (!value) return observableSignature('observable ROI structure', 'dynamic sample-field behavior', 'measurable frame-to-frame change', 'scalar/state analog', 'component interaction');
  if (typeof value === 'object') return value;
  return observableSignature(value, value, value, 'component-defined state analog', 'component-defined interaction');
}

function qaExpectationsForSignature(signature) {
  const observable = normalizeObservableSignature(signature.expectedObservableSignature);
  return {
    expectedSpatialPattern: observable.spatialPattern,
    expectedTemporalPattern: observable.temporalPattern,
    expectedDeltaBehavior: observable.deltaPattern,
    expectedROIFields: 'L(x,y,t) should explain event-proneness and S(x,y,t) should express realized sampling value.',
    suggestedMetrics: suggestedMetricsForSignature(signature.id),
    passCriteria: signature.validationTargets ?? ['non-empty field', 'non-saturated field', 'signature-specific behavior visible'],
    warnCriteria: ['signature is visible but weak, subtle, or partially expressed for this seed'],
    failCriteria: signature.failureSigns ?? ['empty field', 'full saturation', 'random flicker with no observable structure']
  };
}

function suggestedMetricsForSignature(id) {
  const common = ['activeFraction', 'highValueFraction', 'frameDelta', 'connectedComponentCount', 'likelihoodSampleCorrelation'];
  const byId = {
    frontPropagation: ['frontLength', 'stateTransitionCounts', 'activeNeighborCount'],
    waveExcitableMedia: ['temporalPeriodicity', 'stateTransitionCounts', 'recoveryStateCount'],
    birthDeathEmergence: ['birthDeathCounts', 'stateTransitionCounts', 'connectedComponentCount'],
    stationaryTemporalBursts: ['pulseFrequency', 'likelihoodSampleCorrelation', 'activeClusterCount'],
    diffusionSpread: ['activeNeighborCount', 'transitionSpread', 'incomingMessageCount'],
    driftTransport: ['centroidMovement', 'frameOverlap', 'localSpatialAutocorrelation'],
    cyclicDominance: ['cycleScore', 'temporalPeriodicity', 'activeClusterCount'],
    clusterFormation: ['localSpatialAutocorrelation', 'largestComponent', 'connectedComponentCount'],
    avalancheBurstCascades: ['rareEventVisibility', 'maxFrameDelta', 'pulseFrequency'],
    predatorPreyMigration: ['centroidMovement', 'cycleScore', 'activeClusterCount'],
    freshnessRecovery: ['recoveryStateCount', 'cooldownStateCount', 'freshnessValueRange'],
    patternFormationMorphogenesis: ['distributionShape', 'localSpatialAutocorrelation', 'frameDelta'],
    congestionDensityWaves: ['centroidMovement', 'pulseFrequency', 'densityBandContrast'],
    structuredSignalPropagation: ['incomingMessageCount', 'stateTransitionCounts', 'pathActivationCount']
  };
  return [...new Set([...(byId[id] ?? []), ...common])];
}

function defaultPhenotypeMetrics() {
  return {
    meanStateDensity: ['activeFraction', 'highValueFraction'],
    localStructure: ['connectedComponentCount', 'largestComponent', 'neighborhoodStateCounts', 'activeNeighborCount'],
    twoPointCorrelation: ['localSpatialAutocorrelation', 'likelihoodSampleCorrelation'],
    damageSpreading: ['frameDelta', 'transitionSpread', 'birthDeathCounts', 'stateTransitionCounts'],
    spectralProperties: ['temporalPeriodicity', 'cycleScore', 'pulseFrequency'],
    entropyComplexity: ['valueEntropy', 'stateEntropy', 'distributionShape', 'rareEventVisibility']
  };
}

function genotypeNotesForSignature(signature) {
  const recipe = signature.componentDefaults ?? {};
  return {
    eventLikelihoodSubstrate: recipe.eventLikelihood,
    spatialPattern: recipe.spatialPattern,
    valueDistribution: recipe.valueDistribution,
    temporalPattern: recipe.temporalPattern,
    spatialEvolution: recipe.spatialEvolution ?? recipe.patternEvolution ?? recipe.evolutionModel,
    stateModel: recipe.stateModel,
    samplingEffect: recipe.depletionMode,
    interactionScale: recipe.interactionScale,
    note: 'The component recipe is genotype-like setup; the generated heatmap is the phenotype-like observable behavior.'
  };
}

function caTaxonomyForSignature(id) {
  const base = {
    updateSchedule: 'synchronous',
    stochasticity: 'seededStochastic',
    stateSpace: 'hybridScalarState',
    neighborhood: 'local',
    ruleUniformity: 'uniform',
    memory: 'memoryless',
    boundaryStyle: 'abstractDemo',
    phenotypeClass: 'complex'
  };
  const overrides = {
    frontPropagation: { stateSpace: 'multiState', neighborhood: 'extended', ruleUniformity: 'nonUniform', memory: 'refractory', phenotypeClass: 'mixed' },
    waveExcitableMedia: { stateSpace: 'multiState', neighborhood: 'extended', memory: 'refractory', phenotypeClass: 'periodic' },
    birthDeathEmergence: { stateSpace: 'multiState', neighborhood: 'extended', phenotypeClass: 'complex' },
    stationaryTemporalBursts: { updateSchedule: 'asynchronous', ruleUniformity: 'nonUniform', phenotypeClass: 'intermittent' },
    diffusionSpread: { stateSpace: 'multiState', neighborhood: 'extended', memory: 'recovery', phenotypeClass: 'mixed' },
    driftTransport: { stateSpace: 'continuousScalar', neighborhood: 'globalAnalog', phenotypeClass: 'periodic' },
    cyclicDominance: { stateSpace: 'multiState', neighborhood: 'extended', phenotypeClass: 'periodic' },
    clusterFormation: { stateSpace: 'multiState', neighborhood: 'extended', ruleUniformity: 'nonUniform', phenotypeClass: 'complex' },
    avalancheBurstCascades: { updateSchedule: 'asynchronous', stateSpace: 'multiState', neighborhood: 'extended', memory: 'finiteMemory', phenotypeClass: 'intermittent' },
    predatorPreyMigration: { stateSpace: 'multiState', neighborhood: 'extended', phenotypeClass: 'periodic' },
    freshnessRecovery: { updateSchedule: 'historyAware', stateSpace: 'hybridScalarState', neighborhood: 'memory', memory: 'historyAware', ruleUniformity: 'nonUniform', phenotypeClass: 'mixed' },
    patternFormationMorphogenesis: { stateSpace: 'continuousScalar', neighborhood: 'extended', ruleUniformity: 'nonUniform', phenotypeClass: 'complex' },
    congestionDensityWaves: { stateSpace: 'multiState', neighborhood: 'extended', memory: 'finiteMemory', phenotypeClass: 'periodic' },
    structuredSignalPropagation: { stateSpace: 'multiState', neighborhood: 'graph', ruleUniformity: 'nonUniform', memory: 'refractory', phenotypeClass: 'periodic' }
  };
  return { ...base, ...(overrides[id] ?? {}) };
}

function coverageTagsForSignature(id) {
  return {
    frontPropagation: ['front'],
    waveExcitableMedia: ['wave'],
    birthDeathEmergence: ['birthDeath'],
    stationaryTemporalBursts: ['stationaryBurst'],
    diffusionSpread: ['diffusion'],
    driftTransport: ['drift'],
    cyclicDominance: ['cyclic'],
    clusterFormation: ['domainFormation'],
    avalancheBurstCascades: ['avalanche'],
    predatorPreyMigration: ['predatorPrey'],
    freshnessRecovery: ['freshness'],
    patternFormationMorphogenesis: ['morphogenesis'],
    congestionDensityWaves: ['congestion'],
    structuredSignalPropagation: ['signalPropagation']
  }[id] ?? [];
}

function taxonomyJustificationForSignature(id, caTaxonomy, coverageTags) {
  return `${id} maps to ${coverageTags.join(', ') || 'ROI'} phenotype behavior using ${caTaxonomy.stateSpace} state, ${caTaxonomy.neighborhood} neighborhood, ${caTaxonomy.updateSchedule} update schedule, and ${caTaxonomy.ruleUniformity} rule allocation in the composer.`;
}

function referenceModel(name, usefulBehavior, note) {
  return { name, usefulBehavior, note };
}

function roiMeaning(current, nearFuture, lowValue, samplingIntuition) {
  return { current, nearFuture, lowValue, samplingIntuition };
}
