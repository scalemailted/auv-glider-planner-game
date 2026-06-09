import { getVectorPresetConfig } from '../generation/VectorFieldPresets.js';

export const FLOW_FIELD_EXPLAINER_GROUPS = [
  'basePreset',
  'evolutionBehavior',
  'dynamicComplexity',
  'directionVariation',
  'magnitudeVariation',
  'spatialMotion',
  'topologyMode',
  'boundaryMode',
  'displayLayer',
  'speedModel'
];

export const FLOW_FIELD_GROUP_SUMMARIES = {
  basePreset: {
    label: 'Flow Field / Base Preset',
    question: 'What base vector field is being sampled?',
    summary: 'Selects the main synthetic current behavior F(x, y, t) = <u, v>.'
  },
  evolutionBehavior: {
    label: 'Evolution Behavior',
    question: 'How does the field change over demo time?',
    summary: 'Controls the time behavior used when the dynamic field is sampled.'
  },
  dynamicComplexity: {
    label: 'Dynamic Complexity',
    question: 'How much dynamic structure is added?',
    summary: 'Controls how strong and busy the dynamic modulation is.'
  },
  directionVariation: {
    label: 'Direction Variation',
    question: 'How much does direction change?',
    summary: 'Controls how much vector direction rotates across space and time.'
  },
  magnitudeVariation: {
    label: 'Magnitude Variation',
    question: 'How much does current strength change?',
    summary: 'Controls how much vector magnitude pulses or varies across space and time.'
  },
  spatialMotion: {
    label: 'Spatial Motion',
    question: 'Do current structures move through the domain?',
    summary: 'Controls whether flow structures drift, circle, meander, or stay anchored.'
  },
  topologyMode: {
    label: 'Land / Topology Mode',
    question: 'What land/water topology shapes the field?',
    summary: 'Selects the terrain pattern used by topology-aware current sampling.'
  },
  boundaryMode: {
    label: 'Boundary Mode',
    question: 'How are currents handled near land?',
    summary: 'Controls risk, damping, and deflection near shoreline or obstacles.'
  },
  displayLayer: {
    label: 'Display Layers',
    question: 'What is visible in the canvas?',
    summary: 'Explains arrows, passive particles, magnitude scale, and inspector overlays.'
  },
  speedModel: {
    label: 'Playback vs Evolution Speed',
    question: 'Which speed control changes what?',
    summary: 'Separates UI clock speed, current-field evolution speed, particle speed, and magnitude display scale.'
  }
};

