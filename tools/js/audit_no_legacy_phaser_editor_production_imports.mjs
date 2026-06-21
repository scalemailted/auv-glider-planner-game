import assert from 'node:assert/strict';
import fs from 'node:fs';

const scene = fs.readFileSync('src/game/phaser/scenes/EnvironmentEditorScene.js', 'utf8');
assert.equal(scene.includes('drawMissionMap'), false, 'EnvironmentEditorScene must not import or call drawMissionMap in the normal editor path');
assert.ok(scene.includes('createThreeMissionWorldRenderer'), 'EnvironmentEditorScene mounts the shared Three mission renderer');
assert.ok(scene.includes('createThreeMissionEditorController'), 'EnvironmentEditorScene owns Three editor interaction bridge');
assert.ok(scene.includes('usesLegacyPhaserWorldRenderer: false'), 'debug explicitly reports no legacy Phaser editor world renderer');
const phaserGame = fs.readFileSync('src/game/phaser/PhaserGame.js', 'utf8');
assert.ok(phaserGame.includes('EnvironmentEditorScene'), 'Phaser shell still routes to editor scene during migration');
console.log('audit_no_legacy_phaser_editor_production_imports: PASS');
