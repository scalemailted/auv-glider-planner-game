import { frameFromLayers, stepSamplingProcess } from './SamplingProcessEvolution.js';
import { buildExampleInitialLayers, cloneFixtureLayers } from './SamplingProcessExampleFixtures.js';

export const SAMPLING_PROCESS_BEHAVIOR_ASSERTION_VERSION = 'sampling-process-example-behavior-assertions-v1';

export function runExampleBehaviorFrames(exampleOrId, options = {}) {
  const fixtureBuild = options.fixtureBuild ?? buildExampleInitialLayers(exampleOrId, options);
  const fixture = fixtureBuild.fixture;
  const width = fixture.layers?.width ?? fixtureBuild.layers?.width ?? options.width ?? 24;
  const height = fixture.layers?.height ?? fixtureBuild.layers?.height ?? options.height ?? 16;
  const generationCount = Math.max(1, Math.min(12, Math.round(Number(options.generationCount ?? fixture.generationCountForPreview ?? 4))));
  const seed = options.seed ?? 'sampling-process-behavior-qa';
  let layers = cloneFixtureLayers(fixtureBuild.layers ?? fixture.layers);
  const frames = [frameFromLayers({
    ...layers,
    width,
    height,
    globalRuleId: fixture.ruleId,
    time: 0,
    index: 0,
    seed
  })];
  for (let index = 1; index <= generationCount; index += 1) {
    const next = stepSamplingProcess({
      ...layers,
      width,
      height,
      globalRuleId: fixture.ruleId,
      time: index,
      dt: 1,
      seed
    });
    frames.push({ index, timeSeconds: index, ...next });
    layers = next;
  }
  return { fixtureBuild, fixture, frames, width, height, seed, generationCount };
}

export function evaluateSamplingProcessExampleBehavior(exampleOrId, options = {}) {
  const run = options.frames ? {
    fixtureBuild: options.fixtureBuild ?? buildExampleInitialLayers(exampleOrId, options),
    fixture: options.fixtureBuild?.fixture,
    frames: options.frames,
    width: options.width,
    height: options.height,
    seed: options.seed,
    generationCount: Math.max(0, options.frames.length - 1)
  } : runExampleBehaviorFrames(exampleOrId, options);
  const fixture = run.fixture ?? run.fixtureBuild.fixture;
  const fixtureValidation = run.fixtureBuild.validation;
  const assertionIds = options.assertions ?? fixture.expectedBehaviorAssertions ?? ['fixtureNonEmpty', 'hasTransitions'];
  const assertionResults = assertionIds.map((id) => runBehaviorAssertion(id, {
    example: typeof exampleOrId === 'string' ? { id: exampleOrId } : exampleOrId ?? {},
    fixture,
    fixtureValidation,
    frames: run.frames,
    width: run.width,
    height: run.height
  }));
  const metrics = behaviorMetrics(run.frames, fixture, fixtureValidation);
  const details = [
    ...fixtureValidation.details,
    ...assertionResults.flatMap((result) => result.status === 'PASS' ? [] : result.details)
  ];
  const status = worstStatus([fixtureValidation.status, ...assertionResults.map((result) => result.status)]);
  return {
    status,
    label: status === 'PASS' ? 'Behavior QA passed' : status === 'WARN' ? 'Behavior QA has warnings' : 'Behavior QA failed',
    details,
    metrics,
    fixtureValidation,
    assertionResults,
    behaviorValidationVersion: SAMPLING_PROCESS_BEHAVIOR_ASSERTION_VERSION
  };
}

export function runBehaviorAssertion(id, context = {}) {
  const fn = ASSERTIONS[id] ?? assertUnknown;
  return fn(context, id);
}

function assertFixtureNonEmpty({ fixtureValidation }) {
  const count = fixtureValidation.metrics.meaningfulCellCount;
  const source = fixtureValidation.metrics.activeSourceCellCount;
  if (count > 0 || source > 0) return pass('Fixture has explicit non-empty process layers', [], { meaningfulCellCount: count, activeSourceCellCount: source });
  return fail('Fixture is empty', ['No meaningful states or source cells were found.'], { meaningfulCellCount: count, activeSourceCellCount: source });
}

