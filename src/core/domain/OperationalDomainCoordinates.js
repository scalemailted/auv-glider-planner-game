import { normalizeOperationalDomainSpec } from './OperationalDomainSpec.js';
import { normalizeMissionResolutionProfile, resolutionGridForRole } from './MissionResolutionProfile.js';

export const OPERATIONAL_DOMAIN_COORDINATES_VERSION = 'operational-domain-coordinates-world-r1';

export function physicalPointToUv(point = {}, domainInput = {}) {
  const domain = normalizeOperationalDomainSpec(domainInput);
  const eastMeters = finite(point.eastMeters ?? point.eastingMeters ?? point.xMeters, domain.horizontal.minEastMeters);
  const northMeters = finite(point.northMeters ?? point.yMeters, domain.horizontal.maxNorthMeters);
  const u = (eastMeters - domain.horizontal.minEastMeters) / Math.max(1e-9, domain.horizontal.widthMeters);
  const v = (domain.horizontal.maxNorthMeters - northMeters) / Math.max(1e-9, domain.horizontal.heightMeters);
  return {
    u: clamp01(u),
    v: clamp01(v),
    rawU: u,
    rawV: v,
    inside: u >= 0 && u <= 1 && v >= 0 && v <= 1,
    convention: 'u eastward, v southward; row 0 is north/top'
  };
}

export function uvToPhysicalPoint(uv = {}, domainInput = {}) {
  const domain = normalizeOperationalDomainSpec(domainInput);
  const u = clamp01(finite(uv.u, 0));
  const v = clamp01(finite(uv.v, 0));
  const eastMeters = domain.horizontal.minEastMeters + u * domain.horizontal.widthMeters;
  const northMeters = domain.horizontal.maxNorthMeters - v * domain.horizontal.heightMeters;
  return {
    eastMeters: round(eastMeters),
    northMeters: round(northMeters),
    depthMeters: Math.max(0, finite(uv.depthMeters, 0)),
    coordinateFrame: domain.coordinateFrame
  };
}

export function physicalPointToGridSample(point = {}, domainInput = {}, gridInput = {}, options = {}) {
  const grid = normalizeGrid(gridInput);
  const uv = physicalPointToUv(point, domainInput);
  if (!uv.inside && options.clamp === false) {
    return { col: null, row: null, x: null, y: null, inside: false, uv, grid };
  }
  const col = uv.u * Math.max(0, grid.columns - 1);
  const row = uv.v * Math.max(0, grid.rows - 1);
  return {
    col: round(col),
    row: round(row),
    x: round(col),
    y: round(row),
    containingCell: {
      col: clampInt(Math.floor(uv.u * grid.columns), 0, grid.columns - 1),
      row: clampInt(Math.floor(uv.v * grid.rows), 0, grid.rows - 1)
    },
    depthMeters: Math.max(0, finite(point.depthMeters, 0)),
    inside: uv.inside,
    uv,
    grid,
    samplingConvention: 'continuous node coordinates for bilinear source fields'
  };
}

export function gridCellToPhysicalPoint(cell = {}, domainInput = {}, gridInput = {}, options = {}) {
  const grid = normalizeGrid(gridInput);
  const col = clamp(finite(cell.col ?? cell.x, 0), 0, grid.columns - 1);
  const row = clamp(finite(cell.row ?? cell.y, 0), 0, grid.rows - 1);
  const cellCenter = options.vertex !== true;
  const u = cellCenter ? (col + 0.5) / grid.columns : (grid.columns <= 1 ? 0 : col / (grid.columns - 1));
  const v = cellCenter ? (row + 0.5) / grid.rows : (grid.rows <= 1 ? 0 : row / (grid.rows - 1));
  return {
    ...uvToPhysicalPoint({ u, v, depthMeters: cell.depthMeters }, domainInput),
    col: round(col),
    row: round(row),
    gridRole: grid.role ?? null,
    coordinateProfile: cellCenter ? 'cellCenter' : 'gridVertex'
  };
}

export function physicalPointToPlanningCell(point = {}, domainInput = {}, profileInput = {}, options = {}) {
  const profile = normalizeMissionResolutionProfile(profileInput);
  return physicalPointToGridSample(point, domainInput, profile.planningLattice, options);
}

export function physicalPointToRoleSample(point = {}, domainInput = {}, profileInput = {}, role = 'planning', options = {}) {
  const profile = normalizeMissionResolutionProfile(profileInput);
  return physicalPointToGridSample(point, domainInput, resolutionGridForRole(profile, role), options);
}

