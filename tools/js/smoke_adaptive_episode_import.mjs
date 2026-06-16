import assert from 'node:assert/strict';
import { createAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import {
  classifyAdaptiveEpisodeArtifact,
  mergeAdaptiveEpisodeArtifacts,
  parseAdaptiveEpisodeArtifact,
  validateAdaptiveEpisodeCompatibility
} from '../../src/core/benchmark/AdaptiveEpisodeImport.js';

const session = createAdaptiveEpisodeSession({ episodeId: 'episode-p8-import', policyId: 'transparentRuleManager' });
const sessionArtifact = { type: 'anchor.benchmark.adaptive-episode-session', episodeId: session.episodeId, benchmarkMode: 'adaptiveBenchmark', session };
const traceArtifact = { type: 'anchor.benchmark.adaptive-episode-trace', episodeId: session.episodeId, benchmarkMode: 'adaptiveBenchmark', legs: [{ legIndex: 0, objectiveId: 'reconnaissanceSurvey' }], surfacingDecisions: [] };
const decisionArtifact = { type: 'anchor.benchmark.adaptive-surfacing-decision', episodeId: session.episodeId, benchmarkMode: 'adaptiveBenchmark', legIndex: 0, objectiveTransition: { fromObjectiveId: 'reconnaissanceSurvey', toObjectiveId: 'confirmHiddenEvent' } };
const handoffArtifact = { type: 'anchor.benchmark.adaptive-next-leg-config', episodeId: session.episodeId, benchmarkMode: 'adaptiveBenchmark', legIndex: 1, recommendedObjectiveId: 'confirmHiddenEvent' };
assert.equal(classifyAdaptiveEpisodeArtifact(sessionArtifact).artifactType, 'anchor.benchmark.adaptive-episode-session');
assert.equal(classifyAdaptiveEpisodeArtifact(traceArtifact).artifactType, 'anchor.benchmark.adaptive-episode-trace');
assert.equal(classifyAdaptiveEpisodeArtifact(decisionArtifact).artifactType, 'anchor.benchmark.adaptive-surfacing-decision');
assert.equal(classifyAdaptiveEpisodeArtifact(handoffArtifact).artifactType, 'anchor.benchmark.adaptive-next-leg-config');
assert.equal(parseAdaptiveEpisodeArtifact(JSON.stringify(sessionArtifact)).valid, true);

const incompatible = validateAdaptiveEpisodeCompatibility({ artifact: { ...handoffArtifact, episodeId: 'other-episode' }, currentSession: session });
assert.equal(incompatible.compatible, false);
assert.equal(incompatible.referenceOnly, true);
const before = JSON.stringify(handoffArtifact);
const merged = mergeAdaptiveEpisodeArtifacts({ session, artifacts: [traceArtifact, decisionArtifact, handoffArtifact] });
assert.equal(merged.mergedCount, 3);
assert.ok(merged.session.legs.length >= 1);
assert.ok(merged.session.nextLegHandoffs.length >= 1);
assert.equal(JSON.stringify(handoffArtifact), before, 'imported payload was not mutated');
console.log('smoke_adaptive_episode_import: ok');
