import { sampleFieldBehaviorPresetById } from './SampleFieldBehaviorPresets.js';
import { roiProcessContractForPreset } from './roi/RoiProcessContracts.js';
import { sampleFieldComponentContract, sampleFieldComponentQuestion } from './SampleFieldComponentContracts.js';

export const SAMPLE_FIELD_EXPLAINER_GROUPS = [
  'behaviorPreset',
  'eventLikelihood',
  'spatialPattern',
  'valueDistribution',
  'temporalPattern',
  'spatialEvolution',
  'interactionScale',
  'stateModel',
  'samplingEffect',
  'displayLayer'
];

export const SAMPLE_FIELD_GROUP_SUMMARIES = {
  behaviorPreset: {
    label: 'Process Pattern',
    question: 'Which example Process Pattern is driving the sample-field behavior?',
    summary: 'Process Patterns are the primary teaching entry point; Custom Composer edits primitive sample-field controls directly.'
  },
  eventLikelihood: {
    label: 'Source / Initial Field',
    question: 'Where does process activity originate, recur, or receive initial support?',
    summary: 'Controls regional source support C_k(t) and cell source/readiness L_i(t): the substrate used by origins, sparse sites, jumps, walks, and propagation. This is not the realized sample value.'
  },
  spatialPattern: {
    label: 'Spatial Pattern / Geometry',
    question: 'Where is sample value located in space?',
    summary: 'Controls the geometry of realized sample value once activity exists.'
  },
  valueDistribution: {
    label: 'Value Distribution',
    question: 'How are values assigned within the selected spatial pattern?',
    summary: 'Controls value magnitude shape, including constant, uniform random, Gaussian / Normal, skewed, bimodal, heavy-tailed, and rare extreme values.'
  },
  temporalPattern: {
    label: 'Temporal Pattern',
    question: 'How does value intensity change over time?',
    summary: 'Controls when sample value rises, fades, pulses, or stays steady.'
  },
  spatialEvolution: {
    label: 'Spatial Evolution / Motion Rule',
    question: 'How do values move or spread?',
    summary: 'Controls how activity moves, jumps, spreads, or mutates across space.'
  },
  interactionScale: {
    label: 'Interaction Scale / Hierarchy',
    question: 'At what scale does behavior act?',
    summary: 'Controls whether behavior acts globally, by cluster/community, by cell/node, by edge/neighbor, or across multiple scales.'
  },
  stateModel: {
    label: 'State Model / Update Rule',
    question: 'What does the field depend on?',
    summary: 'Controls whether the next frame is computed directly from time or from graph hierarchy state: clusters C_k(t), cell readiness L_i(t), activation A_i(t), and longer history.'
  },
  samplingEffect: {
    label: 'Sampling Effect / Freshness',
    question: 'How do visits or samples change future value?',
    summary: 'Controls depletion, freshness, neighborhood cooling, and revisit recovery in the demo.'
  },
  displayLayer: {
    label: 'Display / Diagnostic Layer',
    question: 'What value layer am I viewing?',
    summary: 'Controls whether the heatmap shows raw value, depleted value, freshness, or the active sample layer.'
  }
};

export const SAMPLE_FIELD_BEHAVIOR_SIGNATURES = {
  recurringHotspots: {
    observablePattern: 'Separated likelihood basins stay in place while one or more basins flare, cool, and recover.',
    timeBehavior: 'Watch activity recur in familiar neighborhoods rather than moving globally across the map.',
    cellImportance: 'Cells matter when their basin is active now, recovering soon, or likely to reactivate from high L(x,y,t).',
    bestViews: ['Sampling Value + Source Overlay', 'Source Field', 'Cell / Node States', 'Diagnostics Overlay'],
    failureSigns: ['basins collapse into one broad blob', 'no temporal recurrence', 'whole-domain activation', 'no active/cooling/recovering states'],
    roiMeaning: {
      current: 'currently active basin cells',
      nearFuture: 'quiet high-source or recovering basins',
      low: 'cooling basins or low-likelihood background',
      intuition: 'time visits around active windows while keeping fallback routes to likely recovering basins'
    }
  },
  expandingFront: {
    observablePattern: 'An active scalar boundary spreads into nearby cells.',
    timeBehavior: 'Watch the active edge advance while adjacent cells become ready or active.',
    cellImportance: 'Boundary cells are valuable now; cells just ahead of the edge are near-future value.',
    bestViews: ['Sampling Value', 'Cell / Node States', 'Process Influence Messages', 'Diagnostics Overlay'],
    failureSigns: ['random speckle', 'no clear boundary', 'whole-domain activation', 'no local continuity'],
    roiMeaning: {
      current: 'active boundary cells',
      nearFuture: 'susceptible cells adjacent to the boundary',
      low: 'background behind or far ahead of the front',
      intuition: 'track the moving edge or sample just ahead of it'
    }
  },
  patchyRainfall: {
    observablePattern: 'Irregular but spatially coherent patches intensify, fade, and reappear.',
    timeBehavior: 'Watch patches pulse without becoming independent frame noise.',
    cellImportance: 'Cells matter when they are in active coherent patches or likely textured neighborhoods.',
    bestViews: ['Sampling Value', 'Source Field', 'Sampling Value + Source Overlay', 'Diagnostics Overlay'],
    failureSigns: ['independent random flicker', 'no patch coherence', 'too sparse to inspect', 'whole-domain saturation'],
    roiMeaning: {
      current: 'currently bright patch neighborhoods',
      nearFuture: 'nearby coherent likelihood texture pockets',
      low: 'cold texture regions with little event-proneness',
      intuition: 'sample robust patch neighborhoods instead of chasing isolated single pixels'
    }
  },
  driftingStormCells: {
    observablePattern: 'Compact cells pulse rapidly while drifting as separate features.',
    timeBehavior: 'Watch cells move coherently and brighten/dim without disappearing permanently between pulses.',
    cellImportance: 'Cells matter when they are bright now or lie along a compact cell drift envelope.',
    bestViews: ['Sampling Value', 'Sampling Value + Source Overlay', 'Source Field', 'Diagnostics Overlay'],
    failureSigns: ['no visible drift', 'between-pulse extinction', 'one broad blob', 'random teleporting'],
    roiMeaning: {
      current: 'bright compact storm-cell analogs',
      nearFuture: 'cells along each feature drift envelope',
      low: 'background outside the compact moving cells',
      intuition: 'intercept moving high-value cells before they fade'
    }
  },
  freshnessRevisitValue: {
    observablePattern: 'Fixed stations or sites cool after synthetic visits and recover value as they become stale.',
    timeBehavior: 'Watch recently sampled cells remain low while unvisited or stale cells warm back up.',
    cellImportance: 'Cells matter when they are stale enough to justify a revisit.',
    bestViews: ['Freshness / Revisit Value', 'Cell / Node States', 'Sampling Value', 'Diagnostics Overlay'],
    failureSigns: ['global drift', 'no recovery', 'no station structure', 'recently sampled cells stay high'],
    roiMeaning: {
      current: 'stale recovered cells or stations',
      nearFuture: 'cells warming toward revisit value',
      low: 'recently sampled or cooling cells',
      intuition: 'avoid immediate duplicate sampling and revisit after enough recovery time'
    }
  },
  neighborSpread: {
    observablePattern: 'Activity spreads locally from active nodes through neighbor influence.',
    timeBehavior: 'Watch adjacent cells warm in response to active neighbors and incoming messages.',
    cellImportance: 'Cells matter when active now or receiving strong neighbor influence.',
    bestViews: ['Process Influence Messages', 'Cell / Node States', 'Community + Messages', 'Diagnostics Overlay'],
    failureSigns: ['no message evidence', 'no active neighbors', 'one-blob collapse', 'activity does not spread'],
    roiMeaning: {
      current: 'active spreading nodes',
      nearFuture: 'neighbors with strong incoming messages',
      low: 'isolated cells with low likelihood and weak incoming messages',
      intuition: 'sample active cells and watch message direction for likely spread'
    }
  },
  rippleActivation: {
    observablePattern: 'A wave-like scalar activation crest travels through local neighborhoods.',
    timeBehavior: 'Watch the crest phase progress while remaining locally coherent.',
    cellImportance: 'Cells matter on the current crest or near the next likely crest neighborhood.',
    bestViews: ['Sampling Value + Source Overlay', 'Process Influence Messages', 'Cell / Node States', 'Diagnostics Overlay'],
    failureSigns: ['static heatmap', 'random flicker', 'no local continuity', 'crest impossible to identify'],
    roiMeaning: {
      current: 'active crest cells',
      nearFuture: 'cells just ahead of the crest',
      low: 'cells behind the crest after activation fades',
      intuition: 'sample ahead of the current crest rather than chasing only the brightest cell'
    }
  },
  oscillatingEcologicalField: {
    observablePattern: 'Several regions rise and fall with repeatable phase-shifted cycles.',
    timeBehavior: 'Watch basins peak at different phases instead of all activating together.',
    cellImportance: 'Cells matter when their basin is peaking now or rising toward a near-future peak.',
    bestViews: ['Sampling Value', 'Source Field', 'Sampling Value + Source Overlay', 'Diagnostics Overlay'],
    failureSigns: ['all regions peak together', 'no recurring peaks', 'extinction', 'full saturation'],
    roiMeaning: {
      current: 'currently peaking cyclic basins',
      nearFuture: 'rising basins with high source support',
      low: 'basins in low phase',
      intuition: 'schedule visits around phase differences between basins'
    }
  },
  forestFireFrontInspired: {
    observablePattern: 'An active boundary advances through susceptible cells and leaves consumed or depleted cells behind.',
    timeBehavior: 'Watch cells ahead of the front become active while cells behind become consumed or low value.',
    cellImportance: 'Cells matter on the active boundary now, and just ahead of it soon.',
    bestViews: ['Cell / Node States', 'Process Influence Messages', 'Sampling Value', 'Diagnostics Overlay'],
    failureSigns: ['whole-domain activation', 'random speckle', 'no consumed trail', 'no clear active boundary'],
    roiMeaning: {
      current: 'active front boundary',
      nearFuture: 'susceptible cells adjacent to active cells',
      low: 'consumed or depleted cells behind the front',
      intuition: 'track the moving boundary or sample ahead of it'
    }
  },
  lifeLikeCellularEmergenceInspired: {
    observablePattern: 'Local cell rules create structured activity that appears, disappears, and reorganizes.',
    timeBehavior: 'Watch births, deaths, and local transitions create global patch structure.',
    cellImportance: 'Cells matter when active now or in neighborhoods where local rules may create activation.',
    bestViews: ['Cell / Node States', 'Process Influence Messages', 'Diagnostics Overlay', 'Sampling Value'],
    failureSigns: ['independent frame noise', 'no local-rule transitions', 'all cells active', 'all cells dead'],
    roiMeaning: {
      current: 'active local-rule cells',
      nearFuture: 'susceptible neighborhoods with strong local influence',
      low: 'inactive neighborhoods without supportive neighbors',
      intuition: 'inspect local transitions rather than assuming one smooth global field'
    }
  }
};

