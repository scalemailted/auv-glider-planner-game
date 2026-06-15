import {
  assignSamplingProcessCell,
  clearSamplingProcessCell,
  createSamplingProcessPaintModel,
  samplingProcessLayersFromPaint
} from './SamplingProcessPaintModel.js';
import {
  normalizeProcessRuleId,
  processRuleById
} from './SamplingProcessRules.js';
import {
  SAMPLING_PROCESS_EXAMPLE_FIXTURE_VERSION,
  buildExampleInitialLayers,
  cloneFixtureLayers,
  validateSamplingProcessExampleFixture
} from './SamplingProcessExampleFixtures.js';
import { spatiotemporalProcessExampleById } from './SpatiotemporalProcessExamples.js';

export const SAMPLING_PROCESS_INITIAL_CONDITION_EDITOR_VERSION = 'sampling-process-initial-condition-editor-v1';
export const INITIAL_CONDITION_MODES = ['curatedSeed', 'interactiveCanvas', 'deterministicRandomSeed'];
export const DEFAULT_INITIAL_CONDITION_MODE = 'curatedSeed';
export const DEFAULT_INITIAL_CONDITION_FIXTURE_ID = 'default';

const DEFAULT_WIDTH = 24;
const DEFAULT_HEIGHT = 16;
const CONWAY_FIXTURE_OPTIONS = [
  { id: 'default', fixtureId: 'conwayGameOfLife.default', label: 'Default canonical mix' },
  { id: 'mixedTeachingSeed', fixtureId: 'conwayGameOfLife.default', label: 'Mixed teaching seed' },
  { id: 'block', fixtureId: 'conwayGameOfLife:block', label: 'Block still life' },
  { id: 'blinker', fixtureId: 'conwayGameOfLife:blinker', label: 'Blinker oscillator' },
  { id: 'glider', fixtureId: 'conwayGameOfLife:glider', label: 'Glider' },
  { id: 'randomDeterministic', fixtureId: 'randomDeterministic', label: 'Seeded random' }
];
const RANDOM_FIXTURE_ID = 'randomDeterministic';

export function normalizeInitialConditionMode(value = DEFAULT_INITIAL_CONDITION_MODE) {
  const mode = String(value ?? DEFAULT_INITIAL_CONDITION_MODE);
  return INITIAL_CONDITION_MODES.includes(mode) ? mode : DEFAULT_INITIAL_CONDITION_MODE;
}

export function initialConditionModeOptions() {
  return [
    { id: 'curatedSeed', label: 'Curated Seed', helper: 'Use the built-in teaching seed without edits.' },
    { id: 'interactiveCanvas', label: 'Interactive Canvas', helper: 'Click cells to edit generation 0, then step the fixed rule.' },
    { id: 'deterministicRandomSeed', label: 'Deterministic Random Seed', helper: 'Generate a seeded starting state for the selected model.' }
  ];
}

export function isExampleInitialConditionEditorSupported(exampleOrId) {
  const example = resolveExample(exampleOrId);
  return Boolean(example?.id && example?.ruleFamilyId);
}

export function exampleInitialConditionFixtureOptions(exampleOrId) {
  const example = resolveExample(exampleOrId);
  if (example?.id === 'conwayGameOfLife') return CONWAY_FIXTURE_OPTIONS.map((option) => ({ ...option }));
  const fixtureId = example?.id ?? DEFAULT_INITIAL_CONDITION_FIXTURE_ID;
  return [
    { id: 'default', fixtureId, label: 'Default teaching seed' },
    { id: RANDOM_FIXTURE_ID, fixtureId: RANDOM_FIXTURE_ID, label: 'Seeded random' }
  ];
}

export function normalizeInitialConditionFixtureId(value = DEFAULT_INITIAL_CONDITION_FIXTURE_ID, exampleOrId = null) {
  const requested = String(value ?? DEFAULT_INITIAL_CONDITION_FIXTURE_ID);
  const options = exampleInitialConditionFixtureOptions(exampleOrId);
  const exact = options.find((option) => option.id === requested || option.fixtureId === requested);
  if (exact) return exact.id;
  return options[0]?.id ?? DEFAULT_INITIAL_CONDITION_FIXTURE_ID;
}

export function selectedFixtureOption(exampleOrId, fixtureId = DEFAULT_INITIAL_CONDITION_FIXTURE_ID) {
  const normalized = normalizeInitialConditionFixtureId(fixtureId, exampleOrId);
  return exampleInitialConditionFixtureOptions(exampleOrId).find((option) => option.id === normalized) ?? exampleInitialConditionFixtureOptions(exampleOrId)[0];
}

