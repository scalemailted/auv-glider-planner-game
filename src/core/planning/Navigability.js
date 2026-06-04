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

export function evaluateReachability(startCell, goalCell, { level = null, mission = null } = {}) {
  const start = cellFromPoint(startCell, 'round');
  const goal = cellFromPoint(goalCell, 'round');
  const startNav = isCellNavigable(level, mission, start.x, start.y);
  if (!startNav.ok) return unreachableResult(start, goal, startNav.reason, startNav.cell, []);
  const goalNav = isCellNavigable(level, mission, goal.x, goal.y);
  if (!goalNav.ok) return unreachableResult(start, goal, goalNav.reason, goalNav.cell, []);
  if (start.x === goal.x && start.y === goal.y) {
    return {
      reachable: true,
      reason: 'sameCell',
      start,
      goal,
      pathCells: [start],
      traversedCells: [start],
      cost: 0,
      distance: 0,
      blockedCell: null,
      blockedCells: []
    };
  }

  const field = buildNavigableReachabilityField({ level, mission, startCell: start, goalCell: goal });
  const entry = field.cells.get(cellKey(goal.x, goal.y));
  if (!entry) {
    return unreachableResult(start, goal, 'noLegalPath', null, field.visitedCells);
  }
  const pathCells = reconstructPath(field, goal);
  return {
    reachable: true,
    reason: 'reachable',
    start,
    goal,
    pathCells,
    traversedCells: pathCells,
    cost: entry.cost,
    distance: entry.cost,
    blockedCell: null,
    blockedCells: [],
    movement: field.movement
  };
}

export function buildNavigableReachabilityField({ level = null, mission = null, startCell = null, goalCell = null } = {}) {
  const start = cellFromPoint(startCell, 'round');
  const width = Number(level?.world?.grid?.width ?? 0);
  const height = Number(level?.world?.grid?.height ?? 0);
  const cells = new Map();
  const queue = [];
  const startNav = isCellNavigable(level, mission, start.x, start.y);
  if (!startNav.ok) {
    return {
      start,
      cells,
      visitedCells: [],
      movement: { neighbors: 4, allowDiagonal: false, preventCornerCutting: true }
    };
  }
  cells.set(cellKey(start.x, start.y), { x: start.x, y: start.y, cost: 0, previous: null });
  queue.push(start);
  const targetKey = goalCell ? cellKey(goalCell.x, goalCell.y) : null;
  for (let index = 0; index < queue.length; index += 1) {
    const cell = queue[index];
    const entry = cells.get(cellKey(cell.x, cell.y));
    if (targetKey && cellKey(cell.x, cell.y) === targetKey) break;
    for (const next of neighbors4(cell.x, cell.y)) {
      if (!isInsideLevel(level, next.x, next.y) || !isCellNavigable(level, mission, next.x, next.y).ok) continue;
      const key = cellKey(next.x, next.y);
      if (cells.has(key)) continue;
      cells.set(key, {
        x: next.x,
        y: next.y,
        cost: entry.cost + 1,
        previous: { x: cell.x, y: cell.y }
      });
      queue.push(next);
    }
  }
  return {
    start,
    cells,
    visitedCells: queue,
    movement: { neighbors: 4, allowDiagonal: false, preventCornerCutting: true }
  };
}

function unreachableResult(start, goal, reason, blockedCell = null, visitedCells = []) {
  return {
    reachable: false,
    reason,
    start,
    goal,
    pathCells: [],
    traversedCells: visitedCells,
    cost: Infinity,
    distance: Infinity,
    blockedCell,
    blockedCells: blockedCell ? [blockedCell] : []
  };
}

function reconstructPath(field, goal) {
  const path = [];
  let current = {
    x: Math.round(Number(goal.x)),
    y: Math.round(Number(goal.y))
  };
  const guard = Math.max(1, Number(field?.cells?.size ?? 0) + 1);
  for (let index = 0; index < guard; index += 1) {
    const entry = field.cells.get(cellKey(current.x, current.y));
    if (!entry) break;
    path.push({ x: entry.x, y: entry.y });
    if (!entry.previous) break;
    current = entry.previous;
  }
  return path.reverse();
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

function neighbors4(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
}

function cellKey(x, y) {
  return `${Math.round(Number(x))},${Math.round(Number(y))}`;
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
