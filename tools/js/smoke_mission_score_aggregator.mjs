import assert from 'node:assert/strict';
import { aggregateMissionOutcomeScore } from '../../src/core/scoring/MissionScoreAggregator.js';
import { createMissionScoreConfig } from '../../src/core/scoring/MissionScoringSchema.js';
import { missionScoreProfileById } from '../../src/core/scoring/MissionScoreProfiles.js';

const profile = missionScoreProfileById('balancedMission');
const metrics = { metrics: Object.keys(profile.componentWeights).slice(0, 8).map((componentId) => ({ componentId, rawValue: 1, normalizedValue: 0.5, available: true })) };
const score = aggregateMissionOutcomeScore({ normalizedMetrics: metrics, profile, scoreConfig: createMissionScoreConfig({ profileId: profile.id, minimumCoverageFraction: 0.1 }) });
assert.equal(score.changesOfficialBrowserScoring, false, 'official scoring unchanged');
assert.ok(score.compositeScore >= 0 && score.compositeScore <= 100, 'score in range');
assert.ok(score.groupScores.length > 0, 'group scores calculated');
assert.ok(Number.isFinite(score.coverageFraction), 'coverage reported');
const insufficient = aggregateMissionOutcomeScore({ normalizedMetrics: { metrics: [] }, profile, scoreConfig: createMissionScoreConfig({ profileId: profile.id, minimumCoverageFraction: 0.9 }) });
assert.equal(insufficient.status, 'insufficientData', 'insufficient coverage withheld');
assert.equal(insufficient.compositeScore, null, 'missing metrics do not earn credit');
console.log('Mission score aggregator smoke passed');