const BASE_PRESET_EXPLAINERS = {
  topologyAwareComposite: {
    short: 'Synthetic topology-aware current behavior shaped by water, shore, channels, bays, islands, and open water.',
    meaning: 'The base sampler blends regional synthetic behaviors using terrain/topology metadata when available.',
    expectedBehavior: 'Open water, shorelines, channels, bays, and obstacle wakes can show different vector directions and strengths.',
    parameters: ['Base Flow Field', 'Land Mode', 'Boundary Mode', 'Dynamic Complexity'],
    strategy: 'Use it to understand mission-style currents before planning near land or through channels.',
    boundaryNote: 'This is a lightweight synthetic topology-aware field, not CFD or validated HYCOM forecast data.'
  },
  uniformDrift: {
    short: 'A broad baseline current with mostly constant direction and strength.',
    meaning: 'The field pushes water in a simple dominant direction.',
    expectedBehavior: 'Arrows align consistently and particle trails move in a coherent drift.',
    parameters: ['Magnitude Variation', 'Direction Variation'],
    strategy: 'Good baseline for separating current drift from route geometry.',
    boundaryNote: 'Uniform drift is not a measured ocean forecast.'
  },
  shearFlow: {
    short: 'A banded field where velocity changes across the domain.',
    meaning: 'Current speed and sometimes direction vary by position.',
    expectedBehavior: 'Adjacent bands show different arrow lengths or directions.',
    parameters: ['Magnitude Variation', 'Direction Variation', 'Dynamic Complexity'],
    strategy: 'Teaches crossing or following faster/slower current bands.',
    boundaryNote: 'This is a synthetic shear pattern.'
  },
  eddyField: {
    short: 'Rotational current structure.',
    meaning: 'The field contains swirl-like circulation around one or more centers.',
    expectedBehavior: 'Arrows curve around eddies and particles orbit or spiral through the feature.',
    parameters: ['Spatial Motion', 'Direction Variation', 'Dynamic Complexity'],
    strategy: 'Useful for seeing how circular currents can help or fight a planned route.',
    boundaryNote: 'It is an educational eddy approximation.'
  },
  doubleGyre: {
    short: 'Two large counter-rotating circulation cells.',
    meaning: 'The domain is split into paired gyre structures.',
    expectedBehavior: 'Arrows rotate in opposite senses across the two halves of the map.',
    parameters: ['Evolution Behavior', 'Spatial Motion', 'Direction Variation'],
    strategy: 'Teaches crossing circulation boundaries and timing routes through recirculation.',
    boundaryNote: 'This is a synthetic vector-field pattern.'
  },
  tidalOscillation: {
    short: 'Oscillatory current that strengthens, slackens, reverses, and strengthens again.',
    meaning: 'The sampled vector changes with a repeatable tide-like phase.',
    expectedBehavior: 'At fixed cells, direction and magnitude shift through the cycle.',
    parameters: ['Evolution Behavior', 'Cycle Duration', 'Flow Evolution Speed'],
    strategy: 'Teaches timing movement with or against predictable current reversal.',
    boundaryNote: 'This is tide-inspired, not a site-specific tide model.'
  },
  meanderingJet: {
    short: 'A wavy corridor of stronger current.',
    meaning: 'A jet-like band bends across the domain and may translate or meander over time.',
    expectedBehavior: 'Long bands of stronger arrows shift position or direction.',
    parameters: ['Spatial Motion', 'Dynamic Complexity', 'Magnitude Variation'],
    strategy: 'Teaches riding a strong corridor or avoiding cross-jet penalties.',
    boundaryNote: 'This is synthetic current structure.'
  },
  stormPulse: {
    short: 'A localized current-strengthening event.',
    meaning: 'A pulse grows, peaks, and fades, optionally at a moving location.',
    expectedBehavior: 'A region of stronger arrows appears temporarily and then weakens.',
    parameters: ['Evolution Behavior', 'Cycle Duration', 'Magnitude Variation'],
    strategy: 'Teaches avoiding or exploiting temporary high-energy currents.',
    boundaryNote: 'This is a teaching pulse, not meteorological forcing.'
  },
  curlNoise: {
    short: 'Seeded irregular flow texture.',
    meaning: 'Curl-like noise creates random-looking but reproducible vector variation.',
    expectedBehavior: 'Arrows vary locally without changing randomly every frame.',
    parameters: ['Direction Variation', 'Magnitude Variation', 'Dynamic Complexity'],
    strategy: 'Good for stress-testing planners against irregular local currents.',
    boundaryNote: 'Seeded texture is not observational data.'
  },
  calm: {
    short: 'Near-zero baseline flow.',
    meaning: 'The water contributes little or no current.',
    expectedBehavior: 'Arrows are short and passive particles move mainly by display bias.',
    parameters: ['Magnitude Scale', 'Particle Speed'],
    strategy: 'Use as a control case before introducing current-driven route effects.',
    boundaryNote: 'Calm only describes this synthetic demo field.'
  },
  hycomInspiredComposite: {
    short: 'Synthetic composite inspired by ocean-current motifs.',
    meaning: 'The preset combines several synthetic current motifs while remaining deterministic and local to this demo.',
    expectedBehavior: 'Arrows can show jets, eddies, pulses, and texture depending on time and settings.',
    parameters: ['Dynamic Complexity', 'Evolution Pattern', 'Flow Evolution Speed'],
    strategy: 'Useful for visually rich solver and planner intuition.',
    boundaryNote: 'Despite the name, this is not real HYCOM data unless imported and validated separately.'
  }
};

