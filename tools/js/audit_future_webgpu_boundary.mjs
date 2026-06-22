import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCurrentVisualizationBackendDescriptor, currentVisualizationBackendRoadmap, validateCurrentVisualizationBackendDescriptor } from '../../src/core/rendering/CurrentVisualizationBackendContract.js';

const descriptor = createCurrentVisualizationBackendDescriptor('webglInstancedGlyphsV1');
assert.equal(validateCurrentVisualizationBackendDescriptor(descriptor).valid, true);
const webgpu = createCurrentVisualizationBackendDescriptor('webgpuComputeTracerV1');
assert.equal(webgpu.implemented, false);
assert.equal(webgpu.reserved, true);
const roadmap = currentVisualizationBackendRoadmap();
assert.equal(roadmap.boundaries.webGpuDoesNotReplaceRegionalCurrentAuthority, true);
assert.equal(roadmap.boundaries.mlsMpmAndSphAreNotHycom, true);
const contract = readFileSync('src/core/rendering/CurrentVisualizationBackendContract.js', 'utf8');
assert.doesNotMatch(contract, /from\s+['\"]three['\"]|GPUDevice|navigator\.gpu/);
console.log('[audit_future_webgpu_boundary] PASS');
