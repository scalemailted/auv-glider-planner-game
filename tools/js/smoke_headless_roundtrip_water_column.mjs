import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessRoundtripSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const packet = JSON.parse(fs.readFileSync('tools/js/examples/sample_solver_packet.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('tools/js/examples/sample_headless_roundtrip_plan.json', 'utf8'));
packet.waterColumnConfig = {
  type: 'anchor.science.water-column-config',
  depthLayerIds: ['surface', 'thermocline', 'deep'],
  defaultLayerIds: ['surface', 'thermocline', 'deep'],
  diveProfileId: 'sawtoothProfile'
};
packet.planningData = { ...(packet.planningData ?? {}), waterColumnConfig: packet.waterColumnConfig, hiddenTruthIncluded: false, forecastAvailable: true };
plan.diveProfileId = 'sawtoothProfile';
for (const agentPlan of plan.agentPlans ?? []) agentPlan.diveProfileId = 'sawtoothProfile';

const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
  seed: 'p11-roundtrip-smoke',
  outputDir: 'tmp/p11-roundtrip-smoke',
  includeHiddenTruth: false
});
roundtrip.episode.roundtripReport = roundtrip.report;
const combined = createHeadlessCombinedBundle(roundtrip.episode, { includeHiddenTruth: false, combinedJson: true, roundtripReport: roundtrip.report });
const loaded = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: combined }]);
const artifact = buildBrowserHeadlessRoundtripSummaryArtifact(loaded);

assert.equal(roundtrip.report.summary.status, 'PASS');
assert.equal(roundtrip.report.waterColumnSummary.type, 'anchor.headless.water-column-summary');
assert.equal(artifact.waterColumnSummary.present, true);
assert.equal(artifact.waterColumnSummary.usesFull3DPlanning, false);
assert.equal(artifact.usesPythonSimulator, false);
assert.equal(artifact.usesNewPlanner, false);
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false);

console.log('smoke_headless_roundtrip_water_column: ok', {
  profile: artifact.waterColumnSummary.diveProfileId,
  coverage: artifact.waterColumnSummary.verticalCoverage
});
