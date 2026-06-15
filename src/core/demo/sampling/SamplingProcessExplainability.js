import { normalizeProcessRuleId } from './SamplingProcessRules.js';

const ACTIVE_STATES = new Set(['active', 'signal', 'moving', 'infected', 'burning', 'predator', 'prey', 'patternA', 'patternB', 'phaseA', 'phaseB', 'phaseC']);
const INACTIVE_STATES = new Set(['inactive', 'empty', 'susceptible', 'resting', 'conductor', 'loaded']);

export function buildSamplingProcessMetricLayers({
  example = null,
  ruleId = null,
  stateLayer = null,
  previousStateLayer = null,
  sourceField = null,
  transitionLayer = null,
  samplingValueField = null,
  width = null,
  height = null
} = {}) {
  const w = Math.max(1, Math.round(Number(width ?? stateLayer?.[0]?.length ?? sourceField?.[0]?.length ?? 1)));
  const h = Math.max(1, Math.round(Number(height ?? stateLayer?.length ?? sourceField?.length ?? 1)));
  const state = normalizeStateLayer(stateLayer, w, h);
  const previous = normalizeStateLayer(previousStateLayer ?? stateLayer, w, h);
  const source = normalizeNumberLayer(sourceField, w, h);
  const sample = normalizeNumberLayer(samplingValueField ?? sourceField, w, h);
  const rule = normalizeMetricRuleId(ruleId ?? example?.ruleFamilyId ?? example?.referenceSignatureId);
  const neighborCount = computeNeighborCountLayer(previous, w, h);
  const birthSupport = computeBirthSupportLayer(previous, neighborCount, w, h);
  const survivalSupport = computeSurvivalSupportLayer(previous, neighborCount, w, h);
  const activePressure = computeActiveNeighborPressureLayer(previous, w, h);
  const transitionClass = computeTransitionClassLayer({ ruleId: rule, stateLayer: state, previousStateLayer: previous, transitionLayer, neighborCount, sourceField: source, width: w, height: h });
  const ruleSupport = computeRuleSupportLayer({ ruleId: rule, stateLayer: state, previousStateLayer: previous, sourceField: source, neighborCount, birthSupport, survivalSupport, activePressure, width: w, height: h });
  const extra = extraMetricLayersForRule({ ruleId: rule, stateLayer: state, previousStateLayer: previous, sourceField: source, neighborCount, activePressure, transitionClass, width: w, height: h });
  const defaultMetricId = defaultMetricForExample(example, rule);
  const legend = metricLegendForExample(example, rule, defaultMetricId);
  const captions = captionsForRule(example, rule);
  return {
    metricLayers: {
      state,
      neighborCount,
      birthSupport,
      survivalSupport,
      ruleSupport,
      transitionClass,
      sourceSupport: source,
      samplingValue: sample,
      ...extra
    },
    defaultMetricId,
    legend,
    captions,
    diagnostics: {
      ruleId: rule,
      activeCellCount: countCells(state, (value) => ACTIVE_STATES.has(value)),
      transitionCounts: countLayerValues(transitionClass),
      maxNeighborCount: maxLayer(neighborCount),
      maxRuleSupport: maxLayer(ruleSupport),
      oceanAnalogDisclaimer: example?.exampleType === 'oceanProcessAnalog'
        ? oceanAnalogDisclaimer(example)
        : null
    }
  };
}

export function computeNeighborCountLayer(stateLayer, width = null, height = null) {
  const w = Math.max(1, Math.round(Number(width ?? stateLayer?.[0]?.length ?? 1)));
  const h = Math.max(1, Math.round(Number(height ?? stateLayer?.length ?? 1)));
  const state = normalizeStateLayer(stateLayer, w, h);
  return Array.from({ length: h }, (_, row) => Array.from({ length: w }, (_, col) => activeNeighborCount(state, col, row, w, h)));
}

