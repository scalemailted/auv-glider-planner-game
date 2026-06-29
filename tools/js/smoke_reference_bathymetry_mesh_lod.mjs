import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const library = await readJson('assets/reference_bathymetry/tile-library-manifest.json');
const staged = library.tileSets.filter((tileSet) => tileSet.staged === true);

assert.ok(staged.length >= 1, 'staged tile sets exist');

for (const tileSet of staged) {
  assert.ok(tileSet.digests?.raster, `${tileSet.tileSetId} raster digest exists`);
  assert.ok(tileSet.meshLods.length >= 2, `${tileSet.tileSetId} has at least two mesh LODs`);
  for (const meshRef of tileSet.meshLods) {
    const mesh = await readJson(meshRef.path);
    assert.equal(mesh.artifactType, 'anchor.reference-bathymetry-mesh-lod', `${tileSet.tileSetId} ${meshRef.lod} mesh type`);
    assert.equal(mesh.derivedFromRasterDigest, tileSet.digests.raster, `${tileSet.tileSetId} ${meshRef.lod} derives from raster digest`);
    assert.equal(mesh.isAuthoritativeForSimulation, false, `${tileSet.tileSetId} ${meshRef.lod} is non-authoritative`);
    assert.equal(mesh.claimBoundary?.rasterGridAuthoritative, true, `${tileSet.tileSetId} ${meshRef.lod} declares raster authority`);
    assert.ok(Number.isFinite(Number(mesh.vertexCount)) && mesh.vertexCount > 0, `${tileSet.tileSetId} ${meshRef.lod} vertex count`);
    assert.ok(Number.isFinite(Number(mesh.triangleCount)) && mesh.triangleCount > 0, `${tileSet.tileSetId} ${meshRef.lod} triangle count`);
    assert.ok(mesh.vertexCount <= 128 * 96, `${tileSet.tileSetId} ${meshRef.lod} vertex count within Alpha budget`);
    assert.ok(mesh.triangleCount <= 2 * (128 - 1) * (96 - 1), `${tileSet.tileSetId} ${meshRef.lod} triangle count within Alpha budget`);
    assert.ok(Number.isFinite(Number(mesh.depthSummary?.max)), `${tileSet.tileSetId} ${meshRef.lod} finite depth max`);
    assert.ok(Number.isFinite(Number(mesh.depthSummary?.mean)), `${tileSet.tileSetId} ${meshRef.lod} finite depth mean`);
    assert.ok(Number.isFinite(Number(mesh.approximationSummary?.meanAbsElevationErrorMeters)), `${tileSet.tileSetId} ${meshRef.lod} approximation mean error`);
    assert.ok(Number.isFinite(Number(mesh.approximationSummary?.maxAbsElevationErrorMeters)), `${tileSet.tileSetId} ${meshRef.lod} approximation max error`);
    assert.ok(Array.isArray(mesh.vertices) && mesh.vertices.length === mesh.vertexCount, `${tileSet.tileSetId} ${meshRef.lod} vertices are present`);
    assert.ok(Array.isArray(mesh.triangles) && mesh.triangles.length === mesh.triangleCount, `${tileSet.tileSetId} ${meshRef.lod} triangles are present`);
    for (const vertex of mesh.vertices.slice(0, 10)) {
      assert.equal(vertex.length, 4, `${tileSet.tileSetId} ${meshRef.lod} vertex format`);
      assert.ok(vertex.every((value) => Number.isFinite(Number(value))), `${tileSet.tileSetId} ${meshRef.lod} vertex values finite`);
    }
  }
}

console.log('smoke_reference_bathymetry_mesh_lod: ok', {
  stagedTileSetCount: staged.length,
  meshCount: staged.reduce((sum, tileSet) => sum + tileSet.meshLods.length, 0)
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.resolve(ROOT, String(relativePath).replaceAll('/', path.sep)), 'utf8'));
}

