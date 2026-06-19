import fs from 'node:fs';
import assert from 'node:assert/strict';

const filesToCheck = [
  'src/core/rendering/PlannedDiveSegmentViewModel.js',
  'src/core/rendering/VolumetricMissionWorldViewModel.js',
  'src/game/three/layers/ThreePlannedDiveTrajectoryLayer.js',
  'src/game/three/ThreeMissionWorldRenderer.js',
  'src/game/phaser/scenes/MissionWorkspaceScene.js'
];
for (const file of filesToCheck) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /T_hiddenTruth/, `${file} must not expose hidden truth`);
  assert.doesNotMatch(source, /new\s+SimulationEngine|engine\.step|stepOnce\(/, `${file} must not create or step a simulation engine`);
}
const planned = fs.readFileSync('src/core/rendering/PlannedDiveSegmentViewModel.js', 'utf8');
const layer = fs.readFileSync('src/game/three/layers/ThreePlannedDiveTrajectoryLayer.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
assert.match(planned, /derivedFromCanonicalDiveModel:\s*true/, 'planned segment contract declares canonical model derivation');
assert.match(planned, /decorativeOnly:\s*false/, 'planned segment contract is not decorative');
assert.match(planned, /ownsSimulation:\s*false/, 'planned segment contract denies simulation ownership');
assert.match(planned, /ownsPlanning:\s*false/, 'planned segment contract denies planning ownership');
assert.match(planned, /ownsScoring:\s*false/, 'planned segment contract denies scoring ownership');
assert.match(planned, /usesArbitraryXYZWaypoints:\s*false/, 'planned segment contract denies arbitrary XYZ controls');
assert.match(planned, /createsScoreEvent:\s*false/, 'predicted samples do not create score events');
assert.doesNotMatch(planned, /from 'three'|new THREE\./, 'planned segment view model must not depend on Three.js');
assert.doesNotMatch(layer, /from .*core\/(sim|simulation|scoring|planning)\//, 'Three planned-dive layer must not import sim, scoring, or planning authority modules');
assert.match(layer, /createsScoreEvent:\s*false/, 'Three sample markers are display-only');
assert.match(index, /src\/game\/main\.js/, 'active app entry point remains src/game/main.js');
assert.doesNotMatch(index, /src\/app\/main\.js|AnchorBrowserRuntime|RouteScopedViewHost/, 'reverted runtime is not active');
console.log(JSON.stringify({ ok: true, rendererOwnsPrediction: false, arbitraryXYZPlanner: false, hiddenTruthLeak: false }));