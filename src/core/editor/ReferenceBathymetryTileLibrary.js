export const REFERENCE_BATHYMETRY_TILE_LIBRARY_TYPE = 'anchor.reference-bathymetry-tile-library';
export const REFERENCE_BATHYMETRY_TILE_LIBRARY_VERSION = 'reference-tile-library-r1a';
export const REFERENCE_BATHYMETRY_TILE_SET_TYPE = 'anchor.reference-bathymetry-tile-set';
export const REFERENCE_BATHYMETRY_MULTITILE_TILE_SET_TYPE = 'anchor.reference-bathymetry-multitile-tileset';
export const REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH = 'assets/reference_bathymetry/tile-library-manifest.json';

let cachedTileLibrary = null;

export async function loadReferenceTileLibrary(options = {}) {
  const path = options.path ?? REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH;
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  const manifest = await fetchJson(path);
  cachedTileLibrary = normalizeReferenceTileLibraryManifest(manifest, { path });
  return cachedTileLibrary;
}

export function normalizeReferenceTileLibraryManifest(input = null, options = {}) {
  const manifest = input && typeof input === 'object' ? input : {};
  const tileSets = Array.isArray(manifest.tileSets)
    ? manifest.tileSets.map(normalizeTileSet).filter((tileSet) => tileSet.tileSetId)
    : [];
  const safety = validateReferenceTileLibraryStaticSafety(manifest);
  return {
    artifactType: manifest.artifactType ?? REFERENCE_BATHYMETRY_TILE_LIBRARY_TYPE,
    artifactVersion: String(manifest.artifactVersion ?? '1.0.0'),
    libraryVersion: String(manifest.libraryVersion ?? REFERENCE_BATHYMETRY_TILE_LIBRARY_VERSION),
    path: options.path ?? REFERENCE_BATHYMETRY_TILE_LIBRARY_MANIFEST_PATH,
    sourceDatasets: Array.isArray(manifest.sourceDatasets) ? manifest.sourceDatasets.slice() : [],
    claimBoundary: {
      ...(manifest.claimBoundary ?? {}),
      appHostedStaticAssets: true,
      browserDownloadsNoaaOrGebcoData: false,
      hiddenTruthExposed: false
    },
    globalOverview: manifest.globalOverview ?? null,
    tileSets,
    coverageSummary: manifest.coverageSummary ?? coverageSummaryForTileSets(tileSets),
    provenance: manifest.provenance ?? null,
    hiddenTruthExposed: manifest.hiddenTruthExposed === true ? true : false,
    localAbsolutePathsIncluded: manifest.localAbsolutePathsIncluded === true ? true : false,
    rawExternalDataPathsIncluded: manifest.rawExternalDataPathsIncluded === true ? true : false,
    externalRuntimeFetchRequired: manifest.externalRuntimeFetchRequired === true ? true : false,
    digest: manifest.digest ?? null,
    staticAssetSafety: safety
  };
}

export function findTileSetsForBounds(boundsInput = {}, libraryInput = cachedTileLibrary, options = {}) {
  const library = normalizeReferenceTileLibraryManifest(libraryInput);
  const bounds = normalizeBounds(boundsInput);
  const includeRequestOnly = options.includeRequestOnly === true;
  return library.tileSets
    .filter((tileSet) => includeRequestOnly || isStagedTileSet(tileSet))
    .map((tileSet) => ({
      ...tileSet,
      overlapFraction: boundsOverlapFraction(bounds, tileSet.bounds),
      containsSelection: boundsContainsBounds(tileSet.bounds, bounds)
    }))
    .filter((tileSet) => tileSet.containsSelection || tileSet.overlapFraction > 0)
    .sort(tileSetSort);
}

export function selectBestTileSetForBounds(boundsInput = {}, libraryInput = cachedTileLibrary, options = {}) {
  return findTileSetsForBounds(boundsInput, libraryInput, options)[0] ?? null;
}

export async function loadTileSet(tileSetId, options = {}) {
  const library = options.library
    ? normalizeReferenceTileLibraryManifest(options.library)
    : (cachedTileLibrary ?? await loadReferenceTileLibrary(options));
  const tileSet = library.tileSets.find((entry) => entry.tileSetId === tileSetId);
  if (!tileSet) throw new Error(`Reference bathymetry tile set ${tileSetId} is not registered.`);
  if (!isStagedTileSet(tileSet)) {
    throw new Error(`Reference bathymetry tile set ${tileSetId} is request-only and has no staged browser raster.`);
  }
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  const metadata = tileSet.metadataPath ? await fetchJson(tileSet.metadataPath) : tileSet;
  const rasterArtifact = tileSet.rasterTiles?.path ? await fetchJson(tileSet.rasterTiles.path) : null;
  return {
    ...tileSet,
    metadata,
    rasterArtifact,
    staticAssetSafety: validateReferenceTileLibraryStaticSafety({
      tileSets: [tileSet],
      hiddenTruthExposed: false,
      externalRuntimeFetchRequired: false
    })
  };
}

