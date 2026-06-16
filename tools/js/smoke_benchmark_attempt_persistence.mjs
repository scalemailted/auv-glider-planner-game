import assert from 'node:assert/strict';

import { createBenchmarkAttemptSession } from '../../src/core/benchmark/BenchmarkAttemptSession.js';
import {
  benchmarkAttemptStorageKey,
  clearBenchmarkAttemptSessions,
  deleteBenchmarkAttemptSession,
  deserializeAttemptSessionFromStorage,
  listBenchmarkAttemptSessions,
  loadBenchmarkAttemptSession,
  pruneBenchmarkAttemptSessions,
  saveBenchmarkAttemptSession,
  serializeAttemptSessionForStorage
} from '../../src/core/benchmark/BenchmarkAttemptPersistence.js';

class FakeStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

const storage = new FakeStorage();
const session = createBenchmarkAttemptSession({
  episodeId: 'persist-episode',
  benchmarkMode: 'plannerBenchmark',
  attempts: [{
    attemptId: 'persist-attempt',
    attemptSource: 'manualPlayer',
    routeSourceLabel: 'Manual',
    fairnessLabel: 'Forecast-Only',
    metrics: { finalScore: 12, energyUsed: 4 },
    routeGeometry: { waypoints: [{ x: 0, y: 0 }, { x: 1, y: 1 }], segments: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }] },
    routeExecutionRecord: { segments: [{ from: { x: 0, y: 0 }, to: { x: 1, y: 1 } }], hiddenOcean: { huge: true } }
  }]
});

const saved = saveBenchmarkAttemptSession(session, storage);
assert.equal(saved.ok, true, 'session saves');
assert.equal(saved.storageKey, benchmarkAttemptStorageKey('persist-episode'), 'storage key is stable');
const listed = listBenchmarkAttemptSessions(storage);
assert.equal(listed.count, 1, 'session is listed');
assert.equal(listed.sessions[0].routeGeometryCount, 1, 'route geometry count persists');
const loaded = loadBenchmarkAttemptSession('persist-episode', storage);
assert.equal(loaded.ok, true, 'session loads');
assert.equal(loaded.session.attempts.length, 1, 'loaded session has attempt');
assert.equal(loaded.session.attempts[0].routeExecutionRecord.hiddenOcean, undefined, 'large hidden field is stripped');
const serialized = serializeAttemptSessionForStorage(session);
const deserialized = deserializeAttemptSessionFromStorage(serialized);
assert.equal(deserialized.session.episodeId, 'persist-episode', 'serialize/deserialize keeps episode');
assert.equal(pruneBenchmarkAttemptSessions({ maxSessions: 5, storage }).ok, true, 'prune succeeds');
assert.equal(deleteBenchmarkAttemptSession('persist-episode', storage).ok, true, 'delete succeeds');
assert.equal(listBenchmarkAttemptSessions(storage).count, 0, 'delete removes session');
assert.equal(clearBenchmarkAttemptSessions(storage).removedCount, 0, 'clear succeeds when empty');

console.log('smoke_benchmark_attempt_persistence: ok');