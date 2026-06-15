const EPSILON = 1e-9;

export function createVectorGrid(width, height, fill = { u: 0, v: 0 }) {
  const cols = Math.max(0, Math.floor(clampFinite(width, 0)));
  const rows = Math.max(0, Math.floor(clampFinite(height, 0)));
  return Array.from({ length: rows }, (_row, y) => Array.from({ length: cols }, (_col, x) => {
    const vector = typeof fill === 'function' ? fill(x, y) : fill;
    return normalizeCellVector(vector);
  }));
}

export function clampFinite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function vectorMagnitude(u, v) {
  return Math.hypot(clampFinite(u), clampFinite(v));
}

export function vectorDirectionRadians(u, v) {
  return Math.atan2(clampFinite(v), clampFinite(u));
}

export function normalizeVector(u, v) {
  const x = clampFinite(u);
  const y = clampFinite(v);
  const magnitude = Math.hypot(x, y);
  if (magnitude <= EPSILON) return { u: 0, v: 0, magnitude: 0 };
  return { u: x / magnitude, v: y / magnitude, magnitude };
}

export function sampleVectorBilinear(field, x, y) {
  const height = Array.isArray(field) ? field.length : 0;
  const width = height > 0 && Array.isArray(field[0]) ? field[0].length : 0;
  if (width <= 0 || height <= 0) return { u: 0, v: 0 };
  const px = clamp(clampFinite(x), 0, width - 1);
  const py = clamp(clampFinite(y), 0, height - 1);
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = px - x0;
  const ty = py - y0;
  const a = normalizeCellVector(field[y0]?.[x0]);
  const b = normalizeCellVector(field[y0]?.[x1]);
  const c = normalizeCellVector(field[y1]?.[x0]);
  const d = normalizeCellVector(field[y1]?.[x1]);
  return {
    u: lerp(lerp(a.u, b.u, tx), lerp(c.u, d.u, tx), ty),
    v: lerp(lerp(a.v, b.v, tx), lerp(c.v, d.v, tx), ty)
  };
}

export function flowSpeedStats(vectorField) {
  const values = flattenVectorField(vectorField).map((cell) => Math.hypot(cell.u, cell.v));
  return numericStats(values);
}

export function divergence(vectorField, dx = 1, dy = 1) {
  const { width, height } = fieldDimensions(vectorField);
  const stepX = Math.max(EPSILON, Math.abs(clampFinite(dx, 1)));
  const stepY = Math.max(EPSILON, Math.abs(clampFinite(dy, 1)));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_col, x) => {
    const left = vectorAt(vectorField, x - 1, y);
    const right = vectorAt(vectorField, x + 1, y);
    const down = vectorAt(vectorField, x, y - 1);
    const up = vectorAt(vectorField, x, y + 1);
    return ((right.u - left.u) / (sampleSpan(x, width) * stepX))
      + ((up.v - down.v) / (sampleSpan(y, height) * stepY));
  }));
}

export function vorticity(vectorField, dx = 1, dy = 1) {
  const { width, height } = fieldDimensions(vectorField);
  const stepX = Math.max(EPSILON, Math.abs(clampFinite(dx, 1)));
  const stepY = Math.max(EPSILON, Math.abs(clampFinite(dy, 1)));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_col, x) => {
    const left = vectorAt(vectorField, x - 1, y);
    const right = vectorAt(vectorField, x + 1, y);
    const down = vectorAt(vectorField, x, y - 1);
    const up = vectorAt(vectorField, x, y + 1);
    const dvDx = (right.v - left.v) / (sampleSpan(x, width) * stepX);
    const duDy = (up.u - down.u) / (sampleSpan(y, height) * stepY);
    return dvDx - duDy;
  }));
}

export function strainRate(vectorField, dx = 1, dy = 1) {
  const { width, height } = fieldDimensions(vectorField);
  const stepX = Math.max(EPSILON, Math.abs(clampFinite(dx, 1)));
  const stepY = Math.max(EPSILON, Math.abs(clampFinite(dy, 1)));
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_col, x) => {
    const left = vectorAt(vectorField, x - 1, y);
    const right = vectorAt(vectorField, x + 1, y);
    const down = vectorAt(vectorField, x, y - 1);
    const up = vectorAt(vectorField, x, y + 1);
    const duDx = (right.u - left.u) / (sampleSpan(x, width) * stepX);
    const dvDy = (up.v - down.v) / (sampleSpan(y, height) * stepY);
    const duDy = (up.u - down.u) / (sampleSpan(y, height) * stepY);
    const dvDx = (right.v - left.v) / (sampleSpan(x, width) * stepX);
    return Math.sqrt((duDx - dvDy) ** 2 + (duDy + dvDx) ** 2);
  }));
}

export function currentAssist(flowVector, travelDirection) {
  const flow = normalizeCellVector(flowVector);
  const direction = normalizeDirection(travelDirection);
  return flow.u * direction.u + flow.v * direction.v;
}

