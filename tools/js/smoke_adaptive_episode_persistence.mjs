import assert from 'node:assert/strict';
import {
  adaptiveEpisodeStorageKey,
  clearAdaptiveEpisodeSessions,
  deleteAdaptiveEpisodeSession,
  listAdaptiveEpisodeSessions,
  loadAdaptiveEpisodeSession,
  saveAdaptiveEpisodeSession
} from '../../src/core/benchmark/AdaptiveEpisodePersistence.js';
import { addAdaptiveLegToSession, createAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodeSession.js';

function fakeStorage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

const storage = fakeStorage();
const session = addAdaptiveLegToSession(createAdaptiveEpisodeSession({ episodeId: 'episode-p8-persist' }), {
  episodeId: 'episode-p8-persist',
  legIndex: 0,
  objectiveId: 'reconnaissanceSurvey',
  evidence: { frames: new Array(200).fill([1, 2, 3]), observationCount: 2 },
  metrics: { finalScore: 10 }
});
const saved = saveAdaptiveEpisodeSession(session, storage);
assert.equal(saved.ok, true);
assert.equal(loadAdaptiveEpisodeSession('episode-p8-persist', storage).ok, true);
assert.equal(listAdaptiveEpisodeSessions(storage).count, 1);
assert.equal(saved.record.legs[0].evidence.frames, undefined, 'huge/raw fields are stripped before storage');

storage.setItem(adaptiveEpisodeStorageKey('corrupt'), '{not json');
const corrupt = loadAdaptiveEpisodeSession('corrupt', storage);
assert.equal(corrupt.ok, false);
assert.match(corrupt.reason, /could not be read/i);

assert.equal(deleteAdaptiveEpisodeSession('episode-p8-persist', storage).ok, true);
assert.equal(listAdaptiveEpisodeSessions(storage).count, 0);
assert.equal(clearAdaptiveEpisodeSessions(storage).ok, true);
assert.equal(saveAdaptiveEpisodeSession(session, null).ok, false, 'unavailable storage handled gracefully');
console.log('smoke_adaptive_episode_persistence: ok');
