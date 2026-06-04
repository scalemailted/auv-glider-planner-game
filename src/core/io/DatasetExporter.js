import { generateLevel } from '../generation/LevelGenerator.js';
import { buildSolverPacket } from './SolverPacketExporter.js';
import { createGameInstanceId, getLevelIdentity } from '../identity/GameInstanceId.js';
import { normalizeEndCondition, normalizeSamplingRules } from '../sim/MissionRules.js';
import { summarizeDeployment } from '../deployment/DeploymentZones.js';
import { normalizePriorityTargets, normalizePriorityTargetRules } from '../sim/PriorityTargets.js';
import { normalizeForecastRules } from '../forecast/ForecastDecay.js';
import { summarizeAgentSpecs } from '../agents/AgentSpecs.js';

export function generateDataset(config = {}, mission) {
  const count = clampInt(config.count ?? 5, 1, 50);
  const seedStart = Number(config.seedStart ?? 1);
  const levels = Array.from({ length: count }, (_, index) => generateLevel({
    seed: seedStart + index,
    levelId: `dataset_${seedStart + index}`,
    name: `Dataset Level ${seedStart + index}`,
    width: config.width,
    height: config.height,
    difficulty: config.difficulty,
    currentPattern: config.currentPattern,
    currentPreset: config.currentPreset,
    vectorPreset: config.currentPreset ?? config.vectorPreset,
    fluidPreset: config.fluidPreset,
    currentStrength: config.currentStrength,
    currentVariability: config.currentVariability,
    fluidViscosity: config.fluidViscosity,
    fluidIterations: config.fluidIterations,
    fluidVorticityConfinement: config.fluidVorticityConfinement,
    hazardDensity: config.hazardDensity,
    roiHotspots: config.roiHotspots,
    forecastMode: config.forecastMode ?? 'noisy',
    forecastNoise: config.forecastNoise,
    ensembleCount: config.ensembleCount ?? 3,
    roiProbabilityMode: config.roiProbabilityMode ?? 'variable',
    mobileHazardsCount: config.mobileHazardsCount ?? 1,
    depthVariation: config.depthVariation ?? 0.45,
    roiScoringMode: config.roiScoringMode ?? 'expectedValue',
    challengeMode: config.challengeMode ?? 'forecast'
  }));

  const missionRules = {
    endCondition: normalizeEndCondition(mission),
    sampling: normalizeSamplingRules(mission),
    priorityTargets: normalizePriorityTargetRules(mission),
    deployment: summarizeDeployment(levels[0], mission)
  };

  const packets = levels.map((level) => buildSolverPacket({
    level,
    mission,
    challengeMode: config.challengeMode ?? level.challengeMode ?? 'forecast',
    includeHiddenTruth: Boolean(config.includeHiddenTruth),
    forecastMemberId: config.selectedForecastMember ?? 'ensemble_mean',
    stochasticConfig: {
      seed: config.stochasticSeed ?? level.meta?.seed ?? level.instanceId,
      roiScoringMode: config.roiScoringMode ?? 'expectedValue',
      selectedForecastMember: config.selectedForecastMember ?? 'ensemble_mean'
    }
  }));

  const examples = levels.map((level) => ({
    levelId: level.levelId,
    instanceId: level.instanceId,
    missionId: mission?.missionId ?? null,
    input: { level, mission },
    target: { plan: null },
    metadata: {
      difficulty: level.meta?.difficulty,
      seed: level.meta?.seed,
      instanceId: level.instanceId,
      generationConfig: level.meta?.generationConfig ?? null,
      vectorField: level.meta?.generationConfig?.vectorField ?? level.meta?.generationConfig?.currentGenerator ?? null,
      forecastRules: normalizeForecastRules(mission?.rules?.forecast ?? level.meta?.generationConfig?.forecastRules ?? {}),
      connectivity: level.meta?.connectivity ?? null,
      priorityTargets: normalizePriorityTargets(level),
      priorityTargetCount: normalizePriorityTargets(level).length,
      missionRules,
      challengeMode: config.challengeMode ?? level.challengeMode ?? 'forecast',
      forecastNoise: config.forecastNoise ?? null,
      stochastic: {
        roiScoringMode: config.roiScoringMode ?? 'expectedValue',
        rngSeed: config.stochasticSeed ?? level.meta?.seed ?? level.instanceId,
        selectedForecastMember: config.selectedForecastMember ?? 'ensemble_mean',
        outcomeMetadata: {
          deterministicBySeed: true,
          sampledAtSimulationTime: true,
          eventType: 'probabilityOutcome'
        },
        probabilisticROI: Boolean(level.meta?.generationConfig?.probabilisticROI),
        ensembleCount: level.layers?.forecasts?.length ?? 0,
        mobileHazards: level.layers?.mobileHazards?.length ?? 0,
        depth: Boolean(level.layers?.depth)
      },
      agentSpecs: (mission?.agents ?? []).map(summarizeAgentSpecs)
    }
  }));

  return { levels, packets, examples };
}

export function buildLevelDataset(levels) {
  return {
    schemaVersion: '2.0',
    type: 'anchor.levelDataset',
    datasetId: createGameInstanceId('DATASET'),
    createdAt: new Date().toISOString(),
    levelIdentities: levels.map(getLevelIdentity),
    stochasticMetadata: levels.map((level) => ({
      levelId: level.levelId,
      instanceId: level.instanceId,
      rngSeed: level.meta?.seed ?? level.instanceId,
      stochasticSeed: level.meta?.generationConfig?.stochasticSeed ?? level.meta?.seed ?? level.instanceId,
      forecastRules: normalizeForecastRules(level.meta?.generationConfig?.forecastRules ?? {}),
      vectorField: level.meta?.generationConfig?.vectorField ?? level.meta?.generationConfig?.currentGenerator ?? null,
      roiScoringMode: level.meta?.generationConfig?.roiScoringMode ?? 'expectedValue',
      selectedForecastMember: level.meta?.generationConfig?.selectedForecastMember ?? 'ensemble_mean',
      stochasticOutcomeMetadata: {
        deterministicBySeed: true,
        eventType: 'probabilityOutcome'
      },
      probabilisticROI: Boolean(level.meta?.generationConfig?.probabilisticROI),
      ensembleCount: level.layers?.forecasts?.length ?? 0,
      mobileHazards: level.layers?.mobileHazards?.length ?? 0,
      priorityTargets: normalizePriorityTargets(level).length,
      depth: Boolean(level.layers?.depth),
      connectivity: level.meta?.connectivity ?? null
    })),
    levels
  };
}

export function buildSolverPacketDataset(packets) {
  return {
    schemaVersion: '2.0',
    type: 'anchor.solverPacketDataset',
    datasetId: createGameInstanceId('DATASET'),
    createdAt: new Date().toISOString(),
    packets
  };
}

export function buildTrainingExamplesJSONL(examples) {
  return examples.map((example) => JSON.stringify(example)).join('\n');
}

function clampInt(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}
