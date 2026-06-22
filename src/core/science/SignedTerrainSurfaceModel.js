export const SIGNED_TERRAIN_SURFACE_MODEL_VERSION = 'signed-terrain-surface-model-world-r1-1';

export function createSignedTerrainSurfaceFromBathymetry(bathymetry = {}, options = {}) {
  const depth = normalizeDepthGrid(bathymetry.depthMeters ?? bathymetry.bottomDepthMeters ?? [], bathymetry.width, bathymetry.height);
  const height = depth.length;
  const width = depth[0]?.length ?? 0;
  const seaLevelMeters = finite(options.seaLevelMeters ?? bathymetry.seaLevelMeters, 0);
  const minimumNavigableDepthMeters = Math.max(0, finite(options.minimumNavigableDepthMeters ?? bathymetry.minimumNavigableDepthMeters, 8));
  const explicitLandMask = normalizeLandMask(bathymetry.landMask ?? bathymetry.landSeaMask, width, height);
  const elevationMeters = depth.map((row, y) => row.map((bottomDepth, x) => {
    const isLand = explicitLandMask[y]?.[x] === true || Number(bottomDepth) <= 0;
    if (isLand) return round(seaLevelMeters + finite(options.landElevationMeters, 2));
    return round(seaLevelMeters - Math.max(0, Number(bottomDepth)));
  }));
  return createSignedTerrainSurface({
    width,
    height,
    seaLevelMeters,
    elevationMeters,
    minimumNavigableDepthMeters,
    sourceMetadata: {
      ...(bathymetry.sourceMetadata ?? {}),
      sourceId: bathymetry.sourceMetadata?.sourceId ?? bathymetry.seed ?? 'synthetic-bathymetry',
      synthetic: bathymetry.synthetic !== false,
      calibratedOceanForecast: false,
      calibratedSurveyData: false,
      sourceRelationship: 'derived-from-bathymetry-depthMeters'
    }
  });
}

export function createSignedTerrainSurface(options = {}) {
  const elevationMeters = normalizeElevationGrid(options.elevationMeters ?? [], options.width, options.height, options.seaLevelMeters ?? 0);
  const height = elevationMeters.length;
  const width = elevationMeters[0]?.length ?? 0;
  const seaLevelMeters = finite(options.seaLevelMeters, 0);
  const minimumNavigableDepthMeters = Math.max(0, finite(options.minimumNavigableDepthMeters, 8));
  const bottomDepthMeters = elevationMeters.map((row) => row.map((elevation) => round(Math.max(0, seaLevelMeters - Number(elevation)))));
  const landMask = elevationMeters.map((row) => row.map((elevation) => Number(elevation) > seaLevelMeters));
  const wetMask = bottomDepthMeters.map((row) => row.map((depth) => Number(depth) > 0));
  const navigableWaterMask = bottomDepthMeters.map((row) => row.map((depth) => Number(depth) >= minimumNavigableDepthMeters));
  const digestPayload = { width, height, seaLevelMeters, minimumNavigableDepthMeters, elevationMeters };
  const digest = `fnv1a-${fnv1aHex(stableStringify(digestPayload))}`;
  const coastline = deriveCoastlineSegments(landMask);
  return {
    type: 'anchor.science.signed-terrain-surface',
    version: SIGNED_TERRAIN_SURFACE_MODEL_VERSION,
    width,
    height,
    seaLevelMeters,
    minimumNavigableDepthMeters,
    elevationMeters,
    bottomDepthMeters,
    landMask,
    wetMask,
    navigableWaterMask,
    coastline,
    sourceMetadata: {
      ...(options.sourceMetadata ?? {}),
      synthetic: options.sourceMetadata?.synthetic !== false,
      calibratedOceanForecast: false,
      calibratedSurveyData: false
    },
    digest,
    terrainSourceDigest: digest,
    landWaterSourceDigest: digest,
    coastlineSourceDigest: digest,
    bottomBoundarySourceDigest: digest,
    boundaryFlags: {
      usesSignedTerrainAuthority: true,
      usesLegacyLandTileGenerator: false,
      usesPerCellLandMeshes: false,
      landTileMeshCount: 0,
      rendererOwnsTerrainAuthority: false,
      plannerOwnsTerrainAuthority: false,
      scoringOwnsTerrainAuthority: false,
      syntheticEducational: true,
      calibratedOceanForecast: false
    }
  };
}