const EVENT_LIKELIHOOD_EXPLAINERS = {
  uniformLikelihood: {
    label: 'Uniform Source Field',
    short: 'Every cell has equal source support before spatial pattern shaping.',
    meaning: 'The process substrate contributes no preferred origin zones.',
    expectedBehavior: 'Clusters, sparse targets, jumps, walks, and propagation are not biased toward any particular part of the domain.',
    parameters: ['Seed'],
    pairsWellWith: ['Constant Field', 'Clustered Field', 'Static'],
    strategy: 'Use as a neutral baseline for comparing spatial pattern and value distribution controls.',
    boundaryNote: 'This replaces the old Constant Field-as-substrate idea; Constant Field is now only a spatial pattern.'
  },
  gaussianLikelihood: {
    label: 'Gaussian Source Basin',
    short: 'Process activity is most supported near one smooth seeded center.',
    meaning: 'The substrate has a single broad source-supported region.',
    expectedBehavior: 'Origin centers, sparse targets, and dynamic relocations tend to favor one seeded zone.',
    parameters: ['Seed', 'Center', 'Spread'],
    pairsWellWith: ['Clustered Field', 'Sparse Targets', 'Bursty'],
    strategy: 'Teaches planning around a dominant event-prone region without hard-coding target cells.',
    boundaryNote: 'Gaussian source support biases origins; Gaussian / Normal value distribution controls value draws.'
  },
  multiModalLikelihood: {
    label: 'Multi-Source Basins',
    short: 'Process activity is supported around several seeded source regions.',
    meaning: 'The substrate creates multiple replayable source basins.',
    expectedBehavior: 'Source Field view shows separated persistent basins. Sampling Value only shows realized activity when a behavior uses those basins.',
    parameters: ['Seed', 'Mode Count', 'Minimum Mode Separation', 'Domain Coverage', 'Mode Spread'],
    pairsWellWith: ['Clustered Field', 'Discrete Jump', 'Random Walk'],
    strategy: 'Teaches assignment and fallback between several likely event regions.',
    boundaryNote: 'Multi-Source Basins is a source substrate, not a full behavior by itself. The basins are deterministic from seed, not regenerated from Math.random during updates.'
  },
  gradientLikelihood: {
    label: 'Gradient Source Field',
    short: 'Source support increases along a seeded directional trend.',
    meaning: 'The substrate makes one side or direction more supportive.',
    expectedBehavior: 'New centers, jumps, and walks favor the high-source side of the heatmap.',
    parameters: ['Seed', 'Gradient Direction'],
    pairsWellWith: ['Gradient / Trend', 'Front / Boundary', 'Continuous Drift'],
    strategy: 'Teaches routes that trade travel cost against a broad event-prone region.',
    boundaryNote: 'This is not current flow or terrain slope.'
  },
  patchyLikelihood: {
    label: 'Patchy Source Field',
    short: 'Process activity favors irregular but spatially correlated source patches.',
    meaning: 'The source substrate is locally coherent, so neighboring cells can share support.',
    expectedBehavior: 'Origins and propagation prefer replayable patch neighborhoods.',
    parameters: ['Seed', 'Patch Scale'],
    pairsWellWith: ['Patchy / Correlated Field', 'Neighbor Propagation', 'Intermittent Activity'],
    strategy: 'Teaches local search where nearby cells are informative.',
    boundaryNote: 'Patchiness is deterministic from seed; it is not per-frame noise.'
  },
  seededTextureLikelihood: {
    label: 'Seeded Texture Source Field',
    short: 'Process activity uses a deterministic texture as the source substrate.',
    meaning: 'The substrate is irregular at coarse and fine scales while remaining replayable.',
    expectedBehavior: 'Sparse sites, centers, and evolving features favor textured high-source pockets.',
    parameters: ['Seed', 'Texture Scale'],
    pairsWellWith: ['Seeded Texture', 'Random Pulses', 'State-Evolving'],
    strategy: 'Teaches planning over irregular event-prone terrain without flow or land coupling.',
    boundaryNote: 'Texture source support is separate from value-distribution randomness.'
  },
  sparseCandidateSites: {
    label: 'Sparse Source Sites',
    short: 'Process activity favors a small set of seeded source locations.',
    meaning: 'The substrate acts like a replayable candidate-site map for isolated event origins.',
    expectedBehavior: 'Sparse targets and jump destinations tend to snap toward candidate neighborhoods.',
    parameters: ['Seed', 'Candidate Count', 'Candidate Radius'],
    pairsWellWith: ['Sparse Targets', 'Discrete Jump', 'Revisit Recovery'],
    strategy: 'Teaches routing among a few likely event opportunities.',
    boundaryNote: 'Candidate sites are demo source support, not mission Gold Stars.'
  }
};

const SPATIAL_PATTERN_EXPLAINERS = {
  constantField: {
    label: 'Constant Field',
    short: 'No spatial structure; every cell starts from the same base value before value distribution is applied.',
    meaning: 'The spatial pattern contributes no geometry, cluster, band, front, or gradient.',
    expectedBehavior: 'With Constant Value this is a flat heatmap; with Uniform Random or Gaussian / Normal, values vary without spatial structure.',
    parameters: ['Value Distribution', 'Seed'],
    pairsWellWith: ['Static + No Depletion', 'Sustained + Soft Depletion', 'Freshness / Age of Information'],
    strategy: 'Teaches coverage efficiency and depletion/freshness effects.',
    boundaryNote: 'Constant Field is not the same as Uniform Random; random value likelihood is controlled by Value Distribution.'
  },
  gradientField: {
    label: 'Gradient / Trend',
    short: 'A smooth value trend across space.',
    meaning: 'Value changes smoothly across the map.',
    expectedBehavior: 'One side or corner has higher value; the field is directional and smooth rather than clustered.',
    parameters: ['Gradient Direction', 'Gradient Strength', 'Smoothness', 'Noise Level'],
    pairsWellWith: ['Static', 'Periodic / Cyclic', 'Continuous Drift'],
    strategy: 'Teaches travel-vs-reward tradeoffs along a value trend.',
    boundaryNote: 'Not isolated targets or a current front.'
  },
  clusteredField: {
    label: 'Clustered Field',
    short: 'One or more coherent value clusters.',
    meaning: 'Value appears in one or more coherent blobs.',
    expectedBehavior: 'Cluster Count controls how many modes are generated; Cluster Size controls spread.',
    parameters: ['Cluster Count', 'Cluster Size', 'Cluster Separation', 'Cluster Intensity Variation', 'Edge Softness'],
    pairsWellWith: ['Bursty + Stationary', 'Bursty + Discrete Jump', 'Periodic + Continuous Drift'],
    strategy: 'Teaches target selection and multi-agent assignment.',
    boundaryNote: 'Clustered Field is only spatial geometry. Recurrence requires a Temporal Pattern and usually a Source / Initial Field substrate.'
  },
  patchyField: {
    label: 'Patchy / Correlated Field',
    short: 'Irregular patches with spatial correlation.',
    meaning: 'Value is irregular but neighboring cells tend to be related.',
    expectedBehavior: 'Spatially coherent patches, not clean Gaussian clusters and not independent per-cell noise.',
    parameters: ['Correlation Length', 'Patch Size', 'Smoothness', 'Contrast', 'Noise Level'],
    pairsWellWith: ['Neighbor Propagation', 'Intermittent', 'State-Evolving'],
    strategy: 'Teaches local exploration: a high-value cell may imply nearby value.',
    boundaryNote: 'Not arbitrary frame noise.'
  },
  sparseTargets: {
    label: 'Sparse Targets',
    short: 'A few isolated valuable targets in an otherwise low-value field.',
    meaning: 'Value exists at isolated target cells or small target regions.',
    expectedBehavior: 'Most cells are low, with a small number of discrete high-value locations.',
    parameters: ['Target Count', 'Target Radius', 'Target Value', 'Target Spread'],
    pairsWellWith: ['Static', 'Intermittent', 'Bursty', 'Revisit Recovery'],
    strategy: 'Teaches routing between discrete sampling objectives.',
    boundaryNote: 'Not clustered neighborhoods or Gold Star targets.'
  },
  linearBand: {
    label: 'Linear Band',
    short: 'A long narrow value band for transect-like sampling.',
    meaning: 'A long narrow strip of elevated sample value.',
    expectedBehavior: 'Value is elevated along a straight or gently curved strip.',
    parameters: ['Band Orientation', 'Band Width', 'Band Position', 'Band Softness', 'Band Contrast'],
    pairsWellWith: ['Static', 'Periodic / Cyclic', 'Continuous Drift'],
    strategy: 'Teaches following, crossing, or sampling along elongated value regions.',
    boundaryNote: 'Not channel transport or current alignment.'
  },
  frontBoundary: {
    label: 'Front / Boundary',
    short: 'A spatial transition between low and high value.',
    meaning: 'A sharp or soft transition between low-value and high-value regions.',
    expectedBehavior: 'Value differs across a boundary; the transition can be sharp or soft.',
    parameters: ['Front Orientation', 'Front Position', 'Front Sharpness', 'Front Contrast', 'Boundary Value Mode'],
    pairsWellWith: ['Static', 'Periodic / Cyclic', 'Continuous Drift', 'Discrete Jump'],
    strategy: 'Teaches boundary-following, boundary-crossing, and edge-sampling strategies.',
    boundaryNote: 'Not a current front or coastal front.'
  },
  boundaryBand: {
    label: 'Boundary Band',
    short: 'A value band near a boundary or edge of the domain.',
    meaning: 'Value is concentrated near a generic boundary or domain edge.',
    expectedBehavior: 'Value is concentrated along one or more domain edges and decays inward.',
    parameters: ['Boundary Side', 'Band Width', 'Band Softness', 'Band Intensity'],
    pairsWellWith: ['Sustained', 'Periodic / Cyclic', 'Bursty'],
    strategy: 'Teaches boundary coverage and edge-following.',
    boundaryNote: 'Not coastline, current, or terrain behavior.'
  },
  monitoringStations: {
    label: 'Monitoring Stations',
    short: 'Fixed locations that become valuable to visit or revisit.',
    meaning: 'Fixed stations are valuable to visit or revisit over time.',
    expectedBehavior: 'Station-like points remain fixed and work well with freshness or recovery effects.',
    parameters: ['Station Count', 'Station Radius', 'Station Value', 'Revisit Interval', 'Recovery Rate'],
    pairsWellWith: ['Revisit Recovery', 'History-Aware', 'Periodic / Cyclic', 'Freshness / Age of Information'],
    strategy: 'Teaches persistent monitoring and revisit timing.',
    boundaryNote: 'Not one-time sparse targets when recovery is enabled.'
  },
  seededTexture: {
    label: 'Seeded Texture',
    short: 'A deterministic textured value field; irregular but replayable.',
    meaning: 'A deterministic irregular texture field.',
    expectedBehavior: 'Irregular spatial values are deterministic from seed, not random every frame.',
    parameters: ['Texture Scale', 'Smoothness', 'Contrast', 'Seed', 'Noise Level'],
    pairsWellWith: ['Static', 'Intermittent', 'State-Evolving', 'Neighbor Propagation'],
    strategy: 'Teaches planning over irregular value landscapes without obvious clusters or fronts.',
    boundaryNote: 'Not arbitrary frame noise or forecast uncertainty.'
  }
};

