import assert from 'node:assert/strict';

import { publicReplayStateDigest, stableReplayJson } from '../../src/core/replay/ReplayDigest.js';

const a = { tick: 3, timeSeconds: 180.0000004, vehicles: { g1: { y: 2, x: 1 } }, createdAt: 'volatile-a' };
const b = { createdAt: 'volatile-b', vehicles: { g1: { x: 1, y: 2 } }, timeSeconds: 180.0000004, tick: 3 };

assert.equal(stableReplayJson(a), stableReplayJson(b), 'stable JSON ignores volatile timestamps and sorts keys');
assert.equal(publicReplayStateDigest(a).value, publicReplayStateDigest(b).value, 'digest stable for semantically same public state');
assert.notEqual(publicReplayStateDigest(a).value, publicReplayStateDigest({ ...b, tick: 4 }).value, 'digest changes when exact tick changes');

console.log('REPLAY-R1 digest smoke passed');