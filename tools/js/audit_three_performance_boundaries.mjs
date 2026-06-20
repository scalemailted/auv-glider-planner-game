import assert from 'node:assert/strict';
import fs from 'node:fs';
const renderer = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const targetLayer = fs.readFileSync('src/game/three/layers/ThreeSamplingTargetLayer.js', 'utf8');
assert.match(targetLayer, /objects instanceof Map/, 'sampling target layer reuses stable objects');
assert.match(renderer, /disposeThreeMissionCameraController/, 'renderer disposal still tears down camera controller');
assert.doesNotMatch(renderer, /new Worker\(/, 'no worker dependency added');
console.log(JSON.stringify({ ok: true }));