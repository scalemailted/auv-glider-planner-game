import { createGameInstanceId } from '../identity/GameInstanceId.js';
import { compareAttempts, normalizeBestAttempt } from './BestAttemptSelector.js';

export const LEADERBOARD_STORAGE_KEY = 'anchorGliderCommand.leaderboard.v1';
const MAX_ATTEMPTS_PER_RECORD = 25;

export function loadLeaderboard() {
  try {
    const raw = globalThis.localStorage?.getItem?.(LEADERBOARD_STORAGE_KEY);
    if (!raw) return { records: {} };
    const parsed = JSON.parse(raw);
    return normalizeLeaderboard(parsed);
  } catch {
    return { records: {}, unavailable: true };
  }
}

export function saveLeaderboard(board) {
  try {
    const normalized = normalizeLeaderboard(board);
    globalThis.localStorage?.setItem?.(LEADERBOARD_STORAGE_KEY, JSON.stringify(normalized));
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message ?? 'localStorage unavailable' };
  }
}

export function importLeaderboard(data, { merge = false } = {}) {
  const incoming = normalizeLeaderboard(data);
  if (!merge) {
    const saved = saveLeaderboard(incoming);
    return { ...saved, board: incoming };
  }
  const current = loadLeaderboard();
  const board = normalizeLeaderboard({
    records: {
      ...(current.records ?? {}),
      ...(incoming.records ?? {})
    }
  });
  const saved = saveLeaderboard(board);
  return { ...saved, board };
}

export function recordLeaderboardAttempt({ level, mission, plan, result, label = 'Manual Player Plan' } = {}) {
  const board = loadLeaderboard();
  const instanceId = result?.instanceId ?? level?.instanceId ?? 'unknown-instance';
  const existing = board.records[instanceId] ?? {};
  const record = normalizeRecord({
    ...existing,
    levelId: result?.levelId ?? level?.levelId ?? null,
    instanceId,
    missionId: result?.missionId ?? mission?.missionId ?? null,
    challengeMode: result?.challengeMode ?? level?.challengeMode ?? null,
    mode: result?.challengeMode ?? level?.challengeMode ?? existing.mode ?? existing.challengeMode ?? null,
    mapSize: inferMapSize(level) ?? existing.mapSize ?? null,
    durationHours: Number(level?.duration ?? level?.time?.duration ?? existing.durationHours ?? 0) || null,
    agentCount: Number(mission?.agents?.length ?? existing.agentCount ?? 0) || null,
    seed: level?.meta?.seed ?? null,
    generationConfig: level?.meta?.generationConfig ?? null,
    level: cloneJson(level),
    mission: cloneJson(mission),
    attempts: existing.attempts ?? []
  });
  const attempt = {
    attemptId: createGameInstanceId('ATTEMPT'),
    createdAt: new Date().toISOString(),
    score: Number(result?.summary?.finalScore ?? result?.summary?.score ?? 0),
    plan: cloneJson(plan),
    result: cloneJson(result),
    summary: result?.summary ?? {},
    pathSummary: buildPathSummary(plan, result),
    fairness: fairnessForPlan(plan),
    label
  };
  record.attempts = normalizeAttempts([...(record.attempts ?? []), attempt]);
  record.bestAttemptId = record.attempts[0]?.attemptId ?? null;
  record.lastPlayedAt = mostRecentAttemptDate(record.attempts);
  board.records[instanceId] = record;
  const saved = saveLeaderboard(board);
  return { ...saved, attempt, record, board };
}

export function deleteLeaderboardAttempt(instanceId, attemptId) {
  const board = loadLeaderboard();
  const record = board.records?.[instanceId];
  if (!record) return saveLeaderboard(board);
  record.attempts = (record.attempts ?? []).filter((attempt) => attempt.attemptId !== attemptId);
  if (!record.attempts.length) {
    delete board.records[instanceId];
  } else {
    record.bestAttemptId = record.attempts[0]?.attemptId ?? null;
    record.lastPlayedAt = mostRecentAttemptDate(record.attempts);
  }
  return saveLeaderboard(board);
}

export function clearLeaderboardRecord(instanceId) {
  const board = loadLeaderboard();
  if (board.records) delete board.records[instanceId];
  return saveLeaderboard(board);
}

export function clearLeaderboard() {
  return saveLeaderboard({ records: {} });
}

export function getBestAttempt(board, instanceId) {
  const record = board?.records?.[instanceId];
  return (record?.attempts ?? []).find((attempt) => attempt.attemptId === record?.bestAttemptId)
    ?? record?.attempts?.[0]
    ?? null;
}

export function normalizeLeaderboard(board) {
  const records = {};
  const source = board?.records && typeof board.records === 'object' ? board.records : {};
  for (const [key, value] of Object.entries(source)) {
    const record = normalizeRecord({ instanceId: key, ...value });
    if (record?.instanceId) records[record.instanceId] = record;
  }
  return { records };
}

