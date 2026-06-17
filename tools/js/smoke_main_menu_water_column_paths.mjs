import assert from 'node:assert/strict';
import fs from 'node:fs';

const mainMenu = fs.readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const viewerScene = fs.readFileSync('src/game/phaser/scenes/HeadlessBundleViewerScene.js', 'utf8');
const viewerPanel = fs.readFileSync('src/ui/headless/HeadlessBundleViewerPanel.js', 'utf8');

assert.ok(mainMenu.includes('Headless Bundle Viewer'), 'MainMenuScene contains Headless Bundle Viewer entry');
assert.ok(mainMenu.includes("hubActionHtml('headless-bundle-viewer', 'Headless Bundle Viewer'"), 'Simulation Lab wires Headless Bundle Viewer action');
assert.ok(mainMenu.includes("hubActionHtml('benchmark-adaptive', 'Adaptive Benchmark'"), 'Simulation Lab wires Adaptive Benchmark action');
assert.ok(mainMenu.includes("hubActionHtml('sampling-priority-demo', 'Sampling Priority Demo'"), 'Simulation Lab wires Sampling Priority Demo action');
assert.ok(mainMenu.includes("hubActionHtml('flow-coupled-sampling-demo', 'Flow-Coupled Sampling Demo'"), 'Simulation Lab wires Flow-Coupled Sampling Demo action');

assert.ok(viewerScene.includes('ANCHOR_HEADLESS_BUNDLE_DEBUG'), 'Headless Bundle Viewer scene exposes debug object');
assert.ok(viewerScene.includes('hasWaterColumnSummary'), 'Headless Bundle Viewer debug object includes water-column summary flag');
assert.ok(viewerPanel.includes('Water Column'), 'Headless Bundle Viewer panel renders Water Column section');
assert.ok(viewerPanel.includes('surface') || viewerPanel.includes('waterColumnLayerIds'), 'Headless Bundle Viewer panel exposes depth-layer ids');
assert.ok(viewerPanel.includes('P11 does not add full 3D planning'), 'Headless Bundle Viewer states no full 3D planning boundary');

for (const forbidden of [
  'usesNewPlanner: true',
  'changesScoring: true',
  'usesMARL: true',
  'MARL training',
  'new route planner',
  'full 3D planning enabled'
]) {
  assert.equal(mainMenu.includes(forbidden), false, `MainMenuScene should not claim ${forbidden}`);
}

console.log('smoke_main_menu_water_column_paths: ok');
