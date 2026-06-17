import assert from 'node:assert/strict';
import fs from 'node:fs';

const mainMenuPath = 'src/game/phaser/scenes/MainMenuScene.js';
const phaserGamePath = 'src/game/phaser/PhaserGame.js';
const missionConsolePath = 'src/ui/MissionConsole.js';
const rightPanelPath = 'src/ui/RightWaypointPanel.js';
const layoutPath = 'css/layout.css';

for (const file of [mainMenuPath, phaserGamePath, missionConsolePath, rightPanelPath, layoutPath]) {
  assert.equal(fs.existsSync(file), true, `${file} should exist`);
}

const mainMenu = fs.readFileSync(mainMenuPath, 'utf8');
const phaserGame = fs.readFileSync(phaserGamePath, 'utf8');
const missionConsole = fs.readFileSync(missionConsolePath, 'utf8');
const rightPanel = fs.readFileSync(rightPanelPath, 'utf8');
const layout = fs.readFileSync(layoutPath, 'utf8');

assert.ok(phaserGame.includes('MainMenuScene'), 'PhaserGame registers MainMenuScene');
assert.ok(mainMenu.includes('MAIN_MENU_VERSION'), 'MainMenuScene declares hub version');
assert.ok(mainMenu.includes('ANCHOR_MAIN_MENU_DEBUG'), 'MainMenuScene exposes debug object');
assert.ok(mainMenu.includes('usesFullViewportHub: true'), 'debug object marks full viewport hub');
assert.ok(mainMenu.includes('changesSimulationBehavior: false'), 'debug object says simulation behavior unchanged');
assert.ok(mainMenu.includes('changesScoring: false'), 'debug object says scoring unchanged');
assert.ok(mainMenu.includes('usesNewPlanner: false'), 'debug object says no new planner');
assert.ok(mainMenu.includes('usesMARL: false'), 'debug object says no MARL');

for (const label of ['Challenge Mode', 'Simulation Lab', 'Learning Labs']) {
  assert.ok(mainMenu.includes(label), `hub includes primary card ${label}`);
}
for (const label of ['Sampling Process Lab', 'Flow Fields Demo', 'Coupled Fields Demo', 'Uncertainty / Forecast Demo', 'Planner Benchmark', 'Adaptive Benchmark', 'Headless Bundle Viewer']) {
  assert.ok(mainMenu.includes(label), `hub includes simulation lab action ${label}`);
}
for (const label of ['Start Guided Challenge', 'Quick Random Challenge', 'Play Custom Challenge / Import Challenge JSON']) {
  assert.ok(mainMenu.includes(label), `hub includes challenge action ${label}`);
}
for (const label of ['Learning Labs Index', 'Scientific Computational Modeling', 'Sampling Priority to Glider Action Value']) {
  assert.ok(mainMenu.includes(label), `hub includes learning lab action ${label}`);
}

assert.ok(missionConsole.includes('Choose Challenge Mode, Simulation Lab, or Learning Labs from the main viewport.'), 'MissionConsole idle points to viewport hub');
assert.ok(missionConsole.includes('compact-main-menu-console'), 'MissionConsole idle is compact');
assert.equal(missionConsole.includes('data-accordion-key="challenge-mode"'), false, 'MissionConsole idle no longer owns challenge accordion');
assert.equal(missionConsole.includes('data-accordion-key="simulation-lab"'), false, 'MissionConsole idle no longer owns simulation lab accordion');
assert.equal(missionConsole.includes('data-accordion-key="learning-labs"'), false, 'MissionConsole idle no longer owns learning labs accordion');

assert.ok(rightPanel.includes('data-main-menu-right-panel'), 'right panel has compact main-menu state');
assert.ok(layout.includes('body.main-menu-shell'), 'layout has main menu shell class');
assert.ok(layout.includes('main-menu-hub'), 'layout has hub styles');
assert.ok(layout.includes('#waypoint-timeline'), 'layout suppresses or compacts right panel through shell state');

for (const forbidden of ['SimulationScene.js', 'Scoring.js', 'RoutePlanner', 'AStar', 'Dijkstra', 'MARL training']) {
  assert.equal(mainMenu.includes(forbidden), false, `MainMenuScene should not introduce ${forbidden}`);
}

console.log('smoke_main_menu_hub_contract: ok');
