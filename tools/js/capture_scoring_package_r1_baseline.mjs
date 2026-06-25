import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createScoreInput, createScoreProfile, evaluateScore, scoreMethodologySummary, summarizeScore } from '../../packages/scoring/src/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixturePath = path.join(root, 'tests/fixtures/scoring_package_r1_parity.json');
const update = process.argv.includes('--update');
const records = buildRecords();
const fixture = {
  type: 'anchor.scoring-package-r1-parity-fixture',
  version: 'scoring-package-r1-parity-1',
  note: 'Compact SCORE-PKG-R1 parity fixture. It stores digests and official score summaries only, not large trajectories or hidden fields.',
  caseCount: records.length,
  records,
  fixtureDigest: digestObject(records)
};

if (update || !fs.existsSync(fixturePath)) {
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  console.log('capture_scoring_package_r1_baseline: updated', { fixturePath, digest: fixture.fixtureDigest, cases: records.length });
} else {
  const expected = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.deepEqual(fixture, expected, 'SCORE-PKG-R1 parity fixture mismatch. Re-run with --update only after reviewing intentional scoring changes.');
  console.log('capture_scoring_package_r1_baseline: ok', { fixturePath, digest: fixture.fixtureDigest, cases: records.length });
}

function buildRecords() {
  return cases().map((testCase) => {
    const profile = createScoreProfile({ profileId: testCase.profileId ?? 'balancedMission' });
    const summary = summarizeScore(testCase.input);
    const scoreInput = createScoreInput({
      environmentArtifactDigest: digestObject({ environment: testCase.id }),
      planDigest: digestObject({ plan: testCase.id }),
      simulationInputDigest: digestObject({ simulationInput: testCase.id }),
      simulationResultDigest: digestObject({ simulationResult: testCase.id, summary }),
      terminalReason: summary.abortReason ?? (summary.completed ? 'completed' : 'incomplete'),
      rawMetrics: { officialScoreSummary: summary },
      missionObjectives: [{ id: testCase.objectiveId ?? 'reconnaissanceSurvey' }],
      missionMetadata: { missionId: testCase.id },
      scoreProfileId: profile.id,
      scoreProfileVersion: profile.version
    });
    const result = evaluateScore(profile, scoreInput);
    const method = scoreMethodologySummary(profile);
    return stableObject({
      caseId: testCase.id,
      label: testCase.label,
      environmentDigest: scoreInput.environmentArtifactDigest,
      planDigest: scoreInput.planDigest,
      simulationInputDigest: scoreInput.simulationInputDigest,
      simulationResultDigest: scoreInput.simulationResultDigest,
      rawMetricDigest: scoreInput.rawMetricDigest,
      scoreProfileId: profile.id,
      scoreProfileVersion: profile.version,
      profileDigest: profile.profileDigest,
      componentDefinitionDigest: profile.componentDefinitionDigest,
      officialScore: result.officialScore,
      scoreDigest: result.scoreDigest,
      resultDigest: result.resultDigest,
      componentCount: result.components.length,
      majorComponents: result.components.slice(0, 8).map((component) => ({ id: component.id, value: component.weightedContribution })),
      terminalReason: scoreInput.terminalReason,
      depthCoverage: summary.verticalCoverage ?? null,
      methodologyDigest: digestObject(method)
    });
  });
}

