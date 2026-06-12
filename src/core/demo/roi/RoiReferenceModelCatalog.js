export const ROI_REFERENCE_CATALOG_VERSION = 'roi-reference-catalog-v1';

export const CA_TAXONOMY_FAMILIES = [
  'asynchronous',
  'stochastic',
  'multiState',
  'extendedNeighbourhood',
  'nonUniform'
];

export const REQUIRED_REFERENCE_SIGNATURE_IDS = [
  'frontPropagation',
  'waveExcitableMedia',
  'birthDeathEmergence',
  'stationaryTemporalBursts',
  'diffusionSpread',
  'driftTransport',
  'cyclicDominance',
  'clusterFormation',
  'avalancheBurstCascades',
  'predatorPreyMigration',
  'freshnessRecovery',
  'patternFormationMorphogenesis',
  'congestionDensityWaves',
  'structuredSignalPropagation'
];

export const ROI_REFERENCE_MODEL_CATALOG = [
  model('forestFireCA', 'Forest-fire CA', 'cellularAutomata', 'frontPropagation', ['cellularAutomata', 'growth', 'front'], ['multiState', 'extendedNeighbourhood', 'stochastic', 'nonUniform'], 'Active front, susceptible region, and consumed trail.'),
  model('drosselSchwablForestFire', 'Drossel-Schwabl forest-fire model', 'cellularAutomata', 'frontPropagation', ['cellularAutomata', 'growth', 'front'], ['stochastic', 'multiState', 'extendedNeighbourhood'], 'Seeded ignition/growth analog with burnout trail.'),
  model('edenGrowth', 'Eden growth', 'aggregation', 'frontPropagation', ['growth', 'percolation'], ['stochastic', 'extendedNeighbourhood'], 'Compact expanding boundary.'),
  model('invasionPercolation', 'Invasion percolation', 'percolation', 'frontPropagation', ['percolation', 'growth'], ['stochastic', 'nonUniform', 'extendedNeighbourhood'], 'Irregular front through heterogeneous resistance.'),
  model('percolationSpread', 'Percolation spread', 'percolation', 'frontPropagation', ['percolation', 'diffusion'], ['stochastic', 'extendedNeighbourhood'], 'Connectivity-limited spread.'),
  model('diffusionLimitedAggregation', 'DLA / diffusion-limited aggregation', 'aggregation', 'frontPropagation', ['aggregation', 'branching'], ['stochastic', 'extendedNeighbourhood'], 'Branching growth boundary.'),
  model('compactInvasionFronts', 'Compact invasion fronts', 'growth', 'frontPropagation', ['growth', 'front'], ['extendedNeighbourhood'], 'Locally coherent advancing front.'),
  model('branchingGrowthFronts', 'Branching growth fronts', 'growth', 'frontPropagation', ['growth', 'branching'], ['stochastic', 'nonUniform', 'extendedNeighbourhood'], 'Branched spread and active tips.'),

  model('briansBrain', "Brian's Brain", 'cellularAutomata', 'waveExcitableMedia', ['cellularAutomata', 'wave'], ['multiState', 'extendedNeighbourhood'], 'On, dying, and off states create crests and refractory trails.'),
  model('greenbergHastings', 'Greenberg-Hastings model', 'excitableMedia', 'waveExcitableMedia', ['wave', 'excitable'], ['multiState', 'extendedNeighbourhood'], 'Excitation waves followed by recovery.'),
  model('cyclicCellularAutomataWave', 'Cyclic cellular automata', 'cellularAutomata', 'waveExcitableMedia', ['cellularAutomata', 'wave', 'cyclic'], ['multiState', 'extendedNeighbourhood'], 'Cyclic wavefronts and phase progression.'),
  model('spiralWaveExcitableMedia', 'Spiral wave excitable media', 'excitableMedia', 'waveExcitableMedia', ['wave', 'morphogenesis'], ['multiState', 'extendedNeighbourhood'], 'Traveling crests and recovering wake.'),
  model('reactionDiffusionWavefronts', 'Reaction-diffusion wavefront analogs', 'reactionDiffusion', 'waveExcitableMedia', ['wave', 'morphogenesis'], ['continuousScalar', 'extendedNeighbourhood'], 'Scalar activation bands and wavefronts.'),
  model('pulseTrains', 'Pulse trains', 'signal', 'waveExcitableMedia', ['wave', 'signalPropagation'], ['multiState', 'extendedNeighbourhood'], 'Repeated activation crests.'),
  model('refractoryWaveSystems', 'Refractory wave systems', 'excitableMedia', 'waveExcitableMedia', ['wave', 'freshness'], ['multiState', 'memory'], 'Crest/refractory/recovery timing.'),

  model('conwaysGameOfLife', "Conway's Game of Life", 'cellularAutomata', 'birthDeathEmergence', ['cellularAutomata', 'birthDeath'], ['multiState', 'extendedNeighbourhood'], 'Local birth/death creates emergent patches.'),
  model('lifeLikeRules', 'Life-like B/S rules', 'cellularAutomata', 'birthDeathEmergence', ['cellularAutomata', 'birthDeath'], ['multiState', 'extendedNeighbourhood'], 'Rule changes alter local survival and birth.'),
  model('highLife', 'HighLife', 'cellularAutomata', 'birthDeathEmergence', ['cellularAutomata', 'birthDeath'], ['multiState', 'extendedNeighbourhood'], 'Replicator-like local emergence analog.'),
  model('seedsRule', 'Seeds rule', 'cellularAutomata', 'birthDeathEmergence', ['cellularAutomata', 'birthDeath'], ['multiState', 'extendedNeighbourhood'], 'Birth-dominated sparse emergence.'),
  model('generationsStyleCA', 'Generations-style CA', 'cellularAutomata', 'birthDeathEmergence', ['cellularAutomata', 'birthDeath', 'wave'], ['multiState', 'extendedNeighbourhood', 'memory'], 'Active states age through finite recovery.'),
  model('localBirthDeathPatchDynamics', 'Local birth-death patch dynamics', 'ecological', 'birthDeathEmergence', ['birthDeath', 'ecological'], ['stochastic', 'extendedNeighbourhood'], 'Patches appear, disappear, and reorganize.'),
  model('oscillatorsAndMovingStructures', 'Oscillators and moving structures', 'cellularAutomata', 'birthDeathEmergence', ['birthDeath', 'cyclic'], ['multiState', 'extendedNeighbourhood'], 'Local rules produce repeated and moving structures.'),

  model('recurringEventHotspots', 'Recurring event hotspots', 'eventProcess', 'stationaryTemporalBursts', ['stationaryBurst'], ['stochastic', 'nonUniform'], 'Stable basins flare repeatedly.'),
  model('burstyReportingProcesses', 'Bursty reporting processes', 'eventProcess', 'stationaryTemporalBursts', ['stationaryBurst'], ['asynchronous', 'stochastic'], 'Intermittent activation/deactivation windows.'),
  model('intermittentActivationPatches', 'Intermittent activation / deactivation', 'eventProcess', 'stationaryTemporalBursts', ['stationaryBurst'], ['asynchronous', 'multiState'], 'On/off patches with quiet periods.'),
  model('contactProcessLikePatches', 'Contact-process-like on/off patches', 'epidemic', 'stationaryTemporalBursts', ['stationaryBurst', 'diffusion'], ['stochastic', 'multiState', 'extendedNeighbourhood'], 'Local activation and recovery around basins.'),
  model('stationaryHotspotBasins', 'Stationary hotspot basins with temporal pulses', 'eventProcess', 'stationaryTemporalBursts', ['stationaryBurst'], ['nonUniform', 'stochastic'], 'High-likelihood basins pulse without global drift.'),

  model('sirCellularEpidemic', 'SIR cellular epidemic models', 'epidemic', 'diffusionSpread', ['diffusion', 'epidemic'], ['multiState', 'extendedNeighbourhood', 'stochastic'], 'Susceptible, infected, and recovered states spread locally.'),
  model('sisCellularEpidemic', 'SIS cellular epidemic models', 'epidemic', 'diffusionSpread', ['diffusion', 'epidemic'], ['multiState', 'extendedNeighbourhood', 'stochastic'], 'Activation spreads and recovers repeatedly.'),
  model('seirCellularEpidemic', 'SEIR cellular epidemic models', 'epidemic', 'diffusionSpread', ['diffusion', 'epidemic'], ['multiState', 'extendedNeighbourhood', 'stochastic'], 'Exposed intermediate state before activation.'),
  model('contactProcess', 'Contact process', 'epidemic', 'diffusionSpread', ['diffusion'], ['stochastic', 'extendedNeighbourhood'], 'Local activation and recovery.'),
  model('stochasticInfectionRecovery', 'Stochastic infection / recovery spread', 'epidemic', 'diffusionSpread', ['diffusion'], ['stochastic', 'multiState', 'extendedNeighbourhood'], 'Seeded probabilistic spread analog.'),
  model('localDiffusionSmoothing', 'Local diffusion / smoothing spread', 'diffusion', 'diffusionSpread', ['diffusion'], ['extendedNeighbourhood', 'continuousScalar'], 'Activity diffuses through nearby cells.'),
  model('percolationBasedSpread', 'Percolation-based spread', 'percolation', 'diffusionSpread', ['diffusion', 'percolation'], ['stochastic', 'nonUniform', 'extendedNeighbourhood'], 'Spread through connected local opportunities.'),

  model('latticeGasCA', 'Lattice gas CA', 'transport', 'driftTransport', ['drift', 'transport'], ['multiState', 'extendedNeighbourhood'], 'Density-like movement through grid channels.'),
  model('hppLatticeGas', 'HPP lattice gas', 'transport', 'driftTransport', ['drift', 'transport'], ['multiState', 'extendedNeighbourhood'], 'Discrete transport analogy.'),
  model('fhpLatticeGas', 'FHP lattice gas', 'transport', 'driftTransport', ['drift', 'transport'], ['multiState', 'extendedNeighbourhood'], 'Discrete transport analogy with richer directions.'),
  model('latticeBoltzmannStyleGrids', 'Lattice-Boltzmann-style grids', 'transport', 'driftTransport', ['drift', 'transport'], ['multiState', 'extendedNeighbourhood', 'continuousScalar'], 'Moving density patches as scalar ROI analogs.'),
  model('coherentPatchTransport', 'Coherent patch transport', 'transport', 'driftTransport', ['drift'], ['continuousScalar'], 'Moving coherent ROI features.'),
  model('shearStretchDeformation', 'Shear/stretch deformation', 'transport', 'driftTransport', ['drift', 'morphogenesis'], ['continuousScalar', 'nonUniform'], 'Synthetic scalar deformation.'),
  model('rotationalSwirlFeatureMotion', 'Rotational/swirl feature motion', 'transport', 'driftTransport', ['drift'], ['continuousScalar', 'nonUniform'], 'Rotating scalar ROI features.'),
  model('movingDensityPatches', 'Moving density patches', 'transport', 'driftTransport', ['drift', 'congestion'], ['continuousScalar'], 'Feature movement without physical current.'),

  model('rockPaperScissorsSpatialCA', 'Rock-paper-scissors spatial CA', 'ecological', 'cyclicDominance', ['cyclic', 'ecological'], ['multiState', 'extendedNeighbourhood'], 'Phase-shifted dominance fronts.'),
  model('cyclicCellularAutomataDominance', 'Cyclic cellular automata', 'cellularAutomata', 'cyclicDominance', ['cyclic'], ['multiState', 'extendedNeighbourhood'], 'Cyclic regional activation.'),
  model('cyclicEcologicalDominance', 'Cyclic ecological dominance', 'ecological', 'cyclicDominance', ['cyclic', 'ecological'], ['multiState', 'extendedNeighbourhood'], 'Rotating ecological opportunity regions.'),
  model('rotatingDominanceFronts', 'Rotating dominance fronts', 'ecological', 'cyclicDominance', ['cyclic', 'front'], ['multiState', 'extendedNeighbourhood'], 'Moving phase boundaries.'),
  model('phaseShiftedCyclicRegions', 'Phase-shifted cyclic regions', 'cyclic', 'cyclicDominance', ['cyclic'], ['nonUniform', 'multiState'], 'Regions peak at different phases.'),

  model('isingGlauberDynamics', 'Ising / Glauber-style spin dynamics', 'domainFormation', 'clusterFormation', ['domainFormation'], ['multiState', 'extendedNeighbourhood', 'stochastic'], 'Local alignment and domain boundaries.'),
  model('voterModel', 'Voter model', 'domainFormation', 'clusterFormation', ['domainFormation'], ['stochastic', 'extendedNeighbourhood'], 'Consensus regions and coarsening.'),
  model('majorityRuleCA', 'Majority-rule CA', 'cellularAutomata', 'clusterFormation', ['domainFormation'], ['multiState', 'extendedNeighbourhood'], 'Local majority drives domains.'),
  model('schellingSegregation', 'Schelling segregation', 'domainFormation', 'clusterFormation', ['domainFormation'], ['asynchronous', 'nonUniform', 'extendedNeighbourhood'], 'Local preference creates clusters.'),
  model('localConsensusModels', 'Local consensus models', 'domainFormation', 'clusterFormation', ['domainFormation'], ['extendedNeighbourhood'], 'Neighborhood agreement and domain growth.'),
  model('coarseningDomains', 'Coarsening domains', 'domainFormation', 'clusterFormation', ['domainFormation'], ['extendedNeighbourhood'], 'Domains merge and stabilize.'),
  model('phaseSeparation', 'Phase separation', 'domainFormation', 'clusterFormation', ['domainFormation'], ['multiState', 'extendedNeighbourhood'], 'Separated regions with boundaries.'),
  model('clusteringFromLocalAlignment', 'Clustering from local alignment', 'domainFormation', 'clusterFormation', ['domainFormation'], ['extendedNeighbourhood', 'nonUniform'], 'Local rules create clustered structure.'),

  model('btwSandpile', 'Bak-Tang-Wiesenfeld sandpile', 'cascade', 'avalancheBurstCascades', ['avalanche'], ['multiState', 'extendedNeighbourhood'], 'Threshold buildup and avalanche propagation.'),
  model('mannaSandpile', 'Manna sandpile', 'cascade', 'avalancheBurstCascades', ['avalanche'], ['stochastic', 'multiState', 'extendedNeighbourhood'], 'Stochastic redistribution and avalanches.'),
  model('thresholdCascadeModels', 'Threshold cascade models', 'cascade', 'avalancheBurstCascades', ['avalanche'], ['multiState', 'extendedNeighbourhood'], 'Local threshold crossing cascades.'),
  model('selfOrganizedCriticalBursts', 'Self-organized critical bursts', 'cascade', 'avalancheBurstCascades', ['avalanche'], ['stochastic', 'extendedNeighbourhood'], 'Quiet buildup then rare large bursts.'),
  model('avalanchePropagation', 'Avalanche propagation', 'cascade', 'avalancheBurstCascades', ['avalanche'], ['extendedNeighbourhood'], 'Local burst propagation.'),
  model('rareExtremeCascadeEvents', 'Rare extreme cascade events', 'cascade', 'avalancheBurstCascades', ['avalanche'], ['stochastic', 'nonUniform'], 'Sparse extreme activations.'),

  model('waTorPredatorPrey', 'Wa-Tor predator-prey model', 'ecological', 'predatorPreyMigration', ['predatorPrey', 'ecological'], ['multiState', 'extendedNeighbourhood'], 'Moving predator/prey patches.'),
  model('latticeLotkaVolterra', 'Lattice Lotka-Volterra models', 'ecological', 'predatorPreyMigration', ['predatorPrey', 'cyclic'], ['multiState', 'extendedNeighbourhood'], 'Oscillating ecological patches.'),
  model('predatorPreyPursuitWaves', 'Predator-prey pursuit waves', 'ecological', 'predatorPreyMigration', ['predatorPrey', 'wave'], ['multiState', 'extendedNeighbourhood'], 'Chase-like phase-shifted activity.'),
  model('oscillatingEcologicalPatches', 'Oscillating ecological patches', 'ecological', 'predatorPreyMigration', ['predatorPrey', 'cyclic'], ['multiState', 'nonUniform'], 'Patches peak in sequence.'),
  model('populationMigrationFronts', 'Population migration fronts', 'ecological', 'predatorPreyMigration', ['predatorPrey', 'front'], ['extendedNeighbourhood'], 'Migrating activity boundaries.'),
  model('chaseLikePhaseShiftedActivity', 'Chase-like phase-shifted activity', 'ecological', 'predatorPreyMigration', ['predatorPrey', 'cyclic'], ['multiState', 'extendedNeighbourhood'], 'One phase follows another through space.'),

  model('ageOfInformationMonitoring', 'Age-of-information monitoring', 'monitoring', 'freshnessRecovery', ['freshness'], ['historyAware', 'multiState'], 'Stale regions regain priority.'),
  model('refractoryRecoveryAnalogs', 'Refractory/recovery analogs', 'monitoring', 'freshnessRecovery', ['freshness', 'wave'], ['multiState', 'memory'], 'Recently active regions cool then recover.'),
  model('cooldownRecoveryProcesses', 'Cooldown/recovery processes', 'monitoring', 'freshnessRecovery', ['freshness'], ['multiState', 'memory'], 'Finite cooldown and recovery.'),
  model('revisitRecovery', 'Revisit recovery', 'monitoring', 'freshnessRecovery', ['freshness'], ['historyAware', 'nonUniform'], 'Sampling history changes future value.'),
  model('historyAwareSamplingValue', 'History-aware sampling value', 'monitoring', 'freshnessRecovery', ['freshness'], ['historyAware'], 'Value depends on synthetic visits.'),
  model('staleRegionMonitoring', 'Stale-region monitoring', 'monitoring', 'freshnessRecovery', ['freshness'], ['historyAware', 'nonUniform'], 'Unvisited regions become valuable.'),

  model('turingPatternAnalogs', 'Turing pattern / reaction-diffusion spot/stripe analogs', 'reactionDiffusion', 'patternFormationMorphogenesis', ['morphogenesis'], ['continuousScalar', 'extendedNeighbourhood'], 'Spot/stripe-like self-organization.'),
  model('grayScottAnalogs', 'Gray-Scott-like spot/stripe analogs', 'reactionDiffusion', 'patternFormationMorphogenesis', ['morphogenesis'], ['continuousScalar', 'extendedNeighbourhood'], 'Splitting/merging spot and stripe analogs.'),
  model('morphingPatches', 'Morphing patches', 'morphogenesis', 'patternFormationMorphogenesis', ['morphogenesis'], ['stochastic', 'nonUniform'], 'Local seeded shape mutation.'),
  model('spotSplittingMerging', 'Spot splitting / merging', 'morphogenesis', 'patternFormationMorphogenesis', ['morphogenesis'], ['extendedNeighbourhood', 'multiState'], 'Regions divide and recombine.'),
  model('stripeBandFormation', 'Stripe / band formation', 'morphogenesis', 'patternFormationMorphogenesis', ['morphogenesis'], ['extendedNeighbourhood', 'continuousScalar'], 'Band/stripe organization.'),
  model('spatialSelfOrganization', 'Spatial self-organization', 'morphogenesis', 'patternFormationMorphogenesis', ['morphogenesis', 'domainFormation'], ['nonUniform', 'extendedNeighbourhood'], 'Structured patterns emerge from local interactions.'),

  model('nagelSchreckenbergTraffic', 'Nagel-Schreckenberg traffic CA', 'traffic', 'congestionDensityWaves', ['congestion'], ['stochastic', 'multiState', 'extendedNeighbourhood'], 'Stop-go waves and density clusters.'),
  model('bihamMiddletonLevineTraffic', 'Biham-Middleton-Levine traffic model', 'traffic', 'congestionDensityWaves', ['congestion'], ['multiState', 'extendedNeighbourhood'], 'Gridlock and directional density waves.'),
  model('stopGoWaves', 'Stop-go waves', 'traffic', 'congestionDensityWaves', ['congestion'], ['extendedNeighbourhood'], 'Moving density pulses.'),
  model('jamFronts', 'Jam fronts', 'traffic', 'congestionDensityWaves', ['congestion', 'front'], ['extendedNeighbourhood', 'multiState'], 'Boundary between congested and released regions.'),
  model('movingDensityClusters', 'Moving density clusters', 'traffic', 'congestionDensityWaves', ['congestion', 'drift'], ['continuousScalar', 'extendedNeighbourhood'], 'Mobile clustered density.'),
  model('congestionReleasePatterns', 'Congestion / release patterns', 'traffic', 'congestionDensityWaves', ['congestion'], ['multiState', 'memory'], 'Build-up and release cycles.'),

  model('wireworld', 'Wireworld', 'cellularAutomata', 'structuredSignalPropagation', ['signalPropagation'], ['multiState', 'extendedNeighbourhood', 'nonUniform'], 'Directed pulse paths through structured substrate.'),
  model('structuredGridSignals', 'Signal propagation on structured grids', 'signal', 'structuredSignalPropagation', ['signalPropagation'], ['nonUniform', 'extendedNeighbourhood'], 'Signals follow channels.'),
  model('directedPulsePaths', 'Directed pulse paths', 'signal', 'structuredSignalPropagation', ['signalPropagation'], ['nonUniform', 'extendedNeighbourhood'], 'Pulse movement along routes.'),
  model('branchingSignalNetworks', 'Branching signal networks', 'signal', 'structuredSignalPropagation', ['signalPropagation'], ['graph', 'nonUniform'], 'Branching activation pathways.'),
  model('relayActivationPathways', 'Relay / activation pathways', 'signal', 'structuredSignalPropagation', ['signalPropagation'], ['asynchronous', 'multiState', 'nonUniform'], 'Sequential relay activation.')
];

