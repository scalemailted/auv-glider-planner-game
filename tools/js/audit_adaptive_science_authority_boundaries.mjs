import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createAdaptiveScienceDiagnosisContext, createAdaptiveScienceDiagnosisHandoffRecord, validateAdaptiveScienceDiagnosisContext, validateAdaptiveScienceDiagnosisHandoffRecord } from '../../src/core/benchmark/AdaptiveScienceDiagnosisHandoff.js';
import { createAdaptiveMissionManagerRationale, validateAdaptiveMissionManagerRationale } from '../../src/core/benchmark/AdaptiveMissionManagerRationale.js';
import { runAdaptiveSurfacingDecision, validateAdaptiveSurfacingDecision } from '../../src/core/benchmark/AdaptiveSurfacingLoop.js';
import { createAdaptiveNextLegConfig, validateAdaptiveNextLegConfig } from '../../src/core/benchmark/AdaptiveNextLegHandoff.js';
import { createAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { initializeAdaptiveBenchmarkEpisode } from '../../src/core/benchmark/AdaptiveBenchmarkRuntime.js';

const context = createAdaptiveScienceDiagnosisContext({ episodeId: 'p10-audit', primaryScienceDiagnosis: 'likelyHiddenEvent', recommendedObjectiveId: 'confirmHiddenEvent', confidence: 0.7 });
assert.equal(context.controlsRoutePlanning, false);
assert.equal(context.generatesWaypoints, false);
assert.equal(validateAdaptiveScienceDiagnosisContext(context).valid, true);

const handoffRecord = createAdaptiveScienceDiagnosisHandoffRecord({ scienceDiagnosisContext: context });
assert.equal(handoffRecord.generatesWaypoints, false);
assert.equal(validateAdaptiveScienceDiagnosisHandoffRecord(handoffRecord).valid, true);

const rationale = createAdaptiveMissionManagerRationale({ scienceDiagnosisContext: context, transition: { fromObjectiveId: 'validateForecast', toObjectiveId: 'confirmHiddenEvent' } });
assert.equal(rationale.diagnosisIsPlannerAuthority, false);
assert.equal(validateAdaptiveMissionManagerRationale(rationale).valid, true);

const fixture = createAdaptiveManagerFixture('possibleHiddenPlume', { episodeId: 'p10-audit' });
const runtime = initializeAdaptiveBenchmarkEpisode({ episodeId: 'p10-audit', adaptiveManagerConfig: fixture.managerConfig, adaptiveManagerState: fixture.initialState });
const decision = runAdaptiveSurfacingDecision({ runtimeContext: runtime, evidence: { ...fixture.evidence, primaryScienceDiagnosis: 'possibleHiddenEvent' }, managerConfig: fixture.managerConfig, managerState: fixture.initialState });
assert.equal(decision.routeAuthority, 'playerOrSolver');
assert.equal(decision.diagnosisIsPlannerAuthority, false);
assert.equal(validateAdaptiveSurfacingDecision(decision).valid, true);

const nextLeg = createAdaptiveNextLegConfig({ runtimeContext: runtime, surfacingDecision: decision });
assert.equal(nextLeg.routeAuthority, 'playerOrSolver');
assert.equal(nextLeg.generatesWaypoints, false);
assert.equal(validateAdaptiveNextLegConfig(nextLeg).valid, true);

for (const file of [
  'src/core/benchmark/AdaptiveScienceDiagnosisHandoff.js',
  'src/core/benchmark/AdaptiveMissionManagerRationale.js',
  'src/core/benchmark/AdaptiveScienceDiagnosisViewModel.js',
  'src/ui/benchmark/AdaptiveSurfacingPanel.js'
]) {
  const text = fs.readFileSync(file, 'utf8');
  assert.equal(/usesNewPlanner:\s*true|usesMissionScoringRedesign:\s*true|usesMARL:\s*true|generatedRoute:\s*true|controlsRoutePlanning:\s*true/.test(text), false, `${file} claims an authority boundary leak`);
  assert.equal(/T_hiddenTruth\s*[:=]\s*\[/.test(text), false, `${file} embeds hidden truth payload`);
}

console.log('audit_adaptive_science_authority_boundaries: ok');