import { ensureForecastFields } from '../sim/ChallengeMode.js';
import { createGameInstanceId, ensureLevelIdentity, getLevelIdentity } from '../identity/GameInstanceId.js';
import { normalizeEndCondition, normalizeSamplingRules } from '../sim/MissionRules.js';
import { normalizePriorityTargets, normalizePriorityTargetRules } from '../sim/PriorityTargets.js';
import { normalizeDeploymentState, summarizeDeployment } from '../deployment/DeploymentZones.js';
import { computeReachabilitySummary, stripReachableSet } from '../validation/ConnectivityValidator.js';
import { normalizeForecastRules } from '../forecast/ForecastDecay.js';
import { summarizeAgentSpecs } from '../agents/AgentSpecs.js';
import { visibilityForChallenge } from './ExportVisibility.js';

export function buildSolverPacket({ level, mission, plan = null, challengeMode = 'perfectKnowledge', includeHiddenTruth = false, forecastMemberId = null, roiViewMode = 'expectedValue', stochasticConfig = null }) {
  ensureLevelIdentity(level);
  normalizeDeploymentState(level, mission);
  if (challengeMode === 'forecast') ensureForecastFields(level);
  const createdAt = new Date().toISOString();
  const identity = getLevelIdentity(level);
  const forecastFrames = level?.layers?.forecast?.frames ?? [];
  const visibleFields = {
    terrain: level?.layers?.terrain ?? [],
    hazards: level?.layers?.hazards ?? [],
    forecast: level?.layers?.forecast ?? { frames: [] },
    forecasts: level?.layers?.forecasts ?? [],
    selectedForecastMemberId: forecastMemberId,
    roiViewMode,
    mobileHazards: level?.layers?.mobileHazards ?? [],
    priorityTargets: normalizePriorityTargets(level),
    depth: level?.layers?.depth ?? null
  };

  if (challengeMode === 'perfectKnowledge' || includeHiddenTruth) {
    visibleFields.truth = level?.layers?.truth ?? { frames: [] };
  }

  const visiblePlanningSource = challengeMode === 'forecast' ? 'forecast' : 'truth';
  const truthVisibility = challengeMode === 'forecast' && !includeHiddenTruth ? 'hidden' : 'visible';
  const visibility = visibilityForChallenge(challengeMode, { includeTruth: includeHiddenTruth, oracleMode: includeHiddenTruth });
  const packetStochasticConfig = {
    enabled: challengeMode === 'forecast',
    seed: stochasticConfig?.seed ?? mission?.rules?.stochasticSeed ?? mission?.rules?.rngSeed ?? level?.meta?.seed ?? level?.instanceId ?? null,
    roiScoringMode: stochasticConfig?.roiScoringMode ?? mission?.rules?.roiScoringMode ?? 'expectedValue',
    selectedForecastMember: stochasticConfig?.selectedForecastMember ?? forecastMemberId ?? null
  };
  const endCondition = normalizeEndCondition(mission);
  const sampling = normalizeSamplingRules(mission);
  const priorityTargetRules = normalizePriorityTargetRules(mission);
  const priorityTargets = normalizePriorityTargets(level);
  const deployment = summarizeDeployment(level, mission);
  const connectivity = stripReachableSet(computeReachabilitySummary(level, mission));
  const forecastRules = normalizeForecastRules(mission?.rules?.forecast ?? level?.meta?.generationConfig?.forecastRules ?? {});
  const agentSpecs = (mission?.agents ?? []).map(summarizeAgentSpecs);
  const vectorField = level?.meta?.generationConfig?.vectorField
    ?? level?.meta?.generationConfig?.currentGenerator
    ?? { preset: level?.meta?.generationConfig?.vectorPreset ?? level?.meta?.generationConfig?.currentPattern ?? null };
  const currentFieldConfig = level?.meta?.generationConfig?.currentFieldConfig
    ?? level?.meta?.generationConfig?.currentField
    ?? vectorField?.currentFieldConfig
    ?? null;
  const importedFlowField = level?.meta?.generationConfig?.importedFlowField ?? null;

  return {
    schemaVersion: '2.0',
    type: 'anchor.solverPacket',
    packetId: createGameInstanceId('PKT'),
    createdAt,
    levelId: identity.levelId,
    instanceId: identity.instanceId,
    missionId: mission?.missionId ?? null,
    challengeMode,
    visibility,
    selectedForecastMemberId: forecastMemberId,
    roiViewMode,
    stochasticConfig: packetStochasticConfig,
    forecastRules,
    agentSpecs,
    vectorField,
    currentFieldConfig,
    importedFlowField,
    currentFieldVisibility: {
      visibleConfigIncluded: Boolean(currentFieldConfig),
      importedFlowFieldIncluded: Boolean(importedFlowField),
      visibleFramesIncluded: true,
      hiddenTruthIncluded: challengeMode !== 'forecast' || includeHiddenTruth,
      fairness: challengeMode === 'forecast' && !includeHiddenTruth
        ? 'Solver packet exposes forecast-visible current frames/config only; hidden truth is withheld.'
        : 'Solver packet includes truth-current frames for perfect-knowledge or oracle use.'
    },
    missionRules: {
      endCondition,
      sampling,
      priorityTargets: priorityTargetRules,
      forecast: forecastRules,
      agentSpecs,
      deployment,
      connectivity
    },
    priorityTargets,
    deployment,
    connectivity,
    level,
    mission,
    truthVisibility,
    visiblePlanningSource,
    planningData: {
      visibleFields,
      scoringMode: packetStochasticConfig.roiScoringMode,
      stochasticSeed: packetStochasticConfig.seed,
      endCondition,
      sampling,
      priorityTargets,
      priorityTargetRules,
      forecastRules,
      agentSpecs,
      vectorField,
      currentFieldConfig,
      importedFlowField,
      currentFieldVisibility: {
        visibleConfigIncluded: Boolean(currentFieldConfig),
        importedFlowFieldIncluded: Boolean(importedFlowField),
        visibleFramesIncluded: true,
        hiddenTruthIncluded: Boolean(visibleFields.truth)
      },
      planningMarkers: extractPlanningMarkers(plan),
      deployment,
      connectivity,
      riskFields: {
        probabilisticROI: hasProbabilisticROI(level),
        ensembleForecasts: level?.layers?.forecasts?.length ?? 0,
        mobileHazards: level?.layers?.mobileHazards ?? [],
        depth: level?.layers?.depth ?? null,
        priorityTargets,
        scoringMode: packetStochasticConfig.roiScoringMode,
        staticHazards: level?.layers?.hazards ?? []
      },
      solverHints: {
        useExpectedValue: 'For probabilistic ROI, expectedValue = value * probability.',
        mobileHazards: 'Avoid cells near mobile hazard timed frames when possible.',
        depth: 'Shallow depth can increase energy cost when mission rules enable depth effects.',
        ensemble: 'High ensemble disagreement indicates forecast uncertainty; risk-aware solvers may penalize it.',
        endCondition: 'Check missionRules.endCondition to see whether final surfacing, communication, or recovery is required or rewarded.',
        sampling: 'Check missionRules.sampling before revisiting ROI cells; duplicate, depleted, cooldown, or persistent samples may score differently.',
        priorityTargets: 'Gold Star Targets are temporal high-value objectives. Capture them only while active and within radius.',
        planningMarkers: 'planningData.planningMarkers are player notes for future windows; they are not executable waypoints.'
      },
      hiddenTruthIncluded: Boolean(visibleFields.truth),
      forecastAvailable: forecastFrames.length > 0,
      notes: challengeMode === 'forecast'
        ? 'Forecast mode: solvers should use forecast unless hidden truth is explicitly included for benchmarking.'
        : 'Perfect knowledge mode: truth fields are visible planning data.'
    },
    algorithmSupport: buildAlgorithmSupport({ level, mission, challengeMode, includeHiddenTruth }),
    expectedPlanFormat: {
      type: 'anchor.plan',
      levelId: identity.levelId,
      instanceId: identity.instanceId,
      missionId: mission?.missionId ?? null,
      agentPlans: (mission?.agents ?? []).map((agent) => ({
        agentId: agent.id,
        markers: [],
        waypoints: [{ window: 0, x: agent.start?.x ?? 1, y: agent.start?.y ?? 1, action: 'sample' }]
      }))
    }
  };
}

