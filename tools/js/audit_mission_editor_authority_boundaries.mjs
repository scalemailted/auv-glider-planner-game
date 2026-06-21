import assert from 'node:assert/strict';
import fs from 'node:fs';

const command = fs.readFileSync('src/core/editor/MissionEditorCommand.js', 'utf8');
const controller = fs.readFileSync('src/game/three/ThreeMissionEditorController.js', 'utf8');
const scene = fs.readFileSync('src/game/phaser/scenes/EnvironmentEditorScene.js', 'utf8');
assert.ok(controller.includes('commandFromEditorIntent'), 'Three controller must route UI intent through canonical command mapping');
assert.ok(command.includes('applyMissionEditorCommand'), 'canonical command application exists in shared core');
assert.ok(scene.includes('syncEditorDocumentFromScene'), 'scene syncs canonical editor document from UI state');
assert.ok(scene.includes('missionEditorDocumentForExport'), 'export path is based on canonical editor document');
for (const source of [command, controller, scene]) {
  assert.equal(/rendererOwns(Editor)?State:\s*true/.test(source), false, 'renderer must not be marked as editor authority');
  assert.equal(/changesOfficialBrowserScoring:\s*true/.test(source), false, 'editor must not alter official scoring');
  assert.equal(/usesNewPlanner:\s*true/.test(source), false, 'editor must not add a planner');
}
assert.equal(scene.includes('drawMissionMap('), false, 'normal EnvironmentEditorScene refresh must not call legacy Phaser world draw');
console.log('audit_mission_editor_authority_boundaries: PASS');
