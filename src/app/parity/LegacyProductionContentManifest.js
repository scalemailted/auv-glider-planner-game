export const LEGACY_PRODUCTION_CONTENT_MANIFEST_VERSION = 'legacy-production-content-manifest-mig-r2-2';

export const LEGACY_PRODUCTION_CONTENT_MANIFEST = Object.freeze([
  {
    routeId: 'mainMenu',
    legacySceneId: 'MainMenuScene',
    layoutId: 'productHub',
    requiredRegions: ['missionViewport'],
    optionalRegions: ['missionConsole'],
    hiddenRegions: ['waypointPanel', 'timeline', 'performanceBar'],
    requiredSections: ['productHub', 'challengeMode', 'simulationLab', 'learningLabs'],
    requiredControls: ['challenge-mode-card', 'simulation-lab-card', 'learning-labs-card'],
    requiredHeadings: ['ANCHOR Mission Planner', 'Challenge Mode', 'Simulation Lab', 'Learning Labs'],
    requiredStatusFields: ['runtimeBoundary'],
    forbiddenSections: ['missionSetupForm', 'missionBriefing', 'planningTools', 'simulationTransport', 'debriefScorecard'],
    transitions: { primary: 'missionSetup', next: 'missionSetup', legacy: 'legacyPhaser' }
  },
  {
    routeId: 'missionSetup',
    legacySceneId: 'MainMenuScene.setupFlow',
    layoutId: 'setup',
    requiredRegions: ['missionConsole', 'missionViewport'],
    optionalRegions: ['waypointPanel'],
    hiddenRegions: ['timeline', 'performanceBar'],
    requiredSections: ['setupForm', 'missionConfiguration', 'visibilityConfiguration', 'generationControls'],
    requiredControls: ['mission-mode-select', 'visibility-mode-select', 'seed-input', 'generate-mission', 'continue-to-briefing'],
    requiredHeadings: ['Mission Setup'],
    requiredStatusFields: ['experienceMode', 'visibilityMode', 'seed'],
    forbiddenSections: ['missionBriefing', 'planningTools', 'simulationTransport', 'debriefScorecard'],
    transitions: { back: 'mainMenu', primary: 'missionBriefing', next: 'missionBriefing' }
  },
  {
    routeId: 'missionBriefing',
    legacySceneId: 'MissionBriefingScene',
    layoutId: 'briefing',
    requiredRegions: ['missionConsole', 'missionViewport', 'waypointPanel'],
    hiddenRegions: ['timeline', 'performanceBar'],
    requiredSections: ['missionBriefing', 'missionObjective', 'scenarioSummary', 'fleetSummary', 'constraintSummary'],
    requiredControls: ['begin-planning', 'return-to-setup'],
    requiredHeadings: ['Mission Briefing'],
    requiredStatusFields: ['missionId', 'duration', 'agents', 'visibilityMode'],
    forbiddenSections: ['missionSetupForm', 'planningTools', 'simulationTransport', 'debriefScorecard'],
    transitions: { back: 'missionSetup', primary: 'missionPlanning', next: 'missionPlanning' }
  },
  {
    routeId: 'missionPlanning',
    legacySceneId: 'MissionWorkspaceScene',
    layoutId: 'missionWorkspace',
    requiredRegions: ['missionConsole', 'missionViewport', 'waypointPanel', 'timeline', 'performanceBar'],
    requiredSections: ['planningTools', 'selectedGlider', 'dropZoneSummary', 'waypointList', 'routeMetrics', 'planningTimeline', 'missionPerformance'],
    requiredControls: ['three-mission-canvas', 'selected-agent', 'waypoint-count', 'interaction-mode', 'planning-time-control', 'launch-simulation'],
    requiredHeadings: ['Mission Planning', 'Planning Tools', 'Mission Waypoints'],
    requiredStatusFields: ['selectedAgent', 'waypointCount', 'routeGrade', 'activeTime'],
    forbiddenSections: ['missionSetupForm', 'simulationTransport', 'debriefScorecard'],
    transitions: { back: 'missionBriefing', primary: 'missionSimulation', next: 'missionSimulation' }
  },
  {
    routeId: 'missionSimulation',
    legacySceneId: 'SimulationScene',
    layoutId: 'simulationWorkspace',
    requiredRegions: ['missionConsole', 'missionViewport', 'waypointPanel', 'timeline', 'performanceBar'],
    requiredSections: ['simulationStatus', 'simulationTransport', 'fleetStatus', 'executionStatus', 'missionPerformance'],
    requiredControls: ['simulation-pause', 'simulation-resume', 'simulation-step', 'simulation-finish', 'simulation-time', 'mission-performance'],
    requiredHeadings: ['Mission Simulation', 'Simulation Control', 'Mission Waypoints'],
    requiredStatusFields: ['simulationTime', 'stepCount', 'score', 'energy'],
    forbiddenSections: ['missionSetupForm', 'planningEditTools', 'debriefScorecard'],
    transitions: { back: 'missionPlanning', primary: 'missionDebrief', next: 'missionDebrief' }
  },
  {
    routeId: 'missionDebrief',
    legacySceneId: 'DebriefScene',
    layoutId: 'debrief',
    requiredRegions: ['missionConsole', 'missionViewport', 'waypointPanel'],
    optionalRegions: ['performanceBar'],
    hiddenRegions: ['timeline'],
    requiredSections: ['debriefScorecard', 'routeGrade', 'scienceResult', 'safetyResult', 'exportActions'],
    requiredControls: ['official-score', 'rerun-mission', 'return-to-planning', 'return-to-menu'],
    requiredHeadings: ['Mission Debrief'],
    requiredStatusFields: ['officialScore', 'roiCollected', 'energyUsed', 'hazards'],
    forbiddenSections: ['missionSetupForm', 'planningEditTools', 'simulationTransport'],
    transitions: { back: 'missionPlanning', primary: 'mainMenu', next: 'mainMenu' }
  },
  {
    routeId: 'importExport',
    legacySceneId: 'LoadLevelJsonScene',
    layoutId: 'setup',
    requiredRegions: ['missionConsole', 'missionViewport'],
    requiredSections: ['importFlow', 'validationStatus'],
    requiredControls: ['import-file-input', 'import-status'],
    requiredHeadings: ['Import / Export'],
    requiredStatusFields: ['importStatus'],
    forbiddenSections: ['planningTools', 'simulationTransport', 'debriefScorecard'],
    transitions: { back: 'mainMenu', primary: 'missionBriefing' }
  },
  {
    routeId: 'leaderboard',
    legacySceneId: 'DebriefScene.leaderboardPanels',
    layoutId: 'debrief',
    requiredRegions: ['missionConsole', 'missionViewport'],
    requiredSections: ['leaderboard', 'savedAttempts'],
    requiredControls: ['leaderboard-attempt-list'],
    requiredHeadings: ['Leaderboard'],
    requiredStatusFields: ['attemptCount'],
    forbiddenSections: ['missionSetupForm', 'simulationTransport'],
    transitions: { back: 'mainMenu', primary: 'missionBriefing' }
  }
]);