export function computeRuleSupportLayer({ ruleId = 'localBirthDeath', stateLayer, previousStateLayer = null, sourceField = null, neighborCount = null, birthSupport = null, survivalSupport = null, activePressure = null, width = null, height = null } = {}) {
  const w = Math.max(1, Math.round(Number(width ?? stateLayer?.[0]?.length ?? 1)));
  const h = Math.max(1, Math.round(Number(height ?? stateLayer?.length ?? 1)));
  const previous = normalizeStateLayer(previousStateLayer ?? stateLayer, w, h);
  const source = normalizeNumberLayer(sourceField, w, h);
  const neighbors = neighborCount ?? computeNeighborCountLayer(previous, w, h);
  const pressure = activePressure ?? computeActiveNeighborPressureLayer(previous, w, h);
  const births = birthSupport ?? computeBirthSupportLayer(previous, neighbors, w, h);
  const survives = survivalSupport ?? computeSurvivalSupportLayer(previous, neighbors, w, h);
  const rule = normalizeMetricRuleId(ruleId);
  return Array.from({ length: h }, (_, row) => Array.from({ length: w }, (_, col) => {
    const state = previous[row][col];
    const sourceValue = source[row][col];
    const n = Number(neighbors[row][col] ?? 0);
    if (rule === 'localBirthDeath') return state === 'active' ? survives[row][col] : births[row][col];
    if (rule === 'propagatingFront') return clamp01(pressure[row][col] * 0.72 + sourceValue * 0.42);
    if (rule === 'diffusiveSpread') return clamp01(pressure[row][col]);
    if (rule === 'excitableWave') return ['refractory', 'recovering'].includes(state) ? 0.35 : clamp01(pressure[row][col]);
    if (rule === 'thresholdCascade') return clamp01(sourceValue * 0.55 + pressure[row][col] * 0.55);
    if (rule === 'congestionWave') return congestionPressureAt(previous, col, row, w, h);
    if (rule === 'structuredSignal') return state === 'conductor' ? vonNeumannSignalPressure(previous, col, row, w, h) : state === 'signal' ? 1 : 0;
    if (rule === 'freshnessRecovery') return state === 'stale' ? 1 : state === 'recovering' ? 0.55 : state === 'cooling' ? 0.2 : sourceValue;
    if (rule === 'directedTransport') return state === 'active' || state === 'moving' ? 1 : pressure[row][col];
    if (rule === 'domainFormation') return Math.min(1, n / 4);
    if (rule === 'cyclicDominance') return Math.min(1, n / 4);
    if (rule === 'interactingPopulation') return Math.min(1, n / 4);
    if (rule === 'morphogenesis') return clamp01(sourceValue * 0.5 + n / 8);
    return clamp01(sourceValue || n / 8);
  }));
}

export function computeTransitionClassLayer({ ruleId = 'localBirthDeath', stateLayer, previousStateLayer = null, transitionLayer = null, neighborCount = null, sourceField = null, width = null, height = null } = {}) {
  const w = Math.max(1, Math.round(Number(width ?? stateLayer?.[0]?.length ?? 1)));
  const h = Math.max(1, Math.round(Number(height ?? stateLayer?.length ?? 1)));
  const state = normalizeStateLayer(stateLayer, w, h);
  const previous = normalizeStateLayer(previousStateLayer ?? stateLayer, w, h);
  const neighbors = neighborCount ?? computeNeighborCountLayer(previous, w, h);
  const source = normalizeNumberLayer(sourceField, w, h);
  const rule = normalizeMetricRuleId(ruleId);
  return Array.from({ length: h }, (_, row) => Array.from({ length: w }, (_, col) => {
    const explicit = transitionLayer?.[row]?.[col]?.transitionLabel ?? transitionLayer?.[row]?.[col]?.label;
    if (explicit && explicit !== 'initialState' && explicit !== 'noChange') return normalizeTransitionLabel(explicit, rule);
    const prev = previous[row][col];
    const current = state[row][col];
    const n = Number(neighbors[row][col] ?? 0);
    if (rule === 'localBirthDeath') {
      if (prev !== 'active' && n === 3) return 'birth';
      if (prev === 'active' && (n === 2 || n === 3)) return 'survive';
      if (prev === 'active') return 'death';
      return 'remainInactive';
    }
    if (rule === 'propagatingFront') {
      if (current === 'active' && prev !== 'active') return 'ignite';
      if (prev === 'active' && current !== 'active') return 'burnOut';
      if (['cooling', 'consumed'].includes(current)) return 'trail';
      return source[row][col] > 0.35 ? 'remainSusceptible' : 'remain';
    }
    if (rule === 'diffusiveSpread') {
      if (current === 'active' && prev !== 'active') return 'infected';
      if (prev === 'active' && current !== 'active') return 'recover';
      if (current === 'recovering') return 'recovering';
      return 'susceptible';
    }
    if (rule === 'excitableWave') {
      if (current === 'active') return 'wavefront';
      if (current === 'refractory') return 'refractory';
      if (current === 'recovering') return 'recovery';
      return 'resting';
    }
    if (rule === 'thresholdCascade') {
      if (current === 'active') return 'cascadeTrigger';
      if (current === 'spent') return 'spent';
      if (current === 'recovering') return 'recovering';
      return 'loaded';
    }
    if (rule === 'congestionWave') {
      if (current === 'congested') return 'blockedFront';
      if (current === 'released') return 'releaseWave';
      if (current === 'moving') return 'movingDensity';
      return 'empty';
    }
    if (rule === 'structuredSignal') {
      if (current === 'signal') return 'signalHead';
      if (current === 'refractory') return 'signalTail';
      if (current === 'conductor') return 'conductorPath';
      return 'empty';
    }
    return current === prev ? 'remain' : 'changed';
  }));
}

