import assert from 'node:assert/strict';
import { createCurrentVisualizationBackendDescriptor, currentVisualizationBackendRoadmap } from '../../src/core/rendering/CurrentVisualizationBackendContract.js';

const implemented = createCurrentVisualizationBackendDescriptor('webglInstancedGlyphsV1');
const webgpu = createCurrentVisualizationBackendDescriptor('webgpuTracerAdvectionV1');
const roadmap = currentVisualizationBackendRoadmap();
assert.equal(implemented.implemented, true);
assert.equal(implemented.ownsCurrentAuthority, false);
assert.equal(webgpu.implemented, false);
assert.equal(roadmap.boundaries.oceanCurrentField4DRemainsCurrentAuthority, true);
assert.equal(roadmap.boundaries.webGpuDoesNotReplaceRegionalCurrentAuthority, true);
console.log('[audit_future_webgpu_boundary] PASS');