const VALUE_DISTRIBUTION_EXPLAINERS = {
  constantValue: {
    label: 'Constant Value',
    short: 'Every cell receives the same base value.',
    meaning: 'Values are assigned as a constant rather than drawn from a random distribution.',
    expectedBehavior: 'Constant Field + Constant Value produces a flat heatmap before sampling effects are applied.',
    parameters: ['Base Value'],
    pairsWellWith: ['Constant Field', 'No Depletion', 'Raw Base Value'],
    strategy: 'Use as a baseline when you want geometry, temporal behavior, or sampling effects isolated.',
    boundaryNote: 'This is not a uniform random distribution.'
  },
  uniformRandom: {
    label: 'Uniform Random',
    short: 'Each cell is equally likely to receive a low, medium, or high value in the configured range.',
    meaning: 'Cell values are seeded random draws from a uniform distribution over the allowed value range.',
    expectedBehavior: 'Values appear irregular, with low, medium, and high values approximately equally likely for the same seed.',
    parameters: ['Random Seed', 'Minimum', 'Maximum'],
    pairsWellWith: ['Constant Field', 'Seeded Texture', 'Static'],
    strategy: 'Teaches planning over unstructured but reproducible value variability.',
    boundaryNote: 'Uniform Random is value likelihood, not spatial uniformity or a flat field.'
  },
  gaussianNormal: {
    label: 'Gaussian / Normal',
    short: 'Most values fall near the mean, with fewer low and high extremes.',
    meaning: 'Cell values are seeded random draws from a bell-shaped distribution centered near the middle value.',
    expectedBehavior: 'Most cells are mid-range; fewer cells appear very low or very high.',
    parameters: ['Mean', 'Variance / Spread', 'Random Seed'],
    pairsWellWith: ['Clustered Field', 'Patchy / Correlated Field', 'Linear Band'],
    strategy: 'Teaches fields where extreme values are rarer than mid-range values.',
    boundaryNote: 'Gaussian value distribution is different from Gaussian-shaped spatial clusters.'
  },
  skewedLow: {
    label: 'Skewed Low',
    short: 'Most values are low, with a smaller number of moderate or high cells.',
    meaning: 'Seeded value draws favor low magnitudes inside the selected spatial geometry.',
    expectedBehavior: 'The same geometry remains visible, but high-value cells become less common.',
    parameters: ['Random Seed', 'Skew Strength'],
    pairsWellWith: ['Sparse Targets', 'Rare Extreme Events', 'Diagnostics Overlay'],
    strategy: 'Teaches scarcity when opportunities are usually weak.',
    boundaryNote: 'Skewed Low changes value magnitude, not event likelihood or location.'
  },
  skewedHigh: {
    label: 'Skewed High',
    short: 'Most values are high, with fewer low-value cells.',
    meaning: 'Seeded value draws favor high magnitudes inside the selected spatial geometry.',
    expectedBehavior: 'The pattern appears more saturated while preserving its underlying geometry.',
    parameters: ['Random Seed', 'Skew Strength'],
    pairsWellWith: ['Boundary Band', 'Sustained', 'Soft Depletion'],
    strategy: 'Teaches route choice when broad areas are valuable but geometry still matters.',
    boundaryNote: 'Skewed High can reduce contrast if paired with a very broad active field.'
  },
  bimodalValues: {
    label: 'Bimodal Values',
    short: 'Values tend to land in low or high bands rather than the middle.',
    meaning: 'Seeded draws create two magnitude classes inside the same spatial geometry.',
    expectedBehavior: 'Cells separate into low and high value groups without changing event-origin basins.',
    parameters: ['Low Mode', 'High Mode', 'Mode Mix', 'Random Seed'],
    pairsWellWith: ['Clustered Field', 'Multi-Source Basins', 'Diagnostics Overlay'],
    strategy: 'Teaches threshold-based decisions where mid-value cells are uncommon.',
    boundaryNote: 'Bimodal Values are value classes, not bimodal spatial clusters.'
  },
  heavyTailed: {
    label: 'Heavy-Tailed',
    short: 'Most values are modest, but a visible high-value tail exists.',
    meaning: 'Seeded draws create occasional large values without making them as rare as anomaly events.',
    expectedBehavior: 'The field contains a long high tail while preserving replayability.',
    parameters: ['Tail Weight', 'Random Seed'],
    pairsWellWith: ['Seeded Texture', 'Patchy / Correlated Field', 'Raw Base Value'],
    strategy: 'Teaches robust routing when a few unusually valuable cells may dominate payoff.',
    boundaryNote: 'Heavy tails affect magnitude distribution, not forecast uncertainty.'
  },
  rareExtremeEvents: {
    label: 'Rare Extreme Events',
    short: 'Most values stay low, with rare seeded extreme cells.',
    meaning: 'Seeded draws create sparse high-magnitude anomalies inside the selected geometry.',
    expectedBehavior: 'Only a small fraction of cells should reach extreme values; most remain low.',
    parameters: ['Extreme Probability', 'Extreme Magnitude', 'Random Seed'],
    pairsWellWith: ['Sparse Targets', 'Bursty', 'Sampling Value + Source Overlay'],
    strategy: 'Teaches anomaly-style sampling without turning anomalies into a separate spatial pattern.',
    boundaryNote: 'Rare extremes can be intentionally sparse and may be hard to see at low duration or low contrast.'
  }
};

