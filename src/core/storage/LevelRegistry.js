import { ensureLevelIdentity, shortInstanceId } from '../identity/GameInstanceId.js';

export const SAVED_LEVELS_STORAGE_KEY = 'anchorGliderCommand.savedLevels.v1';

export function storageAvailable(storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    const key = '__anchor_storage_probe__';
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function loadSavedLevelRegistry(storage = globalThis.localStorage) {
  if (!storageAvailable(storage)) return { available: false, levels: {}, error: 'localStorage is unavailable.' };
  try {
    const raw = storage.getItem(SAVED_LEVELS_STORAGE_KEY);
    if (!raw) return { available: true, levels: {} };
    const parsed = JSON.parse(raw);
    return { available: true, levels: parsed?.levels ?? {} };
  } catch (error) {
    return { available: true, levels: {}, error: `Saved-level registry could not be read: ${error.message ?? error}` };
  }
}

export function saveLevelToRegistry(level, storage = globalThis.localStorage) {
  const registry = loadSavedLevelRegistry(storage);
  if (!registry.available) return { ok: false, error: registry.error };
  const identityLevel = ensureLevelIdentity(structuredCloneFallback(level));
  const instanceId = identityLevel.instanceId;
  const next = {
    levels: {
      ...(registry.levels ?? {}),
      [instanceId]: {
        savedAt: new Date().toISOString(),
        level: identityLevel
      }
    }
  };
  try {
    storage.setItem(SAVED_LEVELS_STORAGE_KEY, JSON.stringify(next));
    return { ok: true, instanceId, level: identityLevel };
  } catch (error) {
    return { ok: false, error: `Saved-level registry could not be written: ${error.message ?? error}` };
  }
}

export function findSavedLevel(id, storage = globalThis.localStorage) {
  const registry = loadSavedLevelRegistry(storage);
  if (!registry.available) return { ok: false, error: registry.error };
  const value = String(id ?? '').trim();
  if (!value) return { ok: false, error: 'Enter a level ID or instance ID.' };
  const exact = registry.levels?.[value];
  if (exact) return { ok: true, entry: exact, instanceId: value };
  const match = Object.entries(registry.levels ?? {}).find(([instanceId, entry]) => (
    instanceId === value
    || entry?.level?.levelId === value
    || shortInstanceId(instanceId) === value
  ));
  if (!match) return { ok: false, error: `No saved level found for "${value}".` };
  return { ok: true, instanceId: match[0], entry: match[1] };
}

export function deleteSavedLevel(instanceId, storage = globalThis.localStorage) {
  const registry = loadSavedLevelRegistry(storage);
  if (!registry.available) return { ok: false, error: registry.error };
  const levels = { ...(registry.levels ?? {}) };
  delete levels[instanceId];
  try {
    storage.setItem(SAVED_LEVELS_STORAGE_KEY, JSON.stringify({ levels }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Saved level could not be deleted: ${error.message ?? error}` };
  }
}

export function listSavedLevels(storage = globalThis.localStorage) {
  const registry = loadSavedLevelRegistry(storage);
  return {
    ...registry,
    entries: Object.entries(registry.levels ?? {})
      .map(([instanceId, entry]) => ({ instanceId, savedAt: entry.savedAt, level: entry.level }))
      .sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')))
  };
}

function structuredCloneFallback(value) {
  if (globalThis.structuredClone) return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