export async function loadMeshLod(tileSetId, lod = 'coarse', options = {}) {
  const library = options.library
    ? normalizeReferenceTileLibraryManifest(options.library)
    : (cachedTileLibrary ?? await loadReferenceTileLibrary(options));
  const tileSet = library.tileSets.find((entry) => entry.tileSetId === tileSetId);
  if (!tileSet) throw new Error(`Reference bathymetry tile set ${tileSetId} is not registered.`);
  const mesh = tileSet.meshLods.find((entry) => entry.lod === lod || entry.id === lod);
  if (!mesh?.path) throw new Error(`Reference bathymetry tile set ${tileSetId} does not expose mesh LOD ${lod}.`);
  const fetchJson = options.fetchJson ?? defaultFetchJson;
  return fetchJson(mesh.path);
}

export function referenceTileLibraryFixtures(libraryInput = cachedTileLibrary) {
  const library = normalizeReferenceTileLibraryManifest(libraryInput);
  return library.tileSets
    .filter(isStagedTileSet)
    .map((tileSet) => ({
      fixtureId: tileSet.tileSetId,
      label: tileSet.label,
      role: tileSet.role === 'missionReadyTileSet' ? 'missionReadyPatch' : 'lowResolutionReferencePatch',
      sourceDataset: tileSet.sourceDataset,
      provider: tileSet.provider,
      sourceResolution: tileSet.sourceResolution,
      sourceKey: tileSet.sourceVariant,
      sourceVariant: tileSet.sourceVariant,
      actualRasterResolutionArcSeconds: tileSet.actualRasterResolutionArcSeconds,
      columns: tileSet.rasterTiles?.columns ?? null,
      rows: tileSet.rasterTiles?.rows ?? null,
      bounds: tileSet.bounds,
      rasterPath: tileSet.rasterTiles?.path ?? null,
      digest: tileSet.digests?.raster ?? tileSet.digest ?? null,
      tags: Array.isArray(tileSet.tags) ? tileSet.tags.slice() : [],
      tileSetId: tileSet.tileSetId,
      tileLibraryTileSetId: tileSet.tileSetId,
      tileLibraryRole: tileSet.role,
      coverageRole: tileSet.coverageRole,
      recommendedUse: tileSet.recommendedUse,
      meshLods: tileSet.meshLods.map((entry) => ({ ...entry }))
    }));
}

export function referenceTileLibraryDebugState(libraryInput = cachedTileLibrary) {
  const library = normalizeReferenceTileLibraryManifest(libraryInput);
  return {
    loaded: Boolean(library.digest || library.tileSets.length),
    artifactType: library.artifactType,
    libraryVersion: library.libraryVersion,
    digest: library.digest,
    tileSetCount: library.tileSets.length,
    stagedTileSetCount: library.tileSets.filter(isStagedTileSet).length,
    missionReadyTileSetCount: library.tileSets.filter((entry) => isStagedTileSet(entry) && entry.role === 'missionReadyTileSet').length,
    fallbackTileSetCount: library.tileSets.filter((entry) => isStagedTileSet(entry) && entry.role === 'lowResolutionFallbackTileSet').length,
    requestOnlyTileSetCount: library.tileSets.filter((entry) => entry.coverageRole === 'requestOnly').length,
    staticAssetSafety: library.staticAssetSafety,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false,
    externalRuntimeFetchRequired: false
  };
}