const EVOLUTION_EXPLAINERS = {
  continuous: {
    label: 'Continuous',
    short: 'The field evolves without intentionally repeating over a short fixed cycle.',
    meaning: 'Sampler time advances continuously, so phases and structures change smoothly.',
    expectedBehavior: 'At fixed cells, direction and magnitude change gradually rather than jumping.',
    parameters: ['Demo Time', 'Flow Evolution Speed', 'Direction Variation', 'Magnitude Variation'],
    strategy: 'Use for non-repeating planning intuition where the current keeps changing.',
    boundaryNote: 'Continuous evolution is not playback speed; playback only advances demo time.'
  },
  looping: {
    label: 'Looping / Cyclic',
    short: 'The field repeats after the selected cycle duration.',
    meaning: 'Sampler time wraps through a fixed phase interval.',
    expectedBehavior: 'The same current pattern returns after the cycle duration.',
    parameters: ['Cycle Duration', 'Flow Evolution Speed'],
    strategy: 'Teaches timing routes around predictable recurring current phases.',
    boundaryNote: 'Looping is synthetic periodic behavior, not a guarantee about real ocean cycles.'
  },
  pulse: {
    label: 'One-Shot Pulse',
    short: 'A finite event grows, peaks, and fades.',
    meaning: 'An envelope scales the dynamic terms so the event is temporary.',
    expectedBehavior: 'A localized or broad strengthening appears and then quiets.',
    parameters: ['Cycle Duration', 'Magnitude Variation', 'Evolution Pattern'],
    strategy: 'Teaches whether to wait out or exploit temporary current events.',
    boundaryNote: 'The pulse is not a forecast uncertainty layer.'
  },
  translating: {
    label: 'Meandering / Translating',
    short: 'Current structures move through the domain.',
    meaning: 'Spatial offsets shift sampled current structures as time advances.',
    expectedBehavior: 'Jets, eddies, pulses, or texture appear to move instead of only changing in place.',
    parameters: ['Spatial Motion', 'Spatial Motion Speed', 'Flow Evolution Speed'],
    strategy: 'Teaches leading or avoiding moving current structures.',
    boundaryNote: 'Structure motion is different from passive particle motion.'
  }
};

const COMPLEXITY_EXPLAINERS = {
  low: {
    short: 'Smoother, slower, easier-to-read currents.',
    meaning: 'Dynamic direction and magnitude terms are damped.',
    expectedBehavior: 'Arrows shift less aggressively and particle paths are easier to read.',
    parameters: ['Direction Variation', 'Magnitude Variation'],
    strategy: 'Use when teaching the basic relationship between vector direction and drift.',
    boundaryNote: 'Low complexity can still be time-varying.'
  },
  medium: {
    short: 'Balanced default planning challenge.',
    meaning: 'Dynamic terms are applied at moderate strength.',
    expectedBehavior: 'Arrows visibly change without overwhelming the topology or base preset.',
    parameters: ['Evolution Pattern', 'Spatial Motion'],
    strategy: 'Use for normal solver and route-comparison intuition.',
    boundaryNote: 'Medium is still synthetic.'
  },
  high: {
    short: 'Stronger direction changes, magnitude pulses, moving structures, and regional variation.',
    meaning: 'Dynamic modulation terms are amplified.',
    expectedBehavior: 'At fixed points, arrows can rotate and strengthen/weakening more noticeably.',
    parameters: ['Evolution Pattern', 'Direction Variation', 'Magnitude Variation'],
    strategy: 'Use to expose planner sensitivity to fast-changing currents.',
    boundaryNote: 'High complexity is not random jitter per frame.'
  }
};

