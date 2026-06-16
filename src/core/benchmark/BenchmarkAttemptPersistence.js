import {
  createBenchmarkAttemptSession,
  deserializeBenchmarkAttemptSession,
  serializeBenchmarkAttemptSession
} from './BenchmarkAttemptSession.js';

export const BENCHMARK_ATTEMPT_PERSISTENCE_VERSION = 'benchmark-attempt-persistence-p5';

const STORAGE_PREFIX = 'anchor.benchmark.attemptSession';
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
  'plan'
]);

export function benchmarkAttemptStorageKey(episodeId) {
  const safeEpisode = String(episodeId ?? 'unknown-episode')
    .trim()
    .replace(/[^a-z0-9_.:-]+/gi, '-')
    .slice(0, 96) || 'unknown-episode';
  return `${STORAGE_PREFIX}.${safeEpisode}`;
}

export function createPersistedAttemptSessionRecord(session = {}) {
  const normalized = createBenchmarkAttemptSession(session);
  const compact = compactSession(normalized);
  return {
    type: 'anchor.benchmark.persisted-attempt-session',
    version: BENCHMARK_ATTEMPT_PERSISTENCE_VERSION,
    storageKey: benchmarkAttemptStorageKey(compact.episodeId),
    savedAt: new Date().toISOString(),
    episodeId: compact.episodeId,
    benchmarkMode: compact.benchmarkMode,
    attemptCount: compact.attempts.length,
    routeGeometryCount: compact.attempts.filter((attempt) => hasRouteGeometry(attempt)).length,
    firstCreatedAt: compact.createdAt ?? null,
    updatedAt: compact.updatedAt ?? null,
    session: compact,
    notes: [
      'Local persistence stores compact attempt summaries and route geometry, not full hidden ocean fields.',
      'P5 does not recompute scores. It compares metrics stored in the imported benchmark records.'
    ]
  };
}

export function saveBenchmarkAttemptSession(session, storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const record = createPersistedAttemptSessionRecord(session);
  try {
    checked.storage.setItem(record.storageKey, serializeAttemptSessionForStorage(record));
    writeIndex(checked.storage, upsertIndex(readIndex(checked.storage), record));
    return { ok: true, record, storageKey: record.storageKey };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error), reason: 'Unable to save benchmark attempt session.' };
  }
}

export function loadBenchmarkAttemptSession(episodeId, storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const key = benchmarkAttemptStorageKey(episodeId);
  try {
    const raw = checked.storage.getItem(key);
    if (!raw) return { ok: false, missing: true, storageKey: key, reason: 'No saved benchmark attempt session was found for this episode.' };
    const record = deserializeAttemptSessionFromStorage(raw);
    return { ok: true, record, session: record.session, storageKey: key };
  } catch (error) {
    return { ok: false, storageKey: key, error: String(error?.message ?? error), reason: 'Saved benchmark attempt session could not be read.' };
  }
}

export function listBenchmarkAttemptSessions(storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return { ...checked, sessions: [] };
  const index = readIndex(checked.storage);
  const fromIndex = index
    .map((entry) => loadBenchmarkAttemptSession(entry.episodeId, checked.storage))
    .filter((entry) => entry.ok)
    .map((entry) => entry.record);
  const seen = new Set(fromIndex.map((record) => record.storageKey));
  const discovered = discoverRecords(checked.storage)
    .filter((record) => !seen.has(record.storageKey));
  const records = [...fromIndex, ...discovered]
    .sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')));
  if (records.length !== index.length || discovered.length) writeIndex(checked.storage, records.map(indexEntryFromRecord));
  return { ok: true, sessions: records, count: records.length };
}

export function deleteBenchmarkAttemptSession(episodeId, storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const key = benchmarkAttemptStorageKey(episodeId);
  try {
    checked.storage.removeItem(key);
    writeIndex(checked.storage, readIndex(checked.storage).filter((entry) => benchmarkAttemptStorageKey(entry.episodeId) !== key));
    return { ok: true, storageKey: key };
  } catch (error) {
    return { ok: false, storageKey: key, error: String(error?.message ?? error), reason: 'Saved benchmark attempt session could not be deleted.' };
  }
}

export function clearBenchmarkAttemptSessions(storage = globalThis.localStorage) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const listed = listBenchmarkAttemptSessions(checked.storage);
  for (const record of listed.sessions ?? []) checked.storage.removeItem(record.storageKey);
  checked.storage.removeItem(INDEX_KEY);
  return { ok: true, removedCount: listed.sessions?.length ?? 0 };
}

