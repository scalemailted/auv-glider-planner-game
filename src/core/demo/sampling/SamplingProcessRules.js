import { ROI_INTERACTION_SCALES } from '../roi/RoiProcessContracts.js';

export const SAMPLING_PROCESS_RULE_CATALOG_VERSION = 'sampling-process-rule-families-v1';

export const SAMPLING_PROCESS_STATES = [
  'inactive',
  'active',
  'susceptible',
  'cooling',
  'recovering',
  'consumed',
  'inhibited',
  'refractory',
  'resting',
  'loaded',
  'spent',
  'stale',
  'trailing',
  'phaseA',
  'phaseB',
  'phaseC',
  'domainA',
  'domainB',
  'domainC',
  'empty',
  'prey',
  'predator',
  'patternA',
  'patternB',
  'moving',
  'congested',
  'released',
  'conductor',
  'signal',
  'sampled'
];

const BASIC = 'Basic';
const ADVANCED = 'Advanced';

export const PROCESS_RULE_ALIASES = {
  none: 'inert',
  noRule: 'inert',
  front: 'propagatingFront',
  frontPropagation: 'propagatingFront',
  propagatingFronts: 'propagatingFront',
  excitable: 'excitableWave',
  waveExcitableMedia: 'excitableWave',
  birthDeath: 'localBirthDeath',
  birthDeathEmergence: 'localBirthDeath',
  lifeLikeLocalRules: 'localBirthDeath',
  diffusion: 'diffusiveSpread',
  diffusionSpread: 'diffusiveSpread',
  diffusiveSpread: 'diffusiveSpread',
  drift: 'directedTransport',
  driftTransport: 'directedTransport',
  directedTransport: 'directedTransport',
  clusterFormation: 'domainFormation',
  domainFormation: 'domainFormation',
  avalanche: 'thresholdCascade',
  avalancheBurstCascades: 'thresholdCascade',
  cascade: 'thresholdCascade',
  predatorPreyMigration: 'interactingPopulation',
  interactingPopulation: 'interactingPopulation',
  congestionDensityWaves: 'congestionWave',
  patternFormationMorphogenesis: 'morphogenesis',
  signalPropagation: 'structuredSignal',
  structuredSignalPropagation: 'structuredSignal',
  signal: 'structuredSignal'
};

