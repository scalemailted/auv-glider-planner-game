import { assert, applyVerticalProfileToVector } from './current_vertical_structure_test_helpers.mjs';
const shallow = applyVerticalProfileToVector({ profileFamily: 'linearVerticalShear', u: 0.1, v: 0.1, depthMeters: 0, bottomDepthMeters: 200, parameters: { linearShearUEast: -0.08, linearShearVNorth: 0.1 } });
const deep = applyVerticalProfileToVector({ profileFamily: 'linearVerticalShear', u: 0.1, v: 0.1, depthMeters: 180, bottomDepthMeters: 200, parameters: { linearShearUEast: -0.08, linearShearVNorth: 0.1 } });
assert.notEqual(shallow.u, deep.u);
assert.notEqual(shallow.v, deep.v);
console.log('smoke_current_linear_vertical_shear: ok', { shallow, deep });