function assertHasTransitions({ frames }) {
  const total = totalTransitionCount(frames);
  if (total > 0) return pass('Frames include rule-driven transitions', [], { transitionCount: total });
  return fail('Frames did not transition', ['No transitionCount was reported after the initial frame.'], { transitionCount: total });
}

function assertConwayB3S23({ frames, fixture }) {
  const labels = transitionLabelSet(frames);
  const required = ['birth', 'survival', 'death'];
  const missing = required.filter((label) => !labels.has(label));
  if (!missing.length) return pass('Conway B3/S23 birth, survival, and death are visible', ['B3/S23 check uses the existing localBirthDeath rule engine.'], { ruleId: fixture.ruleId, observedTransitions: required });
  return fail('Conway B3/S23 transition coverage missing', [`Missing transition labels: ${missing.join(', ')}`], { ruleId: fixture.ruleId, observedTransitions: [...labels] });
}

function assertConwayBlockStable({ frames, fixture }) {
  const cells = fixture.canonical?.block?.cells ?? [];
  if (!cells.length) return fail('Conway block metadata missing', ['Fixture did not provide block cells.']);
  const checked = frames.slice(0, Math.min(3, frames.length));
  const stable = checked.every((frame) => cells.every((cell) => stateAt(frame, cell) === 'active'));
  if (stable) return pass('Conway block remains stable', [], { checkedGenerations: checked.length, cells: cells.length });
  return fail('Conway block changed unexpectedly', ['One or more block cells was not active over the checked generations.'], { checkedGenerations: checked.length, cells });
}

function assertConwayBlinkerPeriod2({ frames, fixture }) {
  const blinker = fixture.canonical?.blinker;
  if (!blinker) return fail('Conway blinker metadata missing', ['Fixture did not provide blinker cells.']);
  const frame0 = frames[0];
  const frame1 = frames[1];
  const frame2 = frames[2];
  const initialVertical = blinker.vertical.every((cell) => stateAt(frame0, cell) === 'active');
  const firstHorizontal = blinker.horizontal.every((cell) => stateAt(frame1, cell) === 'active');
  const secondVertical = blinker.vertical.every((cell) => stateAt(frame2, cell) === 'active');
  if (initialVertical && firstHorizontal && secondVertical) return pass('Conway blinker flips with period 2', [], { checkedGenerations: 2 });
  return fail('Conway blinker did not show period-2 behavior', ['Expected vertical -> horizontal -> vertical active cells.'], { initialVertical, firstHorizontal, secondVertical });
}

function assertConwayGliderMoves({ frames, fixture }) {
  const glider = fixture.canonical?.glider;
  const frame4 = frames[4];
  if (!glider || !frame4) return fail('Conway glider check lacks metadata or frame 4', ['Need a glider fixture and at least four evolved generations.']);
  const shifted = glider.shiftedAfterFour.every((cell) => stateAt(frame4, cell) === 'active');
  if (shifted) return pass('Conway glider translates after four generations', [], { checkedGeneration: 4, shiftedCells: glider.shiftedAfterFour.length });
  return fail('Conway glider did not translate as expected', ['The canonical shifted cells were not all active at generation 4.'], { expectedShiftedCells: glider.shiftedAfterFour });
}

