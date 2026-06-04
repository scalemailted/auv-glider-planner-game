import { isTooShallow } from '../sim/DepthLayer.js';

export function cellFromPoint(point, mode = 'round') {
  const x = Number(point?.x);
  const y = Number(point?.y);
  const quantize = mode === 'floor' ? Math.floor : Math.round;
  return {
    x: quantize(Number.isFinite(x) ? x : 0),
    y: quantize(Number.isFinite(y) ? y : 0)
  };
}

export function isCellNavigable(level, mission = null, x, y) {
  const cx = Math.round(Number(x));
  const cy = Math.round(Number(y));
  if (!isInsideLevel(level, cx, cy)) {
    return { ok: false, reason: 'outsideMap', cell: { x: cx, y: cy }, terrain: null };
  }
  const terrain = level?.layers?.terrain?.[cy]?.[cx] ?? 0;
  if (terrain) {
    return { ok: false, reason: 'terrain', cell: { x: cx, y: cy }, terrain };
  }
  if (isTooShallow(level, mission, cx, cy)) {
    return { ok: false, reason: 'tooShallow', cell: { x: cx, y: cy }, terrain };
  }
  return { ok: true, reason: 'water', cell: { x: cx, y: cy }, terrain };
}

export function isPointNavigable(level, mission = null, point) {
  const cell = cellFromPoint(point, 'floor');
  return isCellNavigable(level, mission, cell.x, cell.y);
}

export function getSegmentCells(start, end) {
  if (!isFinitePoint(start) || !isFinitePoint(end)) return [];
  return supercoverLineCells(cellFromPoint(start, 'round'), cellFromPoint(end, 'round'));
}

export function explainSegmentBlockage(start, end, { level = null, mission = null } = {}) {
  if (!isFinitePoint(start) || !isFinitePoint(end)) {
    return {
      ok: false,
      reason: 'invalidPoint',
      cells: [],
      blockedCells: [],
      blockedAt: isFinitePoint(end) ? cellFromPoint(end) : null,
      lastValid: isFinitePoint(start) ? { x: Number(start.x), y: Number(start.y) } : null
    };
  }
  const cells = getSegmentCells(start, end);
  const traversedCells = [];
  const blockedCells = [];
  let lastValid = { x: Number(start.x), y: Number(start.y) };
  for (const cell of cells) {
    traversedCells.push(cell);
    const nav = isCellNavigable(level, mission, cell.x, cell.y);
    if (!nav.ok) {
      blockedCells.push({ ...cell, reason: nav.reason, terrain: nav.terrain });
      break;
    }
    lastValid = { x: cell.x, y: cell.y };
  }
  const blockedAt = blockedCells[0] ?? null;
  return {
    ok: !blockedAt,
    reason: blockedAt?.reason ?? 'clear',
    cells: traversedCells,
    allCells: cells,
    blockedCells,
    blockedAt,
    lastValid
  };
}

export function isSegmentNavigable(start, end, context = {}) {
  return explainSegmentBlockage(start, end, context).ok;
}

function supercoverLineCells(start, end) {
  let x = start.x;
  let y = start.y;
  const endX = end.x;
  const endY = end.y;
  const dx = endX - x;
  const dy = endY - y;
  const nx = Math.abs(dx);
  const ny = Math.abs(dy);
  const signX = Math.sign(dx);
  const signY = Math.sign(dy);
  const cells = [{ x, y }];
  let ix = 0;
  let iy = 0;

  while (ix < nx || iy < ny) {
    const nextX = (0.5 + ix) / Math.max(1, nx);
    const nextY = (0.5 + iy) / Math.max(1, ny);
    if (nextX === nextY) {
      x += signX;
      y += signY;
      ix += 1;
      iy += 1;
    } else if (nextX < nextY) {
      x += signX;
      ix += 1;
    } else {
      y += signY;
      iy += 1;
    }
    cells.push({ x, y });
  }
  return uniqueCells(cells);
}

function uniqueCells(cells) {
  const seen = new Set();
  const result = [];
  for (const cell of cells) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cell);
  }
  return result;
}

function isInsideLevel(level, x, y) {
  const grid = level?.world?.grid ?? {};
  return x >= 0 && y >= 0 && x < Number(grid.width ?? 0) && y < Number(grid.height ?? 0);
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
