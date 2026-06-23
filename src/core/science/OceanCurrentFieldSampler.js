import { normalizeOceanCurrentField4D } from './OceanCurrentField4D.js';
import { incrementSimulationLaunchCounter, markSimulationLaunchStage, setSimulationLaunchCurrentField } from '../runtime/SimulationLaunchProfiler.js';

export const OCEAN_CURRENT_FIELD_SAMPLER_VERSION = 'ocean-current-field-sampler-flow-r2a-1';

const samplerCache = new WeakMap();
const samplerRuntimeCounters = {
  samplerCreateCount: 0,
  sampleCallCount: 0,
  bracketLookupCount: 0,
  samplerCacheHitCount: 0,
  samplerCacheMissCount: 0
};

export function resetOceanCurrentSamplerRuntimeCounters() {
  samplerRuntimeCounters.samplerCreateCount = 0;
  samplerRuntimeCounters.sampleCallCount = 0;
  samplerRuntimeCounters.bracketLookupCount = 0;
  samplerRuntimeCounters.samplerCacheHitCount = 0;
  samplerRuntimeCounters.samplerCacheMissCount = 0;
}

export function getOceanCurrentSamplerRuntimeCounters() {
  return { ...samplerRuntimeCounters };
}

export function getOceanCurrentSampler(field = {}, options = {}) {
  const source = field ?? {};
  if (source && typeof source === 'object' && samplerCache.has(source)) {
    samplerRuntimeCounters.samplerCacheHitCount += 1;
    return samplerCache.get(source);
  }
  samplerRuntimeCounters.samplerCacheMissCount += 1;
  const sampler = createOceanCurrentSampler(source, options);
  if (source && typeof source === 'object') samplerCache.set(source, sampler);
  if (sampler.field && typeof sampler.field === 'object') samplerCache.set(sampler.field, sampler);
  return sampler;
}

export function createOceanCurrentSampler(field = {}, options = {}) {
  markSimulationLaunchStage('createCurrentSampler');
  const normalized = normalizeOceanCurrentField4D(field ?? {});
  const sampler = {
    type: 'anchor.science.ocean-current-sampler',
    version: OCEAN_CURRENT_FIELD_SAMPLER_VERSION,
    field: normalized,
    interpolation: normalizeInterpolation(options.interpolation ?? 'linear4d'),
    eastAxis: axisInfo(normalized.eastAxisMeters),
    northAxis: axisInfo(normalized.northAxisMeters),
    depthAxis: axisInfo(normalized.depthAxisMeters),
    timeAxis: axisInfo(normalized.timeAxisSeconds),
    sample(options = {}) {
      return samplePreparedOceanCurrent(this, options);
    }
  };
  samplerRuntimeCounters.samplerCreateCount += 1;
  incrementSimulationLaunchCounter('currentSamplerCreateCount');
  setSimulationLaunchCurrentField(normalized);
  if (field && typeof field === 'object') samplerCache.set(field, sampler);
  if (normalized && typeof normalized === 'object') samplerCache.set(normalized, sampler);
  return sampler;
}

export function sampleOceanCurrent(options = {}) {
  const sampler = options.sampler ?? getOceanCurrentSampler(options.field ?? options.currentField ?? {}, { interpolation: options.interpolation });
  return samplePreparedOceanCurrent(sampler, options);
}

