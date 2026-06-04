import { buildChallengeExport } from './ChallengeExporter.js';
import { buildSolverPacket } from './SolverPacketExporter.js';
import { cloneJson, EXPORT_SCHEMA_VERSION, visibilityForChallenge } from './ExportVisibility.js';
import { normalizePriorityTargets } from '../sim/PriorityTargets.js';

export function buildOracleDatasetExport({
  level,
  mission,
  plan = null,
  result = null,
  challengeMode = 'perfectKnowledge',
  forecastMemberId = null,
  roiViewMode = 'expectedValue',
  stochasticConfig = null,
  attempts = []
} = {}) {
  const challenge = buildChallengeExport({ level, mission, challengeMode, includeHiddenTruth: true });
  const solverPacket = buildSolverPacket({
    level,
    mission,
    plan,
    challengeMode,
    includeHiddenTruth: true,
    forecastMemberId,
    roiViewMode,
    stochasticConfig
  });
  const truth = cloneJson(level?.layers?.truth ?? null);
  const forecast = cloneJson(level?.layers?.forecast ?? null);
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    type: 'anchor.oracleDataset',
    createdAt: new Date().toISOString(),
    label: 'Research/oracle export. Contains hidden truth. Do not use for fair player planning.',
    visibility: visibilityForChallenge(challengeMode, { oracleMode: true }),
    challenge,
    solverPacket,
    oracle: {
      hiddenTruth: truth,
      forecast,
      forecasts: cloneJson(level?.layers?.forecasts ?? []),
      truthForecastDeltas: buildTruthForecastDeltas(truth, forecast),
      terrainMask: cloneJson(level?.layers?.terrain ?? []),
      reachableMasks: cloneJson(level?.meta?.connectivity ?? null),
      currentFields: {
        truth: cloneJson((truth?.frames ?? []).map((frame) => ({ t: frame.t, current: frame.current ?? null }))),
        forecast: cloneJson((forecast?.frames ?? []).map((frame) => ({ t: frame.t, current: frame.current ?? null })))
      },
      roiValues: {
        truth: cloneJson((truth?.frames ?? []).map((frame) => ({ t: frame.t, roi: frame.roi ?? null }))),
        forecast: cloneJson((forecast?.frames ?? []).map((frame) => ({ t: frame.t, roi: frame.roi ?? null })))
      },
      priorityTargets: cloneJson(normalizePriorityTargets(level)),
      scoringLabels: cloneJson(result?.summary ?? null)
    },
    trajectories: extractTrajectories(result),
    attempts: cloneJson(attempts),
    result: cloneJson(result),
    featureSpec: buildFeatureSpec(),
    split: {
      strategy: 'single-export',
      train: [],
      validation: [],
      test: []
    }
  };
}

function buildTruthForecastDeltas(truth, forecast) {
  const truthFrames = truth?.frames ?? [];
  const forecastFrames = forecast?.frames ?? [];
  return truthFrames.map((truthFrame, index) => ({
    t: truthFrame.t,
    forecastT: forecastFrames[index]?.t ?? null,
    hasCurrentDelta: Boolean(truthFrame.current && forecastFrames[index]?.current),
    hasRoiDelta: Boolean(truthFrame.roi && forecastFrames[index]?.roi)
  }));
}

function extractTrajectories(result) {
  return {
    frames: cloneJson(result?.frames ?? []),
    events: cloneJson(result?.events ?? []),
    sampledCells: cloneJson(result?.summary?.sampledCells ?? result?.sampledCells ?? []),
    priorityTargetCaptures: cloneJson(result?.priorityTargets?.captures ?? [])
  };
}

function buildFeatureSpec() {
  return {
    classicalPlanning: ['grid cells', 'traversability mask', 'temporal current frames', 'ROI rewards', 'hazard costs', 'fuel/time limits'],
    reinforcementLearning: ['observation spec', 'action set', 'reward summary', 'terminal conditions', 'reset seed metadata'],
    supervisedLearning: ['trajectory frames', 'state-action labels when a plan/result is included', 'returns via result summary'],
    neuralPlanning: ['grid tensors', 'temporal sequences', 'agent specs', 'node/edge features derivable from grid adjacency']
  };
}