const TEMPORAL_PATTERN_EXPLAINERS = {
  static: {
    label: 'Static',
    short: 'Value does not intentionally change over demo time.',
    meaning: 'The value intensity is fixed unless sampling effects change the displayed layer.',
    expectedBehavior: 'The heatmap shape and intensity stay steady while the demo clock advances.',
    parameters: ['Time Mode', 'Seed', 'Noise Level'],
    pairsWellWith: ['Constant Field', 'Clustered Field', 'Raw Base Value'],
    strategy: 'Teaches spatial planning without timing pressure.',
    boundaryNote: 'This is not forecast truth; it is a deterministic sample-value layer.'
  },
  sustained: {
    label: 'Sustained',
    short: 'Value remains active for long periods with mild variation.',
    meaning: 'Sample value persists rather than appearing only in short windows.',
    expectedBehavior: 'The heatmap stays readable over time, with gradual intensity changes.',
    parameters: ['Sustain Level', 'Noise Level', 'Dynamic Complexity'],
    pairsWellWith: ['Continuous Drift', 'Soft Depletion', 'Boundary Band'],
    strategy: 'Teaches route efficiency when opportunities remain available.',
    boundaryNote: 'Sustained value can still move if Spatial Evolution is dynamic.'
  },
  periodic: {
    label: 'Periodic / Cyclic',
    short: 'Value rises and falls on a regular cycle.',
    meaning: 'The field follows repeatable intensity cycles.',
    expectedBehavior: 'Cells brighten and dim rhythmically, so future peaks can be anticipated.',
    parameters: ['Cycle Period', 'Phase', 'Amplitude'],
    pairsWellWith: ['Gradient / Trend', 'Linear Band', 'Frequency-Based'],
    strategy: 'Teaches timing arrival near predictable peaks.',
    boundaryNote: 'Regular cycles are not stochastic forecast uncertainty.'
  },
  bursty: {
    label: 'Bursty',
    short: 'Intense active windows are separated by quiet periods.',
    meaning: 'Value becomes temporarily high during burst windows, then quiets without permanently exhausting the field.',
    expectedBehavior: 'Activity grows, peaks, fades, and later reappears from the Source / Initial Field.',
    parameters: ['Burst Duration', 'Burst Strength', 'Burst Spacing'],
    pairsWellWith: ['Clustered Field', 'Discrete Jump', 'Sparse Targets'],
    strategy: 'Teaches intercepting opportunities before they fade.',
    boundaryNote: 'A burst is temporal intensity, not a one-shot extinction event or a moving plume by itself.'
  },
  rapidPulse: {
    label: 'Rapid Pulse',
    short: 'Fast repeated activation with a visible rhythm.',
    meaning: 'The sample-value amplitude pulses quickly while the base spatial field remains available for later pulses.',
    expectedBehavior: 'Cells brighten and dim rapidly without degenerating into random frame flicker.',
    parameters: ['Pulse Rate', 'Amplitude', 'Dynamic Complexity'],
    pairsWellWith: ['Continuous Drift', 'Clustered Field', 'Sparse Targets'],
    strategy: 'Teaches timing routes for short but recurring opportunity windows.',
    boundaryNote: 'Rapid Pulse is repeating, not a finite one-shot event.'
  },
  pulseThenSilence: {
    label: 'Pulse Then Silence',
    short: 'One finite pulse fades out and does not regenerate.',
    meaning: 'This is the explicit finite temporal mode. The event occurs once, fades, and then stays quiet.',
    expectedBehavior: 'A clear rise/fall appears early, followed by near-silence.',
    parameters: ['Peak Time', 'Pulse Width'],
    pairsWellWith: ['Sparse Targets', 'Discrete Jump'],
    strategy: 'Teaches whether a route can reach a finite opportunity before it disappears.',
    boundaryNote: 'Unlike ordinary Bursty or Random Pulses, this mode may intentionally die out.'
  },
  longTailDecay: {
    label: 'Long-Tail Decay',
    short: 'A finite or semi-finite activation decays slowly.',
    meaning: 'The field activates and then fades with a long tail instead of immediately disappearing.',
    expectedBehavior: 'Values remain useful for a while after the peak but gradually weaken.',
    parameters: ['Onset Time', 'Decay Half-Life'],
    pairsWellWith: ['Front Boundary', 'Depleted Value'],
    strategy: 'Teaches prioritizing aging opportunities.',
    boundaryNote: 'Long-Tail Decay is semi-finite and should not be the default for persistent presets.'
  },
  gaussianEnvelope: {
    label: 'Gaussian Time Envelope',
    short: 'A smooth rise and fall around a seeded peak window.',
    meaning: 'The entire field follows a bell-shaped time envelope over a repeatable cycle.',
    expectedBehavior: 'Activity gradually warms, peaks, and cools without abrupt blinking.',
    parameters: ['Peak Time', 'Envelope Width', 'Cycle Length'],
    pairsWellWith: ['Front Boundary', 'Gradient / Trend', 'Clustered Field'],
    strategy: 'Teaches planning around a smooth finite-looking forecast window.',
    boundaryNote: 'The envelope modulates value; it does not move the field by itself.'
  },
  seasonal: {
    label: 'Seasonal / Long Cycle',
    short: 'Value follows a slower long-period cycle.',
    meaning: 'The field changes on long cycles compared with short periodic pulses.',
    expectedBehavior: 'Broad regions warm and cool gradually over a long demo interval.',
    parameters: ['Long Cycle Period', 'Phase', 'Amplitude'],
    pairsWellWith: ['Frequency-Based', 'Monitoring Stations', 'Revisit Recovery'],
    strategy: 'Teaches planning around slow seasonal availability.',
    boundaryNote: 'The demo cycle is synthetic and educational.'
  },
  randomPulses: {
    label: 'Random Pulses',
    short: 'Irregular but seeded pulse windows.',
    meaning: 'Pulse timing is random-looking but deterministic from the demo seed.',
    expectedBehavior: 'Activity turns on and off irregularly without changing on every frame randomly.',
    parameters: ['Seed', 'Pulse Probability', 'Pulse Strength'],
    pairsWellWith: ['Seeded Texture', 'Sparse Targets', 'State-Evolving'],
    strategy: 'Teaches robust plans under less predictable opportunities.',
    boundaryNote: 'Seeded pulses are not hidden truth or ensemble uncertainty.'
  },
  intermittent: {
    label: 'Intermittent Activity',
    short: 'Value is active in partial or uneven windows.',
    meaning: 'The field alternates between active and inactive periods without a simple cycle.',
    expectedBehavior: 'Some cells or regions become briefly useful, then quiet down.',
    parameters: ['Activation Window', 'Persistence', 'Seed'],
    pairsWellWith: ['Patchy / Correlated Field', 'Sparse Targets', 'Neighbor Propagation'],
    strategy: 'Teaches flexible timing and fallback routing.',
    boundaryNote: 'Intermittent timing does not imply current transport.'
  },
  wavyMultiFrequency: {
    label: 'Wavy / Multi-Frequency',
    short: 'Several smooth waves combine into a richer cyclic pattern.',
    meaning: 'The field uses mixed seeded frequencies to avoid a single synchronized blink.',
    expectedBehavior: 'Intensity ebbs and flows smoothly with stronger and weaker beats over time.',
    parameters: ['Wave Frequencies', 'Phase Offsets', 'Amplitude'],
    pairsWellWith: ['Multi-Source Basins', 'Frequency-Based State Model'],
    strategy: 'Teaches planning around recurring but nontrivial cycles.',
    boundaryNote: 'This is deterministic seeded modulation, not random pulses.'
  }
};

const SPATIAL_EVOLUTION_EXPLAINERS = {
  stationary: {
    label: 'Stationary',
    short: 'The pattern changes intensity but stays in the same location.',
    meaning: 'The spatial distribution is fixed in place.',
    expectedBehavior: 'Hot cells remain anchored while temporal controls change brightness.',
    parameters: ['Temporal Pattern', 'Noise Level'],
    pairsWellWith: ['Static', 'Periodic / Cyclic', 'Freshness / Age of Information'],
    strategy: 'Teaches planning around fixed geography and timing.',
    boundaryNote: 'Stationary does not mean value cannot deplete after sampling.'
  },
  continuousDrift: {
    label: 'Continuous Drift',
    short: 'Features move smoothly through intermediate locations.',
    meaning: 'Feature centers or local regions drift gradually over demo time rather than shifting the whole domain by default.',
    expectedBehavior: 'Clusters, patches, bands, or regions slide through adjacent cells independently unless Motion Scope is Global.',
    parameters: ['Motion Scope', 'Drift Direction', 'Drift Speed', 'Dynamic Complexity'],
    pairsWellWith: ['Sustained', 'Periodic / Cyclic', 'Linear Band'],
    strategy: 'Teaches intercepting and leading a smoothly moving opportunity.',
    boundaryNote: 'This is synthetic sample-value drift, not current-driven transport.'
  },
  discreteJump: {
    label: 'Discrete Jump',
    short: 'The pattern fades and reappears elsewhere.',
    meaning: 'The feature relocates between seeded burst windows instead of moving continuously.',
    expectedBehavior: 'Activity grows in one location, fades, then later regenerates in a new likelihood-biased seeded location.',
    parameters: ['Jump Window', 'Jump Distance', 'Persistence'],
    pairsWellWith: ['Bursty', 'Clustered Field', 'Sparse Targets'],
    strategy: 'Teaches not assuming the next event will occur where the last event was.',
    boundaryNote: 'Jumping is discontinuous relocation, not smooth drift.'
  },
  randomWalk: {
    label: 'Random Walk',
    short: 'The pattern moves by local seeded steps.',
    meaning: 'Feature centers or active regions move by bounded local deterministic steps.',
    expectedBehavior: 'Regions wander locally and independently while preserving activity through likelihood-biased regeneration; the full map does not move together unless Motion Scope is Global.',
    parameters: ['Motion Scope', 'Step Size', 'Turn Variability', 'Seed'],
    pairsWellWith: ['State-Evolving', 'Intermittent', 'Clustered Field'],
    strategy: 'Teaches tracking a wandering target without assuming straight-line motion.',
    boundaryNote: 'Random Walk is seeded and reproducible, not Math.random per frame.'
  },
  neighborPropagation: {
    label: 'Neighbor Propagation',
    short: 'Activity spreads from active cells to nearby cells.',
    meaning: 'Neighboring cells matter because graph edges pass local influence messages between adjacent cell nodes.',
    expectedBehavior: 'High-value nodes send bounded messages to neighbors, so active regions expand or spread locally without becoming physical current advection.',
    parameters: ['Motion Scope', 'Graph Topology', 'Propagation Rate', 'Neighbor Radius', 'Decay'],
    pairsWellWith: ['Patchy / Correlated Field', 'Seeded Texture', 'State-Evolving'],
    strategy: 'Teaches local search and anticipating spread into adjacent areas.',
    boundaryNote: 'Propagation is sample-value spread, not fluid advection.'
  },
  expansion: {
    label: 'Expansion',
    short: 'Activity expands outward from seeded centers.',
    meaning: 'The scalar value geometry grows into nearby space while retaining replayable structure.',
    expectedBehavior: 'Active regions should spread outward without immediately filling the whole domain.',
    parameters: ['Seeded Center', 'Growth Rate', 'Dynamic Complexity', 'Interaction Scale'],
    pairsWellWith: ['Front / Boundary', 'Bursty', 'Edge / Neighbor'],
    strategy: 'Teaches tracking growing opportunity regions or sampling ahead of growth.',
    boundaryNote: 'Expansion is synthetic ROI growth, not physical plume advection.'
  },
  contraction: {
    label: 'Contraction',
    short: 'Activity contracts toward seeded centers.',
    meaning: 'The scalar value geometry concentrates inward over demo time.',
    expectedBehavior: 'Value becomes more concentrated rather than simply fading out.',
    parameters: ['Seeded Center', 'Contraction Rate', 'Dynamic Complexity'],
    pairsWellWith: ['Clustered Field', 'Long-Tail Decay', 'Raw Base Value'],
    strategy: 'Teaches prioritizing areas before opportunity narrows.',
    boundaryNote: 'Contraction should retain activity; extinction is a warning sign.'
  },
  divergence: {
    label: 'Divergence',
    short: 'Activity separates away from seeded centers.',
    meaning: 'Regions move outward as a synthetic divergence pattern.',
    expectedBehavior: 'The center of mass and bounding area should expand or split outward.',
    parameters: ['Divergence Center', 'Rate', 'Interaction Scale'],
    pairsWellWith: ['Multi-Source Basins', 'Clustered Field'],
    strategy: 'Teaches intercepting activity that spreads away from likely origins.',
    boundaryNote: 'Divergence is not a current vector field.'
  },
  convergence: {
    label: 'Convergence',
    short: 'Activity moves toward seeded centers.',
    meaning: 'Regions pull inward toward one or more deterministic centers.',
    expectedBehavior: 'Value should concentrate toward a seeded basin without changing randomly.',
    parameters: ['Convergence Center', 'Rate', 'Interaction Scale'],
    pairsWellWith: ['Gradient / Trend', 'Clustered Field'],
    strategy: 'Teaches waiting for value to concentrate versus visiting broad early regions.',
    boundaryNote: 'Convergence is a scalar ROI motion rule, not flow assimilation.'
  },
  morphMutation: {
    label: 'Morph / Mutation',
    short: 'Local cells reshape the pattern through seeded mutation.',
    meaning: 'The field changes shape locally while preserving deterministic replay.',
    expectedBehavior: 'Local edges and patches should reorganize without independent random flicker.',
    parameters: ['Mutation Rate', 'Local Cell Scale', 'Seed'],
    pairsWellWith: ['Seeded Texture', 'Cell / Node', 'Diagnostics Overlay'],
    strategy: 'Teaches fields whose shape evolves without clean translation.',
    boundaryNote: 'Mutation is seeded and bounded, not Math.random frame noise.'
  },
  shearStretch: {
    label: 'Shear / Stretch',
    short: 'The scalar field is deformed by shear and stretch.',
    meaning: 'The visible value geometry elongates or slants while remaining a scalar ROI field.',
    expectedBehavior: 'Bands, fronts, or clusters should visibly deform without changing into current transport.',
    parameters: ['Shear Phase', 'Stretch Strength', 'Dynamic Complexity'],
    pairsWellWith: ['Linear Band', 'Gradient / Trend', 'Global Field'],
    strategy: 'Teaches recognizing deformation separately from advection.',
    boundaryNote: 'Shear / Stretch is not a physical current field.'
  },
  rotationalSwirl: {
    label: 'Rotational Swirl',
    short: 'The scalar field rotates around seeded centers.',
    meaning: 'Value geometry swirls synthetically around replayable centers.',
    expectedBehavior: 'Features should rotate or curve around a center while retaining magnitude contrast.',
    parameters: ['Swirl Center', 'Rotation Phase', 'Dynamic Complexity'],
    pairsWellWith: ['Clustered Field', 'Patchy / Correlated Field'],
    strategy: 'Teaches curved feature motion without invoking fluid dynamics.',
    boundaryNote: 'Rotational Swirl is an ROI visualization primitive, not current flow.'
  },
  branchingGrowth: {
    label: 'Branching Growth',
    short: 'Activity spreads along seeded branch-like local paths.',
    meaning: 'Neighbor influence and seeded branch gates create locally connected growth.',
    expectedBehavior: 'Branches should grow from active neighborhoods with local continuity.',
    parameters: ['Branch Gate', 'Neighbor Spread', 'Growth Rate', 'Interaction Scale'],
    pairsWellWith: ['Front / Boundary', 'Patchy / Correlated Field', 'Edge / Neighbor'],
    strategy: 'Teaches following locally connected growth rather than isolated bright speckles.',
    boundaryNote: 'Branching Growth is synthetic local ROI growth, not a vegetation or fire model.'
  }
};

