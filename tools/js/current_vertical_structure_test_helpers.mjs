import assert from 'node:assert/strict';
import {
  createBathymetryConditionedCurrentField,
  sampleCurrentDepthProfile,
  sampleOceanCurrent,
  createCurrentVerticalStructureDescriptor,
  applyVerticalProfileToVector,
  materialVectorDeltaForColumn,
  currentFieldDigest
} from '../../packages/currents/src/index.js';

export const DEFAULT_GRID = Object.freeze({ width: 12, height: 8, cellSizeMeters: 250 });
export const DEFAULT_DEPTHS = Object.freeze([0, 10, 35, 75, 150]);
export const DEFAULT_TIMES = Object.freeze([0, 600, 1200, 1800]);

export function openWaterMask(grid = DEFAULT_GRID) {
  return Array.from({ length: grid.height }, () => Array.from({ length: grid.width }, () => false));
}

export function createV2CompatibilityField(options = {}) {
  const grid = options.grid ?? DEFAULT_GRID;
  return createBathymetryConditionedCurrentField({
    grid,
    depthAxisMeters: options.depthAxisMeters ?? DEFAULT_DEPTHS,
    timeAxisSeconds: options.timeAxisSeconds ?? DEFAULT_TIMES,
    landMask: options.landMask ?? openWaterMask(grid),
    seed: options.seed ?? 909,
    validTimeEndSeconds: options.validTimeEndSeconds ?? 1800,
    environmentGeneratorBackendId: 'cpuBathymetryConditionedSyntheticV2',
    ...(options.patch ?? {})
  });
}

export function createDepthStructuredField(options = {}) {
  const grid = options.grid ?? DEFAULT_GRID;
  return createBathymetryConditionedCurrentField({
    grid,
    depthAxisMeters: options.depthAxisMeters ?? DEFAULT_DEPTHS,
    timeAxisSeconds: options.timeAxisSeconds ?? DEFAULT_TIMES,
    landMask: options.landMask ?? openWaterMask(grid),
    seed: options.seed ?? 909,
    validTimeEndSeconds: options.validTimeEndSeconds ?? 1800,
    environmentGeneratorBackendId: 'cpuBathymetryConditionedSyntheticV3',
    verticalStructure: options.verticalStructure ?? { id: 'mixedRegionalBaroclinicV1' },
    ...(options.patch ?? {})
  });
}

export function createBarotropicControlField(options = {}) {
  return createDepthStructuredField({
    ...options,
    verticalStructure: { id: 'barotropicDepthUniform', profileFamilies: ['barotropicDepthUniform'] }
  });
}

export function findRepresentativeWetColumn(field, options = {}) {
  const timeSeconds = Number(options.timeSeconds ?? field.timeAxisSeconds?.[1] ?? 0);
  const depthMeters = Number(options.depthMeters ?? field.depthAxisMeters?.[Math.min(2, field.depthAxisMeters.length - 1)] ?? 0);
  let best = null;
  for (let y = 0; y < field.northAxisMeters.length; y += 1) {
    for (let x = 0; x < field.eastAxisMeters.length; x += 1) {
      const sample = sampleOceanCurrent({
        field,
        eastMeters: field.eastAxisMeters[x],
        northMeters: field.northAxisMeters[y],
        depthMeters,
        timeSeconds
      });
      if (!sample.wet) continue;
      if (!best || sample.magnitudeMetersPerSecond > best.sample.magnitudeMetersPerSecond) best = { xIndex: x, yIndex: y, eastMeters: field.eastAxisMeters[x], northMeters: field.northAxisMeters[y], sample };
    }
  }
  assert.ok(best, 'Expected at least one wet representative current column.');
  return best;
}

export function sampleColumn(field, column = null, timeSeconds = null) {
  const target = column ?? findRepresentativeWetColumn(field, { timeSeconds });
  const t = Number(timeSeconds ?? field.timeAxisSeconds?.[1] ?? 0);
  return sampleCurrentDepthProfile(field, target.eastMeters, target.northMeters, t).map((sample) => ({
    depthMeters: sample.depthMeters,
    u: sample.uEastMetersPerSecond,
    v: sample.vNorthMetersPerSecond,
    magnitude: sample.magnitudeMetersPerSecond,
    bearingDegrees: sample.bearingDegrees,
    wet: sample.wet,
    bottomDepthMeters: sample.bottomDepthMeters,
    lowerDepthIndex: sample.lowerDepthIndex,
    upperDepthIndex: sample.upperDepthIndex,
    depthInterpolationFraction: sample.depthInterpolationFraction,
    lowerTimeIndex: sample.lowerTimeIndex,
    upperTimeIndex: sample.upperTimeIndex,
    timeInterpolationFraction: sample.timeInterpolationFraction
  }));
}

