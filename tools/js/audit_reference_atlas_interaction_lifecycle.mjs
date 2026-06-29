import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const scenePath = path.resolve(ROOT, 'src/game/phaser/scenes/EnvironmentStudioScene.js');
const source = await fs.readFile(scenePath, 'utf8');

assert.match(source, /cleanupReferenceAtlasPreviewBinding\(\)/, 'scene exposes reference atlas listener cleanup');
assert.match(source, /this\.cleanupReferenceAtlasPreviewBinding\(\);\s*this\.clearObjects\(\);/s, 'shutdown cleans atlas listeners before scene cleanup');
assert.match(source, /destroyPreviewHost\(\)\s*{\s*this\.cleanupReferenceAtlasPreviewBinding\(\);/s, 'preview host cleanup aborts atlas listeners');
assert.match(source, /new AbortController\(\)/, 'atlas preview listeners use AbortController');
assert.match(source, /signal/, 'atlas preview listeners are registered with abort signal');
assert.match(source, /setPointerCapture/, 'atlas pointer drag captures the active pointer');
assert.match(source, /releasePointerCapture/, 'atlas pointer drag releases pointer capture');
assert.match(source, /listenerAttachCount/, 'debug tracks listener attachment count');
assert.match(source, /listenerDetachCount/, 'debug tracks listener detach count');
assert.match(source, /activeListenerCount/, 'debug tracks active listener count');
assert.match(source, /ANCHOR_REFERENCE_ATLAS_PERF_DEBUG/, 'scene publishes compact atlas perf debug');
assert.match(source, /hiddenTruthExposed:\s*false/, 'debug explicitly keeps hidden truth false');
assert.match(source, /rawExternalDataPathExposed:\s*false/, 'debug explicitly keeps raw external path exposure false');

const pointerMoveSection = extractSection(source, "addListener(canvas, 'pointermove'", "const finishPointer");
assert.doesNotMatch(pointerMoveSection, /scene\.render\(\)/, 'pointermove does not call full scene render');
assert.doesNotMatch(pointerMoveSection, /environmentStudioDebugPayload/, 'pointermove does not rebuild full debug payload');

const wheelSection = extractSection(source, "addListener(canvas, 'wheel'", "}, { passive: false })");
assert.match(wheelSection, /event\.preventDefault\(\)/, 'wheel handler prevents page scrolling');
assert.doesNotMatch(wheelSection.replace(/setTimeout\?\.\(\(\) =>[\s\S]*$/, ''), /scene\.render\(\)/, 'wheel preview path does not render synchronously');

console.log('audit_reference_atlas_interaction_lifecycle: ok', {
  source: path.relative(ROOT, scenePath)
});

function extractSection(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  assert.notEqual(start, -1, `section start not found: ${startNeedle}`);
  const end = text.indexOf(endNeedle, start);
  assert.notEqual(end, -1, `section end not found: ${endNeedle}`);
  return text.slice(start, end);
}