export const SAMPLING_PROCESS_RULES = [
  rule({
    id: 'inert',
    label: 'Inert / No Update',
    aliases: ['none', 'noRule'],
    description: 'No local process update; the cell remains fixed unless edited.',
    category: BASIC,
    allowedStates: ['inactive', 'active', 'susceptible', 'cooling', 'recovering', 'consumed', 'inhibited'],
    defaultInitialState: 'inactive',
    updateType: 'no-op',
    interactionScale: 'cell',
    compatibleReferenceSignatures: [],
    transitionLabels: ['noChange'],
    valueMapping: { inactive: 0, active: 0.85, susceptible: 0.35, cooling: 0.2, recovering: 0.3, consumed: 0.05, inhibited: 0.05 },
    failureSigns: ['All cells inert can produce no meaningful process.'],
    educationalNote: 'Use this to pin manually painted cells or leave background unchanged.'
  }),
  ruleFamily('propagatingFront', 'Propagating Front', ['frontPropagation', 'front'], BASIC, ['inactive', 'susceptible', 'active', 'cooling', 'consumed'], 'susceptible', 'front-propagation', 'edge', ['frontPropagation'], ['susceptibleToActive', 'activeToCooling', 'coolingToConsumed'], { threshold: 0.25, burnDuration: 1, cooldownDuration: 1 }),
  ruleFamily('excitableWave', 'Excitable Wave', ['excitable'], BASIC, ['inactive', 'resting', 'susceptible', 'active', 'refractory', 'recovering'], 'susceptible', 'excitable-wave', 'edge', ['waveExcitableMedia'], ['susceptibleToActive', 'activeToRefractory', 'refractoryToRecovering', 'recoveringToSusceptible'], { threshold: 1 }),
  ruleFamily('localBirthDeath', 'Local Birth-Death', ['birthDeath'], BASIC, ['inactive', 'active'], 'inactive', 'birth-death-neighbor-count', 'cell', ['birthDeathEmergence'], ['birth', 'survival', 'death'], { birthNeighbors: 3, surviveMin: 2, surviveMax: 3 }),
  ruleFamily('diffusiveSpread', 'Diffusive / Epidemic Spread', ['diffusionSpread', 'diffusion'], BASIC, ['inactive', 'susceptible', 'active', 'recovering'], 'susceptible', 'diffusive-spread', 'edge', ['diffusionSpread'], ['susceptibleToActive', 'activeToRecovering', 'recoveringToSusceptible'], { threshold: 0.45 }),
  ruleFamily('directedTransport', 'Directed Feature Transport', ['driftTransport', 'drift'], BASIC, ['inactive', 'active', 'trailing'], 'inactive', 'directed-feature-transport', 'hybrid', ['driftTransport'], ['transported', 'activeToTrailing', 'trailingToInactive'], { direction: 'east' }),
  ruleFamily('freshnessRecovery', 'Freshness / Recovery', ['freshness'], BASIC, ['inactive', 'sampled', 'cooling', 'recovering', 'stale'], 'stale', 'freshness-recovery', 'cell', ['freshnessRecovery'], ['sampledToCooling', 'coolingToRecovering', 'recoveringToStale'], { recoverySteps: 2 }),
  ruleFamily('cyclicDominance', 'Cyclic Dominance', [], ADVANCED, ['inactive', 'phaseA', 'phaseB', 'phaseC'], 'phaseA', 'cyclic-dominance', 'hybrid', ['cyclicDominance'], ['phaseAOvertaken', 'phaseBOvertaken', 'phaseCOvertaken'], { threshold: 1 }),
  ruleFamily('domainFormation', 'Domain / Cluster Formation', ['clusterFormation'], ADVANCED, ['inactive', 'domainA', 'domainB', 'domainC'], 'domainA', 'domain-alignment', 'cluster', ['clusterFormation'], ['domainAligned', 'domainStable'], { threshold: 2 }),
  ruleFamily('thresholdCascade', 'Threshold Cascade / Avalanche', ['cascade', 'avalanche'], ADVANCED, ['inactive', 'loaded', 'active', 'spent', 'recovering'], 'loaded', 'threshold-cascade', 'edge', ['avalancheBurstCascades'], ['loadedToActive', 'activeToSpent', 'spentToRecovering', 'recoveringToLoaded'], { threshold: 0.6 }),
  ruleFamily('interactingPopulation', 'Interacting Population Migration', ['predatorPreyMigration'], ADVANCED, ['empty', 'prey', 'predator', 'recovering'], 'empty', 'population-interaction', 'hybrid', ['predatorPreyMigration'], ['preySpread', 'predatorPursuit', 'predatorDecay', 'recoveringToEmpty'], { threshold: 1 }),
  ruleFamily('morphogenesis', 'Pattern Formation / Morphogenesis', [], ADVANCED, ['inactive', 'active', 'patternA', 'patternB', 'recovering'], 'inactive', 'pattern-formation', 'hybrid', ['patternFormationMorphogenesis'], ['patternActivated', 'patternMorph', 'patternRecover'], { threshold: 2 }),
  ruleFamily('congestionWave', 'Congestion / Density Wave', [], ADVANCED, ['empty', 'moving', 'congested', 'released'], 'empty', 'density-wave', 'edge', ['congestionDensityWaves'], ['moved', 'blockedToCongested', 'congestedToReleased', 'releasedToEmpty'], { direction: 'east' }),
  ruleFamily('structuredSignal', 'Structured Signal Propagation', ['signalPropagation', 'signal'], ADVANCED, ['empty', 'conductor', 'signal', 'refractory'], 'conductor', 'structured-signal', 'edge', ['structuredSignalPropagation'], ['conductorToSignal', 'signalToRefractory', 'refractoryToConductor'], { threshold: 1 })
];

export const SAMPLING_PROCESS_RULE_IDS = SAMPLING_PROCESS_RULES.map((entry) => entry.id);

export function normalizeProcessRuleId(value = 'inert') {
  const raw = String(value ?? 'inert');
  const normalized = PROCESS_RULE_ALIASES[raw] ?? raw;
  return SAMPLING_PROCESS_RULE_IDS.includes(normalized) ? normalized : 'inert';
}

