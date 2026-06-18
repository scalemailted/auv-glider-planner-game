import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const bridge = readFileSync('src/game/phaser/interaction/MissionWorkspaceThreeInteractionBridge.js', 'utf8');

assert.ok(scene.includes('trySelectDeploymentStart(cell)'), 'MissionWorkspaceScene must keep deployment-start selection as a canonical command.');
assert.match(scene, /requiresDeploymentSelection\(this\.app\.state\.mission, this\.app\.state\.selectedAgentId\)[\s\S]*?trySelectDeploymentStart\(cell\)/, 'Three waypoint clicks must select deployment start before adding waypoints when deployment is required.');
assert.match(scene, /changedCanonicalState:\s*true[\s\S]*?Deployment start selected/, 'deployment selection result must report canonical selection state change and message.');
assert.ok(bridge.includes('placeWaypointFromThree'), 'bridge must route Three cell clicks through scene placement logic.');

console.log('Three deployment selection smoke passed.');