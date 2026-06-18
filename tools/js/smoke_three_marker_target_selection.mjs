import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controller = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const markerLayer = readFileSync('src/game/three/layers/ThreePlanningMarkerLayer.js', 'utf8');
const targetLayer = readFileSync('src/game/three/layers/ThreePriorityTargetLayer.js', 'utf8');

assert.ok(controller.includes('placePlanningMarker'), 'controller must emit marker placement intent.');
assert.ok(controller.includes('selectPriorityTarget'), 'controller must emit Gold Star selection intent.');
assert.ok(scene.includes('placePlanningMarkerFromThree'), 'scene must place planning markers canonically.');
assert.ok(scene.includes('selectPriorityTargetFromThree'), 'scene must inspect Gold Stars canonically.');
assert.match(markerLayer, /missionObjectType:\s*'planningMarker'/, 'marker layer must expose stable planningMarker identity.');
assert.match(targetLayer, /missionObjectType:\s*'priorityTarget'/, 'priority layer must expose stable priorityTarget identity.');
assert.match(scene, /executable:\s*false/, 'planning markers must remain non-executable.');

console.log('Three marker and target selection smoke passed.');