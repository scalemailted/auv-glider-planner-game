import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync('index.html', 'utf8');
const main = readFileSync('src/game/main.js', 'utf8');
const runtimeSelector = readFileSync('src/app/production/AnchorRuntimeSelector.js', 'utf8');
const workspace = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const simulation = readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');

assert.match(index, /src\/game\/main\.js/, 'index.html uses the production browser entry point');
assert.match(main, /resolveAnchorProductionRuntime/, 'production entry delegates runtime shell selection');
assert.match(runtimeSelector, /runtimeShell/, 'runtime selector supports runtimeShell query');
assert.match(runtimeSelector, /next/, 'runtime selector supports next shell selection');
assert.match(workspace, /ANCHOR_CURRENT_PRESENTATION_DEBUG/, 'planning scene publishes current presentation debug');
assert.match(simulation, /ANCHOR_CURRENT_PRESENTATION_DEBUG/, 'simulation scene publishes current presentation debug');
assert.match(workspace, /volumetricCurrentDebugPayload\(viewModel/, 'planning scene publishes compact volumetric current debug');
assert.match(simulation, /volumetricCurrentDebugPayload\(viewModel/, 'simulation scene publishes compact volumetric current debug');
assert.match(renderer, /currentPresentationCacheSignature\(viewModel\)/, 'renderer cache invalidates on current presentation state changes');
assert.equal(/new\s+SimulationEngine/.test(renderer), false, 'Three renderer does not own simulation execution');

console.log('audit_current_production_path_plumbing: ok');

