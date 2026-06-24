import assert from 'node:assert/strict';
import { createBarotropicControlField, createDepthStructuredField } from './current_vertical_structure_test_helpers.mjs';
const mixed = createDepthStructuredField();
assert.equal(mixed.scientificDiagnostics.copiedLayerDetected, false);
assert.ok(mixed.scientificDiagnostics.depthLayerDigestCount > 1);
const barotropic = createBarotropicControlField();
assert.equal(barotropic.sourceMetadata.barotropicControl, true);
console.log('audit_current_no_unintended_depth_copy: ok', { mixedDigestCount: mixed.scientificDiagnostics.depthLayerDigestCount, barotropicControl: true });