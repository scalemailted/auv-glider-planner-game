import { assert } from './current_package_test_helpers.mjs';
import * as packageCurrents from '../../packages/currents/src/index.js';
import * as legacyField from '../../src/core/science/OceanCurrentField4D.js';
import * as legacySampler from '../../src/core/science/OceanCurrentFieldSampler.js';
import * as legacyMetadata from '../../src/core/science/OceanCurrentSourceMetadata.js';

const packageField = packageCurrents.createCurrentField4D({ id: 'forwarder-current-field' });
const legacyFieldValue = legacyField.createOceanCurrentField4D({ id: 'forwarder-current-field' });
assert.equal(legacyFieldValue.digest, packageField.digest);
const packageSample = packageCurrents.sampleOceanCurrent(packageField, 0, 0, 0, 0);
const legacySample = legacySampler.sampleOceanCurrent(legacyFieldValue, 0, 0, 0, 0);
assert.deepEqual(legacySample, packageSample);
const packageMetadata = packageCurrents.createOceanCurrentSourceMetadata({ sourceId: 'forwarder-current-source' });
const legacyMetadataValue = legacyMetadata.normalizeOceanCurrentSourceMetadata({ sourceId: 'forwarder-current-source' });
assert.deepEqual(legacyMetadataValue, packageMetadata);
console.log('smoke_current_package_forwarders: ok', { digest: packageField.digest });