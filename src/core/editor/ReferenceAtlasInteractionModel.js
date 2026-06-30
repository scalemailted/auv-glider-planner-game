import { referenceAtlasViewport } from './ReferenceBathymetryAtlas.js';

export const REFERENCE_ATLAS_RECTANGLE_EDITOR_VERSION = 'reference-atlas-box-edit-r1';
export const REFERENCE_ATLAS_RECTANGLE_HIT_TARGET_PX = 14;

export const REFERENCE_ATLAS_RECTANGLE_DRAG_MODES = Object.freeze({
  none: 'none',
  draw: 'draw',
  move: 'move',
  resizeNorth: 'resizeNorth',
  resizeSouth: 'resizeSouth',
  resizeEast: 'resizeEast',
  resizeWest: 'resizeWest',
  resizeNorthEast: 'resizeNorthEast',
  resizeNorthWest: 'resizeNorthWest',
  resizeSouthEast: 'resizeSouthEast',
  resizeSouthWest: 'resizeSouthWest'
});

export const REFERENCE_ATLAS_RECTANGLE_HANDLES = Object.freeze([
  'north',
  'south',
  'east',
  'west',
  'northEast',
  'northWest',
  'southEast',
  'southWest',
  'center'
]);

const HANDLE_META = Object.freeze({
  north: { dragMode: 'resizeNorth', cursor: 'ns-resize' },
  south: { dragMode: 'resizeSouth', cursor: 'ns-resize' },
  east: { dragMode: 'resizeEast', cursor: 'ew-resize' },
  west: { dragMode: 'resizeWest', cursor: 'ew-resize' },
  northEast: { dragMode: 'resizeNorthEast', cursor: 'nesw-resize' },
  northWest: { dragMode: 'resizeNorthWest', cursor: 'nwse-resize' },
  southEast: { dragMode: 'resizeSouthEast', cursor: 'nwse-resize' },
  southWest: { dragMode: 'resizeSouthWest', cursor: 'nesw-resize' },
  center: { dragMode: 'move', cursor: 'move' }
});

export function referenceAtlasRectangleGeometry(input = {}) {
  const bounds = normalizeBoundsOrNull(input.selectedBounds ?? input.bounds);
  const canvasSize = normalizeCanvasSize(input.canvasSize);
  const hitTargetPx = positive(input.hitTargetPx, REFERENCE_ATLAS_RECTANGLE_HIT_TARGET_PX);
  const selectedScreenRect = bounds
    ? referenceAtlasBoundsToScreenRect(bounds, input.worldView ?? {}, input.atlas, canvasSize)
    : null;
  const handles = selectedScreenRect ? referenceAtlasRectangleHandles(selectedScreenRect, hitTargetPx) : emptyHandles();
  return {
    version: REFERENCE_ATLAS_RECTANGLE_EDITOR_VERSION,
    enabled: input.enabled !== false,
    selectedBounds: bounds,
    selectedScreenRect,
    handles,
    activeHandle: input.activeHandle ?? null,
    activeDragMode: input.activeDragMode ?? REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
    hoverHandle: input.hoverHandle ?? null,
    hitTargetPx,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false
  };
}

export function hitTestReferenceAtlasRectangle(pointInput = {}, geometryInput = {}, options = {}) {
  const geometry = geometryInput?.selectedScreenRect
    ? geometryInput
    : referenceAtlasRectangleGeometry(geometryInput);
  const point = normalizePoint(pointInput);
  if (!geometry.enabled || !geometry.selectedScreenRect) return hitResult(null);
  const handles = geometry.handles ?? {};
  const cornerPriority = ['northWest', 'northEast', 'southWest', 'southEast'];
  const edgePriority = ['west', 'east', 'north', 'south'];
  for (const handle of cornerPriority) {
    if (rectContains(handles[handle]?.hitRect, point)) return hitResult(handle);
  }
  for (const handle of edgePriority) {
    if (rectContains(handles[handle]?.hitRect, point)) return hitResult(handle);
  }
  const centerRect = options.centerRect ?? handles.center?.hitRect ?? geometry.selectedScreenRect;
  if (rectContains(centerRect, point)) return hitResult('center');
  return hitResult(null);
}

