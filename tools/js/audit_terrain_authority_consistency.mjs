import assert from 'node:assert/strict';

import { createRegionalMissionBundle } from '../../src/core/generation/RegionalMissionDefaults.js';
import {
  buildMissionWorldRenderViewModel,
  missionWorldRenderViewModelSummary
} from '../../src/core/rendering/MissionWorldRenderViewModel.js';
import { missionWorldRenderInputFromReplay, missionWorldRenderInputSummary } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { signedTerrainSurfaceSummary, validateSignedTerrainSurface } from '../../src/core/science/SignedTerrainSurfaceModel.js';

const { level, mission } = createRegionalMissionBundle({ seed: 'world-r1-1-authority-audit', profile: 'regionalFleet', agentCount: 3 });
const digest = level.signedTerrainSurface.digest;
const terrainSummary = signedTerrainSurfaceSummary(level.signedTerrainSurface);
const validation = validateSignedTerrainSurface(level.signedTerrainSurface);
assert.equal(validation.valid, true);

for (const [label, value] of Object.entries({
  metaTerrain: level.meta.terrainSourceDigest,
  metaLandWater: level.meta.landWaterSourceDigest,
  metaCoastline: level.meta.coastlineSourceDigest,
  metaBottom: level.meta.bottomBoundarySourceDigest,
  regionalTerrain: level.regionalFields.sourceDigests.terrainSourceDigest,
  regionalLandWater: level.regionalFields.sourceDigests.landWaterSourceDigest,
  regionalCoastline: level.regionalFields.sourceDigests.coastlineSourceDigest,
  regionalBottom: level.regionalFields.sourceDigests.bottomBoundarySourceDigest,
  terrainSummary: terrainSummary.terrainSourceDigest
})) {
  assert.equal(value, digest, `${label} must share the signed terrain source digest`);
}

const renderViewModel = buildMissionWorldRenderViewModel({ level, mission, plan: { agentPlans: [] } });
const renderSummary = missionWorldRenderViewModelSummary(renderViewModel);
assert.equal(renderSummary.terrainAuthorityMode, 'signedElevationV1');
assert.equal(renderSummary.terrainSourceDigest, digest);
assert.equal(renderSummary.landWaterSourceDigest, digest);
assert.equal(renderSummary.coastlineSourceDigest, digest);
assert.equal(renderSummary.bottomBoundarySourceDigest, digest);
assert.equal(renderSummary.usesSignedTerrainAuthority, true);

const replayInput = missionWorldRenderInputFromReplay({ publicState: { level, mission, plan: { agentPlans: [] } } });
const replaySummary = missionWorldRenderInputSummary(replayInput);
assert.equal(replaySummary.terrainAuthorityMode, 'signedElevationV1');
assert.equal(replaySummary.terrainSourceDigest, digest);

console.log('audit_terrain_authority_consistency: ok');