export function columnMetrics(samples = []) {
  const wet = samples.filter((sample) => sample.wet && Number.isFinite(sample.u) && Number.isFinite(sample.v));
  let maxDelta = 0;
  for (let i = 0; i < wet.length; i += 1) {
    for (let j = i + 1; j < wet.length; j += 1) maxDelta = Math.max(maxDelta, Math.hypot(wet[i].u - wet[j].u, wet[i].v - wet[j].v));
  }
  const magnitudes = wet.map((sample) => sample.magnitude);
  const bearings = wet.map((sample) => sample.bearingDegrees);
  const materialThreshold = materialVectorDeltaForColumn(wet);
  return {
    wetCount: wet.length,
    maxPairwiseVectorDelta: round(maxDelta),
    magnitudeRange: round(magnitudes.length ? Math.max(...magnitudes) - Math.min(...magnitudes) : 0),
    bearingRangeDegrees: round(circularBearingRange(bearings)),
    materialThreshold: round(materialThreshold),
    materiallyDistinct: maxDelta >= materialThreshold,
    exactlyUniform: maxDelta <= 1e-9,
    classification: maxDelta <= 1e-9 ? 'EXACTLY_DEPTH_UNIFORM' : maxDelta >= materialThreshold ? 'MATERIAL_DEPTH_VARIATION' : 'WEAK_DEPTH_VARIATION'
  };
}

export function fixedColumnDepthAudit(field, options = {}) {
  const times = options.times ?? field.timeAxisSeconds.slice(0, Math.min(3, field.timeAxisSeconds.length));
  const columns = selectAuditColumns(field, options.columnCount ?? 10);
  const records = [];
  for (const column of columns) {
    for (const timeSeconds of times) {
      const samples = sampleColumn(field, column, timeSeconds);
      records.push({
        eastMeters: column.eastMeters,
        northMeters: column.northMeters,
        xIndex: column.xIndex,
        yIndex: column.yIndex,
        timeSeconds,
        bottomDepthMeters: field.bottomDepthMeters?.[column.yIndex]?.[column.xIndex] ?? null,
        canonicalDigest: field.digest ?? currentFieldDigest(field),
        renderDigest: null,
        samples,
        metrics: columnMetrics(samples),
        classification: classifyColumn(samples, field)
      });
    }
  }
  const material = records.filter((record) => record.classification === 'MATERIAL_DEPTH_VARIATION').length;
  const weak = records.filter((record) => record.classification === 'WEAK_DEPTH_VARIATION').length;
  const exact = records.filter((record) => record.classification === 'EXACTLY_DEPTH_UNIFORM').length;
  return {
    type: 'anchor.audit.current-fixed-column-depth-chain',
    version: 'flow-pkg-r2-fixed-column-depth-audit',
    backend: field.sourceMetadata?.environmentGeneratorBackendId ?? null,
    verticalStructureId: field.sourceMetadata?.verticalStructureId ?? null,
    records,
    counts: { total: records.length, material, weak, exact },
    materiallyDistinctFraction: round(material / Math.max(1, records.length)),
    canonicalLayerDigestCount: field.scientificDiagnostics?.depthLayerDigestCount ?? null,
    copiedLayerDetected: field.scientificDiagnostics?.copiedLayerDetected === true,
    renderFlattened: false,
    samplerFlattened: records.some((record) => record.samples.filter((sample) => sample.wet).length > 1 && record.samples.every((sample) => sample.lowerDepthIndex === record.samples[0].lowerDepthIndex && sample.upperDepthIndex === record.samples[0].upperDepthIndex))
  };
}

