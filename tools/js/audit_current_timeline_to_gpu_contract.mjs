import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const presentation = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');
const volumetric = readFileSync('src/core/rendering/VolumetricMissionWorldViewModel.js', 'utf8');
const renderer = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const glyph = readFileSync('src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js', 'utf8');
const auditDoc = readFileSync('docs/flow_r2a_5_2_timeline_to_gpu_audit.md', 'utf8');
const e2e = readFileSync('tests/e2e/flow_r2a_5_2_timeline_to_gpu.spec.js', 'utf8');

assert.match(presentation, /resolveCurrentPresentationTimeSeconds/, 'shared presentation state resolves canonical current presentation time');
assert.match(presentation, /currentSourceTimeFrameSignature/, 'shared presentation state exposes source time frame signature');
assert.match(presentation, /roundForSignature\(resolveCurrentPresentationTimeSeconds\(viewModel\)\)/, 'presentation cache signature includes resolved current time');
assert.match(volumetric, /activeTimeSeconds:\s*currentPresentationTimeSeconds/, 'volumetric explorer is built at current presentation time');
assert.match(renderer, /resolveCurrentPresentationTimeSeconds\(viewModel\)/, 'Three renderer current signature includes resolved current time');
assert.match(renderer, /currentSourceTimeFrameSignature\(viewModel\)/, 'Three renderer current signature includes source frame signature');
assert.match(glyph, /currentGlyphPresentationFingerprint/, 'glyph layer fingerprints current presentation data');
assert.match(glyph, /currentDataUploadSkipped/, 'glyph layer reports skipped uploads for unchanged current data');
assert.match(glyph, /currentDirectionAttributeVersion/, 'glyph layer exposes direction attribute version diagnostics');
assert.match(glyph, /currentVectorDensityProfile/, 'glyph layer uses explicit density profiles');
assert.match(glyph, /currentSampleConservationCheck/, 'glyph layer reports sample conservation diagnostics');
assert.doesNotMatch(glyph, /new\s+THREE\.Mesh\s*\([^)]*current/i, 'current vectors are not rendered as per-vector meshes');
assert.match(auditDoc, /Three\.js only visualizes canonical current samples/, 'audit doc records presentation-only boundary');

console.log('audit_current_timeline_to_gpu_contract: ok');