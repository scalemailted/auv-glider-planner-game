export const SAMPLE_FIELD_EXPLAINER_GROUPS = [
  'spatialPattern',
  'valueDistribution',
  'temporalPattern',
  'spatialEvolution',
  'stateModel',
  'samplingEffect',
  'displayLayer'
];

export const SAMPLE_FIELD_GROUP_SUMMARIES = {
  spatialPattern: {
    label: 'Spatial Pattern',
    question: 'Where is sample value located in space?',
    summary: 'Controls the geometry of sample value across the map.'
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
    summary: 'Controls whether the value pattern stays fixed, drifts, jumps, wanders, or spreads.'
  },
  stateModel: {
    label: 'State Model',
    question: 'What does the field depend on?',
    summary: 'Explains whether values are computed from time, cycles, current state, or longer history.'
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
    boundaryNote: 'Not a flow-driven plume or current-advected feature.'
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
    meaning: 'Value becomes temporarily high during burst windows.',
    expectedBehavior: 'Activity grows, peaks, fades, and leaves quieter intervals.',
    parameters: ['Burst Duration', 'Burst Strength', 'Burst Spacing'],
    pairsWellWith: ['Clustered Field', 'Discrete Jump', 'Sparse Targets'],
    strategy: 'Teaches intercepting opportunities before they fade.',
    boundaryNote: 'A burst is temporal intensity, not a moving plume by itself.'
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
    expectedBehavior: 'Activity grows in one location, fades, then later appears in a new seeded location.',
    parameters: ['Jump Window', 'Jump Distance', 'Persistence'],
    pairsWellWith: ['Bursty', 'Clustered Field', 'Sparse Targets'],
    strategy: 'Teaches not assuming the next event will occur where the last event was.',
    boundaryNote: 'Jumping is discontinuous relocation, not smooth drift.'
  },
  randomWalk: {
    label: 'Random Walk',
    short: 'The pattern moves by local seeded steps.',
    meaning: 'Feature centers or active regions move by bounded local deterministic steps.',
    expectedBehavior: 'Regions wander locally and independently while remaining replayable for the same seed; the full map does not move together unless Motion Scope is Global.',
    parameters: ['Motion Scope', 'Step Size', 'Turn Variability', 'Seed'],
    pairsWellWith: ['State-Evolving', 'Intermittent', 'Clustered Field'],
    strategy: 'Teaches tracking a wandering target without assuming straight-line motion.',
    boundaryNote: 'Random Walk is seeded and reproducible, not Math.random per frame.'
  },
  neighborPropagation: {
    label: 'Neighbor Propagation',
    short: 'Activity spreads from active cells to nearby cells.',
    meaning: 'Neighboring cells matter because active value can diffuse or activate adjacent locations.',
    expectedBehavior: 'High-value regions expand, blur, or spread to neighboring cells over time.',
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
    expectedBehavior: 'Sampled cells dim but can remain somewhat useful.',
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
    expectedBehavior: 'The heatmap reflects spatial pattern, temporal pattern, spatial evolution, and sampling effect.',
    parameters: ['Spatial Pattern', 'Temporal Pattern', 'Sampling Effect'],
    pairsWellWith: ['All demo components'],
    strategy: 'Use this for normal planning intuition over the composed sample field.',
    boundaryNote: 'It is not truth/forecast/uncertainty; those belong in the Uncertainty / Forecast Demo.'
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
  spatialPattern: SPATIAL_PATTERN_EXPLAINERS,
  valueDistribution: VALUE_DISTRIBUTION_EXPLAINERS,
  temporalPattern: TEMPORAL_PATTERN_EXPLAINERS,
  spatialEvolution: SPATIAL_EVOLUTION_EXPLAINERS,
  stateModel: STATE_MODEL_EXPLAINERS,
  samplingEffect: SAMPLING_EFFECT_EXPLAINERS,
  displayLayer: DISPLAY_LAYER_EXPLAINERS
};

const ALIASES = {
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

export function sampleFieldCompositionExplainer(state = {}) {
  const spatial = sampleFieldBehaviorExplainer('spatialPattern', state.spatialPattern);
  const valueDistribution = sampleFieldBehaviorExplainer('valueDistribution', state.valueDistribution);
  const temporal = sampleFieldBehaviorExplainer('temporalPattern', state.temporalPattern);
  const evolution = sampleFieldBehaviorExplainer('spatialEvolution', state.spatialEvolution ?? state.patternEvolution);
  const model = sampleFieldBehaviorExplainer('stateModel', state.stateModel);
  const sampling = sampleFieldBehaviorExplainer('samplingEffect', state.depletionMode);
  const display = sampleFieldBehaviorExplainer('displayLayer', state.displayMode);
  return {
    label: [
      spatial.label,
      valueDistribution.label,
      temporal.label,
      evolution.label,
      model.label,
      sampling.label,
      display.label
    ].join(' + '),
    summary: `${spatial.label} defines where value is organized; ${valueDistribution.label} controls how values are assigned within that geometry; ${temporal.label} controls when intensity changes; ${evolution.label} controls how the geometry changes over time; ${model.label} describes what the field depends on; ${sampling.label} describes how synthetic visits change value; ${display.label} is the layer currently shown.`,
    routeNote: 'Current-driven transport, plumes, flow-stretched patterns, forecast, truth, uncertainty, information gain, and forecast error are shown in the Coupled Fields and Uncertainty / Forecast demos.'
  };
}

function normalizeExplainerValue(groupId, value) {
  const raw = String(value ?? '');
  return ALIASES[groupId]?.[raw] ?? raw;
}