const VARIATION_EXPLAINERS = {
  off: {
    short: 'No extra demo variation for this component.',
    meaning: 'The dynamic modulation for this component is disabled.',
    expectedBehavior: 'Changes come from other enabled components only.',
    parameters: ['Base Flow Field'],
    strategy: 'Use to isolate other current-field effects.',
    boundaryNote: 'Off does not disable the base preset itself.'
  },
  low: {
    short: 'Subtle variation.',
    meaning: 'The component changes at low amplitude.',
    expectedBehavior: 'Small but visible shifts in arrows or strengths.',
    parameters: ['Flow Evolution Speed'],
    strategy: 'Good for readable introductory demos.',
    boundaryNote: 'Low variation remains deterministic.'
  },
  medium: {
    short: 'Moderate variation.',
    meaning: 'The component changes enough to affect visible behavior.',
    expectedBehavior: 'Direction or magnitude changes are easy to notice at fixed points.',
    parameters: ['Dynamic Complexity', 'Evolution Pattern'],
    strategy: 'Use for normal planning intuition.',
    boundaryNote: 'Medium variation is still synthetic.'
  },
  high: {
    short: 'Strong variation.',
    meaning: 'The component changes with higher amplitude.',
    expectedBehavior: 'Arrows can rotate or pulse more strongly as demo time advances.',
    parameters: ['Dynamic Complexity', 'Flow Evolution Speed'],
    strategy: 'Use to stress-test route timing and solver assumptions.',
    boundaryNote: 'High variation is not frame-random noise.'
  }
};

const SPATIAL_MOTION_EXPLAINERS = {
  none: {
    label: 'Off',
    short: 'Current structures stay spatially anchored.',
    meaning: 'The sampler does not apply a moving spatial offset.',
    expectedBehavior: 'Dynamic behavior can still change direction or magnitude at fixed locations.',
    parameters: ['Evolution Behavior', 'Direction Variation', 'Magnitude Variation'],
    strategy: 'Use to separate in-place time evolution from moving structures.',
    boundaryNote: 'Off does not stop passive particles.'
  },
  driftEast: motionExplainer('Drift East', 'eastward'),
  driftWest: motionExplainer('Drift West', 'westward'),
  driftNorth: motionExplainer('Drift North', 'northward'),
  driftSouth: motionExplainer('Drift South', 'southward'),
  circularDrift: {
    label: 'Circular Drift',
    short: 'Structures move around a looping offset path.',
    meaning: 'The sampled field position is shifted by circular time-varying offsets.',
    expectedBehavior: 'Eddies, jets, pulses, or texture orbit through the domain.',
    parameters: ['Spatial Motion Speed', 'Flow Evolution Speed'],
    strategy: 'Teaches planning around recurring moving structures.',
    boundaryNote: 'This moves the field structure, not the particles directly.'
  },
  meander: {
    label: 'Meander',
    short: 'Structures wander smoothly through the domain.',
    meaning: 'The sampled field position shifts through smooth sinusoidal offsets.',
    expectedBehavior: 'Features slide through nearby locations without teleporting.',
    parameters: ['Spatial Motion Speed', 'Flow Evolution Speed'],
    strategy: 'Teaches leading a current feature whose path is not straight.',
    boundaryNote: 'Meander is synthetic spatial motion.'
  }
};

const TOPOLOGY_EXPLAINERS = {
  blendedCoastal: topologyExplainer('Blended Coastal Map', 'mixed shoreline, channels, bays, islands, and open water'),
  coastIslands: topologyExplainer('Coast + Islands', 'a coastline with deterministic island obstacles'),
  coastalEstuary: topologyExplainer('Coastal Estuary', 'branching coastal water and island-like features'),
  channelIslands: topologyExplainer('Channel + Islands', 'a constrained passage with islands'),
  islands: topologyExplainer('Random Islands', 'seeded island obstacles in open water'),
  coastline: topologyExplainer('Coastline', 'an irregular land/water boundary along one side'),
  channel: topologyExplainer('Channel', 'a constrained water passage through land'),
  bayPocket: topologyExplainer('Bay / Pocket', 'a coastal pocket or bay opening into water'),
  islandChain: topologyExplainer('Island Chain', 'a deterministic chain of islands'),
  none: {
    label: 'No Land',
    short: 'Open-water baseline.',
    meaning: 'No terrain cells are treated as land.',
    expectedBehavior: 'Topology regions and shoreline risk mostly disappear, leaving the base/current behavior easier to isolate.',
    parameters: ['Base Flow Field'],
    strategy: 'Use as a control case before enabling shoreline effects.',
    boundaryNote: 'No Land removes topology constraints from this demo.'
  }
};

