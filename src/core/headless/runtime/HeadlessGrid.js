export function createHeadlessGrid(config = {}) {
  const grid = config.grid ?? config.world?.grid ?? config.world ?? config;
  const width = Math.max(1, Math.round(finiteNumber(grid.width, 32)));
  const height = Math.max(1, Math.round(finiteNumber(grid.height, 24)));
  const depthLayers = normalizeDepthLayers(grid.depthLayers ?? config.depthLayers ?? ['surface', 'thermocline', 'deep']);
  return {
    type: 'anchor.headless.grid',
    width,
    height,
    depthLayers,
    depthCount: depthLayers.length,
    shape: [depthLayers.length, height, width],
    coordinateFrame: grid.coordinateFrame ?? 'grid-cell-center-top-left'
  };
}

export function cellCount(grid) {
  return Math.max(0, Number(grid?.width ?? 0) * Number(grid?.height ?? 0) * Number(grid?.depthCount ?? grid?.depthLayers?.length ?? 0));
}

export function createScalarField3d(gridInput, fill = 0) {
  const grid = createHeadlessGrid(gridInput);
  const value = finiteNumber(fill, 0);
  return Array.from({ length: grid.depthCount }, () => (
    Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => value))
  ));
}

export function createVectorField3d(gridInput, fillU = 0, fillV = 0) {
  const grid = createHeadlessGrid(gridInput);
  return {
    u: createScalarField3d(grid, fillU),
    v: createScalarField3d(grid, fillV)
  };
}

export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(1, Math.max(0, number));
}

export function normalizeField3d(field) {
  const stats = field3dStats(field);
  if (!Number.isFinite(stats.min) || !Number.isFinite(stats.max) || stats.max <= stats.min) {
    return mapField3d(field, () => 0);
  }
  return mapField3d(field, (value) => clamp01((Number(value) - stats.min) / (stats.max - stats.min)));
}

export function field3dStats(field) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  let finiteCount = 0;
  forEachFieldCell(field, (value) => {
    count += 1;
    const number = Number(value);
    if (!Number.isFinite(number)) return;
    finiteCount += 1;
    min = Math.min(min, number);
    max = Math.max(max, number);
    sum += number;
  });
  return {
    min: finiteCount ? min : null,
    max: finiteCount ? max : null,
    mean: finiteCount ? sum / finiteCount : null,
    count,
    finiteCount,
    invalidCount: count - finiteCount
  };
}

export function sampleNearest3d(field, x, y, zIndex = 0) {
  const shape = fieldShape(field);
  if (!shape.valid) return 0;
  const z = clampInt(Math.round(zIndex), 0, shape.depth - 1);
  const row = clampInt(Math.round(y), 0, shape.height - 1);
  const col = clampInt(Math.round(x), 0, shape.width - 1);
  return Number(field[z]?.[row]?.[col] ?? 0);
}

export function setCell3d(field, x, y, zIndex, value) {
  const shape = fieldShape(field);
  if (!shape.valid) return field;
  const z = clampInt(Math.round(zIndex), 0, shape.depth - 1);
  const row = clampInt(Math.round(y), 0, shape.height - 1);
  const col = clampInt(Math.round(x), 0, shape.width - 1);
  field[z][row][col] = value;
  return field;
}

export function fieldShape(field) {
  const depth = Array.isArray(field) ? field.length : 0;
  const height = depth && Array.isArray(field[0]) ? field[0].length : 0;
  const width = height && Array.isArray(field[0][0]) ? field[0][0].length : 0;
  const valid = depth > 0 && height > 0 && width > 0 && field.every((layer) => (
    Array.isArray(layer) && layer.length === height && layer.every((row) => Array.isArray(row) && row.length === width)
  ));
  return { valid, depth, height, width, shape: [depth, height, width] };
}

export function validateField3d(field, gridInput) {
  const grid = createHeadlessGrid(gridInput);
  const shape = fieldShape(field);
  const errors = [];
  if (!shape.valid) errors.push('Field must be a rectangular field[z][row][col] array.');
  if (shape.depth !== grid.depthCount) errors.push(`Expected ${grid.depthCount} depth layers, got ${shape.depth}.`);
  if (shape.height !== grid.height) errors.push(`Expected height ${grid.height}, got ${shape.height}.`);
  if (shape.width !== grid.width) errors.push(`Expected width ${grid.width}, got ${shape.width}.`);
  const stats = field3dStats(field);
  if (stats.invalidCount > 0) errors.push(`Field contains ${stats.invalidCount} non-finite values.`);
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : 'PASS', errors, shape, stats };
}

export function cloneField3d(field) {
  return field.map((layer) => layer.map((row) => row.slice()));
}

export function mapField3d(field, mapper) {
  return field.map((layer, z) => layer.map((row, y) => row.map((value, x) => mapper(value, x, y, z))));
}

export function forEachFieldCell(field, visitor) {
  if (!Array.isArray(field)) return;
  for (let z = 0; z < field.length; z += 1) {
    const layer = field[z];
    if (!Array.isArray(layer)) continue;
    for (let y = 0; y < layer.length; y += 1) {
      const row = layer[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < row.length; x += 1) visitor(row[x], x, y, z);
    }
  }
}

function normalizeDepthLayers(value) {
  const layers = Array.isArray(value) ? value : [value];
  const normalized = layers.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  return normalized.length ? normalized : ['surface'];
}

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
