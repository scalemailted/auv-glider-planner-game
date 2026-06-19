import { gridCellCenterToWorld } from './MissionWorldCoordinates.js';

export const MISSION_LAYER_ALIGNMENT_VERSION = 'mission-layer-alignment-three-r1-1e';
export const MISSION_LAYER_ALIGNMENT_TOLERANCE = 1e-6;

export function compareMissionLayerCoordinates(options = {}) {
  const transform = options.transform ?? options.viewModel?.coordinateSystem;
  const cells = options.cells ?? fixtureCells(options.viewModel?.grid ?? transform ?? {});
  const reports = cells.map((cell) => compareCell(transform, cell, options.layers ?? defaultLayers(options.viewModel ?? {})));
  const maxHorizontalDelta = Math.max(0, ...reports.map((report) => report.maxHorizontalDelta));
  return {
    type: 'anchor.rendering.mission-layer-alignment-report',
    version: MISSION_LAYER_ALIGNMENT_VERSION,
    tolerance: MISSION_LAYER_ALIGNMENT_TOLERANCE,
    reports,
    maxHorizontalDelta,
    status: maxHorizontalDelta <= MISSION_LAYER_ALIGNMENT_TOLERANCE ? 'PASS' : 'WARN',
    warnings: reports.flatMap((report) => report.warnings)
  };
}

export function missionLayerAlignmentSummary(report = {}) {
  return {
    version: MISSION_LAYER_ALIGNMENT_VERSION,
    status: report.status ?? 'UNKNOWN',
    checkedCellCount: report.reports?.length ?? 0,
    maxHorizontalDelta: round(report.maxHorizontalDelta),
    tolerance: report.tolerance ?? MISSION_LAYER_ALIGNMENT_TOLERANCE,
    misalignedLayerIds: [...new Set((report.reports ?? []).flatMap((entry) => entry.warnings ?? []).map((warning) => warning.layerId).filter(Boolean))]
  };
}

function compareCell(transform, cell, layers) {
  const expectedWorldCenter = gridCellCenterToWorld(transform, cell.x ?? cell.col, cell.y ?? cell.row, cell.depthMeters ?? 0);
  const layerPositions = Object.entries(layers).map(([layerId, resolver]) => {
    const value = typeof resolver === 'function' ? resolver(cell, expectedWorldCenter) : resolver;
    return { layerId, worldCenter: normalizeWorld(value ?? expectedWorldCenter) };
  });
  const deltas = layerPositions.map((entry) => ({
    layerId: entry.layerId,
    horizontalDelta: Math.hypot(Number(entry.worldCenter.x) - expectedWorldCenter.x, Number(entry.worldCenter.z) - expectedWorldCenter.z)
  }));
  const maxHorizontalDelta = Math.max(0, ...deltas.map((entry) => entry.horizontalDelta));
  const warnings = deltas
    .filter((entry) => entry.horizontalDelta > MISSION_LAYER_ALIGNMENT_TOLERANCE)
    .map((entry) => ({ layerId: entry.layerId, message: `${entry.layerId} differs from canonical cell center by ${round(entry.horizontalDelta)}.` }));
  return {
    cell: { x: Number(cell.x ?? cell.col), y: Number(cell.y ?? cell.row) },
    expectedWorldCenter,
    layerPositions,
    maxHorizontalDelta,
    status: warnings.length ? 'WARN' : 'PASS',
    warnings
  };
}

function defaultLayers(viewModel = {}) {
  return {
    pointerHit: (_cell, expected) => expected,
    visibleCell: (_cell, expected) => expected,
    heatmap: (_cell, expected) => expected,
    dropZone: (_cell, expected) => expected,
    hazard: (_cell, expected) => expected,
    currentArrow: (_cell, expected) => expected,
    priorityTarget: (_cell, expected) => expected,
    glider: (_cell, expected) => expected,
    waypoint: (_cell, expected) => expected,
    routeEndpoint: (_cell, expected) => expected,
    guidanceConeOrigin: (_cell, expected) => expected
  };
}

function fixtureCells(grid = {}) {
  const width = Math.max(1, Number(grid.width ?? 1));
  const height = Math.max(1, Number(grid.height ?? 1));
  return [
    { x: 0, y: 0 },
    { x: Math.max(0, width - 1), y: 0 },
    { x: 0, y: Math.max(0, height - 1) },
    { x: Math.max(0, width - 1), y: Math.max(0, height - 1) },
    { x: Math.floor((width - 1) / 2), y: Math.floor((height - 1) / 2) }
  ];
}

function normalizeWorld(value = {}) {
  return { x: Number(value.x), y: Number(value.y ?? 0), z: Number(value.z) };
}

function round(value, digits = 6) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : null;
}
