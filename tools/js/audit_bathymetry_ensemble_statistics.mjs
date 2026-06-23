import fs from 'node:fs';
import path from 'node:path';
import { assertCondition, createHomegrownEnvironmentBaselineFixture, fnv1aDigest, productionBathymetryEnsemble } from './scientific_baseline_helpers.mjs';

const fixturePath = path.resolve('tests/fixtures/homegrown_environment_scientific_baseline.json');
const update = process.argv.includes('--update-fixture');
const fixture = createHomegrownEnvironmentBaselineFixture();
const ensemble = productionBathymetryEnsemble({ seeds: ['sci-a', 'sci-b', 'sci-c'] });

assertCondition(ensemble.recordCount === 12, 'Expected 12 deterministic bathymetry ensemble records.', { recordCount: ensemble.recordCount });
assertCondition(ensemble.duplicateDigestCount === 0, 'Bathymetry ensemble produced duplicate artifact digests.', { duplicateDigestCount: ensemble.duplicateDigestCount });
assertCondition(ensemble.records.every((row) => row.finite && row.synthetic && !row.calibratedSurveyData), 'Bathymetry ensemble contains invalid source metadata or non-finite fields.');
assertCondition(ensemble.records.every((row) => row.waterCellCount > 0 && row.maxDepthMeters > row.minDepthMeters), 'Bathymetry ensemble has a degenerate wet domain.');

if (update) {
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
}

assertCondition(fs.existsSync(fixturePath), 'Homegrown environment baseline fixture is missing. Run audit_bathymetry_ensemble_statistics.mjs --update-fixture.');
const existing = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
assertCondition(existing.type === fixture.type, 'Fixture type mismatch.', { expected: fixture.type, actual: existing.type });
assertCondition(existing.version === fixture.version, 'Fixture version mismatch.', { expected: fixture.version, actual: existing.version });
assertCondition(existing.bathymetry?.recordCount === fixture.bathymetry.recordCount, 'Fixture bathymetry record count mismatch.');
assertCondition(existing.bathymetry?.duplicateDigestCount === 0, 'Fixture records duplicate bathymetry digests.');
assertCondition(existing.calibratedOceanForecast === false, 'Fixture must not claim calibrated ocean forecast.');

console.log('audit_bathymetry_ensemble_statistics: ok', JSON.stringify({
  fixturePath,
  fixtureDigest: fnv1aDigest(existing),
  ensembleDigest: fixture.bathymetry.ensembleDigest,
  bathymetryStats: ensemble.stats,
  updated: update
}, null, 2));
