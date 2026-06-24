import { assert, applyVerticalProfileToVector } from './current_vertical_structure_test_helpers.mjs';
const surface = applyVerticalProfileToVector({ profileFamily: 'surfaceIntensifiedExponential', u: 0.3, v: 0, depthMeters: 0, bottomDepthMeters: 250, parameters: { surfaceDecayMeters: 60, surfaceDeepFloor: 0.3 } });
const deep = applyVerticalProfileToVector({ profileFamily: 'surfaceIntensifiedExponential', u: 0.3, v: 0, depthMeters: 150, bottomDepthMeters: 250, parameters: { surfaceDecayMeters: 60, surfaceDeepFloor: 0.3 } });
assert.ok(Math.hypot(surface.u, surface.v) > Math.hypot(deep.u, deep.v));
console.log('smoke_current_surface_intensified_profile: ok', { surfaceSpeed: Math.hypot(surface.u, surface.v), deepSpeed: Math.hypot(deep.u, deep.v) });