export function referenceModelsForSignature(signatureId) {
  return ROI_REFERENCE_MODEL_CATALOG.filter((entry) => entry.mapsToSignature === signatureId);
}

export function referenceSignatureCoverageMatrix(signatures = []) {
  const signatureIds = signatures.map((signature) => signature.id);
  const coverageBySignature = Object.fromEntries(signatureIds.map((id) => [
    id,
    referenceModelsForSignature(id).map((entry) => entry.id)
  ]));
  const coverageByModelFamily = groupModelIdsBy('modelFamily');
  const coverageByCaFamily = Object.fromEntries(CA_TAXONOMY_FAMILIES.map((family) => [
    family,
    ROI_REFERENCE_MODEL_CATALOG
      .filter((entry) => entry.caTaxonomyFamilies?.includes(family))
      .map((entry) => entry.id)
  ]));
  const coverageTags = [...new Set(ROI_REFERENCE_MODEL_CATALOG.flatMap((entry) => entry.coverageTags ?? []))].sort();
  return {
    catalogVersion: ROI_REFERENCE_CATALOG_VERSION,
    signatures: signatureIds,
    referenceModels: ROI_REFERENCE_MODEL_CATALOG.map((entry) => entry.id),
    coverageBySignature,
    coverageByModelFamily,
    coverageByCaFamily,
    coverageTags
  };
}

