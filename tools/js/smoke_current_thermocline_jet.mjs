import { assert, applyVerticalProfileToVector } from './current_vertical_structure_test_helpers.mjs';
const params = { thermoclineJetStrength: 0.1, thermoclineJetWidthMeters: 18 };
const surface = applyVerticalProfileToVector({ profileFamily: 'thermoclineJet', u: 0.05, v: 0.05, depthMeters: 0, bottomDepthMeters: 240, parameters: params, verticalStructure: { thermoclineDepthMeters: 35, parameters: params } });
const thermo = applyVerticalProfileToVector({ profileFamily: 'thermoclineJet', u: 0.05, v: 0.05, depthMeters: 35, bottomDepthMeters: 240, parameters: params, verticalStructure: { thermoclineDepthMeters: 35, parameters: params } });
const deep = applyVerticalProfileToVector({ profileFamily: 'thermoclineJet', u: 0.05, v: 0.05, depthMeters: 120, bottomDepthMeters: 240, parameters: params, verticalStructure: { thermoclineDepthMeters: 35, parameters: params } });
const mag = (x) => Math.hypot(x.u, x.v);
assert.ok(mag(thermo) > mag(surface));
assert.ok(mag(thermo) > mag(deep));
console.log('smoke_current_thermocline_jet: ok', { surface: mag(surface), thermocline: mag(thermo), deep: mag(deep) });