import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(file, 'utf8');
const layout = read('css/layout.css');
const game = read('css/game.css');
const planning = read('src/game/phaser/scenes/MissionWorkspaceScene.js');
const simulation = read('src/game/phaser/scenes/SimulationScene.js');
const controller = read('src/game/three/ThreeMissionInteractionController.js');

assert.match(layout, /#ui-root\s*\{[\s\S]*?pointer-events:\s*none;/, '#ui-root must be passive over the mission viewport.');
assert.match(layout, /\.overlay-panel,\s*\n#modal-root\s*\{\s*\n\s*pointer-events:\s*auto;/, 'actual overlay controls must remain clickable.');
assert.match(layout, /\.three-mission-world-host\s*\{[\s\S]*?z-index:\s*6;[\s\S]*?pointer-events:\s*auto;/, 'Three mission host must be the active mission-world surface.');
assert.match(layout, /\.three-mission-world-canvas\s*\{[\s\S]*?touch-action:\s*none;[\s\S]*?pointer-events:\s*auto;/, 'Three canvas must receive direct pointer events.');
assert.match(game, /#game-root canvas/, 'Phaser canvas CSS remains fallback shell styling only.');

for (const method of ['onPointerDown', 'onPointerMove', 'onPointerUp']) {
  assert.match(planning, new RegExp(`${method}\\([^)]*\\) \\{[\\s\\S]{0,120}getMissionRendererBackend\\(\\) === 'threeMission3d'`), `${method} must early-return while Three is active.`);
}
for (const field of ['pointerOwner', 'lastPointerConsumer', 'threeCanvasPointerEvents', 'phaserWorldInputEnabled', 'duplicatePointerDispatchCount']) {
  assert.ok(planning.includes(field), `planning debug missing ${field}`);
  assert.ok(simulation.includes(field), `simulation debug missing ${field}`);
}
assert.match(controller, /allowEditing:\s*options\.allowEditing !== false/, 'controller must support non-editable simulation mode.');
assert.match(simulation, /allowEditing:\s*false/, 'simulation controller must disable edit intents.');
assert.match(simulation, /ANCHOR_MISSION_RENDER_DEBUG/, 'simulation must publish the shared mission render debug contract.');

console.log('Three pointer ownership audit passed.');