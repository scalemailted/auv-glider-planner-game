import { assert, createDepthStructuredField, fixedColumnDepthAudit } from './current_vertical_structure_test_helpers.mjs';
const field = createDepthStructuredField();
const audit = fixedColumnDepthAudit(field, { columnCount: 10 });
assert.ok(audit.records.length >= 10);
assert.ok(audit.materiallyDistinctFraction >= 0.5);
assert.equal(audit.copiedLayerDetected, false);
console.log('smoke_current_fixed_column_depth_distinctness: ok', { records: audit.records.length, materiallyDistinctFraction: audit.materiallyDistinctFraction, digestCount: audit.canonicalLayerDigestCount });