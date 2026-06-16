export function createScalarField(width, height, fill = 0) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  return Array.from({ length: h }, (_row, y) => Array.from({ length: w }, (_col, x) => {
    const value = typeof fill === 'function' ? fill(x, y) : fill;
    return round6(Number.isFinite(Number(value)) ? Number(value) : 0);
  }));
}

export function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

export function normalizeField(field) {
  const normalized = normalizeShape(field);
  const values = normalized.flat().filter((value) => Number.isFinite(value));
  if (!values.length) return normalized;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max > min && (min < 0 || max > 1)) {
    return normalized.map((row) => row.map((value) => round6(clamp01((value - min) / (max - min)))));
  }
  return normalized.map((row) => row.map((value) => round6(clamp01(value))));
}

export function fieldStats(field) {
  const values = normalizeShape(field).flat();
  const count = values.length;
  if (!count) return { min: 0, max: 0, mean: 0, total: 0, totalValue: 0, count: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    min: round6(min),
    max: round6(max),
    mean: round6(total / count),
    total: round6(total),
    totalValue: round6(total),
    count
  };
}

export function fieldDifference(a, b) {
  const { width, height } = sharedDimensions(a, b);
  return createScalarField(width, height, (x, y) => round6(valueAt(a, x, y) - valueAt(b, x, y)));
}

export function absFieldDifference(a, b) {
  const { width, height } = sharedDimensions(a, b);
  return createScalarField(width, height, (x, y) => round6(clamp01(Math.abs(valueAt(a, x, y) - valueAt(b, x, y)))));
}

export function gradientMagnitude(field) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  return createScalarField(width, height, (x, y) => {
    const left = valueAt(source, Math.max(0, x - 1), y);
    const right = valueAt(source, Math.min(width - 1, x + 1), y);
    const up = valueAt(source, x, Math.max(0, y - 1));
    const down = valueAt(source, x, Math.min(height - 1, y + 1));
    return clamp01(Math.hypot((right - left) * 0.5, (down - up) * 0.5));
  });
}

export function sampleBilinear(field, x, y) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  if (!width || !height) return 0;
  const sx = Math.max(0, Math.min(width - 1, Number(x) || 0));
  const sy = Math.max(0, Math.min(height - 1, Number(y) || 0));
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = sx - x0;
  const ty = sy - y0;
  const a = valueAt(source, x0, y0) * (1 - tx) + valueAt(source, x1, y0) * tx;
  const b = valueAt(source, x0, y1) * (1 - tx) + valueAt(source, x1, y1) * tx;
  return round6(a * (1 - ty) + b * ty);
}

export function distanceToNearestObservationField(observations = [], width, height) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const points = normalizeObservations(observations);
  if (!points.length) return createScalarField(w, h, 1);
  const maxDistance = Math.max(1, Math.hypot(w - 1, h - 1));
  return createScalarField(w, h, (x, y) => {
    const nearest = points.reduce((best, point) => Math.min(best, Math.hypot(x - point.x, y - point.y)), Infinity);
    return clamp01(nearest / maxDistance);
  });
}

export function smoothKernelFieldFromObservations(observations = [], width, height, options = {}) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const points = normalizeObservations(observations);
  const lengthScale = Math.max(0.25, Number(options.lengthScale ?? options.radius ?? 2.5) || 2.5);
  const fallback = Number.isFinite(Number(options.fallback)) ? Number(options.fallback) : 0;
  if (!points.length) return createScalarField(w, h, fallback);
  return createScalarField(w, h, (x, y) => {
    let weighted = 0;
    let totalWeight = 0;
    for (const point of points) {
      const d2 = (x - point.x) ** 2 + (y - point.y) ** 2;
      const weight = Math.exp(-d2 / (2 * lengthScale ** 2));
      weighted += weight * point.value;
      totalWeight += weight;
    }
    if (totalWeight <= 0) return fallback;
    const localMean = weighted / totalWeight;
    const influence = clamp01(totalWeight / (totalWeight + 0.35));
    return clamp01(fallback * (1 - influence) + localMean * influence);
  });
}

export function blendFields(a, b, weight = 0.5) {
  const { width, height } = sharedDimensions(a, b);
  const weightField = Array.isArray(weight) ? weight : null;
  const scalarWeight = clamp01(weight);
  return createScalarField(width, height, (x, y) => {
    const w = weightField ? clamp01(valueAt(weightField, x, y)) : scalarWeight;
    return clamp01(valueAt(a, x, y) * (1 - w) + valueAt(b, x, y) * w);
  });
}

export function maskField(field, mask) {
  const source = normalizeShape(field);
  const height = source.length;
  const width = source[0]?.length ?? 0;
  return createScalarField(width, height, (x, y) => valueAt(source, x, y) * clamp01(valueAt(mask, x, y, 1)));
}

export function finiteFieldCheck(field) {
  const errors = [];
  if (!Array.isArray(field) || !field.length) {
    return { ok: false, width: 0, height: 0, errors: ['Field must be a non-empty 2D array.'] };
  }
  const height = field.length;
  const width = Array.isArray(field[0]) ? field[0].length : 0;
  if (!width) errors.push('Field rows must be non-empty arrays.');
  for (let y = 0; y < height; y += 1) {
    if (!Array.isArray(field[y]) || field[y].length !== width) {
      errors.push(`Row ${y} has an inconsistent width.`);
      continue;
    }
    for (let x = 0; x < width; x += 1) {
      if (!Number.isFinite(Number(field[y][x]))) errors.push(`Cell ${x},${y} is not finite.`);
    }
  }
  return { ok: errors.length === 0, width, height, errors };
}

export function cloneScalarField(field) {
  return normalizeShape(field).map((row) => row.map((value) => round6(value)));
}

function normalizeShape(field) {
  if (!Array.isArray(field) || !field.length) return [];
  const width = Math.max(0, ...field.map((row) => Array.isArray(row) ? row.length : 0));
  if (!width) return [];
  return field.map((row) => Array.from({ length: width }, (_entry, x) => {
    const value = Array.isArray(row) ? Number(row[x]) : 0;
    return Number.isFinite(value) ? value : 0;
  }));
}

function sharedDimensions(a, b) {
  const height = Math.max(Array.isArray(a) ? a.length : 0, Array.isArray(b) ? b.length : 0, 1);
  const width = Math.max(
    Array.isArray(a?.[0]) ? a[0].length : 0,
    Array.isArray(b?.[0]) ? b[0].length : 0,
    1
  );
  return { width, height };
}

function valueAt(field, x, y, fallback = 0) {
  const value = Number(field?.[y]?.[x]);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeObservations(observations = []) {
  return observations
    .map((observation) => {
      const x = Number(observation.x ?? observation.col);
      const y = Number(observation.y ?? observation.row);
      const value = Number(observation.observedValue ?? observation.value ?? observation.truthValue ?? observation.expectedValue ?? 0);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y, value: clamp01(value) };
    })
    .filter(Boolean);
}

function round6(value) {
  return Number((Number(value) || 0).toFixed(6));
}