import assert from 'node:assert/strict';
import { productionContentManifestSummary, validateProductionContentManifest } from '../../src/app/parity/LegacyProductionContentManifest.js';

const validation = validateProductionContentManifest();
assert.equal(validation.valid, true, validation.errors.join('\n'));
console.log('smoke_legacy_production_content_manifest: ok', productionContentManifestSummary());