export function metricLegendForExample(example = null, ruleId = null, metricId = null) {
  const rule = normalizeMetricRuleId(ruleId ?? example?.ruleFamilyId ?? example?.referenceSignatureId);
  const base = legendForRule(rule, metricId ?? defaultMetricForExample(example, rule));
  if (example?.exampleType === 'oceanProcessAnalog') {
    return [
      ...base,
      { id: 'analogBoundary', label: 'Analog boundary note', color: '#86e7ff', description: oceanAnalogDisclaimer(example) }
    ];
  }
  return base;
}

export function defaultMetricForExample(example = null, ruleId = null) {
  const rule = normalizeMetricRuleId(ruleId ?? example?.ruleFamilyId ?? example?.referenceSignatureId);
  return {
    localBirthDeath: 'transitionClass',
    propagatingFront: 'ignitionPressure',
    diffusiveSpread: 'infectionPressure',
    excitableWave: 'transitionClass',
    thresholdCascade: 'thresholdProximity',
    congestionWave: 'congestionPressure',
    structuredSignal: 'transitionClass',
    directedTransport: 'transportSupport',
    freshnessRecovery: 'recoveryPhase',
    cyclicDominance: 'ruleSupport',
    domainFormation: 'ruleSupport',
    interactingPopulation: 'ruleSupport',
    morphogenesis: 'ruleSupport'
  }[rule] ?? 'ruleSupport';
}

export function metricLabel(metricId) {
  return {
    state: 'State View',
    neighborCount: 'Neighbor Count',
    birthSupport: 'Birth Support',
    survivalSupport: 'Survival Support',
    ruleSupport: 'Rule Support',
    transitionClass: 'Transition View',
    sourceSupport: 'Source / Initial Field',
    samplingValue: 'Sampling Interpretation',
    ignitionPressure: 'Ignition Pressure',
    infectionPressure: 'Infection Pressure',
    excitationPressure: 'Excitation Pressure',
    thresholdProximity: 'Threshold Proximity',
    congestionPressure: 'Congestion Pressure',
    signalSupport: 'Signal Activation Support',
    signalPath: 'Signal Path',
    transportSupport: 'Transport Support',
    recoveryPhase: 'Recovery Phase'
  }[metricId] ?? 'Rule Metric';
}

export function metricCaption(metricId, example = null) {
  const rule = normalizeMetricRuleId(example?.ruleFamilyId ?? example?.referenceSignatureId);
  const captions = captionsForRule(example, rule);
  return captions[metricId] ?? captions.ruleSupport ?? 'Rule metric layer for the selected deterministic process.';
}

export function metricDisplayBlock({ metricId, example = null, layers = null } = {}) {
  const id = metricId ?? defaultMetricForExample(example);
  return {
    metricId: id,
    metricLabel: metricLabel(id),
    metricCaption: metricCaption(id, example),
    legend: metricLegendForExample(example, example?.ruleFamilyId, id),
    diagnostics: layers?.diagnostics ?? null
  };
}

