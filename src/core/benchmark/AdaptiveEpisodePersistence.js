import {
  adaptiveEpisodeSessionSummary,
  createAdaptiveEpisodeSession,
  deserializeAdaptiveEpisodeSession,
  serializeAdaptiveEpisodeSession
} from './AdaptiveEpisodeSession.js';

export const ADAPTIVE_EPISODE_PERSISTENCE_VERSION = 'adaptive-episode-persistence-p8';

const STORAGE_PREFIX = 'anchor.benchmark.adaptiveEpisodeSession';
const INDEX_KEY = `${STORAGE_PREFIX}.index`;
const DEFAULT_MAX_SESSIONS = 24;
const DEFAULT_MAX_AGE_DAYS = 45;
const OMIT_KEYS = new Set([
  'truth',
  'truthField',
  'truthFields',
  'hiddenTruth',
  'hiddenOcean',
  'forecastMembers',
  'frames',
  'trajectories',
  'debugTrace',
  'simulationTrace',
  'rawResult',
  'rawLevel',
  'level',
  'mission',
  'plan',
  'result'
]);

export function adaptiveEpisodeStorageKey(episodeId) {
  const safeEpisode = String(episodeId ?? 'unknown-adaptive-episode')
    .trim()
    .replace(/[^a-z0-9_.:-]+/gi, '-')
    .slice(0, 96) || 'unknown-adaptive-episode';
  return `${STORAGE_PREFIX}.${safeEpisode}`;
}

export function createPersistedAdaptiveEpisodeRecord(session = {}) {
  const normalized = createAdaptiveEpisodeSession(session);
  const compact = compactSession(normalized);
  const summary = adaptiveEpisodeSessionSummary(compact);
  return {
    type: 'anchor.benchmark.adaptive-episode-session',
    version: ADAPTIVE_EPISODE_PERSISTENCE_VERSION,
    storageKey: adaptiveEpisodeStorageKey(compact.episodeId),
    savedAt: new Date().toISOString(),
    episodeId: compact.episodeId,
    benchmarkMode: 'adaptiveBenchmark',
    policyId: compact.policyId,
    currentLegIndex: compact.currentLegIndex,
    currentObjectiveId: compact.currentObjectiveId,
    currentObjectiveLabel: compact.currentObjectiveLabel,
    updatedAt: compact.updatedAt,
    legCount: compact.legs.length,
    surfacingDecisionCount: compact.surfacingDecisions.length,
    objectiveHistory: compact.objectiveHistory,
    legs: compact.legs,
    session: compact,
    summary,
    warnings: compact.warnings,
    notes: [
      'Local persistence stores compact adaptive leg records, decisions, and objective history.',
      'It does not store hidden truth fields, raw level tensors, or generated routes.',
      ...compact.notes
    ]
  };
}

export function saveAdaptiveEpisodeSession(session, storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const record = createPersistedAdaptiveEpisodeRecord(session);
  try {
    checked.storage.setItem(record.storageKey, serializeAdaptiveEpisodeForStorage(record));
    writeIndex(checked.storage, upsertIndex(readIndex(checked.storage), record));
    return { ok: true, record, storageKey: record.storageKey };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error), reason: 'Unable to save adaptive episode session.' };
  }
}

export function loadAdaptiveEpisodeSession(episodeId, storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const key = adaptiveEpisodeStorageKey(episodeId);
  try {
    const raw = checked.storage.getItem(key);
    if (!raw) return { ok: false, missing: true, storageKey: key, reason: 'No saved adaptive episode session was found for this episode.' };
    const record = deserializeAdaptiveEpisodeFromStorage(raw);
    return { ok: true, record, session: record.session, storageKey: key };
  } catch (error) {
    return { ok: false, storageKey: key, error: String(error?.message ?? error), reason: 'Saved adaptive episode session could not be read.' };
  }
}

