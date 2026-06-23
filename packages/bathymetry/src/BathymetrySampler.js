import { normalizeBathymetryArtifact } from './BathymetryArtifact.js';

export const BATHYMETRY_SAMPLER_VERSION = 'bathymetry-sampler-bathy-pkg-r1';

export function createBathymetrySampler(artifact) {
  const normalized = artifact?.type === 'anchor.bathymetry.artifact' ? artifact : normalizeBathymetryArtifact(artifact);
  return {
    type: 'anchor.bathymetry.sampler',
    version: BATHYMETRY_SAMPLER_VERSION,
    artifact: normalized,
    width: normalized.eastAxisMeters.length,
    height: normalized.northAxisMeters.length,
    minEastMeters: normalized.eastAxisMeters[0] ?? 0,
    maxEastMeters: normalized.eastAxisMeters.at(-1) ?? 0,
    minNorthMeters: normalized.northAxisMeters[0] ?? 0,
    maxNorthMeters: normalized.northAxisMeters.at(-1) ?? 0,
    source: {
      artifactId: normalized.id,
      artifactDigest: normalized.artifactDigest ?? null,
      manifestDigest: normalized.manifestDigest ?? null,
      coordinateFrame: normalized.coordinateFrame
    }
  };
}

export function sampleBathymetry(artifactOrSampler, eastMeters, northMeters, options = {}) {
  const sampler = artifactOrSampler?.type === 'anchor.bathymetry.sampler' ? artifactOrSampler : createBathymetrySampler(artifactOrSampler);
  const artifact = sampler.artifact;
  const indices = resolveIndices(sampler, eastMeters, northMeters);
  if (indices.outsideDomain) {
    return baseSample(sampler, eastMeters, northMeters, indices, { outsideDomain: true, wet: false, land: false, bottomDepthMeters: null, signedElevationMeters: null });
  }
  const mode = options.interpolation ?? options.mode ?? 'bilinear';
  const bottomDepthMeters = mode === 'nearest'
    ? sampleGridNearest(artifact.bottomDepthMeters, indices.nearestEastIndex, indices.nearestNorthIndex)
    : sampleGridBilinear(artifact.bottomDepthMeters, indices);
  const signedElevationMeters = mode === 'nearest'
    ? sampleGridNearest(artifact.signedElevationMeters, indices.nearestEastIndex, indices.nearestNorthIndex)
    : sampleGridBilinear(artifact.signedElevationMeters, indices);
  const land = sampleMaskNearest(artifact.landMask, indices.nearestEastIndex, indices.nearestNorthIndex);
  const wet = !land && sampleMaskNearest(artifact.wetMask, indices.nearestEastIndex, indices.nearestNorthIndex) && Number(bottomDepthMeters) > 0;
  return baseSample(sampler, eastMeters, northMeters, indices, { bottomDepthMeters, signedElevationMeters, wet, land, outsideDomain: false });
}

export function sampleBottomDepth(artifactOrSampler, eastMeters, northMeters, options = {}) {
  return sampleBathymetry(artifactOrSampler, eastMeters, northMeters, options).bottomDepthMeters;
}

export function sampleSignedElevation(artifactOrSampler, eastMeters, northMeters, options = {}) {
  return sampleBathymetry(artifactOrSampler, eastMeters, northMeters, options).signedElevationMeters;
}

export function classifyWetLocation(artifactOrSampler, eastMeters, northMeters, options = {}) {
  const sample = sampleBathymetry(artifactOrSampler, eastMeters, northMeters, options);
  return { wet: sample.wet, land: sample.land, outsideDomain: sample.outsideDomain, bottomDepthMeters: sample.bottomDepthMeters };
}

function baseSample(sampler, eastMeters, northMeters, indices, patch = {}) {
  return {
    type: 'anchor.bathymetry.sample',
    version: BATHYMETRY_SAMPLER_VERSION,
    eastMeters: round(eastMeters),
    northMeters: round(northMeters),
    signedElevationMeters: patch.signedElevationMeters == null ? null : round(patch.signedElevationMeters),
    bottomDepthMeters: patch.bottomDepthMeters == null ? null : round(patch.bottomDepthMeters),
    wet: patch.wet === true,
    land: patch.land === true,
    outsideDomain: patch.outsideDomain === true,
    lowerEastIndex: indices.lowerEastIndex,
    upperEastIndex: indices.upperEastIndex,
    lowerNorthIndex: indices.lowerNorthIndex,
    upperNorthIndex: indices.upperNorthIndex,
    nearestEastIndex: indices.nearestEastIndex,
    nearestNorthIndex: indices.nearestNorthIndex,
    eastFraction: round(indices.eastFraction),
    northFraction: round(indices.northFraction),
    source: sampler.source
  };
}

function resolveIndices(sampler, eastMeters, northMeters) {
  const east = Number(eastMeters);
  const north = Number(northMeters);
  const outsideDomain = !Number.isFinite(east) || !Number.isFinite(north)
    || east < sampler.minEastMeters || east > sampler.maxEastMeters
    || north < sampler.minNorthMeters || north > sampler.maxNorthMeters;
  const x = axisPosition(sampler.artifact.eastAxisMeters, east);
  const y = axisPosition(sampler.artifact.northAxisMeters, north);
  const lowerEastIndex = Math.floor(x);
  const lowerNorthIndex = Math.floor(y);
  const upperEastIndex = Math.min(sampler.width - 1, lowerEastIndex + 1);
  const upperNorthIndex = Math.min(sampler.height - 1, lowerNorthIndex + 1);
  return {
    outsideDomain,
    lowerEastIndex,
    upperEastIndex,
    lowerNorthIndex,
    upperNorthIndex,
    nearestEastIndex: Math.max(0, Math.min(sampler.width - 1, Math.round(x))),
    nearestNorthIndex: Math.max(0, Math.min(sampler.height - 1, Math.round(y))),
    eastFraction: x - lowerEastIndex,
    northFraction: y - lowerNorthIndex
  };
}

function axisPosition(axis, value) {
  if (!axis.length || axis.length === 1) return 0;
  const min = Number(axis[0]);
  const max = Number(axis.at(-1));
  const clamped = Math.min(max, Math.max(min, Number(value)));
  const span = Math.max(1e-12, max - min);
  return ((clamped - min) / span) * (axis.length - 1);
}

function sampleGridNearest(grid, x, y) {
  return Number(grid[y]?.[x] ?? 0);
}

function sampleMaskNearest(grid, x, y) {
  return grid[y]?.[x] === true;
}

function sampleGridBilinear(grid, indices) {
  const a = Number(grid[indices.lowerNorthIndex]?.[indices.lowerEastIndex] ?? 0);
  const b = Number(grid[indices.lowerNorthIndex]?.[indices.upperEastIndex] ?? a);
  const c = Number(grid[indices.upperNorthIndex]?.[indices.lowerEastIndex] ?? a);
  const d = Number(grid[indices.upperNorthIndex]?.[indices.upperEastIndex] ?? c);
  const top = lerp(a, b, indices.eastFraction);
  const bottom = lerp(c, d, indices.eastFraction);
  return lerp(top, bottom, indices.northFraction);
}

function lerp(a, b, t) {
  return Number(a) + (Number(b) - Number(a)) * Number(t);
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}