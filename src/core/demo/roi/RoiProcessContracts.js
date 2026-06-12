export const ROI_INTERACTION_SCALES = ['global', 'cluster', 'cell', 'edge', 'hybrid'];

export const ROI_PROCESS_CONTRACTS = {
  recurringHotspots: {
    processClass: 'recurring_cluster_bursts',
    domainAnalogies: ['metro event-report bursts', 'recurring ecological activity', 'repeat monitoring opportunities'],
    simplifiedClaim: 'Separated event basins flare, cool, and recover in a seeded cycle; it is not a fitted event-forecast model.',
    interactionScale: 'cluster',
    roiInterpretation: 'Active basins are current interest, cooling basins are recently useful, and recovering basins are likely future interest.',
    validationSignature: ['separated_basins', 'recurring_activation', 'active_cooling_recovering_states', 'no_extinction', 'no_full_saturation'],
    educationalPrompt: 'Compare L(x,y,t) basins with S(x,y,t) and decide whether to chase the active basin or wait for recovery.'
  },
  migratingPatch: {
    processClass: 'smooth_migrating_patch',
    domainAnalogies: ['mobile biological patch', 'moving observation opportunity'],
    simplifiedClaim: 'One coherent value patch moves through intermediate locations without implying physical advection.',
    interactionScale: 'cluster',
    roiInterpretation: 'Current interest is the visible patch; near-future interest is along the seeded drift path.',
    validationSignature: ['coherent_patch', 'measurable_centroid_motion', 'high_frame_overlap', 'no_random_flicker'],
    educationalPrompt: 'Plan for where the patch will be, not only where it is in the current frame.'
  },
  expandingFront: {
    processClass: 'propagating_front',
    domainAnalogies: ['spreading boundary', 'front-like ecological transition'],
    simplifiedClaim: 'A scalar activity boundary spreads locally; it is not a hydrodynamic or wildfire model.',
    interactionScale: 'edge',
    roiInterpretation: 'The active boundary is current interest; susceptible cells ahead are near-future interest.',
    validationSignature: ['active_boundary', 'local_continuity', 'front_length', 'susceptible_ahead', 'no_random_speckle'],
    educationalPrompt: 'Inspect active and susceptible node states to understand the advancing edge.'
  },
  patchyRainfall: {
    processClass: 'intermittent_patch_field',
    domainAnalogies: ['patchy rainfall', 'irregular report activity'],
    simplifiedClaim: 'Seeded correlated patches pulse and fade; it is not a meteorological simulation.',
    interactionScale: 'cell',
    roiInterpretation: 'Active patches are current interest; nearby coherent patches are robust alternatives.',
    validationSignature: ['patchy_spatial_autocorrelation', 'intermittent_pulses', 'domain_coverage', 'no_frame_random_flicker'],
    educationalPrompt: 'Use spatial correlation and likelihood texture to avoid overfitting to one bright cell.'
  },
  driftingStormCells: {
    processClass: 'drifting_compact_bursts',
    domainAnalogies: ['storm-cell patches', 'moving compact event reports'],
    simplifiedClaim: 'Compact seeded cells pulse and drift independently; current-driven transport belongs in the Coupled Fields Demo.',
    interactionScale: 'cluster',
    roiInterpretation: 'Current interest is the bright compact cell; near-future interest follows its drift envelope.',
    validationSignature: ['multiple_compact_cells', 'visible_drift', 'rapid_pulses', 'no_between_pulse_extinction'],
    educationalPrompt: 'Compare current value against the likelihood/drift envelope before committing a route.'
  },
  freshnessRevisitValue: {
    processClass: 'age_of_information_recovery',
    domainAnalogies: ['station monitoring', 'knowledge decay', 'revisit scheduling'],
    simplifiedClaim: 'Synthetic visits cool value and stale regions recover; it is demo-only unless tied to mission visits.',
    interactionScale: 'cell',
    roiInterpretation: 'Stale cells are worth resampling, while recently sampled cells are temporarily depleted.',
    validationSignature: ['stationary_sites', 'cool_after_visit', 'recover_with_age', 'no_global_drift'],
    educationalPrompt: 'Watch freshness and recovery fields to time revisits instead of repeating samples too soon.'
  },
  wanderingHotspot: {
    processClass: 'bounded_random_walk_source',
    domainAnalogies: ['mobile source tracking', 'wandering ecological hotspot'],
    simplifiedClaim: 'A coherent source wanders by seeded local steps; it does not teleport and is not ocean drift.',
    interactionScale: 'cluster',
    roiInterpretation: 'Current interest is the active source; near-future interest is nearby along bounded local steps.',
    validationSignature: ['bounded_motion', 'coherent_source', 'local_steps', 'no_global_shift_unless_selected'],
    educationalPrompt: 'Track the source while preserving fallback routes near its plausible next positions.'
  },
  neighborSpread: {
    processClass: 'local_neighbor_propagation',
    domainAnalogies: ['local contagion', 'spreading reports', 'patch expansion'],
    simplifiedClaim: 'Neighboring graph nodes pass abstract ROI influence; messages are not fluid current vectors.',
    interactionScale: 'edge',
    roiInterpretation: 'Active nodes are current interest, and high incoming-message neighbors are near-future interest.',
    validationSignature: ['local_spread', 'strong_edge_messages', 'active_neighbors', 'no_one_blob_collapse'],
    educationalPrompt: 'Use Graph Messages to identify which neighbors are driving near-future value.'
  },
  rippleActivation: {
    processClass: 'wave_like_activation',
    domainAnalogies: ['traveling activation band', 'ripple report wave'],
    simplifiedClaim: 'A scalar activation crest moves through graph neighborhoods; it is not a water wave.',
    interactionScale: 'edge',
    roiInterpretation: 'The crest is current interest; the next crest neighborhood is near-future interest.',
    validationSignature: ['moving_crest', 'phase_progression', 'local_continuity', 'no_static_dynamic_risk'],
    educationalPrompt: 'Sample ahead of the current crest rather than only chasing the brightest cell.'
  },
  oscillatingEcologicalField: {
    processClass: 'phase_shifted_cycles',
    domainAnalogies: ['seasonal ecology', 'cyclic habitat activity'],
    simplifiedClaim: 'Regions rise and fall with seeded phases and mixed frequencies; it is not a validated ecology model.',
    interactionScale: 'cluster',
    roiInterpretation: 'Current interest is the active phase; near-future interest is the next rising basin.',
    validationSignature: ['phase_shifted_modes', 'recurring_peaks', 'no_extinction', 'no_full_saturation'],
    educationalPrompt: 'Use timing to choose between basins that peak at different phases.'
  },
  forestFireFrontInspired: {
    processClass: 'front_burnout_analog',
    domainAnalogies: ['forest-fire-inspired front', 'burnout process', 'spreading boundary'],
    simplifiedClaim: 'A front-like scalar process leaves consumed/depleted cells behind; it is not a physical wildfire model.',
    interactionScale: 'edge',
    roiInterpretation: 'Active front cells are current interest, susceptible cells ahead are near-future interest, and consumed cells are depleted.',
    validationSignature: ['active_boundary', 'susceptible_ahead', 'consumed_trail', 'front_length', 'local_continuity'],
    educationalPrompt: 'Switch to Node States to separate active front, susceptible ahead, and consumed trail.'
  },
  lifeLikeCellularEmergenceInspired: {
    processClass: 'local_rule_emergence',
    domainAnalogies: ['cellular automata-inspired emergence', 'local-rule activity'],
    simplifiedClaim: 'Local activation rules create emergent patches; this is inspired by cellular automata but not exact Conway rules.',
    interactionScale: 'edge',
    roiInterpretation: 'Alive/active cells are current interest; susceptible neighborhoods with strong messages are near-future interest.',
    validationSignature: ['local_rule_transitions', 'birth_death_events', 'structured_patches', 'no_random_flicker'],
    educationalPrompt: 'Inspect node transitions to see how local neighbor counts create global structure.'
  }
};

