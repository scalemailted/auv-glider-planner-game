import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessSolverPacketRoundtrip, validateSolverPacketVisibility } from '../../src/core/headless/HeadlessRoundtrip.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const packet = JSON.parse(fs.readFileSync('tools/js/examples/sample_solver_packet.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('tools/js/examples/sample_headless_roundtrip_plan.json', 'utf8'));

const visibility = validateSolverPacketVisibility({ packet }, { oracle: false });
assert.equal(visibility.ok, true, 'sample packet is public-safe');
assert.equal(visibility.hiddenTruthIncluded, false, 'sample packet does not expose hidden truth');

const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
  outputDir: 'tmp/h3-smoke',
  includeHiddenTruth: false,
  createdAt: '2026-06-16T00:00:00.000Z'
});
assert.equal(roundtrip.visibilityValidation.status, 'PASS', 'visibility validation passes');
assert.equal(roundtrip.planValidation.status, 'PASS', 'plan validation passes');
assert.equal(roundtrip.runtimePlan.gliderId, 'glider_01', 'agent plan adapts to runtime glider id');
assert.equal(roundtrip.runtimePlan.generatesRoute, false, 'roundtrip executes submitted plan, not generated route');
assert.equal(roundtrip.report.type, 'anchor.headless.solver-roundtrip-report', 'roundtrip report type');
assert.equal(roundtrip.report.runtime.usesNewPlanner, false, 'roundtrip does not add a planner');
assert.equal(roundtrip.report.runtime.usesPythonSimulator, false, 'roundtrip does not use Python simulator');
assert.equal(roundtrip.report.runtime.usesBrowserOfficialScoring, false, 'roundtrip score is not official browser score');
assert.equal(roundtrip.report.hiddenTruthLeakCheck.publicBundleShouldOmitHiddenFields, true, 'public bundle should omit hidden fields');
assert.equal(roundtrip.episode.observations.length > 0, true, 'roundtrip produced observations');
assert.equal(roundtrip.episode.tracks.length > 0, true, 'roundtrip produced tracks');
assert.equal(Number.isFinite(roundtrip.episode.scoreReport.finalScore), true, 'roundtrip produced a finite score');

const combined = createHeadlessCombinedBundle(roundtrip.episode, { includeHiddenTruth: false, roundtripReport: roundtrip.report });
assert.equal(combined.hiddenFields, null, 'public combined bundle omits hiddenFields');
assert.equal(Object.hasOwn(combined.visibleFields.fields, 'T_hiddenTruth'), false, 'public visible fields exclude T_hiddenTruth');
assert.equal(combined.roundtripReport.type, 'anchor.headless.solver-roundtrip-report', 'combined bundle embeds roundtrip report');
const loaded = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: combined }]);
assert.deepEqual(loaded.failures, [], 'loader accepts roundtrip combined bundle');
assert.equal(loaded.roundtripReport.type, 'anchor.headless.solver-roundtrip-report', 'loader preserves roundtrip report');
const artifact = buildBrowserHeadlessBundleSummaryArtifact(loaded);
assert.equal(artifact.type, 'anchor.browser.headless-bundle-summary', 'browser summary artifact type');
assert.equal(artifact.roundtripSummary.status, 'PASS', 'browser summary exposes roundtrip status');
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false, 'public browser summary omits T_hiddenTruth');

console.log('Headless solver-packet roundtrip adapter smoke passed', {
  packetId: roundtrip.report.source.packetId,
  planId: roundtrip.report.source.planId,
  finalScore: roundtrip.report.summary.finalScore,
  observations: roundtrip.report.summary.observationCount,
  tracks: roundtrip.report.summary.trackPointCount
});