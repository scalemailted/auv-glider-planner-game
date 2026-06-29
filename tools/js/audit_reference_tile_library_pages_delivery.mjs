import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  normalizeReferenceTileLibraryManifest,
  validateReferenceTileLibraryStaticSafety
} from '../../src/core/editor/ReferenceBathymetryTileLibrary.js';

const ROOT = process.cwd();
const SITE_ROOT = path.join(ROOT, '_site');
const REQUIRED_STATIC_FILES = [
  REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
  'assets/reference_bathymetry/manifest.json',
  'src/core/editor/ReferenceBathymetryTileLibrary.js'
];
const RAW_SOURCE_EXTENSIONS = new Set(['.tif', '.tiff', '.nc', '.zip']);

await assertExists('_site/index.html');
const sourceManifest = await readJson(path.join(ROOT, REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH));
const siteManifest = await readJson(sitePath(REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH));
assert.equal(siteManifest.digest, sourceManifest.digest, '_site tile-library manifest digest matches source');

const library = normalizeReferenceTileLibraryManifest(siteManifest);
assert.equal(library.externalRuntimeFetchRequired, false, 'Pages tile library does not require external runtime fetch');
assert.equal(library.hiddenTruthExposed, false, 'Pages tile library does not expose hidden truth');
assert.equal(library.rawExternalDataPathsIncluded, false, 'Pages tile library has no raw external-data paths');
assert.equal(library.localAbsolutePathsIncluded, false, 'Pages tile library has no local absolute paths');
assert.equal(library.staticAssetSafety.ok, true, `Pages tile library safety failed: ${JSON.stringify(library.staticAssetSafety)}`);

const deliveredRuntimePaths = new Set(REQUIRED_STATIC_FILES);
if (library.globalOverview?.overviewPath) deliveredRuntimePaths.add(library.globalOverview.overviewPath);
if (library.globalOverview?.previewPath) deliveredRuntimePaths.add(library.globalOverview.previewPath);

for (const tileSet of library.tileSets) {
  if (!tileSet.staged) continue;
  if (tileSet.metadataPath) deliveredRuntimePaths.add(tileSet.metadataPath);
  if (tileSet.rasterTiles?.path) deliveredRuntimePaths.add(tileSet.rasterTiles.path);
  for (const mesh of tileSet.meshLods ?? []) {
    if (mesh.path) deliveredRuntimePaths.add(mesh.path);
    assert.equal(mesh.isAuthoritativeForSimulation, false, `${tileSet.tileSetId} ${mesh.lod} mesh is visualization-only`);
  }
}

for (const relativePath of deliveredRuntimePaths) {
  assertSafeRuntimePath(relativePath);
  await assertExists(path.join('_site', relativePath));
}

const siteFiles = await walk(SITE_ROOT);
const rawDelivered = siteFiles
  .map((file) => path.relative(SITE_ROOT, file))
  .filter((relativePath) => RAW_SOURCE_EXTENSIONS.has(path.extname(relativePath).toLowerCase()));
assert.deepEqual(rawDelivered, [], 'Pages build must not deliver raw source bathymetry files');

const deliveredRuntimeText = await readRuntimeText(deliveredRuntimePaths);
assert.doesNotMatch(deliveredRuntimeText, /external_data[\\/]/i, 'Pages runtime tile assets must not expose external_data paths');
assert.doesNotMatch(deliveredRuntimeText, /[A-Za-z]:\\/i, 'Pages runtime tile assets must not expose local absolute paths');
assert.doesNotMatch(deliveredRuntimeText, /"hiddenTruthExposed"\s*:\s*true/i, 'Pages runtime tile assets must not expose hidden truth');
assert.doesNotMatch(deliveredRuntimeText, /https?:\/\/[^"'\s]*(?:noaa|gebco|ngdc|ncei)[^"'\s]*/i, 'Pages runtime tile assets must not require NOAA/GEBCO URLs');

const safety = validateReferenceTileLibraryStaticSafety(siteManifest);
assert.equal(safety.ok, true, `Pages manifest safety failed: ${JSON.stringify(safety)}`);

console.log('audit_reference_tile_library_pages_delivery: ok', {
  manifestPath: `_site/${REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH}`,
  digest: library.digest,
  deliveredRuntimePathCount: deliveredRuntimePaths.size,
  stagedTileSetCount: library.tileSets.filter((tileSet) => tileSet.staged).length,
  meshLodCount: library.tileSets.reduce((sum, tileSet) => sum + Number(tileSet.meshLods?.length ?? 0), 0),
  rawDeliveredCount: rawDelivered.length
});

async function readJson(fullPath) {
  return JSON.parse(await fs.readFile(fullPath, 'utf8'));
}

async function assertExists(relativePath) {
  await fs.access(path.join(ROOT, relativePath));
}

function sitePath(relativePath) {
  return path.join(SITE_ROOT, String(relativePath).replaceAll('/', path.sep));
}

function assertSafeRuntimePath(relativePath) {
  const value = String(relativePath ?? '');
  assert.ok(value.startsWith('assets/reference_bathymetry/') || value.startsWith('src/'), `${value} is an app-owned runtime path`);
  assert.doesNotMatch(value, /\.\.|:\/\/|external_data|^[A-Za-z]:\\|^\//, `${value} is a safe relative runtime path`);
}

async function readRuntimeText(paths) {
  const chunks = [];
  for (const relativePath of paths) {
    const filePath = sitePath(relativePath);
    if (path.extname(filePath).toLowerCase() === '.js' || path.extname(filePath).toLowerCase() === '.json') {
      chunks.push(await fs.readFile(filePath, 'utf8'));
    }
  }
  return chunks.join('\n');
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
