import assert from 'node:assert/strict';

import { analyzeScienceEvidence } from '../../src/core/science/ScienceDiscoveryLifecycle.js';
import { initializeAdaptiveBenchmarkEpisode } from '../../src/core/benchmark/AdaptiveBenchmarkRuntime.js';
import { createAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { runAdaptiveSurfacingDecision } from '../../src/core/benchmark/AdaptiveSurfacingLoop.js';
import { createAdaptiveNextLegConfig } from '../../src/core/benchmark/AdaptiveNextLegHandoff.js';
import { createAdaptiveLegRecord, validateAdaptiveLegRecord } from '../../src/core/benchmark/AdaptiveLegRecord.js';
import {
  addAdaptiveLegToSession,
  addAdaptiveNextLegHandoffToSession,
  addAdaptiveSurfacingDecisionToSession,
  createAdaptiveEpisodeSession,
  validateAdaptiveEpisodeSession
} from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import { buildAdaptiveObjectiveHistoryViewModel } from '../../src/core/benchmark/AdaptiveObjectiveHistoryViewModel.js';

const fixture = createAdaptiveManagerFixture('possibleHiddenPlume', { episodeId: 'p10-integration' });
const scienceDiscovery = analyzeScienceEvidence({
  observations: [
    { x: 2, y: 2, observedValue: 8, expectedValue: 1 },
    { x: 2.2, y: 2.1, observedValue: 8.4, expectedValue: 1.1 },
    { x: 2.4, y: 2.2, observedValue: 7.8, expectedValue: 1.0 }
  ],
  context: { episodeId: 'p10-integration', forecastCanExplain: false, eventFamily: 'coherentHiddenPlume' }
});
const runtimeContext = initializeAdaptiveBenchmarkEpisode({ episodeId: 'p10-integration', adaptiveManagerConfig: fixture.managerConfig, adaptiveManagerState: fixture.initialState });
const decision = runAdaptiveSurfacingDecision({
  runtimeContext,
  evidence: { ...fixture.evidence, scienceDiscovery, primaryScienceDiagnosis: scienceDiscovery.primaryDiagnosis },
  managerConfig: fixture.managerConfig,
  managerState: fixture.initialState
});
assert.ok(decision.scienceDiagnosisContext);
assert.equal(decision.scienceDiagnosisContext.controlsRoutePlanning, false);
assert.ok(decision.missionManagerRationale);

const handoff = createAdaptiveNextLegConfig({ runtimeContext, surfacingDecision: decision });
assert.ok(handoff.scienceDiagnosisContext);
assert.equal(handoff.routeAuthority, 'playerOrSolver');
assert.equal(handoff.generatesWaypoints, false);

const leg = createAdaptiveLegRecord({ runtimeContext, evidence: decision.evidence, diagnosis: decision.diagnosis, scienceDiagnosisContext: decision.scienceDiagnosisContext, missionManagerRationale: decision.missionManagerRationale, objectiveTransition: decision.objectiveTransition, nextLegHandoff: handoff });
assert.equal(validateAdaptiveLegRecord(leg).valid, true);
let session = createAdaptiveEpisodeSession({ episodeId: 'p10-integration' });
session = addAdaptiveLegToSession(session, leg);
session = addAdaptiveSurfacingDecisionToSession(session, decision);
session = addAdaptiveNextLegHandoffToSession(session, handoff);
assert.equal(validateAdaptiveEpisodeSession(session).valid, true);
assert.ok(session.scienceDiagnosisHistory.length >= 1);
const history = buildAdaptiveObjectiveHistoryViewModel({ session });
assert.ok(history.objectiveTimeline.some((entry) => entry.primaryScienceDiagnosis));

const oldSession = createAdaptiveEpisodeSession({ episodeId: 'old-p8', objectiveHistory: [{ toObjectiveId: 'reconnaissanceSurvey', rationale: 'old record' }] });
assert.equal(validateAdaptiveEpisodeSession(oldSession).valid, true);

console.log('smoke_adaptive_science_handoff_integration: ok');