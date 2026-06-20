import { buildBottomBoundaryViewModel } from './BottomBoundaryViewModel.js';
import { createBathymetrySourceMetadata, validateBathymetrySourceMetadata } from '../science/BathymetrySourceMetadata.js';

export const BATHYMETRY_SURFACE_VIEW_MODEL_VERSION = 'bathymetry-surface-view-model-three-r1-2b';

export function buildBathymetrySurfaceViewModel(options = {}) {
  const level = options.level ?? null;
  const bottomBoundary = options.bottomBoundary ?? buildBottomBoundaryViewModel({
    level,
    grid: options.grid,
    bathymetry: options.bathymetry,
    bottomDepthField: options.bottomDepthField,
    landMask: options.landMask
  });
  const width = Number(bottomBoundary.width ?? options.width ?? 0);
  const height = Number(bottomBoundary.height ?? options.height ?? 0);
  const bottomDepthField = normalizeNumberGrid(bottomBoundary.bottomDepthField ?? options.bottomDepthField, width, height, 0);
  const landMask = normalizeBooleanGrid(bottomBoundary.landMask ?? options.landMask, width, height, bottomDepthField);
  const waterMask = landMask.map((row, y) => row.map((land, x) => !land && Number(bottomDepthField[y]?.[x] ?? 0) > 0));
  const coastlineMask = normalizeBooleanGrid(bottomBoundary.coastlineMask ?? options.coastlineMask ?? buildCoastlineMask(landMask), width, height, null);
  const optionalLandElevationField = normalizeOptionalElevation(options.optionalLandElevationField ?? options.landElevationField, width, height, landMask);
  const waterDepthValues = bottomDepthField.flat().map(Number).filter((value) => Number.isFinite(value) && value > 0);
  const landElevationValues = optionalLandElevationField.flat().map(Number).filter(Number.isFinite);
  const terrainFeatures = normalizeTerrainFeatures(options.terrainFeatures ?? options.bathymetry?.terrainFeatures ?? [], bottomDepthField, landMask);
  const sourceMetadata = createBathymetrySourceMetadata({
    ...(options.sourceMetadata ?? options.bathymetry?.sourceMetadata ?? {}),
    sourceId: options.sourceMetadata?.sourceId ?? options.bathymetry?.seed ?? options.seed ?? 'synthetic-bathymetry',
    synthetic: options.synthetic ?? options.bathymetry?.synthetic ?? true,
    calibrated: options.calibrated ?? options.bathymetry?.calibrated ?? options.bathymetry?.calibratedSurveyData ?? false,
    operationallyValidated: options.operationallyValidated ?? options.bathymetry?.operationallyValidated ?? false
  });
  const warnings = [
    ...(bottomBoundary.warnings ?? []),
    ...(options.warnings ?? []),
    ...(waterDepthValues.length ? [] : ['Bathymetry surface has no water cells.'])
  ];
  return {
    type: 'anchor.rendering.bathymetry-surface-view-model',
    version: BATHYMETRY_SURFACE_VIEW_MODEL_VERSION,
    coordinateProfileId: options.coordinateProfileId ?? options.coordinateSystem?.coordinateFrame ?? 'grid-cell-center-top-left-row-major',
    width,
    height,
    horizontalExtent: options.horizontalExtent ?? { minX: 0, maxX: Math.max(0, width - 1), minY: 0, maxY: Math.max(0, height - 1), units: 'canonical-grid-cells' },
    cellSize: Number(options.cellSize ?? options.coordinateSystem?.cellSize ?? 1),
    vertexConvention: 'vertices at canonical bathymetry cell centers; row-major [y][x]; depth positive downward',
    bottomDepthField,
    landMask,
    waterMask,
    coastlineMask,
    optionalLandElevationField,
    minimumWaterDepthMeters: waterDepthValues.length ? round(Math.min(...waterDepthValues)) : 0,
    maximumWaterDepthMeters: waterDepthValues.length ? round(Math.max(...waterDepthValues)) : 0,
    minimumLandElevationMeters: landElevationValues.length ? round(Math.min(...landElevationValues)) : 0,
    maximumLandElevationMeters: landElevationValues.length ? round(Math.max(...landElevationValues)) : 0,
    depthRange: { minDepthMeters: waterDepthValues.length ? round(Math.min(...waterDepthValues)) : 0, maxDepthMeters: waterDepthValues.length ? round(Math.max(...waterDepthValues)) : 0 },
    elevationRange: { minElevationMeters: landElevationValues.length ? round(Math.min(...landElevationValues)) : 0, maxElevationMeters: landElevationValues.length ? round(Math.max(...landElevationValues)) : 0 },
    terrainFeatures,
    sourceMetadata,
    synthetic: sourceMetadata.synthetic !== false,
    calibrated: sourceMetadata.calibrated === true,
    operationallyValidated: sourceMetadata.operationallyValidated === true,
    interpolationProfileId: sourceMetadata.interpolationProfileId ?? 'bilinearCellCenterV1',
    warnings,
    boundaryFlags: {
      canonicalBottomOwnedByCore: true,
      rendererOwnsBathymetry: false,
      rendererOwnsCollision: false,
      rendererOwnsDiveFeasibility: false,
      usesVisualMeshForPhysics: false
    },
    sourceDigest: stableDigest({ bottomDepthField, landMask, sourceId: sourceMetadata.sourceId, interpolationProfileId: sourceMetadata.interpolationProfileId }),
    publicSafe: true,
    containsHiddenTruth: false
  };
}

