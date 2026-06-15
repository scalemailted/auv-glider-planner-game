import { FOUNDATIONAL_CA_MODELS, OCEAN_RELEVANT_PROCESS_ANALOGS } from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { evaluateSamplingProcessExampleBehavior } from '../../src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';

const examples = [...FOUNDATIONAL_CA_MODELS, ...OCEAN_RELEVANT_PROCESS_ANALOGS];
const failures = [];
const rows = [];

for (const example of examples) {
  const result = evaluateSamplingProcessExampleBehavior(example);
  rows.push({
    id: example.id,
    label: example.label,
    track: example.track,
    status: result.status,
    fixture: result.metrics.fixtureId,
    rule: result.metrics.ruleId,
    cells: result.metrics.initialMeaningfulCellCount,
    transitions: result.metrics.transitionCount,
    states: result.metrics.distinctStatesSeen.join('|')
  });
  if (result.status === 'FAIL') failures.push(`${example.id}: ${result.details.join('; ')}`);
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
    states: result.metrics.distinctStatesSeen.join('|')
  });
  if (result.status === 'FAIL') failures.push(`${fixtureId}: ${result.details.join('; ')}`);
}

console.log('Sampling process example behavior audit');
for (const row of rows) console.log(`${row.status.padEnd(4)} ${row.id.padEnd(42)} ${String(row.rule).padEnd(22)} cells=${String(row.cells).padStart(3)} transitions=${String(row.transitions).padStart(4)} states=${row.states}`);

if (failures.length) {
  console.error('Behavior audit failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('audit_sampling_process_example_behaviors: ok');
