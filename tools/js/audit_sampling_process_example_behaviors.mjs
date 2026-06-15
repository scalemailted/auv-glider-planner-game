import { FOUNDATIONAL_CA_MODELS, OCEAN_RELEVANT_PROCESS_ANALOGS } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { evaluateSamplingProcessExampleBehavior } from '../../src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';
import {
  buildExampleInitialConditionLayers,
  exampleInitialConditionBrushPalette,
  exampleInitialConditionFixtureOptions,
  isExampleInitialConditionEditorSupported
} from '../../src/core/demo/sampling/SamplingProcessInitialConditionEditor.js';

const examples = [...FOUNDATIONAL_CA_MODELS, ...OCEAN_RELEVANT_PROCESS_ANALOGS];
const failures = [];
const rows = [];

for (const example of examples) {
  const result = evaluateSamplingProcessExampleBehavior(example);
  const fixtureOptions = exampleInitialConditionFixtureOptions(example);
  const palette = exampleInitialConditionBrushPalette(example);
  const initialCondition = buildExampleInitialConditionLayers(example, { fixtureId: 'default' });
  rows.push({
    id: example.id,
    label: example.label,
    track: example.track,
    status: result.status,
    fixture: result.metrics.fixtureId,
    rule: result.metrics.ruleId,
    cells: result.metrics.initialMeaningfulCellCount,
    transitions: result.metrics.transitionCount,
    states: result.metrics.distinctStatesSeen.join('|'),
    initialConditionStatus: initialCondition.validation.status,
    fixtureOptionCount: fixtureOptions.length,
    brushCount: palette.length,
    interactive: isExampleInitialConditionEditorSupported(example)
  });
  if (result.status === 'FAIL') failures.push(`${example.id}: ${result.details.join('; ')}`);
  if (!isExampleInitialConditionEditorSupported(example)) failures.push(`${example.id}: interactive initial-condition support missing`);
  if (!fixtureOptions.some((option) => option.id === 'default')) failures.push(`${example.id}: default fixture option missing`);
  if (!fixtureOptions.some((option) => option.id === 'randomDeterministic')) failures.push(`${example.id}: deterministic random fixture option missing`);
  if (palette.length < 2) failures.push(`${example.id}: brush palette is too small`);
  if (initialCondition.validation.status === 'FAIL') failures.push(`${example.id}: initial condition validation failed`);
}

for (const fixtureId of ['conwayGameOfLife:block', 'conwayGameOfLife:blinker', 'conwayGameOfLife:glider']) {
  const result = evaluateSamplingProcessExampleBehavior('conwayGameOfLife', { fixtureId });
  rows.push({
    id: fixtureId,
    label: result.metrics.fixtureLabel,
    track: 'foundationalCaModels',
    status: result.status,
    fixture: result.metrics.fixtureId,
    rule: result.metrics.ruleId,
    cells: result.metrics.initialMeaningfulCellCount,
    transitions: result.metrics.transitionCount,
    states: result.metrics.distinctStatesSeen.join('|'),
    initialConditionStatus: 'PASS',
    fixtureOptionCount: 6,
    brushCount: 2,
    interactive: true
  });
  if (result.status === 'FAIL') failures.push(`${fixtureId}: ${result.details.join('; ')}`);
}

console.log('Sampling process example behavior audit');
for (const row of rows) {
  console.log(`${row.status.padEnd(4)} ${row.id.padEnd(42)} ${String(row.rule).padEnd(22)} cells=${String(row.cells).padStart(3)} transitions=${String(row.transitions).padStart(4)} states=${row.states} fixtures=${row.fixtureOptionCount} brushes=${row.brushCount} interactive=${row.interactive} ic=${row.initialConditionStatus}`);
}

if (failures.length) {
  console.error('Behavior audit failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('audit_sampling_process_example_behaviors: ok');
