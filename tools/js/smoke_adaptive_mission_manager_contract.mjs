import assert from 'node:assert/strict';

import {
  ADAPTIVE_DIAGNOSIS_IDS,
  ADAPTIVE_MANAGER_POLICY_IDS,
  ADAPTIVE_OBJECTIVE_TRANSITION_IDS,
  ADAPTIVE_SURFACING_EVENT_TYPES,
  adaptiveDiagnosisOptions,
  adaptiveManagerPolicyOptions,
  adaptiveMissionManagerSummary,
  createAdaptiveMissionManagerConfig,
  validateAdaptiveMissionManagerConfig
} from '../../src/core/benchmark/AdaptiveMissionManagerContract.js';

for (const id of ['transparentRuleManager', 'uncertaintyFirstManager', 'forecastValidationManager', 'hiddenEventFollowupManager', 'boundaryMappingManager', 'persistentMonitoringManager', 'sourceLocalizationManager', 'balancedAdaptiveManager']) {
  assert.ok(ADAPTIVE_MANAGER_POLICY_IDS.includes(id), `policy exists: ${id}`);
}
for (const id of ['agreesWithForecast', 'reduceUncertainty', 'likelyForecastError', 'possibleHiddenEvent', 'likelyHiddenEvent', 'boundaryAmbiguous', 'staleRegionNeedsRevisit', 'sourceLikelyUpstream', 'hazardOrReachabilityIssue', 'insufficientEvidence', 'likelyNoiseOrFalseAlarm']) {
  assert.ok(ADAPTIVE_DIAGNOSIS_IDS.includes(id), `diagnosis exists: ${id}`);
}
for (const id of ['keepCurrentObjective', 'switchToReduceUncertainty', 'switchToValidateForecast', 'switchToConfirmHiddenEvent', 'switchToMapBoundary', 'switchToTrackFeature', 'switchToLocalizeSource', 'switchToRevisitStaleRegion', 'switchToExploitKnownValue', 'pauseForMoreEvidence']) {
  assert.ok(ADAPTIVE_OBJECTIVE_TRANSITION_IDS.includes(id), `transition exists: ${id}`);
}
assert.ok(ADAPTIVE_SURFACING_EVENT_TYPES.includes('scheduledSurfacing'), 'surfacing event types include scheduled surfacing');
assert.equal(adaptiveManagerPolicyOptions().length, ADAPTIVE_MANAGER_POLICY_IDS.length, 'policy options expose all policies');
assert.equal(adaptiveDiagnosisOptions().length, ADAPTIVE_DIAGNOSIS_IDS.length, 'diagnosis options expose all diagnoses');

const config = createAdaptiveMissionManagerConfig({ policyId: 'balancedAdaptiveManager' });
assert.equal(config.type, 'anchor.benchmark.adaptive-manager-config', 'config type');
assert.equal(config.policyId, 'balancedAdaptiveManager', 'policy is normalized');
assert.equal(config.objectiveAuthority, 'missionManager', 'objective authority');
assert.equal(config.routeAuthority, 'playerOrSolver', 'route authority');
assert.ok(config.notA.some((item) => /MARL\/RL/i.test(item)), 'notA includes no MARL/RL');
assert.ok(config.notA.some((item) => /route planner/i.test(item)), 'notA includes no route planner');
assert.ok(config.notA.some((item) => /not calibrated ocean data assimilation/i.test(item)), 'notA includes data-assimilation boundary');
assert.equal(validateAdaptiveMissionManagerConfig(config).status, 'PASS', 'config validates');
assert.equal(adaptiveMissionManagerSummary(config).objectiveAuthority, 'missionManager', 'summary keeps authority');

console.log('smoke_adaptive_mission_manager_contract: ok');
