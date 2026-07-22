 const DEFAULT_END_CONDITION = {
  mode: 'none',
  requiredByMissionEnd: false,
  targetZoneId: null,
  bonus: 0,
  penalty: 0
};

 const DEFAULT_SAMPLING_RULES = {
  mode: 'unique',
  duplicateValueMultiplier: 0,
  localDepletionRadius: 0,
  depletionFactor: 0,
  cooldownWindows: 0,
  persistentWindowMultiplier: 1
};

 const DEFAULT_PRIORITY_TARGET_RULES = {
  enabled: true,
  captureMode: 'once',
  showFutureTargets: false,
  showActiveOnly: true
};

 const DEFAULT_MISSION_OPTIONS = {
  ignoreUpdateEvents: false
};

const END_MODES = new Set(['none', 'surface', 'communication', 'recovery', 'pickup', 'return']);
const SAMPLING_MODES = new Set(['unique', 'diminishing', 'cooldown', 'persistent']);

 function normalizeEndCondition(missionOrRules = {}) {
  const rules = missionOrRules.rules ?? missionOrRules;
  const input = rules?.endCondition ?? {};
  const mode = END_MODES.has(input.mode) ? input.mode : DEFAULT_END_CONDITION.mode;
  return {
    ...DEFAULT_END_CONDITION,
    ...input,
    mode,
    requiredByMissionEnd: Boolean(input.requiredByMissionEnd ?? DEFAULT_END_CONDITION.requiredByMissionEnd),
    bonus: finiteNumber(input.bonus, DEFAULT_END_CONDITION.bonus),
    penalty: finiteNumber(input.penalty, DEFAULT_END_CONDITION.penalty)
  };
}

 function normalizeSamplingRules(missionOrRules = {}) {
  const rules = missionOrRules.rules ?? missionOrRules;
  const input = rules?.sampling ?? {};
  const mode = SAMPLING_MODES.has(input.mode) ? input.mode : DEFAULT_SAMPLING_RULES.mode;
  const legacyDuplicateMultiplier = rules?.allowDuplicateSampling ? 1 : DEFAULT_SAMPLING_RULES.duplicateValueMultiplier;
  return {
    ...DEFAULT_SAMPLING_RULES,
    ...input,
    mode,
    duplicateValueMultiplier: clamp01(finiteNumber(input.duplicateValueMultiplier, legacyDuplicateMultiplier)),
    localDepletionRadius: Math.max(0, finiteNumber(input.localDepletionRadius, DEFAULT_SAMPLING_RULES.localDepletionRadius)),
    depletionFactor: clamp01(finiteNumber(input.depletionFactor, DEFAULT_SAMPLING_RULES.depletionFactor)),
    cooldownWindows: Math.max(0, Math.round(finiteNumber(input.cooldownWindows, DEFAULT_SAMPLING_RULES.cooldownWindows))),
    persistentWindowMultiplier: Math.max(0, finiteNumber(input.persistentWindowMultiplier, DEFAULT_SAMPLING_RULES.persistentWindowMultiplier))
  };
}

 function normalizePriorityTargetRules(missionOrRules = {}) {
  const rules = missionOrRules.rules ?? missionOrRules;
  const input = rules?.priorityTargets ?? {};
  return {
    ...DEFAULT_PRIORITY_TARGET_RULES,
    ...input,
    enabled: input.enabled !== false,
    captureMode: input.captureMode ?? DEFAULT_PRIORITY_TARGET_RULES.captureMode,
    showFutureTargets: Boolean(input.showFutureTargets ?? DEFAULT_PRIORITY_TARGET_RULES.showFutureTargets),
    showActiveOnly: input.showActiveOnly !== false
  };
}

 function normalizeMissionOptions(missionOrRules = {}) {
  const rules = missionOrRules.rules ?? missionOrRules;
  const input = rules?.missionOptions ?? missionOrRules?.missionOptions ?? {};
  return {
    ...DEFAULT_MISSION_OPTIONS,
    ...input,
    ignoreUpdateEvents: Boolean(input.ignoreUpdateEvents ?? DEFAULT_MISSION_OPTIONS.ignoreUpdateEvents)
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

module.exports = {DEFAULT_END_CONDITION, DEFAULT_SAMPLING_RULES, DEFAULT_PRIORITY_TARGET_RULES, DEFAULT_MISSION_OPTIONS, normalizeEndCondition, normalizeSamplingRules, normalizePriorityTargetRules, normalizeMissionOptions}