export function validateBathymetrySurfaceViewModel(model = {}) {
  const errors = [];
  const warnings = [...(model.warnings ?? [])];
  if (model.type !== 'anchor.rendering.bathymetry-surface-view-model') errors.push('Bathymetry surface view model type is invalid.');
  if (!Number.isFinite(Number(model.width)) || Number(model.width) <= 0) errors.push('Bathymetry surface width must be positive.');
  if (!Number.isFinite(Number(model.height)) || Number(model.height) <= 0) errors.push('Bathymetry surface height must be positive.');
  if (!Array.isArray(model.bottomDepthField) || model.bottomDepthField.length !== Number(model.height)) errors.push('bottomDepthField must be [row][col] and match height.');
  if (!Array.isArray(model.landMask) || model.landMask.length !== Number(model.height)) errors.push('landMask must be [row][col] and match height.');
  if (model.boundaryFlags?.canonicalBottomOwnedByCore !== true) errors.push('canonicalBottomOwnedByCore must be true.');
  if (model.boundaryFlags?.rendererOwnsBathymetry === true) errors.push('Renderer must not own canonical bathymetry.');
  if (model.boundaryFlags?.usesVisualMeshForPhysics === true) errors.push('Visual mesh must not be used for physics.');
  const sourceValidation = validateBathymetrySourceMetadata(model.sourceMetadata ?? {});
  if (!sourceValidation.valid) errors.push(...sourceValidation.errors.map((entry) => `sourceMetadata: ${entry}`));
  warnings.push(...sourceValidation.warnings);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, summary: bathymetrySurfaceViewModelSummary(model) };
}

export function bathymetrySurfaceViewModelSummary(model = {}) {
  return {
    type: 'anchor.rendering.bathymetry-surface-view-model-summary',
    version: BATHYMETRY_SURFACE_VIEW_MODEL_VERSION,
    width: Number(model.width ?? 0),
    height: Number(model.height ?? 0),
    depthRange: model.depthRange ?? null,
    elevationRange: model.elevationRange ?? null,
    waterCellCount: (model.waterMask ?? []).flat().filter(Boolean).length,
    landCellCount: (model.landMask ?? []).flat().filter(Boolean).length,
    coastlineCellCount: (model.coastlineMask ?? []).flat().filter(Boolean).length,
    terrainFeatureCount: model.terrainFeatures?.length ?? 0,
    sourceDigest: model.sourceDigest ?? null,
    synthetic: model.synthetic !== false,
    calibrated: model.calibrated === true,
    operationallyValidated: model.operationallyValidated === true,
    canonicalBottomOwnedByCore: model.boundaryFlags?.canonicalBottomOwnedByCore === true,
    rendererOwnsBathymetry: model.boundaryFlags?.rendererOwnsBathymetry === true,
    usesVisualMeshForPhysics: model.boundaryFlags?.usesVisualMeshForPhysics === true,
    warnings: [...(model.warnings ?? [])]
  };
}

