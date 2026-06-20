import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { effectiveThreePixelRatio, renderCostPolicySummary, threeQualityProfileSettings } from '../../src/game/three/ThreeRenderCostPolicy.js';

assert.equal(threeQualityProfileSettings('performance').pixelRatioLimit, 1);
assert.equal(threeQualityProfileSettings('balanced').pixelRatioLimit, 1.25);
assert.equal(threeQualityProfileSettings('high').pixelRatioLimit, 2);
assert.equal(effectiveThreePixelRatio({ devicePixelRatio: 2, qualityProfile: 'performance' }), 1);
assert.equal(effectiveThreePixelRatio({ devicePixelRatio: 2, qualityProfile: 'balanced' }), 1.25);
assert.equal(effectiveThreePixelRatio({ devicePixelRatio: 2.5, qualityProfile: 'high' }), 2);
const source = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
assert.match(source, /applyThreeRendererQuality/, 'renderer applies quality changes in place');
assert.match(source, /renderer\.renderer\.setPixelRatio\(pixelRatio\)/, 'pixel ratio is updated in place');
assert.equal((source.match(/new THREE\.WebGLRenderer/g) ?? []).length, 1, 'quality changes do not recreate the renderer');
const summary = renderCostPolicySummary({ displaySettings: { waterColumn: { qualityProfile: 'balanced' } } });
assert.equal(summary.ownsSimulationState, false);
assert.equal(summary.changesOfficialBrowserScoring, false);
console.log(JSON.stringify({ ok: true, summary }));
