import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/game/phaser/scenes/DebriefScene.js', 'utf8');
assert.match(source, /Terrain and Feasibility/);
assert.match(source, /Launch Readiness/);
assert.match(source, /Planned versus Actual/);
assert.match(source, /Terrain events:|Terrain Event/);
assert.match(source, /Terrain diagnostics explain execution outcomes/);
assert.match(source, /do not modify official score/i);
assert.match(source, /Terrain diagnostics are unavailable/);
assert.match(source, /segment/i);
assert.match(source, /clearanceDifferenceMeters/);

console.log('terrain debrief comparison smoke passed');
