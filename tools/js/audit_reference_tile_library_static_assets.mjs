import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  normalizeReferenceTileLibraryManifest,
  validateReferenceTileLibraryStaticSafety
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';

const ROOT = process.cwd();
const manifest = await readJson(REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH);
const manifestText = await fs.readFile(resolveAsset(REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH), 'utf8');
const library = normalizeReferenceTileLibraryManifest(manifest);
const safety = validateReferenceTileLibraryStaticSafety(manifest);

assert.equal(library.artifactType, 'anchor.reference-bathymetry-tile-library', 'tile-library manifest type');
assert.equal(library.hiddenTruthExposed, false, 'tile library does not expose hidden truth');
assert.equal(library.externalRuntimeFetchRequired, false, 'tile library does not require runtime external fetch');
assert.equal(library.localAbsolutePathsIncluded, false, 'tile library does not mark local absolute paths');
assert.equal(library.rawExternalDataPathsIncluded, false, 'tile library does not mark raw external paths');
assert.equal(safety.ok, true, `tile library static safety failed: ${JSON.stringify(safety)}`);
assert.doesNotMatch(manifestText, /external_data|[A-Za-z]:\\|\/Users\//, 'manifest has no raw/local paths');
assert.doesNotMatch(manifestText, /"hiddenTruthExposed"\s*:\s*true/, 'manifest has no hidden truth true flag');
assert.doesNotMatch(manifestText, /https?:\/\/[^"'\s]*(?:noaa|gebco|ngdc|ncei)/i, 'manifest has no runtime NOAA/GEBCO URL');

const staged = library.tileSets.filter((tileSet) => tileSet.staged);
assert.ok(staged.length >= 1, 'at least one staged tile set exists');
assert.ok(library.tileSets.some((tileSet) => tileSet.coverageRole === 'requestOnly'), 'request-only regions are represented honestly');

for (const tileSet of library.tileSets) {
  assert.equal(tileSet.hiddenTruthExposed, false, `${tileSet.tileSetId} hidden truth flag`);
  assert.equal(tileSet.externalRuntimeFetchRequired, false, `${tileSet.tileSetId} runtime external fetch flag`);
  if (!tileSet.staged) continue;
  assertSafeAssetPath(tileSet.rasterTiles?.path, `${tileSet.tileSetId} raster path`);
  assert.ok(await exists(tileSet.rasterTiles.path), `${tileSet.tileSetId} raster artifact exists`);
  assertSafeAssetPath(tileSet.metadataPath, `${tileSet.tileSetId} metadata path`);
  assert.ok(await exists(tileSet.metadataPath), `${tileSet.tileSetId} metadata artifact exists`);
  const rasterText = await fs.readFile(resolveAsset(tileSet.rasterTiles.path), 'utf8');
  const raster = JSON.parse(rasterText);
  assert.equal(raster.artifactType, 'anchor.reference-bathymetry-raster', `${tileSet.tileSetId} raster type`);
  assert.equal(raster.claimBoundary?.hiddenTruthExposed, false, `${tileSet.tileSetId} raster no hidden truth`);
  assert.equal(raster.claimBoundary?.currentField4DGenerated, false, `${tileSet.tileSetId} raster does not claim currents`);
  assert.equal(raster.claimBoundary?.scalarField4DGenerated, false, `${tileSet.tileSetId} raster does not claim scalars`);
  assert.doesNotMatch(rasterText, /external_data|[A-Za-z]:\\|\/Users\//, `${tileSet.tileSetId} raster has no raw/local path`);
  for (const mesh of tileSet.meshLods) {
    assertSafeAssetPath(mesh.path, `${tileSet.tileSetId} ${mesh.lod} mesh path`);
    assert.ok(await exists(mesh.path), `${tileSet.tileSetId} ${mesh.lod} mesh exists`);
  }
}

console.log('audit_reference_tile_library_static_assets: ok', {
  digest: library.digest,
  tileSetCount: library.tileSets.length,
  stagedTileSetCount: staged.length,
  safety
});

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(resolveAsset(relativePath), 'utf8'));
}

function resolveAsset(relativePath) {
  return path.resolve(ROOT, String(relativePath).replaceAll('/', path.sep));
}

async function exists(relativePath) {
  try {
    await fs.access(resolveAsset(relativePath));
    return true;
  } catch {
    return false;
  }
}

function assertSafeAssetPath(value, label) {
  assert.ok(String(value ?? '').startsWith('assets/reference_bathymetry/'), `${label} is app-owned`);
  assert.doesNotMatch(String(value), /\.\.|:\/\/|external_data|^[A-Za-z]:\\|^\//, `${label} is a safe relative asset path`);
}

