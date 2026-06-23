import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-planning-time' });
assert.equal(probe.firstVm.currentPresentationTimeSeconds, probe.tA, 'planning timeline reaches currentPresentationTimeSeconds');
assert.equal(probe.firstVm.waterColumnExplorer.activeTimeSeconds, probe.tA, 'planning timeline reaches water-column explorer sampler time');
assert.equal(probe.first.currentPresentationTimeSeconds, probe.tA, 'glyph summary records planning current time');
assert.ok(probe.sampleDelta > 1e-5, 'canonical U/V changes across planning timeline');
assert.notEqual(probe.firstSourceTimeFrameSignature, probe.laterSourceTimeFrameSignature, 'source-time frame signature changes with planning time');
console.log('[smoke_current_planning_time_binding] PASS', { tA: probe.tA, tB: probe.tB, sampleDelta: probe.sampleDelta });