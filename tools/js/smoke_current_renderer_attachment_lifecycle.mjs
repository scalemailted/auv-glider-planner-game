import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const layer = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');

assert.match(renderer, /createThreeInstancedCurrentGlyphLayer/, 'renderer creates the shared current glyph layer');
assert.match(renderer, /updateThreeInstancedCurrentGlyphLayer/, 'renderer updates the current glyph layer from view models');
assert.match(renderer, /disposeThreeInstancedCurrentGlyphLayer/, 'renderer disposes current glyph resources on teardown');
assert.match(renderer, /currentPresentationCacheSignature\(viewModel\)/, 'renderer current cache includes presentation state');
assert.equal(/new\s+WebGLRenderer/.test(layer), false, 'current glyph layer does not create its own renderer');
assert.equal(/requestAnimationFrame/.test(layer), false, 'current glyph layer does not own an RAF loop');
assert.match(layer, /InstancedMesh/, 'current glyph layer remains GPU-instanced');
assert.match(layer, /normalizeRendererCurrentDisplayMode/, 'current glyph layer uses shared renderer display-mode normalization');

console.log('smoke_current_renderer_attachment_lifecycle: ok');