export function listAdaptiveEpisodeSessions(storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return { ...checked, sessions: [], count: 0 };
  const index = readIndex(checked.storage);
  const fromIndex = index
    .map((entry) => loadAdaptiveEpisodeSession(entry.episodeId, checked.storage))
    .filter((entry) => entry.ok)
    .map((entry) => entry.record);
  const seen = new Set(fromIndex.map((record) => record.storageKey));
  const discovered = discoverRecords(checked.storage).filter((record) => !seen.has(record.storageKey));
  const records = [...fromIndex, ...discovered]
    .sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')));
  if (records.length !== index.length || discovered.length) writeIndex(checked.storage, records.map(indexEntryFromRecord));
  return { ok: true, sessions: records, count: records.length };
}

export function deleteAdaptiveEpisodeSession(episodeId, storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const key = adaptiveEpisodeStorageKey(episodeId);
  try {
    checked.storage.removeItem(key);
    writeIndex(checked.storage, readIndex(checked.storage).filter((entry) => adaptiveEpisodeStorageKey(entry.episodeId) !== key));
    return { ok: true, storageKey: key };
  } catch (error) {
    return { ok: false, storageKey: key, error: String(error?.message ?? error), reason: 'Saved adaptive episode session could not be deleted.' };
  }
}

export function clearAdaptiveEpisodeSessions(storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const listed = listAdaptiveEpisodeSessions(checked.storage);
  for (const record of listed.sessions ?? []) checked.storage.removeItem(record.storageKey);
  checked.storage.removeItem(INDEX_KEY);
  return { ok: true, removedCount: listed.sessions?.length ?? 0 };
}

export function pruneAdaptiveEpisodeSessions({ maxSessions = DEFAULT_MAX_SESSIONS, maxAgeDays = DEFAULT_MAX_AGE_DAYS, storage = globalThis.localStorage } = {}) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const listed = listAdaptiveEpisodeSessions(checked.storage);
  const records = listed.sessions ?? [];
  const cutoff = Date.now() - Math.max(0, Number(maxAgeDays) || DEFAULT_MAX_AGE_DAYS) * 24 * 60 * 60 * 1000;
  const retained = [];
  const removed = [];
  for (const [index, record] of records.entries()) {
    const savedTime = Date.parse(record.savedAt ?? record.updatedAt ?? '');
    const tooOld = Number.isFinite(savedTime) && savedTime < cutoff;
    const tooMany = index >= Math.max(1, Number(maxSessions) || DEFAULT_MAX_SESSIONS);
    if (tooOld || tooMany) {
      checked.storage.removeItem(record.storageKey);
      removed.push(record);
    } else {
      retained.push(record);
    }
  }
  writeIndex(checked.storage, retained.map(indexEntryFromRecord));
  return { ok: true, removedCount: removed.length, retainedCount: retained.length };
}

export function serializeAdaptiveEpisodeForStorage(sessionOrRecord) {
  const record = sessionOrRecord?.storageKey && sessionOrRecord?.session
    ? sessionOrRecord
    : createPersistedAdaptiveEpisodeRecord(sessionOrRecord);
  return JSON.stringify(record);
}

export function deserializeAdaptiveEpisodeFromStorage(payload) {
  const raw = typeof payload === 'string' ? JSON.parse(payload) : cloneJson(payload);
  const session = deserializeAdaptiveEpisodeSession(raw?.session ?? raw);
  const record = createPersistedAdaptiveEpisodeRecord(session);
  return {
    ...record,
    version: raw?.version ?? ADAPTIVE_EPISODE_PERSISTENCE_VERSION,
    storageKey: raw?.storageKey ?? record.storageKey,
    savedAt: raw?.savedAt ?? raw?.updatedAt ?? record.savedAt,
    warnings: Array.isArray(raw?.warnings) ? raw.warnings.map(String) : record.warnings,
    notes: Array.isArray(raw?.notes) ? raw.notes.map(String) : record.notes
  };
}

