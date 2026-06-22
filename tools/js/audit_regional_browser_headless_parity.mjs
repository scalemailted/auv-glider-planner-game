import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createRegionalMissionBundle } from '../../src/core/generation/RegionalMissionDefaults.js';
import { buildMissionWorldRenderViewModel, validateMissionWorldRenderViewModel } from '../../src/core/rendering/MissionWorldRenderViewModel.js';

const first = createRegionalMissionBundle({ seed: 'world-r1-parity' });
const second = createRegionalMissionBundle({ seed: 'world-r1-parity' });
assert.equal(JSON.stringify(first.compactExport.fieldDigests), JSON.stringify(second.compactExport.fieldDigests), 'same seed should produce same compact field digests');

const browserClone = JSON.parse(JSON.stringify(first.compactExport));
assert.deepEqual(browserClone.counts, first.compactExport.counts, 'compact export must JSON roundtrip cleanly');
const viewModel = buildMissionWorldRenderViewModel({ level: first.level, mission: first.mission });
const validation = validateMissionWorldRenderViewModel(viewModel);
assert.equal(validation.valid, true, validation.errors.join('; '));
assert.equal(validation.summary.operationalDomainId, first.level.operationalDomain.domainId);
assert.equal(validation.summary.resolutionProfileId, first.level.resolutionProfile.profileId);

for (const file of ['src/core/domain/OperationalDomainSpec.js', 'src/core/domain/MultiResolutionFieldSampler.js', 'src/core/generation/RegionalMissionDefaults.js']) {
  const text = readFileSync(file, 'utf8');
  assert.equal(/\bdocument\b|\bwindow\b|globalThis\./.test(text), false, `${file} should remain browser/headless neutral`);
}

console.log('audit_regional_browser_headless_parity: ok');