export function legacyGridPointToPhysicalPoint(point = {}, domainInput = {}, profileInput = {}, role = 'planning') {
  const profile = normalizeMissionResolutionProfile(profileInput);
  return gridCellToPhysicalPoint(point, domainInput, resolutionGridForRole(profile, role));
}

export function physicalPointToThreeWorld(point = {}, domainInput = {}, options = {}) {
  const domain = normalizeOperationalDomainSpec(domainInput);
  const uv = physicalPointToUv(point, domain);
  const worldWidth = Math.max(1, finite(options.worldWidthUnits, 160));
  const worldDepth = Math.max(1, finite(options.worldDepthUnits, worldWidth * domain.horizontal.heightMeters / Math.max(1, domain.horizontal.widthMeters)));
  const depthScale = Math.max(0.000001, finite(options.depthScale, 0.045));
  const verticalExaggeration = Math.max(0.000001, finite(options.verticalExaggeration, 1));
  const depthMeters = Math.max(0, finite(point.depthMeters, 0));
  return {
    x: round((uv.u - 0.5) * worldWidth),
    y: round(-depthMeters * depthScale * verticalExaggeration),
    z: round((uv.v - 0.5) * worldDepth),
    depthMeters,
    uv,
    coordinateFrame: 'threeMissionWorldUnits',
    physicalScale: {
      metersPerWorldX: round(domain.horizontal.widthMeters / worldWidth, 6),
      metersPerWorldZ: round(domain.horizontal.heightMeters / worldDepth, 6),
      depthScale,
      verticalExaggeration
    }
  };
}

export function threeWorldToPhysicalPoint(worldPoint = {}, domainInput = {}, options = {}) {
  const domain = normalizeOperationalDomainSpec(domainInput);
  const worldWidth = Math.max(1, finite(options.worldWidthUnits, 160));
  const worldDepth = Math.max(1, finite(options.worldDepthUnits, worldWidth * domain.horizontal.heightMeters / Math.max(1, domain.horizontal.widthMeters)));
  const depthScale = Math.max(0.000001, finite(options.depthScale, 0.045));
  const verticalExaggeration = Math.max(0.000001, finite(options.verticalExaggeration, 1));
  const u = clamp01(finite(worldPoint.x, 0) / worldWidth + 0.5);
  const v = clamp01(finite(worldPoint.z, 0) / worldDepth + 0.5);
  return uvToPhysicalPoint({
    u,
    v,
    depthMeters: Math.max(0, -finite(worldPoint.y, 0) / Math.max(1e-9, depthScale * verticalExaggeration))
  }, domain);
}

export function coordinateRoundtripDiagnostics(options = {}) {
  const domain = normalizeOperationalDomainSpec(options.domain);
  const profile = normalizeMissionResolutionProfile(options.profile);
  const point = options.point ?? {
    eastMeters: domain.horizontal.minEastMeters + domain.horizontal.widthMeters * 0.37,
    northMeters: domain.horizontal.minNorthMeters + domain.horizontal.heightMeters * 0.64,
    depthMeters: domain.vertical.maxDepthMeters * 0.28
  };
  const uv = physicalPointToUv(point, domain);
  const physical = uvToPhysicalPoint({ ...uv, depthMeters: point.depthMeters }, domain);
  const planning = physicalPointToPlanningCell(point, domain, profile);
  const world = physicalPointToThreeWorld(point, domain, options.render ?? {});
  const back = threeWorldToPhysicalPoint(world, domain, options.render ?? {});
  const horizontalErrorMeters = Math.hypot(point.eastMeters - physical.eastMeters, point.northMeters - physical.northMeters);
  const worldErrorMeters = Math.hypot(point.eastMeters - back.eastMeters, point.northMeters - back.northMeters);
  const errors = [];
  if (horizontalErrorMeters > 1e-4) errors.push('UV to physical roundtrip exceeded tolerance.');
  if (worldErrorMeters > 1e-4) errors.push('Three world to physical roundtrip exceeded tolerance.');
  if (point.depthMeters > 0 && world.y >= 0) errors.push('Positive depth must map to negative Three world Y.');
  return {
    type: 'anchor.world.coordinate-roundtrip-diagnostics',
    version: OPERATIONAL_DOMAIN_COORDINATES_VERSION,
    valid: errors.length === 0,
    errors,
    point,
    uv,
    physical,
    planning,
    world,
    back,
    horizontalErrorMeters: round(horizontalErrorMeters, 8),
    worldErrorMeters: round(worldErrorMeters, 8)
  };
}

function normalizeGrid(grid = {}) {
  return {
    columns: Math.max(1, Math.round(finite(grid.columns ?? grid.width, 1))),
    rows: Math.max(1, Math.round(finite(grid.rows ?? grid.height, 1))),
    role: grid.role ?? null
  };
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