function extraMetricLayersForRule({ ruleId, stateLayer, previousStateLayer, sourceField, neighborCount, activePressure, transitionClass, width, height }) {
  const rule = normalizeMetricRuleId(ruleId);
  const source = normalizeNumberLayer(sourceField, width, height);
  const layers = {};
  if (rule === 'propagatingFront') {
    layers.ignitionPressure = mapLayer(activePressure, (value, col, row) => clamp01(value * 0.72 + source[row][col] * 0.42));
    layers.statePhase = mapStatePhase(stateLayer, { susceptible: 0.35, active: 1, cooling: 0.45, consumed: 0.08, inactive: 0.05 });
    layers.consumedTrail = mapStatePhase(stateLayer, { consumed: 1, cooling: 0.55 });
  }
  if (rule === 'diffusiveSpread') {
    layers.infectionPressure = activePressure;
    layers.localSpreadPressure = activePressure;
    layers.statePhase = mapStatePhase(stateLayer, { susceptible: 0.35, active: 1, recovering: 0.45, inactive: 0.05 });
  }
  if (rule === 'excitableWave') {
    layers.excitationPressure = activePressure;
    layers.refractoryPhase = mapStatePhase(stateLayer, { active: 1, refractory: 0.65, recovering: 0.35, susceptible: 0.2, resting: 0.18 });
    layers.wavefrontClass = transitionClass;
  }
  if (rule === 'thresholdCascade') {
    layers.load = source;
    layers.thresholdProximity = mapLayer(activePressure, (value, col, row) => clamp01(value * 0.55 + source[row][col] * 0.55));
    layers.cascadeTrigger = mapStatePhase(stateLayer, { active: 1, loaded: 0.55, spent: 0.15, recovering: 0.35 });
  }
  if (rule === 'congestionWave') {
    layers.occupancy = mapStatePhase(stateLayer, { moving: 1, congested: 0.85, released: 0.45, empty: 0.05 });
    layers.congestionPressure = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => congestionPressureAt(previousStateLayer, col, row, width, height)));
    layers.blockedFront = transitionClass;
    layers.releaseWave = mapStatePhase(stateLayer, { released: 1, congested: 0.65, moving: 0.4 });
  }
  if (rule === 'structuredSignal') {
    layers.signalSupport = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => vonNeumannSignalPressure(previousStateLayer, col, row, width, height)));
    layers.signalPath = mapStatePhase(stateLayer, { conductor: 0.45, signal: 1, refractory: 0.2, empty: 0.02 });
    layers.nextActivationSupport = layers.signalSupport;
  }
  if (rule === 'freshnessRecovery') {
    layers.recoveryPhase = mapStatePhase(stateLayer, { stale: 1, recovering: 0.65, cooling: 0.25, sampled: 0.08, inactive: 0.05 });
  }
  if (rule === 'directedTransport') {
    layers.transportSupport = mapStatePhase(stateLayer, { active: 1, moving: 1, trailing: 0.2, inactive: 0.05, empty: 0.05 });
  }
  return layers;
}

function computeBirthSupportLayer(previous, neighborCount, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => {
    if (previous[row][col] === 'active') return 0;
    return Number(neighborCount[row][col]) === 3 ? 1 : 0;
  }));
}

function computeSurvivalSupportLayer(previous, neighborCount, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => {
    if (previous[row][col] !== 'active') return 0;
    const n = Number(neighborCount[row][col]);
    if (n === 2 || n === 3) return 1;
    if (n === 1 || n === 4) return 0.5;
    return 0;
  }));
}

function computeActiveNeighborPressureLayer(previous, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => activeNeighborCount(previous, col, row, width, height) / 8));
}

function captionsForRule(example, ruleId) {
  const rule = normalizeMetricRuleId(ruleId);
  const oceanNote = example?.exampleType === 'oceanProcessAnalog' ? ` ${oceanAnalogDisclaimer(example)}` : '';
  const common = {
    state: 'Cells are colored by deterministic process state or phase.',
    sourceSupport: 'Source / Initial Field shows where the process has seeded support before rule updates.',
    samplingValue: 'Sampling Interpretation is derived from process state and support; it is not the default CA rule explanation.'
  };
  return {
    localBirthDeath: {
      ...common,
      neighborCount: 'Number of active Moore-neighborhood cells, from 0 to 8.',
      birthSupport: 'Inactive cells with exactly three active neighbors have birth support.',
      survivalSupport: 'Active cells with two or three active neighbors have survival support.',
      transitionClass: 'Birth, survive, death, or remain inactive under the local neighbor-count rule.',
      ruleSupport: 'Rule support combines birth support for inactive cells and survival support for active cells.'
    },
    propagatingFront: {
      ...common,
      ignitionPressure: `Active or burning neighbor pressure plus source support at the front boundary.${oceanNote}`,
      transitionClass: 'Ignite, burn out, trail, or remain under the propagating-front rule.',
      ruleSupport: 'Bright cells are under ignition pressure from active neighbors and source support.'
    },
    diffusiveSpread: {
      ...common,
      infectionPressure: `Active-neighbor pressure around susceptible cells.${oceanNote}`,
      transitionClass: 'Infected, recover, recovering, or susceptible under the spread rule.',
      ruleSupport: 'Bright cells are near infected or active neighbors.'
    },
    excitableWave: {
      ...common,
      excitationPressure: 'Active-neighbor pressure that can excite susceptible cells.',
      transitionClass: 'Wavefront, refractory, recovery, or resting phase.',
      ruleSupport: 'Bright cells are wave crest or cells near active wave neighbors.'
    },
    thresholdCascade: {
      ...common,
      thresholdProximity: 'Load and active-neighbor pressure combined as proximity to cascade threshold.',
      transitionClass: 'Cascade trigger, spent, recovering, or loaded phase.',
      ruleSupport: 'High values mean cells are close to threshold or actively cascading.'
    },
    congestionWave: {
      ...common,
      congestionPressure: 'Moving density and blocked downstream cells create jam pressure.',
      transitionClass: 'Moving density, blocked front, release wave, or empty cell.',
      ruleSupport: 'High values mean density or jam pressure.'
    },
    structuredSignal: {
      ...common,
      signalPath: 'Conductor, signal head, and refractory tail states along a structured path.',
      transitionClass: 'Signal head, signal tail, conductor path, or empty cell.',
      ruleSupport: 'Conductor cells near signal heads have next activation support.'
    }
  }[rule] ?? {
    ...common,
    ruleSupport: `Rule-support metric for ${example?.label ?? rule}.${oceanNote}`,
    transitionClass: 'Transition classes for the selected deterministic process rule.'
  };
}