export const normalizeSamplingProcessRuleId = normalizeProcessRuleId;

export function processRuleById(id) {
  const normalized = normalizeProcessRuleId(id);
  return SAMPLING_PROCESS_RULES.find((entry) => entry.id === normalized) ?? SAMPLING_PROCESS_RULES[0];
}

export const samplingProcessRuleById = processRuleById;

export function processRuleLabel(id) {
  return processRuleById(id).label;
}

export function processRuleOptions() {
  return SAMPLING_PROCESS_RULES.map((entry) => ({ ...entry }));
}

export function basicProcessRuleOptions() {
  return processRuleOptions().filter((entry) => entry.category === BASIC);
}

export function advancedProcessRuleOptions() {
  return processRuleOptions().filter((entry) => entry.category === ADVANCED);
}

export function processRuleAliases() {
  return { ...PROCESS_RULE_ALIASES };
}

export function isKnownProcessRule(id) {
  const raw = String(id ?? '');
  return SAMPLING_PROCESS_RULE_IDS.includes(raw) || Boolean(PROCESS_RULE_ALIASES[raw]);
}

export function normalizeSamplingProcessState(value = 'inactive', ruleId = null) {
  const stateAliases = {
    depleted: 'consumed',
    refractory: 'refractory',
    resting: 'resting'
  };
  const normalized = stateAliases[value] ?? value;
  const rule = ruleId ? processRuleById(ruleId) : null;
  if (rule?.allowedStates?.includes(normalized)) return normalized;
  if (rule) return rule.defaultInitialState ?? rule.allowedStates[0] ?? 'inactive';
  if (SAMPLING_PROCESS_STATES.includes(normalized)) return normalized;
  return 'inactive';
}

function ruleFamily(id, label, aliases, category, allowedStates, defaultInitialState, updateType, interactionScale, compatibleReferenceSignatures, transitionLabels, defaultParameters) {
  return rule({
    id,
    label,
    aliases,
    description: `${label} is a deterministic educational analog for a broad CA-style process family.`,
    category,
    allowedStates,
    defaultInitialState,
    updateType,
    interactionScale,
    compatibleReferenceSignatures,
    transitionLabels,
    defaultParameters,
    valueMapping: defaultValueMapping(allowedStates),
    failureSigns: ['No active/source support', 'No transitions over time', 'Saturated field'],
    educationalNote: 'This is a deterministic CA-inspired teaching model, not an exact domain simulator.'
  });
}

function rule(definition) {
  return {
    deterministic: true,
    stateVocabulary: definition.allowedStates.length > 2 ? 'multi-state' : 'binary',
    caTaxonomy: caTaxonomy({
      phenotypeClass: definition.updateType,
      ruleUniformity: 'non-uniform under Process Paint; uniform only as a special case'
    }),
    ...definition,
    compatibleSignatures: [...(definition.compatibleReferenceSignatures ?? [])],
    interactionScale: ROI_INTERACTION_SCALES.includes(definition.interactionScale) ? definition.interactionScale : 'hybrid'
  };
}

function defaultValueMapping(states) {
  const high = new Set(['active', 'signal', 'predator', 'prey', 'moving', 'congested', 'patternA', 'patternB', 'phaseA', 'phaseB', 'phaseC']);
  const low = new Set(['inactive', 'empty', 'consumed', 'spent', 'cooling', 'refractory', 'sampled']);
  return Object.fromEntries(states.map((state) => [state, high.has(state) ? 0.9 : low.has(state) ? 0.08 : 0.45]));
}

function caTaxonomy(overrides = {}) {
  return {
    updateSchedule: 'synchronous deterministic demo step',
    stochasticity: 'deterministic / seeded initialization only',
    stateSpace: 'multi-state',
    neighborhood: 'Moore or Von Neumann finite bounded grid',
    ruleUniformity: 'uniform by default; non-uniform under Process Paint or Rule Allocation Sandbox',
    memory: 'state plus simple phase/recovery progression',
    boundaryStyle: 'finite bounded grid',
    phenotypeClass: 'spatiotemporal sampling process',
    ...overrides
  };
}

