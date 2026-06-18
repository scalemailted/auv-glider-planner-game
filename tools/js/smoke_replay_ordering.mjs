import assert from 'node:assert/strict';

import { assignCanonicalReplaySequences, canonicalReplayEventCompare, validateCanonicalReplayEventOrder } from '../../src/core/replay/ReplayOrdering.js';

const events = assignCanonicalReplaySequences([
  { tick: 2, timeSeconds: 120, phase: 'observation', eventType: 'sample', agentId: 'b', sequence: 10 },
  { tick: 1, timeSeconds: 60, phase: 'vehicleState', eventType: 'state', agentId: 'a', sequence: 11 },
  { tick: 1, timeSeconds: 60, phase: 'command', eventType: 'waypoint', agentId: 'a', sequence: 12 },
  { tick: 1, timeSeconds: 60, phase: 'objective', eventType: 'objective.transition', agentId: 'a', sequence: 13 }
]);

assert.equal(events[0].phase, 'command', 'command phase sorts first at same tick');
assert.equal(events[1].phase, 'objective', 'objective transition follows command');
assert.equal(events[2].phase, 'vehicleState', 'vehicle state follows objective');
assert.ok(canonicalReplayEventCompare(events[0], events[1]) < 0, 'canonical comparator orders events');
assert.equal(validateCanonicalReplayEventOrder(events).status, 'PASS', 'canonical order validates');

console.log('REPLAY-R1 ordering smoke passed');