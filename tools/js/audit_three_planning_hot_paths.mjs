import assert from 'node:assert/strict';
import fs from 'node:fs';
const scene = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
assert.match(scene, /duplicateThreeHoverSuppressionCount/, 'hover duplicate suppression is tracked');
assert.doesNotMatch(scene, /navigator\\.gpu|GPUDevice|WebGPURenderer|rawWebGPU|threeWebGPU/, 'no WebGPU runtime path added');
console.log(JSON.stringify({ ok: true }));