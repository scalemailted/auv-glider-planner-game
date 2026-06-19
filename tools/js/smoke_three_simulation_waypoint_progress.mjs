import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const adapter = fs.readFileSync('src/core/rendering/SimulationWorldStateAdapter.js', 'utf8');
assert(scene.includes('canonicalWaypointStatusCount'), 'Simulation debug must expose canonical waypoint status count');
assert(scene.includes('rightPanelWaypointStatusCount'), 'Simulation debug must expose right-panel waypoint status count');
assert(scene.includes('timelineWaypointStatusCount'), 'Simulation debug must expose timeline waypoint status count');
assert(adapter.includes('completedAgentCount') && adapter.includes('failedAgentCount'), 'Simulation adapter must expose progress counts');
assert(scene.includes('stable waypoint') === false, 'smoke does not rely on renderer-generated waypoint status wording');
console.log('smoke_three_simulation_waypoint_progress passed');