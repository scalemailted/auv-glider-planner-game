import assert from 'node:assert/strict';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';

const episode = runHeadlessMission({ seed: 'env-r1-headless', width: 14, height: 9, motionAware: true, bathymetry: true });
assert.equal(episode.bathymetrySummary?.type, 'anchor.headless.bathymetry-summary');
assert.equal(episode.bathymetrySummary.publicSafe, true);
assert.equal(episode.bathymetrySummary.hiddenTruthIncluded, false);
assert.ok(episode.waterColumnSummary);
assert.ok(episode.motionTrajectory);
assert.ok(episode.missionGeometrySummary?.surfaceWaypointCount > 0);
const publicBundle = createHeadlessCombinedBundle(episode, { includeHiddenTruth: false });
assert.ok(publicBundle.bathymetrySummary);
assert.ok(publicBundle.missionGeometrySummary);
assert.equal(publicBundle.bathymetrySummary.environmentalGeometry, true);
assert.equal(JSON.stringify(publicBundle.visibleFields).includes('T_hiddenTruth'), false);
assert.ok(publicBundle.waterColumnSummary);
assert.ok(publicBundle.motionDiagnostics);
console.log('smoke_headless_bathymetry_runtime: ok');