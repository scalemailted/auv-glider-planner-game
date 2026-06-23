import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-glyph-attrs' });
assert.notEqual(probe.first.currentDirectionDigest, probe.later.currentDirectionDigest, 'direction digest changes with current time');
assert.notEqual(probe.first.currentMagnitudeDigest, probe.later.currentMagnitudeDigest, 'magnitude digest changes with current time');
assert.ok(probe.later.currentDirectionAttributeVersion > probe.repeated.currentDirectionAttributeVersion, 'direction attribute version increments after time update');
assert.ok(probe.later.currentMagnitudeAttributeVersion > probe.repeated.currentMagnitudeAttributeVersion, 'magnitude attribute version increments after time update');
console.log('[smoke_current_glyph_attribute_updates] PASS', { directionVersion: probe.later.currentDirectionAttributeVersion, magnitudeVersion: probe.later.currentMagnitudeAttributeVersion });