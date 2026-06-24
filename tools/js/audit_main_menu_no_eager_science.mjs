import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bootFiles = [
  'src/game/main.js',
  'src/game/phaser/PhaserProductionBootstrap.js',
  'src/game/phaser/PhaserGame.js',
  'src/game/phaser/scenes/MainMenuScene.js',
  'src/app/production/AnchorProductionBootstrap.js'
];
const forbidden = [
  'new SimulationEngine',
  'markSimulationLaunchStage',
  'createCoastalOperationalBathymetry(',
  'createSyntheticBathymetryField(',
  'createOceanCurrentSampler(',
  'createOceanCurrentField4D(',
  'createSyntheticCurrentCubeFixture(',
  'createThreeMissionWorldRenderer(',
  'createThreeInstancedCurrentGlyphLayer('
];
const violations = [];
for (const file of bootFiles) {
  const text = await readFile(file, 'utf8');
  for (const term of forbidden) if (text.includes(term)) violations.push(`${file}: ${term}`);
}
assert.deepEqual(violations, [], `Main Menu boot path eagerly constructs science/runtime objects:\n${violations.join('\n')}`);
console.log('PASS audit_main_menu_no_eager_science');