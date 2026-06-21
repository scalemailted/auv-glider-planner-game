import assert from 'node:assert/strict';
import fs from 'node:fs';

const workspace = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const simulation = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const engine = fs.readFileSync('src/core/sim/SimulationEngine.js', 'utf8');
const renderer = fs.readFileSync('src/game/three/layers/ThreeTerrainValidationLayer.js', 'utf8');
const resultExporter = fs.readFileSync('src/core/io/ResultExporter.js', 'utf8');
const replay = fs.readFileSync('src/core/replay/ReplayContractBuilder.js', 'utf8');
const headless = fs.readFileSync('src/core/headless/runtime/HeadlessBundleWriter.js', 'utf8');

assert.match(workspace, /planningValidationCacheHitCount/);
assert.match(workspace, /terrainValidationInvalidationReason/);
assert.match(engine, /updateTerrainSimulationDiagnostics\(/);
assert.doesNotMatch(simulation.match(/updateSimulationRenderDebug[\s\S]*?syncSimulationTimeToState/)?.[0] ?? '', /buildResultExport|buildReplayArtifactsFrom|createHeadlessBundleManifest/);
assert.match(renderer, /validationLayerDigest/);
assert.match(renderer, /line\.userData\?\.pointsDigest !== pointsDigest/);
assert.match(resultExporter, /recordResultExportBuild/);
assert.match(replay, /recordReplayBuild/);
assert.match(headless, /recordHeadlessBundleBuild/);
console.log('terrain validation live-loop cost audit passed');