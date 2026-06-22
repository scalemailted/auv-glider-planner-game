import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createRegionalMissionCompactExport } from '../../src/core/generation/RegionalMissionDefaults.js';

const files = [
  'src/core/domain/OperationalDomainSpec.js',
  'src/core/domain/MissionResolutionProfile.js',
  'src/core/domain/OperationalDomainCoordinates.js',
  'src/core/domain/MissionScaleModel.js',
  'src/core/domain/MultiResolutionFieldSampler.js',
  'src/core/generation/RegionalMissionDefaults.js',
  'src/core/science/PhysicalSamplingFootprint.js'
];

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  assert.equal(/from ['"][^'"]*(three|phaser)/i.test(text), false, `${file} must not import renderer runtimes`);
  assert.equal(/new\s+SimulationEngine/.test(text), false, `${file} must not create SimulationEngine`);
  assert.equal(/finalScore\s*=|calculateScore|summarizeScore/.test(text), false, `${file} must not own scoring`);
  assert.equal(/HYCOM|ROMS|Delft3D|operational forecast/i.test(text) && !/not a real ocean forecast|calibratedOceanForecast:\s*false|operationalForecast:\s*false/i.test(text), false, `${file} has an unbounded forecast claim`);
}

const compact = createRegionalMissionCompactExport({ seed: 'world-r1-authority' });
assert.equal(compact.meta.syntheticEducational, true);
assert.equal(compact.meta.calibratedOceanForecast, false);
assert.equal(compact.meta.operationalForecast, false);
assert.equal(compact.containsHiddenTruth, false);

console.log('audit_operational_domain_authority_boundaries: ok');
