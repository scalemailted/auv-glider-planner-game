import assert from 'node:assert/strict';
import { normalizeBinaryPass, normalizeHigherIsBetter, normalizeLowerIsBetter, normalizeMissionOutcomeMetrics, normalizeMissionScoreMetric, normalizeTargetRange } from '../../src/core/scoring/MissionScoreNormalizer.js';
import { missionScoreComponentById } from '../../src/core/scoring/MissionScoreComponents.js';
import { missionScoreProfileById } from '../../src/core/scoring/MissionScoreProfiles.js';

assert.equal(normalizeHigherIsBetter(5, { min: 0, max: 10 }).value, 0.5, 'higher is better');
assert.equal(normalizeLowerIsBetter(2, { min: 0, max: 10 }).value, 0.8, 'lower is better');
assert.equal(normalizeTargetRange(5, { min: 4, max: 6 }, { min: 0, max: 10 }).value, 1, 'target range');
assert.equal(normalizeBinaryPass('pass').value, 1, 'binary pass');
const missing = normalizeMissionScoreMetric({ componentId: 'scienceValueCollected', rawValue: null, available: false }, missionScoreComponentById('scienceValueCollected'));
assert.equal(missing.available, false, 'missing remains missing');
const normalized = normalizeMissionOutcomeMetrics({ metrics: [{ componentId: 'scienceValueCollected', rawValue: 10, available: true, dataSource: 'publicObservation' }] }, missionScoreProfileById('balancedMission'));
assert.equal(normalized.metrics[0].available, true, 'normalizes metric');
assert.equal(Number.isFinite(normalized.metrics[0].normalizedValue), true, 'finite normalized value');
assert.ok(normalized.metrics[0].bounds, 'bounds reported');
console.log('Mission score normalizer smoke passed');