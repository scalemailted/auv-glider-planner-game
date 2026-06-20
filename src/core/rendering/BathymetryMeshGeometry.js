import { gridCellCenterToWorld } from './MissionWorldCoordinates.js';
import { buildBathymetrySurfaceViewModel, stableDigest } from './BathymetrySurfaceViewModel.js';

export const BATHYMETRY_MESH_GEOMETRY_VERSION = 'bathymetry-mesh-geometry-three-r1-2b';

export function buildBathymetryMeshGeometry(options = {}) {
  const surface = options.surfaceModel ?? buildBathymetrySurfaceViewModel(options);
  const coordinateSystem = options.coordinateSystem ?? options.transform ?? null;
  const width = Number(surface.width ?? 0);
  const height = Number(surface.height ?? 0);
  const depthScale = positive(options.depthScale ?? coordinateSystem?.depthScale, 0.045);
  const verticalExaggeration = positive(options.verticalExaggeration ?? coordinateSystem?.verticalExaggeration, 1);
  const landDisplayElevationMeters = positive(options.landDisplayElevationMeters, 3);
  const positions = [];
  const normals = Array(width * height * 3).fill(0);
  const uvs = [];
  const colors = [];
  const indices = [];
  const vertexDepthMeters = [];
  const waterVertexMask = [];
  const landVertexMask = [];
  const depthRange = surface.depthRange ?? {};
  const maxDepth = Math.max(1, Number(depthRange.maxDepthMeters ?? surface.maximumWaterDepthMeters ?? 1));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const land = surface.landMask?.[y]?.[x] === true;
      const depthMeters = land ? 0 : Math.max(0, Number(surface.bottomDepthField?.[y]?.[x] ?? 0));
      const elevationMeters = land ? Number(surface.optionalLandElevationField?.[y]?.[x] ?? landDisplayElevationMeters) : -depthMeters;
      const world = coordinateSystem
        ? gridCellCenterToWorld(coordinateSystem, x, y, land ? -Math.max(0, elevationMeters) : depthMeters)
        : {
          x: x - (width - 1) / 2,
          y: land ? elevationMeters * depthScale * verticalExaggeration : -depthMeters * depthScale * verticalExaggeration,
          z: y - (height - 1) / 2
        };
      if (land && coordinateSystem) world.y = Math.max(0.06, Math.abs(elevationMeters) * depthScale * verticalExaggeration);
      positions.push(round(world.x), round(world.y), round(world.z));
      vertexDepthMeters.push(round(depthMeters));
      landVertexMask.push(land);
      waterVertexMask.push(!land && depthMeters > 0);
      uvs.push(width <= 1 ? 0 : round(x / (width - 1)), height <= 1 ? 0 : round(y / (height - 1)));
      colors.push(...terrainColor(depthMeters, maxDepth, land));
    }
  }

  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const a = y * width + x;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      accumulateNormal(positions, normals, a, c, b);
      accumulateNormal(positions, normals, b, c, d);
    }
  }
  normalizeNormals(normals);
  const bounds = positionBounds(positions);
  const sourceDigest = surface.sourceDigest ?? stableDigest({ field: surface.bottomDepthField, land: surface.landMask });
  return {
    type: 'anchor.rendering.bathymetry-mesh-geometry',
    version: BATHYMETRY_MESH_GEOMETRY_VERSION,
    positions,
    vertices: positions,
    normals: normals.map((value) => round(value)),
    uvs,
    colors,
    indices,
    vertexDepthMeters,
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    width,
    height,
    depthScale,
    verticalExaggeration,
    landDisplayElevationMeters,
    waterVertexMask,
    landVertexMask,
    bounds,
    coordinateProfileId: surface.coordinateProfileId ?? coordinateSystem?.coordinateFrame ?? null,
    sourceDigest,
    sourceMetadata: surface.sourceMetadata ?? null,
    interpolationProfileId: surface.interpolationProfileId ?? 'bilinearCellCenterV1',
    vertexConvention: surface.vertexConvention ?? 'cell centers',
    boundaryFlags: { ...(surface.boundaryFlags ?? {}), rendererOwnsBathymetry: false, usesVisualMeshForPhysics: false },
    warnings: [...(surface.warnings ?? [])],
    publicSafe: true,
    containsHiddenTruth: false
  };
}