export function validateReferenceTileLibraryStaticSafety(input = {}) {
  const paths = collectAssetPaths(input);
  const unsafePaths = paths.filter((entry) => !isSafeAppAssetPath(entry.value));
  const serialized = JSON.stringify(input ?? {});
  const rawPathMatches = serialized.match(/external_data|[A-Za-z]:\\|\/Users\//g) ?? [];
  const externalUrlMatches = serialized.match(/https?:\/\/[^"'\s]*(?:noaa|gebco|ngdc|ncei)[^"'\s]*/gi) ?? [];
  const hiddenTruthExposed = /"hiddenTruthExposed"\s*:\s*true/.test(serialized);
  const externalRuntimeFetchRequired = /"externalRuntimeFetchRequired"\s*:\s*true/.test(serialized);
  return {
    ok: unsafePaths.length === 0
      && rawPathMatches.length === 0
      && externalUrlMatches.length === 0
      && !hiddenTruthExposed
      && !externalRuntimeFetchRequired,
    assetPathCount: paths.length,
    unsafePathCount: unsafePaths.length,
    unsafePaths,
    rawExternalPathCount: rawPathMatches.length,
    externalRuntimeUrlCount: externalUrlMatches.length,
    hiddenTruthExposed,
    externalRuntimeFetchRequired
  };
}

function normalizeTileSet(input = {}) {
  const rasterKind = input.rasterTiles?.kind ?? (Array.isArray(input.rasterTiles?.tiles) ? 'multiRasterJson' : 'singleRasterJson');
  const tileGrid = input.tileGrid && typeof input.tileGrid === 'object'
    ? {
        rows: finiteOrNull(input.tileGrid.rows),
        columns: finiteOrNull(input.tileGrid.columns),
        tileCount: finiteOrNull(input.tileGrid.tileCount),
        maxTileRows: finiteOrNull(input.tileGrid.maxTileRows),
        maxTileColumns: finiteOrNull(input.tileGrid.maxTileColumns)
      }
    : null;
  return {
    artifactType: input.artifactType
      ?? (input.budgetClass === 'multiTileStaged' || rasterKind === 'multiRasterJson'
        ? REFERENCE_BATHYMETRY_MULTITILE_TILE_SET_TYPE
        : REFERENCE_BATHYMETRY_TILE_SET_TYPE),
    artifactVersion: String(input.artifactVersion ?? '1.0.0'),
    tileSetId: String(input.tileSetId ?? input.id ?? ''),
    label: String(input.label ?? input.tileSetId ?? input.id ?? 'Reference Tile Set'),
    role: String(input.role ?? 'previewOnlyTileSet'),
    staged: input.staged !== false && Boolean(input.rasterTiles?.path),
    sourceDataset: input.sourceDataset ?? 'ETOPO_2022',
    provider: input.provider ?? 'NOAA NCEI',
    sourceVariant: input.sourceVariant ?? null,
    sourceResolution: input.sourceResolution ?? null,
    actualRasterResolutionArcSeconds: finiteOrNull(input.actualRasterResolutionArcSeconds),
    bounds: normalizeBounds(input.bounds),
    rasterTiles: input.rasterTiles ? {
      kind: rasterKind,
      path: input.rasterTiles.path ?? null,
      rows: finiteOrNull(input.rasterTiles.rows),
      columns: finiteOrNull(input.rasterTiles.columns),
      digest: input.rasterTiles.digest ?? null,
      tiles: Array.isArray(input.rasterTiles.tiles)
        ? input.rasterTiles.tiles.map((entry) => ({
            tileId: String(entry.tileId ?? entry.id ?? ''),
            path: entry.path ?? null,
            bounds: normalizeBounds(entry.bounds ?? {}),
            rows: finiteOrNull(entry.rows),
            columns: finiteOrNull(entry.columns),
            digest: entry.digest ?? null
          }))
        : []
    } : null,
    tileGrid,
    overviewMesh: input.overviewMesh ? {
      path: input.overviewMesh.path ?? null,
      digest: input.overviewMesh.digest ?? null,
      meshRows: finiteOrNull(input.overviewMesh.meshRows),
      meshColumns: finiteOrNull(input.overviewMesh.meshColumns),
      vertexCount: finiteOrNull(input.overviewMesh.vertexCount),
      triangleCount: finiteOrNull(input.overviewMesh.triangleCount),
      isAuthoritativeForSimulation: input.overviewMesh.isAuthoritativeForSimulation === true ? true : false
    } : null,
    meshLods: Array.isArray(input.meshLods) ? input.meshLods.map((entry) => ({
      lod: String(entry.lod ?? entry.id ?? 'coarse'),
      path: entry.path ?? null,
      digest: entry.digest ?? null,
      meshRows: finiteOrNull(entry.meshRows),
      meshColumns: finiteOrNull(entry.meshColumns),
      vertexCount: finiteOrNull(entry.vertexCount),
      triangleCount: finiteOrNull(entry.triangleCount),
      isAuthoritativeForSimulation: entry.isAuthoritativeForSimulation === true ? true : false
    })) : [],
    coverageRole: input.coverageRole ?? 'requestOnly',
    recommendedUse: input.recommendedUse ?? null,
    budgetClass: input.budgetClass ?? null,
    requiredSourceTiles: Array.isArray(input.requiredSourceTiles) ? input.requiredSourceTiles.map((entry) => ({ ...entry })) : [],
    offlineCommands: input.offlineCommands ?? null,
    metadataPath: input.metadataPath ?? null,
    digests: input.digests ?? {},
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    artifactStatus: input.artifactStatus ?? (input.rasterTiles?.path ? 'STAGED' : 'REQUIRES_REGENERATION'),
    hiddenTruthExposed: input.hiddenTruthExposed === true ? true : false,
    externalRuntimeFetchRequired: input.externalRuntimeFetchRequired === true ? true : false,
    claimBoundary: {
      ...(input.claimBoundary ?? {}),
      browserDownloadsPublicSourceData: false,
      hiddenTruthExposed: false
    },
    digest: input.digest ?? null
  };
}

function isStagedTileSet(tileSet = {}) {
  return tileSet.staged === true
    && tileSet.coverageRole !== 'requestOnly'
    && Boolean(tileSet.rasterTiles?.path)
    && tileSet.externalRuntimeFetchRequired !== true
    && tileSet.hiddenTruthExposed !== true;
}

function tileSetSort(a = {}, b = {}) {
  if (a.containsSelection !== b.containsSelection) return a.containsSelection ? -1 : 1;
  const roleDelta = tileSetRoleRank(a.role) - tileSetRoleRank(b.role);
  if (roleDelta !== 0) return roleDelta;
  const resolutionDelta = Number(a.actualRasterResolutionArcSeconds ?? 999999) - Number(b.actualRasterResolutionArcSeconds ?? 999999);
  if (resolutionDelta !== 0) return resolutionDelta;
  return Number(b.overlapFraction ?? 0) - Number(a.overlapFraction ?? 0);
}

function tileSetRoleRank(role) {
  if (role === 'missionReadyTileSet') return 0;
  if (role === 'lowResolutionFallbackTileSet') return 1;
  return 2;
}

function coverageSummaryForTileSets(tileSets = []) {
  return {
    tileSetCount: tileSets.length,
    stagedTileSetCount: tileSets.filter(isStagedTileSet).length,
    requestOnlyTileSetCount: tileSets.filter((entry) => entry.coverageRole === 'requestOnly').length
  };
}

function collectAssetPaths(input = {}, out = [], key = '') {
  if (Array.isArray(input)) {
    input.forEach((entry, index) => collectAssetPaths(entry, out, `${key}[${index}]`));
    return out;
  }
  if (!input || typeof input !== 'object') return out;
  for (const [entryKey, value] of Object.entries(input)) {
    const nextKey = key ? `${key}.${entryKey}` : entryKey;
    if (typeof value === 'string' && isAssetPathKey(entryKey)) {
      out.push({ key: nextKey, value });
    } else if (value && typeof value === 'object') {
      collectAssetPaths(value, out, nextKey);
    }
  }
  return out;
}

function isAssetPathKey(key = '') {
  return [
    'path',
    'rasterPath',
    'overviewPath',
    'previewPath',
    'metadataPath',
    'tileSetPath',
    'provenancePath'
  ].includes(key);
}

function isSafeAppAssetPath(value = '') {
  const path = String(value ?? '');
  return path.startsWith('assets/reference_bathymetry/')
    && !path.includes('..')
    && !path.includes('://')
    && !path.startsWith('/')
    && !/^[A-Za-z]:\\/.test(path)
    && !path.includes('external_data');
}

function normalizeBounds(input = {}) {
  const westLon = finiteOrNull(input.westLon ?? input.west ?? -180) ?? -180;
  const eastLon = finiteOrNull(input.eastLon ?? input.east ?? 180) ?? 180;
  const southLat = finiteOrNull(input.southLat ?? input.south ?? -90) ?? -90;
  const northLat = finiteOrNull(input.northLat ?? input.north ?? 90) ?? 90;
  return {
    westLon: round(Math.min(westLon, eastLon)),
    eastLon: round(Math.max(westLon, eastLon)),
    southLat: round(Math.min(southLat, northLat)),
    northLat: round(Math.max(southLat, northLat))
  };
}

function boundsContainsBounds(outer = {}, inner = {}) {
  return Number(outer.westLon) <= Number(inner.westLon)
    && Number(outer.eastLon) >= Number(inner.eastLon)
    && Number(outer.southLat) <= Number(inner.southLat)
    && Number(outer.northLat) >= Number(inner.northLat);
}

function boundsOverlapFraction(a = {}, b = {}) {
  const west = Math.max(Number(a.westLon), Number(b.westLon));
  const east = Math.min(Number(a.eastLon), Number(b.eastLon));
  const south = Math.max(Number(a.southLat), Number(b.southLat));
  const north = Math.min(Number(a.northLat), Number(b.northLat));
  const overlap = Math.max(0, east - west) * Math.max(0, north - south);
  const area = Math.max(0.000001, (Number(a.eastLon) - Number(a.westLon)) * (Number(a.northLat) - Number(a.southLat)));
  return round(overlap / area);
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

async function defaultFetchJson(path) {
  if (!globalThis.fetch) throw new Error('fetch is not available for ReferenceBathymetryTileLibrary.');
  if (!isSafeAppAssetPath(path)) throw new Error(`Unsafe reference bathymetry asset path: ${path}`);
  const response = await globalThis.fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Reference bathymetry tile library fetch failed for ${path}: HTTP ${response.status}.`);
  return response.json();
}