export function fixtureBuildOptionsForSelection(exampleOrId, fixtureId = DEFAULT_INITIAL_CONDITION_FIXTURE_ID) {
  const option = selectedFixtureOption(exampleOrId, fixtureId);
  return {
    selectedFixtureId: option?.id ?? DEFAULT_INITIAL_CONDITION_FIXTURE_ID,
    fixtureId: option?.fixtureId ?? resolveExample(exampleOrId)?.id ?? DEFAULT_INITIAL_CONDITION_FIXTURE_ID,
    fixtureLabel: option?.label ?? 'Default teaching seed'
  };
}

export function exampleInitialConditionBrushPalette(exampleOrId) {
  const example = resolveExample(exampleOrId);
  const ruleId = fixedRuleIdForExample(example);
  const base = paletteForRule(ruleId);
  const oceanSourceBrush = example?.exampleType === 'oceanProcessAnalog'
    ? [{ id: 'source', label: 'Source / Front', state: sourceBrushState(ruleId), sourceValue: 1, helper: 'Marks a strong source/support cell in this event-layer analog.' }]
    : [];
  const merged = [...oceanSourceBrush, ...base];
  const seen = new Set();
  return merged
    .filter((brush) => brush && !seen.has(brush.id) && seen.add(brush.id))
    .map((brush) => ({
      id: brush.id,
      label: brush.label,
      state: normalizeBrushState(brush.state, ruleId),
      sourceValue: clamp01(brush.sourceValue),
      helper: brush.helper ?? brush.label,
      ruleId
    }));
}

export function defaultInitialConditionBrush(exampleOrId) {
  const palette = exampleInitialConditionBrushPalette(exampleOrId);
  const preferredId = resolveExample(exampleOrId)?.id === 'wireworld' ? 'signal' : 'active';
  return palette.find((brush) => brush.id === preferredId) ?? palette.find((brush) => brush.sourceValue > 0.5) ?? palette[0] ?? null;
}

export function normalizeInitialConditionBrush(exampleOrId, value = null) {
  const palette = exampleInitialConditionBrushPalette(exampleOrId);
  if (!palette.length) return null;
  if (value && typeof value === 'object') {
    const byId = palette.find((brush) => brush.id === value.id || brush.state === value.state);
    if (byId) return byId;
    const ruleId = fixedRuleIdForExample(exampleOrId);
    return {
      id: String(value.id ?? value.state ?? palette[0].id),
      label: String(value.label ?? value.id ?? value.state ?? palette[0].label),
      state: normalizeBrushState(value.state, ruleId),
      sourceValue: clamp01(value.sourceValue ?? value.source ?? palette[0].sourceValue),
      helper: String(value.helper ?? value.label ?? ''),
      ruleId
    };
  }
  const requested = String(value ?? '');
  return palette.find((brush) => brush.id === requested || brush.state === requested) ?? defaultInitialConditionBrush(exampleOrId) ?? palette[0];
}

export function createExampleInitialConditionEditModel(exampleOrId, options = {}) {
  const example = resolveExample(exampleOrId);
  const width = positiveInt(options.width, DEFAULT_WIDTH);
  const height = positiveInt(options.height, DEFAULT_HEIGHT);
  const ruleId = fixedRuleIdForExample(example, options.ruleId);
  const model = createSamplingProcessPaintModel({ width, height, assignments: options.assignments ?? options.model ?? {} });
  model.groups = {
    '1': {
      id: 1,
      label: `${example?.label ?? 'Process'} initial condition edits`,
      ruleId,
      temporalRuleId: null,
      interactionScale: processRuleById(ruleId).interactionScale ?? 'edge',
      valueMapId: 'activation-to-sampling-value',
      sourceProfile: 'initial-condition-editor',
      parameters: {}
    }
  };
  const normalizedCells = {};
  for (const [key, assignment] of Object.entries(model.cells ?? {})) {
    const normalized = normalizeInitialConditionAssignment(example, assignment);
    if (normalized) normalizedCells[key] = normalized;
  }
  model.cells = normalizedCells;
  return model;
}