export function createLegacySignedTerrainSurfaceFromGrid({ terrain = [], depth = [], minimumNavigableDepthMeters = 1, seaLevelMeters = 0 } = {}) {
  const height = Math.max(terrain.length, depth.length, 1);
  const width = Math.max(terrain[0]?.length ?? 0, depth[0]?.length ?? 0, 1);
  const elevationMeters = Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const land = isLandValue(terrain[y]?.[x]);
    if (land) return seaLevelMeters + 1;
    const bottom = Math.max(minimumNavigableDepthMeters, finite(depth[y]?.[x], 25));
    return seaLevelMeters - bottom;
  }));
  const surface = createSignedTerrainSurface({ elevationMeters, seaLevelMeters, minimumNavigableDepthMeters, sourceMetadata: { sourceId: 'legacy-grid-compatibility', synthetic: true } });
  surface.terrainAuthorityMode = 'legacyGridCompatibility';
  surface.boundaryFlags.legacyGridCompatibility = true;
  return surface;
}

export function sampleSignedTerrainSurface(surface = {}, x, y) {
  const elevation = sampleGridBilinear(surface.elevationMeters, x, y, surface.seaLevelMeters ?? 0);
  const bottomDepthMeters = round(Math.max(0, finite(surface.seaLevelMeters, 0) - elevation));
  return {
    x: round(x),
    y: round(y),
    elevationMeters: elevation,
    bottomDepthMeters,
    land: elevation > finite(surface.seaLevelMeters, 0),
    wet: bottomDepthMeters > 0,
    navigable: bottomDepthMeters >= finite(surface.minimumNavigableDepthMeters, 8),
    terrainSourceDigest: surface.digest ?? null
  };
}

export function sampleSignedTerrainSurfaceAtUv(surface = {}, u, v) {
  const width = Math.max(1, Number(surface.width ?? surface.elevationMeters?.[0]?.length ?? 1));
  const height = Math.max(1, Number(surface.height ?? surface.elevationMeters?.length ?? 1));
  return sampleSignedTerrainSurface(surface, clamp01(u) * Math.max(0, width - 1), clamp01(v) * Math.max(0, height - 1));
}

export function signedTerrainSurfaceSummary(surface = {}) {
  const waterCells = (surface.wetMask ?? []).flat().filter(Boolean).length;
  const landCells = (surface.landMask ?? []).flat().filter(Boolean).length;
  const navigableCells = (surface.navigableWaterMask ?? []).flat().filter(Boolean).length;
  return {
    type: 'anchor.science.signed-terrain-surface-summary',
    version: SIGNED_TERRAIN_SURFACE_MODEL_VERSION,
    width: surface.width ?? 0,
    height: surface.height ?? 0,
    seaLevelMeters: surface.seaLevelMeters ?? 0,
    minimumNavigableDepthMeters: surface.minimumNavigableDepthMeters ?? null,
    terrainAuthorityMode: surface.terrainAuthorityMode ?? 'signedElevationV1',
    terrainSourceDigest: surface.terrainSourceDigest ?? surface.digest ?? null,
    landWaterSourceDigest: surface.landWaterSourceDigest ?? surface.digest ?? null,
    coastlineSourceDigest: surface.coastlineSourceDigest ?? surface.digest ?? null,
    bottomBoundarySourceDigest: surface.bottomBoundarySourceDigest ?? surface.digest ?? null,
    landCellCount: landCells,
    waterCellCount: waterCells,
    navigableWaterCellCount: navigableCells,
    coastlineSegmentCount: surface.coastline?.length ?? 0,
    usesSignedTerrainAuthority: surface.boundaryFlags?.usesSignedTerrainAuthority === true,
    usesLegacyLandTileGenerator: surface.boundaryFlags?.usesLegacyLandTileGenerator === true,
    usesPerCellLandMeshes: surface.boundaryFlags?.usesPerCellLandMeshes === true,
    landTileMeshCount: Number(surface.boundaryFlags?.landTileMeshCount ?? 0),
    syntheticEducational: surface.boundaryFlags?.syntheticEducational !== false,
    calibratedOceanForecast: false
  };
}

