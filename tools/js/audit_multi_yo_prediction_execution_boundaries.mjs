import assert from 'node:assert/strict';
import fs from 'node:fs';
const predictor = fs.readFileSync('src/core/rendering/PlannedDiveSegmentViewModel.js', 'utf8');
const executor = fs.readFileSync('src/core/sim/GliderDiveStateMachine.js', 'utf8');
assert.match(predictor, /triangular/, 'prediction uses triangular cycle shape');
assert.match(executor, /triangularCycle/, 'execution uses triangular cycle shape');
assert.match(executor, /operationallyCalibrated: false/, 'educational model is not operationally calibrated');
console.log(JSON.stringify({ ok: true }));