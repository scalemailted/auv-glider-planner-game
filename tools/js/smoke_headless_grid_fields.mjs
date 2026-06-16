import assert from 'node:assert/strict';

import { createHeadlessFieldPack, headlessFieldPackSummary } from '../../src/core/headless/runtime/HeadlessFields.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessGrid, field3dStats, fieldShape, validateField3d } from '../../src/core/headless/runtime/HeadlessGrid.js';

const config = createDefaultHeadlessRuntimeConfig({ seed: 'h1-grid-fields-smoke', width: 16, height: 12 });
const grid = createHeadlessGrid(config);
assert.deepEqual(grid.shape, [3, 12, 16], 'grid shape');

const packA = createHeadlessFieldPack(config);
const packB = createHeadlessFieldPack(config);
assert.deepEqual(packA.fields.T_hiddenTruth, packB.fields.T_hiddenTruth, 'deterministic seed repeatability');

for (const fieldId of ['T_hiddenTruth', 'E_forecast', 'mu_belief', 'U_uncertainty', 'P_unknown', 'A_global', 'F_u', 'F_v', 'hazard', 'constraintMask', 'staleness', 'boundaryStrength']) {
  const field = packA.fields[fieldId];
  assert.equal(fieldShape(field).valid, true, `${fieldId} rectangular`);
  assert.deepEqual(fieldShape(field).shape, [3, 12, 16], `${fieldId} shape`);
  assert.equal(validateField3d(field, grid).status, 'PASS', `${fieldId} validates`);
  const stats = field3dStats(field);
  assert.equal(stats.invalidCount, 0, `${fieldId} finite`);
  assert.ok(stats.finiteCount > 0, `${fieldId} nonempty`);
}
assert.notDeepEqual(packA.fields.T_hiddenTruth, packA.fields.E_forecast, 'forecast differs from hidden truth');
assert.equal(packA.fieldVisibility.T_hiddenTruth, 'hiddenTruth', 'truth hidden');
assert.equal(packA.boundary.calibratedOceanForecast, false, 'not calibrated ocean forecast');

const summary = headlessFieldPackSummary(packA);
assert.equal(summary.allFinite, true, 'field pack finite');
assert.equal(summary.calibratedOceanForecast, false, 'summary preserves claim boundary');

console.log('Headless grid/fields smoke passed');
