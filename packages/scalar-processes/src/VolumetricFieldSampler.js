export const VOLUMETRIC_FIELD_SAMPLER_VERSION = 'volumetric-field-sampler-three-r1-2a-3';

export const FIELD_INTERPOLATION_PROFILES = Object.freeze([
  'legacyNearestCellV1',
  'bilinearHorizontalV1',
  'trilinearVolumeV1',
  'quadrilinearTimeVolumeV1'
]);

export function sampleScalarFieldContinuous(options = {}) {
  const profile = normalizeProfile(options.interpolationProfileId ?? options.profileId, options.field, options);
  const field = normalizeField(options.field);
  if (!field.valid) return invalidSample('scalar', profile, ['Scalar field is empty or unsupported.']);
  const x = finite(options.x, 0);
  const y = finite(options.y, 0);
  const depthMeters = finite(options.depthMeters, 0);
  const timeSeconds = finite(options.timeSeconds, 0);
  const h = horizontalBracket(field, x, y, profile);
  const z = depthBracket(field, depthMeters, options.depthCoordinates, profile);
  const t = timeBracket(field, timeSeconds, options.timeCoordinates, profile);
  const value = interpolateScalar(field, h, z, t, profile);
  return {
    type: 'anchor.science.volumetric-field-sample',
    version: VOLUMETRIC_FIELD_SAMPLER_VERSION,
    fieldType: 'scalar',
    interpolationProfileId: profile,
    x,
    y,
    depthMeters,
    timeSeconds,
    value: round(value),
    containingCell: { col: Math.round(x), row: Math.round(y) },
    neighboringCells: neighboringCells(h),
    interpolationWeights: buildWeights(h, z, t, profile),
    exactNode: h.tx === 0 && h.ty === 0 && z.tz === 0 && t.tt === 0,
    valid: Number.isFinite(value),
    errors: Number.isFinite(value) ? [] : ['Interpolated scalar value is not finite.']
  };
}

export function sampleVectorFieldContinuous(options = {}) {
  const field = options.field ?? {};
  if (Array.isArray(field)) {
    const u = sampleScalarFieldContinuous({ ...options, field: field.map((row) => row.map((entry) => Array.isArray(entry) ? entry[0] : entry?.u ?? 0)) });
    const v = sampleScalarFieldContinuous({ ...options, field: field.map((row) => row.map((entry) => Array.isArray(entry) ? entry[1] : entry?.v ?? 0)) });
    return vectorResult(u, v, options);
  }
  const u = sampleScalarFieldContinuous({ ...options, field: field.u ?? field.F_u ?? field.x ?? [] });
  const v = sampleScalarFieldContinuous({ ...options, field: field.v ?? field.F_v ?? field.y ?? [] });
  const w = field.w || field.F_w ? sampleScalarFieldContinuous({ ...options, field: field.w ?? field.F_w }) : null;
  return {
    ...vectorResult(u, v, options),
    w: w ? w.value : 0,
    vector: { u: u.value, v: v.value, w: w ? w.value : 0 },
    magnitude: round(Math.hypot(u.value, v.value, w ? w.value : 0))
  };
}

export function sampleMaskFieldContinuous(options = {}) {
  const scalar = sampleScalarFieldContinuous({ ...options, interpolationProfileId: 'legacyNearestCellV1' });
  const threshold = finite(options.threshold, 0.5);
  const valid = Number(scalar.value) >= threshold;
  return {
    ...scalar,
    fieldType: 'mask',
    maskRule: 'conservativeCategoricalNearestCell',
    maskValue: valid,
    value: valid ? 1 : 0,
    threshold
  };
}

export function sampleBathymetryContinuous(options = {}) {
  const field = options.field?.depthMeters ?? options.bathymetry?.depthMeters ?? options.field ?? options.depthMeters ?? [];
  const sample = sampleScalarFieldContinuous({ ...options, field, depthMeters: 0, interpolationProfileId: 'bilinearHorizontalV1' });
  return {
    ...sample,
    fieldType: 'bathymetry',
    bottomDepthMeters: sample.value,
    depthPositiveDirection: 'down',
    interpolationRule: 'bilinear horizontal over bottom-depth grid'
  };
}

export function sampleVolumetricFieldContinuous(options = {}) {
  const field = options.field ?? {};
  if (options.fieldType === 'vector' || field.u || field.v || field.F_u || field.F_v) return sampleVectorFieldContinuous(options);
  if (options.fieldType === 'mask') return sampleMaskFieldContinuous(options);
  if (options.fieldType === 'bathymetry' || field.depthMeters) return sampleBathymetryContinuous(options);
  return sampleScalarFieldContinuous(options);
}