function groupModelIdsBy(key) {
  const groups = {};
  for (const entry of ROI_REFERENCE_MODEL_CATALOG) {
    const group = entry[key] ?? 'unknown';
    groups[group] = groups[group] ?? [];
    groups[group].push(entry.id);
  }
  return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
}

function model(id, name, modelFamily, mapsToSignature, coverageTags, caTaxonomyFamilies, usefulObservableBehavior) {
  const caTaxonomy = caTaxonomyForFamilies(caTaxonomyFamilies);
  return {
    id,
    name,
    modelFamily,
    mapsToSignature,
    usefulObservableBehavior,
    spatialSignature: spatialSignatureFor(mapsToSignature),
    temporalSignature: temporalSignatureFor(mapsToSignature),
    deltaSignature: deltaSignatureFor(mapsToSignature),
    roiInterpretation: roiInterpretationFor(mapsToSignature),
    caTaxonomy,
    caTaxonomyFamilies,
    coverageTags,
    notes: 'Catalog reference only. The ROI demo synthesizes a sampling-relevant analog, not this exact model.',
    notA: `Not an implementation of ${name}.`
  };
}

function caTaxonomyForFamilies(families = []) {
  const has = (family) => families.includes(family);
  return {
    updateSchedule: has('asynchronous') ? 'asynchronous' : has('historyAware') ? 'historyAware' : 'synchronous',
    stochasticity: has('stochastic') ? 'seededStochastic' : 'deterministic',
    stateSpace: has('continuousScalar') ? 'continuousScalar' : has('multiState') ? 'multiState' : 'hybridScalarState',
    neighborhood: has('graph') ? 'graph' : has('extendedNeighbourhood') ? 'extended' : has('memory') || has('historyAware') ? 'memory' : 'local',
    ruleUniformity: has('nonUniform') ? 'nonUniform' : 'uniform',
    memory: has('historyAware') ? 'historyAware' : has('memory') ? 'finiteMemory' : has('multiState') ? 'refractory' : 'memoryless',
    boundaryStyle: 'abstractDemo',
    phenotypeClass: has('stochastic') ? 'intermittent' : has('continuousScalar') ? 'complex' : 'mixed'
  };
}

