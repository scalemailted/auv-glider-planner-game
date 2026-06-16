import assert from 'node:assert/strict';

import { runAllScienceDiscoveryFixtures, scienceDiscoveryFixtureIds } from '../../src/core/science/ScienceDiscoveryFixtures.js';

const ids = scienceDiscoveryFixtureIds();
assert.ok(ids.includes('forecastIntensityError'), 'forecast fixture exists');
assert.ok(ids.includes('likelyHiddenEvent'), 'hidden event fixture exists');
const results = runAllScienceDiscoveryFixtures();
const failed = results.filter((result) => !result.passed);
assert.deepEqual(failed.map((result) => [result.fixtureId, result.update.primaryDiagnosis, result.expectedPrimaryDiagnosis]), [], 'all science fixtures match expected diagnoses');
assert.equal(results.every((result) => result.update.publicSafe === true), true, 'fixtures produce public-safe updates');

console.log('smoke_science_discovery_fixtures: ok', { fixtureCount: results.length });
