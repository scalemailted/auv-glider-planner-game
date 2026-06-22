import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const glyph = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
assert.match(renderer, /createThreeInstancedCurrentGlyphLayer/);
assert.match(renderer, /hasVolumetricCurrentGlyphs/);
assert.doesNotMatch(glyph, /sampleGeneratedCurrent|VectorFieldPresets|CurrentFieldGenerator/);
assert.match(glyph, /rendererOwnsCurrent:\s*false/);
assert.match(glyph, /changesOfficialScoring:\s*false/);
console.log('[audit_current_renderer_authority] PASS');