function assertFrontPropagation({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = labels.has('susceptibleToActive') && labels.has('activeToCooling') && (states.has('cooling') || states.has('consumed'));
  if (ok) return pass('Front propagates and leaves a trail', [], { transitions: [...labels], states: [...states] });
  return fail('Front behavior was not visible', ['Expected susceptibleToActive and activeToCooling transitions.'], { transitions: [...labels], states: [...states] });
}

function assertSpreadRecovery({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = labels.has('susceptibleToActive') && labels.has('activeToRecovering') && states.has('recovering');
  if (ok) return pass('Spread and recovery cycle is visible', [], { transitions: [...labels], states: [...states] });
  return fail('Spread/recovery behavior was not visible', ['Expected active spread plus recovering states.'], { transitions: [...labels], states: [...states] });
}

function assertWaveRecovery({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = labels.has('susceptibleToActive') && labels.has('activeToRefractory') && labels.has('refractoryToRecovering');
  if (ok) return pass('Excitable wave and refractory recovery are visible', [], { transitions: [...labels], states: [...states] });
  return fail('Excitable-wave behavior was not visible', ['Expected activation, refractory, and recovery transitions.'], { transitions: [...labels], states: [...states] });
}

function assertThresholdCascade({ frames }) {
  const labels = transitionLabelSet(frames);
  const ok = labels.has('loadedToActive') && labels.has('activeToSpent') && labels.has('spentToRecovering');
  if (ok) return pass('Threshold cascade transitions are visible', [], { transitions: [...labels] });
  return fail('Threshold cascade was not visible', ['Expected loadedToActive, activeToSpent, and spentToRecovering transitions.'], { transitions: [...labels] });
}

function assertPopulationInteraction({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = states.has('prey') && states.has('predator') && (labels.has('preySpread') || labels.has('predatorPursuit') || labels.has('predatorDecay'));
  if (ok) return pass('Predator-prey interaction is visible', [], { transitions: [...labels], states: [...states] });
  return fail('Predator-prey interaction was not visible', ['Expected prey and predator states with local interaction transitions.'], { transitions: [...labels], states: [...states] });
}

function assertCongestionRelease({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = (labels.has('moved') || labels.has('blockedToCongested')) && states.has('congested') && states.has('released');
  if (ok) return pass('Traffic congestion and release states are visible', [], { transitions: [...labels], states: [...states] });
  return fail('Traffic congestion behavior was not visible', ['Expected moving, congested, and released behavior.'], { transitions: [...labels], states: [...states] });
}

function assertSignalPropagation({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = labels.has('conductorToSignal') && labels.has('signalToRefractory') && states.has('signal') && states.has('conductor');
  if (ok) return pass('Structured signal propagates along conductor cells', [], { transitions: [...labels], states: [...states] });
  return fail('Structured signal propagation was not visible', ['Expected conductorToSignal and signalToRefractory transitions.'], { transitions: [...labels], states: [...states] });
}

function assertMorphogenesisPattern({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = labels.has('patternActivated') || labels.has('patternMorph') || states.has('patternA') || states.has('patternB');
  if (ok) return pass('Morphogenesis pattern activation is visible', [], { transitions: [...labels], states: [...states] });
  return fail('Morphogenesis pattern behavior was not visible', ['Expected pattern activation or pattern state transitions.'], { transitions: [...labels], states: [...states] });
}

function assertDomainBoundary({ frames }) {
  const states = distinctStates(frames);
  const labels = transitionLabelSet(frames);
  const ok = states.has('domainA') && states.has('domainB');
  if (ok) return pass('Domain boundary states are visible', [], { transitions: [...labels], states: [...states] });
  return fail('Domain boundary was not visible', ['Expected both domainA and domainB states.'], { transitions: [...labels], states: [...states] });
}

function assertFreshnessCycle({ frames }) {
  const labels = transitionLabelSet(frames);
  const states = distinctStates(frames);
  const ok = labels.has('sampledToCooling') && labels.has('coolingToRecovering') && labels.has('recoveringToStale');
  if (ok) return pass('Freshness recovery cycle is visible', [], { transitions: [...labels], states: [...states] });
  return fail('Freshness cycle was not visible', ['Expected sampled, cooling, recovering, and stale transitions.'], { transitions: [...labels], states: [...states] });
}

function assertFlowCouplingNote({ example, fixture }) {
  if (!example?.requiresFlowCoupling && !fixture.requiresFlowCoupling) return pass('Flow coupling not required for this analog');
  const note = fixture.coupledDemoBridgeNote ?? example?.coupledDemoBridgeNote ?? example?.warning;
  if (note) return pass('Flow coupling boundary is documented', [note], { requiresFlowCoupling: true });
  return fail('Flow coupling boundary note missing', ['Ocean analog requires flow coupling but no bridge note was found.'], { requiresFlowCoupling: true });
}

function assertUnknown(_context, id) {
  return warn('Unknown behavior assertion', [`No assertion registered for ${id}.`], { assertionId: id });
}

function behaviorMetrics(frames = [], fixture = {}, fixtureValidation = {}) {
  const stateCountsByGeneration = frames.map((frame) => ({ ...(frame.stateCounts ?? countValues(frame.stateLayer)) }));
  return {
    behaviorValidationVersion: SAMPLING_PROCESS_BEHAVIOR_ASSERTION_VERSION,
    fixtureId: fixture.id ?? null,
    fixtureLabel: fixture.label ?? null,
    exampleId: fixture.exampleId ?? null,
    ruleId: fixture.ruleId ?? null,
    ruleLabel: fixture.ruleLabel ?? null,
    generationCount: Math.max(0, frames.length - 1),
    transitionCount: totalTransitionCount(frames),
    activeCountsByGeneration: frames.map((frame) => activeStateCount(frame.stateLayer)),
    distinctStatesSeen: [...distinctStates(frames)],
    transitionLabelsSeen: [...transitionLabelSet(frames)],
    stateCountsByGeneration,
    initialMeaningfulCellCount: fixtureValidation.metrics?.meaningfulCellCount ?? 0,
    activeSourceCellCount: fixtureValidation.metrics?.activeSourceCellCount ?? 0,
    canonicalRuleCheck: fixture.ruleId === 'localBirthDeath' ? 'B3/S23 localBirthDeath' : fixture.ruleId
  };
}

function pass(label, details = [], metrics = {}) {
  return { status: 'PASS', label, details, metrics };
}

function warn(label, details = [], metrics = {}) {
  return { status: 'WARN', label, details, metrics };
}

function fail(label, details = [], metrics = {}) {
  return { status: 'FAIL', label, details, metrics };
}

function worstStatus(statuses = []) {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.includes('WARN')) return 'WARN';
  return 'PASS';
}

function totalTransitionCount(frames = []) {
  return frames.slice(1).reduce((sum, frame) => sum + Number(frame.diagnostics?.transitionCount ?? countChangedTransitions(frame.transitionLayer)), 0);
}

function countChangedTransitions(layer = []) {
  let count = 0;
  for (const row of layer ?? []) for (const transition of row ?? []) if (transition?.previousState !== transition?.nextState) count += 1;
  return count;
}

function transitionLabelSet(frames = []) {
  const labels = new Set();
  for (const frame of frames.slice(1)) {
    for (const row of frame.transitionLayer ?? []) {
      for (const transition of row ?? []) if (transition?.transitionLabel) labels.add(transition.transitionLabel);
    }
  }
  return labels;
}

function distinctStates(frames = []) {
  const states = new Set();
  for (const frame of frames) for (const row of frame.stateLayer ?? []) for (const state of row ?? []) states.add(String(state));
  return states;
}

function activeStateCount(layer = []) {
  const active = new Set(['active', 'signal', 'moving', 'prey', 'predator', 'stale', 'patternA', 'patternB']);
  let count = 0;
  for (const row of layer ?? []) for (const state of row ?? []) if (active.has(state)) count += 1;
  return count;
}

function countValues(layer = []) {
  const counts = {};
  for (const row of layer ?? []) for (const value of row ?? []) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
  return counts;
}

function stateAt(frame, cell) {
  return frame?.stateLayer?.[cell.y]?.[cell.x] ?? null;
}

const ASSERTIONS = {
  fixtureNonEmpty: assertFixtureNonEmpty,
  hasTransitions: assertHasTransitions,
  conwayB3S23: assertConwayB3S23,
  conwayBlockStable: assertConwayBlockStable,
  conwayBlinkerPeriod2: assertConwayBlinkerPeriod2,
  conwayGliderMoves: assertConwayGliderMoves,
  frontPropagation: assertFrontPropagation,
  spreadRecovery: assertSpreadRecovery,
  waveRecovery: assertWaveRecovery,
  thresholdCascade: assertThresholdCascade,
  populationInteraction: assertPopulationInteraction,
  congestionRelease: assertCongestionRelease,
  signalPropagation: assertSignalPropagation,
  morphogenesisPattern: assertMorphogenesisPattern,
  domainBoundary: assertDomainBoundary,
  freshnessCycle: assertFreshnessCycle,
  flowCouplingNote: assertFlowCouplingNote
};
