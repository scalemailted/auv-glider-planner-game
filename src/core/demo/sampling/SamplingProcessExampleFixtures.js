import { normalizeProcessRuleId, processRuleById } from './SamplingProcessRules.js';

export const SAMPLING_PROCESS_EXAMPLE_FIXTURE_VERSION = 'sampling-process-example-fixtures-v1';

const DEFAULT_WIDTH = 24;
const DEFAULT_HEIGHT = 16;
const MEANINGFUL_STATES = new Set([
  'active',
  'susceptible',
  'cooling',
  'recovering',
  'consumed',
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
]);

export function buildExampleInitialLayers(exampleOrId, options = {}) {
  const example = typeof exampleOrId === 'string' ? { id: exampleOrId } : exampleOrId ?? {};
  const fixtureId = options.fixtureId ?? example.fixtureId ?? example.id ?? 'conwayGameOfLife';
  const builder = fixtureBuilderForId(fixtureId);
  const width = clampGridSize(options.width, DEFAULT_WIDTH);
  const height = clampGridSize(options.height, DEFAULT_HEIGHT);
  const fixture = builder({ width, height, example });
  const validation = validateSamplingProcessExampleFixture(fixture, { example });
  return {
    fixture,
    validation,
    layers: cloneFixtureLayers(fixture.layers)
  };
}

export function exampleFixtureSummary(exampleOrId, options = {}) {
  const built = buildExampleInitialLayers(exampleOrId, options);
  return {
    id: built.fixture.id,
    label: built.fixture.label,
    exampleId: built.fixture.exampleId,
    ruleId: built.fixture.ruleId,
    generationCountForPreview: built.fixture.generationCountForPreview,
    expectedBehaviorAssertions: [...(built.fixture.expectedBehaviorAssertions ?? [])],
    validation: built.validation
  };
}

export function validateSamplingProcessExampleFixture(fixture = {}, { example = null } = {}) {
  const layers = fixture.layers ?? {};
  const stateLayer = layers.stateLayer ?? [];
  const ruleLayer = layers.ruleLayer ?? [];
  const sourceField = layers.sourceField ?? [];
  const width = layers.width ?? stateLayer[0]?.length ?? 0;
  const height = layers.height ?? stateLayer.length ?? 0;
  const stateCounts = countValues(stateLayer);
  const ruleCounts = countValues(ruleLayer);
  const distinctStatesSeen = Object.keys(stateCounts).filter((state) => state !== 'inactive' && state !== 'empty');
  const meaningfulCellCount = stateLayer.flat().filter((state) => MEANINGFUL_STATES.has(state)).length;
  const activeSourceCellCount = sourceField.flat().filter((value) => Number(value) > 0.01).length;
  const unknownRules = Object.keys(ruleCounts).filter((ruleId) => ruleId !== 'null' && ruleId !== '' && normalizeProcessRuleId(ruleId) === 'inert' && ruleId !== 'inert');
  const details = [];
  if (!width || !height) details.push('Fixture has no grid dimensions.');
  if (!meaningfulCellCount && !activeSourceCellCount) details.push('Fixture has no meaningful process cells or source support.');
  if (!fixture.ruleId || normalizeProcessRuleId(fixture.ruleId) === 'inert') details.push('Fixture does not declare a known non-inert rule.');
  if (unknownRules.length) details.push(`Unknown rule ids in fixture: ${unknownRules.join(', ')}`);
  if (example?.id && fixture.exampleId && example.id !== fixture.exampleId && !fixture.aliases?.includes?.(example.id)) details.push(`Fixture ${fixture.id} is mapped to ${fixture.exampleId}, not ${example.id}.`);
  const status = details.length ? 'FAIL' : meaningfulCellCount < 3 ? 'WARN' : 'PASS';
  return {
    status,
    label: status === 'PASS' ? 'Fixture is explicit and non-empty' : status === 'WARN' ? 'Fixture is small but usable' : 'Fixture validation failed',
    details,
    metrics: {
      fixtureVersion: SAMPLING_PROCESS_EXAMPLE_FIXTURE_VERSION,
      fixtureId: fixture.id ?? null,
      fixtureLabel: fixture.label ?? null,
      exampleId: fixture.exampleId ?? example?.id ?? null,
      ruleId: fixture.ruleId ?? null,
      width,
      height,
      meaningfulCellCount,
      activeSourceCellCount,
      distinctStatesSeen,
      stateCounts,
      ruleCounts
    }
  };
}

