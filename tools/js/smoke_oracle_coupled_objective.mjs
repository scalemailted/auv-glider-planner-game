import assert from 'node:assert/strict';
import { computeOracleSamplingObjective } from '../../src/core/demo/coupled/OracleCoupledObjective.js';
import { validateCoupledOracleObjective } from '../../src/core/demo/coupled/CoupledProcessValidation.js';
import { createGrid, fieldDifference, fieldStats, gradientMagnitude } from '../../src/core/demo/coupled/CoupledFieldMath.js';

const processField = createGrid(12, 8, (col, row) => Math.exp(-(((col - 6) ** 2 + (row - 4) ** 2) / 12)));
const futureProcessField = createGrid(12, 8, (col, row) => Math.exp(-(((col - 7) ** 2 + (row - 4) ** 2) / 12)));
const gradient = gradientMagnitude(processField);
const constraintMask = createGrid(12, 8, (col) => (col < 3 ? 0 : 1));
const hazardField = createGrid(12, 8, (col, row) => (row > 5 ? 0.4 : 0));

const objective = computeOracleSamplingObjective({
  processField,
  futureProcessField,
  gradientStrength: gradient,
  boundaryStrength: gradient,
  constraintMask,
  hazardField,
  objectiveWeights: {
    value: 0.35,
    gradient: 0.35,
    future: 0.25,
    constraint: 0.9,
    hazard: 0.3
  }
});

assert.equal(objective.field.length, processField.length, 'objective output height matches process field');
assert.equal(objective.field[0].length, processField[0].length, 'objective output width matches process field');
assert.ok(objective.field.flat().every((value) => Number.isFinite(value) && value >= 0 && value <= 1), 'objective is finite and bounded');
assert.equal(validateCoupledOracleObjective(objective).status, 'PASS', 'objective validation passes');
assert.ok(objective.field.every((row) => row[0] === 0 && row[1] === 0 && row[2] === 0), 'constraint mask suppresses objective');
assert.ok(fieldStats(objective.components.gradientStrength).max > 0, 'gradient component contributes');
assert.ok(fieldStats(fieldDifference(objective.field, processField)).mean > 0.001, 'objective differs from process field when extra components are enabled');
assert.equal(objective.metadata.deterministic, true, 'objective metadata marks deterministic');
assert.equal(objective.metadata.usesBelief, false, 'objective metadata excludes belief');
assert.equal(objective.metadata.usesUncertainty, false, 'objective metadata excludes uncertainty');
assert.equal(objective.metadata.usesHiddenTruth, false, 'objective metadata excludes hidden truth');

console.log('Oracle coupled objective smoke passed');
