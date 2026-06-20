import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scene = await readFile('src/game/phaser/scenes/SimulationScene.js', 'utf8');
assert.match(scene, /lastHudRenderAt/, 'SimulationScene tracks HUD cadence');
assert.match(scene, /hudRenderSkipCount/, 'SimulationScene tracks HUD skips');
assert.match(scene, /rightPanelRenderSkipCount/, 'SimulationScene tracks right-panel skips');
assert.match(scene, /timelineRenderSkipCount/, 'SimulationScene tracks timeline skips');
assert.match(scene, /criticalUi/, 'critical updates bypass throttling');
assert.match(scene, />= 100/, 'normal HUD cadence is capped near 10 Hz');
console.log('PASS smoke_simulation_hud_throttling');
