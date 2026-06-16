import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';
import { createHeadlessCombinedBundle } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { buildBrowserHeadlessRoundtripSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

const packet = JSON.parse(fs.readFileSync('tools/js/examples/sample_solver_packet.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('tools/js/examples/sample_headless_roundtrip_plan.json', 'utf8'));
const roundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, {
  outputDir: 'tmp/p9-roundtrip-smoke',
  includeHiddenTruth: false,
  createdAt: '2026-06-16T00:00:00.000Z'
});
assert.equal(roundtrip.report.scienceDiagnosticsSummary.present, true, 'roundtrip report includes science diagnostics summary');
assert.equal(roundtrip.report.scienceDiagnosticsSummary.usesProductionDataAssimilation, false, 'roundtrip report does not claim production assimilation');
const bundlePayload = createHeadlessCombinedBundle(roundtrip.episode, { includeHiddenTruth: false, roundtripReport: roundtrip.report });
const bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: bundlePayload }]);
const artifact = buildBrowserHeadlessRoundtripSummaryArtifact(bundle);
assert.equal(artifact.scienceDiagnosisSummary.present, true, 'browser roundtrip summary exposes science diagnostics');
assert.equal(JSON.stringify(artifact).includes('T_hiddenTruth'), false, 'browser roundtrip summary omits hidden truth id');

console.log('smoke_headless_roundtrip_science_diagnostics: ok', { primary: artifact.scienceDiagnosisSummary.primaryDiagnosis });
