import { assert, applyVerticalProfileToVector } from './current_vertical_structure_test_helpers.mjs';
const mid = applyVerticalProfileToVector({ profileFamily: 'bottomBoundaryDecay', u: 0.2, v: 0, depthMeters: 80, bottomDepthMeters: 180, parameters: { bottomBoundaryThicknessMeters: 50, bottomBoundaryMinimumScale: 0.2 } });
const nearBottom = applyVerticalProfileToVector({ profileFamily: 'bottomBoundaryDecay', u: 0.2, v: 0, depthMeters: 170, bottomDepthMeters: 180, parameters: { bottomBoundaryThicknessMeters: 50, bottomBoundaryMinimumScale: 0.2 } });
assert.ok(Math.hypot(nearBottom.u, nearBottom.v) < Math.hypot(mid.u, mid.v));
console.log('smoke_current_bottom_boundary_decay: ok', { midSpeed: Math.hypot(mid.u, mid.v), nearBottomSpeed: Math.hypot(nearBottom.u, nearBottom.v) });