export function validateBathymetryMeshGeometry(geometry = {}) {
  const errors = [];
  const warnings = [...(geometry.warnings ?? [])];
  if (geometry.type !== 'anchor.rendering.bathymetry-mesh-geometry') errors.push('Bathymetry mesh geometry type is invalid.');
  if (!Array.isArray(geometry.positions) || geometry.positions.length % 3 !== 0) errors.push('positions must be a flat xyz array.');
  if (!Array.isArray(geometry.indices) || geometry.indices.length % 3 !== 0) errors.push('indices must be triangle triples.');
  const vertexCount = Number(geometry.vertexCount ?? geometry.positions?.length / 3);
  if (!Number.isFinite(vertexCount) || vertexCount <= 0) errors.push('vertexCount must be positive.');
  for (const index of geometry.indices ?? []) {
    if (!Number.isInteger(Number(index)) || Number(index) < 0 || Number(index) >= vertexCount) errors.push(`Index ${index} is outside vertex range.`);
  }
  if ((geometry.landVertexMask ?? []).length !== vertexCount) errors.push('landVertexMask length must match vertexCount.');
  if ((geometry.waterVertexMask ?? []).length !== vertexCount) errors.push('waterVertexMask length must match vertexCount.');
  if (geometry.boundaryFlags?.usesVisualMeshForPhysics === true) errors.push('Mesh geometry must not be used for physics.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors: [...new Set(errors)], warnings, summary: bathymetryMeshGeometrySummary(geometry) };
}

export function bathymetryMeshGeometrySummary(geometry = {}) {
  return {
    type: 'anchor.rendering.bathymetry-mesh-geometry-summary',
    version: BATHYMETRY_MESH_GEOMETRY_VERSION,
    vertexCount: Number(geometry.vertexCount ?? 0),
    triangleCount: Number(geometry.triangleCount ?? 0),
    width: Number(geometry.width ?? 0),
    height: Number(geometry.height ?? 0),
    indexed: Array.isArray(geometry.indices) && geometry.indices.length > 0,
    waterVertexCount: (geometry.waterVertexMask ?? []).filter(Boolean).length,
    landVertexCount: (geometry.landVertexMask ?? []).filter(Boolean).length,
    bounds: geometry.bounds ?? null,
    sourceDigest: geometry.sourceDigest ?? null,
    coordinateProfileId: geometry.coordinateProfileId ?? null,
    usesVisualMeshForPhysics: geometry.boundaryFlags?.usesVisualMeshForPhysics === true,
    warnings: [...(geometry.warnings ?? [])]
  };
}

function accumulateNormal(positions, normals, ia, ib, ic) {
  const a = vectorAt(positions, ia);
  const b = vectorAt(positions, ib);
  const c = vectorAt(positions, ic);
  const ux = b.x - a.x;
  const uy = b.y - a.y;
  const uz = b.z - a.z;
  const vx = c.x - a.x;
  const vy = c.y - a.y;
  const vz = c.z - a.z;
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  for (const index of [ia, ib, ic]) {
    normals[index * 3] += nx;
    normals[index * 3 + 1] += ny;
    normals[index * 3 + 2] += nz;
  }
}

function normalizeNormals(normals) {
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= length;
    normals[i + 1] /= length;
    normals[i + 2] /= length;
  }
}

function vectorAt(positions, index) {
  return { x: Number(positions[index * 3] ?? 0), y: Number(positions[index * 3 + 1] ?? 0), z: Number(positions[index * 3 + 2] ?? 0) };
}

function positionBounds(positions) {
  const xs = [];
  const ys = [];
  const zs = [];
  for (let i = 0; i < positions.length; i += 3) {
    xs.push(Number(positions[i]));
    ys.push(Number(positions[i + 1]));
    zs.push(Number(positions[i + 2]));
  }
  return {
    min: { x: round(Math.min(...xs)), y: round(Math.min(...ys)), z: round(Math.min(...zs)) },
    max: { x: round(Math.max(...xs)), y: round(Math.max(...ys)), z: round(Math.max(...zs)) }
  };
}

function terrainColor(depth, maxDepth, land) {
  if (land) return [0.28, 0.36, 0.22];
  const t = Math.max(0, Math.min(1, Number(depth) / Math.max(1, maxDepth)));
  if (t < 0.18) return [0.18, 0.58, 0.62];
  if (t < 0.42) return [0.10, 0.38, 0.58];
  if (t < 0.72) return [0.05, 0.18, 0.40];
  return [0.025, 0.065, 0.18];
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
