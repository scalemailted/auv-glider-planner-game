import { assert } from './current_r2a3_test_helpers.mjs';
import { manufacturedCurrentFieldCatalog } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';

const catalog = manufacturedCurrentFieldCatalog();
const ids = catalog.map((entry) => entry.id);
for (const id of ['uniformTranslation', 'linearShearWithDepth', 'oscillatingTide', 'solidBodyEddy', 'translatingEddy', 'depthShearedEddy']) assert.ok(ids.includes(id), `missing ${id}`);
assert.equal(catalog.every((entry) => entry.equation && entry.parameters), true);
console.log('[smoke_manufactured_current_catalog] PASS', ids);
