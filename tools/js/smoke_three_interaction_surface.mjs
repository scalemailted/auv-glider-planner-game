import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createThreeMissionHitTestContext } from '../../src/game/three/ThreeMissionHitTest.js';

const rendererSource = readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const hitSource = readFileSync('src/game/three/ThreeMissionHitTest.js', 'utf8');

assert.match(rendererSource, /function createInteractionSurface\(\)/, 'renderer must create one logical interaction surface.');
assert.match(rendererSource, /new THREE\.PlaneGeometry\(1, 1, 1, 1\)/, 'interaction surface must be a single plane, not per-cell meshes.');
assert.match(rendererSource, /mission-grid-interaction-surface/, 'interaction surface must have stable identity.');
assert.match(rendererSource, /surface\.scale\.set\(width, height, 1\)/, 'interaction surface must scale to the logical grid.');
assert.match(hitSource, /worldToGridCell/, 'hit testing must use shared world/grid coordinate transforms.');
assert.match(hitSource, /raycaster\.params\.Line\.threshold/, 'line selection threshold must be explicit for route/trajectory hits.');

const context = createThreeMissionHitTestContext({ renderer: { viewModel: { phase: 'planning' } } });
assert.deepEqual(context.priority.slice(0, 3), ['waypoint', 'planningMarker', 'glider']);

console.log('Three interaction surface smoke passed.');