export function samplePreparedOceanCurrent(sampler, options = {}) {
  const field = sampler.field;
  const interpolation = normalizeInterpolation(options.interpolation ?? sampler.interpolation?.id ?? 'linear4d');
  const eastMeters = finite(options.eastMeters ?? options.x, field.eastAxisMeters[0] ?? 0);
  const northMeters = finite(options.northMeters ?? options.y, field.northAxisMeters[0] ?? 0);
  const depthMeters = Math.max(0, finite(options.depthMeters, 0));
  const timeSeconds = finite(options.timeSeconds ?? options.t, field.timeAxisSeconds[0] ?? 0);
  const bx = bracket(sampler.eastAxis, eastMeters, interpolation.horizontal === 'nearest');
  const by = bracket(sampler.northAxis, northMeters, interpolation.horizontal === 'nearest');
  const bz = bracket(sampler.depthAxis, depthMeters, interpolation.depth === 'nearest');
  const bt = bracket(sampler.timeAxis, timeSeconds, interpolation.time === 'nearest');
  const nx = nearestFromBracket(sampler.eastAxis, eastMeters, bx);
  const ny = nearestFromBracket(sampler.northAxis, northMeters, by);
  const outsideDomain = eastMeters < sampler.eastAxis.min
    || eastMeters > sampler.eastAxis.max
    || northMeters < sampler.northAxis.min
    || northMeters > sampler.northAxis.max;
  const wetCell = field.wetMask?.[ny]?.[nx] !== false;
  const bottomDepthMeters = gridBilinear(field.bottomDepthMeters, bx, by);
  const belowBottom = Number.isFinite(bottomDepthMeters) && depthMeters > bottomDepthMeters + 1e-6;
  const wet = !outsideDomain && wetCell && !belowBottom;
  const u = wet ? sample4d(field.uEastMetersPerSecond, bx, by, bz, bt) : 0;
  const v = wet ? sample4d(field.vNorthMetersPerSecond, bx, by, bz, bt) : 0;
  const w = wet && field.wDownMetersPerSecond ? sample4d(field.wDownMetersPerSecond, bx, by, bz, bt) : 0;
  const magnitude = Math.hypot(u, v, w);
  samplerRuntimeCounters.sampleCallCount += 1;
  incrementSimulationLaunchCounter('currentSampleCallCount');
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

function axisInfo(axis = []) {
  const values = Array.isArray(axis) && axis.length ? axis.map(Number) : [0];
  return {
    values,
    min: Number(values[0] ?? 0),
    max: Number(values[values.length - 1] ?? values[0] ?? 0),
    last: Math.max(0, values.length - 1)
  };
}

function bracket(axisInfoValue, value = 0, nearestMode = false) {
  samplerRuntimeCounters.bracketLookupCount += 1;
  const axis = axisInfoValue.values;
  if (!axis.length) return { i0: 0, i1: 0, f: 0 };
  if (nearestMode || axis.length === 1) {
    const i = nearestIndex(axisInfoValue, value);
    return { i0: i, i1: i, f: 0 };
  }
  if (value <= axis[0]) return { i0: 0, i1: 0, f: 0 };
  const last = axisInfoValue.last;
  if (value >= axis[last]) return { i0: last, i1: last, f: 0 };
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (value >= axis[mid]) lo = mid;
    else hi = mid;
  }
  return { i0: lo, i1: hi, f: (value - axis[lo]) / Math.max(1e-9, axis[hi] - axis[lo]) };
}

function nearestIndex(axisInfoValue, value = 0) {
  const axis = axisInfoValue.values;
  if (!axis.length || axis.length === 1) return 0;
  if (value <= axis[0]) return 0;
  const last = axisInfoValue.last;
  if (value >= axis[last]) return last;
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (value >= axis[mid]) lo = mid;
    else hi = mid;
  }
  return Math.abs(Number(axis[hi]) - Number(value)) < Math.abs(Number(axis[lo]) - Number(value)) ? hi : lo;
}

function nearestFromBracket(axisInfoValue, value = 0, b = null) {
  const axis = axisInfoValue.values;
  if (!axis.length) return 0;
  const bracketValue = b ?? bracket(axisInfoValue, value, false);
  const d0 = Math.abs(Number(axis[bracketValue.i0]) - Number(value));
  const d1 = Math.abs(Number(axis[bracketValue.i1]) - Number(value));
  return d1 < d0 ? bracketValue.i1 : bracketValue.i0;
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