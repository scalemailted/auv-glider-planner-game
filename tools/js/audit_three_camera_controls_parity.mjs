import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overlay = readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const camera = readFileSync('src/game/three/ThreeMissionCameraController.js', 'utf8');
const interaction = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const debugDocs = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');

for (const control of ['tacticalTopDown', 'obliqueMission', 'waterColumnProfile', 'fleetOverview', 'focusSelectedGlider', 'focusRoute', 'resetCamera']) {
  assert.ok(overlay.includes(control), `Mission console camera control missing ${control}.`);
}
for (const api of ['setThreeMissionCameraPreset', 'focusThreeMissionCamera', 'resetThreeMissionCamera', 'threeMissionCameraControllerSummary']) {
  assert.ok(scene.includes(api) || camera.includes(api), `Camera parity API missing ${api}.`);
}
for (const gesture of ['orbitBy', 'panBy', 'zoomByDelta']) {
  assert.ok(camera.includes(gesture), `Camera controller missing ${gesture}.`);
  assert.ok(interaction.includes(`cameraController?.${gesture}`), `Interaction controller should call ${gesture}.`);
}
for (const field of ['cameraPresetId', 'cameraAzimuthRadians', 'cameraPolarRadians', 'cameraDistance', 'cameraTarget', 'cameraOrbitChangeCount', 'cameraPanChangeCount', 'cameraZoomChangeCount']) {
  assert.ok(debugDocs.includes(field), `ANCHOR_MISSION_RENDER_DEBUG should expose ${field}.`);
}
assert.ok(scene.includes('updateThreeMissionWorldRenderer(renderer, viewModel);'), 'Renderer refresh should still update Three world.');
assert.doesNotMatch(scene, /refreshThreeMissionRenderer\(\)[\s\S]{0,600}setThreeMissionWorldCamera\(renderer, \{ preset:/, 'Refresh must not reset manual camera on every frame.');

console.log('Three camera controls parity audit passed.');