export function validateVolumetricFieldSample(result = {}) {
  const errors = [];
  if (result.type !== 'anchor.science.volumetric-field-sample') errors.push('Volumetric sample has an unexpected type.');
  if (!FIELD_INTERPOLATION_PROFILES.includes(result.interpolationProfileId)) errors.push(`Unsupported interpolation profile: ${result.interpolationProfileId}`);
  if (result.fieldType === 'vector') {
    for (const key of ['u', 'v']) if (!Number.isFinite(Number(result[key]))) errors.push(`Vector sample ${key} is not finite.`);
  } else if (!Number.isFinite(Number(result.value))) {
    errors.push('Scalar sample value is not finite.');
  }
  return { valid: errors.length === 0, errors, sample: result };
}

export function volumetricFieldSampleSummary(result = {}) {
  return {
    version: VOLUMETRIC_FIELD_SAMPLER_VERSION,
    fieldType: result.fieldType ?? null,
    interpolationProfileId: result.interpolationProfileId ?? null,
    value: result.value ?? null,
    vector: result.vector ?? null,
    x: result.x ?? null,
    y: result.y ?? null,
    depthMeters: result.depthMeters ?? null,
    timeSeconds: result.timeSeconds ?? null,
    containingCell: result.containingCell ?? null,
    exactNode: result.exactNode === true,
    valid: result.valid !== false
  };
}

function normalizeProfile(profileId, field, options = {}) {
  const profile = FIELD_INTERPOLATION_PROFILES.includes(profileId) ? profileId : null;
  if (profile) return profile;
  if (options.timeCoordinates?.length > 1 || looks4d(field)) return 'quadrilinearTimeVolumeV1';
  if (options.depthCoordinates?.length > 1 || looks3d(field)) return 'trilinearVolumeV1';
  return 'bilinearHorizontalV1';
}

function normalizeField(field) {
  if (!Array.isArray(field)) return { valid: false, data: [], width: 0, height: 0, depth: 0, time: 0, rank: 0 };
  const rank = fieldRank(field);
  if (rank === 2) return { valid: true, data: [[field]], rank, time: 1, depth: 1, height: field.length, width: field[0]?.length ?? 0 };
  if (rank === 3) return { valid: true, data: [field], rank, time: 1, depth: field.length, height: field[0]?.length ?? 0, width: field[0]?.[0]?.length ?? 0 };
  if (rank >= 4) return { valid: true, data: field, rank: 4, time: field.length, depth: field[0]?.length ?? 0, height: field[0]?.[0]?.length ?? 0, width: field[0]?.[0]?.[0]?.length ?? 0 };
  return { valid: false, data: [], width: 0, height: 0, depth: 0, time: 0, rank };
}

function fieldRank(value) {
  let rank = 0;
  let current = value;
  while (Array.isArray(current)) {
    rank += 1;
    current = current[0];
  }
  return rank;
}

function looks3d(field) {
  return fieldRank(field) >= 3;
}

function looks4d(field) {
  return fieldRank(field) >= 4;
}

function horizontalBracket(field, x, y, profile) {
  const nearest = profile === 'legacyNearestCellV1';
  const fx = clamp(x, 0, field.width - 1);
  const fy = clamp(y, 0, field.height - 1);
  const x0 = nearest ? Math.round(fx) : Math.floor(fx);
  const y0 = nearest ? Math.round(fy) : Math.floor(fy);
  const x1 = nearest ? x0 : Math.min(field.width - 1, x0 + 1);
  const y1 = nearest ? y0 : Math.min(field.height - 1, y0 + 1);
  return { x0, x1, y0, y1, tx: nearest ? 0 : fx - x0, ty: nearest ? 0 : fy - y0 };
}

function depthBracket(field, depthMeters, coordinates = null, profile) {
  if (profile === 'legacyNearestCellV1' || profile === 'bilinearHorizontalV1' || field.depth <= 1) return { z0: 0, z1: 0, tz: 0, depth0: 0, depth1: 0 };
  const coords = normalizeCoordinates(coordinates, field.depth, (index) => index);
  const bracket = bracketCoordinate(depthMeters, coords);
  return { z0: bracket.i0, z1: bracket.i1, tz: bracket.t, depth0: coords[bracket.i0], depth1: coords[bracket.i1] };
}

function timeBracket(field, timeSeconds, coordinates = null, profile) {
  if (profile !== 'quadrilinearTimeVolumeV1' || field.time <= 1) return { t0: 0, t1: 0, tt: 0, time0: 0, time1: 0 };
  const coords = normalizeCoordinates(coordinates, field.time, (index) => index);
  const bracket = bracketCoordinate(timeSeconds, coords);
  return { t0: bracket.i0, t1: bracket.i1, tt: bracket.t, time0: coords[bracket.i0], time1: coords[bracket.i1] };
}