const STATE_MODEL_EXPLAINERS = {
  timeIndexed: {
    label: 'Time-Indexed',
    short: 'Value is computed directly from position and time.',
    meaning: 'The field is a function of x, y, and t rather than stored history.',
    expectedBehavior: 'Scrubbing to the same time produces the same value without needing previous frames.',
    parameters: ['Position', 'Demo Time', 'Seed'],
    pairsWellWith: ['Static', 'Periodic / Cyclic', 'Continuous Drift'],
    strategy: 'Teaches predictable replayable fields.',
    boundaryNote: 'This is memoryless and uses direct position/time evaluation.'
  },
  frequencyBased: {
    label: 'Frequency-Based',
    short: 'Value follows repeated cycles or frequency structure.',
    meaning: 'The field uses regular oscillations, phases, or long cycles.',
    expectedBehavior: 'The same phase pattern returns after a cycle period.',
    parameters: ['Cycle Period', 'Phase', 'Amplitude'],
    pairsWellWith: ['Periodic / Cyclic', 'Seasonal / Long Cycle'],
    strategy: 'Teaches timing predictable recurring opportunities.',
    boundaryNote: 'This is still demo sample value, not forecast confidence.'
  },
  stateEvolving: {
    label: 'State-Evolving',
    short: 'Next field state depends on the current field state.',
    meaning: 'The field evolves from node state and local graph messages, which is Markovian when the next state depends only on the current graph state.',
    expectedBehavior: 'Propagation, cooldown/recovery, front motion, ripple activation, or local rules update node likelihood/sample state through graph edges.',
    parameters: ['Current Node State', 'Incoming Messages', 'Transition Rule', 'Seed'],
    pairsWellWith: ['Random Walk', 'Neighbor Propagation', 'Intermittent Activity'],
    strategy: 'Teaches tracking evolving processes instead of isolated snapshots.',
    boundaryNote: 'State-Evolving is different from History-Aware longer sampling memory.'
  },
  historyAware: {
    label: 'History-Aware',
    short: 'Value depends on longer sampling or observation history.',
    meaning: 'The field can depend on visits, observations, or age since last sample; it can be non-Markovian when longer history matters.',
    expectedBehavior: 'Recently sampled cells may stay cool while stale or unvisited areas warm back up.',
    parameters: ['Visit History', 'Age Since Observation', 'Recovery Rate'],
    pairsWellWith: ['Freshness / Age of Information', 'Revisit Recovery', 'Monitoring Stations'],
    strategy: 'Teaches revisit timing and persistent monitoring.',
    boundaryNote: 'History here is demo visit history unless tied to actual mission sampling.'
  }
};

const INTERACTION_SCALE_EXPLAINERS = {
  global: {
    label: 'Global Field',
    short: 'The whole field is interpreted as one process scale.',
    meaning: 'Global scale means motion or activation is understood at the full-field level.',
    expectedBehavior: 'Look for whole-domain shifts or broad synchronized behavior when the selected rule supports it.',
    parameters: ['Field-level process'],
    pairsWellWith: ['Continuous Drift', 'Time-Indexed'],
    strategy: 'Use for comparing whole-field movement against cluster or local motion.',
    boundaryNote: 'Some graph rules are inherently local; Global may be explanatory metadata for those combinations.'
  },
  cluster: {
    label: 'Cluster / Community',
    short: 'Behavior acts through basins or communities.',
    meaning: 'Cluster scale treats communities as event basins with their own likelihood and phase.',
    expectedBehavior: 'Look for separated basins activating, cooling, recovering, or moving independently.',
    parameters: ['Community ID', 'Cluster C_k(t)'],
    pairsWellWith: ['Recurring Hotspots', 'Multi-Source Basins'],
    strategy: 'Use when route choices are about which basin to visit next.',
    boundaryNote: 'Cluster scale is not the same as one global field shift.'
  },
  cell: {
    label: 'Cell / Node',
    short: 'Behavior acts at individual grid cells.',
    meaning: 'Cell scale emphasizes local readiness, activation, cooldown, recovery, and freshness.',
    expectedBehavior: 'Look for individual nodes changing state while communities remain context.',
    parameters: ['L_i(t)', 'A_i(t)', 'State'],
    pairsWellWith: ['Cell / Node States', 'Freshness / Revisit Value'],
    strategy: 'Use when sampling decisions depend on local cell state.',
    boundaryNote: 'Cell scale can still be influenced by cluster likelihood.'
  },
  edge: {
    label: 'Edge / Neighbor',
    short: 'Behavior acts through neighbor influence messages.',
    meaning: 'Edge scale emphasizes local graph messages between neighboring cells.',
    expectedBehavior: 'Look for message edges, front propagation, neighbor spread, or local-rule activation.',
    parameters: ['Edge Messages', 'Neighbor Count', 'Transition Cause'],
    pairsWellWith: ['Neighbor Propagation', 'Process Influence Messages'],
    strategy: 'Use when the next useful cell is driven by nearby activity.',
    boundaryNote: 'Edge messages are abstract ROI influence, not physical current vectors.'
  },
  hybrid: {
    label: 'Hybrid Multi-Scale',
    short: 'Behavior combines multiple hierarchy levels.',
    meaning: 'Hybrid scale uses more than one of global, cluster, cell, and edge-level behavior.',
    expectedBehavior: 'Look for basins, node states, and messages all contributing to the displayed field.',
    parameters: ['Process Contract', 'Graph Diagnostics'],
    pairsWellWith: ['Diagnostics Overlay', 'Community + Messages'],
    strategy: 'Use when teaching how a recipe composes several scales.',
    boundaryNote: 'Hybrid is an honest summary, not a separate physical mechanism.'
  }
};

