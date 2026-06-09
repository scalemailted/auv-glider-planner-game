import { sampleFieldBehaviorPresetById } from './SampleFieldBehaviorPresets.js';

export const SAMPLE_FIELD_EXPLAINER_GROUPS = [
  'behaviorPreset',
  'eventLikelihood',
  'spatialPattern',
  'valueDistribution',
  'temporalPattern',
  'spatialEvolution',
  'stateModel',
  'samplingEffect',
  'displayLayer'
];

export const SAMPLE_FIELD_GROUP_SUMMARIES = {
  behaviorPreset: {
    label: 'Behavior Preset',
    question: 'What recognizable sample-field behavior family is being demonstrated?',
    summary: 'Curated starting points that fill in the primitive sample-field controls.'
  },
  eventLikelihood: {
    label: 'Event Likelihood / Spawn Distribution',
    question: 'Where are events likely to originate or move next?',
    summary: 'Controls L(x,y,t): the underlying event-proneness substrate used by origins, sparse sites, jumps, walks, and propagation. This is not the realized sample value.'
  },
  spatialPattern: {
    label: 'Spatial Pattern / Geometry',
    question: 'Where is sample value located in space?',
    summary: 'Controls the geometry of realized sample value once activity exists.'
  },
  valueDistribution: {
    label: 'Value Distribution',
    question: 'How are values assigned within the selected spatial pattern?',
    summary: 'Controls value likelihood, such as constant, uniform random, or Gaussian / Normal values.'
  },
  temporalPattern: {
    label: 'Temporal Pattern',
    question: 'How does value intensity change over time?',
    summary: 'Controls when sample value rises, fades, pulses, or stays steady.'
  },
  spatialEvolution: {
    label: 'Spatial Evolution',
    question: 'How does the spatial distribution itself change over time?',
    summary: 'Controls how activity moves, jumps, spreads, or mutates across space.'
  },
  stateModel: {
    label: 'State Model / Memory',
    question: 'What does the field depend on?',
    summary: 'Controls whether the next frame is computed directly from time or depends on previous frames and longer history.'
  },
  samplingEffect: {
    label: 'Sampling Effect',
    question: 'How do visits or samples change future value?',
    summary: 'Controls depletion, freshness, neighborhood cooling, and revisit recovery in the demo.'
  },
  displayLayer: {
    label: 'Display Layer',
    question: 'What value layer am I viewing?',
    summary: 'Controls whether the heatmap shows raw value, depleted value, freshness, or the active sample layer.'
  }
};

