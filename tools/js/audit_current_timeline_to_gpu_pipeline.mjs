import assert from 'node:assert/strict';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';

const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-pipeline-audit' });
const stages = [
  ['Planning timeline value', probe.tA, probe.tB, probe.firstVm.activeTimeSeconds !== probe.laterVm.activeTimeSeconds],
  ['Current presentation time', probe.first.currentPresentationTimeSeconds, probe.later.currentPresentationTimeSeconds, probe.first.currentPresentationTimeSeconds !== probe.later.currentPresentationTimeSeconds],
  ['Sampler source bracket fraction', probe.firstSample.timeInterpolationFraction, probe.laterSample.timeInterpolationFraction, probe.interpolationFractionChanged],
  ['Canonical sampled U/V', [probe.firstSample.uEastMetersPerSecond, probe.firstSample.vNorthMetersPerSecond], [probe.laterSample.uEastMetersPerSecond, probe.laterSample.vNorthMetersPerSecond], probe.sampleDelta > 1e-5],
  ['Render sample digest', probe.first.currentDataDigest, probe.later.currentDataDigest, probe.first.currentDataDigest !== probe.later.currentDataDigest],
  ['Glyph direction digest', probe.first.currentDirectionDigest, probe.later.currentDirectionDigest, probe.first.currentDirectionDigest !== probe.later.currentDirectionDigest],
  ['Instance matrix digest', probe.first.currentMatrixDigest, probe.later.currentMatrixDigest, probe.first.currentMatrixDigest !== probe.later.currentMatrixDigest],
  ['Three upload counter', probe.repeated.glyphBufferUpdateCount, probe.later.glyphBufferUpdateCount, probe.later.glyphBufferUpdateCount > probe.repeated.glyphBufferUpdateCount]
];
for (const [stage, a, b, changed] of stages) assert.equal(changed, true, `${stage} must change between tested current times (${JSON.stringify(a)} -> ${JSON.stringify(b)})`);
assert.equal(probe.currentFieldDigestStable, true, 'time-only current presentation does not rebuild or mutate current cube digest');
assert.equal(probe.firstVm.planningTimelineTimeBridge?.conversionApplied, true, 'Planning helper uses the visible Planning-hour to current-seconds bridge');
assert.equal(probe.firstVm.currentPresentationTimeSeconds, probe.firstVm.planningTimelineTimeBridge?.missionTimelineTimeSeconds, 'current presentation seconds match bridged mission timeline seconds');
console.log('[audit_current_timeline_to_gpu_pipeline] PASS', { stages: stages.map(([stage]) => stage), bridge: probe.firstVm.planningTimelineTimeBridge });
