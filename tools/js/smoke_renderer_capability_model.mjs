import assert from 'node:assert/strict';
import {
  RENDERER_BACKEND_IDS,
  RENDERER_CAPABILITY_MODEL_VERSION,
  detectRendererCapabilities,
  normalizeRendererBackend,
  rendererCapabilitySummary
} from '../../src/core/rendering/RendererCapabilityModel.js';

assert.equal(typeof RENDERER_CAPABILITY_MODEL_VERSION, 'string');
for (const id of ['phaser2d', 'canvas2d', 'webgl', 'threeWebGL', 'threeWebGPU', 'rawWebGPU', 'unsupported']) {
  assert.ok(RENDERER_BACKEND_IDS.includes(id), `backend id ${id} should be registered`);
}
assert.equal(normalizeRendererBackend('three'), 'threeWebGL');
assert.equal(normalizeRendererBackend('webgpu'), 'rawWebGPU');
assert.equal(normalizeRendererBackend('missing-renderer'), 'unsupported');

const fakeDocument = {
  createElement: () => ({
    getContext: (contextId) => (contextId === '2d' || contextId === 'webgl2' ? {} : null)
  })
};
const webgpuCaps = detectRendererCapabilities({
  document: fakeDocument,
  navigator: { gpu: {} },
  secureContext: true,
  supportsThree: true,
  preferredBackend: 'threeWebGPU'
});
assert.equal(webgpuCaps.supportsCanvas2D, true);
assert.equal(webgpuCaps.supportsWebGL, true);
assert.equal(webgpuCaps.supportsWebGPU, true);
assert.equal(webgpuCaps.supportsThree, true);
assert.equal(webgpuCaps.preferredBackend, 'threeWebGPU');
assert.notEqual(webgpuCaps.fallbackBackend, 'threeWebGPU');
assert.ok(webgpuCaps.notA.includes('not simulation authority'));
assert.ok(webgpuCaps.notA.includes('not scoring authority'));
assert.ok(webgpuCaps.notA.includes('not planner'));
assert.ok(webgpuCaps.notA.includes('not MARL/RL'));

const noWebgpuCaps = detectRendererCapabilities({
  document: fakeDocument,
  navigator: {},
  secureContext: true,
  supportsThree: true,
  preferredBackend: 'threeWebGPU'
});
assert.equal(noWebgpuCaps.supportsWebGPU, false);
assert.notEqual(noWebgpuCaps.preferredBackend, 'threeWebGPU');
assert.ok(noWebgpuCaps.warnings.some((message) => message.includes('WebGPU')));


const webglOneDocument = {
  createElement: () => ({
    getContext: (contextId) => (contextId === 'webgl' ? {} : null)
  })
};
const webglOneCaps = detectRendererCapabilities({ document: webglOneDocument, preferredBackend: 'webgl' });
assert.equal(webglOneCaps.supportsWebGL, true, 'WebGL fallback should work when webgl2 is unavailable');
assert.equal(webglOneCaps.preferredBackend, 'webgl');

const rawWebgpuOnly = detectRendererCapabilities({ supportsWebGPU: true, secureContext: true, preferredBackend: 'rawWebGPU' });
assert.equal(rawWebgpuOnly.preferredBackend, 'rawWebGPU');
assert.equal(rawWebgpuOnly.fallbackBackend, 'rawWebGPU', 'fallback should not claim unsupported Canvas2D');
const nodeCaps = detectRendererCapabilities({ globals: {}, preferredBackend: 'rawWebGPU' });
assert.equal(nodeCaps.supportsCanvas2D, false);
assert.equal(nodeCaps.supportsWebGL, false);
assert.equal(nodeCaps.supportsWebGPU, false);
assert.equal(nodeCaps.preferredBackend, 'unsupported');

const summary = rendererCapabilitySummary(webgpuCaps);
assert.equal(summary.webgpuProgressiveEnhancement, true);
assert.equal(summary.ownsSimulationState, false);
assert.equal(summary.ownsScoring, false);
assert.equal(summary.ownsPlanning, false);
assert.equal(summary.usesWebGPUFluid, false);
assert.equal(summary.usesMARL, false);

console.log('smoke_renderer_capability_model: ok');