const SAMPLING_EFFECT_EXPLAINERS = {
  none: {
    label: 'None',
    short: 'Sampling does not change future displayed value.',
    meaning: 'The demo shows the field without visit-based depletion or freshness effects.',
    expectedBehavior: 'Cells remain valuable after synthetic visits unless another component changes them.',
    parameters: ['Display Layer'],
    pairsWellWith: ['Raw Base Value', 'Static'],
    strategy: 'Teaches pure field inspection before adding sampling consequences.',
    boundaryNote: 'Mission scoring can still have its own sampling rules.'
  },
  hard: {
    label: 'Hard Depletion',
    short: 'A sampled cell is strongly reduced.',
    meaning: 'Sampling removes most or all repeat value from the visited cell.',
    expectedBehavior: 'Visited cells cool sharply and repeated visits are discouraged.',
    parameters: ['Depletion Amount', 'Visit Marker'],
    pairsWellWith: ['Sparse Targets', 'Clustered Field', 'Depleted Value'],
    strategy: 'Teaches avoiding duplicate sampling when value is one-time.',
    boundaryNote: 'Only the demo synthetic visit marker is used here.'
  },
  soft: {
    label: 'Soft Depletion',
    short: 'Sampling reduces value without removing it completely.',
    meaning: 'Visited cells keep partial value after sampling.',
    expectedBehavior: 'Synthetic visited cells dim but can remain somewhat useful while unvisited regions continue to regenerate.',
    parameters: ['Depletion Fraction', 'Recovery'],
    pairsWellWith: ['Clustered Field', 'Sustained', 'Sampling Value'],
    strategy: 'Teaches diminishing returns rather than hard one-time collection.',
    boundaryNote: 'Soft depletion is a teaching layer, not a forecast layer.'
  },
  neighborhood: {
    label: 'Neighborhood Depletion',
    short: 'Sampling also partially reduces nearby cells.',
    meaning: 'Sampling a cell observes or depletes nearby space as well.',
    expectedBehavior: 'Visited cells cool most, while neighboring cells cool partially.',
    parameters: ['Neighbor Radius', 'Falloff', 'Depletion Amount'],
    pairsWellWith: ['Patchy / Correlated Field', 'Clustered Field'],
    strategy: 'Teaches spacing samples to avoid redundant nearby observations.',
    boundaryNote: 'Nearby cooling is a sample-effect model, not flow diffusion.'
  },
  freshnessAge: {
    label: 'Freshness / Age of Information',
    short: 'Recently visited places cool down; stale places warm over time.',
    meaning: 'Value represents information age or freshness rather than only raw reward.',
    expectedBehavior: 'Recently visited cells are lower; unvisited or stale cells regain importance.',
    parameters: ['Age Since Visit', 'Freshness Decay', 'Recovery Rate'],
    pairsWellWith: ['Monitoring Stations', 'History-Aware', 'Revisit Recovery'],
    strategy: 'Teaches revisiting when information becomes stale.',
    boundaryNote: 'Freshness is demo-only unless tied to actual mission visit history.'
  },
  revisitRecovery: {
    label: 'Knowledge Decay / Revisit Recovery',
    short: 'Value recovers after enough time has passed.',
    meaning: 'Sampling reduces value temporarily, then value returns as knowledge becomes stale.',
    expectedBehavior: 'Visited cells dim and then gradually become worthwhile again.',
    parameters: ['Recovery Rate', 'Revisit Interval', 'Initial Depletion'],
    pairsWellWith: ['Monitoring Stations', 'History-Aware', 'Seasonal / Long Cycle'],
    strategy: 'Teaches revisit scheduling and persistent monitoring cadence.',
    boundaryNote: 'Recovery timing is educational in the pure demo.'
  }
};

const DISPLAY_LAYER_EXPLAINERS = {
  sampleValue: {
    label: 'Sampling Value',
    short: 'Shows the active sample-value layer after selected behavior is applied.',
    meaning: 'This is the main visible value layer for the current composition.',
    expectedBehavior: 'The heatmap reflects spatial pattern, temporal pattern, spatial evolution, source-driven regeneration, and sampling effect.',
    parameters: ['Spatial Pattern', 'Temporal Pattern', 'Sampling Effect'],
    pairsWellWith: ['All demo components'],
    strategy: 'Use this for normal planning intuition over the composed sample field.',
    boundaryNote: 'It is not truth/forecast/uncertainty; those belong in the Uncertainty / Forecast Demo.'
  },
  eventLikelihood: {
    label: 'Source Field',
    short: 'Shows L(x,y,t), where process activity has source support.',
    meaning: 'The Source / Initial Field is the generative substrate. It controls where sample-value events, targets, bursts, jumps, walks, and propagation are supported.',
    expectedBehavior: 'Uniform source support appears flat; Gaussian, multi-source, gradient, patchy, texture, or sparse-site modes reveal preferred origin regions.',
    parameters: ['Source / Initial Field', 'Source Dynamics', 'Source Spatial Evolution'],
    pairsWellWith: ['Multi-Source Basins', 'Discrete Jump', 'Random Walk', 'Neighbor Propagation'],
    strategy: 'Use this layer to understand where future activity is supported before inspecting realized sampling value.',
    boundaryNote: 'Source support is not the realized sampling value S(x,y,t). It biases where activity forms.'
  },
  sampleValueLikelihoodOverlay: {
    label: 'Sampling Value + Source Overlay',
    short: 'Shows S(x,y,t) with L(x,y,t) highlighted on top.',
    meaning: 'The heatmap remains realized sampling value while bright dots/rings mark high source-support regions.',
    expectedBehavior: 'High-source zones may remain visible even when the current sampling-value burst is active elsewhere.',
    parameters: ['Display Layer', 'Source / Initial Field', 'Sampling Value'],
    pairsWellWith: ['Clustered Field', 'Bursty', 'Discrete Jump', 'Multi-Source Basins'],
    strategy: 'Use overlay mode to compare source support with currently realized sampling value.',
    boundaryNote: 'Overlay is explanatory; it does not change the generated field.'
  },
  graphCommunities: {
    label: 'Graph Communities',
    short: 'Shows the graph community or basin each cell belongs to.',
    meaning: 'Communities are graph-level groupings used by the ROI hierarchy. They help explain which cells share cluster influence.',
    expectedBehavior: 'Cells are tinted by community, with boundaries and cluster or centroid markers visible.',
    parameters: ['Community ID', 'Cluster Center', 'Cell Node'],
    pairsWellWith: ['Multi-Source Basins', 'Neighbor Propagation', 'State-Evolving'],
    strategy: 'Use this to understand regional structure before inspecting node state or message flow.',
    boundaryNote: 'Community color is explanatory metadata, not an extra reward layer.'
  },
  nodeStates: {
    label: 'Cell / Node States',
    short: 'Shows per-cell graph state: active, cooling, recovering, susceptible, consumed, inhibited, or inactive.',
    meaning: 'Node state explains whether a cell is currently firing, recovering, blocked by history, ready to activate, or inactive.',
    expectedBehavior: 'Cells render with state-specific glyphs over a muted value heatmap.',
    parameters: ['Node State', 'Activation A_i(t)', 'Cooldown', 'Recovery'],
    pairsWellWith: ['State-Evolving', 'Neighbor Propagation', 'History-Aware'],
    strategy: 'Use this to debug why a high-source cell is or is not realized as sampling value.',
    boundaryNote: 'These are synthetic ROI graph states, not glider or current states.'
  },
  graphMessages: {
    label: 'Process Influence Messages',
    short: 'Shows strongest local influence messages between graph nodes.',
    meaning: 'Messages are abstract ROI influence passed across graph edges. The view filters to high-strength edges so the map stays readable.',
    expectedBehavior: 'Only top or thresholded directional edges are drawn, with stronger edges brighter and cross-community edges highlighted.',
    parameters: ['Outgoing Message', 'Incoming Message', 'Edge Strength', 'Community Boundary'],
    pairsWellWith: ['Neighbor Propagation', 'Random Walk', 'Patchy Source Field'],
    strategy: 'Use this to see where activity is likely to spread next.',
    boundaryNote: 'Graph messages are not physical current vectors.'
  },
  communityMessages: {
    label: 'Community + Messages',
    short: 'Combines community basins, active nodes, centers, and strongest messages.',
    meaning: 'This is the compact graph overview: regional membership plus the strongest active influence paths.',
    expectedBehavior: 'Community tints remain visible while active nodes and top message edges show current graph dynamics.',
    parameters: ['Community ID', 'Node State', 'Top Messages', 'Cluster Center'],
    pairsWellWith: ['Multi-Source Basins', 'State-Evolving', 'Neighbor Propagation'],
    strategy: 'Use this when diagnosing graph behavior without switching between separate graph layers.',
    boundaryNote: 'This is a combined diagnostic overlay; it does not alter S(x,y,t).'
  },
  diagnosticsOverlay: {
    label: 'Diagnostics Overlay',
    short: 'Shows graph/community/node/message diagnostics over the field.',
    meaning: 'Diagnostics mode combines source support, filtered message edges, node-state legend, and state-count proportions.',
    expectedBehavior: 'A muted heatmap is overlaid with source markers, message lines, and graph-state summary glyphs.',
    parameters: ['State Counts', 'Active Nodes', 'Edge Message Total', 'Source Mesh'],
    pairsWellWith: ['Preset audits', 'Neighbor Propagation', 'State-Evolving'],
    strategy: 'Use this as the quick sanity-check view for graph hierarchy behavior.',
    boundaryNote: 'Diagnostics are explanatory and may be denser than normal display layers.'
  },
  depletedValue: {
    label: 'Depleted Value',
    short: 'Shows value after synthetic sampling depletion.',
    meaning: 'The visible value includes visit/depletion effects.',
    expectedBehavior: 'Sampled or nearby cells may appear cooler than their raw base value.',
    parameters: ['Sampling Effect', 'Synthetic Visit Marker'],
    pairsWellWith: ['Hard Depletion', 'Soft Depletion', 'Neighborhood Depletion'],
    strategy: 'Teaches how repeated sampling can lose value.',
    boundaryNote: 'This is a demo layer, not a hidden-truth result.'
  },
  rawBaseValue: {
    label: 'Raw Base Value',
    short: 'Shows the base field before depletion or freshness display effects.',
    meaning: 'This layer isolates the underlying spatial/temporal field.',
    expectedBehavior: 'Sampling effects are removed from the display so the base pattern is easier to inspect.',
    parameters: ['Seed', 'Noise Level', 'Spatial Pattern'],
    pairsWellWith: ['Behavior audits', 'Seeded Texture', 'Constant Field'],
    strategy: 'Use this to understand the generated field before sampling consequences.',
    boundaryNote: 'Raw base value is not an oracle forecast layer.'
  },
  freshnessRevisitValue: {
    label: 'Freshness / Revisit Value',
    short: 'Shows age-of-information or revisit priority.',
    meaning: 'The layer emphasizes where information is stale enough to revisit.',
    expectedBehavior: 'Recently visited cells cool down while stale or unvisited cells warm up.',
    parameters: ['Age Since Visit', 'Recovery Rate', 'Freshness Display'],
    pairsWellWith: ['Freshness / Age of Information', 'Revisit Recovery', 'Monitoring Stations'],
    strategy: 'Teaches persistent monitoring and revisit timing.',
    boundaryNote: 'Freshness is demo-only unless connected to actual mission visit history.'
  }
};

