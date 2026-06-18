import assert from 'node:assert/strict';
import {
  MISSION_SCORE_GROUP_IDS,
  MISSION_SCORE_STATUS_IDS,
  MISSION_REGRET_REFERENCE_IDS,
  MISSION_SCORE_BOUNDARY_NOT_A,
  createMissionScoreConfig,
  createMissionScoreComponentDefinition,
  validateMissionScoreConfig,
  validateMissionScoreComponentDefinition
} from '../../src/core/scoring/MissionScoringSchema.js';

for (const id of ['science', 'feasibility', 'efficiency', 'safety', 'missionManagement', 'fleetCoordination']) assert.ok(MISSION_SCORE_GROUP_IDS.includes(id), `score group ${id}`);
for (const id of ['complete', 'partial', 'insufficientData', 'incompatibleComparison', 'invalid']) assert.ok(MISSION_SCORE_STATUS_IDS.includes(id), `status ${id}`);
for (const id of ['none', 'configuredBaseline', 'bestKnownCompatibleAttempt', 'oracleAttemptIfAvailable', 'theoreticalUpperBound', 'componentTarget']) assert.ok(MISSION_REGRET_REFERENCE_IDS.includes(id), `regret reference ${id}`);
const config = createMissionScoreConfig({ profileId: 'balancedMission', objectiveId: 'reconnaissanceSurvey' });
assert.equal(config.changesOfficialBrowserScoring, false, 'official browser scoring unchanged');
for (const boundary of MISSION_SCORE_BOUNDARY_NOT_A) assert.ok(config.notA.includes(boundary), `boundary ${boundary}`);
assert.equal(validateMissionScoreConfig(config).valid, true, 'score config validates');
const component = createMissionScoreComponentDefinition({ id: 'scienceValueCollected', groupId: 'science', direction: 'higherIsBetter', dataSources: ['not-valid'] });
assert.deepEqual(component.dataSources, ['publicMissionRecord'], 'invalid data sources fall back explicitly');
assert.equal(validateMissionScoreComponentDefinition(component).valid, true, 'component validates');
console.log('Mission scoring schema smoke passed');