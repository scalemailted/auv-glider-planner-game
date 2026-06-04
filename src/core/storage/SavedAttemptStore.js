import { buildResultExport } from '../io/ResultExporter.js';
import { cloneJson } from '../io/ExportVisibility.js';
import { evaluateExactReplayAvailability, getReplaySeedContract } from '../random/ReplaySeedContract.js';

export const SAVED_ATTEMPT_STORAGE_KEY = 'anchorGliderCommand.savedAttempts.v1';

export function loadSavedAttempts() {
  return loadJson(SAVED_ATTEMPT_STORAGE_KEY, { attempts: {} });
}

export function saveAttemptToLocalStore({ level, mission, plan, result, label = 'Manual Player Plan' } = {}) {
  const attempt = buildResultExport({ level, mission, plan, result, label });
  const replaySeedContract = getReplaySeedContract({ level, mission, generationConfig: level?.meta?.generationConfig ?? null });
  const exactReplay = evaluateExactReplayAvailability({ level, mission, replaySeedContract });
  const store = loadSavedAttempts();
  store.attempts ??= {};
  const key = `${attempt.instanceId ?? 'unknown'}:${result?.leaderboardAttempt?.attemptId ?? attempt.createdAt}`;
  store.attempts[key] = {
    key,
    instanceId: attempt.instanceId,
    challengeId: attempt.challengeId ?? attempt.instanceId,
    levelId: attempt.levelId,
    missionId: attempt.missionId,
    replaySeedAnchor: replaySeedContract?.replaySeedAnchor ?? attempt.instanceId,
    generationVersion: replaySeedContract?.generationVersion ?? null,
    generationConfig: cloneJson(replaySeedContract?.generationConfig ?? level?.meta?.generationConfig ?? null),
    derivedSeeds: cloneJson(replaySeedContract?.derivedSeeds ?? null),
    replaySeedContract: cloneJson(replaySeedContract),
    exactReplay: {
      available: exactReplay.available,
      method: exactReplay.method,
      reason: exactReplay.reason
    },
    label,
    savedAt: new Date().toISOString(),
    pathSummary: {
      waypointCount: (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
      sampleCount: Number(result?.summary?.sampledCells ?? 0),
      starsCaptured: Number(result?.summary?.priorityTargets?.captured ?? 0),
      starsAvailable: Number(result?.summary?.priorityTargets?.available ?? 0),
      energyUsed: finiteOrNull(result?.summary?.energyUsed),
      hazardsHit: Number(result?.summary?.hazardsHit ?? 0) + Number(result?.summary?.mobileHazardsHit ?? 0),
      elapsedTime: finiteOrNull(result?.summary?.elapsedTime),
      actualPathAvailable: Array.isArray(result?.frames) && result.frames.length > 0
    },
    result: cloneJson(attempt)
  };
  const saved = saveJson(SAVED_ATTEMPT_STORAGE_KEY, store);
  return { ...saved, attempt };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function loadAttemptsForChallenge(instanceId) {
  return Object.values(loadSavedAttempts().attempts ?? {}).filter((attempt) => attempt.instanceId === instanceId);
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(globalThis.localStorage?.getItem?.(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    globalThis.localStorage?.setItem?.(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message ?? 'localStorage unavailable' };
  }
}
