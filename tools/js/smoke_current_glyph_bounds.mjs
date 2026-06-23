import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMissionWorldCoordinateTransform } from '../../src/core/rendering/MissionWorldCoordinates.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { makeCurrentExplorerFixture } from './current_cube_test_helpers.mjs';

const grid = { width: 6, height: 5 };
const coordinateSystem = createMissionWorldCoordinateTransform({ grid });
const explorer = makeCurrentExplorerFixture({ activeLayerId: 'thermocline' });
const layer = createThreeInstancedCurrentGlyphLayer();
const viewModel = { grid, coordinateSystem, waterColumnExplorer: explorer, waterColumn: { currentDisplayMode: 'activeSlice', currentVectorDensity: 'balanced' } };
updateThreeInstancedCurrentGlyphLayer(layer, viewModel);
const summary = threeInstancedCurrentGlyphLayerSummary(layer, viewModel);
const min = summary.glyphBoundsMinimum;
const max = summary.glyphBoundsMaximum;
const radius = Number(summary.glyphBoundsRadius);

assert.ok(Array.isArray(min) && min.length === 3, 'bounds minimum is present');
assert.ok(Array.isArray(max) && max.length === 3, 'bounds maximum is present');
assert.ok([...min, ...max, radius].every(Number.isFinite), 'bounds are finite');
assert.equal(max[0] >= -grid.width && min[0] <= grid.width, true, 'bounds overlap mission X domain');
assert.equal(max[2] >= -grid.height && min[2] <= grid.height, true, 'bounds overlap mission Z domain');
assert.equal(radius > 0, true, 'bounds radius is positive');

const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
camera.position.set(0, 8, 9);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld(true);
camera.updateProjectionMatrix();
const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
const sphere = new THREE.Sphere(new THREE.Vector3(...summary.glyphBoundsCenter), radius);
assert.equal(frustum.intersectsSphere(sphere), true, 'representative camera frustum can see glyph bounds');

console.log('smoke_current_glyph_bounds: ok', { min, max, radius });