export function roiProcessContractForPreset(presetId, config = {}) {
  const contract = ROI_PROCESS_CONTRACTS[presetId] ?? customProcessContract(config);
  return {
    ...contract,
    components: componentRecipe(config),
    interactionScale: normalizeInteractionScale(contract.interactionScale),
    implementationType: implementationTypeForProcessClass(contract.processClass),
    processContractVersion: 'roi-process-contract-v1'
  };
}

export function implementationTypeForProcessClass(processClass = 'component_composition') {
  return {
    recurring_cluster_bursts: 'state-evolving graph update',
    smooth_migrating_patch: 'analytic time-indexed analog',
    propagating_front: 'hybrid graph-assisted analog',
    intermittent_patch_field: 'analytic time-indexed analog',
    drifting_compact_bursts: 'state-evolving graph update',
    age_of_information_recovery: 'history-aware recovery rule',
    bounded_random_walk_source: 'hybrid graph-assisted analog',
    local_neighbor_propagation: 'state-evolving graph update',
    wave_like_activation: 'analytic wave analog',
    phase_shifted_cycles: 'analytic time-indexed analog',
    front_burnout_analog: 'hybrid graph-assisted analog',
    local_rule_emergence: 'local cellular transition rule',
    component_composition: 'component-composed analog',
    analytic_memoryless: 'analytic time-indexed analog',
    cluster_cooldown_recovery: 'state-evolving graph update',
    analytic_directed_drift: 'analytic time-indexed analog',
    synthetic_field_deformation: 'analytic deformation analog',
    synthetic_branching_growth: 'state-evolving local growth analog',
    synthetic_morph_mutation: 'local seeded mutation analog'
  }[processClass] ?? 'component-composed analog';
}

