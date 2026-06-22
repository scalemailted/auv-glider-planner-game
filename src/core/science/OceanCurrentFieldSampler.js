import { normalizeOceanCurrentField4D } from './OceanCurrentField4D.js';

export const OCEAN_CURRENT_FIELD_SAMPLER_VERSION = 'ocean-current-field-sampler-flow-r2a';

export function sampleOceanCurrent(options = {}) {
  const field = normalizeOceanCurrentField4D(options.field ?? options.currentField ?? {});
  const interpolation = normalizeInterpolation(options.interpolation ?? 'linear4d');
  const eastMeters = finite(options.eastMeters ?? options.x, field.eastAxisMeters[0] ?? 0);
  const northMeters = finite(options.northMeters ?? options.y, field.northAxisMeters[0] ?? 0);
  const depthMeters = Math.max(0, finite(options.depthMeters, 0));
  const timeSeconds = finite(options.timeSeconds ?? options.t, field.timeAxisSeconds[0] ?? 0);
  const bx = bracket(field.eastAxisMeters, eastMeters, interpolation.horizontal === 'nearest');
  const by = bracket(field.northAxisMeters, northMeters, interpolation.horizontal === 'nearest');
  const bz = bracket(field.depthAxisMeters, depthMeters, interpolation.depth === 'nearest');
  const bt = bracket(field.timeAxisSeconds, timeSeconds, interpolation.time === 'nearest');
  const nx = nearest(field.eastAxisMeters, eastMeters);
  const ny = nearest(field.northAxisMeters, northMeters);
  const outsideDomain = eastMeters < field.eastAxisMeters[0]
    || eastMeters > field.eastAxisMeters.at(-1)
    || northMeters < field.northAxisMeters[0]
    || northMeters > field.northAxisMeters.at(-1);
  const wetCell = field.wetMask?.[ny]?.[nx] !== false;
  const bottomDepthMeters = gridBilinear(field.bottomDepthMeters, bx, by);
  const belowBottom = Number.isFinite(bottomDepthMeters) && depthMeters > bottomDepthMeters + 1e-6;
  const wet = !outsideDomain && wetCell && !belowBottom;
  const u = wet ? sample4d(field.uEastMetersPerSecond, bx, by, bz, bt) : 0;
  const v = wet ? sample4d(field.vNorthMetersPerSecond, bx, by, bz, bt) : 0;
  const w = wet && field.wDownMetersPerSecond ? sample4d(field.wDownMetersPerSecond, bx, by, bz, bt) : 0;
  const magnitude = Math.hypot(u, v, w);
  return {
    type: 'anchor.science.ocean-current-sample',
    version: OCEAN_CURRENT_FIELD_SAMPLER_VERSION,
    uEastMetersPerSecond: round(u),
    vNorthMetersPerSecond: round(v),
    wDownMetersPerSecond: field.wDownMetersPerSecond ? round(w) : 0,
    magnitudeMetersPerSecond: round(magnitude),
    bearingDegrees: round((((Math.atan2(u, v) * 180 / Math.PI) % 360) + 360) % 360, 4),
    eastMeters: round(eastMeters),
    northMeters: round(northMeters),
    depthMeters: round(depthMeters),
    timeSeconds: round(timeSeconds),
    lowerDepthIndex: bz.i0,
    upperDepthIndex: bz.i1,
    depthInterpolationFraction: round(bz.f),
    lowerTimeIndex: bt.i0,
    upperTimeIndex: bt.i1,
    timeInterpolationFraction: round(bt.f),
    lowerEastIndex: bx.i0,
    upperEastIndex: bx.i1,
    eastInterpolationFraction: round(bx.f),
    lowerNorthIndex: by.i0,
    upperNorthIndex: by.i1,
    northInterpolationFraction: round(by.f),
    wet,
    masked: !wet,
    belowBottom,
    outsideDomain,
    bottomDepthMeters: Number.isFinite(bottomDepthMeters) ? round(bottomDepthMeters) : null,
    maskReason: wet ? null : outsideDomain ? 'outsideDomain' : !wetCell ? 'landOrDryCell' : belowBottom ? 'belowBottom' : 'masked',
    interpolation: interpolation.id,
    source: {
      fieldId: field.id,
      sourceType: field.sourceMetadata?.sourceType ?? null,
      label: field.sourceMetadata?.label ?? field.label ?? null,
      digest: field.digest ?? null,
      usesRealHycom: field.sourceMetadata?.usesRealHycom === true,
      usesRealMarineCopernicus: field.sourceMetadata?.usesRealMarineCopernicus === true,
      calibratedForecast: field.sourceMetadata?.calibratedForecast === true
    }
  };
}

export function sampleOceanCurrentVector(options = {}) {
  const sample = sampleOceanCurrent(options);
  return [sample.uEastMetersPerSecond, sample.vNorthMetersPerSecond];
}

export function validateOceanCurrentSample(sample = {}) {
  const errors = [];
  if (sample.type !== 'anchor.science.ocean-current-sample') errors.push('Unexpected ocean-current sample type.');
  for (const key of ['uEastMetersPerSecond', 'vNorthMetersPerSecond', 'magnitudeMetersPerSecond']) if (!Number.isFinite(Number(sample[key]))) errors.push(`${key} must be finite.`);
  if (sample.belowBottom === true && sample.wet === true) errors.push('A below-bottom sample cannot be wet.');
  if (sample.outsideDomain === true && sample.wet === true) errors.push('An outside-domain sample cannot be wet.');
  return { valid: errors.length === 0, errors, sample };
}

