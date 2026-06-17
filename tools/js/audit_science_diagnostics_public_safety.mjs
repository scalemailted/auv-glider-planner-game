import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildBrowserHeadlessBundleSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function assertSciencePublicSafe(bundle, label) {
  const diagnostics = bundle.scienceDiagnostics ?? bundle.episode?.scienceDiagnostics ?? null;
  assert.ok(diagnostics, `${label} has science diagnostics`);
  assert.equal(diagnostics.publicSafe, true, `${label} science diagnostics publicSafe`);
  assert.equal(diagnostics.hiddenTruthIncluded, false, `${label} science diagnostics hiddenTruthIncluded false`);
  assert.equal(JSON.stringify(diagnostics).includes('T_hiddenTruth'), false, `${label} science diagnostics must not include T_hiddenTruth payload`);
  const browserSummary = buildBrowserHeadlessBundleSummaryArtifact(bundle);
  assert.equal(browserSummary.scienceDiagnosisSummary.publicSafe, true, `${label} browser summary public safe`);
  assert.equal(browserSummary.scienceDiagnosisSummary.hiddenTruthIncluded, false, `${label} browser summary no hidden truth`);
}

assertSciencePublicSafe(readJson('docs/examples/headless_oceanbox_js_public_bundle.example.json'), 'public fixture');
assertSciencePublicSafe(readJson('docs/examples/headless_solver_roundtrip_bundle.example.json'), 'roundtrip fixture');

console.log('audit_science_diagnostics_public_safety: ok');