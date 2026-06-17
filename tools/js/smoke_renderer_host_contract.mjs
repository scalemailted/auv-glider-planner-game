import assert from 'node:assert/strict';
import { detectRendererCapabilities } from '../../src/core/rendering/RendererCapabilityModel.js';
import {
  RENDERER_HOST_CONTRACT_VERSION,
  createRendererHostConfig,
  createRendererSceneDescriptor,
  rendererHostSummary,
  validateRendererHostConfig,
  validateRendererSceneDescriptor
} from '../../src/core/rendering/RendererHostContract.js';

assert.equal(typeof RENDERER_HOST_CONTRACT_VERSION, 'string');
const capabilities = detectRendererCapabilities({
  supportsCanvas2D: true,
  supportsWebGL: true,
  supportsWebGPU: false,
  supportsThree: false,
  phaserAvailable: true,
  preferredBackend: 'threeWebGL'
});
const descriptor = createRendererSceneDescriptor({
  id: 'future-ocean-world-renderer',
  label: 'Future Ocean World Renderer',
  rendererBackend: capabilities.preferredBackend,
  fallbackBackend: capabilities.fallbackBackend,
  purpose: 'Future bathymetry and water-column renderer.',
  requiredCapabilities: [],
  optionalCapabilities: ['webgl', 'webgpu', 'three'],
  consumesViewModelTypes: ['anchor.rendering.ocean-world-view-model']
});
const descriptorValidation = validateRendererSceneDescriptor(descriptor);
assert.equal(descriptorValidation.valid, true);
assert.equal(descriptor.ownsSimulationState, false);
assert.equal(descriptor.ownsScoring, false);
assert.equal(descriptor.ownsPlanning, false);

const host = createRendererHostConfig({
  id: 'anchor-browser-renderer-host',
  label: 'ANCHOR Browser Renderer Host',
  capabilities,
  scenes: [descriptor]
});
const hostValidation = validateRendererHostConfig(host);
assert.equal(hostValidation.valid, true);
assert.equal(hostValidation.status, 'PASS');
assert.equal(host.ownsSimulationState, false);
assert.equal(host.ownsScoring, false);
assert.equal(host.ownsPlanning, false);
assert.equal(host.usesWebGPUFluid, false);
assert.equal(host.usesMARL, false);

const summary = rendererHostSummary(host);
assert.equal(summary.sceneCount, 1);
assert.ok(summary.consumesViewModelTypes.includes('anchor.rendering.ocean-world-view-model'));
assert.equal(summary.ownsSimulationState, false);
assert.equal(summary.ownsScoring, false);
assert.equal(summary.ownsPlanning, false);

const invalid = validateRendererHostConfig({ ...host, ownsScoring: true });
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.some((message) => message.includes('scoring')));

console.log('smoke_renderer_host_contract: ok');