const EVENT_LIKELIHOOD_EXPLAINERS = {
  uniformLikelihood: {
    label: 'Uniform Likelihood',
    short: 'Every cell is equally likely to host event origins before spatial pattern shaping.',
    meaning: 'The event substrate contributes no preferred origin zones.',
    expectedBehavior: 'Clusters, sparse targets, jumps, walks, and propagation are not biased toward any particular part of the domain.',
    parameters: ['Seed'],
    pairsWellWith: ['Constant Field', 'Clustered Field', 'Static'],
    strategy: 'Use as a neutral baseline for comparing spatial pattern and value distribution controls.',
    boundaryNote: 'This replaces the old Constant Field-as-substrate idea; Constant Field is now only a spatial pattern.'
  },
  gaussianLikelihood: {
    label: 'Gaussian Likelihood',
    short: 'Events are most likely near one smooth seeded center.',
    meaning: 'The substrate has a single broad event-prone region.',
    expectedBehavior: 'Origin centers, sparse targets, and dynamic relocations tend to favor one seeded zone.',
    parameters: ['Seed', 'Center', 'Spread'],
    pairsWellWith: ['Clustered Field', 'Sparse Targets', 'Bursty'],
    strategy: 'Teaches planning around a dominant event-prone region without hard-coding target cells.',
    boundaryNote: 'Gaussian likelihood biases event origins; Gaussian / Normal value distribution controls value draws.'
  },
  multiModalLikelihood: {
    label: 'Multi-Modal Likelihood',
    short: 'Events are likely around several seeded source regions.',
    meaning: 'The substrate creates multiple replayable event-prone basins.',
    expectedBehavior: 'Event Likelihood view shows separated persistent basins. Sample Value only shows realized activity when a behavior uses those basins.',
    parameters: ['Seed', 'Mode Count', 'Minimum Mode Separation', 'Domain Coverage', 'Mode Spread'],
    pairsWellWith: ['Clustered Field', 'Discrete Jump', 'Random Walk'],
    strategy: 'Teaches assignment and fallback between several likely event regions.',
    boundaryNote: 'Multi-Modal Likelihood is a spawn distribution, not a full behavior by itself. The modes are deterministic from seed, not regenerated from Math.random during updates.'
  },
  gradientLikelihood: {
    label: 'Gradient Likelihood',
    short: 'Event probability increases along a seeded directional trend.',
    meaning: 'The substrate makes one side or direction more event-prone.',
    expectedBehavior: 'New centers, jumps, and walks favor the high-likelihood side of the heatmap.',
    parameters: ['Seed', 'Gradient Direction'],
    pairsWellWith: ['Gradient / Trend', 'Front / Boundary', 'Continuous Drift'],
    strategy: 'Teaches routes that trade travel cost against a broad event-prone region.',
    boundaryNote: 'This is not current flow or terrain slope.'
  },
  patchyLikelihood: {
    label: 'Patchy Likelihood',
    short: 'Events favor irregular but spatially correlated patches.',
    meaning: 'The event substrate is locally coherent, so neighboring cells can share event-proneness.',
    expectedBehavior: 'Origins and propagation prefer replayable patch neighborhoods.',
    parameters: ['Seed', 'Patch Scale'],
    pairsWellWith: ['Patchy / Correlated Field', 'Neighbor Propagation', 'Intermittent Activity'],
    strategy: 'Teaches local search where nearby cells are informative.',
    boundaryNote: 'Patchiness is deterministic from seed; it is not per-frame noise.'
  },
  seededTextureLikelihood: {
    label: 'Seeded Texture Likelihood',
    short: 'Events use a deterministic texture as the likelihood substrate.',
    meaning: 'The substrate is irregular at coarse and fine scales while remaining replayable.',
    expectedBehavior: 'Sparse sites, centers, and evolving features favor textured high-likelihood pockets.',
    parameters: ['Seed', 'Texture Scale'],
    pairsWellWith: ['Seeded Texture', 'Random Pulses', 'State-Evolving'],
    strategy: 'Teaches planning over irregular event-prone terrain without flow or land coupling.',
    boundaryNote: 'Texture likelihood is separate from value-distribution randomness.'
  },
  sparseCandidateSites: {
    label: 'Sparse Candidate Sites',
    short: 'Events favor a small set of seeded candidate locations.',
    meaning: 'The substrate acts like a replayable candidate-site map for isolated event origins.',
    expectedBehavior: 'Sparse targets and jump destinations tend to snap toward candidate neighborhoods.',
    parameters: ['Seed', 'Candidate Count', 'Candidate Radius'],
    pairsWellWith: ['Sparse Targets', 'Discrete Jump', 'Revisit Recovery'],
    strategy: 'Teaches routing among a few likely event opportunities.',
    boundaryNote: 'Candidate sites are demo event likelihood, not mission Gold Stars.'
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
    boundaryNote: 'Clustered Field is only spatial geometry. Recurrence requires a Temporal Pattern and usually an Event Likelihood substrate.'
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
    expectedBehavior: 'Activity grows, peaks, fades, and later reappears from the Event Likelihood Field.',
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
    pairsWellWith: ['Multi-Modal Likelihood', 'Frequency-Based State Model'],
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
    meaning: 'Neighboring cells matter because active value can diffuse or activate adjacent locations.',
    expectedBehavior: 'High-value regions expand, blur, or spread to neighboring cells over time while new likely cells can activate.',
    parameters: ['Motion Scope', 'Propagation Rate', 'Neighbor Radius', 'Decay'],
    pairsWellWith: ['Patchy / Correlated Field', 'Seeded Texture', 'State-Evolving'],
    strategy: 'Teaches local search and anticipating spread into adjacent areas.',
    boundaryNote: 'Propagation is sample-value spread, not fluid advection.'
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
    meaning: 'The field evolves from its current state, which is Markovian when the next state depends only on the current state.',
    expectedBehavior: 'Propagation, random walks, or local steps depend on the previous/current field state.',
    parameters: ['Current State', 'Transition Rule', 'Seed'],
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
    pairsWellWith: ['Clustered Field', 'Sustained', 'Sample Value'],
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
    label: 'Sample Value',
    short: 'Shows the active sample-value layer after selected behavior is applied.',
    meaning: 'This is the main visible value layer for the current composition.',
    expectedBehavior: 'The heatmap reflects spatial pattern, temporal pattern, spatial evolution, likelihood-driven regeneration, and sampling effect.',
    parameters: ['Spatial Pattern', 'Temporal Pattern', 'Sampling Effect'],
    pairsWellWith: ['All demo components'],
    strategy: 'Use this for normal planning intuition over the composed sample field.',
    boundaryNote: 'It is not truth/forecast/uncertainty; those belong in the Uncertainty / Forecast Demo.'
  },
  eventLikelihood: {
    label: 'Event Likelihood',
    short: 'Shows L(x,y,t), where events are likely to originate.',
    meaning: 'The Event Likelihood Field is the generative substrate. It controls where sample-value events, targets, bursts, jumps, walks, and propagation are likely to start.',
    expectedBehavior: 'Uniform likelihood appears flat; Gaussian, multi-modal, gradient, patchy, texture, or sparse-site modes reveal preferred event-origin regions.',
    parameters: ['Event Likelihood Field', 'Likelihood Dynamics', 'Likelihood Spatial Evolution'],
    pairsWellWith: ['Multi-Modal Likelihood', 'Discrete Jump', 'Random Walk', 'Neighbor Propagation'],
    strategy: 'Use this layer to understand where future events are likely before inspecting realized sample value.',
    boundaryNote: 'Likelihood is not the realized sample value S(x,y,t). It biases where events form.'
  },
  sampleValueLikelihoodOverlay: {
    label: 'Sample Value + Likelihood Overlay',
    short: 'Shows S(x,y,t) with L(x,y,t) highlighted on top.',
    meaning: 'The heatmap remains realized sample value while bright dots/rings mark high event-likelihood regions.',
    expectedBehavior: 'High-likelihood zones may remain visible even when the current sample-value burst is active elsewhere.',
    parameters: ['Display Layer', 'Event Likelihood Field', 'Sample Value'],
    pairsWellWith: ['Clustered Field', 'Bursty', 'Discrete Jump', 'Multi-Modal Likelihood'],
    strategy: 'Use overlay mode to compare likely origins with currently realized reward.',
    boundaryNote: 'Overlay is explanatory; it does not change the generated field.'
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
    normal: 'gaussianNormal'
  },
  spatialEvolution: {
    fixed: 'stationary',
    growthDecay: 'stationary',
    movingFeature: 'continuousDrift',
    splitMerge: 'discreteJump',
    diffusion: 'neighborPropagation',
    neighborActivation: 'neighborPropagation'
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
    boundaryNote: option?.boundaryNote ?? 'Current-coupled and uncertainty behavior belong in their dedicated demos.'
  };
}

