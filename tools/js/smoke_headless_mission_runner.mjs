import assert from 'node:assert/strict';

import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { createDefaultHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';

const config = createDefaultHeadlessRuntimeConfig({ seed: 'h1-mission-runner-smoke', width: 16, height: 12 });
const episodeA = runHeadlessMission(config);
const episodeB = runHeadlessMission(config);
assert.equal(episodeA.type, 'anchor.headless.episode', 'episode type');
assert.ok(episodeA.observations.length > 0, 'observations exist');
assert.ok(episodeA.tracks.length > 0, 'tracks exist');
assert.equal(episodeA.scoreReport.type, 'anchor.headless.score-report', 'score report exists');
assert.ok(episodeA.replay, 'replay exists');
assert.deepEqual(episodeA.observations, episodeB.observations, 'deterministic observations');
assert.deepEqual(episodeA.tracks, episodeB.tracks, 'deterministic tracks');
assert.equal(episodeA.diagnostics.routeGenerated, false, 'runner does not generate routes');
assert.equal(episodeA.diagnostics.implementsNewPlanner, false, 'no new planner');
assert.equal(episodeA.diagnostics.implementsMARL, false, 'no MARL');

console.log('Headless mission runner smoke passed');
