import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const failures = [];
const root = process.cwd();
const threeFiles = walk(path.join(root, 'src/game/three')).filter((file) => file.endsWith('.js'));
for (const file of threeFiles) {
  const source = readFileSync(file, 'utf8');
  const relative = path.relative(root, file);
  for (const token of ['SimulationEngine', 'RouteValidator', 'scoreMission', 'computeScore', 'T_hiddenTruth']) {
    if (source.includes(token)) failures.push(`${relative} must not reference ${token}.`);
  }
  if (/\bhiddenTruth\b(?!Excluded)/.test(source)) failures.push(`${relative} must not reference hiddenTruth outside explicit exclusion metadata.`);
  for (const pattern of [/agentPlans\s*\[/, /(?:agentPlans|waypoints|planningMarkers)\s*\.\s*(?:push|splice)\(/]) {
    if (pattern.test(source)) failures.push(`${relative} appears to mutate canonical planning arrays.`);
  }
}

const intent = readFileSync('src/core/rendering/MissionWorldInteractionIntent.js', 'utf8');
const result = readFileSync('src/core/rendering/MissionWorldInteractionResult.js', 'utf8');
const toolState = readFileSync('src/core/rendering/MissionPlanningToolState.js', 'utf8');
const cameraController = readFileSync('src/game/three/ThreeMissionCameraController.js', 'utf8');
const interactionController = readFileSync('src/game/three/ThreeMissionInteractionController.js', 'utf8');
const continuousUiState = readFileSync('src/core/rendering/ContinuousMissionUiState.js', 'utf8');
assert.match(intent, /ownsPlanning:\s*false/, 'intent contract must deny planning ownership.');
assert.match(intent, /ownsSimulation:\s*false/, 'intent contract must deny simulation ownership.');
assert.match(result, /changesOfficialBrowserScoring:\s*false/, 'result contract must deny scoring changes.');
assert.match(toolState, /ownsPlanning:\s*false/, 'planning tool state must deny planning ownership.');
assert.match(toolState, /ownsSimulationState:\s*false/, 'planning tool state must deny simulation ownership.');
assert.match(cameraController, /ownsScoring:\s*false/, 'camera controller summary must deny scoring ownership.');
assert.doesNotMatch(cameraController, /addWaypoint\(|setSelectedStart\(|scoreMission|SimulationEngine/, 'camera controller must not mutate mission state.');
assert.match(interactionController, /continuousPoint/, 'Three interaction controller must forward continuous hit points.');
assert.match(interactionController, /createMissionWorldInteractionIntent/, 'Three interaction controller must emit renderer-neutral intents.');
assert.match(continuousUiState, /usesContinuousWaypoints:\s*coordinateProfileId === 'continuousGridV1'/, 'continuous UI state must keep continuous waypoint ownership in core state.');
assert.match(continuousUiState, /usesArbitraryXYZRoutePlanning:\s*false/, 'continuous UI state must deny arbitrary XYZ planning.');
assert.match(continuousUiState, /rendererOwnsPlanning:\s*false/, 'continuous UI state must deny renderer planning ownership.');
assert.match(continuousUiState, /rendererOwnsSimulation:\s*false/, 'continuous UI state must deny renderer simulation ownership.');
assert.match(continuousUiState, /rendererOwnsScoring:\s*false/, 'continuous UI state must deny renderer scoring ownership.');

const rightWaypointPanel = readFileSync('src/ui/RightWaypointPanel.js', 'utf8');
const segmentCommands = readFileSync('src/core/planning/SegmentFlightPlanCommands.js', 'utf8');
assert.match(rightWaypointPanel, /buildRightWaypointSegmentEditorViewModel/, 'right panel must consume route-instruction view model');
assert.match(rightWaypointPanel, /data-agent-tab/, 'right panel must isolate glider tab bindings from segment command controls');
assert.doesNotMatch(rightWaypointPanel, /querySelectorAll\('\[data-agent\]'\)/, 'right panel must not bind agent selection to all data-agent controls');
assert.doesNotMatch(rightWaypointPanel, /\.waypoints\s*\[|\.push\(|\.splice\(/, 'right panel must not mutate canonical waypoint arrays');
assert.match(segmentCommands, /updateSegmentFlightPlan/, 'segment profile mutations must go through canonical commands');
assert.match(segmentCommands, /applySegmentFlightPlanToRemaining/, 'remaining segment updates must go through canonical commands');
assert.match(segmentCommands, /setGliderDefaultFlightPlan/, 'glider default updates must go through canonical commands');
const index = readFileSync('index.html', 'utf8');
if (index.includes('src/app/main.js')) failures.push('index.html activates reverted DOM route entry.');
if (index.includes('AnchorBrowserRuntime')) failures.push('index.html activates reverted DOM runtime.');

assert.equal(failures.length, 0, failures.join('\n'));
console.log('Three interaction boundary audit passed.');

function walk(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
