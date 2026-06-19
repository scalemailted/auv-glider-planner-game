import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mission = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const simulation = readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const mainMenu = readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
assert.match(mission, /events\?\.once\?\.\('shutdown'/, 'Planning scene must bind shutdown event cleanup.');
assert.match(mission, /disposeThreeMissionWorldRenderer\(this\.threeMissionRenderer\)/, 'Planning cleanup must dispose Three renderer.');
assert.match(simulation, /events\?\.once\?\.\('shutdown'/, 'Simulation scene must bind shutdown event cleanup.');
assert.match(simulation, /this\.engine\?\.pause\?\.\(\)/, 'Simulation cleanup must pause the canonical engine.');
assert.match(mainMenu, /stopMissionScenesForMainMenu\(\)/, 'Main Menu must defensively stop mission scenes.');
assert.match(mainMenu, /resetMissionShellForMainMenu/, 'Main Menu must reset stale mission shell presentation.');
console.log('smoke_scene_transition_cleanup passed');