export function assignExampleInitialConditionCell(model, exampleOrId, cell, patch = {}) {
  const next = createExampleInitialConditionEditModel(exampleOrId, {
    width: model?.width ?? DEFAULT_WIDTH,
    height: model?.height ?? DEFAULT_HEIGHT,
    assignments: model ?? {}
  });
  if (!validCell(cell, next.width, next.height)) return next;
  if (patch.clear || patch.state === null || patch.brushState === null) {
    clearSamplingProcessCell(next, cell);
    return next;
  }
  const brush = normalizeInitialConditionBrush(exampleOrId, patch.brushState ?? patch.brush ?? patch.state);
  const assignment = normalizeInitialConditionAssignment(exampleOrId, {
    state: patch.state ?? brush?.state,
    sourceValue: patch.sourceValue ?? patch.source ?? brush?.sourceValue,
    parameters: patch.parameters ?? brush?.parameters ?? {}
  });
  assignSamplingProcessCell(next, cell, assignment);
  return createExampleInitialConditionEditModel(exampleOrId, {
    width: next.width,
    height: next.height,
    assignments: next
  });
}

export function clearExampleInitialConditionEdits(model, options = {}) {
  return createExampleInitialConditionEditModel(options.example, {
    width: model?.width ?? options.width ?? DEFAULT_WIDTH,
    height: model?.height ?? options.height ?? DEFAULT_HEIGHT,
    assignments: {}
  });
}

export function buildExampleInitialConditionLayers(exampleOrId, options = {}) {
  const example = resolveExample(exampleOrId);
  const width = positiveInt(options.width, DEFAULT_WIDTH);
  const height = positiveInt(options.height, DEFAULT_HEIGHT);
  const mode = normalizeInitialConditionMode(options.mode);
  const fixtureSelection = mode === 'deterministicRandomSeed'
    ? RANDOM_FIXTURE_ID
    : normalizeInitialConditionFixtureId(options.fixtureId ?? options.selectedFixtureId, example);
  const selected = fixtureBuildOptionsForSelection(example, fixtureSelection);
  const seed = String(options.seed ?? 'sampling-process-initial-condition');
  const baseBuild = mode === 'deterministicRandomSeed' || selected.fixtureId === RANDOM_FIXTURE_ID
    ? buildDeterministicRandomInitialFixture(example, { width, height, seed })
    : buildExampleInitialLayers(example, { width, height, seed, fixtureId: selected.fixtureId });
  const model = createExampleInitialConditionEditModel(example, {
    width,
    height,
    assignments: options.editModel ?? options.model ?? options.initialConditionModel ?? {}
  });
  const appliesEdits = mode === 'interactiveCanvas' && Object.keys(model.cells ?? {}).length > 0;
  const layers = appliesEdits
    ? {
        ...cloneFixtureLayers(baseBuild.layers),
        ...samplingProcessLayersFromPaint(model, baseBuild.layers),
        width,
        height
      }
    : cloneFixtureLayers(baseBuild.layers);
  const fixture = {
    ...baseBuild.fixture,
    id: mode === 'deterministicRandomSeed' ? RANDOM_FIXTURE_ID : baseBuild.fixture?.id,
    selectedFixtureId: selected.selectedFixtureId,
    selectedFixtureLabel: selected.fixtureLabel
  };
  const fixtureBuild = {
    fixture,
    validation: validateSamplingProcessExampleFixture({ ...fixture, layers }, { example }),
    layers
  };
  const brush = normalizeInitialConditionBrush(example, options.brushState ?? options.selectedBrushState);
  return {
    fixtureBuild,
    fixture: fixtureBuild.fixture,
    validation: fixtureBuild.validation,
    layers,
    model,
    metadata: buildInitialConditionMetadata({
      example,
      mode,
      selectedFixtureId: selected.selectedFixtureId,
      fixture: fixtureBuild.fixture,
      model,
      brushState: brush,
      generationIndex: options.generationIndex ?? 0
    })
  };
}

