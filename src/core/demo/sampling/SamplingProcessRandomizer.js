import { createSeededRng } from '../../random/SeededRng.js';
import { SAMPLING_PROCESS_RULE_IDS, normalizeSamplingProcessRuleId, processRuleById } from './SamplingProcessRules.js';
import { createSamplingProcessPaintModel } from './SamplingProcessPaintModel.js';

export function randomizeSamplingProcessAllocation({
  seed = 'sampling-process-random',
  width = 24,
  height = 16,
  groupCount = 4,
  activeFraction = 0.18,
  ruleWhitelist = SAMPLING_PROCESS_RULE_IDS.filter((id) => id !== 'inert'),
  mode = 'exploratoryMixedRules'
} = {}) {
  const rng = createSeededRng(`${seed}:${width}x${height}:${groupCount}:${activeFraction}:${ruleWhitelist.join(',')}:${mode}`);
  const rules = [...new Set(ruleWhitelist.map(normalizeSamplingProcessRuleId).filter((ruleId) => ruleId !== 'inert'))];
  const safeRules = rules.length ? rules : ['propagatingFront'];
  const safeGroupCount = Math.max(1, Math.round(Number(groupCount) || 1));
  const cells = {};
  const groups = {};
  for (let groupId = 1; groupId <= safeGroupCount; groupId += 1) {
    groups[String(groupId)] = {
      id: groupId,
      label: `Random Group ${groupId}`,
      ruleId: safeRules[Math.floor(rng() * safeRules.length)] ?? safeRules[0],
      sourceProfile: 'seeded-random',
      parameters: {
        density: activeFraction
      }
    };
  }
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const groupId = 1 + Math.floor(rng() * safeGroupCount);
      const active = rng() < activeFraction;
      const ruleId = mode === 'scientificRandomization'
        ? groups[String(groupId)].ruleId
        : safeRules[Math.floor(rng() * safeRules.length)] ?? safeRules[0];
      const state = pickStateForRule(rng, ruleId, active);
      cells[`${col},${row}`] = {
        state,
        ruleId,
        groupId,
        sourceValue: Number((active ? 0.55 + rng() * 0.45 : rng() * 0.45).toFixed(4)),
        valueMapId: 'activation-to-sampling-value',
        parameters: {}
      };
    }
  }
  return {
    mode,
    seed,
    statusLabel: mode === 'scientificRandomization' ? 'Pattern-Modified' : 'Custom Exploratory',
    model: createSamplingProcessPaintModel({ width, height, assignments: { cells, groups } })
  };
}

function pickStateForRule(rng, ruleId, active) {
  const rule = processRuleById(ruleId);
  if (!active) {
    const quiet = rule.allowedStates.filter((state) => ['inactive', 'susceptible', 'empty', 'conductor', 'loaded', 'stale'].includes(state));
    return quiet[Math.floor(rng() * quiet.length)] ?? rule.defaultInitialState ?? 'inactive';
  }
  const activeStates = rule.allowedStates.filter((state) => !['inactive', 'empty', 'susceptible', 'conductor'].includes(state));
  return activeStates[Math.floor(rng() * activeStates.length)] ?? rule.defaultInitialState ?? rule.allowedStates[0] ?? 'active';
}