const BOUNDARY_EXPLAINERS = {
  none: {
    label: 'None',
    short: 'No extra topology boundary adjustment.',
    meaning: 'The sampled current is not damped or deflected near land by the demo boundary mode.',
    expectedBehavior: 'Arrows may point toward land without being altered by the boundary postprocess.',
    parameters: ['Land Mode'],
    strategy: 'Use as a baseline for comparing topology-aware adjustments.',
    boundaryNote: 'Terrain can still mark land cells.'
  },
  riskOnly: {
    label: 'Risk Only',
    short: 'Reports shoreline risk without changing the vector.',
    meaning: 'The sampler computes risk metadata near land but preserves the current vector.',
    expectedBehavior: 'Inspector risk changes near shoreline while arrows remain closer to raw current.',
    parameters: ['Land Mode', 'Shoreline Risk'],
    strategy: 'Use to separate route-risk reporting from flow modification.',
    boundaryNote: 'Risk Only does not make into-land currents safe.'
  },
  dampenIntoLand: {
    label: 'Dampen Into Land',
    short: 'Reduces unsafe current components pointing into land.',
    meaning: 'Near land, current pushing into land is damped.',
    expectedBehavior: 'Arrows near shore shorten or lose the into-land component.',
    parameters: ['Land Mode', 'Boundary Mode'],
    strategy: 'Teaches shoreline-risk behavior without preserving along-shore flow as strongly.',
    boundaryNote: 'This is a lightweight approximation, not CFD.'
  },
  deflectAlongShore: {
    label: 'Deflect Along Shore',
    short: 'Reduces into-land flow while preserving tangential along-shore motion.',
    meaning: 'Near land, unsafe current components pointing into land are reduced while along-shore motion is preserved.',
    expectedBehavior: 'Arrows near shore bend along the boundary instead of pointing directly through land.',
    parameters: ['Land Mode', 'Shoreline Risk', 'Tangential Component'],
    strategy: 'Creates shoreline-risk behavior and affects route cost near land.',
    boundaryNote: 'This is a lightweight topology-aware approximation, not a CFD shoreline model.'
  }
};

const DISPLAY_EXPLAINERS = {
  composedField: {
    label: 'Arrows, Particles, Magnitude, Inspector',
    short: 'The canvas combines vector arrows, passive particles, selected-cell highlighting, and magnitude scaling.',
    meaning: 'Arrows display sampled vector direction and scaled length; particles sample the same composed field; the right inspector reports the selected cell.',
    expectedBehavior: 'Changing the field changes both arrow vectors and particle drift. Magnitude Scale changes visible arrow length only.',
    parameters: ['Magnitude Scale', 'Particle Speed', 'Selected Cell'],
    strategy: 'Use arrows for local vector reading and particles for passive advection intuition.',
    boundaryNote: 'Particles are not mission gliders; they have no route planner, fuel model, or sampling objective.'
  }
};

const SPEED_EXPLAINERS = {
  playbackEvolution: {
    label: 'Playback vs Evolution Speed',
    short: 'Playback Speed advances demo time; Flow Evolution Speed changes how fast the current field evolves per unit demo time.',
    meaning: 'The demo keeps UI time, field sample time, particle advection, and arrow display scaling separate.',
    expectedBehavior: 'Raising Playback Speed makes the demo clock move faster. Raising Flow Evolution Speed changes field phase faster for the same demo time.',
    parameters: ['Playback Speed', 'Flow Evolution Speed', 'Particle Speed', 'Magnitude Scale'],
    strategy: 'Useful when missions need currents to evolve faster or slower than glider, hotspot, or UI playback timing.',
    boundaryNote: 'Particle Speed and Magnitude Scale are display controls; they do not change the underlying sampled current values.'
  }
};

