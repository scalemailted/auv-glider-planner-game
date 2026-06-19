import assert from 'node:assert/strict';
import { makeVolumetricViewModel, assertFiniteNumber } from './water_column_smoke_helpers.mjs';

const model = makeVolumetricViewModel({ selectedCell: { x: 2, y: 2 }, activeDepthLayerId: 'thermocline' });
const cell = model.selectedDepthCell;
assert.equal(cell.x, 2);
assert.equal(cell.y, 2);
assert.equal(cell.depthLayerId, 'thermocline');
assert.equal(cell.publicSafe, true);
assert.equal(cell.hiddenTruthIncluded, false);
assertFiniteNumber(cell.localBottomDepthMeters, 'Selected depth inspection should include finite bottom depth.');
assertFiniteNumber(cell.currentU, 'Selected depth inspection should include finite current U.');
console.log(JSON.stringify({ ok: true, selectedDepthCell: cell }));
