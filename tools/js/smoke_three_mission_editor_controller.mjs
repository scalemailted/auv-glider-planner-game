import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as controllerModule from '../../src/game/three/ThreeMissionEditorController.js';

for (const name of ['createThreeMissionEditorController', 'updateThreeMissionEditorController', 'handleThreeMissionEditorIntent', 'resizeThreeMissionEditorController', 'threeMissionEditorControllerSummary', 'disposeThreeMissionEditorController']) {
  assert.equal(typeof controllerModule[name], 'function', `${name} must be exported`);
}
const source = fs.readFileSync('src/game/three/ThreeMissionEditorController.js', 'utf8');
assert.ok(source.includes('commandFromEditorIntent'), 'controller routes intents through canonical editor commands');
assert.ok(source.includes('buildEditorWorldRenderViewModel'), 'controller refreshes derived editor render view model');
const bannedPatterns = [
  /from ['"].*SimulationEngine/i,
  /from ['"].*scoring/i,
  /new\s+SimulationEngine/i,
  /scoreMission\s*\(/i,
  /from ['"].*RouteOptimizer/i,
  /new\s+RouteOptimizer/i,
  /from ['"].*MARL/i,
  /from ['"].*WebGPU/i
];
for (const pattern of bannedPatterns) assert.equal(pattern.test(source), false, `controller must not introduce ${pattern}`);
assert.ok(source.includes('rendererOwnsEditorState: false'), 'controller declares renderer state is not authoritative');
console.log('smoke_three_mission_editor_controller: PASS');

