import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const specPath = 'tests/e2e/flow_runtime_r1_1_manual_planning_timeline.spec.js';
const source = readFileSync(specPath, 'utf8');
const forbidden = [
  /setPlanningTime\s*\(/,
  /setTimelineFrame\s*\(/,
  /state\.planningTime\s*=/,
  /anchorGame\.state\.planningTime/,
  /ANCHOR_PLANNING_CURRENT_TRANSACTION_DEBUG\s*=/,
  /ANCHOR_PLANNING_TIMELINE_DEBUG\s*=/
];
for (const pattern of forbidden) {
  assert.doesNotMatch(source, pattern, `${specPath} must not mutate Planning current time through ${pattern}`);
}
for (const title of [
  'Visible Planning Next Button Updates Current Vectors',
  'Visible Planning Start Prev Next and End Share One Time Authority',
  'Visible Planning Timeline Input Updates Current Vectors',
  'Planning Current Test Does Not Use a Direct Time Mutation',
  'Manual Planning Current Workflow Runs From GitHub Pages Subpath',
  'FLOW-RUNTIME-R1.1 Full Headed Manual Planning Timeline Walkthrough'
]) {
  assert.ok(source.includes(`test('${title}'`), `missing exact test title: ${title}`);
}
console.log('[audit_no_direct_time_mutation_in_current_e2e] PASS');
