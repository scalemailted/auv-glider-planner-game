import { gridCellToWorld, worldToGridCell } from './MissionWorldCoordinates.js';

export const MISSION_WORLD_POINTER_COORDINATES_VERSION = 'mission-world-pointer-coordinates-three-r1-1';

export function pointerClientToCanvasLocal(pointer = {}, canvasRect = {}) {
  const rect = normalizeCanvasRect(canvasRect);
  const clientX = finiteNumber(pointer.clientX ?? pointer.x, rect.left);
  const clientY = finiteNumber(pointer.clientY ?? pointer.y, rect.top);
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
    clientX,
    clientY,
    inside: clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  };
}

export function canvasLocalToNdc(localPoint = {}, canvasRect = {}) {
  const rect = normalizeCanvasRect(canvasRect);
  const x = finiteNumber(localPoint.x, 0);
  const y = finiteNumber(localPoint.y, 0);
  return {
    x: (x / Math.max(1, rect.width)) * 2 - 1,
    y: -((y / Math.max(1, rect.height)) * 2 - 1)
  };
}

export function pointerClientToNdc(pointer = {}, canvasRect = {}) {
  const local = pointerClientToCanvasLocal(pointer, canvasRect);
  return { local, ndc: canvasLocalToNdc(local, canvasRect) };
}

export function gridCellCenterToWorld(transform, col, row, depthMeters = 0) {
  return gridCellToWorld(transform, col, row, depthMeters);
}

export function worldPointToGridCell(transform, point = {}) {
  const cell = worldToGridCell(transform, point.x, point.y, point.z);
  return cell.inside ? { x: cell.x, y: cell.y, col: cell.col, row: cell.row, depthMeters: cell.depthMeters, inside: true } : null;
}

export function projectGridCellToCanvas(cameraProjection = {}, transform, cell = {}) {
  const world = gridCellCenterToWorld(transform, cell.x ?? cell.col, cell.y ?? cell.row, cell.depthMeters ?? 0);
  if (typeof cameraProjection.projectWorldPoint !== 'function') return { world, canvas: null, ndc: null };
  const projected = cameraProjection.projectWorldPoint(world);
  return { world, canvas: projected?.canvas ?? projected ?? null, ndc: projected?.ndc ?? null };
}

export function validatePointerGridRoundtrip(options = {}) {
  const transform = options.transform;
  const cell = options.cell;
  const world = gridCellCenterToWorld(transform, cell.x ?? cell.col, cell.y ?? cell.row, cell.depthMeters ?? 0);
  const resolved = typeof options.worldToGrid === 'function'
    ? options.worldToGrid(world)
    : worldPointToGridCell(transform, world);
  const ok = Boolean(resolved && Math.round(resolved.x) === Math.round(cell.x ?? cell.col) && Math.round(resolved.y) === Math.round(cell.y ?? cell.row));
  return {
    type: 'anchor.rendering.pointer-grid-roundtrip-validation',
    version: MISSION_WORLD_POINTER_COORDINATES_VERSION,
    ok,
    expectedGridCell: { x: Math.round(Number(cell.x ?? cell.col)), y: Math.round(Number(cell.y ?? cell.row)) },
    actualGridCell: resolved ? { x: Math.round(Number(resolved.x)), y: Math.round(Number(resolved.y)) } : null,
    world,
    toleranceCells: finiteNumber(options.toleranceCells, 0)
  };
}

export function normalizeCanvasRect(rect = {}) {
  const left = finiteNumber(rect.left, 0);
  const top = finiteNumber(rect.top, 0);
  const width = Math.max(1, finiteNumber(rect.width, finiteNumber(rect.right, left + 1) - left));
  const height = Math.max(1, finiteNumber(rect.height, finiteNumber(rect.bottom, top + 1) - top));
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
