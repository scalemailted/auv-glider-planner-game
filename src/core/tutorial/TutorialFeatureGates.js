export function getTutorialFeatures(level = null) {
  return level?.tutorial?.enabledFeatures ?? null;
}

export function isTutorialScenario(stateOrLevel = null) {
  const level = stateOrLevel?.level ?? stateOrLevel;
  return Boolean(level?.tutorial?.definitionId || level?.campaign?.order);
}

export function tutorialFeatureEnabled(stateOrLevel = null, feature, fallback = true) {
  const level = stateOrLevel?.level ?? stateOrLevel;
  const features = getTutorialFeatures(level);
  if (!features) return fallback;
  return features[feature] !== false;
}

export function getAllowedRoiModesForTutorial(stateOrLevel = null) {
  const level = stateOrLevel?.level ?? stateOrLevel;
  const features = getTutorialFeatures(level);
  if (!features) return null;
  const modes = ['value'];
  if (features.probabilityModes || features.stochastic) modes.push('probability', 'expectedValue');
  else modes.push('expectedValue');
  if (features.remainingMode || features.multiAgent) modes.push('remaining');
  if (features.hazards) modes.push('risk', 'safety');
  if (features.travelCost) modes.push('travelCost');
  return unique(modes);
}

export function nextAllowedRoiMode(current, stateOrLevel = null, fallbackNext) {
  const modes = getAllowedRoiModesForTutorial(stateOrLevel);
  if (!modes) return fallbackNext;
  const index = modes.indexOf(current);
  return modes[(index + 1) % modes.length] ?? modes[0];
}

export function getTutorialHint(level = null, state = null) {
  const prompts = level?.tutorial?.planningPrompts ?? [];
  if (!prompts.length) return null;
  const selectedPrompt = prompts[Math.min(prompts.length - 1, Math.max(0, Number(state?.selectedWindow ?? 0)))];
  return selectedPrompt ?? prompts[0];
}

function unique(values) {
  return [...new Set(values)];
}
