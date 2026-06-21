import assert from 'node:assert/strict';
import fs from 'node:fs';

const workspace = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const interaction = fs.readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const camera = fs.readFileSync('src/game/three/ThreeMissionCameraController.js', 'utf8');
const diagnostics = fs.readFileSync('src/core/simulation/TerrainSimulationDiagnostics.js', 'utf8');
const tests = fs.readFileSync('tests/e2e/smoke.spec.js', 'utf8');

assert.match(tests, /Three Camera Interaction Does Not Rebuild Mission Models/);
assert.match(workspace, /modelBuildCountDuringCameraGesture/);
assert.match(workspace, /predictionBuildCountDuringCameraGesture/);
assert.match(workspace, /resetPerformanceWindow/);
assert.match(interaction, /missionClickSuppressedReason/);
assert.match(interaction, /cameraGestureActive/);
assert.match(camera, /requestRender\?\.\('cameraGesture'\)/);
assert.doesNotMatch(diagnostics, /cameraGesture|cameraPreset|hover|selection|verticalExaggeration|label/);
assert.doesNotMatch(camera, /updateTerrainAwareMissionValidation|validateTerrainAwareMission/);

console.log('terrain validation camera invariant audit passed');