function normalizeRecord(record = {}) {
  const embeddedChallenge = record.embeddedChallenge ?? null;
  const level = record.level ?? embeddedChallenge?.level ?? null;
  const mission = record.mission ?? embeddedChallenge?.mission ?? null;
  const instanceId = record.instanceId ?? record.id ?? level?.instanceId ?? 'unknown-instance';
  const attempts = normalizeAttempts(record.attempts ?? []);
  const bestAttempt = attempts.find((attempt) => attempt.attemptId === record.bestAttemptId) ?? attempts[0] ?? null;
  const mapSize = normalizeMapSize(record.mapSize) ?? inferMapSize(level);
  const challengeMode = record.challengeMode ?? record.mode ?? level?.challengeMode ?? bestAttempt?.result?.challengeMode ?? null;
  return {
    levelId: record.levelId ?? level?.levelId ?? bestAttempt?.result?.levelId ?? null,
    instanceId,
    missionId: record.missionId ?? mission?.missionId ?? mission?.id ?? bestAttempt?.result?.missionId ?? null,
    challengeMode,
    mode: record.mode ?? challengeMode ?? null,
    mapSize,
    durationHours: Number(record.durationHours ?? level?.duration ?? level?.time?.duration ?? 0) || null,
    agentCount: Number(record.agentCount ?? mission?.agents?.length ?? 0) || null,
    seed: record.seed ?? level?.meta?.seed ?? null,
    generationConfig: record.generationConfig ?? level?.meta?.generationConfig ?? null,
    level,
    mission,
    attempts,
    bestAttemptId: bestAttempt?.attemptId ?? null,
    lastPlayedAt: record.lastPlayedAt ?? mostRecentAttemptDate(attempts)
  };
}

function normalizeAttempts(attempts = []) {
  return attempts
    .filter((attempt) => attempt && typeof attempt === 'object')
    .map((attempt, index) => ({
      attemptId: attempt.attemptId ?? attempt.id ?? `attempt_${index + 1}`,
      createdAt: attempt.createdAt ?? attempt.savedAt ?? null,
      label: attempt.label ?? attempt.plan?.label ?? attempt.result?.source ?? 'Manual Player Plan',
      score: Number(attempt.score ?? attempt.summary?.finalScore ?? attempt.result?.summary?.finalScore ?? 0),
      plan: attempt.plan ?? null,
      result: attempt.result ?? null,
      summary: attempt.summary ?? attempt.result?.summary ?? {},
      pathSummary: attempt.pathSummary ?? buildPathSummary(attempt.plan ?? attempt.result?.plan, attempt.result),
      fairness: attempt.fairness ?? fairnessForPlan(attempt.plan)
    }))
    .map((attempt) => normalizeBestAttempt(attempt))
    .sort(compareAttempts)
    .slice(0, MAX_ATTEMPTS_PER_RECORD);
}

function normalizeMapSize(mapSize) {
  if (!mapSize || typeof mapSize !== 'object') return null;
  const width = Number(mapSize.width ?? mapSize.w ?? 0);
  const height = Number(mapSize.height ?? mapSize.h ?? 0);
  return width && height ? { width, height } : null;
}

function inferMapSize(level) {
  const width = Number(level?.width ?? level?.grid?.width ?? level?.map?.width ?? level?.world?.grid?.width ?? 0);
  const height = Number(level?.height ?? level?.grid?.height ?? level?.map?.height ?? level?.world?.grid?.height ?? 0);
  return width && height ? { width, height } : null;
}

function buildPathSummary(plan, result) {
  const summary = result?.summary ?? {};
  const events = result?.events ?? result?.routeExecution?.events ?? [];
  const frames = result?.frames ?? result?.routeExecution?.frames ?? [];
  return {
    waypointCount: (plan?.agentPlans ?? []).reduce((sum, agentPlan) => sum + (agentPlan.waypoints?.length ?? 0), 0),
    sampleCount: Number(summary.sampledCells ?? events.filter((event) => event.type === 'sample').length ?? 0),
    starsCaptured: Number(summary.priorityTargets?.captured ?? result?.priorityTargets?.captured ?? 0),
    starsAvailable: Number(summary.priorityTargets?.available ?? result?.priorityTargets?.available ?? 0),
    energyUsed: finiteOrNull(summary.energyUsed),
    hazardsHit: Number(summary.hazardsHit ?? 0) + Number(summary.mobileHazardsHit ?? 0),
    elapsedTime: finiteOrNull(summary.elapsedTime),
    actualPathAvailable: Array.isArray(frames) && frames.length > 0,
    eventCount: Array.isArray(events) ? events.length : 0
  };
}

function mostRecentAttemptDate(attempts = []) {
  return attempts
    .map((attempt) => attempt.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function fairnessForPlan(plan) {
  const planner = plan?.planner ?? plan?.meta?.planner ?? {};
  return {
    usesForecast: Boolean(planner.usesForecast),
    usesTruth: Boolean(planner.usesTruth),
    usesOracle: Boolean(planner.usesOracle),
    fairForLeaderboard: !planner.usesOracle && !planner.usesTruth
  };
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
