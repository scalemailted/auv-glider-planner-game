import { hashSeed } from './SeededRng.js';

export const GENERATION_VERSION = 'anchor-generator-v1';

export const REPLAY_SEED_NAMESPACES = [
  'terrain',
  'currents',
  'roi',
  'hazards',
  'depth',
  'targets',
  'forecast',
  'truth',
  'mission'
];

export function deriveSeedFromUuid(uuid, namespace = 'default') {
  const anchor = String(uuid ?? '').trim();
  const key = String(namespace ?? 'default').trim() || 'default';
  if (!anchor) return null;
  return `${GENERATION_VERSION}:${key}:${hashSeed(`${anchor}:${key}`).toString(36)}`;
}

export function deriveReplaySeeds(uuid, namespaces = REPLAY_SEED_NAMESPACES) {
  const anchor = String(uuid ?? '').trim();
  if (!anchor) return {};
  return Object.fromEntries(namespaces.map((namespace) => [namespace, deriveSeedFromUuid(anchor, namespace)]));
}

export function buildReplaySeedContract({
  challengeId,
  generationConfig = null,
  generationVersion = GENERATION_VERSION,
  derivedSeeds = null
} = {}) {
  const anchor = challengeId ?? generationConfig?.challengeId ?? generationConfig?.replaySeedAnchor ?? null;
  if (!anchor) return null;
  return {
    challengeId: anchor,
    replaySeedAnchor: anchor,
    generationVersion,
    generationConfig: cloneJson(generationConfig),
    derivedSeeds: {
      ...deriveReplaySeeds(anchor),
      ...(derivedSeeds ?? {})
    }
  };
}

export function getReplaySeedContract(source = {}) {
  const direct = source?.replaySeedContract ?? source?.replay ?? null;
  const level = source?.level ?? source;
  const meta = level?.meta ?? {};
  const challengeId = direct?.challengeId
    ?? source?.challengeId
    ?? source?.instanceId
    ?? level?.instanceId
    ?? meta.replaySeedAnchor
    ?? null;
  const generationConfig = direct?.generationConfig
    ?? source?.generationConfig
    ?? meta.generationConfig
    ?? null;
  return buildReplaySeedContract({
    challengeId,
    generationConfig,
    generationVersion: direct?.generationVersion ?? source?.generationVersion ?? meta.generationVersion ?? generationConfig?.generationVersion ?? GENERATION_VERSION,
    derivedSeeds: direct?.derivedSeeds ?? source?.derivedSeeds ?? meta.derivedSeeds ?? generationConfig?.derivedSeeds ?? null
  });
}

export function evaluateExactReplayAvailability(source = {}) {
  const hasSnapshot = Boolean(source?.level && source?.mission) || Boolean(source?.challenge?.level && source?.challenge?.mission);
  const contract = getReplaySeedContract(source);
  if (!contract?.replaySeedAnchor) {
    return { available: false, method: null, reason: 'Exact replay unavailable: missing challenge UUID seed anchor.', contract };
  }
  if (!contract.generationVersion) {
    return { available: false, method: null, reason: 'Exact replay unavailable: missing generator version.', contract };
  }
  if (contract.generationVersion !== GENERATION_VERSION) {
    return { available: false, method: null, reason: 'Exact replay unavailable: generator version mismatch.', contract };
  }
  if (hasSnapshot) {
    return { available: true, method: 'snapshot', reason: 'Exact replay: available from saved challenge snapshot.', contract };
  }
  if (!contract.generationConfig) {
    return { available: false, method: null, reason: 'Exact replay unavailable: missing generation config.', contract };
  }
  if (!requiredSeedsPresent(contract.derivedSeeds)) {
    return { available: false, method: null, reason: 'Exact replay unavailable: missing derived seed metadata.', contract };
  }
  return { available: true, method: 'regeneration', reason: 'Exact replay: available from UUID seed contract.', contract };
}

function requiredSeedsPresent(derivedSeeds = {}) {
  return REPLAY_SEED_NAMESPACES.every((namespace) => Boolean(derivedSeeds?.[namespace]));
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
