import assert from 'node:assert/strict';

import {
  createLegacyResolutionProfileFromGrid,
  missionResolutionProfileSummary,
  normalizeMissionResolutionProfile,
  validateMissionResolutionProfile
} from '../../src/core/domain/MissionResolutionProfile.js';

const regional = normalizeMissionResolutionProfile('regionalShelfFleet');
const validation = validateMissionResolutionProfile(regional);
assert.equal(validation.valid, true, validation.errors.join('; '));
const summary = missionResolutionProfileSummary(regional);
assert.equal(summary.decoupled, true, 'regional profile should decouple planning from source grids');
assert.equal(summary.browserFriendly, true, 'regional profile should remain browser-friendly');
assert.ok(summary.terrainToPlanningRatio > 1, 'terrain source grid should be denser than planning lattice');
assert.equal(regional.boundaryFlags.sourceArraysDrivePerCellRenderObjects, false);

const legacy = createLegacyResolutionProfileFromGrid({ width: 12, height: 8 });
assert.equal(validateMissionResolutionProfile(legacy).valid, true);
assert.equal(missionResolutionProfileSummary(legacy).decoupled, false, 'legacy profile can remain coupled for compatibility');

console.log('smoke_mission_resolution_profiles: ok');
