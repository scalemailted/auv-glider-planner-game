import assert from 'node:assert/strict';
import { buildDefaultWaterColumnMissionConfig, buildLegacySurfaceOnlyWaterColumnConfig } from '../../src/core/science/WaterColumnMissionDefaults.js';
import { depthScienceScoreProfileComparison, depthScienceScoreProfilesCompatible } from '../../src/core/science/DepthScoringProfiles.js';

const legacy = buildLegacySurfaceOnlyWaterColumnConfig();
const modern = buildDefaultWaterColumnMissionConfig();
assert.equal(legacy.scoreProfileId, 'legacySurfaceScienceV1', 'legacy surface mission retains legacy profile');
assert.equal(modern.scoreProfileId, 'depthAwareScienceV1', 'volumetric generated mission gets depth-aware profile');
assert.equal(depthScienceScoreProfilesCompatible(legacy.scoreProfile, modern.scoreProfile), false, 'incompatible profile comparisons warn');
assert.ok(depthScienceScoreProfileComparison(legacy.scoreProfile, modern.scoreProfile).warnings.length > 0);
assert.equal(legacy.compatibility.importedLegacySurfaceFallback, true, 'old records remain readable');
console.log('smoke_depth_scoring_profile_compatibility: PASS');