export function buildInitialConditionMetadata({ example = null, mode = DEFAULT_INITIAL_CONDITION_MODE, selectedFixtureId = DEFAULT_INITIAL_CONDITION_FIXTURE_ID, fixture = null, model = null, brushState = null, generationIndex = 0 } = {}) {
  const normalizedMode = normalizeInitialConditionMode(mode);
  const edits = cloneEdits(model?.cells ?? {});
  const editedCellCount = Object.keys(edits).length;
  const fixtureLabel = selectedFixtureOption(example, selectedFixtureId)?.label ?? fixture?.selectedFixtureLabel ?? fixture?.label ?? null;
  const brush = normalizeInitialConditionBrush(example, brushState);
  return {
    editorVersion: SAMPLING_PROCESS_INITIAL_CONDITION_EDITOR_VERSION,
    mode: normalizedMode,
    fixtureId: selectedFixtureId ?? fixture?.selectedFixtureId ?? fixture?.id ?? DEFAULT_INITIAL_CONDITION_FIXTURE_ID,
    fixtureLabel,
    concreteFixtureId: fixture?.id ?? null,
    concreteFixtureLabel: fixture?.label ?? null,
    editedCellCount,
    brushState: brush ? {
      id: brush.id,
      label: brush.label,
      state: brush.state,
      sourceValue: brush.sourceValue,
      ruleId: brush.ruleId
    } : null,
    interactiveCanvasUsed: normalizedMode === 'interactiveCanvas' && editedCellCount > 0,
    generationIndexAtExport: Math.max(0, Math.round(Number(generationIndex) || 0)),
    edits,
    initialConditionMatchesFixture: editedCellCount === 0
  };
}

export function initialConditionMatchesFixture(model) {
  return Object.keys(model?.cells ?? {}).length === 0;
}

export function initialConditionEditCount(model) {
  return Object.keys(model?.cells ?? {}).length;
}

export function initialConditionGuidanceForExample(exampleOrId) {
  const example = resolveExample(exampleOrId);
  const ruleId = fixedRuleIdForExample(example);
  const base = {
    title: 'Interactive Initial Condition',
    ruleId,
    ruleLabel: processRuleById(ruleId).label,
    prompt: 'Edit generation 0, keep the model rule fixed, then step one generation to see the update function.',
    note: 'This editor changes initial states only. Use Process Paint for arbitrary rule allocation.'
  };
  if (example?.id === 'conwayGameOfLife') {
    return { ...base, prompt: 'Click cells to toggle inactive/active, then step to watch B3/S23 birth, survival, and death.' };
  }
  if (example?.id === 'forestFire') {
    return { ...base, prompt: 'Place susceptible, active, cooling, or consumed cells and step the front propagation rule.' };
  }
  if (example?.id === 'sirEpidemicCa') {
    return { ...base, prompt: 'Place susceptible, active, and recovering cells and step the local spread/recovery rule.' };
  }
  if (example?.id === 'wireworld') {
    return { ...base, prompt: 'Build conductor paths, add a signal head, and step the structured signal rule.' };
  }
  if (example?.exampleType === 'oceanProcessAnalog') {
    return {
      ...base,
      prompt: 'Edit the event/process layer only, then step the analog rule. Flow, uncertainty, depth, and sensors remain outside this panel.',
      note: example.requiresFlowCoupling
        ? 'Ocean analog disclaimer: this is not physical advection. Use Flow Fields or Coupled Dynamic Sampling Space for current-driven motion.'
        : 'Ocean analog disclaimer: this is a simplified event-layer teaching model, not a calibrated ocean forecast.'
    };
  }
  return base;
}

function buildDeterministicRandomInitialFixture(exampleOrId, { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, seed = 'sampling-process-random-initial-condition' } = {}) {
  const example = resolveExample(exampleOrId);
  const ruleId = fixedRuleIdForExample(example);
  const rule = processRuleById(ruleId);
  const w = positiveInt(width, DEFAULT_WIDTH);
  const h = positiveInt(height, DEFAULT_HEIGHT);
  const background = rule.defaultInitialState ?? rule.allowedStates?.[0] ?? 'inactive';
  const layers = {
    width: w,
    height: h,
    stateLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => background)),
    ruleLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => ruleId)),
    groupLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => 1)),
    sourceField: Array.from({ length: h }, () => Array.from({ length: w }, () => 0.05)),
    parameterLayer: Array.from({ length: h }, () => Array.from({ length: w }, () => ({})))
  };
  const brushes = exampleInitialConditionBrushPalette(example).filter((brush) => brush.state !== background || brush.sourceValue > 0.2);
  const rng = seededRandom(`${example?.id ?? 'example'}:${seed}:${w}x${h}`);
  const density = ruleId === 'localBirthDeath' ? 0.22 : ruleId === 'structuredSignal' ? 0.16 : 0.2;
  for (let row = 0; row < h; row += 1) {
    for (let col = 0; col < w; col += 1) {
      if (rng() > density) continue;
      const brush = brushes[Math.floor(rng() * brushes.length)] ?? defaultInitialConditionBrush(example);
      layers.stateLayer[row][col] = brush.state;
      layers.sourceField[row][col] = brush.sourceValue;
    }
  }
  return {
    fixture: {
      fixtureVersion: SAMPLING_PROCESS_EXAMPLE_FIXTURE_VERSION,
      deterministic: true,
      id: RANDOM_FIXTURE_ID,
      selectedFixtureId: RANDOM_FIXTURE_ID,
      label: 'Deterministic random initial condition',
      selectedFixtureLabel: 'Seeded random',
      exampleId: example?.id ?? null,
      ruleId,
      ruleLabel: rule.label,
      layers: cloneFixtureLayers(layers),
      generationCountForPreview: 4,
      expectedBehaviorAssertions: ['fixtureNonEmpty'],
      notes: ['Generated in browser from a deterministic seeded random function.']
    },
    validation: validateSamplingProcessExampleFixture({ id: RANDOM_FIXTURE_ID, exampleId: example?.id, ruleId, layers }, { example }),
    layers
  };
}