export function selectAuditColumns(field, count = 10) {
  const candidates = [];
  const depth = field.depthAxisMeters[Math.min(2, field.depthAxisMeters.length - 1)] ?? 0;
  const time = field.timeAxisSeconds[1] ?? 0;
  for (let y = 0; y < field.northAxisMeters.length; y += 1) {
    for (let x = 0; x < field.eastAxisMeters.length; x += 1) {
      const sample = sampleOceanCurrent({ field, eastMeters: field.eastAxisMeters[x], northMeters: field.northAxisMeters[y], depthMeters: depth, timeSeconds: time });
      if (!sample.wet) continue;
      const bottom = Number(field.bottomDepthMeters?.[y]?.[x] ?? 0);
      candidates.push({ xIndex: x, yIndex: y, eastMeters: field.eastAxisMeters[x], northMeters: field.northAxisMeters[y], bottomDepthMeters: bottom, speed: sample.magnitudeMetersPerSecond });
    }
  }
  assert.ok(candidates.length >= 1, 'Expected wet current audit candidates.');
  const picks = [];
  const sortedBySpeed = [...candidates].sort((a, b) => b.speed - a.speed);
  const sortedByDepth = [...candidates].sort((a, b) => b.bottomDepthMeters - a.bottomDepthMeters);
  const sortedByShallow = [...candidates].sort((a, b) => a.bottomDepthMeters - b.bottomDepthMeters);
  const seedPicks = [sortedBySpeed[0], sortedBySpeed.at(-1), sortedByDepth[0], sortedByShallow[0], candidates[Math.floor(candidates.length / 2)]];
  for (const item of seedPicks) addUnique(picks, item);
  const stride = Math.max(1, Math.floor(candidates.length / Math.max(1, count)));
  for (let i = 0; i < candidates.length && picks.length < count; i += stride) addUnique(picks, candidates[i]);
  for (const item of candidates) {
    if (picks.length >= count) break;
    addUnique(picks, item);
  }
  return picks.slice(0, Math.min(count, candidates.length));
}

export function classifyColumn(samples = [], field = {}) {
  const metrics = columnMetrics(samples);
  if (samples.filter((sample) => sample.wet).length < 2) return 'MASKED_BY_BATHYMETRY';
  if (field.sourceMetadata?.barotropicControl === true && metrics.exactlyUniform) return 'EXACTLY_DEPTH_UNIFORM';
  return metrics.classification;
}

export function assertMaterialDepthStructure(field, options = {}) {
  assert.equal(field.sourceMetadata?.environmentGeneratorBackendId, 'cpuBathymetryConditionedSyntheticV3');
  assert.notEqual(field.sourceMetadata?.verticalStructureId, 'barotropicDepthUniform');
  assert.equal(field.scientificDiagnostics?.copiedLayerDetected, false);
  assert.ok((field.scientificDiagnostics?.depthLayerDigestCount ?? 0) >= 2, 'Expected distinct depth layer digests.');
  assert.ok((field.scientificDiagnostics?.materiallyDistinctColumnFraction ?? 0) >= (options.minimumFraction ?? 0.5), 'Expected material depth structure across representative wet columns.');
}

export function assertBarotropicControl(field) {
  assert.equal(field.sourceMetadata?.environmentGeneratorBackendId, 'cpuBathymetryConditionedSyntheticV3');
  assert.equal(field.sourceMetadata?.barotropicControl, true);
  const column = findRepresentativeWetColumn(field);
  const samples = sampleColumn(field, column).filter((sample) => sample.wet);
  assert.ok(samples.length >= 2, 'Expected at least two wet barotropic depths.');
  const metrics = columnMetrics(samples);
  assert.equal(metrics.exactlyUniform, true);
}

export { assert, createCurrentVerticalStructureDescriptor, applyVerticalProfileToVector };

function addUnique(out, item) {
  if (!item) return;
  if (out.some((candidate) => candidate.xIndex === item.xIndex && candidate.yIndex === item.yIndex)) return;
  out.push(item);
}

function circularBearingRange(values = []) {
  const bearings = values.map(Number).filter(Number.isFinite);
  if (bearings.length < 2) return 0;
  const sorted = bearings.map((value) => ((value % 360) + 360) % 360).sort((a, b) => a - b);
  let maxGap = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const next = sorted[(index + 1) % sorted.length] + (index === sorted.length - 1 ? 360 : 0);
    maxGap = Math.max(maxGap, next - sorted[index]);
  }
  return 360 - maxGap;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}