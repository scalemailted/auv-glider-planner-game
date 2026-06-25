import assert from 'node:assert/strict';
import {
  ALPHA_POSITIONING_STATEMENT,
  ALPHA_TAGLINE,
  buildPlannerComparisonRecord,
  componentCatalogDigest,
  computeHeadlessScoreReport,
  createScoreInput,
  createScoreProfile,
  evaluateScore,
  normalizeHigherIsBetter,
  normalizeLowerIsBetter,
  normalizeMissionScoreMetric,
  normalizeScoreInput,
  normalizeScoreProfile,
  normalizeScoreResult,
  normalizeTargetRange,
  publicScoreSummary,
  scoreComponentById,
  scoreComponentDefinitions,
  scoreInputDigest,
  scoreMethodologySummary,
  scoreProfileDigest,
  scoreProfileSummary,
  scoreResultDigest,
  scoreResultSummary,
  scoringDebugSummary,
  summarizeScore,
  validateScoreInput,
  validateScoreProfile,
  validateScoreResult
} from '../../packages/scoring/src/index.js';
import { summarizeScore as forwardedSummarizeScore } from '../../src/core/sim/Scoring.js';
import { createScoreProfile as packageCreateScoreProfile } from '../../packages/scoring/src/index.js';

const profile = createScoreProfile({ profileId: 'balancedMission' });
assert.equal(validateScoreProfile(profile).valid, true, 'profile validates');
assert.equal(validateScoreProfile({ profileId: 'notARealProfile' }).valid, false, 'unknown profile fails validation');
assert.equal(normalizeScoreProfile(profile).profileDigest, scoreProfileDigest(profile), 'profile digest stable');
assert.ok(scoreProfileSummary(profile).packageOwnsOfficialScoring, 'profile summary marks package scoring authority');
assert.ok(scoreComponentDefinitions(profile).length > 5, 'profile exposes component definitions');
assert.equal(scoreComponentById(profile, 'scienceValueCollected').sourceUnits, 'score-points', 'component metadata includes units');
assert.ok(componentCatalogDigest().startsWith('fnv1a32:'), 'component catalog digest exists');

assert.equal(normalizeHigherIsBetter(5, { min: 0, max: 10 }).value, 0.5, 'maximize normalization');
assert.equal(normalizeLowerIsBetter(2, { min: 0, max: 10 }).value, 0.8, 'minimize normalization');
assert.equal(normalizeTargetRange(5, { min: 4, max: 6 }, { min: 0, max: 10 }).value, 1, 'target-range normalization');
const missingMetric = normalizeMissionScoreMetric({ componentId: 'scienceValueCollected', available: false });
assert.equal(missingMetric.available, false, 'missing metric remains explicit');

const agents = [{
  id: 'glider-1',
  sampleScore: 0.42,
  expectedSampleScore: 0.6,
  energyUsed: 4,
  completedWaypoints: ['w1', 'w2'],
  missedWaypoints: [],
  completedPlan: true
}];
const events = [
  { type: 'sample', x: 1, y: 2, probability: 1 },
  { type: 'hazard' },
  { type: 'anchor.score.depth-aware-sample', sampleId: 's1', agentId: 'glider-1', depthLayerId: 'thermocline', depthMeters: 35, timeSeconds: 10, totalScienceValue: 0.8, rawScienceValue: 0.8, componentValues: { informationGainValue: 0.1, objectiveMatchValue: 0.2 } }
];
const missionState = {
  sampled: new Set(['1:2']),
  depthScienceEvents: events.filter((event) => event.type === 'anchor.score.depth-aware-sample'),
  samplingMetrics: { duplicateSamples: 0 },
  priorityTargets: { available: 1, captured: 1, missed: 0, score: 5, capturedIds: ['target-1'], captures: [] },
  waterColumnConfig: { version: 'water-column-schema-p11', depthLayerIds: ['surface', 'thermocline', 'deep'] },
  endConditionResult: { success: true, achieved: true, bonusApplied: 3, penaltyApplied: 0 }
};
const summary = summarizeScore({ agents, events, t: 12, scoring: { sampleWeight: 100, energyPenalty: 0.05, hazardPenalty: 10, elapsedTimePenalty: 0.01 }, missionState, complete: true });
const forwardedSummary = forwardedSummarizeScore({ agents, events, t: 12, scoring: { sampleWeight: 100, energyPenalty: 0.05, hazardPenalty: 10, elapsedTimePenalty: 0.01 }, missionState, complete: true });
assert.deepEqual(forwardedSummary, summary, 'legacy official scoring forwarder matches package');
assert.equal(summary.finalScore, 39.68, 'official score unchanged for fixture');

