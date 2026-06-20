import assert from 'node:assert/strict';
import fs from 'node:fs';

const renderer = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const terrainLayer = fs.readFileSync('src/game/three/layers/ThreeBathymetryTerrainLayer.js', 'utf8');
const meshGeometry = fs.readFileSync('src/core/rendering/BathymetryMeshGeometry.js', 'utf8');

assert.match(renderer, /shouldUpdate\('bathymetry'\)/, 'terrain update remains gated by bathymetry dirty category');
assert.match(renderer, /lastBathymetryMeshGeometry/, 'renderer exposes cached terrain geometry summary');
assert.match(terrainLayer, /geometrySignature/, 'terrain layer keeps stable geometry signature');
assert.match(terrainLayer, /terrainBuildCount/, 'terrain layer exposes build counter');
assert.match(meshGeometry, /indices\.push/, 'terrain mesh is indexed');
assert.doesNotMatch(renderer, /for \(let y = 0; y < viewModel\.grid\?\.height[\s\S]*makeBoxCell/, 'mission bathymetry no longer renders one box per cell');
console.log('audit_bathymetry_performance_boundaries: ok');
