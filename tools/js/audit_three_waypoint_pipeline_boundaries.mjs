import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const bridge = readFileSync('src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js', 'utf8');
const overlay = readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
const controller = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const camera = readFileSync('src/game/three/ThreeMissionCameraController.js', 'utf8');

const threeFiles = walk(path.join(root, 'src/game/three')).filter((file) => file.endsWith('.js'));
for (const file of threeFiles) {
  const source = readFileSync(file, 'utf8');
  const relative = path.relative(root, file);
  for (const pattern of [/waypoints\.push\(/, /planningMarkers\.push\(/, /setSelectedStart\(/, /addWaypoint\(/, /removeWaypoint\(/, /updateWaypoint\(/]) {
    assert.doesNotMatch(source, pattern, `${relative} must not mutate canonical planning state`);
  }
  for (const token of ['SimulationEngine', 'scoreMission', 'computeScore', 'T_hiddenTruth', 'hiddenTruth']) {
    assert.equal(source.includes(token), false, `${relative} must not own simulation, scoring, or hidden truth`);
  }
}

assert.ok(bridge.includes("if (id === 'placeWaypoint') return scene.placeWaypointFromThree"), 'bridge should route placeWaypoint to scene command handler');
assert.ok(scene.includes('placeWaypointFromThree(intent)'), 'scene should own the renderer-neutral waypoint command bridge');
assert.ok(scene.includes('this.addWaypointForSelected'), 'scene waypoint bridge should call canonical add-waypoint command');
assert.ok(scene.includes('setPlanningTool(toolId, context = {})'), 'scene should be the active tool-state owner');
assert.ok(scene.includes('syncPlanningToolToThreeController()'), 'scene should sync tool state into Three controller');
assert.ok(scene.includes('planningToolStateMismatches'), 'scene should expose tool-state mismatch diagnostics');
assert.ok(overlay.includes('data-action="mission-planning-tool"'), 'visible planning tools should dispatch through stable delegated action');
assert.ok(controller.includes('pointerDown') && controller.includes('pointerGestureClassification'), 'controller should own pointer classification diagnostics');
assert.ok(controller.includes('cameraGestureTypeForEvent'), 'controller should arbitrate camera gestures before edit intents');
assert.ok(camera.includes('THREE_MISSION_CAMERA_MOUSE_MAPPING'), 'camera controller should expose the standard mouse mapping');
assert.ok(scene.includes('pointerOwner') && scene.includes('phaserWorldInputEnabled'), 'debug object should expose pointer ownership state');
assert.ok(scene.includes('ownsPlanning: false'), 'debug object should state Three does not own planning');
assert.ok(scene.includes('ownsSimulationState: false'), 'debug object should state Three does not own simulation');
assert.ok(scene.includes('ownsScoring: false'), 'debug object should state Three does not own scoring');
const refreshMapBody = scene.match(/\\n  refreshMap\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}/)?.[0] ?? '';
assert.doesNotMatch(refreshMapBody, /trySelectDeploymentStart\(/, 'refresh should not hide an internal deployment mutation path');
assert.doesNotMatch(refreshMapBody, /addWaypointForSelected\(/, 'refresh should not hide an internal waypoint mutation path');

console.log('THREE-R1.1C waypoint pipeline boundary audit passed.');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
