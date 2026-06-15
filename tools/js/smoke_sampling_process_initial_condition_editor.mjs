import assert from 'node:assert/strict';
import {
  FOUNDATIONAL_CA_MODELS,
  OCEAN_RELEVANT_PROCESS_ANALOGS
} from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import {
  INITIAL_CONDITION_MODES,
  assignExampleInitialConditionCell,
  buildExampleInitialConditionLayers,
  createExampleInitialConditionEditModel,
  exampleInitialConditionBrushPalette,
  exampleInitialConditionFixtureOptions,
  initialConditionGuidanceForExample,
  initialConditionModeOptions,
  initialConditionMatchesFixture
} from '../../src/core/demo/sampling/SamplingProcessInitialConditionEditor.js';
import { stepSamplingProcess } from '../../src/core/demo/sampling/SamplingProcessEvolution.js';

assert.deepEqual(INITIAL_CONDITION_MODES, ['curatedSeed', 'interactiveCanvas', 'deterministicRandomSeed']);
assert.deepEqual(initialConditionModeOptions().map((option) => option.id), INITIAL_CONDITION_MODES);

const conwayFixtures = exampleInitialConditionFixtureOptions('conwayGameOfLife').map((option) => option.id);
for (const id of ['default', 'block', 'blinker', 'glider', 'mixedTeachingSeed', 'randomDeterministic']) {
  assert.ok(conwayFixtures.includes(id), `Conway fixture list should include ${id}`);
}

const conwayModel = createExampleInitialConditionEditModel('conwayGameOfLife', { width: 24, height: 16 });
const conwayEdited = assignExampleInitialConditionCell(conwayModel, 'conwayGameOfLife', { col: 3, row: 3 }, {
  state: 'active',
  ruleId: 'diffusiveSpread',
  sourceValue: 1
});
const conwayBuild = buildExampleInitialConditionLayers('conwayGameOfLife', {
  mode: 'interactiveCanvas',
  fixtureId: 'blinker',
  editModel: conwayEdited,
  brushState: 'active',
  generationIndex: 0
});
assert.equal(conwayBuild.metadata.mode, 'interactiveCanvas');
assert.equal(conwayBuild.metadata.fixtureId, 'blinker');
assert.equal(conwayBuild.metadata.editedCellCount, 1);
assert.equal(conwayBuild.metadata.interactiveCanvasUsed, true);
assert.equal(conwayBuild.layers.ruleLayer[3][3], 'localBirthDeath', 'initial-condition editor must not allow arbitrary rule ids');
assert.equal(initialConditionMatchesFixture(conwayEdited), false);

const blinker = buildExampleInitialConditionLayers('conwayGameOfLife', { fixtureId: 'blinker' });
const stepped = stepSamplingProcess({
  ...blinker.layers,
  width: blinker.layers.width,
  height: blinker.layers.height,
  globalRuleId: 'localBirthDeath',
  time: 1,
  dt: 1,
  seed: 'initial-condition-smoke'
});
assert.ok(stepped.stateCounts.active >= 3, 'Blinker should remain active after one deterministic generation');

const forestPalette = exampleInitialConditionBrushPalette('forestFire').map((brush) => brush.id);
for (const id of ['susceptible', 'active', 'cooling', 'consumed', 'inactive']) assert.ok(forestPalette.includes(id), `Forest Fire palette missing ${id}`);
const sirPalette = exampleInitialConditionBrushPalette('sirEpidemicCa').map((brush) => brush.id);
for (const id of ['susceptible', 'active', 'recovering', 'inactive']) assert.ok(sirPalette.includes(id), `SIR palette missing ${id}`);
const wirePalette = exampleInitialConditionBrushPalette('wireworld').map((brush) => brush.id);
for (const id of ['empty', 'conductor', 'signal', 'refractory']) assert.ok(wirePalette.includes(id), `Wireworld palette missing ${id}`);

const randomA = buildExampleInitialConditionLayers('riverPlumeFront', { mode: 'deterministicRandomSeed', seed: 'same-seed' });
const randomB = buildExampleInitialConditionLayers('riverPlumeFront', { mode: 'deterministicRandomSeed', seed: 'same-seed' });
assert.equal(randomA.metadata.fixtureId, 'randomDeterministic');
assert.deepEqual(randomA.layers.stateLayer, randomB.layers.stateLayer, 'deterministic random initial state should be reproducible');
assert.ok(randomA.validation.metrics.meaningfulCellCount > 0, 'deterministic random initial state should not be empty');

const riverPalette = exampleInitialConditionBrushPalette('riverPlumeFront').map((brush) => brush.id);
assert.ok(riverPalette.includes('source'), 'River plume palette should include source brush');
assert.ok(riverPalette.includes('active'), 'River plume palette should include front/active brush');
assert.match(initialConditionGuidanceForExample('riverPlumeFront').note, /not physical advection|simplified event-layer/i);

for (const example of [...FOUNDATIONAL_CA_MODELS, ...OCEAN_RELEVANT_PROCESS_ANALOGS]) {
  const fixtureOptions = exampleInitialConditionFixtureOptions(example);
  const palette = exampleInitialConditionBrushPalette(example);
  const build = buildExampleInitialConditionLayers(example, { fixtureId: 'default', seed: 'coverage-smoke' });
  assert.ok(fixtureOptions.some((option) => option.id === 'default'), `${example.id} should expose a default fixture`);
  assert.ok(fixtureOptions.some((option) => option.id === 'randomDeterministic'), `${example.id} should expose deterministic random fixture`);
  assert.ok(palette.length >= 2, `${example.id} should expose an editable brush palette`);
  assert.notEqual(build.validation.status, 'FAIL', `${example.id} default initial condition should validate`);
  assert.ok(build.metadata.fixtureId, `${example.id} metadata should include fixture id`);
  assert.ok(Object.hasOwn(build.metadata, 'editedCellCount'), `${example.id} metadata should include edited cell count`);
  assert.ok(Object.hasOwn(build.metadata, 'brushState'), `${example.id} metadata should include brush state`);
  assert.ok(Object.hasOwn(build.metadata, 'generationIndexAtExport'), `${example.id} metadata should include generation index`);
}

console.log('smoke_sampling_process_initial_condition_editor: ok');
