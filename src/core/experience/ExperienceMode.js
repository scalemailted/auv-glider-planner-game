export const EXPERIENCE_MODES = {
  challenge: 'challenge',
  simulationLab: 'simulationLab'
};

export const EXPERIENCE_MODE_DEFAULTS = {
  challenge: {
    label: 'Challenge Mode',
    shortLabel: 'Challenge',
    description: 'Plan missions, chase stars, manage risk, and compete for score.',
    showAdvancedConfig: false,
    showSolverTools: false,
    showDebugPanels: false,
    showExportsProminent: false,
    routeAssistant: true,
    medalsEnabled: true,
    leaderboardEnabled: true,
    defaultCurrentComplexity: 'medium'
  },
  simulationLab: {
    label: 'Simulation Lab',
    shortLabel: 'Lab',
    description: 'Configure reproducible experiments, export solver packets, and inspect current-field diagnostics.',
    showAdvancedConfig: true,
    showSolverTools: true,
    showDebugPanels: true,
    showExportsProminent: true,
    routeAssistant: false,
    medalsEnabled: false,
    leaderboardEnabled: false,
    defaultCurrentComplexity: 'medium'
  }
};

export function normalizeExperienceMode(value, fallback = EXPERIENCE_MODES.challenge) {
  return Object.values(EXPERIENCE_MODES).includes(value) ? value : fallback;
}

export function getExperienceModeDefaults(value) {
  const mode = normalizeExperienceMode(value);
  return EXPERIENCE_MODE_DEFAULTS[mode];
}

export function experienceModeLabel(value) {
  return getExperienceModeDefaults(value).label;
}