function sampleFieldBehaviorPresetExplainer(value) {
  const group = sampleFieldExplainerGroup('behaviorPreset');
  const preset = sampleFieldBehaviorPresetById(value);
  if (!preset) {
    return {
      groupId: 'behaviorPreset',
      groupLabel: group.label,
      groupSummary: group.summary,
      question: group.question,
      value: 'custom',
      label: 'Custom',
      short: 'Primitive controls define the behavior directly.',
      meaning: 'No curated preset is selected. The current primitive controls define the field.',
      expectedBehavior: 'The heatmap follows the current Event Likelihood, Spatial Pattern, Value Distribution, Temporal Pattern, Spatial Evolution, State Model, Sampling Effect, and Display controls.',
      parameters: ['All primitive controls'],
      pairsWellWith: ['Behavior audits', 'Export Demo JSON'],
      strategy: 'Use Custom when tuning a preset or designing a new behavior family.',
      boundaryNote: 'Custom still remains inside the pure Sample / ROI Demo and does not add current-field dependencies.'
    };
  }
  return {
    groupId: 'behaviorPreset',
    groupLabel: group.label,
    groupSummary: group.summary,
    question: group.question,
    value: preset.id,
    label: preset.label,
    short: preset.description,
    meaning: preset.description,
    expectedBehavior: preset.explanation?.expectedBehavior ?? preset.description,
    parameters: [
      `Event Likelihood / Spawn Distribution: ${preset.config.eventLikelihood}`,
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
    preset
  };
}

export function sampleFieldCompositionExplainer(state = {}) {
  const likelihood = sampleFieldBehaviorExplainer('eventLikelihood', state.eventLikelihood);
  const spatial = sampleFieldBehaviorExplainer('spatialPattern', state.spatialPattern);
  const valueDistribution = sampleFieldBehaviorExplainer('valueDistribution', state.valueDistribution);
  const temporal = sampleFieldBehaviorExplainer('temporalPattern', state.temporalPattern);
  const evolution = sampleFieldBehaviorExplainer('spatialEvolution', state.spatialEvolution ?? state.patternEvolution);
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
      model.label,
      sampling.label,
      display.label
    ].join(' + '),
    summary: `${likelihood.label} defines where events are prone to originate; ${spatial.label} defines how value is organized around those events; ${valueDistribution.label} controls how values are assigned within that geometry; ${temporal.label} controls when intensity changes; ${evolution.label} controls how the geometry changes over time; ${model.label} describes what the field depends on; ${sampling.label} describes how synthetic visits change value; ${display.label} is the layer currently shown.`,
    routeNote: 'Current-driven transport, plumes, flow-stretched patterns, forecast, truth, uncertainty, information gain, and forecast error are shown in the Coupled Fields and Uncertainty / Forecast demos.'
  };
}

function normalizeExplainerValue(groupId, value) {
  const raw = String(value ?? '');
  return ALIASES[groupId]?.[raw] ?? raw;
}
