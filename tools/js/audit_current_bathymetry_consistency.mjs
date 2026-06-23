import assert from 'node:assert/strict';
import { buildFlowR2A5CurrentDynamicsMetrics } from './flow_r2a5_current_dynamics_helpers.mjs';
const m = buildFlowR2A5CurrentDynamicsMetrics();
assert.equal(m.diagnostics.landVectorCount, 0, 'no current on land');
assert.equal(m.diagnostics.belowBottomVectorCount, 0, 'no current below seabed');
assert.ok(m.diagnostics.alongIsobathFraction > m.diagnostics.crossIsobathFraction, 'domain is not generic downhill cross-isobath flow');
assert.ok(m.diagnostics.coastlineNormalSpeedRms <= 0.035, 'coastline normal speed is bounded');
console.log('[audit_current_bathymetry_consistency] PASS', { along: m.diagnostics.alongIsobathFraction, cross: m.diagnostics.crossIsobathFraction });
