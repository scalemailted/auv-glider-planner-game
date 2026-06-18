import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const planning = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const simulation = readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');

assert.match(controller, /for \(const \{ target, type, listener, options \} of controller\.listeners/, 'controller disposal must remove pointer/key listeners.');
assert.match(controller, /releasePointer\(controller/, 'controller cancellation must release pointer capture.');
assert.match(controller, /controller\.dragState = null/, 'controller cancellation must clear waypoint drag state.');
assert.match(renderer, /cancelAnimationFrame/, 'renderer disposal must stop animation frames.');
assert.match(renderer, /renderer\.renderer\?\.dispose\?\.\(\)/, 'renderer disposal must dispose WebGL renderer.');
assert.match(planning, /disposeThreeMissionInteractionController\(this\.threeInteractionController\)/, 'planning shutdown must dispose Three interaction controller.');
assert.match(simulation, /disposeThreeMissionInteractionController\(this\.threeSimulationInteractionController\)/, 'simulation shutdown must dispose Three interaction controller.');

console.log('Three interaction cleanup smoke passed.');