function compactSession(session = {}) {
  const serialized = JSON.parse(serializeAdaptiveEpisodeSession(session));
  return createAdaptiveEpisodeSession({
    ...serialized,
    legs: serialized.legs.map(compactObject),
    surfacingDecisions: serialized.surfacingDecisions.map(compactObject),
    nextLegHandoffs: serialized.nextLegHandoffs.map(compactObject),
    objectiveHistory: serialized.objectiveHistory.map(compactObject),
    evidenceHistory: serialized.evidenceHistory.map(compactObject),
    diagnosisHistory: serialized.diagnosisHistory.map(compactObject)
  });
}

function compactObject(value, depth = 0) {
  if (value == null) return null;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 120).map((entry) => compactObject(entry, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (OMIT_KEYS.has(key)) continue;
    if (Array.isArray(entry) && entry.length > 120) {
      out[key] = entry.slice(0, 120).map((item) => compactObject(item, depth + 1));
      out[`${key}Truncated`] = entry.length - 120;
    } else {
      out[key] = compactObject(entry, depth + 1);
    }
  }
  return out;
}

function usableStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    return { ok: false, unavailable: true, reason: 'Browser localStorage is not available for adaptive episode persistence.' };
  }
  return { ok: true, storage };
}

function readIndex(storage) {
  try {
    const raw = storage.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeIndexEntry).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeIndex(storage, entries) {
  const unique = [];
  const seen = new Set();
  for (const entry of entries.map(normalizeIndexEntry).filter(Boolean)) {
    const key = adaptiveEpisodeStorageKey(entry.episodeId);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }
  storage.setItem(INDEX_KEY, JSON.stringify(unique));
}

function upsertIndex(index, record) {
  return [indexEntryFromRecord(record), ...index.filter((entry) => entry.episodeId !== record.episodeId)];
}

function indexEntryFromRecord(record) {
  return normalizeIndexEntry({
    episodeId: record.episodeId,
    benchmarkMode: record.benchmarkMode,
    policyId: record.policyId,
    savedAt: record.savedAt,
    currentLegIndex: record.currentLegIndex,
    currentObjectiveId: record.currentObjectiveId,
    currentObjectiveLabel: record.currentObjectiveLabel,
    legCount: record.legCount,
    surfacingDecisionCount: record.surfacingDecisionCount
  });
}

function normalizeIndexEntry(entry) {
  if (!entry?.episodeId) return null;
  return {
    episodeId: String(entry.episodeId),
    benchmarkMode: 'adaptiveBenchmark',
    policyId: String(entry.policyId ?? 'transparentRuleManager'),
    savedAt: String(entry.savedAt ?? new Date().toISOString()),
    currentLegIndex: Number.isFinite(Number(entry.currentLegIndex)) ? Number(entry.currentLegIndex) : 0,
    currentObjectiveId: String(entry.currentObjectiveId ?? 'reconnaissanceSurvey'),
    currentObjectiveLabel: String(entry.currentObjectiveLabel ?? entry.currentObjectiveId ?? 'Reconnaissance Survey'),
    legCount: Number.isFinite(Number(entry.legCount)) ? Number(entry.legCount) : 0,
    surfacingDecisionCount: Number.isFinite(Number(entry.surfacingDecisionCount)) ? Number(entry.surfacingDecisionCount) : 0
  };
}

function discoverRecords(storage) {
  if (typeof storage.key !== 'function' || !Number.isFinite(Number(storage.length))) return [];
  const records = [];
  for (let index = 0; index < Number(storage.length); index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(`${STORAGE_PREFIX}.`) || key === INDEX_KEY) continue;
    try {
      records.push(deserializeAdaptiveEpisodeFromStorage(storage.getItem(key)));
    } catch {
      // Ignore unreadable records; explicit load reports errors for the current episode.
    }
  }
  return records;
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}
