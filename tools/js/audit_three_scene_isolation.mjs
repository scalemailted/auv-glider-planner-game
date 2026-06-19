import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainMenu = readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const reset = readFileSync('src/ui/MissionShellReset.js', 'utf8');
const index = readFileSync('index.html', 'utf8');
assert.match(mainMenu, /stopMissionScenesForMainMenu/);
assert.match(reset, /ANCHOR_SCENE_ISOLATION_DEBUG/);
assert.match(reset, /threeMissionCanvasCount/);
assert.equal(index.includes('src/app/main.js'), false);
assert.equal(index.includes('AnchorBrowserRuntime'), false);
console.log('audit_three_scene_isolation passed');
