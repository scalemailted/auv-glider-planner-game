export const EXPORT_SCHEMA_VERSION = '3.0';

export function isStochasticChallenge(challengeMode) {
  return ['forecast', 'stochastic'].includes(String(challengeMode ?? '').toLowerCase());
}

export function visibilityForChallenge(challengeMode, { includeTruth = false, oracleMode = false } = {}) {
  const stochastic = isStochasticChallenge(challengeMode);
  return {
    truthIncluded: Boolean(!stochastic || includeTruth || oracleMode),
    forecastIncluded: stochastic,
    oracleMode: Boolean(oracleMode),
    publicChallenge: !oracleMode,
    hiddenTruthPolicy: stochastic && !(includeTruth || oracleMode) ? 'omitted' : 'included',
    warning: stochastic && oracleMode
      ? 'Research/oracle export. Contains hidden truth. Do not use for fair player planning.'
      : stochastic
        ? 'Public stochastic challenge export omits hidden truth. Browser-only games are cheat-resistant at best, not cryptographically secure.'
        : 'Deterministic challenge export includes truth because there is no hidden state.'
  };
}

export function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

export function hashJson(value) {
  const text = JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
