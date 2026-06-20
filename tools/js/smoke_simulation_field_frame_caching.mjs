import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const renderer = await readFile('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
assert.match(renderer, /lastRenderedScalarFieldFrameId/, 'renderer tracks scalar field frame identity');
assert.match(renderer, /lastRenderedCurrentFieldFrameId/, 'renderer tracks current field frame identity');
assert.match(renderer, /scalarFieldFrameSkipCount/, 'renderer tracks scalar field frame skips');
assert.match(renderer, /currentFieldFrameSkipCount/, 'renderer tracks current field frame skips');
assert.match(renderer, /dirtyCategorySet\(viewModel\)/, 'renderer honors presentation dirty categories');
assert.doesNotMatch(renderer, /cameraGestureActive[\s\S]*fieldTextureUpdate[\s\S]*recordThreePerformanceEvent\(renderer\.performanceMonitor, 'fieldTextureUpdate'\)/, 'camera gesture path does not force texture updates');
console.log('PASS smoke_simulation_field_frame_caching');
