import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const glyph = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
const bridge = readFileSync('src/core/time/PlanningTimelineTimeBridge.js', 'utf8');
const currentState = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');
assert.match(renderer, /createThreeInstancedCurrentGlyphLayer/);
assert.match(renderer, /hasVolumetricCurrentGlyphs/);
assert.doesNotMatch(glyph, /sampleGeneratedCurrent|VectorFieldPresets|CurrentFieldGenerator/);
assert.match(glyph, /rendererOwnsCurrent:\s*false/);
assert.match(glyph, /changesOfficialScoring:\s*false/);
assert.match(bridge, /sourceTimeAuthority: phase === 'planning' \? 'visible-planning-timeline'/, 'Planning timeline bridge owns unit conversion before renderer sampling');
assert.match(currentState, /rendererOwnsCurrent:\s*false/, 'current presentation debug keeps renderer ownership boundary false');
assert.match(currentState, /directDebugTimeMutationUsed:\s*false/, 'current presentation debug states tests must not use direct debug time mutation');
console.log('[audit_current_renderer_authority] PASS');
