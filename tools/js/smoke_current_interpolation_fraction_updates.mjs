import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-interpolation' });
assert.equal(probe.sameSourceBracket, true, 'test times remain inside one source-time bracket');
assert.equal(probe.interpolationFractionChanged, true, 'time interpolation fraction changes inside the bracket');
assert.ok(probe.sampleDelta > 1e-5, 'canonical U/V changes inside a source-time bracket');
assert.notEqual(probe.first.currentDataDigest, probe.later.currentDataDigest, 'render current digest changes inside a source-time bracket');
console.log('[smoke_current_interpolation_fraction_updates] PASS', { lower: probe.firstSample.lowerTimeSeconds, upper: probe.firstSample.upperTimeSeconds, fractions: [probe.firstSample.timeInterpolationFraction, probe.laterSample.timeInterpolationFraction], sampleDelta: probe.sampleDelta });