function spatialSignatureFor(signatureId) {
  return {
    frontPropagation: 'active transition boundary and trail',
    waveExcitableMedia: 'crest, refractory wake, and activation band',
    birthDeathEmergence: 'local patches that appear/disappear',
    stationaryTemporalBursts: 'stable basins with pulsing active regions',
    diffusionSpread: 'local spread through neighbors',
    driftTransport: 'coherent feature movement/deformation',
    cyclicDominance: 'phase-shifted regions and rotating fronts',
    clusterFormation: 'domains, clusters, and boundaries',
    avalancheBurstCascades: 'rare local burst cascades',
    predatorPreyMigration: 'moving interacting population patches',
    freshnessRecovery: 'stations or cells cooling and recovering',
    patternFormationMorphogenesis: 'spots, stripes, splitting, and merging',
    congestionDensityWaves: 'density clusters, jam fronts, and release waves',
    structuredSignalPropagation: 'directed pulse paths and branching relays'
  }[signatureId] ?? 'observable spatial structure';
}

function temporalSignatureFor(signatureId) {
  return {
    stationaryTemporalBursts: 'bursty recurrent windows',
    avalancheBurstCascades: 'quiet buildup with sudden bursts',
    freshnessRecovery: 'cooldown followed by recovery',
    cyclicDominance: 'phase-shifted cycles',
    predatorPreyMigration: 'oscillatory migration cycles',
    congestionDensityWaves: 'stop-go buildup and release',
    structuredSignalPropagation: 'sequential pulse timing'
  }[signatureId] ?? 'dynamic temporal evolution';
}