const GROUP_OPTIONS = {
  behaviorPreset: {},
  eventLikelihood: EVENT_LIKELIHOOD_EXPLAINERS,
  spatialPattern: SPATIAL_PATTERN_EXPLAINERS,
  valueDistribution: VALUE_DISTRIBUTION_EXPLAINERS,
  temporalPattern: TEMPORAL_PATTERN_EXPLAINERS,
  spatialEvolution: SPATIAL_EVOLUTION_EXPLAINERS,
  interactionScale: INTERACTION_SCALE_EXPLAINERS,
  stateModel: STATE_MODEL_EXPLAINERS,
  samplingEffect: SAMPLING_EFFECT_EXPLAINERS,
  displayLayer: DISPLAY_LAYER_EXPLAINERS
};

const ALIASES = {
  eventLikelihood: {
    constantField: 'uniformLikelihood',
    uniformField: 'uniformLikelihood',
    uniform: 'uniformLikelihood',
    gaussian: 'gaussianLikelihood',
    multiModal: 'multiModalLikelihood',
    multimodal: 'multiModalLikelihood',
    patchy: 'patchyLikelihood',
    seededTexture: 'seededTextureLikelihood',
    sparseTargets: 'sparseCandidateSites'
  },
  spatialPattern: {
    uniformField: 'constantField',
    uniform: 'constantField',
    singleCluster: 'clusteredField',
    multipleClusters: 'clusteredField',
    edgeBand: 'boundaryBand',
    coastalBand: 'boundaryBand',
    randomTexture: 'seededTexture',
    texturedField: 'seededTexture'
  },
  valueDistribution: {
    uniform: 'uniformRandom',
    gaussian: 'gaussianNormal',
    normal: 'gaussianNormal',
    skewLow: 'skewedLow',
    lowSkew: 'skewedLow',
    skewHigh: 'skewedHigh',
    highSkew: 'skewedHigh',
    bimodal: 'bimodalValues',
    heavyTail: 'heavyTailed',
    rareExtreme: 'rareExtremeEvents',
    rareExtremes: 'rareExtremeEvents'
  },
  spatialEvolution: {
    fixed: 'stationary',
    growthDecay: 'stationary',
    movingFeature: 'continuousDrift',
    splitMerge: 'discreteJump',
    diffusion: 'neighborPropagation',
    neighborActivation: 'neighborPropagation',
    expand: 'expansion',
    growth: 'expansion',
    shrink: 'contraction',
    diverge: 'divergence',
    converge: 'convergence',
    morph: 'morphMutation',
    mutation: 'morphMutation',
    shear: 'shearStretch',
    stretch: 'shearStretch',
    swirl: 'rotationalSwirl',
    rotation: 'rotationalSwirl',
    branching: 'branchingGrowth'
  },
  interactionScale: {
    globalField: 'global',
    global: 'global',
    clusterCommunity: 'cluster',
    cluster: 'cluster',
    community: 'cluster',
    cellNode: 'cell',
    cell: 'cell',
    node: 'cell',
    edgeNeighbor: 'edge',
    edge: 'edge',
    neighbor: 'edge',
    multiScale: 'hybrid',
    hybrid: 'hybrid'
  },
  displayLayer: {
    depleted: 'depletedValue',
    raw: 'rawBaseValue',
    freshness: 'freshnessRevisitValue'
  }
};

export function sampleFieldExplainerGroup(groupId) {
  return SAMPLE_FIELD_GROUP_SUMMARIES[groupId] ?? {
    label: 'Behavior',
    question: 'What does this component do?',
    summary: 'Explains the selected sample-field behavior.'
  };
}

export function sampleFieldBehaviorExplainer(groupId, value) {
  if (groupId === 'behaviorPreset') return sampleFieldBehaviorPresetExplainer(value);
  const group = sampleFieldExplainerGroup(groupId);
  const normalizedValue = normalizeExplainerValue(groupId, value);
  const option = GROUP_OPTIONS[groupId]?.[normalizedValue] ?? null;
  const contract = sampleFieldComponentContract(groupId);
  return {
    groupId,
    groupLabel: group.label,
    groupSummary: group.summary,
    question: group.question,
    value: normalizedValue,
    label: option?.label ?? String(value ?? 'Behavior'),
    short: option?.short ?? group.summary,
    meaning: option?.meaning ?? group.summary,
    expectedBehavior: option?.expectedBehavior ?? 'The heatmap updates according to the selected sample-field configuration.',
    parameters: option?.parameters ?? ['Seed'],
    pairsWellWith: option?.pairsWellWith ?? [],
    strategy: option?.strategy ?? 'Use the visualization to understand how this component affects sampling choices.',
    boundaryNote: option?.boundaryNote ?? 'Current-coupled and uncertainty behavior belong in their dedicated demos.',
    changes: contract.changes,
    shouldNotChange: contract.shouldNotChange,
    lookFor: contract.lookFor,
    usefulDisplayLayers: contract.usefulDisplayLayers,
    commonConfusion: contract.commonConfusion
  };
}

export function sampleFieldBehaviorSignature(value, processContract = null) {
  const preset = sampleFieldBehaviorPresetById(value);
  const presetId = preset?.id ?? String(value ?? 'custom');
  const signature = SAMPLE_FIELD_BEHAVIOR_SIGNATURES[presetId] ?? fallbackBehaviorSignature(processContract);
  return {
    ...signature,
    bestViews: signature.bestViews ?? [],
    failureSigns: signature.failureSigns ?? [],
    roiMeaning: signature.roiMeaning ?? fallbackRoiMeaning(processContract)
  };
}

function sampleFieldBehaviorPresetExplainer(value) {
  const group = sampleFieldExplainerGroup('behaviorPreset');
  const preset = sampleFieldBehaviorPresetById(value);
  if (!preset) {
    const contract = roiProcessContractForPreset('custom', {});
    const behaviorSignature = sampleFieldBehaviorSignature('custom', contract);
    return {
      groupId: 'behaviorPreset',
      groupLabel: group.label,
      groupSummary: group.summary,
      question: group.question,
      value: 'custom',
      label: 'Custom',
      short: 'Primitive controls define the behavior directly.',
      meaning: 'No curated preset is selected. The current primitive controls define the field.',
      expectedBehavior: 'The heatmap follows the current Source / Initial Field, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, State Model, Sampling Effect, and Display controls.',
      parameters: ['All primitive controls'],
      pairsWellWith: ['Behavior audits', 'Export Demo JSON'],
      strategy: 'Use Custom when tuning a preset or designing a new behavior family.',
      boundaryNote: 'Custom still remains inside the pure Sample / ROI Demo and does not add current-field dependencies.',
      changes: sampleFieldComponentContract('behaviorPreset').changes,
      shouldNotChange: sampleFieldComponentContract('behaviorPreset').shouldNotChange,
      lookFor: sampleFieldComponentContract('behaviorPreset').lookFor,
      usefulDisplayLayers: sampleFieldComponentContract('behaviorPreset').usefulDisplayLayers,
      commonConfusion: sampleFieldComponentContract('behaviorPreset').commonConfusion,
      processContract: contract,
      behaviorSignature,
      recipeRows: recipeRows(contract),
      recipeComponentRows: recipeComponentRows(contract),
      validationSignature: contract.validationSignature
    };
  }
  const contract = roiProcessContractForPreset(preset.id, preset.config);
  const behaviorSignature = sampleFieldBehaviorSignature(preset.id, contract);
  return {
    groupId: 'behaviorPreset',
    groupLabel: group.label,
    groupSummary: group.summary,
    question: group.question,
    value: preset.id,
    label: preset.label,
    short: preset.description,
    meaning: `${preset.description} ${contract.simplifiedClaim}`,
    expectedBehavior: preset.explanation?.expectedBehavior ?? preset.description,
    parameters: [
      `Source / Initial Field: ${preset.config.eventLikelihood}`,
      `Spatial Pattern / Geometry: ${preset.config.spatialPattern}`,
      `Value Distribution: ${preset.config.valueDistribution}`,
      `Temporal Pattern: ${preset.config.temporalPattern}`,
      `Spatial Evolution: ${preset.config.spatialEvolution}`,
      `State Model / Memory: ${preset.config.stateModel}`,
      `Sampling Effects: ${preset.config.depletionMode}`
    ],
    pairsWellWith: [preset.category],
    strategy: preset.strategy,
    boundaryNote: preset.notA,
    changes: sampleFieldComponentContract('behaviorPreset').changes,
    shouldNotChange: sampleFieldComponentContract('behaviorPreset').shouldNotChange,
    lookFor: sampleFieldComponentContract('behaviorPreset').lookFor,
    usefulDisplayLayers: sampleFieldComponentContract('behaviorPreset').usefulDisplayLayers,
    commonConfusion: sampleFieldComponentContract('behaviorPreset').commonConfusion,
    processContract: contract,
    behaviorSignature,
    recipeRows: recipeRows(contract),
    recipeComponentRows: recipeComponentRows(contract),
    validationSignature: contract.validationSignature,
    preset
  };
}

