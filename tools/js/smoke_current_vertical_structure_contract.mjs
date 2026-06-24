import { assert, createCurrentVerticalStructureDescriptor } from './current_vertical_structure_test_helpers.mjs';
import { CURRENT_VERTICAL_PROFILE_FAMILIES, CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION } from '../../packages/currents/src/index.js';

const descriptor = createCurrentVerticalStructureDescriptor({ id: 'mixedRegionalBaroclinicV1' });
assert.equal(descriptor.version, CURRENT_VERTICAL_PROFILE_CONTRACT_VERSION);
for (const family of ['barotropicDepthUniform', 'surfaceIntensifiedExponential', 'linearVerticalShear', 'thermoclineJet', 'bottomBoundaryDecay']) {
  assert.ok(CURRENT_VERTICAL_PROFILE_FAMILIES.includes(family), `missing profile family ${family}`);
}
assert.equal(descriptor.claimBoundary.includes('Not a calibrated ocean forecast'), true);
console.log('smoke_current_vertical_structure_contract: ok', { id: descriptor.id, profileFamilies: descriptor.profileFamilies });