function deltaSignatureFor(signatureId) {
  return {
    frontPropagation: 'localized boundary advance',
    waveExcitableMedia: 'crest moves and leaves recovering cells',
    birthDeathEmergence: 'local birth/death transitions',
    stationaryTemporalBursts: 'basin intensity changes without major relocation',
    diffusionSpread: 'activity spreads to nearby cells',
    driftTransport: 'coherent displacement between frames',
    cyclicDominance: 'regional phase replacement',
    clusterFormation: 'domain coarsening or boundary movement',
    avalancheBurstCascades: 'rare high frame delta around cascade windows',
    predatorPreyMigration: 'moving phase-shifted patch deltas',
    freshnessRecovery: 'cooling and recovery state transitions',
    patternFormationMorphogenesis: 'spot/stripe splitting or merging',
    congestionDensityWaves: 'density wave movement and release',
    structuredSignalPropagation: 'pulse advances along a path'
  }[signatureId] ?? 'measurable frame-to-frame change';
}

function roiInterpretationFor(signatureId) {
  return {
    frontPropagation: 'sample the active boundary or susceptible cells ahead',
    waveExcitableMedia: 'sample crests or near-future activation bands',
    birthDeathEmergence: 'inspect transition regions and active patches',
    stationaryTemporalBursts: 'time visits around active/recovering basins',
    diffusionSpread: 'watch incoming neighbor influence',
    driftTransport: 'lead coherent moving features',
    cyclicDominance: 'schedule visits by phase',
    clusterFormation: 'sample domains or boundaries depending on goal',
    avalancheBurstCascades: 'react quickly to rare cascade windows',
    predatorPreyMigration: 'route between migrating activity basins',
    freshnessRecovery: 'avoid immediate repeats and revisit stale cells',
    patternFormationMorphogenesis: 'sample emerging spots, stripes, or boundaries',
    congestionDensityWaves: 'sample density fronts and release regions',
    structuredSignalPropagation: 'sample activated path segments or likely next relay cells'
  }[signatureId] ?? 'interpret high S as current ROI and high L as likely future ROI';
}