export function referenceAtlasCursorForDragMode(mode = 'none', fallback = 'grab') {
  if (mode === 'draw') return 'crosshair';
  if (mode === 'move') return 'move';
  if (mode === 'resizeEast' || mode === 'resizeWest') return 'ew-resize';
  if (mode === 'resizeNorth' || mode === 'resizeSouth') return 'ns-resize';
  if (mode === 'resizeNorthEast' || mode === 'resizeSouthWest') return 'nesw-resize';
  if (mode === 'resizeNorthWest' || mode === 'resizeSouthEast') return 'nwse-resize';
  return fallback;
}

export function referenceAtlasUpdateBoundsForDrag(input = {}) {
  const initialBounds = normalizeBounds(input.initialBounds ?? input.bounds);
  const dragMode = String(input.dragMode ?? REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none);
  if (dragMode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none || dragMode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.draw) {
    return dragUpdateResult(initialBounds, dragMode, [], [], true);
  }
  const worldBounds = normalizeWorldBounds(input.worldBounds ?? input.atlas?.overviewBounds ?? input.atlas?.bounds);
  const minLonSpan = positive(input.minLonSpanDegrees, 0.05);
  const minLatSpan = positive(input.minLatSpanDegrees, 0.05);
  if (dragMode === REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.move) {
    const start = normalizeLonLat(input.startLonLat);
    const current = normalizeLonLat(input.currentLonLat);
    const deltaLon = current.lon - start.lon;
    const deltaLat = current.lat - start.lat;
    const bounds = moveReferenceAtlasBounds(initialBounds, deltaLon, deltaLat, worldBounds);
    return dragUpdateResult(bounds, dragMode, ['westLon', 'eastLon', 'southLat', 'northLat'], [], true);
  }
  const resize = resizeReferenceAtlasBounds(initialBounds, dragMode, normalizeLonLat(input.currentLonLat), {
    worldBounds,
    minLonSpanDegrees: minLonSpan,
    minLatSpanDegrees: minLatSpan
  });
  return resize;
}

export function moveReferenceAtlasBounds(boundsInput = {}, deltaLon = 0, deltaLat = 0, worldInput = {}) {
  const bounds = normalizeBounds(boundsInput);
  const world = normalizeWorldBounds(worldInput);
  const width = Math.min(world.eastLon - world.westLon, bounds.eastLon - bounds.westLon);
  const height = Math.min(world.northLat - world.southLat, bounds.northLat - bounds.southLat);
  let westLon = bounds.westLon + Number(deltaLon ?? 0);
  let southLat = bounds.southLat + Number(deltaLat ?? 0);
  westLon = clampNumber(westLon, world.westLon, world.eastLon - width);
  southLat = clampNumber(southLat, world.southLat, world.northLat - height);
  return normalizeBounds({
    westLon,
    eastLon: westLon + width,
    southLat,
    northLat: southLat + height
  });
}