function buildAlgorithmSupport({ level, mission, challengeMode, includeHiddenTruth }) {
  const time = level?.world?.time ?? {};
  return {
    graphSearch: {
      techniques: ['A*', 'Dijkstra', 'time-expanded graph search', 'dynamic programming'],
      adjacency: 'Construct 4-neighbor or 8-neighbor adjacency from terrain/traversability masks.',
      costModel: 'Use agent speed/fuel plus temporal current frames to derive travel time, energy, hazard, and risk costs.',
      state: 'cell, optional time/frame, optional fuel, optional sampled-target set',
      temporalFrames: {
        dt: time.dt ?? level?.dt ?? null,
        duration: time.duration ?? level?.duration ?? null,
        planningWindow: time.planningWindow ?? level?.planningWindow ?? null
      }
    },
    multiAgentPlanning: {
      agents: (mission?.agents ?? []).map((agent) => agent.id),
      sharedReward: 'ROI and priority target rewards are team-level; duplicate sampling behavior is defined by missionRules.sampling.',
      conflictConstraints: 'No hard collision constraint by default; external planners may add spacing or overlap penalties.'
    },
    reinforcementLearning: {
      observationSpace: challengeMode === 'forecast' && !includeHiddenTruth ? 'forecast/belief fields only' : 'truth-visible fields',
      actionSpace: 'choose deployment start when required, then waypoint cell/time/action decisions',
      reward: 'score summary components from missionRules and scoring rules',
      termination: 'mission duration, route failure, fuel/time exhaustion, or mission end condition'
    },
    supervisedLearning: {
      labels: 'Use imported/manual/baseline plans and result trajectories when present.',
      returnsToGo: 'Derive from result scoreSummary or run external evaluator on candidate plans.'
    },
    neuralPlanning: {
      tensors: 'Grid layers are exported as nested arrays; temporal frame arrays are ordered by frame t.',
      graphFeatures: 'Node features can be built from terrain, hazards, ROI, depth, current vector, forecast probability, and priority target activity.',
      sequenceFeatures: 'Use temporal current/ROI/forecast frames plus agent state and remaining horizon.'
    }
  };
}

function extractPlanningMarkers(plan) {
  return (plan?.planningMarkers ?? []).map((marker) => ({
      id: marker.id ?? null,
      x: marker.x,
      y: marker.y,
      t: marker.t ?? null,
      window: marker.window ?? 0,
      type: marker.type ?? 'futureTarget',
      label: marker.label ?? 'Planning Marker',
      linkedTargetId: marker.linkedTargetId ?? null,
      reachability: marker.reachability ?? null
  }));
}

function hasProbabilisticROI(level) {
  const frame = level?.layers?.forecast?.frames?.[0] ?? level?.layers?.truth?.frames?.[0];
  return (frame?.roi ?? []).some((row) => row.some((cell) => cell && typeof cell === 'object' && Number(cell.probability ?? 1) < 1));
}
