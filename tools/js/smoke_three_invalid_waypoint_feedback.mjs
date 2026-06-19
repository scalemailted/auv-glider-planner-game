import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
assert.match(scene, /validateThreePlacementPreview\(intent\)/);
assert.match(scene, /hardErrors/);
assert.match(scene, /if \(!placement\.allowed\)/, 'hard invalid placement must reject before addWaypointForSelected mutates the plan');
assert.match(scene, /this\.addWaypointForSelected/, 'Three intent path must use canonical scene command path');
assert.doesNotMatch(scene.match(/placeWaypointFromThree\(intent\) \{[\s\S]*?previewWaypointMoveFromThree/)?.[0] ?? '', /addWaypoint\(/, 'Three placement handler must not mutate plan directly');
console.log('smoke_three_invalid_waypoint_feedback passed');