const input = createScoreInput({
  environmentArtifactDigest: 'fnv1a32:environment',
  planDigest: 'fnv1a32:plan',
  simulationInputDigest: 'fnv1a32:sim-input',
  simulationResultDigest: 'fnv1a32:sim-result',
  terminalReason: 'completed',
  rawMetrics: { officialScoreSummary: summary },
  missionObjectives: [{ id: 'reconnaissanceSurvey' }],
  missionMetadata: { missionId: 'scoring-smoke' },
  scoreProfileId: profile.id,
  scoreProfileVersion: profile.version,
  plannerProvenance: { plannerClass: 'human', plannerId: 'manual' }
});
assert.equal(validateScoreInput(input).valid, true, 'score input validates');
assert.equal(scoreInputDigest(input), input.inputDigest, 'score input digest stable');
assert.equal(normalizeScoreInput(input).inputDigest, input.inputDigest, 'score input normalization stable');
const result = evaluateScore(profile, input, { plannerProvenance: { plannerClass: 'human', plannerId: 'manual' } });
assert.equal(validateScoreResult(result).valid, true, 'score result validates');
assert.equal(result.officialScore, summary.finalScore, 'package ScoreResult preserves official score');
assert.equal(scoreResultDigest(result), result.resultDigest, 'score result digest stable');
assert.equal(normalizeScoreResult(result).resultDigest, result.resultDigest, 'score result normalization stable');
assert.equal(scoreResultSummary(result).officialScore, summary.finalScore, 'score result summary preserves official score');
assert.equal(publicScoreSummary(result).hiddenTruthIncluded, false, 'public summary strips hidden truth');
assert.equal(scoreMethodologySummary(profile).officialScoreIsNotAutomaticallyRlReward, true, 'methodology separates score from RL reward');
assert.equal(ALPHA_POSITIONING_STATEMENT.includes('not an operational ocean forecast'), true, 'Alpha statement available');
assert.equal(ALPHA_TAGLINE, 'Plan. Simulate. Compare. Learn.');

const human = evaluateScore(profile, input, { plannerProvenance: { plannerClass: 'human', plannerId: 'manual' } });
const classical = evaluateScore(profile, input, { plannerProvenance: { plannerClass: 'classical', plannerId: 'astar' } });
const learned = evaluateScore(profile, input, { plannerProvenance: { plannerClass: 'learned', plannerId: 'policy' } });
assert.equal(human.officialScore, classical.officialScore, 'planner class does not change official score');
assert.equal(human.scoreDigest, classical.scoreDigest, 'planner class does not change score digest');
assert.equal(classical.scoreDigest, learned.scoreDigest, 'planner class does not change learned/imported digest');
assert.notDeepEqual(human.plannerProvenance, classical.plannerProvenance, 'provenance remains metadata');

const comparison = buildPlannerComparisonRecord({
  environmentDigest: input.environmentArtifactDigest,
  missionDigest: 'fnv1a32:mission',
  plannerMetadata: { plannerClass: 'classical', plannerId: 'dijkstra', optimalityStatus: 'BEST_FOUND' },
  planDigest: input.planDigest,
  simulationInputDigest: input.simulationInputDigest,
  simulationResultDigest: input.simulationResultDigest,
  scoreResult: result,
  metrics: summary
});
assert.equal(comparison.officialScore, summary.finalScore, 'comparison record carries official score');
assert.equal(comparison.plannerMetadata.plannerClass, 'classical', 'comparison record stores provenance');

const headless = computeHeadlessScoreReport({
  fieldPackBefore: { fields: { U_uncertainty: [[[1, 1], [1, 1]]], P_unknown: [[[0.4, 0.1], [0.1, 0.1]]], boundaryStrength: [[[0.2, 0.1], [0.1, 0.1]]] } },
  fieldPackAfter: { fields: { U_uncertainty: [[[0.5, 0.5], [0.5, 0.5]]] } },
  observations: [{ x: 0, y: 0, zIndex: 0, observedValue: 2, innovation: 0.5, surprise: 3 }],
  tracks: [{ x: 0, y: 0, energyUsedIncrement: 1, hazard: 0 }, { x: 1, y: 0, energyUsedIncrement: 1, hazard: 0 }],
  missionConfig: { missionId: 'headless-score-smoke' }
});
assert.equal(headless.notBrowserOfficialScoring, true, 'headless compatibility report retains boundary');
assert.ok(Number.isFinite(headless.finalScore), 'headless score finite');

const debug = scoringDebugSummary({ scoreProfile: profile, scoreInput: input, scoreResult: result, parity: { plannerClassInvarianceStatus: 'PASS' } });
assert.equal(debug.packageOwnsOfficialScoring, true, 'debug marks package official scoring authority');
assert.equal(debug.packageUsesThree, false, 'debug marks no Three dependency');
assert.equal(packageCreateScoreProfile({ profileId: 'balancedMission' }).id, 'balancedMission', 'package import works directly');

console.log('smoke_scoring_package_contracts: ok', {
  officialScore: result.officialScore,
  profileDigest: profile.profileDigest,
  inputDigest: input.inputDigest,
  scoreDigest: result.scoreDigest,
  resultDigest: result.resultDigest
});
