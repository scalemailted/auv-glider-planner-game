import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';

const presentation = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');
const explorer = readFileSync('src/core/rendering/WaterColumnLayerExplorerViewModel.js', 'utf8');
const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-cache-audit' });

assert.match(presentation, /timeInterpolationFraction/, 'current source-time signature includes interpolation fraction');
assert.match(explorer, /roundCache\(activeTimeSeconds\)/, 'current render-sample cache key includes active time');
assert.match(renderer, /currentPresentationCacheSignature\(viewModel\)/, 'renderer current field signature includes presentation cache signature');
assert.equal(probe.sameSourceBracket, true, 'audit compares two times inside one source bracket');
assert.notEqual(probe.firstCacheSignature, probe.laterCacheSignature, 'cache identity changes when interpolation fraction changes');
assert.equal(probe.cameraOnlySignatureStable, true, 'camera pose is excluded from current-data cache identity');
console.log('[audit_current_render_cache_time_fraction] PASS');