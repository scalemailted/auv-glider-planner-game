export const RATING_ORDER = ['none', 'bronze', 'silver', 'gold', 'perfect'];

export function computeRating(summary = {}, level = {}, mission = {}) {
  const ratings = level.campaign?.ratings ?? mission.ratings ?? {
    bronze: 40,
    silver: 65,
    gold: 85,
    perfect: 100
  };
  const score = summary.finalScore ?? 0;
  const failedMajorPenalty = (summary.hazardsHit ?? 0) > 0 || (summary.missedWaypoints ?? 0) > 0;

  if (ratings.perfect !== undefined && score >= ratings.perfect && !failedMajorPenalty) return 'perfect';
  if (score >= (ratings.gold ?? Infinity)) return 'gold';
  if (score >= (ratings.silver ?? Infinity)) return 'silver';
  if (score >= (ratings.bronze ?? Infinity)) return 'bronze';
  return 'none';
}

export function isBetterRating(next, previous = 'none') {
  return RATING_ORDER.indexOf(next) > RATING_ORDER.indexOf(previous);
}

export function ratingLabel(rating) {
  if (rating === 'perfect') return 'Perfect';
  if (rating === 'gold') return 'Gold';
  if (rating === 'silver') return 'Silver';
  if (rating === 'bronze') return 'Bronze';
  return 'No rating';
}
