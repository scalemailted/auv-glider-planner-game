import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync('src/game/phaser/scenes/BathymetryWorldViewScene.js', 'utf8');
const game = fs.readFileSync('src/game/phaser/PhaserGame.js', 'utf8');
const menu = fs.readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
assert.ok(scene.includes('ANCHOR_BATHYMETRY_VIEW_DEBUG'));
assert.ok(scene.includes('Bathymetric World View'));
assert.ok(game.includes('BathymetryWorldViewScene'));
assert.ok(menu.includes('Bathymetric World View'));
assert.ok(scene.includes('usesFull3DPlanning: false'));
assert.ok(scene.includes('usesHydrodynamicSolver: false'));
assert.ok(scene.includes('usesTerrainFlowAsOceanCurrent: false'));
assert.ok(scene.includes('usesMARL: false'));
assert.doesNotMatch(scene, /implements\s+(A\*|Dijkstra|RRT|MPC|MARL|RL)/i);
console.log('smoke_bathymetry_world_view_scene: ok');