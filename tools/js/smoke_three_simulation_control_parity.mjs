import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
for (const action of ['start', 'play', 'pause', 'step', 'finish', 'reset', 'planning', 'debrief', 'menu']) {
  assert(scene.includes(`data-action="${action}"`), `Simulation console missing ${action} control`);
}
assert(scene.includes('togglePlay()'), 'Play/Pause must call SimulationScene command');
assert(scene.includes('stepOnce()'), 'Step must call SimulationScene command');
assert(scene.includes('finishSimulation()'), 'Finish must call SimulationScene command');
assert(scene.includes('resetSimulation()'), 'Reset must call SimulationScene command');
assert(scene.includes('setThreeSimulationCameraPreset'), 'Camera controls should remain visible');
console.log('smoke_three_simulation_control_parity passed');