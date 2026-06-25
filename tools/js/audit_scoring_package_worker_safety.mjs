import assert from 'node:assert/strict';
import { createScoreProfile, createScoreInput, evaluateScore, publicScoreSummary, scoreMethodologySummary } from '../../packages/scoring/src/index.js';

const profile = createScoreProfile({ profileId: 'balancedMission' });
const input = createScoreInput({
  environmentArtifactDigest: 'fnv1a32:environment',
  planDigest: 'fnv1a32:plan',
  simulationInputDigest: 'fnv1a32:sim-input',
  simulationResultDigest: 'fnv1a32:sim-result',
  rawMetrics: { finalScore: 8.5, sampleScore: 0.1, weightedSampleScore: 10, energyPenalty: 1.5 }
});
const result = evaluateScore(profile, input);
const cloned = structuredClone({ profile, input, result, summary: publicScoreSummary(result), methodology: scoreMethodologySummary(profile) });
assert.equal(cloned.result.resultDigest, result.resultDigest);
assert.equal(cloned.summary.publicSafe, true);
assert.equal(cloned.methodology.officialScoreIsNotAutomaticallyRlReward, true);
console.log('audit_scoring_package_worker_safety: ok', { inputDigest: input.inputDigest, resultDigest: result.resultDigest });
