import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const adapter = fs.readFileSync('src/core/rendering/SimulationWorldStateAdapter.js', 'utf8');
const viewModel = fs.readFileSync('src/core/rendering/SimulationWorldRenderViewModel.js', 'utf8');
const scene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
assert(adapter.includes('hiddenTruthExcluded') || adapter.includes('allowHiddenTruth: false'), 'simulation adapter must exclude hidden truth');
assert(viewModel.includes('includesHiddenTruth: false'), 'simulation view model must mark hidden truth excluded');
assert(scene.includes('canonicalObservationCount'), 'Simulation debug must expose canonical observation count');
assert(scene.includes('threeObservationCount'), 'Simulation debug must expose rendered observation count');
assert(!scene.includes('hiddenTruth') || scene.includes('exposesHiddenTruth: false'), 'SimulationScene must not expose hidden truth');
console.log('smoke_three_simulation_observation_parity passed');