import { isTooShallow } from '../sim/DepthLayer.js';

export function cellFromPoint(point, mode = 'floor') {
  const x = Number(point?.x);
  const y = Number(point?.y);
  const quantize = mode === 'floor' ? Math.floor : Math.round;
  return {
    x: quantize(Number.isFinite(x) ? x : 0),
    y: quantize(Number.isFinite(y) ? y : 0)
  };
}

export function isCellNavigable(level, mission = null, x, y) {
  const cx = Math.floor(Number(x));
  const cy = Math.floor(Number(y));
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

export function describeCellNavigability(level, mission = null, cell = null) {
  if (!cell || !Number.isFinite(Number(cell.x)) || !Number.isFinite(Number(cell.y))) {
    return { status: 'unknown', reason: 'invalidPoint', cell: null, terrainType: 'unknown', source: 'canonicalNavigability' };
  }
  const normalized = cellFromPoint(cell, 'floor');
  const nav = isCellNavigable(level, mission, normalized.x, normalized.y);
  return {
    status: nav.ok ? 'water' : nav.reason === 'terrain' ? 'land' : 'blocked',
    reason: nav.reason,
    cell: normalized,
    terrainType: nav.reason === 'terrain' ? 'land' : nav.ok ? 'water' : nav.reason ?? 'unknown',
    source: 'canonicalNavigability'
  };
}

export function getSegmentCells(start, end) {
  if (!isFinitePoint(start) || !isFinitePoint(end)) return [];
  const sampled = sampleSegmentCells(start, end, 0.25);
  const supercover = supercoverLineCells(cellFromPoint(start, 'floor'), cellFromPoint(end, 'floor'));
  return uniqueCells([...sampled.cells, ...supercover]);
}

export function explainSegmentBlockage(start, end, { level = null, mission = null } = {}) {
  if (!isFinitePoint(start) || !isFinitePoint(end)) {
    return {
      ok: false,
      reason: 'invalidPoint',
      cells: [],
      blockedCells: [],
      blockedAt: isFinitePoint(end) ? cellFromPoint(end, 'floor') : null,
      lastValid: isFinitePoint(start) ? { x: Number(start.x), y: Number(start.y) } : null
    };
  }
  const sample = sampleSegmentCells(start, end, 0.25);
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
  const result = {
    ok: !blockedAt,
    reason: blockedAt?.reason ?? 'clear',
    cells: traversedCells,
    allCells: cells,
    sampledPoints: sample.points,
    sampleSpacing: sample.spacing,
    blockedCells,
    blockedAt,
    lastValid,
    movementModel: 'continuous-segment'
  };
  debugRouteSegmentValidation({ start, end, result });
  return result;
}

export function buildRouteBlockDiagnostic({
  level = null,
  mission = null,
  agentId = null,
  segmentFromIndex = null,
  segmentToIndex = null,
  plannedFrom = null,
  target = null,
  actualStartPosition = null,
  reportedCell = null,
  reason = null,
  source = 'routeValidation'
} = {}) {
  const segmentStart = isFinitePoint(actualStartPosition) ? actualStartPosition : plannedFrom;
  const plannedFromCell = isFinitePoint(plannedFrom) ? cellFromPoint(plannedFrom, 'floor') : null;
  const plannedTargetCell = isFinitePoint(target) ? cellFromPoint(target, 'floor') : null;
  const actualStartCell = isFinitePoint(actualStartPosition) ? cellFromPoint(actualStartPosition, 'floor') : null;
  const normalizedReportedCell = reportedCell && isFinitePoint(reportedCell)
    ? cellFromPoint(reportedCell, 'floor')
    : null;
  const blockage = explainSegmentBlockage(segmentStart, target, { level, mission });
  const startNav = describeCellNavigability(level, mission, actualStartCell ?? plannedFromCell);
  const targetNav = describeCellNavigability(level, mission, plannedTargetCell);
  const segmentBlockedCell = blockage.blockedAt ? { x: blockage.blockedAt.x, y: blockage.blockedAt.y } : null;
  const blockedCell = segmentBlockedCell
    ?? (!startNav || startNav.status === 'water' ? null : startNav.cell)
    ?? (!targetNav || targetNav.status === 'water' ? null : targetNav.cell)
    ?? normalizedReportedCell;
  const blockedCellNav = describeCellNavigability(level, mission, blockedCell);
  const reportedCellNav = describeCellNavigability(level, mission, normalizedReportedCell);
  const blockingReason = classifyRouteBlockReason({
    reason,
    blockage,
    startNav,
    targetNav,
    blockedCell,
    plannedTargetCell,
    actualStartCell
  });
  const diagnostic = {
    agentId,
    segmentFromIndex,
    segmentToIndex,
    plannedFromCell,
    plannedTargetCell,
    actualStartPosition: isFinitePoint(actualStartPosition)
      ? { x: Number(actualStartPosition.x), y: Number(actualStartPosition.y), t: Number(actualStartPosition.t ?? 0) }
      : null,
    actualStartCell,
    traversedCells: (blockage.cells ?? []).map((cell) => {
      const nav = describeCellNavigability(level, mission, cell);
      return {
        x: cell.x,
        y: cell.y,
        navigable: nav.status === 'water',
        terrainType: nav.terrainType,
        reason: nav.reason,
        source: 'segmentTraversal'
      };
    }),
    blocking: {
      blocked: true,
      reason: blockingReason,
      blockedCell,
      blockedCellNavigability: blockedCellNav.status,
      reportedCell: normalizedReportedCell,
      reportedCellNavigability: reportedCellNav.status
    },
    tooltipAgreement: {
      reportedCellMatchesTooltip: normalizedReportedCell
        ? reportedCellNav.status !== 'water' || !blockedCell || sameCell(normalizedReportedCell, blockedCell)
        : true,
      blockedCellMatchesTooltip: !blockedCell || blockedCellNav.status !== 'water'
    },
    source,
    movementModel: 'continuous-segment',
    coordinateConvention: 'x/y'
  };
  debugRouteBlockDiagnostic(diagnostic);
  return diagnostic;
}

function classifyRouteBlockReason({ reason, blockage, startNav, targetNav, blockedCell, plannedTargetCell, actualStartCell } = {}) {
  if (startNav?.status && startNav.status !== 'water') return 'actual_drift_into_land';
  if (targetNav?.status && targetNav.status !== 'water') return 'blocked_endpoint';
  if (String(reason ?? blockage?.reason ?? '').includes('noLegalPath')) return 'no_path';
  if (blockage?.blockedAt) {
    if (plannedTargetCell && sameCell(blockage.blockedAt, plannedTargetCell)) return 'blocked_endpoint';
    if (actualStartCell && sameCell(blockage.blockedAt, actualStartCell)) return 'actual_drift_into_land';
    return 'blocked_by_land';
  }
  return blockedCell ? 'unknown' : 'no_path';
}

function debugRouteBlockDiagnostic(diagnostic) {
  if (!globalThis.ANCHOR_DEBUG_ROUTE_BLOCKS) return;
  globalThis.console?.debug?.('[RouteBlockDiagnostic]', {
    agentId: diagnostic.agentId,
    fromWaypoint: diagnostic.segmentFromIndex,
    toWaypoint: diagnostic.segmentToIndex,
    plannedFromCell: diagnostic.plannedFromCell,
    targetCell: diagnostic.plannedTargetCell,
    actualStartPosition: diagnostic.actualStartPosition,
    actualStartCell: diagnostic.actualStartCell,
    traversedCells: diagnostic.traversedCells,
    blockedCell: diagnostic.blocking.blockedCell,
    blockedReason: diagnostic.blocking.reason,
    reportedCell: diagnostic.blocking.reportedCell,
    reportedCellNavigability: diagnostic.blocking.reportedCellNavigability,
    tooltipNavigability: diagnostic.blocking.reportedCellNavigability,
    coordinateConvention: diagnostic.coordinateConvention
  });
  if (diagnostic.blocking.reportedCell && diagnostic.blocking.reportedCellNavigability === 'water' && diagnostic.blocking.blockedCell) {
    globalThis.console?.warn?.('[RouteBlockDiagnostic][Mismatch]', {
      reportedCell: diagnostic.blocking.reportedCell,
      tooltipSaysNavigable: true,
      validatorSaysBlocked: true,
      actualBlockedCell: diagnostic.blocking.blockedCell,
      suspectedCause: sameCell(diagnostic.blocking.reportedCell, diagnostic.blocking.blockedCell)
        ? 'canonical_lookup_disagreement'
        : 'reported_cell_was_current_position_not_blocking_terrain'
    });
  }
}

export function isSegmentNavigable(start, end, context = {}) {
  return explainSegmentBlockage(start, end, context).ok;
}

export function evaluateReachability(startCell, goalCell, { level = null, mission = null } = {}) {
  const start = cellFromPoint(startCell, 'floor');
  const goal = cellFromPoint(goalCell, 'floor');
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
  const start = cellFromPoint(startCell, 'floor');
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
    x: Math.floor(Number(goal.x)),
    y: Math.floor(Number(goal.y))
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
      if (signX !== 0) cells.push({ x: x + signX, y });
      if (signY !== 0) cells.push({ x, y: y + signY });
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

function sampleSegmentCells(start, end, spacing = 0.25) {
  if (!isFinitePoint(start) || !isFinitePoint(end)) return { points: [], cells: [], spacing };
  const from = { x: Number(start.x), y: Number(start.y) };
  const to = { x: Number(end.x), y: Number(end.y) };
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(length / Math.max(0.05, Number(spacing) || 0.25)));
  const points = [];
  const cells = [];
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const point = {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio
    };
    points.push(point);
    cells.push(cellFromPoint(point, 'floor'));
  }
  return { points, cells: uniqueCells(cells), spacing };
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

function debugRouteSegmentValidation({ start, end, result } = {}) {
  if (!globalThis.ANCHOR_DEBUG_ROUTE_SEGMENTS) return;
  globalThis.console?.debug?.('[RouteSegmentValidation]', {
    from: start ? { x: Number(start.x), y: Number(start.y) } : null,
    to: end ? { x: Number(end.x), y: Number(end.y) } : null,
    segmentLength: isFinitePoint(start) && isFinitePoint(end)
      ? Math.hypot(Number(end.x) - Number(start.x), Number(end.y) - Number(start.y))
      : null,
    sampleSpacing: result?.sampleSpacing ?? null,
    sampledPoints: result?.sampledPoints ?? [],
    sampledCells: result?.cells ?? [],
    blockedCells: result?.blockedCells ?? [],
    clearanceViolations: [],
    movementModel: 'continuous-segment',
    valid: Boolean(result?.ok)
  });
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
  return `${Math.floor(Number(x))},${Math.floor(Number(y))}`;
}

function sameCell(a, b) {
  return Boolean(a && b && Math.floor(Number(a.x)) === Math.floor(Number(b.x)) && Math.floor(Number(a.y)) === Math.floor(Number(b.y)));
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
