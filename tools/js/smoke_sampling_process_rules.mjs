import {
  SAMPLING_PROCESS_RULES,
  SAMPLING_PROCESS_STATES,
  normalizeSamplingProcessRuleId,
  normalizeSamplingProcessState,
  samplingProcessRuleById
} from '../../src/core/demo/sampling/SamplingProcessRules.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const requiredRules = [
  'inert',
  'propagatingFront',
  'excitableWave',
  'localBirthDeath',
  'diffusiveSpread',
  'directedTransport',
  'thresholdCascade',
  'interactingPopulation',
  'morphogenesis',
  'congestionWave',
  'freshnessRecovery',
  'structuredSignal'
];

for (const state of ['inactive', 'active', 'susceptible', 'cooling', 'recovering', 'consumed']) {
  assert(SAMPLING_PROCESS_STATES.includes(state), `missing process state ${state}`);
}
for (const ruleId of requiredRules) {
  const rule = samplingProcessRuleById(ruleId);
  assert(rule.id === ruleId, `missing rule ${ruleId}`);
  assert(rule.caTaxonomy, `${ruleId} missing CA taxonomy`);
  assert(Array.isArray(rule.allowedStates) && rule.allowedStates.length > 0, `${ruleId} missing allowed states`);
  assert(Array.isArray(rule.compatibleSignatures), `${ruleId} missing legacy compatible signatures alias`);
}
assert(normalizeSamplingProcessRuleId('front') === 'propagatingFront', 'front alias mismatch');
assert(normalizeSamplingProcessRuleId('frontPropagation') === 'propagatingFront', 'legacy front alias mismatch');
assert(normalizeSamplingProcessRuleId('none') === 'inert', 'none alias mismatch');
assert(normalizeSamplingProcessState('depleted') === 'consumed', 'depleted alias mismatch');

if (failures.length) {
  console.error('Sampling process rules smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Sampling process rules smoke passed (${SAMPLING_PROCESS_RULES.length} rules)`);
