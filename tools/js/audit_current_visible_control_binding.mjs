import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const simulation = readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const adapter = readFileSync('src/core/rendering/MissionWorldStateAdapter.js', 'utf8');
const state = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');

assert.match(adapter, /showCurrents:\s*ui\.showCurrents\s*!==\s*false/, 'mission world adapter defaults currents on');
assert.match(adapter, /currentDisplayMode:/, 'mission world adapter forwards water-column current display mode');
assert.match(workspace, /layerVisibility:\s*this\.threeLayerVisibilityPatch\(\)/, 'planning debug includes current layer controls');
assert.match(simulation, /layerVisibility:\s*this\.threeSimulationLayerVisibilityPatch\(\)/, 'simulation debug includes current layer controls');
assert.match(state, /ui\.showCurrents\s*===\s*false/, 'shared current debug explains UI-hidden currents');

console.log('audit_current_visible_control_binding: ok');
