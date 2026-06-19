import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const files = [
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/three/ThreeMissionInteractionController.js',
  'src/game/three/layers/ThreeRealizedTrajectoryLayer.js',
  'src/game/three/layers/ThreeObservationLayer.js',
  'src/game/three/layers/ThreeRouteStatusLayer.js',
  'src/game/three/layers/ThreeSimulationStatusLayer.js'
];
for (const file of files) {
  const source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  assert(!/new\s+SimulationEngine/.test(source), `${file} must not create a SimulationEngine`);
  assert(!/summarizeScore|score\s*=|finalScore\s*=/.test(source), `${file} must not calculate score`);
  assert(!/updateSampling|sampleROI|generateObservation/.test(source), `${file} must not generate observations`);
  assert(!/engine\.step|stepOnce\(/.test(source), `${file} must not step the engine`);
  assert(!/hiddenTruth|T_hiddenTruth/.test(source), `${file} must not reference hidden truth`);
}
const scene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
assert(scene.includes('new SimulationEngine'), 'SimulationScene/core must remain engine owner');
assert(scene.includes('rendererOwnsSimulationState: false'), 'debug must state renderer does not own simulation state');
assert(scene.includes('rendererOwnsScoring: false'), 'debug must state renderer does not own scoring');
console.log('audit_three_execution_boundaries passed');