function normalizeInitialConditionAssignment(exampleOrId, value = {}) {
  const ruleId = fixedRuleIdForExample(exampleOrId, value.ruleId);
  const rule = processRuleById(ruleId);
  const state = normalizeBrushState(value.state, ruleId);
  return {
    state: rule.allowedStates.includes(state) ? state : rule.defaultInitialState,
    ruleId,
    groupId: 1,
    sourceValue: clamp01(value.sourceValue ?? value.source ?? sourceForState(state, ruleId)),
    temporalRuleId: null,
    valueMapId: value.valueMapId ?? 'activation-to-sampling-value',
    parameters: value.parameters ?? {}
  };
}

function fixedRuleIdForExample(exampleOrId, fallback = null) {
  const example = resolveExample(exampleOrId);
  return normalizeProcessRuleId(example?.ruleFamilyId ?? fallback ?? 'localBirthDeath');
}

function resolveExample(exampleOrId) {
  if (!exampleOrId) return null;
  if (typeof exampleOrId === 'string') return spatiotemporalProcessExampleById(exampleOrId) ?? { id: exampleOrId, ruleFamilyId: exampleOrId === 'conwayGameOfLife' ? 'localBirthDeath' : null };
  return exampleOrId;
}

function paletteForRule(ruleId) {
  return {
    localBirthDeath: [
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 },
      { id: 'active', label: 'Active', state: 'active', sourceValue: 0.85 }
    ],
    propagatingFront: [
      { id: 'susceptible', label: 'Susceptible', state: 'susceptible', sourceValue: 0.14 },
      { id: 'active', label: 'Active / Front', state: 'active', sourceValue: 0.95 },
      { id: 'cooling', label: 'Cooling', state: 'cooling', sourceValue: 0.35 },
      { id: 'consumed', label: 'Consumed Trail', state: 'consumed', sourceValue: 0.08 },
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 }
    ],
    diffusiveSpread: [
      { id: 'susceptible', label: 'Susceptible', state: 'susceptible', sourceValue: 0.12 },
      { id: 'active', label: 'Active / Infected', state: 'active', sourceValue: 0.9 },
      { id: 'recovering', label: 'Recovering', state: 'recovering', sourceValue: 0.3 },
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 }
    ],
    excitableWave: [
      { id: 'susceptible', label: 'Susceptible', state: 'susceptible', sourceValue: 0.2 },
      { id: 'active', label: 'Active Crest', state: 'active', sourceValue: 0.9 },
      { id: 'refractory', label: 'Refractory', state: 'refractory', sourceValue: 0.12 },
      { id: 'recovering', label: 'Recovering', state: 'recovering', sourceValue: 0.25 },
      { id: 'resting', label: 'Resting', state: 'resting', sourceValue: 0.08 }
    ],
    thresholdCascade: [
      { id: 'loaded', label: 'Loaded', state: 'loaded', sourceValue: 0.65 },
      { id: 'active', label: 'Active Release', state: 'active', sourceValue: 1 },
      { id: 'spent', label: 'Spent', state: 'spent', sourceValue: 0.15 },
      { id: 'recovering', label: 'Recovering', state: 'recovering', sourceValue: 0.35 },
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 }
    ],
    interactingPopulation: [
      { id: 'empty', label: 'Empty', state: 'empty', sourceValue: 0 },
      { id: 'prey', label: 'Prey', state: 'prey', sourceValue: 0.65 },
      { id: 'predator', label: 'Predator', state: 'predator', sourceValue: 0.85 },
      { id: 'recovering', label: 'Recovering', state: 'recovering', sourceValue: 0.25 }
    ],
    congestionWave: [
      { id: 'empty', label: 'Empty', state: 'empty', sourceValue: 0 },
      { id: 'moving', label: 'Moving', state: 'moving', sourceValue: 0.8 },
      { id: 'congested', label: 'Congested', state: 'congested', sourceValue: 0.9 },
      { id: 'released', label: 'Released', state: 'released', sourceValue: 0.35 }
    ],
    structuredSignal: [
      { id: 'empty', label: 'Empty', state: 'empty', sourceValue: 0 },
      { id: 'conductor', label: 'Conductor', state: 'conductor', sourceValue: 0.32 },
      { id: 'signal', label: 'Signal Head', state: 'signal', sourceValue: 0.95 },
      { id: 'refractory', label: 'Refractory Tail', state: 'refractory', sourceValue: 0.12 }
    ],
    morphogenesis: [
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 },
      { id: 'active', label: 'Active Bloom', state: 'active', sourceValue: 0.9 },
      { id: 'patternA', label: 'Pattern A', state: 'patternA', sourceValue: 0.7 },
      { id: 'patternB', label: 'Pattern B', state: 'patternB', sourceValue: 0.55 },
      { id: 'recovering', label: 'Recovering', state: 'recovering', sourceValue: 0.3 }
    ],
    domainFormation: [
      { id: 'domainA', label: 'Domain A', state: 'domainA', sourceValue: 0.35 },
      { id: 'domainB', label: 'Domain B', state: 'domainB', sourceValue: 0.65 },
      { id: 'domainC', label: 'Domain C', state: 'domainC', sourceValue: 0.8 },
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 }
    ],
    freshnessRecovery: [
      { id: 'stale', label: 'Stale', state: 'stale', sourceValue: 0.75 },
      { id: 'sampled', label: 'Sampled', state: 'sampled', sourceValue: 0.05 },
      { id: 'cooling', label: 'Cooling', state: 'cooling', sourceValue: 0.15 },
      { id: 'recovering', label: 'Recovering', state: 'recovering', sourceValue: 0.45 },
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 }
    ],
    directedTransport: [
      { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 },
      { id: 'active', label: 'Active Feature', state: 'active', sourceValue: 0.9 },
      { id: 'trailing', label: 'Trailing', state: 'trailing', sourceValue: 0.25 }
    ]
  }[normalizeProcessRuleId(ruleId)] ?? [
    { id: 'inactive', label: 'Inactive', state: 'inactive', sourceValue: 0 },
    { id: 'active', label: 'Active', state: 'active', sourceValue: 0.85 }
  ];
}

