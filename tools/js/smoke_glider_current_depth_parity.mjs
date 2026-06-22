import assert from 'node:assert/strict';
import { makeLevel, makeMission, TEST_WATER_COLUMN_CONFIG } from './water_column_smoke_helpers.mjs';
import { TruthWorld } from '../../src/core/sim/TruthWorld.js';

const level = makeLevel({ waterColumnConfig: { ...TEST_WATER_COLUMN_CONFIG, depthLayerIds: ['surface', 'shallow', 'thermocline', 'midwater', 'deep'] } });
const world = new TruthWorld(level, makeMission());
const surface = world.sampleCurrent(2, 2, 600, 0);
const deep = world.sampleCurrent(2, 2, 600, 150);
assert.equal(Array.isArray(surface), true);
assert.equal(Array.isArray(deep), true);
assert.equal(Math.hypot(surface[0] - deep[0], surface[1] - deep[1]) > 0.01, true);
assert.equal(world.lastOceanCurrentSample.depthMeters, 150);
console.log('[smoke_glider_current_depth_parity] PASS', { surface, deep, last: world.lastOceanCurrentSample.depthMeters });
