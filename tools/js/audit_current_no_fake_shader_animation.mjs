import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const glyph = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
assert.doesNotMatch(glyph, /ShaderMaterial|uniforms\s*:\s*\{[^}]*time|elapsedTime|uTime/i, 'current glyph layer must not fake motion with shader time uniforms');
assert.doesNotMatch(renderer, /Three\.Clock|shader-only|fake animation/i, 'renderer must not introduce fake current animation');
assert.match(glyph, /setMatrixAt/, 'glyph layer updates canonical instance matrices');
assert.match(glyph, /instanceMatrix\.needsUpdate\s*=\s*true/, 'glyph layer marks instance matrices for upload');
console.log('[audit_current_no_fake_shader_animation] PASS');