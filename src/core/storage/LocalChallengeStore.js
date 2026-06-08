import { buildChallengeExport } from '../io/ChallengeExporter.js';
import { cloneJson } from '../io/ExportVisibility.js';

export const CHALLENGE_STORAGE_KEY = 'anchorGliderCommand.challenges.v1';
export const STORAGE_INDEX_KEY = 'anchorGliderCommand.storageIndex.v1';

export function loadChallengeIndex() {
  return loadJson(CHALLENGE_STORAGE_KEY, { records: {} });
}

export function saveChallengeToLocalStore(challengeOrState) {
  const challenge = challengeOrState?.type === 'anchor.challenge'
    ? cloneJson(challengeOrState)
    : buildChallengeExport({
      level: challengeOrState?.level,
      mission: challengeOrState?.mission,
      challengeMode: challengeOrState?.challengeMode,
      experienceMode: challengeOrState?.experienceMode,
      includeHiddenTruth: false
    });
  const board = loadChallengeIndex();
  board.records ??= {};
  board.records[challenge.instanceId] = {
    instanceId: challenge.instanceId,
    challengeId: challenge.challengeId ?? challenge.instanceId,
    levelId: challenge.levelId,
    missionId: challenge.missionId,
    challengeMode: challenge.challengeMode,
    experienceMode: challenge.experienceMode,
    missionMode: challenge.missionMode ?? challenge.generationConfig?.missionMode ?? challenge.level?.meta?.missionMode ?? null,
    replaySeedAnchor: challenge.replaySeedAnchor ?? challenge.replaySeedContract?.replaySeedAnchor ?? challenge.instanceId,
    generationVersion: challenge.generationVersion ?? challenge.replaySeedContract?.generationVersion ?? null,
    generationConfig: cloneJson(challenge.generationConfig ?? challenge.replaySeedContract?.generationConfig ?? null),
    derivedSeeds: cloneJson(challenge.derivedSeeds ?? challenge.replaySeedContract?.derivedSeeds ?? null),
    replaySeedContract: cloneJson(challenge.replaySeedContract ?? null),
    exactReplay: cloneJson(challenge.exactReplay ?? null),
    savedAt: new Date().toISOString(),
    challenge
  };
  const saved = saveJson(CHALLENGE_STORAGE_KEY, board);
  updateStorageIndex('challenges', Object.keys(board.records).length);
  return { ...saved, challenge };
}

export function loadChallengeFromLocalStore(instanceId) {
  return loadChallengeIndex().records?.[instanceId]?.challenge ?? null;
}

export function deleteChallengeFromLocalStore(instanceId) {
  const board = loadChallengeIndex();
  if (board.records) delete board.records[instanceId];
  const saved = saveJson(CHALLENGE_STORAGE_KEY, board);
  updateStorageIndex('challenges', Object.keys(board.records ?? {}).length);
  return saved;
}

function updateStorageIndex(kind, count) {
  const index = loadJson(STORAGE_INDEX_KEY, {});
  index[kind] = { count, updatedAt: new Date().toISOString(), backend: 'localStorage' };
  saveJson(STORAGE_INDEX_KEY, index);
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