function cases() {
  const baseScoring = { sampleWeight: 100, energyPenalty: 0.05, hazardPenalty: 10, elapsedTimePenalty: 0.01, missedWaypointPenalty: 5, mobileHazardPenalty: 12, priorityTargetMissPenalty: 3 };
  return [
    c('perfect-route-completion', 'perfect route completion', { sampleScore: 0.8, expectedSampleScore: 0.8, energyUsed: 2, completedWaypoints: ['a', 'b', 'c'], missedWaypoints: [], completedPlan: true }, [], 60, baseScoring, { complete: true, priorityScore: 5, recoveryBonus: 2 }),
    c('partial-route-completion', 'partial route completion', { sampleScore: 0.4, expectedSampleScore: 0.8, energyUsed: 4, completedWaypoints: ['a'], missedWaypoints: ['b'], completedPlan: false }, [], 90, baseScoring, { complete: false }),
    c('mission-time-expiry', 'mission-time expiry', { sampleScore: 0.45, expectedSampleScore: 0.7, energyUsed: 6, completedWaypoints: ['a'], missedWaypoints: ['b'], completedPlan: false }, [], 7200, baseScoring, { abortReason: 'mission-time-expired' }),
    c('energy-depletion', 'energy depletion', { sampleScore: 0.35, expectedSampleScore: 0.7, energyUsed: 100, completedWaypoints: ['a'], missedWaypoints: ['b'], completedPlan: false }, [], 240, baseScoring, { abortReason: 'energy-depleted' }),
    c('hazard-heavy-mission', 'hazard-heavy mission', { sampleScore: 0.7, expectedSampleScore: 0.9, energyUsed: 5, completedWaypoints: ['a', 'b'], missedWaypoints: [], completedPlan: true }, [{ type: 'hazard' }, { type: 'hazard' }, { type: 'mobileHazard', penalty: 12 }], 180, baseScoring, { complete: true }),
    c('terrain-warning-mission', 'terrain warning mission', { sampleScore: 0.5, expectedSampleScore: 0.7, energyUsed: 5, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, [{ type: 'anchor.simulation.terrain-clearance-warning' }], 180, baseScoring, { bottomClearanceWarnings: 2 }),
    c('terrain-violation-mission', 'terrain violation mission', { sampleScore: 0.25, expectedSampleScore: 0.7, energyUsed: 7, completedWaypoints: [], missedWaypoints: ['a'], completedPlan: false }, [{ type: 'anchor.simulation.terrain-violation' }], 180, baseScoring, { abortReason: 'terrain-violation' }),
    c('shallow-only-sampling', 'shallow-only sampling', { sampleScore: 0.3, expectedSampleScore: 0.5, energyUsed: 3, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, [depthEvent('shallow', 10, 0.3)], 120, baseScoring, { complete: true, sampledLayers: ['shallow'] }),
    c('deep-water-column-sampling', 'deep water-column sampling', { sampleScore: 0.62, expectedSampleScore: 0.7, energyUsed: 5, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, [depthEvent('deep', 150, 1.1)], 120, baseScoring, { complete: true, sampledLayers: ['deep'] }),
    c('redundant-repeated-sampling', 'redundant repeated sampling', { sampleScore: 0.5, expectedSampleScore: 0.9, energyUsed: 5, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, [{ type: 'sample', x: 1, y: 1 }, { type: 'duplicateSample', x: 1, y: 1 }], 120, baseScoring, { duplicateSamples: 1 }),
    c('multi-glider-complementary', 'multi-glider complementary sampling', [{ sampleScore: 0.35, expectedSampleScore: 0.4, energyUsed: 3, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, { sampleScore: 0.4, expectedSampleScore: 0.45, energyUsed: 3, completedWaypoints: ['b'], missedWaypoints: [], completedPlan: true }], [depthEvent('surface', 0, 0.2), depthEvent('thermocline', 35, 0.5)], 160, baseScoring, { complete: true }),
    c('multi-glider-redundant', 'multi-glider redundant sampling', [{ sampleScore: 0.3, expectedSampleScore: 0.5, energyUsed: 3, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, { sampleScore: 0.25, expectedSampleScore: 0.5, energyUsed: 3, completedWaypoints: ['b'], missedWaypoints: [], completedPlan: true }], [{ type: 'duplicateSample' }], 160, baseScoring, { complete: true, duplicateSamples: 1 }),
    c('optional-idle-gliders', 'optional idle Glider 2/3', [{ sampleScore: 0.5, expectedSampleScore: 0.6, energyUsed: 4, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, { sampleScore: 0, expectedSampleScore: 0, energyUsed: 0, completedWaypoints: [], missedWaypoints: [], completedPlan: true }, { sampleScore: 0, expectedSampleScore: 0, energyUsed: 0, completedWaypoints: [], missedWaypoints: [], completedPlan: true }], [], 100, baseScoring, { complete: true }),
    c('surfacing-continue', 'surfacing Continue', { sampleScore: 0.55, expectedSampleScore: 0.7, energyUsed: 4, completedWaypoints: ['a'], missedWaypoints: [], completedPlan: true }, [{ type: 'update' }], 160, baseScoring, { complete: true }),
    c('surfacing-replan', 'surfacing Replan', { sampleScore: 0.58, expectedSampleScore: 0.7, energyUsed: 5, completedWaypoints: ['a', 'b'], missedWaypoints: [], completedPlan: true }, [{ type: 'replanned' }], 180, baseScoring, { complete: true }),
    c('stochastic-seeded-mission', 'stochastic seeded mission', { sampleScore: 0.43, expectedSampleScore: 0.65, energyUsed: 6, completedWaypoints: ['a'], missedWaypoints: ['b'], completedPlan: false }, [{ type: 'sample', manifested: false, probability: 0.5 }], 220, baseScoring, { seed: 'score-r1-stochastic' }),
    c('deterministic-regional-challenge', 'deterministic regional Challenge', { sampleScore: 0.72, expectedSampleScore: 0.72, energyUsed: 4, completedWaypoints: ['a', 'b', 'c'], missedWaypoints: [], completedPlan: true }, [depthEvent('thermocline', 35, 0.8)], 190, baseScoring, { complete: true, priorityScore: 8 }),
    c('imported-external-plan', 'imported external plan', { sampleScore: 0.51, expectedSampleScore: 0.7, energyUsed: 5, completedWaypoints: ['a', 'b'], missedWaypoints: ['c'], completedPlan: false }, [], 210, baseScoring, { plannerClass: 'importedExternal' }),
    c('benchmark-baseline-plan', 'benchmark baseline plan', { sampleScore: 0.47, expectedSampleScore: 0.7, energyUsed: 5, completedWaypoints: ['a'], missedWaypoints: ['b'], completedPlan: false }, [], 210, baseScoring, { plannerClass: 'heuristic' }),
    c('exact-small-instance-oracle', 'exact small-instance oracle plan', { sampleScore: 0.9, expectedSampleScore: 0.9, energyUsed: 2, completedWaypoints: ['a', 'b', 'c'], missedWaypoints: [], completedPlan: true }, [], 90, baseScoring, { complete: true, plannerClass: 'exactOracle', priorityScore: 10 })
  ];
}

function c(id, label, agentOrAgents, events, t, scoring, options = {}) {
  const agents = Array.isArray(agentOrAgents) ? agentOrAgents : [agentOrAgents];
  const state = {
    sampled: new Set(['sampled']),
    depthScienceEvents: events.filter((event) => event.type === 'anchor.score.depth-aware-sample'),
    samplingMetrics: { duplicateSamples: options.duplicateSamples ?? events.filter((event) => event.type === 'duplicateSample').length },
    priorityTargets: { available: 1, captured: options.priorityScore ? 1 : 0, missed: options.priorityScore ? 0 : 1, score: options.priorityScore ?? 0, capturedIds: [], captures: [] },
    priorityTargetAvailable: 1,
    priorityTargetMissPenalty: scoring.priorityTargetMissPenalty,
    waterColumnConfig: { version: 'water-column-schema-p11', depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'] },
    endConditionResult: { success: options.complete !== false, achieved: options.complete !== false, bonusApplied: options.recoveryBonus ?? 0, penaltyApplied: options.recoveryPenalty ?? 0 },
    aborted: Boolean(options.abortReason),
    abortReason: options.abortReason ?? null,
    bottomClearanceWarnings: options.bottomClearanceWarnings ?? 0
  };
  return { id, label, objectiveId: options.objectiveId ?? 'reconnaissanceSurvey', profileId: options.profileId ?? 'balancedMission', input: { agents, events, t, scoring, missionState: state, complete: options.complete === true } };
}

function depthEvent(layer, depth, value) {
  return { type: 'anchor.score.depth-aware-sample', sampleId: `${layer}-${depth}`, agentId: 'glider-1', depthLayerId: layer, depthMeters: depth, timeSeconds: 30, totalScienceValue: value, rawScienceValue: value, componentValues: { informationGainValue: value / 10, objectiveMatchValue: value / 5 } };
}

function stableObject(value = {}) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function digestObject(value) {
  return fnv1a32(JSON.stringify(stableObject(value)));
}

function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < String(text).length; index += 1) {
    hash ^= String(text).charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, '0')}`;
}
