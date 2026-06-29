import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const scenePath = path.resolve(ROOT, 'src/game/phaser/scenes/EnvironmentStudioScene.js');
const source = await fs.readFile(scenePath, 'utf8');

assert.match(source, /referenceAtlasLayerCanvas/, 'atlas renderer has cached layer canvas helper');
assert.match(source, /buildReferenceAtlasLayerCanvas/, 'atlas renderer builds cache separately from viewport draw');
assert.match(source, /sampleReferenceOverviewRasterNormalized/, 'atlas renderer samples overview raster by normalized coordinates');
assert.match(source, /requestAnimationFrame/, 'atlas interaction preview is RAF-throttled');
assert.match(source, /passive:\s*false/, 'wheel listener is explicitly non-passive');
assert.match(source, /fullRasterRenderCount/, 'debug tracks full raster cache builds');
assert.match(source, /rasterRenderCount/, 'debug tracks displayed raster frames');
assert.match(source, /maxFrameMs/, 'debug tracks max frame duration');
assert.match(source, /longTaskThresholdMs:\s*500/, 'debug tracks 500ms long-task budget');

const drawSection = extractFunction(source, 'drawReferenceBathymetryCanvas');
assert.doesNotMatch(drawSection, /referenceBathymetryLayerColor/, 'viewport draw does not call expensive lon-lat layer sampler');
assert.doesNotMatch(drawSection, /for \(let y = 0; y < height/, 'viewport draw does not loop over every pixel');
assert.match(drawSection, /context\.drawImage/, 'viewport draw blits from cached canvas');
assert.match(drawSection, /drawReferenceSelectionOverlay/, 'viewport draw still renders live/selected boundary overlay');

const cacheBuildSection = extractFunction(source, 'buildReferenceAtlasLayerCanvas');
assert.match(cacheBuildSection, /for \(let y = 0; y < height/, 'full raster loop is isolated to cache build');
assert.doesNotMatch(cacheBuildSection, /referenceBathymetryLayerColor/, 'cache build avoids slow general layer color sampler');

console.log('audit_reference_atlas_interaction_performance: ok', {
  source: path.relative(ROOT, scenePath)
});

function extractFunction(text, name) {
  const start = text.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `function not found: ${name}`);
  const nextFunction = text.indexOf('\nfunction ', start + 1);
  return text.slice(start, nextFunction === -1 ? text.length : nextFunction);
}
