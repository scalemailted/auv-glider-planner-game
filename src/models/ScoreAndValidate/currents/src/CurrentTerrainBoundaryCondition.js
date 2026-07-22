 const CURRENT_TERRAIN_BOUNDARY_CONDITION_VERSION = 'current-terrain-boundary-condition-flow-r2a-3';

 function createWetMaskFromBathymetry(options = {}) {
  const bottomDepthMeters = options.bottomDepthMeters ?? options.depthMeters ?? [];
  const landMask = options.landMask ?? options.terrainMask ?? null;
  const height = Math.max(0, Number(options.height ?? bottomDepthMeters.length ?? 0));
  const width = Math.max(0, Number(options.width ?? bottomDepthMeters[0]?.length ?? 0));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => {
    const bottom = Number(bottomDepthMeters?.[y]?.[x] ?? 0);
    return !Boolean(landMask?.[y]?.[x]) && Number.isFinite(bottom) && bottom > 0;
  }));
}

 function isWetAtDepth(field = {}, x = 0, y = 0, depthMeters = 0) {
  const xi = Math.max(0, Math.min((field.eastAxisMeters?.length ?? field.wetMask?.[0]?.length ?? 1) - 1, Math.round(Number(x) || 0)));
  const yi = Math.max(0, Math.min((field.northAxisMeters?.length ?? field.wetMask?.length ?? 1) - 1, Math.round(Number(y) || 0)));
  const wet = field.wetMask?.[yi]?.[xi] !== false;
  const bottom = Number(field.bottomDepthMeters?.[yi]?.[xi] ?? Infinity);
  return wet && Number.isFinite(bottom) && Number(depthMeters) <= bottom + 1e-6;
}

 function enforceCurrentTerrainBoundary(options = {}) {
  const u = cloneCube(options.uEastMetersPerSecond ?? options.u ?? []);
  const v = cloneCube(options.vNorthMetersPerSecond ?? options.v ?? []);
  const wetMask = options.wetMask ?? createWetMaskFromBathymetry(options);
  const bottomDepthMeters = options.bottomDepthMeters ?? [];
  const depthAxisMeters = options.depthAxisMeters ?? [];
  const dims = cubeDims(u);
  for (let t = 0; t < dims.time; t += 1) {
    for (let z = 0; z < dims.depth; z += 1) {
      const depth = Number(depthAxisMeters[z] ?? z);
      for (let y = 0; y < dims.height; y += 1) {
        for (let x = 0; x < dims.width; x += 1) {
          const bottom = Number(bottomDepthMeters?.[y]?.[x] ?? Infinity);
          if (wetMask?.[y]?.[x] === false || depth > bottom + 1e-6) {
            u[t][z][y][x] = 0;
            v[t][z][y][x] = 0;
            continue;
          }
          if (options.suppressCoastlineNormal !== false) {
            const projected = projectCoastlineNoNormalVelocity({ u: u[t][z][y][x], v: v[t][z][y][x], wetMask, x, y });
            u[t][z][y][x] = round(projected.u);
            v[t][z][y][x] = round(projected.v);
          }
        }
      }
    }
  }
  return { uEastMetersPerSecond: u, vNorthMetersPerSecond: v, wetMask, bottomDepthMeters };
}

 function projectCoastlineNoNormalVelocity({ u = 0, v = 0, wetMask = [], x = 0, y = 0 } = {}) {
  const normal = coastlineNormal(wetMask, x, y);
  if (!normal) return { u, v, corrected: false, normalSpeed: 0 };
  const dot = Number(u) * normal.x + Number(v) * normal.y;
  return {
    u: Number(u) - dot * normal.x,
    v: Number(v) - dot * normal.y,
    corrected: Math.abs(dot) > 1e-12,
    normalSpeed: Math.abs(dot),
    normal
  };
}

 function coastlineNormal(wetMask = [], x = 0, y = 0) {
  if (wetMask?.[y]?.[x] === false) return null;
  let nx = 0;
  let ny = 0;
  const neighbors = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  for (const [dx, dy] of neighbors) {
    const xx = x + dx;
    const yy = y + dy;
    if (yy < 0 || yy >= wetMask.length || xx < 0 || xx >= (wetMask[yy]?.length ?? 0) || wetMask[yy]?.[xx] === false) {
      nx += dx;
      ny += dy;
    }
  }
  const length = Math.hypot(nx, ny);
  if (length <= 1e-9) return null;
  return { x: nx / length, y: ny / length };
}

 function terrainBoundaryDigest(boundary = {}) {
  const text = stable({ wetMask: boundary.wetMask, bottomDepthMeters: boundary.bottomDepthMeters });
  return `terrain-boundary:${fnv(text)}`;
}

function cloneCube(cube = []) {
  return cube.map((time) => time.map((depth) => depth.map((row) => row.map((value) => Number(value) || 0))));
}

function cubeDims(cube = []) {
  return { time: cube.length, depth: cube[0]?.length ?? 0, height: cube[0]?.[0]?.length ?? 0, width: cube[0]?.[0]?.[0]?.length ?? 0 };
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fnv(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function round(value, digits = 8) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

module.exports = {CURRENT_TERRAIN_BOUNDARY_CONDITION_VERSION, createWetMaskFromBathymetry, isWetAtDepth, enforceCurrentTerrainBoundary, projectCoastlineNoNormalVelocity, coastlineNormal, terrainBoundaryDigest}