import { getLevelIdentity } from '../identity/GameInstanceId.js';

export function getBestAttemptForChallenge(board, { level = null, mission = null } = {}) {
  const record = findMatchingRecord(board, { level, mission });
  if (!record) return null;
  const attempts = (record.attempts ?? []).map((attempt) => normalizeBestAttempt(attempt, record));
  const bestAttempt = attempts.sort(compareAttempts)[0] ?? null;
  if (!bestAttempt) return null;
  return {
    record,
    attempt: bestAttempt,
    bestAttemptId: bestAttempt.attemptId,
    bestScore: bestAttempt.score,
    bestPlan: bestAttempt.plan,
    bestResult: bestAttempt.result,
    bestPathSummary: bestAttempt.pathSummary,
    attemptCount: attempts.length
  };
}

export function normalizeBestAttempt(attempt = {}, record = {}) {
  const result = attempt.result?.rawResult ?? attempt.result ?? null;
  const summary = attempt.summary ?? result?.summary ?? attempt.result?.scoreSummary ?? {};
  const plan = attempt.plan ?? attempt.result?.plan ?? result?.plan ?? null;
  const frames = result?.frames ?? result?.routeExecution?.frames ?? attempt.result?.routeExecution?.frames ?? [];
  const events = result?.events ?? result?.routeExecution?.events ?? attempt.result?.routeExecution?.events ?? [];
  const pathSummary = {
    waypointCount: countWaypoints(plan),
    sampleCount: Number(summary.sampledCells ?? summary.sampleCount ?? events.filter((event) => event.type === 'sample').length ?? 0),
    starsCaptured: Number(summary.priorityTargets?.captured ?? result?.priorityTargets?.captured ?? 0),
    starsAvailable: Number(summary.priorityTargets?.available ?? result?.priorityTargets?.available ?? 0),
    energyUsed: finiteOrNull(summary.energyUsed),
    hazardsHit: Number(summary.hazardsHit ?? 0) + Number(summary.mobileHazardsHit ?? 0),
    elapsedTime: finiteOrNull(summary.elapsedTime),
    actualPathAvailable: Array.isArray(frames) && frames.length > 0,
    eventCount: Array.isArray(events) ? events.length : 0
  };
  return {
    ...attempt,
    attemptId: attempt.attemptId ?? attempt.id ?? null,
    score: Number(attempt.score ?? summary.finalScore ?? summary.score ?? 0),
    plan,
    result,
    summary,
    pathSummary: attempt.pathSummary ?? pathSummary,
    recordInstanceId: record.instanceId ?? null,
    recordReplaySeedAnchor: record.replaySeedAnchor ?? record.replaySeedContract?.replaySeedAnchor ?? null,
    replaySeedAnchor: attempt.replaySeedAnchor ?? result?.replaySeedAnchor ?? record.replaySeedAnchor ?? null,
    generationVersion: attempt.generationVersion ?? result?.generationVersion ?? record.generationVersion ?? null,
    generationConfig: attempt.generationConfig ?? result?.generationConfig ?? record.generationConfig ?? null,
    derivedSeeds: attempt.derivedSeeds ?? result?.derivedSeeds ?? record.derivedSeeds ?? null,
    replaySeedContract: attempt.replaySeedContract ?? result?.replaySeedContract ?? record.replaySeedContract ?? null,
    exactReplay: attempt.exactReplay ?? result?.exactReplay ?? record.exactReplay ?? null,
    missionOptions: attempt.missionOptions ?? result?.missionOptions ?? record.missionOptions ?? null,
    recordLevelId: record.levelId ?? null,
    recordMissionId: record.missionId ?? null,
    recordChallengeMode: record.challengeMode ?? record.mode ?? null
  };
}

export function compareAttempts(a, b) {
  return Number(b.fairness?.fairForLeaderboard ?? true) - Number(a.fairness?.fairForLeaderboard ?? true)
    || Number(b.score ?? 0) - Number(a.score ?? 0)
    || Number(a.pathSummary?.energyUsed ?? a.summary?.energyUsed ?? Infinity) - Number(b.pathSummary?.energyUsed ?? b.summary?.energyUsed ?? Infinity)
    || Number(a.pathSummary?.hazardsHit ?? a.summary?.hazardsHit ?? Infinity) - Number(b.pathSummary?.hazardsHit ?? b.summary?.hazardsHit ?? Infinity)
    || Number(a.pathSummary?.elapsedTime ?? a.summary?.elapsedTime ?? Infinity) - Number(b.pathSummary?.elapsedTime ?? b.summary?.elapsedTime ?? Infinity);
}

export function bestAttemptCompatible(best, { level = null, mission = null } = {}) {
  if (!best?.attempt) return { ok: false, reason: 'No best attempt is available.' };
  const record = best.record ?? {};
  const identity = getLevelIdentity(level);
  if (record.instanceId && identity.instanceId && record.instanceId !== identity.instanceId) {
    return { ok: false, reason: 'Best path belongs to a different challenge instance.' };
  }
  if (record.levelId && identity.levelId && record.levelId !== identity.levelId) {
    return { ok: false, reason: 'Best path belongs to a different level.' };
  }
  if (record.missionId && mission?.missionId && record.missionId !== mission.missionId) {
    return { ok: false, reason: 'Best path belongs to a different mission.' };
  }
  const planAgents = new Set((best.attempt.plan?.agentPlans ?? []).map((plan) => plan.agentId));
  const missionAgents = new Set((mission?.agents ?? []).map((agent) => agent.id));
  for (const agentId of planAgents) {
    if (!missionAgents.has(agentId)) return { ok: false, reason: `Best path references missing agent ${agentId}.` };
  }
  const grid = level?.world?.grid ?? {};
  const recordGrid = record.level?.world?.grid ?? {};
  if (recordGrid.width && grid.width && (Number(recordGrid.width) !== Number(grid.width) || Number(recordGrid.height) !== Number(grid.height))) {
    return { ok: false, reason: 'Best path map dimensions differ from the current challenge.' };
  }
  return { ok: true, reason: 'compatible' };
}

function findMatchingRecord(board, { level, mission }) {
  const identity = getLevelIdentity(level);
  const records = Object.values(board?.records ?? {});
  return records.find((record) => record.instanceId === identity.instanceId && (!mission?.missionId || !record.missionId || record.missionId === mission.missionId))
    ?? records.find((record) => record.levelId === identity.levelId && record.missionId === mission?.missionId)
    ?? null;
}

function countWaypoints(plan) {
  return (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0);
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
