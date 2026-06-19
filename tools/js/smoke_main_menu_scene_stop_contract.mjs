import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const method = source.match(/stopMissionScenesForMainMenu\(\) \{[\s\S]*?\n  \}/)?.[0] ?? '';
assert.match(method, /sceneManager\.stop\?\.\(key\)/);
assert.doesNotMatch(method, /\.shutdown\?\.\(/);
assert.match(method, /isActive/);
assert.match(method, /isSleeping/);
console.log('smoke_main_menu_scene_stop_contract passed');