import { createEmptyProgress, loadCampaignProgress } from '../../core/campaign/CampaignProgress.js';
import { createEmptyPlanResultStore } from '../../core/evaluation/PlanResultStore.js';
import { createDefaultStochasticState, createEmptyStochasticRunStore } from '../../core/evaluation/StochasticRunStore.js';

export function createGameState() {
  return { mode: 'menu', level: null, mission: null, plan: null, result: null, customLevel: null, importedLevel: null, importedMission: null, currentScenario: null, pendingScenarioSetup: null, selectedAgentId: null, selectedWindow: 0, planningTime: 0, challengeMode: 'perfectKnowledge', missionMode: null,
    simulationResume: null, surfacedAgents: [], surfaceDecision: null, routeFailureDecision: null,
    simulation: createDefaultSimulationState(),
    missionOptions: { ignoreUpdateEvents: false },
    currentPlanSource: 'manual', manualPlan: null, solverPlan: null, temporalGreedyPlan: null, greedyPlan: null, manualResult: null, solverResult: null, temporalGreedyResult: null, greedyResult: null, planResults: createEmptyPlanResultStore(),
    stochastic: createDefaultStochasticState(),
    stochasticRuns: createEmptyStochasticRunStore(),
    progress: safeLoadProgress(),
    playback: { running: false, time: 0, speed: 1 }, ui: {
      showCurrents: true,
      showROI: true,
      showHazards: true,
      showWater: true,
      showTerrain: true,
      showPlannedPath: true,
      showActualPath: true,
      revealTruth: false,
      showConfidence: false,
      showGuidance: true,
      showDriftCone: true,
      showReachableArea: true,
      showPredictedSurfacing: true,
      showEnergyPreview: true,
      showPlanningMarkers: true,
      showPriorityStars: true,
      showBestPathOverlay: false,
      forecastMemberId: 'ensemble_mean',
      roiViewMode: 'expectedValue',
      showEnsembleDisagreement: true,
      selectedWaypoint: null,
      selectedMarker: null,
      hoverCell: null,
      placementMode: 'waypoint',
      plannerState: {
        temporalGreedyRunning: false,
        activePlannerRequestId: null
      },
      mapCamera: { zoom: 1, panX: 0, panY: 0 }
    } };
}

function createDefaultSimulationState() {
  return {
    running: false,
    paused: false,
    waitingForPlayerDecision: false,
    waitingForImport: false,
    waitingForExternalSolver: false,
    pauseReason: null
  };
}

function safeLoadProgress() {
  if (typeof globalThis.localStorage === 'undefined') return createEmptyProgress();
  return loadCampaignProgress();
}
