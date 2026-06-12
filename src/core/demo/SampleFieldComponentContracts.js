export const SAMPLE_FIELD_COMPONENTS = [
  'behaviorPreset',
  'eventLikelihood',
  'spatialPattern',
  'valueDistribution',
  'temporalPattern',
  'spatialEvolution',
  'interactionScale',
  'stateModel',
  'samplingEffect',
  'displayLayer',
  'seed'
];

export const SAMPLE_FIELD_COMPONENT_CONTRACTS = {
  behaviorPreset: {
    label: 'Process Pattern',
    question: 'Which example process pattern defines the starting component recipe?',
    changes: 'Loads a Process Pattern recipe for Example Processes mode.',
    shouldNotChange: 'A source should not hide the primitive components or become an opaque model.',
    lookFor: 'The component breakdown and expected heatmap behavior in Recipe View.',
    usefulDisplayLayers: ['Sampling Value + Source Overlay', 'Diagnostics Overlay'],
    commonConfusion: 'Process Patterns are editable recipes built from components, not exact CA or domain simulators.'
  },
  eventLikelihood: {
    label: 'Source / Initial Field',
    question: 'Where does the process start, recur, or have initial support?',
    changes: 'Where process activity can originate, recur, jump, walk, or propagate.',
    shouldNotChange: 'It should not directly define realized sample value magnitude.',
    lookFor: 'Likely basins that may not be active yet.',
    usefulDisplayLayers: ['Source Field', 'Sampling Value + Source Overlay', 'Graph Communities'],
    commonConfusion: 'Source / Initial Field is not uncertainty, belief, forecast probability, or realized reward.'
  },
  spatialPattern: {
    label: 'Spatial Pattern / Geometry',
    question: 'What shape do values take?',
    changes: 'The geometry of realized sample value once activity exists.',
    shouldNotChange: 'It should not define when the field pulses or moves by itself.',
    lookFor: 'Blobs, patches, fronts, bands, sparse sites, or station geometry.',
    usefulDisplayLayers: ['Sampling Value', 'Raw Base Value', 'Sampling Value + Source Overlay'],
    commonConfusion: 'Spatial geometry is different from event-proneness.'
  },
  valueDistribution: {
    label: 'Value Distribution',
    question: 'How strong are values?',
    changes: 'How cell values are assigned within the selected geometry.',
    shouldNotChange: 'It should not move the pattern or change event-origin basins.',
    lookFor: 'Different contrast, tails, or high-value emphasis inside the same geometry.',
    usefulDisplayLayers: ['Sampling Value', 'Diagnostics Overlay'],
    commonConfusion: 'Value distributions control magnitude shape, not location, source support, or spatial geometry.'
  },
  temporalPattern: {
    label: 'Temporal Pattern',
    question: 'When do values activate?',
    changes: 'When activity turns on, fades, pulses, or returns.',
    shouldNotChange: 'It should not move the spatial pattern by itself.',
    lookFor: 'Brightness changing over time while spatial structure remains recognizable.',
    usefulDisplayLayers: ['Sampling Value', 'Cell / Node States', 'Diagnostics Overlay'],
    commonConfusion: 'Temporal pulsing is different from spatial movement.'
  },
  spatialEvolution: {
    label: 'Spatial Evolution / Motion Rule',
    question: 'How do values move or spread?',
    changes: 'How spatial structure moves, spreads, jumps, mutates, or deforms.',
    shouldNotChange: 'It should not define the original geometry by itself.',
    lookFor: 'Centroid movement, propagation, relocation, deformation, branching, mutation, or boundary motion.',
    usefulDisplayLayers: ['Sampling Value', 'Process Influence Messages', 'Cell / Node States', 'Diagnostics Overlay'],
    commonConfusion: 'Spatial evolution is not physical current F(x,y,t).'
  },
  interactionScale: {
    label: 'Interaction Scale / Hierarchy',
    question: 'At what scale does behavior act?',
    changes: 'Whether behavior acts on the global field, communities, cells, edges, or multiple scales.',
    shouldNotChange: 'It should not change the basic pattern family by itself.',
    lookFor: 'Whether motion/spread affects the whole field, each community, individual nodes, or neighbor edges.',
    usefulDisplayLayers: ['Graph Communities', 'Cell / Node States', 'Process Influence Messages', 'Community + Messages'],
    commonConfusion: 'Random walk at global scale is not the same as cluster-level random walk.'
  },
  stateModel: {
    label: 'State Model / Update Rule',
    question: 'How does memory update the field?',
    changes: 'Whether the next frame is computed from time, cycles, current state, or longer history.',
    shouldNotChange: 'It should not define the initial geometry or event likelihood by itself.',
    lookFor: 'Node states, transitions, cooldown, recovery, and message-driven activation.',
    usefulDisplayLayers: ['Cell / Node States', 'Process Influence Messages', 'Diagnostics Overlay'],
    commonConfusion: 'A state model is not the same as a spatial pattern.'
  },
  samplingEffect: {
    label: 'Sampling Effect / Freshness',
    question: 'How does sampling change future value?',
    changes: 'How synthetic visits deplete, cool, or refresh displayed sample value.',
    shouldNotChange: 'It should not change latent event likelihood L(x,y,t).',
    lookFor: 'Visited or stale cells dimming, cooling, or recovering.',
    usefulDisplayLayers: ['Depleted Value', 'Freshness / Revisit Value', 'Diagnostics Overlay'],
    commonConfusion: 'Freshness is demo-only unless tied to actual mission visits.'
  },
  displayLayer: {
    label: 'Display / Diagnostic Layer',
    question: 'Which field or graph diagnostic am I viewing?',
    changes: 'Only the visual layer used to inspect the same generated state.',
    shouldNotChange: 'It should not change generated values, likelihood, states, or messages.',
    lookFor: 'S, L, overlay comparisons, communities, node states, messages, or diagnostics.',
    usefulDisplayLayers: ['All display layers'],
    commonConfusion: 'Switching display layers is inspection, not generation.'
  },
  seed: {
    label: 'Seed / Scenario Identity',
    question: 'Which deterministic instance is this?',
    changes: 'The replayable instance geometry, timing offsets, texture, and sampled parameters.',
    shouldNotChange: 'It should not change the selected component family or recipe.',
    lookFor: 'Same behavior class with different but representative layout/timing.',
    usefulDisplayLayers: ['Sampling Value + Source Overlay', 'Diagnostics Overlay'],
    commonConfusion: 'Seeded randomness is reproducible, not per-load randomness.'
  }
};

export function sampleFieldComponentContract(componentId) {
  return SAMPLE_FIELD_COMPONENT_CONTRACTS[componentId] ?? SAMPLE_FIELD_COMPONENT_CONTRACTS.behaviorPreset;
}

export function sampleFieldComponentQuestion(componentId) {
  return sampleFieldComponentContract(componentId).question;
}

export function sampleFieldComponentLabel(componentId) {
  return sampleFieldComponentContract(componentId).label;
}
