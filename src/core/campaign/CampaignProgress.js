import { computeRating, isBetterRating } from './RatingSystem.js';

export const PROGRESS_STORAGE_KEY = 'anchorGliderCommand.progress.v1';

export function createEmptyProgress() {
  return {
    completedLevels: {},
    bestScores: {},
    bestRatings: {}
  };
}

export function loadCampaignProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(PROGRESS_STORAGE_KEY);
    return raw ? { ...createEmptyProgress(), ...JSON.parse(raw) } : createEmptyProgress();
  } catch {
    return createEmptyProgress();
  }
}

export function saveCampaignProgress(progress, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Browser storage can be unavailable in private or sandboxed contexts.
  }
}

export function recordLevelResult(progress, level, mission, result) {
  const next = { ...createEmptyProgress(), ...(progress ?? {}) };
  const levelId = level?.levelId;
  if (!levelId || !result?.summary) return next;

  const score = result.summary.finalScore ?? 0;
  const rating = computeRating(result.summary, level, mission);
  next.completedLevels = { ...next.completedLevels, [levelId]: rating !== 'none' };
  next.bestScores = {
    ...next.bestScores,
    [levelId]: Math.max(score, next.bestScores[levelId] ?? -Infinity)
  };
  next.bestRatings = {
    ...next.bestRatings,
    [levelId]: isBetterRating(rating, next.bestRatings[levelId]) ? rating : (next.bestRatings[levelId] ?? rating)
  };
  return next;
}