function legendForRule(ruleId, metricId) {
  const rule = normalizeMetricRuleId(ruleId);
  if (rule === 'localBirthDeath') return [
    { id: 'inactive', label: 'inactive', color: '#10243b', description: 'No active cell at this location.' },
    { id: 'active', label: 'active', color: '#f7f7c6', description: 'Currently live / active cell.' },
    { id: 'birth', label: 'birth next', color: '#63e6be', description: 'Inactive cell with exactly three active neighbors.' },
    { id: 'survive', label: 'survives next', color: '#ffffff', description: 'Active cell with two or three active neighbors.' },
    { id: 'death', label: 'dies next', color: '#ff8a65', description: 'Active cell with too few or too many active neighbors.' },
    { id: 'neighborCount', label: 'neighbor count 0-8', color: '#86e7ff', description: 'Moore-neighborhood active count.' }
  ];
  if (rule === 'propagatingFront') return [
    { id: 'susceptible', label: 'susceptible', color: '#8fb8c8', description: 'Can ignite near active cells.' },
    { id: 'active', label: 'active / burning', color: '#ffffff', description: 'Current front or burning cell.' },
    { id: 'cooling', label: 'cooling', color: '#f4d35e', description: 'Recently active boundary.' },
    { id: 'consumed', label: 'consumed trail', color: '#7a4f42', description: 'Trail behind the front, not random low value.' },
    { id: 'ignitionPressure', label: 'ignition pressure', color: '#ff8a65', description: 'Burning-neighbor pressure plus source support.' }
  ];
  if (rule === 'diffusiveSpread') return [
    { id: 'susceptible', label: 'susceptible', color: '#8fb8c8', description: 'Can become infected/active.' },
    { id: 'active', label: 'infected / active', color: '#ffffff', description: 'Currently infected or active.' },
    { id: 'recovering', label: 'recovering', color: '#63e6be', description: 'Recent activity, not current high sampling value.' },
    { id: 'infectionPressure', label: 'infection pressure', color: '#ff8a65', description: 'Active-neighbor pressure.' }
  ];
  if (rule === 'thresholdCascade') return [
    { id: 'loaded', label: 'loaded', color: '#8fb8c8', description: 'Accumulating load.' },
    { id: 'active', label: 'active cascade', color: '#ffffff', description: 'Threshold crossed.' },
    { id: 'spent', label: 'spent', color: '#7a4f42', description: 'Discharged cell.' },
    { id: 'thresholdProximity', label: 'threshold proximity', color: '#f4d35e', description: 'Close to triggering.' }
  ];
  if (rule === 'structuredSignal') return [
    { id: 'conductor', label: 'conductor path', color: '#86e7ff', description: 'Path that can carry signal.' },
    { id: 'signal', label: 'signal head', color: '#ffffff', description: 'Active signal.' },
    { id: 'refractory', label: 'refractory / tail', color: '#f4d35e', description: 'Recently passed signal.' }
  ];
  if (rule === 'congestionWave') return [
    { id: 'empty', label: 'empty', color: '#10243b', description: 'No density.' },
    { id: 'moving', label: 'moving density', color: '#86e7ff', description: 'Moving cell.' },
    { id: 'congested', label: 'blocked front', color: '#ff8a65', description: 'Jammed density.' },
    { id: 'released', label: 'release wave', color: '#63e6be', description: 'Post-congestion release.' }
  ];
  return [
    { id: 'background', label: 'background', color: '#10243b', description: 'Low process support.' },
    { id: 'active', label: 'active', color: '#ffffff', description: 'Current active state.' },
    { id: 'support', label: metricLabel(metricId ?? 'ruleSupport'), color: '#63e6be', description: 'Rule support for the selected process.' }
  ];
}

