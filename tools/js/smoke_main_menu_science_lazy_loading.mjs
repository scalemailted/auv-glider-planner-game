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
  /new\s+SimulationEngine\b/,
  /createCoastalOperationalBathymetry\s*\(/,
  /createSyntheticBathymetryField\s*\(/,
  /createSyntheticCurrentCubeFixture\s*\(/,
  /createOceanCurrentField4D\s*\(/,
  /createOceanCurrentSampler\s*\(/,
  /new\s+THREE\.WebGLRenderer\b/,
  /createThreeMissionWorldRenderer\s*\(/
];
const violations = [];
for (const file of bootFiles) {
  const text = await readFile(file, 'utf8');
  for (const pattern of forbidden) {
    if (pattern.test(text)) violations.push(`${file}: ${pattern}`);
  }
}
assert.deepEqual(violations, [], `Main Menu boot path must remain science-lazy:\n${violations.join('\n')}`);
console.log('PASS smoke_main_menu_science_lazy_loading');