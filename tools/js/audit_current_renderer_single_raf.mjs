import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const glyph = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
assert.equal(/new\s+WebGLRenderer/g.test(glyph), false, 'current glyph layer must not create a renderer');
assert.equal(/requestAnimationFrame/g.test(glyph), false, 'current glyph layer must not create RAF loops');
assert.ok((renderer.match(/requestAnimationFrame/g) ?? []).length >= 1, 'mission renderer owns RAF scheduling');
assert.ok(renderer.includes('renderLoop(renderer'), 'mission renderer owns render loop');
console.log('[audit_current_renderer_single_raf] PASS');