export function validateSignedTerrainSurface(surface = {}) {
  const errors = [];
  const warnings = [];
  if (surface.type !== 'anchor.science.signed-terrain-surface') errors.push('Signed terrain surface type must be anchor.science.signed-terrain-surface.');
  if (!Array.isArray(surface.elevationMeters) || !surface.elevationMeters.length) errors.push('Signed terrain surface requires elevationMeters.');
  if (surface.terrainSourceDigest !== surface.landWaterSourceDigest || surface.terrainSourceDigest !== surface.coastlineSourceDigest || surface.terrainSourceDigest !== surface.bottomBoundarySourceDigest) errors.push('Terrain, land/water, coastline, and bottom-boundary digests must match.');
  if (surface.boundaryFlags?.usesPerCellLandMeshes === true) errors.push('Signed terrain authority must not require per-cell land meshes.');
  if (surface.sourceMetadata?.calibratedOceanForecast === true || surface.sourceMetadata?.calibratedSurveyData === true) errors.push('Synthetic WORLD-R1.1 terrain must not claim calibrated data.');
  const summary = signedTerrainSurfaceSummary(surface);
  if (!summary.coastlineSegmentCount) warnings.push('No coastline segments were derived.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary };
}

function normalizeDepthGrid(grid = [], widthInput = null, heightInput = null) {
  const height = Math.max(1, Math.round(Number(heightInput ?? grid.length ?? 1)));
  const width = Math.max(1, Math.round(Number(widthInput ?? grid[0]?.length ?? 1)));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => Math.max(0, finite(grid[y]?.[x], 0))));
}

function normalizeElevationGrid(grid = [], widthInput = null, heightInput = null, seaLevelMeters = 0) {
  const height = Math.max(1, Math.round(Number(heightInput ?? grid.length ?? 1)));
  const width = Math.max(1, Math.round(Number(widthInput ?? grid[0]?.length ?? 1)));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => round(finite(grid[y]?.[x], seaLevelMeters))));
}

function normalizeLandMask(input = [], width, height) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => isLandValue(input?.[y]?.[x])));
}

function isLandValue(value) {
  if (value === true || value === 'land') return true;
  if (value === false || value === 'water') return false;
  const number = Number(value);
  return Number.isFinite(number) ? number > 0 : false;
}

function deriveCoastlineSegments(landMask = []) {
  const segments = [];
  const height = landMask.length;
  const width = landMask[0]?.length ?? 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const land = landMask[y]?.[x] === true;
      if (x < width - 1 && land !== (landMask[y]?.[x + 1] === true)) segments.push(segment(x + 0.5, y - 0.5, x + 0.5, y + 0.5, segments.length));
      if (y < height - 1 && land !== (landMask[y + 1]?.[x] === true)) segments.push(segment(x - 0.5, y + 0.5, x + 0.5, y + 0.5, segments.length));
    }
  }
  return segments;
}

function segment(x1, y1, x2, y2, index) {
  return { id: `coastline-${index + 1}`, start: { x: round(x1), y: round(y1) }, end: { x: round(x2), y: round(y2) }, source: 'signedElevationZeroContour' };
}

function sampleGridBilinear(grid = [], x, y, fallback = 0) {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!width || !height) return fallback;
  const cx = clamp(Number(x) || 0, 0, width - 1);
  const cy = clamp(Number(y) || 0, 0, height - 1);
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = cx - x0;
  const ty = cy - y0;
  const a = lerp(grid[y0]?.[x0] ?? fallback, grid[y0]?.[x1] ?? fallback, tx);
  const b = lerp(grid[y1]?.[x0] ?? fallback, grid[y1]?.[x1] ?? fallback, tx);
  return round(lerp(a, b, ty));
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function fnv1aHex(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp01(value) {
  return clamp(Number(value) || 0, 0, 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, t) {
  return Number(a) + (Number(b) - Number(a)) * t;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
