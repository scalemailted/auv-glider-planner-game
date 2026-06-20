import { sampleBathymetryContinuous } from '../science/VolumetricFieldSampler.js';

export const BATHYMETRY_MESH_SAMPLER_VERSION = 'bathymetry-mesh-sampler-three-r1-2b';

export function sampleBathymetryMeshGeometry(options = {}) {
  const geometry = options.geometry ?? {};
  const x = clamp(Number(options.x ?? options.col ?? 0), 0, Math.max(0, Number(geometry.width ?? 1) - 1));
  const y = clamp(Number(options.y ?? options.row ?? 0), 0, Math.max(0, Number(geometry.height ?? 1) - 1));
  const width = Number(geometry.width ?? 0);
  const height = Number(geometry.height ?? 0);
  if (!width || !height || !Array.isArray(geometry.vertexDepthMeters)) return invalidSample(x, y, 'Missing mesh vertex depths.');
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const a = vertexDepth(geometry, x0, y0);
  const b = vertexDepth(geometry, x1, y0);
  const c = vertexDepth(geometry, x0, y1);
  const d = vertexDepth(geometry, x1, y1);
  const top = lerp(a, b, tx);
  const bottom = lerp(c, d, tx);
  return {
    type: 'anchor.rendering.bathymetry-mesh-sample',
    version: BATHYMETRY_MESH_SAMPLER_VERSION,
    x: round(x),
    y: round(y),
    bottomDepthMeters: round(lerp(top, bottom, ty)),
    valid: true,
    interpolationProfileId: geometry.interpolationProfileId ?? 'bilinearCellCenterV1',
    sourceDigest: geometry.sourceDigest ?? null
  };
}

export function compareBathymetryMeshAndCanonicalSampler(options = {}) {
  const geometry = options.geometry ?? {};
  const surface = options.surfaceModel ?? {};
  const samples = options.samples ?? defaultSamples(geometry);
  const toleranceMeters = Number(options.toleranceMeters ?? 1e-6);
  const errors = [];
  const failedSamples = [];
  for (const sample of samples) {
    const canonical = sampleBathymetryContinuous({ field: { depthMeters: surface.bottomDepthField }, x: sample.x, y: sample.y });
    const mesh = sampleBathymetryMeshGeometry({ geometry, x: sample.x, y: sample.y });
    const error = Math.abs(Number(canonical.bottomDepthMeters ?? canonical.value ?? 0) - Number(mesh.bottomDepthMeters ?? 0));
    errors.push(error);
    if (error > toleranceMeters) failedSamples.push({ x: round(sample.x), y: round(sample.y), canonicalDepthMeters: canonical.bottomDepthMeters, meshDepthMeters: mesh.bottomDepthMeters, errorMeters: round(error) });
  }
  const sorted = [...errors].sort((a, b) => a - b);
  const mean = errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : 0;
  return {
    type: 'anchor.rendering.bathymetry-mesh-canonical-alignment',
    version: BATHYMETRY_MESH_SAMPLER_VERSION,
    sampleCount: samples.length,
    maximumAbsoluteErrorMeters: round(errors.length ? Math.max(...errors) : 0),
    meanAbsoluteErrorMeters: round(mean),
    p95AbsoluteErrorMeters: round(sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0),
    toleranceMeters,
    status: failedSamples.length ? 'FAIL' : 'PASS',
    failedSamples
  };
}

function defaultSamples(geometry = {}) {
  const width = Math.max(1, Number(geometry.width ?? 1));
  const height = Math.max(1, Number(geometry.height ?? 1));
  return [
    { x: 0, y: 0 },
    { x: width - 1, y: height - 1 },
    { x: (width - 1) * 0.5, y: (height - 1) * 0.5 },
    { x: Math.min(width - 1, 1.25), y: Math.min(height - 1, 2.5) },
    { x: (width - 1) * 0.42, y: (height - 1) * 0.63 },
    { x: (width - 1) * 0.74, y: (height - 1) * 0.34 }
  ];
}

function vertexDepth(geometry, x, y) {
  return Number(geometry.vertexDepthMeters?.[y * Number(geometry.width ?? 0) + x] ?? 0);
}

function invalidSample(x, y, reason) {
  return { type: 'anchor.rendering.bathymetry-mesh-sample', version: BATHYMETRY_MESH_SAMPLER_VERSION, x, y, bottomDepthMeters: null, valid: false, reason };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function lerp(a, b, t) {
  return Number(a) + (Number(b) - Number(a)) * Number(t);
}

function round(value, digits = 6) {
  return Number(Number(value ?? 0).toFixed(digits));
}
