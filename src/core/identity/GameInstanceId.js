export function createGameInstanceId(prefix = 'GID') {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  const entropy = `${Date.now()}-${Math.random()}`;
  return `${prefix}-${hashString(entropy)}`;
}

export function createStableGameInstanceId(seed, config = {}, prefix = 'GID') {
  return `${prefix}-${hashString(JSON.stringify({ seed, config }))}`;
}

export function ensureLevelIdentity(level, config = {}) {
  if (!level || typeof level !== 'object') return level;
  if (!level.levelId) level.levelId = `LVL-${hashString(level.meta?.seed ?? Date.now())}`;
  if (!level.instanceId) {
    level.instanceId = level.meta?.generated
      ? createStableGameInstanceId(level.meta?.seed ?? level.levelId, config.generationConfig ?? level.meta?.generationConfig ?? {}, 'GID')
      : createStableGameInstanceId(level.levelId, {
        seed: level.meta?.seed ?? null,
        builtIn: Boolean(level.campaign || level.meta?.difficulty === 'tutorial')
      }, 'GID');
  }
  level.meta = {
    ...(level.meta ?? {}),
    generationConfig: level.meta?.generated
      ? { ...(config.generationConfig ?? level.meta?.generationConfig ?? {}) }
      : level.meta?.generationConfig
  };
  return level;
}

export function getLevelIdentity(level) {
  return {
    levelId: level?.levelId ?? null,
    instanceId: level?.instanceId ?? null,
    seed: level?.meta?.seed ?? null,
    generationConfig: level?.meta?.generationConfig ?? null
  };
}

export function attachIdentityToPlan(plan, level, mission) {
  if (!plan || typeof plan !== 'object') return plan;
  const identity = getLevelIdentity(level);
  plan.levelId = identity.levelId;
  plan.instanceId = identity.instanceId;
  plan.missionId = mission?.missionId ?? plan.missionId ?? null;
  plan.meta = {
    ...(plan.meta ?? {}),
    source: plan.meta?.source ?? 'manual',
    createdAt: plan.meta?.createdAt ?? new Date().toISOString(),
    levelIdentity: identity
  };
  return plan;
}

export function attachIdentityToResult(result, level, mission) {
  if (!result || typeof result !== 'object') return result;
  const identity = getLevelIdentity(level);
  result.levelId = identity.levelId;
  result.instanceId = identity.instanceId;
  result.missionId = mission?.missionId ?? result.missionId ?? null;
  result.levelIdentity = identity;
  result.planMeta = result.planMeta ?? result.planMetadata ?? result.plan?.meta ?? {};
  if (result.plan) attachIdentityToPlan(result.plan, level, mission);
  return result;
}

export function planMatchesLevel(plan, level) {
  const levelIdentity = getLevelIdentity(level);
  if (plan?.instanceId && levelIdentity.instanceId) return plan.instanceId === levelIdentity.instanceId;
  const planIdentity = plan?.meta?.levelIdentity;
  if (planIdentity?.instanceId && levelIdentity.instanceId) return planIdentity.instanceId === levelIdentity.instanceId;
  if (plan?.levelId && levelIdentity.levelId) return plan.levelId === levelIdentity.levelId;
  return null;
}

export function shortInstanceId(levelOrId) {
  const value = typeof levelOrId === 'string' ? levelOrId : levelOrId?.instanceId;
  if (!value) return 'none';
  return value.length <= 12 ? value : value.slice(0, 12);
}

function hashString(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