export function resizeReferenceAtlasBounds(boundsInput = {}, dragMode = 'none', pointerLonLatInput = {}, options = {}) {
  const start = normalizeBounds(boundsInput);
  const pointer = normalizeLonLat(pointerLonLatInput);
  const world = normalizeWorldBounds(options.worldBounds);
  const minLonSpan = positive(options.minLonSpanDegrees, 0.05);
  const minLatSpan = positive(options.minLatSpanDegrees, 0.05);
  const next = { ...start };
  const changed = [];
  const fixed = [];

  const resizeWest = dragMode === 'resizeWest' || dragMode === 'resizeNorthWest' || dragMode === 'resizeSouthWest';
  const resizeEast = dragMode === 'resizeEast' || dragMode === 'resizeNorthEast' || dragMode === 'resizeSouthEast';
  const resizeNorth = dragMode === 'resizeNorth' || dragMode === 'resizeNorthEast' || dragMode === 'resizeNorthWest';
  const resizeSouth = dragMode === 'resizeSouth' || dragMode === 'resizeSouthEast' || dragMode === 'resizeSouthWest';

  if (resizeWest) {
    next.westLon = clampNumber(pointer.lon, world.westLon, start.eastLon - minLonSpan);
    changed.push('westLon');
    fixed.push('eastLon');
  }
  if (resizeEast) {
    next.eastLon = clampNumber(pointer.lon, start.westLon + minLonSpan, world.eastLon);
    changed.push('eastLon');
    fixed.push('westLon');
  }
  if (resizeNorth) {
    next.northLat = clampNumber(pointer.lat, start.southLat + minLatSpan, world.northLat);
    changed.push('northLat');
    fixed.push('southLat');
  }
  if (resizeSouth) {
    next.southLat = clampNumber(pointer.lat, world.southLat, start.northLat - minLatSpan);
    changed.push('southLat');
    fixed.push('northLat');
  }

  const normalized = normalizeBounds(next);
  const preserved = fixed.every((key) => Math.abs(Number(normalized[key]) - Number(start[key])) < 1e-6);
  return dragUpdateResult(normalized, dragMode, changed, [...new Set(fixed)], preserved);
}

export function referenceAtlasBoundsToScreenRect(boundsInput = {}, worldView = {}, atlas = null, canvasSizeInput = {}) {
  const bounds = normalizeBounds(boundsInput);
  const canvasSize = normalizeCanvasSize(canvasSizeInput);
  const viewport = referenceAtlasViewport(worldView, atlas);
  const westX = ((bounds.westLon - viewport.lonWest) / Math.max(0.000001, viewport.lonEast - viewport.lonWest)) * canvasSize.width;
  const eastX = ((bounds.eastLon - viewport.lonWest) / Math.max(0.000001, viewport.lonEast - viewport.lonWest)) * canvasSize.width;
  const northY = ((viewport.latNorth - bounds.northLat) / Math.max(0.000001, viewport.latNorth - viewport.latSouth)) * canvasSize.height;
  const southY = ((viewport.latNorth - bounds.southLat) / Math.max(0.000001, viewport.latNorth - viewport.latSouth)) * canvasSize.height;
  const x = Math.min(westX, eastX);
  const y = Math.min(northY, southY);
  return {
    x: round(x),
    y: round(y),
    width: round(Math.abs(eastX - westX)),
    height: round(Math.abs(southY - northY)),
    left: round(x),
    right: round(Math.max(westX, eastX)),
    top: round(y),
    bottom: round(Math.max(northY, southY)),
    centerX: round((westX + eastX) / 2),
    centerY: round((northY + southY) / 2)
  };
}

function referenceAtlasRectangleHandles(rect = {}, hitTargetPx = REFERENCE_ATLAS_RECTANGLE_HIT_TARGET_PX) {
  const target = positive(hitTargetPx, REFERENCE_ATLAS_RECTANGLE_HIT_TARGET_PX);
  const left = Number(rect.left ?? rect.x ?? 0);
  const right = Number(rect.right ?? left + Number(rect.width ?? 0));
  const top = Number(rect.top ?? rect.y ?? 0);
  const bottom = Number(rect.bottom ?? top + Number(rect.height ?? 0));
  const centerX = Number(rect.centerX ?? (left + right) / 2);
  const centerY = Number(rect.centerY ?? (top + bottom) / 2);
  return {
    north: handle('north', centerX, top, edgeRect(left, right, top, target, 'horizontal')),
    south: handle('south', centerX, bottom, edgeRect(left, right, bottom, target, 'horizontal')),
    east: handle('east', right, centerY, edgeRect(top, bottom, right, target, 'vertical')),
    west: handle('west', left, centerY, edgeRect(top, bottom, left, target, 'vertical')),
    northEast: handle('northEast', right, top, squareRect(right, top, target)),
    northWest: handle('northWest', left, top, squareRect(left, top, target)),
    southEast: handle('southEast', right, bottom, squareRect(right, bottom, target)),
    southWest: handle('southWest', left, bottom, squareRect(left, bottom, target)),
    center: handle('center', centerX, centerY, { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) })
  };
}