export function crossCurrentMagnitude(flowVector, travelDirection) {
  const flow = normalizeCellVector(flowVector);
  const direction = normalizeDirection(travelDirection);
  const assist = flow.u * direction.u + flow.v * direction.v;
  const flowMagnitudeSquared = flow.u * flow.u + flow.v * flow.v;
  return Math.sqrt(Math.max(0, flowMagnitudeSquared - assist * assist));
}

export function advectParticle(position, flowSampler, dt, bounds = null) {
  const x = clampFinite(position?.x);
  const y = clampFinite(position?.y);
  const sample = typeof flowSampler === 'function' ? flowSampler(x, y, position) : { u: 0, v: 0 };
  const vector = normalizeCellVector(sample);
  const next = {
    ...position,
    x: x + vector.u * clampFinite(dt),
    y: y + vector.v * clampFinite(dt)
  };
  return clampPositionToBounds(next, bounds);
}

export function advectParticles(particles, flowSampler, dt, bounds = null) {
  if (!Array.isArray(particles)) return [];
  return particles.map((particle) => advectParticle(particle, flowSampler, dt, bounds));
}

export function maskFlowByTerrain(vectorField, terrainMask) {
  const { width, height } = fieldDimensions(vectorField);
  return Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_col, x) => {
    if (Boolean(terrainMask?.[y]?.[x])) return { u: 0, v: 0, masked: true };
    return normalizeCellVector(vectorField?.[y]?.[x]);
  }));
}

export function validateVectorField(vectorField) {
  const { width, height } = fieldDimensions(vectorField);
  let finiteVectorCount = 0;
  let invalidVectorCount = 0;
  let maxMagnitude = 0;
  const invalidCells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = vectorField?.[y]?.[x];
      const u = Number(cell?.u);
      const v = Number(cell?.v);
      if (Number.isFinite(u) && Number.isFinite(v)) {
        finiteVectorCount += 1;
        maxMagnitude = Math.max(maxMagnitude, Math.hypot(u, v));
      } else {
        invalidVectorCount += 1;
        invalidCells.push({ x, y });
      }
    }
  }
  return {
    valid: invalidVectorCount === 0,
    width,
    height,
    finiteVectorCount,
    invalidVectorCount,
    invalidCells,
    maxMagnitude
  };
}

export function scalarFieldStats(field) {
  const values = [];
  for (const row of Array.isArray(field) ? field : []) {
    for (const value of Array.isArray(row) ? row : []) {
      const number = Number(value);
      if (Number.isFinite(number)) values.push(number);
    }
  }
  return numericStats(values);
}

function normalizeDirection(value) {
  if (typeof value === 'number') return { u: Math.cos(value), v: Math.sin(value) };
  const vector = normalizeVector(value?.u, value?.v);
  if (vector.magnitude <= EPSILON) return { u: 1, v: 0 };
  return { u: vector.u, v: vector.v };
}

function flattenVectorField(vectorField) {
  const values = [];
  for (const row of Array.isArray(vectorField) ? vectorField : []) {
    for (const cell of Array.isArray(row) ? row : []) values.push(normalizeCellVector(cell));
  }
  return values;
}

function normalizeCellVector(vector) {
  if (Array.isArray(vector)) return { u: clampFinite(vector[0]), v: clampFinite(vector[1]) };
  return { u: clampFinite(vector?.u), v: clampFinite(vector?.v) };
}

function vectorAt(field, x, y) {
  const { width, height } = fieldDimensions(field);
  if (width <= 0 || height <= 0) return { u: 0, v: 0 };
  return normalizeCellVector(field[clamp(Math.round(y), 0, height - 1)]?.[clamp(Math.round(x), 0, width - 1)]);
}

function fieldDimensions(field) {
  const height = Array.isArray(field) ? field.length : 0;
  const width = height > 0 && Array.isArray(field[0]) ? field[0].length : 0;
  return { width, height };
}

function sampleSpan(index, size) {
  return size <= 1 || index <= 0 || index >= size - 1 ? 1 : 2;
}

function numericStats(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  if (!finite.length) return { min: 0, mean: 0, max: 0, absMean: 0, absMax: 0, count: 0 };
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const absMean = finite.reduce((sum, value) => sum + Math.abs(value), 0) / finite.length;
  const absMax = Math.max(...finite.map(Math.abs));
  return { min, mean, max, absMean, absMax, count: finite.length };
}

function clampPositionToBounds(position, bounds) {
  if (!bounds) return position;
  const minX = clampFinite(bounds.minX ?? bounds.xMin ?? 0);
  const maxX = clampFinite(bounds.maxX ?? bounds.xMax ?? 1);
  const minY = clampFinite(bounds.minY ?? bounds.yMin ?? 0);
  const maxY = clampFinite(bounds.maxY ?? bounds.yMax ?? 1);
  return {
    ...position,
    x: clamp(position.x, Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(position.y, Math.min(minY, maxY), Math.max(minY, maxY))
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
