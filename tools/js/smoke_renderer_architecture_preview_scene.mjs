import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RendererArchitecturePreviewScene } from '../../src/game/phaser/scenes/RendererArchitecturePreviewScene.js';

const scenePath = 'src/game/phaser/scenes/RendererArchitecturePreviewScene.js';
const phaserGamePath = 'src/game/phaser/PhaserGame.js';
const mainMenuPath = 'src/game/phaser/scenes/MainMenuScene.js';

for (const file of [scenePath, phaserGamePath, mainMenuPath]) {
  assert.equal(fs.existsSync(file), true, `${file} should exist`);
}

const sceneSource = fs.readFileSync(scenePath, 'utf8');
const phaserGame = fs.readFileSync(phaserGamePath, 'utf8');
const mainMenu = fs.readFileSync(mainMenuPath, 'utf8');

assert.ok(sceneSource.includes('ANCHOR_RENDERER_ARCH_DEBUG'), 'scene exposes renderer architecture debug object');
assert.ok(sceneSource.includes('Phaser shell + future dedicated 3D renderer layer'), 'scene states shell plus future renderer stack');
assert.ok(sceneSource.includes('WebGPU fluid engine in this phase'), 'scene states no WebGPU fluid engine in this phase');
assert.ok(sceneSource.includes('usesWebGPUFluid: false'), 'scene debug says no WebGPU fluid ownership');
assert.ok(sceneSource.includes('usesMARL: false'), 'scene debug says no MARL/RL');
assert.ok(sceneSource.includes('ownsScoring: false'), 'scene debug says no scoring ownership');
assert.ok(sceneSource.includes('ownsPlanning: false'), 'scene debug says no planning ownership');
assert.ok(sceneSource.includes('ownsSimulationState: false'), 'scene debug says no simulation ownership');
assert.equal(sceneSource.includes('usesWebGPUFluid: true'), false, 'scene must not enable WebGPU fluid');
assert.equal(sceneSource.includes('usesMARL: true'), false, 'scene must not enable MARL/RL');
assert.equal(sceneSource.includes('ownsScoring: true'), false, 'scene must not own scoring');
assert.equal(sceneSource.includes('ownsPlanning: true'), false, 'scene must not own planning');
assert.equal(sceneSource.includes('ownsSimulationState: true'), false, 'scene must not own simulation state');

assert.ok(phaserGame.includes('RendererArchitecturePreviewScene'), 'PhaserGame registers RendererArchitecturePreviewScene');
assert.ok(phaserGame.includes("rendererArchitecturePreview: 'RendererArchitecturePreviewScene'"), 'PhaserGame exposes rendererArchitecturePreview alias');
assert.ok(mainMenu.includes('Renderer Architecture Preview'), 'Simulation Lab menu contains Renderer Architecture Preview');
assert.ok(mainMenu.includes("'renderer-architecture-preview': () => scene.start('RendererArchitecturePreviewScene')"), 'Simulation Lab action opens renderer preview scene');

const scene = new RendererArchitecturePreviewScene();
const panelViewModel = scene.buildPreviewModel({
  globals: {},
  preferredBackend: 'threeWebGL'
});
assert.equal(panelViewModel.capabilities.ownsSimulationState, false);
assert.equal(panelViewModel.capabilities.ownsScoring, false);
assert.equal(panelViewModel.capabilities.ownsPlanning, false);
assert.equal(panelViewModel.capabilities.usesWebGPUFluid, false);
assert.equal(panelViewModel.capabilities.usesMARL, false);
assert.equal(panelViewModel.hostSummary.sceneCount, 1);
assert.equal(panelViewModel.oceanWorldSummary.depthLayerCount, 3);
scene.refreshDebugObject(true);
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG.phaserShellActive, true);
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG.ownsSimulationState, false);
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG.ownsScoring, false);
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG.ownsPlanning, false);
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG.usesWebGPUFluid, false);
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG.usesMARL, false);

console.log('smoke_renderer_architecture_preview_scene: ok');