function fallbackBehaviorSignature(processContract = null) {
  return {
    observablePattern: 'The heatmap follows the currently selected component recipe.',
    timeBehavior: 'Watch which parts of the field change when demo time advances.',
    cellImportance: 'Cells matter when S(x,y,t) is high now or L(x,y,t) suggests source-supported future activity.',
    bestViews: ['Sampling Value + Source Overlay', 'Source Field', 'Diagnostics Overlay'],
    failureSigns: ['no visible activity', 'whole-domain saturation', 'changes do not match the selected component'],
    roiMeaning: fallbackRoiMeaning(processContract)
  };
}

function fallbackRoiMeaning(processContract = null) {
  return {
    current: 'high current sample value S(x,y,t)',
    nearFuture: 'high source support L(x,y,t) or recovering state',
    low: 'low sampling value, depleted cells, or low source-support background',
    intuition: processContract?.educationalPrompt ?? 'change one primitive at a time and compare Sampling Value against Source Field'
  };
}

export function sampleFieldCompositionExplainer(state = {}) {
  const likelihood = sampleFieldBehaviorExplainer('eventLikelihood', state.eventLikelihood);
  const spatial = sampleFieldBehaviorExplainer('spatialPattern', state.spatialPattern);
  const valueDistribution = sampleFieldBehaviorExplainer('valueDistribution', state.valueDistribution);
  const temporal = sampleFieldBehaviorExplainer('temporalPattern', state.temporalPattern);
  const evolution = sampleFieldBehaviorExplainer('spatialEvolution', state.spatialEvolution ?? state.patternEvolution);
  const interaction = sampleFieldBehaviorExplainer('interactionScale', state.interactionScale);
  const model = sampleFieldBehaviorExplainer('stateModel', state.stateModel);
  const sampling = sampleFieldBehaviorExplainer('samplingEffect', state.depletionMode);
  const display = sampleFieldBehaviorExplainer('displayLayer', state.displayMode);
  return {
    label: [
      likelihood.label,
      spatial.label,
      valueDistribution.label,
      temporal.label,
      evolution.label,
      interaction.label,
      model.label,
      sampling.label,
      display.label
    ].join(' + '),
    summary: `${likelihood.label} defines where events are prone to originate; ${spatial.label} defines how value is organized around those events; ${valueDistribution.label} controls how values are assigned within that geometry; ${temporal.label} controls when intensity changes; ${evolution.label} controls how the geometry changes over time; ${interaction.label} describes the scale where behavior acts; ${model.label} describes what the field depends on; ${sampling.label} describes how synthetic visits change value; ${display.label} is the layer currently shown.`,
    routeNote: 'Current-driven transport, plumes, flow-stretched patterns, forecast, truth, uncertainty, information gain, and forecast error are shown in the Coupled Fields and Uncertainty / Forecast demos.'
  };
}

function normalizeExplainerValue(groupId, value) {
  const raw = String(value ?? '');
  return ALIASES[groupId]?.[raw] ?? raw;
}

function recipeRows(contract) {
  const components = contract.components ?? {};
  return [
    ['process class', contract.processClass],
    ['interaction scale', contract.interactionScale],
    ['event likelihood', components.eventLikelihood],
    ['spatial pattern', components.spatialPattern],
    ['value distribution', components.valueDistribution],
    ['temporal pattern', components.temporalPattern],
    ['spatial evolution', components.spatialEvolution],
    ['state model', components.stateModel],
    ['sampling effect', components.samplingEffect],
    ['ROI meaning', contract.roiInterpretation]
  ];
}

function recipeComponentRows(contract) {
  const components = contract.components ?? {};
  return [
    recipeComponentRow('eventLikelihood', components.eventLikelihood, roleForComponent('eventLikelihood', components.eventLikelihood)),
    recipeComponentRow('spatialPattern', components.spatialPattern, roleForComponent('spatialPattern', components.spatialPattern)),
    recipeComponentRow('valueDistribution', components.valueDistribution, roleForComponent('valueDistribution', components.valueDistribution)),
    recipeComponentRow('temporalPattern', components.temporalPattern, roleForComponent('temporalPattern', components.temporalPattern)),
    recipeComponentRow('spatialEvolution', components.spatialEvolution, roleForComponent('spatialEvolution', components.spatialEvolution)),
    recipeComponentRow('interactionScale', contract.interactionScale, roleForComponent('interactionScale', contract.interactionScale)),
    recipeComponentRow('stateModel', components.stateModel, roleForComponent('stateModel', components.stateModel)),
    recipeComponentRow('samplingEffect', components.samplingEffect, roleForComponent('samplingEffect', components.samplingEffect))
  ];
}

function recipeComponentRow(componentId, selected, role) {
  const contract = sampleFieldComponentContract(componentId);
  return {
    component: contract.label,
    selected: selected ?? 'n/a',
    question: sampleFieldComponentQuestion(componentId),
    role
  };
}

function roleForComponent(componentId, selected) {
  const value = String(selected ?? '');
  const roles = {
    eventLikelihood: {
      uniformLikelihood: 'Keeps event origins neutral across the domain.',
      gaussianLikelihood: 'Creates one broad event-prone basin.',
      multiModalLikelihood: 'Creates separated recurring event-prone basins.',
      gradientLikelihood: 'Biases event origins along a broad directional trend.',
      patchyLikelihood: 'Creates locally coherent event-prone patches.',
      seededTextureLikelihood: 'Creates replayable irregular event-prone texture.',
      sparseCandidateSites: 'Restricts likely origins to sparse candidate neighborhoods.'
    },
    spatialPattern: {
      constantField: 'Removes spatial geometry so other components are isolated.',
      clusteredField: 'Realized value appears as blob-like regions.',
      patchyField: 'Realized value appears in correlated local patches.',
      sparseTargets: 'Realized value appears as isolated opportunities.',
      linearBand: 'Realized value forms a transect-like band.',
      frontBoundary: 'Realized value forms an active boundary or front.',
      boundaryBand: 'Realized value concentrates near domain edges.',
      monitoringStations: 'Realized value is tied to fixed revisit sites.',
      seededTexture: 'Realized value uses replayable texture.'
    },
    valueDistribution: {
      constantValue: 'Keeps strength uniform inside the selected geometry.',
      uniformRandom: 'Adds replayable value variation with an even spread.',
      gaussianNormal: 'Makes mid-range values common and extremes rarer.',
      skewedLow: 'Makes low values common and high values scarce.',
      skewedHigh: 'Makes high values common while preserving geometry.',
      bimodalValues: 'Separates cells into low and high value bands.',
      heavyTailed: 'Creates occasional high values in a long tail.',
      rareExtremeEvents: 'Creates sparse replayable extreme-value cells.'
    },
    temporalPattern: {
      static: 'Keeps intensity fixed unless sampling effects change display.',
      sustained: 'Keeps opportunities active for long windows.',
      periodic: 'Makes activity rise and fall on a predictable cycle.',
      bursty: 'Makes basins flare and quiet over time.',
      intermittent: 'Creates irregular on/off activation windows.',
      rapidPulse: 'Creates fast repeated intensity pulses.',
      pulseThenSilence: 'Creates one event that fades and does not regenerate.',
      longTailDecay: 'Creates slow fading after activation.',
      gaussianEnvelope: 'Creates a smooth peak around one time window.',
      randomPulses: 'Creates replayable irregular pulses.',
      wavyMultiFrequency: 'Combines several deterministic rhythms.',
      seasonal: 'Creates a long-cycle activity rhythm.'
    },
    spatialEvolution: {
      stationary: 'Keeps geometry anchored while intensity can still change.',
      continuousDrift: 'Moves features smoothly through time.',
      discreteJump: 'Relocates activity between seeded windows.',
      randomWalk: 'Moves local features through seeded step updates.',
      neighborPropagation: 'Spreads activity through nearby cells or graph edges.',
      expansion: 'Grows active regions outward from seeded centers.',
      contraction: 'Concentrates active regions inward toward seeded centers.',
      divergence: 'Separates activity away from seeded centers.',
      convergence: 'Pulls activity toward seeded centers.',
      morphMutation: 'Locally reshapes the field with seeded bounded mutation.',
      shearStretch: 'Deforms the scalar field by shear or stretch.',
      rotationalSwirl: 'Rotates scalar value geometry around seeded centers.',
      branchingGrowth: 'Grows locally connected branch-like activity.'
    },
    interactionScale: {
      global: 'Treats the field as one global process.',
      cluster: 'Lets basins or communities activate independently.',
      cell: 'Emphasizes per-cell/node readiness and state.',
      edge: 'Emphasizes neighbor influence and message passing.',
      hybrid: 'Combines field, cluster, node, and edge cues.'
    },
    stateModel: {
      timeIndexed: 'Computes frames directly from position and time.',
      frequencyBased: 'Uses deterministic periodic components.',
      stateEvolving: 'Uses current graph/node state to update the next frame.',
      historyAware: 'Adds longer memory, cooling, or recovery behavior.'
    },
    samplingEffect: {
      none: 'Leaves sample value unaffected by synthetic visits.',
      hard: 'Removes value at sampled locations.',
      soft: 'Dims sampled locations without erasing all value.',
      neighborhood: 'Dims sampled cells and nearby cells.',
      freshnessAge: 'Represents age-of-information style priority.',
      revisitRecovery: 'Lets value recover after enough time has passed.'
    }
  };
  return roles[componentId]?.[value] ?? 'Defines this component role in the selected recipe.';
}
