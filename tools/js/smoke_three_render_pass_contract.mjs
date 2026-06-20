import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createThreePerformanceDebugPayload } from '../../src/game/three/ThreeMissionPerformanceMonitor.js';

const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const renderCalls = renderer.match(/renderer\.renderer\.render\(/g) ?? [];
assert.equal(renderCalls.length, 1, 'normal mission renderer has one WebGL submit site');
assert.match(renderer, /submitThreeMissionWorldRender/, 'render submission is centralized');
assert.match(renderer, /requestThreeMissionWorldRender/, 'layer updates request rendering instead of rendering directly');
assert.match(renderer, /renderCallsThisPresentationFrame/, 'per-presentation-frame render calls are tracked');
assert.match(renderer, /duplicateRenderCallWarningCount/, 'duplicate render calls have a warning counter');
for (const file of readdirSync('src/game/three/layers').filter((name) => name.endsWith('.js'))) {
  const source = readFileSync(`src/game/three/layers/${file}`, 'utf8');
  assert.doesNotMatch(source, /\.render\s*\(/, `${file} must not submit WebGL renders directly`);
}
const debug = createThreePerformanceDebugPayload({ rendererSummary: { disposed: false, activeRafCount: 1, renderCallsPerPresentationFrame: 2, duplicateRenderCallWarningCount: 1 } });
assert.equal(debug.renderCallsPerPresentationFrame, 2);
assert.equal(debug.duplicateRenderCallWarningCount, 1);
console.log(JSON.stringify({ ok: true, renderCallSites: renderCalls.length }));
