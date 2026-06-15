export function createGrid(width = 1, height = 1, fill = 0) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  return Array.from({ length: h }, (_, row) => Array.from({ length: w }, (_, col) => (
    typeof fill === 'function' ? finiteNumber(fill(col, row), 0) : finiteNumber(fill, 0)
  )));
}

export function clamp01(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

export function normalizeField(field) {
  const source = normalizeShape(field);
  const values = source.flat().map((value) => finiteNumber(value, 0));
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  if (!Number.isFinite(min) || !Number.isFinite(max) || Math.abs(max - min) < 1e-12) {
    return source.map((row) => row.map((value) => clamp01(value)));
  }
  if (min >= 0 && max <= 1) return source.map((row) => row.map(clamp01));
  return source.map((row) => row.map((value) => clamp01((finiteNumber(value, 0) - min) / (max - min))));
}

export function gradientMagnitude(field) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  const gradient = createGrid(width, height, 0);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const dx = (cell(source, col + 1, row) - cell(source, col - 1, row)) * 0.5;
      const dy = (cell(source, col, row + 1) - cell(source, col, row - 1)) * 0.5;
      gradient[row][col] = Math.hypot(dx, dy);
    }
  }
  return normalizeField(gradient);
}

export function laplacian(field) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  return createGrid(width, height, (col, row) => (
    cell(source, col - 1, row)
    + cell(source, col + 1, row)
    + cell(source, col, row - 1)
    + cell(source, col, row + 1)
    - 4 * cell(source, col, row)
  ));
}

export function sampleBilinear(field, x = 0, y = 0) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  if (!width || !height) return 0;
  const col = Math.max(0, Math.min(width - 1, Number(x) || 0));
  const row = Math.max(0, Math.min(height - 1, Number(y) || 0));
  const x0 = Math.floor(col);
  const y0 = Math.floor(row);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = col - x0;
  const ty = row - y0;
  const a = cell(source, x0, y0) * (1 - tx) + cell(source, x1, y0) * tx;
  const b = cell(source, x0, y1) * (1 - tx) + cell(source, x1, y1) * tx;
  return finiteNumber(a * (1 - ty) + b * ty, 0);
}

export function advectSemiLagrangian(field, flowSampler, dt = 1, dx = null, dy = null) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  const cellDx = Number(dx) > 0 ? Number(dx) : 1 / Math.max(1, width);
  const cellDy = Number(dy) > 0 ? Number(dy) : 1 / Math.max(1, height);
  const step = finiteNumber(dt, 0);
  return createGrid(width, height, (col, row) => {
    const x = (col + 0.5) / Math.max(1, width);
    const y = (row + 0.5) / Math.max(1, height);
    const flow = typeof flowSampler === 'function' ? flowSampler({ x, y, col, row }) ?? {} : {};
    const backCol = col - finiteNumber(flow.u, 0) * step / cellDx;
    const backRow = row - finiteNumber(flow.v, 0) * step / cellDy;
    return clamp01(sampleBilinear(source, backCol, backRow));
  });
}

export function fieldStats(field) {
  const source = normalizeShape(field);
  const values = source.flat().map((value) => finiteNumber(value, 0));
  const count = values.length;
  const total = values.reduce((sum, value) => sum + value, 0);
  const min = count ? Math.min(...values) : 0;
  const max = count ? Math.max(...values) : 0;
  return {
    min,
    mean: count ? total / count : 0,
    max,
    total,
    count,
    finiteCount: values.filter(Number.isFinite).length
  };
}

export function fieldDifference(a, b) {
  const left = normalizeShape(a);
  const height = left.length;
  const width = left[0]?.length ?? 0;
  return createGrid(width, height, (col, row) => Math.abs(cell(left, col, row) - cell(b, col, row)));
}

export function centroidOfMass(field) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  let total = 0;
  let xSum = 0;
  let ySum = 0;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const value = Math.max(0, finiteNumber(source[row][col], 0));
      total += value;
      xSum += ((col + 0.5) / Math.max(1, width)) * value;
      ySum += ((row + 0.5) / Math.max(1, height)) * value;
    }
  }
  return {
    x: total > 0 ? xSum / total : 0.5,
    y: total > 0 ? ySum / total : 0.5,
    col: total > 0 ? (xSum / total) * width - 0.5 : (width - 1) / 2,
    row: total > 0 ? (ySum / total) * height - 0.5 : (height - 1) / 2,
    total
  };
}

export function maskField(field, mask) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  return createGrid(width, height, (col, row) => clamp01(cell(source, col, row) * clamp01(cell(mask, col, row, 1))));
}

export function combineWeightedFields(fields = []) {
  const entries = fields
    .map((entry) => Array.isArray(entry) ? { field: entry, weight: 1 } : entry)
    .filter((entry) => Array.isArray(entry?.field));
  const first = normalizeShape(entries[0]?.field);
  const height = first.length || 1;
  const width = first[0]?.length || 1;
  const weightTotal = entries.reduce((sum, entry) => sum + Math.max(0, finiteNumber(entry.weight, 1)), 0) || 1;
  return createGrid(width, height, (col, row) => {
    const total = entries.reduce((sum, entry) => {
      const weight = Math.max(0, finiteNumber(entry.weight, 1));
      return sum + cell(entry.field, col, row) * weight;
    }, 0);
    return clamp01(total / weightTotal);
  });
}

export function normalizeShape(field, width = null, height = null, fill = 0) {
  const h = Math.max(1, Math.round(Number(height ?? field?.length ?? 1) || 1));
  const w = Math.max(1, Math.round(Number(width ?? field?.[0]?.length ?? 1) || 1));
  return createGrid(w, h, (col, row) => finiteNumber(field?.[row]?.[col], fill));
}

function cell(field, col, row, fallback = 0) {
  const height = Array.isArray(field) ? field.length : 0;
  const width = field?.[0]?.length ?? 0;
  if (!height || !width) return fallback;
  const x = Math.max(0, Math.min(width - 1, Math.round(Number(col) || 0)));
  const y = Math.max(0, Math.min(height - 1, Math.round(Number(row) || 0)));
  return finiteNumber(field?.[y]?.[x], fallback);
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
