import assert from 'node:assert/strict';

import {
  createDiveProfileSequence,
  depthIndexForDiveProfile,
  diveProfileCoverage,
  diveProfileSummary,
  normalizeDiveProfile,
  validateDiveProfile
} from '../../src/core/science/DiveProfileModel.js';

const config = { depthLayerIds: ['surface', 'thermocline', 'deep'], diveProfileId: 'sawtoothProfile' };
const profile = normalizeDiveProfile('sawtoothProfile', config);
const sequence = createDiveProfileSequence(profile, config, { sampleCount: 6 });
const coverage = diveProfileCoverage(profile, config, { sampleCount: 9 });
const summary = diveProfileSummary(profile, config);

assert.equal(validateDiveProfile(profile, config).status, 'PASS');
assert.equal(profile.generatesWaypoints, false);
assert.equal(profile.controlsRoutePlanning, false);
assert.equal(depthIndexForDiveProfile(profile, 0.5, config), 2);
assert.ok(sequence.some((entry) => entry.depthLayerId === 'deep'));
assert.equal(coverage.verticalCoverage, 'broad');
assert.equal(summary.usesFull3DPlanning, false);

console.log('smoke_dive_profile_model: ok', { profile: summary.profileId, coverage: coverage.verticalCoverage });
