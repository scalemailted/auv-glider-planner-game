import { getBestAttempt, loadLeaderboard, normalizeLeaderboard } from '../storage/LeaderboardStore.js';
import { buildChallengeExport } from './ChallengeExporter.js';
import { EXPORT_SCHEMA_VERSION, cloneJson } from './ExportVisibility.js';
import { evaluateExactReplayAvailability, getReplaySeedContract } from '../random/ReplaySeedContract.js';

export function buildLeaderboardExport(board = loadLeaderboard(), { embedChallenges = true } = {}) {
  const normalized = normalizeLeaderboard(board);
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    type: 'anchor.leaderboard',
    createdAt: new Date().toISOString(),
    records: Object.fromEntries(Object.values(normalized.records ?? {}).map((record) => [
      record.instanceId,
      buildLeaderboardRecordExport(record, { embedChallenge: embedChallenges })
    ]))
  };
}

export function buildLeaderboardRecordExport(record, { embedChallenge = true } = {}) {
  const best = getBestAttempt({ records: { [record.instanceId]: record } }, record.instanceId);
  const replaySeedContract = getReplaySeedContract(record);
  const exactReplay = evaluateExactReplayAvailability(record);
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    type: 'anchor.leaderboardRecord',
    levelId: record.levelId,
    instanceId: record.instanceId,
    challengeId: record.challengeId ?? record.instanceId,
    missionId: record.missionId,
    challengeMode: record.challengeMode ?? record.mode ?? null,
    experienceMode: record.experienceMode ?? null,
    leaderboardScope: record.leaderboardScope ?? record.experienceMode ?? 'challenge',
    missionMode: record.missionMode ?? null,
    scenarioFingerprint: record.scenarioFingerprint ?? null,
    replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? record.instanceId,
    generationVersion: replaySeedContract?.generationVersion ?? null,
    generationConfig: cloneJson(replaySeedContract?.generationConfig ?? record.generationConfig ?? null),
    derivedSeeds: cloneJson(replaySeedContract?.derivedSeeds ?? null),
    replaySeedContract: cloneJson(replaySeedContract),
    exactReplay: {
      available: exactReplay.available,
      method: exactReplay.method,
      reason: exactReplay.reason
    },
    bestScore: best?.score ?? null,
    bestScoreResultDigest: best?.scoreResultDigest ?? null,
    bestScoreDigest: best?.scoreDigest ?? null,
    bestScoreProfileId: best?.scoreProfileId ?? null,
    bestScoreProfileVersion: best?.scoreProfileVersion ?? null,
    bestScoreProfileDigest: best?.scoreProfileDigest ?? null,
    bestAttemptId: best?.attemptId ?? null,
    bestPlan: cloneJson(best?.plan ?? null),
    bestSource: best?.routeSource ?? classifyAttempt(best),
    bestRouteSource: best?.routeSource ?? classifyAttempt(best),
    bestSolverId: best?.solverId ?? null,
    bestSolverLabel: best?.solverLabel ?? null,
    bestFairness: fairnessForAttempt(best),
    attempts: cloneJson(record.attempts ?? []),
    timestamps: {
      lastPlayedAt: record.lastPlayedAt ?? null,
      bestCreatedAt: best?.createdAt ?? null
    },
    labels: {
      best: best?.label ?? null
    },
    challengeReference: {
      levelId: record.levelId,
      instanceId: record.instanceId,
      challengeId: record.challengeId ?? record.instanceId,
      missionId: record.missionId,
      challengeMode: record.challengeMode ?? record.mode ?? null,
      experienceMode: record.experienceMode ?? null,
      replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? record.instanceId,
      generationVersion: replaySeedContract?.generationVersion ?? null
    },
    embeddedChallenge: embedChallenge && record.level && record.mission
      ? buildChallengeExport({
        level: record.level,
        mission: record.mission,
        challengeMode: record.challengeMode ?? record.mode,
        experienceMode: record.experienceMode,
        includeHiddenTruth: false
      })
      : null
  };
}

function classifyAttempt(attempt) {
  const planner = attempt?.plan?.planner ?? attempt?.plan?.meta?.planner ?? {};
  if (planner.usesOracle) return 'oracle-assisted';
  if (planner.type === 'manual' || attempt?.label === 'Manual Player Plan') return 'manual';
  if (planner.type === 'policy') return 'imported ML/policy';
  if (planner.name || planner.type || attempt?.plan?.meta?.solver) return 'solver';
  return 'unknown';
}

function fairnessForAttempt(attempt) {
  const planner = attempt?.plan?.planner ?? attempt?.plan?.meta?.planner ?? {};
  return {
    usesForecast: Boolean(planner.usesForecast),
    usesTruth: Boolean(planner.usesTruth),
    usesOracle: Boolean(planner.usesOracle),
    fairForLeaderboard: !planner.usesOracle && !planner.usesTruth
  };
}
