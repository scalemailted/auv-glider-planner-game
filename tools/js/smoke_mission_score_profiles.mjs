import assert from 'node:assert/strict';
import { MISSION_SCORE_PROFILES, missionScoreProfileForObjective, validateMissionScoreProfile } from '../../src/core/scoring/MissionScoreProfiles.js';
import { MISSION_SCORE_PROFILE_IDS } from '../../src/core/scoring/MissionScoringSchema.js';
import { missionScoreComponentById } from '../../src/core/scoring/MissionScoreComponents.js';

const ids = MISSION_SCORE_PROFILES.map((profile) => profile.id);
assert.equal(new Set(ids).size, ids.length, 'profile ids unique');
for (const id of MISSION_SCORE_PROFILE_IDS) assert.ok(ids.includes(id), `required profile ${id}`);
for (const profile of MISSION_SCORE_PROFILES) {
  assert.equal(validateMissionScoreProfile(profile).valid, true, `${profile.id} validates`);
  assert.ok(Number.isFinite(profile.minimumCoverageFraction), `${profile.id} coverage threshold`);
  assert.ok((profile.notA ?? []).some((entry) => /not official browser scoring/i.test(entry)), `${profile.id} boundary`);
  for (const [componentId, weight] of Object.entries(profile.componentWeights)) {
    assert.ok(missionScoreComponentById(componentId), `${profile.id} component ${componentId}`);
    assert.ok(Number.isFinite(Number(weight)) && Number(weight) >= 0, `${profile.id} finite nonnegative weight ${componentId}`);
  }
}
assert.equal(missionScoreProfileForObjective('validateForecast').id, 'validateForecast', 'objective mapping works');
console.log('Mission score profiles smoke passed');