function normalizeTransitionLabel(label, rule) {
  const value = String(label ?? 'remain');
  const aliases = {
    survival: 'survive',
    susceptibleToActive: rule === 'diffusiveSpread' ? 'infected' : 'ignite',
    activeToCooling: 'burnOut',
    coolingToConsumed: 'trail',
    activeToRecovering: 'recover',
    refractoryToRecovering: 'recovery',
    activeToRefractory: 'refractory',
    loadedToActive: 'cascadeTrigger',
    activeToSpent: 'spent',
    blockedToCongested: 'blockedFront',
    congestedToReleased: 'releaseWave',
    conductorToSignal: 'signalHead',
    signalToRefractory: 'signalTail'
  };
  return aliases[value] ?? value;
}

function normalizeMetricRuleId(value) {
  const aliases = {
    frontPropagation: 'propagatingFront',
    waveExcitableMedia: 'excitableWave',
    birthDeathEmergence: 'localBirthDeath',
    lifeLikeLocalRules: 'localBirthDeath',
    diffusionSpread: 'diffusiveSpread',
    driftTransport: 'directedTransport',
    avalancheBurstCascades: 'thresholdCascade',
    predatorPreyMigration: 'interactingPopulation',
    freshnessRecovery: 'freshnessRecovery',
    congestionDensityWaves: 'congestionWave',
    structuredSignalPropagation: 'structuredSignal',
    patternFormationMorphogenesis: 'morphogenesis',
    clusterFormation: 'domainFormation'
  };
  return normalizeProcessRuleId(aliases[value] ?? value ?? 'inert');
}

function oceanAnalogDisclaimer(example = {}) {
  if (example.requiresFlowCoupling) return 'This is an event/process-layer analog; physical downstream transport belongs in Flow Fields and Coupled Dynamic Sampling Space demos.';
  return example.notA ?? 'This is a simplified process-rule analog, not a calibrated ocean model.';
}

function activeNeighborCount(layer, col, row, width, height) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const value = layer[row + dy]?.[col + dx];
      if (ACTIVE_STATES.has(value)) count += 1;
    }
  }
  return count;
}

function vonNeumannSignalPressure(layer, col, row, width, height) {
  let count = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (layer[row + dy]?.[col + dx] === 'signal') count += 1;
  }
  return count / 4;
}

function congestionPressureAt(layer, col, row, width, height) {
  const state = layer[row]?.[col];
  const east = layer[row]?.[col + 1];
  if (state === 'congested') return 1;
  if (state === 'moving' && east && east !== 'empty') return 0.9;
  if (state === 'moving') return 0.45;
  if (east === 'congested') return 0.55;
  return 0;
}

function normalizeStateLayer(layer, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => String(layer?.[row]?.[col] ?? 'inactive')));
}

function normalizeNumberLayer(layer, width, height) {
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => clamp01(layer?.[row]?.[col] ?? 0)));
}

function mapLayer(layer, fn) {
  return layer.map((row, y) => row.map((value, x) => clamp01(fn(value, x, y))));
}

function mapStatePhase(stateLayer, mapping = {}) {
  return stateLayer.map((row) => row.map((state) => clamp01(mapping[state] ?? 0)));
}

function countLayerValues(layer) {
  const counts = {};
  for (const row of layer ?? []) {
    for (const value of row ?? []) counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function countCells(layer, predicate) {
  let count = 0;
  for (const row of layer ?? []) {
    for (const value of row ?? []) if (predicate(value)) count += 1;
  }
  return count;
}

function maxLayer(layer) {
  let max = 0;
  for (const row of layer ?? []) {
    for (const value of row ?? []) max = Math.max(max, Number(value) || 0);
  }
  return max;
}

function clamp01(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}
