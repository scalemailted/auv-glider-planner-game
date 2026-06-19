import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
assert(scene.includes('resultBuildCount'), 'SimulationScene must track result build count');
assert(scene.includes('debriefTransitionCount'), 'SimulationScene must track debrief transition count');
assert(scene.includes('recordDebriefRequested'), 'SimulationScene must record debrief requests');
assert(scene.includes('resultBuilt'), 'Execution transaction must record resultBuilt');
assert(scene.includes('debriefRequested'), 'Execution transaction must record debriefRequested');
assert(scene.includes('disposeThreeSimulationRenderer'), 'SimulationScene must dispose Three renderer on shutdown');
console.log('smoke_three_simulation_terminal_debrief passed');