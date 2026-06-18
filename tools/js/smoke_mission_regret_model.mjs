import assert from 'node:assert/strict';
import { buildMissionRegretReport, compatibleMissionScoreAttempts, missionRegretReportSummary, validateMissionRegretReport } from '../../src/core/scoring/MissionRegretModel.js';

const achievedScore = { episodeId: 'e1', objectiveId: 'o1', visibilityTier: 'forecastOnly', scoreProfile: { profileId: 'balancedMission', profileVersion: 'v1' }, compositeScore: 40, groupScores: [] };
const baseline = { ...achievedScore, attemptId: 'baseline', compositeScore: 55 };
const configured = buildMissionRegretReport({ achievedScore, configuredBaseline: baseline, profile: { id: 'balancedMission', version: 'v1' }, scoreConfig: { profileId: 'balancedMission', profileVersion: 'v1', regretReference: 'configuredBaseline' } });
assert.equal(configured.totalRegret, 15, 'configured baseline regret');
assert.equal(validateMissionRegretReport(configured).valid, true, 'configured validates');
const compatible = buildMissionRegretReport({ achievedScore, compatibleAttempts: [baseline, { ...baseline, episodeId: 'other', compositeScore: 90 }], profile: { id: 'balancedMission', version: 'v1' }, scoreConfig: { profileId: 'balancedMission', profileVersion: 'v1', regretReference: 'bestKnownCompatibleAttempt' } });
assert.equal(compatible.totalRegret, 15, 'best compatible regret');
assert.equal(missionRegretReportSummary(compatible).bestKnownIsNotOptimalProof, true, 'best-known not optimal proof');
assert.equal(compatibleMissionScoreAttempts([{ ...baseline, profileVersion: 'other' }], achievedScore).length, 0, 'incompatible attempt rejected');
const missing = buildMissionRegretReport({ achievedScore, profile: { id: 'balancedMission', version: 'v1' }, scoreConfig: { profileId: 'balancedMission', profileVersion: 'v1', regretReference: 'bestKnownCompatibleAttempt' } });
assert.equal(missing.totalRegret, null, 'missing reference not fake zero');
const oracleMissing = buildMissionRegretReport({ achievedScore, oracleAttempt: { compositeScore: 99 }, profile: { id: 'balancedMission', version: 'v1' }, scoreConfig: { profileId: 'balancedMission', profileVersion: 'v1', regretReference: 'oracleAttemptIfAvailable' } });
assert.equal(oracleMissing.totalRegret, null, 'oracle requires explicit label');
console.log('Mission regret model smoke passed');