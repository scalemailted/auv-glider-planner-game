import assert from 'node:assert/strict';
import {
  FOUNDATIONAL_CA_MODELS,
  OBSERVABLE_PROCESS_PATTERNS,
  SPATIOTEMPORAL_PROCESS_EXAMPLES,
  processExampleCoverageMatrix,
  spatiotemporalProcessExamplesByType
} from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';

console.log('Spatiotemporal Process Example Audit');

const ids = new Set();
const failures = [];
const warnings = [];

for (const example of SPATIOTEMPORAL_PROCESS_EXAMPLES) {
  if (ids.has(example.id)) failures.push(`duplicate id: ${example.id}`);
  ids.add(example.id);
  if (!example.label) failures.push(`${example.id}: missing label`);
  if (!example.exampleType) failures.push(`${example.id}: missing exampleType`);
  if (!example.ruleFamilyId) failures.push(`${example.id}: missing ruleFamilyId`);
  if (!example.referenceSignatureId) warnings.push(`${example.id}: no legacy referenceSignature mapping`);
  if (!example.implementationFidelity) failures.push(`${example.id}: missing implementationFidelity`);
  if (!Array.isArray(example.ruleStatement) || example.ruleStatement.length === 0) failures.push(`${example.id}: missing ruleStatement`);
  if (!example.localUpdateFunction) failures.push(`${example.id}: missing localUpdateFunction`);
  if (!example.globalUpdateFunction) failures.push(`${example.id}: missing globalUpdateFunction`);
  if (!example.qaExpectations) failures.push(`${example.id}: missing qaExpectations`);
  if (example.label.includes('Directed Drift / Transport')) failures.push(`${example.id}: deprecated visible Directed Drift / Transport label`);
}

assert.equal(spatiotemporalProcessExamplesByType('foundationalCaModel').length, FOUNDATIONAL_CA_MODELS.length);
assert.equal(spatiotemporalProcessExamplesByType('observableProcessPattern').length, OBSERVABLE_PROCESS_PATTERNS.length);

console.table(processExampleCoverageMatrix().map((row) => ({
  id: row.id,
  type: row.exampleType,
  rule: row.ruleFamilyId,
  fidelity: row.implementationFidelity,
  statement: row.hasRuleStatement,
  update: row.hasLocalUpdateFunction
})));

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS ${SPATIOTEMPORAL_PROCESS_EXAMPLES.length} process examples audited`);
}