export function foundationalCaFixtureById(id, options = {}) {
  return fixtureBuilderForId(id)({ ...options, example: { id } });
}

export function oceanAnalogFixtureById(id, options = {}) {
  return fixtureBuilderForId(id)({ ...options, example: { id } });
}

export function fixtureBuilderForId(id = 'conwayGameOfLife') {
  const key = String(id ?? 'conwayGameOfLife');
  return FIXTURE_BUILDERS[key] ?? FIXTURE_BUILDERS[ALIASES[key]] ?? FIXTURE_BUILDERS.conwayGameOfLife;
}

function conwayMixedFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'inactive', ruleId: 'localBirthDeath', defaultSource: 0 });
  const block = setBlock(base, 3, 3);
  const blinker = setBlinker(base, 10, 4);
  const glider = setGlider(base, 16, 3);
  return finishFixture({
    id: 'conwayGameOfLife.default',
    label: "Conway canonical mix: block, blinker, glider",
    exampleId: 'conwayGameOfLife',
    example,
    ruleId: 'localBirthDeath',
    layers: base,
    generationCountForPreview: 4,
    expectedBehaviorAssertions: ['fixtureNonEmpty', 'conwayB3S23', 'conwayBlockStable', 'conwayBlinkerPeriod2'],
    canonical: { block, blinker, glider },
    notes: ['Includes still-life, oscillator, and moving-structure seeds.']
  });
}

function conwayBlockFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'inactive', ruleId: 'localBirthDeath', defaultSource: 0 });
  const block = setBlock(base, centerX(width) - 1, centerY(height) - 1);
  return finishFixture({
    id: 'conwayGameOfLife:block',
    label: 'Conway block still life',
    exampleId: 'conwayGameOfLife',
    example,
    ruleId: 'localBirthDeath',
    layers: base,
    generationCountForPreview: 2,
    expectedBehaviorAssertions: ['fixtureNonEmpty', 'conwayBlockStable'],
    canonical: { block }
  });
}

function conwayBlinkerFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'inactive', ruleId: 'localBirthDeath', defaultSource: 0 });
  const blinker = setBlinker(base, centerX(width), centerY(height));
  return finishFixture({
    id: 'conwayGameOfLife:blinker',
    label: 'Conway blinker period-2 oscillator',
    exampleId: 'conwayGameOfLife',
    example,
    ruleId: 'localBirthDeath',
    layers: base,
    generationCountForPreview: 2,
    expectedBehaviorAssertions: ['fixtureNonEmpty', 'conwayB3S23', 'conwayBlinkerPeriod2'],
    canonical: { blinker }
  });
}

function conwayGliderFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'inactive', ruleId: 'localBirthDeath', defaultSource: 0 });
  const x = Math.max(1, Math.min(width - 5, centerX(width) - 2));
  const y = Math.max(1, Math.min(height - 5, centerY(height) - 2));
  const glider = setGlider(base, x, y);
  return finishFixture({
    id: 'conwayGameOfLife:glider',
    label: 'Conway glider translated after four generations',
    exampleId: 'conwayGameOfLife',
    example,
    ruleId: 'localBirthDeath',
    layers: base,
    generationCountForPreview: 4,
    expectedBehaviorAssertions: ['fixtureNonEmpty', 'conwayB3S23', 'conwayGliderMoves'],
    canonical: { glider }
  });
}

function forestFireFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'susceptible', ruleId: 'propagatingFront', defaultSource: 0.06 });
  const y0 = centerY(height) - 3;
  for (let y = y0; y <= y0 + 5; y += 1) {
    setCell(base, 4, y, 'active', 0.95);
    setCell(base, 3, y, 'cooling', 0.35);
    setCell(base, 2, y, 'consumed', 0.12);
    for (let x = 4; x <= 8; x += 1) addSource(base, x, y, 0.45);
  }
  return finishFixture({ id: 'forestFire', label: 'Forest Fire front with consumed trail', exampleId: 'forestFire', example, ruleId: 'propagatingFront', layers: base, generationCountForPreview: 4, expectedBehaviorAssertions: ['fixtureNonEmpty', 'frontPropagation'] });
}

function sirEpidemicFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'susceptible', ruleId: 'diffusiveSpread', defaultSource: 0.08 });
  const cx = centerX(width);
  const cy = centerY(height);
  setPatch(base, cx - 1, cy - 1, 3, 3, 'active', 0.7);
  setRingSource(base, cx, cy, 5, 0.42);
  setCell(base, cx - 3, cy, 'recovering', 0.2);
  setCell(base, cx - 2, cy + 1, 'recovering', 0.2);
  return finishFixture({ id: 'sirEpidemicCa', label: 'SIR active patch with recovery edge', exampleId: 'sirEpidemicCa', example, ruleId: 'diffusiveSpread', layers: base, generationCountForPreview: 4, expectedBehaviorAssertions: ['fixtureNonEmpty', 'spreadRecovery'] });
}

function excitableMediaFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'resting', ruleId: 'excitableWave', defaultSource: 0.05 });
  const y0 = centerY(height) - 3;
  const x = centerX(width) - 2;
  for (let y = y0; y <= y0 + 6; y += 1) {
    setCell(base, x, y, 'active', 0.9);
    setCell(base, x - 1, y, 'refractory', 0.15);
    setCell(base, x - 2, y, 'recovering', 0.1);
  }
  return finishFixture({ id: 'greenbergHastingsExcitableMedia', label: 'Excitable wave crest and refractory tail', exampleId: 'greenbergHastingsExcitableMedia', example, ruleId: 'excitableWave', layers: base, generationCountForPreview: 5, expectedBehaviorAssertions: ['fixtureNonEmpty', 'waveRecovery'] });
}

function sandpileFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'loaded', ruleId: 'thresholdCascade', defaultSource: 0.12 });
  const cx = centerX(width);
  const cy = centerY(height);
  setCell(base, cx, cy, 'active', 1);
  setCell(base, cx - 1, cy, 'active', 0.9);
  setCell(base, cx + 1, cy, 'loaded', 0.95);
  setCell(base, cx, cy - 1, 'loaded', 0.95);
  setCell(base, cx, cy + 1, 'spent', 0.2);
  setRingSource(base, cx, cy, 4, 0.85);
  return finishFixture({ id: 'sandpileAvalanche', label: 'Sandpile threshold cascade seed', exampleId: 'sandpileAvalanche', example, ruleId: 'thresholdCascade', layers: base, generationCountForPreview: 5, expectedBehaviorAssertions: ['fixtureNonEmpty', 'thresholdCascade'] });
}

function watorFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'empty', ruleId: 'interactingPopulation', defaultSource: 0.18 });
  const cx = centerX(width);
  const cy = centerY(height);
  setPatch(base, cx - 4, cy - 2, 4, 4, 'prey', 0.65);
  setPatch(base, cx - 1, cy - 1, 3, 3, 'predator', 0.75);
  setCell(base, cx + 3, cy, 'recovering', 0.25);
  return finishFixture({ id: 'watorPredatorPrey', label: 'Wa-Tor prey patch with predator edge', exampleId: 'watorPredatorPrey', example, ruleId: 'interactingPopulation', layers: base, generationCountForPreview: 5, expectedBehaviorAssertions: ['fixtureNonEmpty', 'populationInteraction'] });
}

function trafficFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'empty', ruleId: 'congestionWave', defaultSource: 0.08 });
  const y = centerY(height);
  for (let x = 2; x < width - 2; x += 1) setCell(base, x, y, 'empty', 0.15);
  setCell(base, 4, y, 'moving', 0.85);
  setCell(base, 6, y, 'moving', 0.85);
  setCell(base, 7, y, 'moving', 0.85);
  setCell(base, 8, y, 'congested', 0.6);
  setCell(base, 9, y, 'released', 0.35);
  return finishFixture({ id: 'trafficCa', label: 'Traffic density wave with jam and gap', exampleId: 'trafficCa', example, ruleId: 'congestionWave', layers: base, generationCountForPreview: 4, expectedBehaviorAssertions: ['fixtureNonEmpty', 'congestionRelease'] });
}

function wireworldFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'empty', ruleId: 'structuredSignal', defaultSource: 0.05 });
  const y = centerY(height);
  for (let x = 4; x <= Math.min(width - 4, 17); x += 1) setCell(base, x, y, 'conductor', 0.35);
  setCell(base, 5, y, 'signal', 0.95);
  setCell(base, 4, y, 'refractory', 0.1);
  for (let y2 = y - 2; y2 <= y + 2; y2 += 1) setCell(base, 14, y2, 'conductor', 0.35);
  return finishFixture({ id: 'wireworld', label: 'Wireworld conductor path with signal head', exampleId: 'wireworld', example, ruleId: 'structuredSignal', layers: base, generationCountForPreview: 5, expectedBehaviorAssertions: ['fixtureNonEmpty', 'signalPropagation'] });
}

function bloomFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'inactive', ruleId: 'morphogenesis', defaultSource: 0.05 });
  const cx = centerX(width) - 2;
  const cy = centerY(height);
  setPatch(base, cx - 2, cy - 2, 4, 4, 'active', 0.85);
  setPatch(base, cx + 1, cy - 1, 3, 3, 'patternA', 0.65);
  setCell(base, cx + 3, cy + 2, 'recovering', 0.25);
  setRingSource(base, cx, cy, 6, 0.78);
  return oceanFixture({ id: 'bloomGrowthDecay', label: 'Bloom growth / decay patch', example, ruleId: 'morphogenesis', layers: base, generationCountForPreview: 5, assertions: ['fixtureNonEmpty', 'morphogenesisPattern'] });
}

function riverPlumeFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'susceptible', ruleId: 'propagatingFront', defaultSource: 0.08 });
  const mouthY = centerY(height);
  for (let y = mouthY - 3; y <= mouthY + 3; y += 1) {
    setCell(base, 2, y, 'active', 1);
    setCell(base, 3, y, 'active', 0.9);
    setCell(base, 4, y, 'cooling', 0.45);
    for (let x = 1; x <= 9; x += 1) addSource(base, x, y, Math.max(0.2, 1 - x * 0.07));
  }
  return oceanFixture({ id: 'riverPlumeFront', label: 'River plume event front', example, ruleId: 'propagatingFront', layers: base, generationCountForPreview: 4, assertions: ['fixtureNonEmpty', 'frontPropagation', 'flowCouplingNote'] });
}

function oilPlumeFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'susceptible', ruleId: 'diffusiveSpread', defaultSource: 0.05 });
  const cx = centerX(width) - 5;
  const cy = centerY(height);
  setPatch(base, cx, cy - 2, 4, 5, 'active', 0.88);
  setPatch(base, cx + 3, cy - 1, 4, 3, 'recovering', 0.35);
  setRingSource(base, cx + 1, cy, 6, 0.7);
  return oceanFixture({ id: 'oilChemicalPlume', label: 'Oil / chemical plume spread', example, ruleId: 'diffusiveSpread', layers: base, generationCountForPreview: 5, assertions: ['fixtureNonEmpty', 'spreadRecovery', 'flowCouplingNote'] });
}

function thermoclineFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'domainA', ruleId: 'domainFormation', defaultSource: 0.2 });
  const boundary = centerY(height);
  for (let y = boundary; y < height; y += 1) for (let x = 0; x < width; x += 1) setCell(base, x, y, 'domainB', 0.45 + y / height * 0.35);
  for (let x = 2; x < width - 2; x += 3) setCell(base, x, boundary - 1, 'domainB', 0.7);
  for (let x = 3; x < width - 3; x += 4) setCell(base, x, boundary, 'domainA', 0.45);
  return oceanFixture({ id: 'thermoclineWaterMassBoundary', label: 'Thermocline / water-mass boundary', example, ruleId: 'domainFormation', layers: base, generationCountForPreview: 3, assertions: ['fixtureNonEmpty', 'domainBoundary', 'flowCouplingNote'] });
}

function eddyPatchFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'susceptible', ruleId: 'diffusiveSpread', defaultSource: 0.04 });
  const cx = centerX(width);
  const cy = centerY(height);
  setRingSource(base, cx, cy, 5, 0.72);
  for (let angle = 0; angle < 360; angle += 45) {
    const rad = angle * Math.PI / 180;
    setCell(base, Math.round(cx + Math.cos(rad) * 3), Math.round(cy + Math.sin(rad) * 2), 'active', 0.85);
  }
  setPatch(base, cx - 1, cy - 1, 3, 3, 'recovering', 0.35);
  return oceanFixture({ id: 'eddyTrappedPatch', label: 'Eddy-trapped recurrent patch analog', example, ruleId: 'diffusiveSpread', layers: base, generationCountForPreview: 5, assertions: ['fixtureNonEmpty', 'spreadRecovery', 'flowCouplingNote'] });
}

function shorelineRunoffFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'loaded', ruleId: 'thresholdCascade', defaultSource: 0.08 });
  const y = centerY(height);
  for (let x = 1; x <= 6; x += 1) {
    setCell(base, x, y, 'active', 0.95);
    setCell(base, x, y - 1, 'loaded', 0.88);
    setCell(base, x, y + 1, 'spent', 0.2);
  }
  setRingSource(base, 3, y, 5, 0.9);
  return oceanFixture({ id: 'shorelineRunoffPulse', label: 'Shoreline runoff threshold pulse', example, ruleId: 'thresholdCascade', layers: base, generationCountForPreview: 5, assertions: ['fixtureNonEmpty', 'thresholdCascade', 'flowCouplingNote'] });
}

function hydrothermalFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'susceptible', ruleId: 'diffusiveSpread', defaultSource: 0.04 });
  const cx = centerX(width);
  const cy = centerY(height) + 3;
  setPatch(base, cx - 1, cy - 1, 3, 3, 'active', 0.95);
  for (let y = cy - 6; y <= cy; y += 1) {
    setCell(base, cx, y, 'active', 0.8);
    addSource(base, cx, y, 0.75);
    addSource(base, cx - 1, y, 0.55);
    addSource(base, cx + 1, y, 0.55);
  }
  setCell(base, cx + 2, cy - 2, 'recovering', 0.25);
  return oceanFixture({ id: 'hydrothermalDeepSourcePlume', label: 'Hydrothermal deep source plume analog', example, ruleId: 'diffusiveSpread', layers: base, generationCountForPreview: 5, assertions: ['fixtureNonEmpty', 'spreadRecovery', 'flowCouplingNote'] });
}

function turbidityFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'loaded', ruleId: 'thresholdCascade', defaultSource: 0.12 });
  const cx = centerX(width) - 3;
  const cy = centerY(height);
  setPatch(base, cx - 2, cy - 1, 5, 3, 'active', 0.95);
  setPatch(base, cx + 2, cy - 2, 4, 5, 'spent', 0.25);
  setRingSource(base, cx, cy, 7, 0.82);
  return oceanFixture({ id: 'turbidityEvent', label: 'Turbidity threshold cascade event', example, ruleId: 'thresholdCascade', layers: base, generationCountForPreview: 5, assertions: ['fixtureNonEmpty', 'thresholdCascade', 'flowCouplingNote'] });
}

function hypoxiaFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'stale', ruleId: 'freshnessRecovery', defaultSource: 0.55 });
  const cx = centerX(width);
  const cy = centerY(height);
  setPatch(base, cx - 3, cy - 2, 3, 4, 'sampled', 0.1);
  setPatch(base, cx, cy - 2, 3, 4, 'cooling', 0.12);
  setPatch(base, cx + 3, cy - 2, 3, 4, 'recovering', 0.4);
  return oceanFixture({ id: 'hypoxiaRecoveryZone', label: 'Hypoxia recovery freshness zones', example, ruleId: 'freshnessRecovery', layers: base, generationCountForPreview: 4, assertions: ['fixtureNonEmpty', 'freshnessCycle'] });
}

function freshnessMonitoringFixture({ width, height, example }) {
  const base = baseFixture({ width, height, defaultState: 'stale', ruleId: 'freshnessRecovery', defaultSource: 0.65 });
  setPatch(base, 3, 3, 4, 3, 'sampled', 0.05);
  setPatch(base, 9, 4, 4, 3, 'cooling', 0.08);
  setPatch(base, 15, 7, 4, 3, 'recovering', 0.38);
  return oceanFixture({ id: 'persistentMonitoringFreshnessField', label: 'Persistent monitoring freshness field', example, ruleId: 'freshnessRecovery', layers: base, generationCountForPreview: 4, assertions: ['fixtureNonEmpty', 'freshnessCycle'] });
}

function oceanFixture({ id, label, example, ruleId, layers, generationCountForPreview, assertions }) {
  return finishFixture({
    id,
    label,
    exampleId: id,
    example,
    ruleId,
    layers,
    generationCountForPreview,
    expectedBehaviorAssertions: assertions,
    coupledDemoBridgeNote: example?.coupledDemoBridgeNote ?? null,
    requiresFlowCoupling: Boolean(example?.requiresFlowCoupling)
  });
}

function baseFixture({ width, height, defaultState, ruleId, defaultSource = 0, groupId = 1 }) {
  const rule = normalizeProcessRuleId(ruleId);
  const w = clampGridSize(width, DEFAULT_WIDTH);
  const h = clampGridSize(height, DEFAULT_HEIGHT);
  return {
    width: w,
    height: h,
    stateLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => defaultState)),
    ruleLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => rule)),
    groupLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => groupId)),
    sourceField: Array.from({ length: h }, () => Array.from({ length: w }, () => clamp01(defaultSource))),
    parameterLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => ({})))
  };
}

function finishFixture(fixture) {
  return {
    fixtureVersion: SAMPLING_PROCESS_EXAMPLE_FIXTURE_VERSION,
    deterministic: true,
    ...fixture,
    ruleLabel: processRuleById(fixture.ruleId).label,
    layers: cloneFixtureLayers(fixture.layers)
  };
}

function setBlock(layers, x, y) {
  const cells = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
  for (const [cx, cy] of cells) setCell(layers, cx, cy, 'active', 0.8);
  return { cells: cells.map(([cx, cy]) => ({ x: cx, y: cy })) };
}

function setBlinker(layers, x, y) {
  const vertical = [[x, y - 1], [x, y], [x, y + 1]];
  const horizontal = [[x - 1, y], [x, y], [x + 1, y]];
  for (const [cx, cy] of vertical) setCell(layers, cx, cy, 'active', 0.8);
  return {
    vertical: vertical.map(([cx, cy]) => ({ x: cx, y: cy })),
    horizontal: horizontal.map(([cx, cy]) => ({ x: cx, y: cy }))
  };
}

function setGlider(layers, x, y) {
  const cells = [[x + 1, y], [x + 2, y + 1], [x, y + 2], [x + 1, y + 2], [x + 2, y + 2]];
  const shiftedAfterFour = cells.map(([cx, cy]) => ({ x: cx + 1, y: cy + 1 }));
  for (const [cx, cy] of cells) setCell(layers, cx, cy, 'active', 0.8);
  return { cells: cells.map(([cx, cy]) => ({ x: cx, y: cy })), shiftedAfterFour };
}

function setPatch(layers, x, y, width, height, state, source = null) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) setCell(layers, col, row, state, source);
  }
}