const GROUP_OPTIONS = {
  basePreset: BASE_PRESET_EXPLAINERS,
  evolutionBehavior: EVOLUTION_EXPLAINERS,
  dynamicComplexity: COMPLEXITY_EXPLAINERS,
  directionVariation: VARIATION_EXPLAINERS,
  magnitudeVariation: VARIATION_EXPLAINERS,
  spatialMotion: SPATIAL_MOTION_EXPLAINERS,
  topologyMode: TOPOLOGY_EXPLAINERS,
  boundaryMode: BOUNDARY_EXPLAINERS,
  displayLayer: DISPLAY_EXPLAINERS,
  speedModel: SPEED_EXPLAINERS
};

export function flowFieldExplainerGroup(groupId) {
  return FLOW_FIELD_GROUP_SUMMARIES[groupId] ?? {
    label: 'Flow Behavior',
    question: 'What does this current-field component do?',
    summary: 'Explains the selected flow-field behavior.'
  };
}

export function flowFieldBehaviorExplainer(groupId, value) {
  const group = flowFieldExplainerGroup(groupId);
  const option = GROUP_OPTIONS[groupId]?.[value] ?? null;
  const presetConfig = groupId === 'basePreset' ? getVectorPresetConfig(value) : null;
  return {
    groupId,
    groupLabel: group.label,
    groupSummary: group.summary,
    question: group.question,
    value,
    label: option?.label ?? presetConfig?.label ?? String(value ?? 'Behavior'),
    short: option?.short ?? presetConfig?.description ?? group.summary,
    meaning: option?.meaning ?? group.summary,
    expectedBehavior: option?.expectedBehavior ?? 'The vector field updates according to the selected flow configuration.',
    parameters: option?.parameters ?? ['Demo Time', 'Field Position'],
    pairsWellWith: option?.pairsWellWith ?? [],
    strategy: option?.strategy ?? 'Use the visualization to understand how this component affects current-driven planning.',
    boundaryNote: option?.boundaryNote ?? 'Flow Fields Demo behavior is synthetic unless imported data is explicitly used and validated.'
  };
}

export function flowFieldCompositionExplainer(state = {}) {
  const preset = flowFieldBehaviorExplainer('basePreset', state.preset);
  const evolution = flowFieldBehaviorExplainer('evolutionBehavior', state.evolutionBehavior);
  const topology = flowFieldBehaviorExplainer('topologyMode', state.terrainMode);
  const boundary = flowFieldBehaviorExplainer('boundaryMode', state.boundaryMode);
  const layerCount = Array.isArray(state.additiveLayers)
    ? state.additiveLayers.filter((layer) => layer?.enabled !== false).length
    : 0;
  return {
    label: [
      preset.label,
      evolution.label,
      topology.label,
      boundary.label
    ].join(' + '),
    summary: `${preset.label} defines the base vector field; ${evolution.label} controls time behavior; ${topology.label} provides land/water context; ${boundary.label} controls near-land adjustment. ${layerCount} additive flow layer(s) are enabled.`,
    routeNote: 'The demo visualizes current behavior only. Mission gliders add commanded waypoint motion, route validation, sampling, fuel/energy, and scoring.'
  };
}

function motionExplainer(label, direction) {
  return {
    label,
    short: `Structures drift ${direction}.`,
    meaning: `The sampled field position is shifted ${direction} as time advances.`,
    expectedBehavior: 'Flow structures slide through the domain while particles separately advect through the sampled field.',
    parameters: ['Spatial Motion Speed', 'Flow Evolution Speed'],
    strategy: 'Teaches planning around moving current features.',
    boundaryNote: 'Spatial motion moves current structures; it is not particle speed.'
  };
}

function topologyExplainer(label, structure) {
  return {
    label,
    short: `Synthetic topology with ${structure}.`,
    meaning: `The terrain mask marks ${structure} so topology-aware current behavior can be inspected.`,
    expectedBehavior: 'Near-land metadata, shoreline risk, and boundary adjustments become visible in the inspector.',
    parameters: ['Terrain Seed', 'Boundary Mode', 'Base Flow Field'],
    strategy: 'Use it to compare open-water, shoreline, channel, bay, and obstacle-adjacent route implications.',
    boundaryNote: 'Land/topology modes are synthetic demo terrain.'
  };
}