function sourceBrushState(ruleId) {
  const preferred = {
    propagatingFront: 'active',
    diffusiveSpread: 'active',
    thresholdCascade: 'active',
    morphogenesis: 'active',
    domainFormation: 'domainB',
    freshnessRecovery: 'stale',
    structuredSignal: 'signal'
  }[normalizeProcessRuleId(ruleId)];
  return preferred ?? processRuleById(ruleId).defaultInitialState ?? 'active';
}

function sourceForState(state, ruleId) {
  return paletteForRule(ruleId).find((brush) => brush.state === state)?.sourceValue ?? (state === 'inactive' || state === 'empty' ? 0 : 0.5);
}

function normalizeBrushState(state, ruleId) {
  const rule = processRuleById(ruleId);
  const requested = String(state ?? rule.defaultInitialState ?? rule.allowedStates[0] ?? 'inactive');
  return rule.allowedStates.includes(requested) ? requested : rule.defaultInitialState ?? rule.allowedStates[0] ?? 'inactive';
}

function cloneEdits(cells = {}) {
  return Object.fromEntries(Object.entries(cells).map(([key, cell]) => [key, {
    state: cell.state,
    ruleId: cell.ruleId,
    groupId: cell.groupId,
    sourceValue: cell.sourceValue,
    parameters: { ...(cell.parameters ?? {}) }
  }]));
}

function validCell(cell, width, height) {
  const col = Math.round(Number(cell?.col ?? cell?.x));
  const row = Math.round(Number(cell?.row ?? cell?.y));
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 && col < width && row < height;
}

function positiveInt(value, fallback) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function clamp01(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

function seededRandom(seed) {
  let hash = 2166136261;
  const text = String(seed ?? 'seed');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223 >>> 0;
    return state / 4294967296;
  };
}