function setRingSource(layers, cx, cy, radius, value) {
  for (let row = cy - radius; row <= cy + radius; row += 1) {
    for (let col = cx - radius; col <= cx + radius; col += 1) {
      const distance = Math.hypot(col - cx, row - cy);
      if (distance <= radius) addSource(layers, col, row, value * Math.max(0.2, 1 - distance / Math.max(1, radius + 1)));
    }
  }
}

function setCell(layers, x, y, state, source = null) {
  const col = Math.round(Number(x));
  const row = Math.round(Number(y));
  if (row < 0 || col < 0 || row >= layers.height || col >= layers.width) return;
  layers.stateLayer[row][col] = state;
  if (source != null) layers.sourceField[row][col] = clamp01(source);
}

function addSource(layers, x, y, value) {
  const col = Math.round(Number(x));
  const row = Math.round(Number(y));
  if (row < 0 || col < 0 || row >= layers.height || col >= layers.width) return;
  layers.sourceField[row][col] = Math.max(layers.sourceField[row][col], clamp01(value));
}

export function cloneFixtureLayers(layers = {}) {
  return {
    width: layers.width,
    height: layers.height,
    stateLayer: cloneLayer(layers.stateLayer),
    ruleLayer: cloneLayer(layers.ruleLayer),
    groupLayer: cloneLayer(layers.groupLayer),
    sourceField: cloneLayer(layers.sourceField),
    parameterLayer: cloneParameterLayer(layers.parameterLayer)
  };
}

function cloneLayer(layer) {
  return Array.isArray(layer) ? layer.map((row) => Array.isArray(row) ? [...row] : []) : [];
}

function cloneParameterLayer(layer) {
  return Array.isArray(layer) ? layer.map((row) => Array.isArray(row) ? row.map((cell) => ({ ...(cell ?? {}) })) : []) : [];
}

function countValues(layer) {
  const counts = {};
  if (!Array.isArray(layer)) return counts;
  for (const row of layer) for (const value of row ?? []) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
  return counts;
}

function centerX(width) {
  return Math.floor(width / 2);
}

function centerY(height) {
  return Math.floor(height / 2);
}

function clampGridSize(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(8, Math.min(96, number)) : fallback;
}

function clamp01(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

const FIXTURE_BUILDERS = {
  conwayGameOfLife: conwayMixedFixture,
  'conwayGameOfLife.default': conwayMixedFixture,
  'conwayGameOfLife:block': conwayBlockFixture,
  conwayBlock: conwayBlockFixture,
  'conwayGameOfLife:blinker': conwayBlinkerFixture,
  conwayBlinker: conwayBlinkerFixture,
  'conwayGameOfLife:glider': conwayGliderFixture,
  conwayGlider: conwayGliderFixture,
  forestFire: forestFireFixture,
  sirEpidemicCa: sirEpidemicFixture,
  greenbergHastingsExcitableMedia: excitableMediaFixture,
  sandpileAvalanche: sandpileFixture,
  watorPredatorPrey: watorFixture,
  trafficCa: trafficFixture,
  wireworld: wireworldFixture,
  bloomGrowthDecay: bloomFixture,
  riverPlumeFront: riverPlumeFixture,
  oilChemicalPlume: oilPlumeFixture,
  thermoclineWaterMassBoundary: thermoclineFixture,
  eddyTrappedPatch: eddyPatchFixture,
  shorelineRunoffPulse: shorelineRunoffFixture,
  hydrothermalDeepSourcePlume: hydrothermalFixture,
  turbidityEvent: turbidityFixture,
  hypoxiaRecoveryZone: hypoxiaFixture,
  persistentMonitoringFreshnessField: freshnessMonitoringFixture
};

const ALIASES = {
  birthDeathEmergence: 'conwayGameOfLife',
  frontPropagation: 'forestFire',
  diffusionSpread: 'sirEpidemicCa',
  waveExcitableMedia: 'greenbergHastingsExcitableMedia',
  avalancheBurstCascades: 'sandpileAvalanche',
  predatorPreyMigration: 'watorPredatorPrey',
  congestionDensityWaves: 'trafficCa',
  structuredSignalPropagation: 'wireworld',
  freshnessRecovery: 'persistentMonitoringFreshnessField'
};
