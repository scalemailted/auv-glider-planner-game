import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const guard = readFileSync('src/core/planning/WaypointPlacementGuard.js', 'utf8');
assert.match(scene, /canPlaceWaypoint\(this\.app\.state/, 'scene command path must call canonical placement guard');
assert.match(scene, /BEYOND_MISSION_WINDOW/, 'scene must preserve mission-window warning metadata');
assert.match(guard, /commitAllowed: true/, 'guard must expose warning commits as allowed');
assert.doesNotMatch(scene.match(/placeWaypointFromThree\(intent\) \{[\s\S]*?previewWaypointMoveFromThree/)?.[0] ?? '', /\.waypoints\.push|addWaypoint\(/, 'Three intent bridge must not mutate plan directly');
console.log('audit_three_waypoint_semantics passed');
