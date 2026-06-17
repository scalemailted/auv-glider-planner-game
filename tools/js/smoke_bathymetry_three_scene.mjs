import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync('src/game/phaser/scenes/BathymetryWorldViewScene.js', 'utf8');
const game = fs.readFileSync('src/game/phaser/PhaserGame.js', 'utf8');
const menu = fs.readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
assert.match(scene, /ThreeBathymetryRenderer|createThreeBathymetryRenderer/, 'scene uses ThreeBathymetryRenderer');
assert.ok(game.includes('BathymetryWorldViewScene'), 'scene registered in PhaserGame');
assert.match(menu, /3D Bathymetric World View|Bathymetric World View/, 'Simulation Lab menu contains bathymetry view');
assert.ok(scene.includes('ANCHOR_BATHYMETRY_VIEW_DEBUG'), 'debug object exists');
assert.match(scene, /renderer:\s*'three'|renderer:\s*"three"/, 'debug renderer is three');
assert.match(scene, /usesThreeRenderer:\s*true/, 'debug usesThreeRenderer true');
assert.match(scene, /usesEnable3D:\s*false/, 'debug usesEnable3D false');
assert.match(scene, /usesFull3DPlanning:\s*false/, 'debug usesFull3DPlanning false');
assert.match(scene, /usesWebGPUFluid:\s*false/, 'debug usesWebGPUFluid false');
assert.match(scene, /usesMARL:\s*false/, 'debug usesMARL false');
console.log('smoke_bathymetry_three_scene: ok');