export function productionContentManifestForRoute(routeId) {
  return LEGACY_PRODUCTION_CONTENT_MANIFEST.find((entry) => entry.routeId === routeId) ?? null;
}

export function validateProductionContentManifest(manifest = LEGACY_PRODUCTION_CONTENT_MANIFEST) {
  const errors = [];
  const routeIds = new Set();
  for (const entry of manifest) {
    if (!entry.routeId) errors.push('Every manifest entry requires routeId.');
    if (routeIds.has(entry.routeId)) errors.push(`Duplicate routeId ${entry.routeId}.`);
    routeIds.add(entry.routeId);
    for (const key of ['legacySceneId', 'layoutId']) {
      if (!entry[key]) errors.push(`${entry.routeId} missing ${key}.`);
    }
    for (const key of ['requiredRegions', 'requiredSections', 'requiredControls', 'requiredHeadings']) {
      if (!Array.isArray(entry[key])) errors.push(`${entry.routeId} ${key} must be an array.`);
    }
    if (!entry.transitions || typeof entry.transitions !== 'object') errors.push(`${entry.routeId} missing transitions.`);
  }
  return { valid: errors.length === 0, errors, routeCount: manifest.length };
}

export function productionContentManifestSummary(manifest = LEGACY_PRODUCTION_CONTENT_MANIFEST) {
  const validation = validateProductionContentManifest(manifest);
  return {
    type: 'anchor.production-ui.content-manifest.summary',
    version: LEGACY_PRODUCTION_CONTENT_MANIFEST_VERSION,
    routeCount: manifest.length,
    routeIds: manifest.map((entry) => entry.routeId),
    valid: validation.valid,
    errors: validation.errors
  };
}