export function componentRecipe(config = {}) {
  return {
    eventLikelihood: config.eventLikelihood ?? 'uniformLikelihood',
    spatialPattern: config.spatialPattern ?? 'constantField',
    valueDistribution: config.valueDistribution ?? 'constantValue',
    temporalPattern: config.temporalPattern ?? 'static',
    spatialEvolution: config.spatialEvolution ?? config.patternEvolution ?? 'stationary',
    stateModel: config.stateModel ?? 'timeIndexed',
    samplingEffect: config.depletionMode ?? 'none',
    displayLayer: config.displayMode ?? 'sampleValue',
    motionScope: config.motionScope ?? 'perFeature',
    dynamicComplexity: config.dynamicComplexity ?? 'medium'
  };
}

export function processClassForUpdateRule(updateRule = 'memoryless') {
  return {
    memoryless: 'analytic_memoryless',
    cooldownRecovery: 'cluster_cooldown_recovery',
    clusterCooldownRecovery: 'cluster_cooldown_recovery',
    neighborSpread: 'local_neighbor_propagation',
    frontPropagation: 'propagating_front',
    rippleWave: 'wave_like_activation',
    directedDrift: 'analytic_directed_drift',
    lifeLikeLocalRules: 'local_rule_emergence',
    freshnessRecovery: 'age_of_information_recovery'
  }[updateRule] ?? 'local_neighbor_propagation';
}

function customProcessContract(config = {}) {
  return {
    processClass: processClassForConfig(config),
    domainAnalogies: ['custom sample-value composition'],
    simplifiedClaim: 'Custom primitive controls define a seeded educational ROI field; it is not a validated domain process model.',
    interactionScale: ['neighborPropagation', 'branchingGrowth'].includes(config.spatialEvolution) ? 'edge' : config.motionScope === 'global' ? 'global' : 'hybrid',
    roiInterpretation: 'High S(x,y,t) is current sample interest; high L(x,y,t) indicates likely event origin or recurrence.',
    validationSignature: ['no_extinction', 'no_full_saturation', 'no_random_flicker'],
    educationalPrompt: 'Change one primitive at a time and compare Sample Value against Event Likelihood.'
  };
}

function processClassForConfig(config = {}) {
  if (config.depletionMode === 'freshnessAge' || config.depletionMode === 'revisitRecovery') return 'age_of_information_recovery';
  if (config.spatialEvolution === 'neighborPropagation') return 'local_neighbor_propagation';
  if (config.spatialEvolution === 'branchingGrowth') return 'synthetic_branching_growth';
  if (config.spatialEvolution === 'morphMutation') return 'synthetic_morph_mutation';
  if (['expansion', 'contraction', 'divergence', 'convergence', 'shearStretch', 'rotationalSwirl'].includes(config.spatialEvolution)) return 'synthetic_field_deformation';
  if (config.spatialEvolution === 'continuousDrift') return 'smooth_migrating_patch';
  if (config.spatialEvolution === 'randomWalk') return 'bounded_random_walk_source';
  if (config.temporalPattern === 'bursty') return 'recurring_cluster_bursts';
  return 'component_composition';
}

function normalizeInteractionScale(value) {
  return ROI_INTERACTION_SCALES.includes(value) ? value : 'hybrid';
}