function handle(handleId, x, y, hitRect) {
  const meta = HANDLE_META[handleId] ?? HANDLE_META.center;
  return {
    handle: handleId,
    x: round(x),
    y: round(y),
    hitRect,
    dragMode: meta.dragMode,
    cursor: meta.cursor
  };
}

function squareRect(x, y, target) {
  return {
    x: round(Number(x) - target),
    y: round(Number(y) - target),
    width: round(target * 2),
    height: round(target * 2)
  };
}

function edgeRect(a, b, fixed, target, orientation) {
  if (orientation === 'horizontal') {
    return {
      x: round(Math.min(a, b) - target),
      y: round(Number(fixed) - target),
      width: round(Math.abs(b - a) + target * 2),
      height: round(target * 2)
    };
  }
  return {
    x: round(Number(fixed) - target),
    y: round(Math.min(a, b) - target),
    width: round(target * 2),
    height: round(Math.abs(b - a) + target * 2)
  };
}

function emptyHandles() {
  return Object.fromEntries(REFERENCE_ATLAS_RECTANGLE_HANDLES.map((handleId) => [handleId, null]));
}

function hitResult(handle) {
  const meta = handle ? HANDLE_META[handle] : null;
  return {
    hit: Boolean(handle),
    handle,
    dragMode: meta?.dragMode ?? REFERENCE_ATLAS_RECTANGLE_DRAG_MODES.none,
    cursor: meta?.cursor ?? null
  };
}

function dragUpdateResult(bounds, dragMode, changedSides, fixedSides, preserved) {
  return {
    bounds,
    dragMode,
    changedSides,
    fixedSides,
    lastResizePreservedOppositeEdge: preserved === true,
    hiddenTruthExposed: false,
    rawExternalDataPathExposed: false
  };
}

function rectContains(rect = null, point = {}) {
  if (!rect) return false;
  const x = Number(point.x);
  const y = Number(point.y);
  return x >= Number(rect.x)
    && x <= Number(rect.x) + Number(rect.width)
    && y >= Number(rect.y)
    && y <= Number(rect.y) + Number(rect.height);
}

function normalizePoint(input = {}) {
  return {
    x: finite(input.x, 0),
    y: finite(input.y, 0)
  };
}

function normalizeLonLat(input = {}) {
  return {
    lon: finite(input.lon ?? input.longitude ?? input.x, 0),
    lat: finite(input.lat ?? input.latitude ?? input.y, 0)
  };
}

function normalizeBoundsOrNull(input = null) {
  if (!input) return null;
  const values = [input.westLon ?? input.west, input.eastLon ?? input.east, input.southLat ?? input.south, input.northLat ?? input.north].map(Number);
  if (!values.every(Number.isFinite)) return null;
  return normalizeBounds(input);
}

function normalizeBounds(input = {}) {
  const westLon = clampNumber(input.westLon ?? input.west, -180, 180);
  const eastLon = clampNumber(input.eastLon ?? input.east, -180, 180);
  const southLat = clampNumber(input.southLat ?? input.south, -90, 90);
  const northLat = clampNumber(input.northLat ?? input.north, -90, 90);
  return {
    westLon: round(Math.min(westLon, eastLon)),
    eastLon: round(Math.max(westLon, eastLon)),
    southLat: round(Math.min(southLat, northLat)),
    northLat: round(Math.max(southLat, northLat))
  };
}

function normalizeWorldBounds(input = null) {
  const fallback = { westLon: -180, eastLon: 180, southLat: -90, northLat: 90 };
  if (!input) return fallback;
  return normalizeBounds({
    westLon: input.westLon ?? input.west ?? fallback.westLon,
    eastLon: input.eastLon ?? input.east ?? fallback.eastLon,
    southLat: input.southLat ?? input.south ?? fallback.southLat,
    northLat: input.northLat ?? input.north ?? fallback.northLat
  });
}

function normalizeCanvasSize(input = {}) {
  return {
    width: positive(input.width ?? input.clientWidth, 900),
    height: positive(input.height ?? input.clientHeight, 450)
  };
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}