function interpolateScalar(field, h, z, t, profile) {
  const v0000 = layerBilinear(field, t.t0, z.z0, h);
  if (profile === 'legacyNearestCellV1' || profile === 'bilinearHorizontalV1') return v0000;
  const v0010 = layerBilinear(field, t.t0, z.z1, h);
  const depthValue0 = lerp(v0000, v0010, z.tz);
  if (profile !== 'quadrilinearTimeVolumeV1') return depthValue0;
  const v1000 = layerBilinear(field, t.t1, z.z0, h);
  const v1010 = layerBilinear(field, t.t1, z.z1, h);
  const depthValue1 = lerp(v1000, v1010, z.tz);
  return lerp(depthValue0, depthValue1, t.tt);
}

function layerBilinear(field, timeIndex, depthIndex, h) {
  const v00 = valueAt(field, timeIndex, depthIndex, h.y0, h.x0);
  const v10 = valueAt(field, timeIndex, depthIndex, h.y0, h.x1);
  const v01 = valueAt(field, timeIndex, depthIndex, h.y1, h.x0);
  const v11 = valueAt(field, timeIndex, depthIndex, h.y1, h.x1);
  return lerp(lerp(v00, v10, h.tx), lerp(v01, v11, h.tx), h.ty);
}

function valueAt(field, t, z, y, x) {
  return finite(field.data?.[t]?.[z]?.[y]?.[x], 0);
}

function bracketCoordinate(value, coords) {
  if (!coords.length) return { i0: 0, i1: 0, t: 0 };
  if (value <= coords[0]) return { i0: 0, i1: 0, t: 0 };
  const last = coords.length - 1;
  if (value >= coords[last]) return { i0: last, i1: last, t: 0 };
  for (let index = 0; index < last; index += 1) {
    if (value >= coords[index] && value <= coords[index + 1]) {
      const span = Math.max(1e-9, coords[index + 1] - coords[index]);
      return { i0: index, i1: index + 1, t: (value - coords[index]) / span };
    }
  }
  return { i0: last, i1: last, t: 0 };
}

function normalizeCoordinates(values, count, fallbackFn) {
  const coords = Array.isArray(values) && values.length >= count ? values.slice(0, count).map(Number) : Array.from({ length: count }, (_value, index) => fallbackFn(index));
  return coords.map((value, index) => Number.isFinite(value) ? value : fallbackFn(index));
}

function neighboringCells(h) {
  return [
    { col: h.x0, row: h.y0 },
    { col: h.x1, row: h.y0 },
    { col: h.x0, row: h.y1 },
    { col: h.x1, row: h.y1 }
  ].filter((cell, index, cells) => cells.findIndex((candidate) => candidate.col === cell.col && candidate.row === cell.row) === index);
}

function buildWeights(h, z, t, profile) {
  return {
    horizontal: { x0: h.x0, x1: h.x1, y0: h.y0, y1: h.y1, tx: round(h.tx), ty: round(h.ty) },
    depth: { z0: z.z0, z1: z.z1, tz: round(z.tz), depth0: z.depth0, depth1: z.depth1 },
    time: { t0: t.t0, t1: t.t1, tt: round(t.tt), time0: t.time0, time1: t.time1 },
    profile
  };
}

function vectorResult(u, v, options) {
  return {
    type: 'anchor.science.volumetric-field-sample',
    version: VOLUMETRIC_FIELD_SAMPLER_VERSION,
    fieldType: 'vector',
    interpolationProfileId: u.interpolationProfileId,
    x: u.x,
    y: u.y,
    depthMeters: u.depthMeters,
    timeSeconds: u.timeSeconds,
    u: u.value,
    v: v.value,
    vector: { u: u.value, v: v.value, w: 0 },
    magnitude: round(Math.hypot(u.value, v.value)),
    containingCell: u.containingCell,
    neighboringCells: u.neighboringCells,
    interpolationWeights: u.interpolationWeights,
    exactNode: u.exactNode && v.exactNode,
    valid: u.valid !== false && v.valid !== false,
    errors: [...(u.errors ?? []), ...(v.errors ?? [])]
  };
}

function invalidSample(fieldType, profile, errors) {
  return {
    type: 'anchor.science.volumetric-field-sample',
    version: VOLUMETRIC_FIELD_SAMPLER_VERSION,
    fieldType,
    interpolationProfileId: profile,
    x: null,
    y: null,
    depthMeters: null,
    timeSeconds: null,
    value: null,
    valid: false,
    errors
  };
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function lerp(a, b, t) {
  return Number(a) * (1 - t) + Number(b) * t;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