export function pruneBenchmarkAttemptSessions({ maxSessions = DEFAULT_MAX_SESSIONS, maxAgeDays = DEFAULT_MAX_AGE_DAYS, storage = globalThis.localStorage } = {}) {
  const checked = usableStorage(storage);
  if (!checked.ok) return checked;
  const listed = listBenchmarkAttemptSessions(checked.storage);
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

export function serializeAttemptSessionForStorage(sessionOrRecord) {
  const record = sessionOrRecord?.type === 'anchor.benchmark.persisted-attempt-session'
    ? sessionOrRecord
    : createPersistedAttemptSessionRecord(sessionOrRecord);
  return JSON.stringify(record);
}

export function deserializeAttemptSessionFromStorage(payload) {
  const raw = typeof payload === 'string' ? JSON.parse(payload) : cloneJson(payload);
  const session = deserializeBenchmarkAttemptSession(raw?.session ?? raw);
  return {
    type: 'anchor.benchmark.persisted-attempt-session',
    version: raw?.version ?? BENCHMARK_ATTEMPT_PERSISTENCE_VERSION,
    storageKey: raw?.storageKey ?? benchmarkAttemptStorageKey(session.episodeId),
    savedAt: raw?.savedAt ?? raw?.updatedAt ?? new Date().toISOString(),
    episodeId: session.episodeId,
    benchmarkMode: session.benchmarkMode,
    attemptCount: session.attempts.length,
    routeGeometryCount: session.attempts.filter((attempt) => hasRouteGeometry(attempt)).length,
    firstCreatedAt: raw?.firstCreatedAt ?? session.createdAt ?? null,
    updatedAt: raw?.updatedAt ?? session.updatedAt ?? null,
    session,
    notes: Array.isArray(raw?.notes) ? raw.notes.map(String) : []
  };
}

function compactSession(session = {}) {
  const normalized = serializeBenchmarkAttemptSession(session);
  return createBenchmarkAttemptSession({
    ...normalized,
    attempts: normalized.attempts.map(compactAttempt)
  });
}

function compactAttempt(attempt = {}) {
  const routeRecord = compactObject(attempt.routeExecutionRecord ?? null);
  const runRecord = compactObject(attempt.runRecord ?? null);
  const routeGeometry = compactObject(attempt.routeGeometry ?? null);
  return {
    attemptId: attempt.attemptId ?? null,
    episodeId: attempt.episodeId ?? null,
    benchmarkMode: attempt.benchmarkMode ?? 'plannerBenchmark',
    attemptSource: attempt.attemptSource ?? null,
    routeSourceLabel: attempt.routeSourceLabel ?? null,
    fairnessLabel: attempt.fairnessLabel ?? null,
    planId: attempt.planId ?? null,
    resultId: attempt.resultId ?? null,
    status: attempt.status ?? 'notStarted',
    routeExecutionRecord: routeRecord,
    runRecord,
    routeGeometry,
    metrics: compactObject(attempt.metrics ?? {}),
    importMetadata: compactObject(attempt.importMetadata ?? null),
    createdAt: attempt.createdAt ?? null,
    updatedAt: attempt.updatedAt ?? null,
    notes: Array.isArray(attempt.notes) ? attempt.notes.map(String).slice(0, 12) : []
  };
}

function compactObject(value, depth = 0) {
  if (value == null) return null;
  if (depth > 8) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 500).map((entry) => compactObject(entry, depth + 1));
  if (typeof value !== 'object') return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (OMIT_KEYS.has(key)) continue;
    if (Array.isArray(entry) && entry.length > 500) {
      out[key] = entry.slice(0, 500).map((item) => compactObject(item, depth + 1));
      out[`${key}Truncated`] = entry.length - 500;
    } else {
      out[key] = compactObject(entry, depth + 1);
    }
  }
  return out;
}

function usableStorage(storage) {
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
    return { ok: false, unavailable: true, reason: 'Browser localStorage is not available for benchmark attempt persistence.' };
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
    const key = benchmarkAttemptStorageKey(entry.episodeId);
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
    savedAt: record.savedAt,
    attemptCount: record.attemptCount,
    routeGeometryCount: record.routeGeometryCount
  });
}

function normalizeIndexEntry(entry) {
  if (!entry?.episodeId) return null;
  return {
    episodeId: String(entry.episodeId),
    benchmarkMode: String(entry.benchmarkMode ?? 'plannerBenchmark'),
    savedAt: String(entry.savedAt ?? new Date().toISOString()),
    attemptCount: Number.isFinite(Number(entry.attemptCount)) ? Number(entry.attemptCount) : 0,
    routeGeometryCount: Number.isFinite(Number(entry.routeGeometryCount)) ? Number(entry.routeGeometryCount) : 0
  };
}

function discoverRecords(storage) {
  if (typeof storage.key !== 'function' || !Number.isFinite(Number(storage.length))) return [];
  const records = [];
  for (let index = 0; index < Number(storage.length); index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(`${STORAGE_PREFIX}.`) || key === INDEX_KEY) continue;
    try {
      records.push(deserializeAttemptSessionFromStorage(storage.getItem(key)));
    } catch {
      // Ignore unreadable records; the explicit load path reports errors for the current episode.
    }
  }
  return records;
}

function hasRouteGeometry(attempt = {}) {
  return Boolean((attempt.routeGeometry?.segments?.length ?? 0) || (attempt.routeGeometry?.waypoints?.length ?? 0) || (attempt.routeExecutionRecord?.segments?.length ?? 0));
}

function cloneJson(value) {
  if (value === undefined || value === null) return value ?? null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}