export function oceanCurrentSampleSummary(sample = {}) {
  return {
    type: 'anchor.science.ocean-current-sample-summary',
    version: OCEAN_CURRENT_FIELD_SAMPLER_VERSION,
    uEastMetersPerSecond: sample.uEastMetersPerSecond ?? null,
    vNorthMetersPerSecond: sample.vNorthMetersPerSecond ?? null,
    wDownMetersPerSecond: sample.wDownMetersPerSecond ?? 0,
    magnitudeMetersPerSecond: sample.magnitudeMetersPerSecond ?? null,
    bearingDegrees: sample.bearingDegrees ?? null,
    depthMeters: sample.depthMeters ?? null,
    timeSeconds: sample.timeSeconds ?? null,
    wet: sample.wet === true,
    masked: sample.masked === true,
    belowBottom: sample.belowBottom === true,
    outsideDomain: sample.outsideDomain === true,
    sourceDigest: sample.source?.digest ?? null
  };
}

function normalizeInterpolation(value) {
  const id = String(value ?? '').trim();
  if (id === 'nearest') return { id: 'nearest', horizontal: 'nearest', depth: 'nearest', time: 'nearest' };
  if (id === 'bilinearHorizontal') return { id, horizontal: 'linear', depth: 'nearest', time: 'nearest' };
  if (id === 'trilinearVolume') return { id, horizontal: 'linear', depth: 'linear', time: 'nearest' };
  return { id: 'linear4d', horizontal: 'linear', depth: 'linear', time: 'linear' };
}

function bracket(axis = [], value = 0, nearestMode = false) {
  if (!axis.length) return { i0: 0, i1: 0, f: 0 };
  if (nearestMode || axis.length === 1) { const i = nearest(axis, value); return { i0: i, i1: i, f: 0 }; }
  if (value <= axis[0]) return { i0: 0, i1: 0, f: 0 };
  const last = axis.length - 1;
  if (value >= axis[last]) return { i0: last, i1: last, f: 0 };
  for (let i = 0; i < last; i += 1) {
    if (value >= axis[i] && value <= axis[i + 1]) return { i0: i, i1: i + 1, f: (value - axis[i]) / Math.max(1e-9, axis[i + 1] - axis[i]) };
  }
  return { i0: last, i1: last, f: 0 };
}

function nearest(axis = [], value = 0) {
  let best = 0;
  let dist = Infinity;
  for (let i = 0; i < axis.length; i += 1) {
    const d = Math.abs(Number(axis[i]) - Number(value));
    if (d < dist) { best = i; dist = d; }
  }
  return best;
}

function sample4d(cube, x, y, z, t) {
  const cell = (ti, zi, yi, xi) => Number(cube?.[ti]?.[zi]?.[yi]?.[xi] ?? 0);
  const a0 = bilinear(cell(t.i0, z.i0, y.i0, x.i0), cell(t.i0, z.i0, y.i0, x.i1), cell(t.i0, z.i0, y.i1, x.i0), cell(t.i0, z.i0, y.i1, x.i1), x.f, y.f);
  const a1 = bilinear(cell(t.i0, z.i1, y.i0, x.i0), cell(t.i0, z.i1, y.i0, x.i1), cell(t.i0, z.i1, y.i1, x.i0), cell(t.i0, z.i1, y.i1, x.i1), x.f, y.f);
  const d0 = lerp(a0, a1, z.f);
  if (t.i0 === t.i1) return d0;
  const b0 = bilinear(cell(t.i1, z.i0, y.i0, x.i0), cell(t.i1, z.i0, y.i0, x.i1), cell(t.i1, z.i0, y.i1, x.i0), cell(t.i1, z.i0, y.i1, x.i1), x.f, y.f);
  const b1 = bilinear(cell(t.i1, z.i1, y.i0, x.i0), cell(t.i1, z.i1, y.i0, x.i1), cell(t.i1, z.i1, y.i1, x.i0), cell(t.i1, z.i1, y.i1, x.i1), x.f, y.f);
  return lerp(d0, lerp(b0, b1, z.f), t.f);
}

function gridBilinear(grid, x, y) {
  const a = Number(grid?.[y.i0]?.[x.i0]);
  const b = Number(grid?.[y.i0]?.[x.i1]);
  const c = Number(grid?.[y.i1]?.[x.i0]);
  const d = Number(grid?.[y.i1]?.[x.i1]);
  if (![a, b, c, d].every(Number.isFinite)) return Infinity;
  return bilinear(a, b, c, d, x.f, y.f);
}
function bilinear(a, b, c, d, tx, ty) { return lerp(lerp(a, b, tx), lerp(c, d, tx), ty); }
function lerp(a, b, t) { return Number(a) * (1 - Number(t)) + Number(b) * Number(t); }
function finite(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function round(value, digits = 6) { const n = Number(value); return Number.isFinite(n) ? Number(n.toFixed(digits)) : null; }