export function stableDigest(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizeNumberGrid(input, width, height, fallback = 0) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const value = Number(input?.[y]?.[x]);
    return Number.isFinite(value) ? round(Math.max(0, value)) : fallback;
  }));
}

function normalizeBooleanGrid(input, width, height, depthField = null) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const value = input?.[y]?.[x];
    if (value === true || value === 'land') return true;
    if (value === false || value === 'water') return false;
    const number = Number(value);
    if (Number.isFinite(number)) return depthField ? number > 0 || Number(depthField[y]?.[x] ?? 0) <= 0 : number > 0;
    return depthField ? Number(depthField[y]?.[x] ?? 0) <= 0 : false;
  }));
}

function normalizeOptionalElevation(input, width, height, landMask) {
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const value = Number(input?.[y]?.[x]);
    if (Number.isFinite(value)) return round(value);
    return landMask[y]?.[x] ? round(2 + 2 * pseudoRelief(x, y)) : null;
  }));
}

function buildCoastlineMask(landMask) {
  const height = landMask.length;
  const width = landMask[0]?.length ?? 0;
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const here = landMask[y]?.[x] === true;
    return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const neighbor = landMask[y + dy]?.[x + dx];
      return neighbor !== undefined && Boolean(neighbor) !== here;
    });
  }));
}

function normalizeTerrainFeatures(features, depthField, landMask) {
  if (features.length) return features.map((feature, index) => normalizeFeature(feature, index));
  const width = depthField[0]?.length ?? 0;
  const height = depthField.length;
  const depths = depthField.flat().map(Number).filter((value) => value > 0);
  const maxDepth = depths.length ? Math.max(...depths) : 0;
  return [
    { id: 'terrain-feature-land-coast', type: 'landCoast', label: 'Synthetic Land Coast', center: { x: 0, y: height / 2 }, bounds: { minX: 0, minY: 0, maxX: Math.max(0, width * 0.28), maxY: height }, minimumDepth: 0, maximumDepth: 0, orientation: 'north-south', scale: width, canonical: true, synthetic: true, warnings: [] },
    { id: 'terrain-feature-continental-shelf', type: 'continentalShelf', label: 'Continental Shelf', center: { x: width * 0.35, y: height / 2 }, bounds: { minX: width * 0.12, minY: 0, maxX: width * 0.56, maxY: height }, minimumDepth: 1, maximumDepth: Math.min(80, maxDepth), orientation: 'along-coast', scale: width * 0.4, canonical: true, synthetic: true, warnings: [] },
    { id: 'terrain-feature-shelf-break', type: 'shelfBreak', label: 'Shelf Break', center: { x: width * 0.52, y: height / 2 }, bounds: { minX: width * 0.46, minY: 0, maxX: width * 0.62, maxY: height }, minimumDepth: 40, maximumDepth: Math.min(150, maxDepth), orientation: 'along-coast', scale: width * 0.16, canonical: true, synthetic: true, warnings: [] },
    { id: 'terrain-feature-deep-basin', type: 'deepBasin', label: 'Deep Basin', center: { x: width * 0.78, y: height * 0.55 }, bounds: { minX: width * 0.58, minY: 0, maxX: width, maxY: height }, minimumDepth: maxDepth * 0.55, maximumDepth: maxDepth, orientation: 'offshore', scale: width * 0.35, canonical: true, synthetic: true, warnings: [] }
  ].filter((feature) => feature.maximumDepth >= feature.minimumDepth || feature.type === 'landCoast');
}

function normalizeFeature(feature, index) {
  return {
    id: feature.id ?? `terrain-feature-${index + 1}`,
    type: feature.type ?? 'unknown',
    label: feature.label ?? feature.type ?? `Terrain Feature ${index + 1}`,
    center: feature.center ?? null,
    bounds: feature.bounds ?? null,
    minimumDepth: numberOrNull(feature.minimumDepth ?? feature.minimumDepthMeters),
    maximumDepth: numberOrNull(feature.maximumDepth ?? feature.maximumDepthMeters),
    orientation: feature.orientation ?? null,
    scale: numberOrNull(feature.scale),
    canonical: feature.canonical !== false,
    synthetic: feature.synthetic !== false,
    warnings: [...(feature.warnings ?? [])]
  };
}

function pseudoRelief(x, y) {
  return ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round(number) : null;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
