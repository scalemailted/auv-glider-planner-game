import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTimelineProbe } from './flow_runtime_r1_current_helpers.mjs';

const glyph = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const probe = buildTimelineProbe({ seed: 'flow-runtime-r1-gpu-audit' });

assert.match(glyph, /DynamicDrawUsage/, 'glyph instance buffers use dynamic draw usage');
assert.match(glyph, /currentDirectionBufferUploadCount/, 'glyph summary exposes direction upload count');
assert.match(glyph, /currentMatrixBufferUploadCount/, 'glyph summary exposes matrix upload count');
assert.match(renderer, /currentDirectionBufferUploadCount/, 'renderer summary forwards direction upload count');
assert.ok(probe.later.currentDirectionBufferUploadCount > probe.repeated.currentDirectionBufferUploadCount, 'time update increments direction upload count');
assert.ok(probe.later.currentMatrixBufferUploadCount > probe.repeated.currentMatrixBufferUploadCount, 'time update increments matrix upload count');
console.log('[audit_current_gpu_attribute_uploads] PASS');