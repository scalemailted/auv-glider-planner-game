import { createBathymetryArtifact, createBathymetrySampler, sampleBathymetry, bathymetryArtifactSummary } from '../../packages/bathymetry/src/index.js';
import {
  bathymetryFieldStats,
  bathymetrySlopeField,
  createBasinSeamountBathymetry,
  createCoastalOperationalBathymetry,
  createIslandArcBathymetry,
  createShelfCanyonBathymetry
} from '../../src/core/science/BathymetryFieldModel.js';
import { createBathymetryArtifactFromField } from '../../src/core/generation/BathymetryArtifactAdapter.js';
import { createRegionalContinentalShelfScenario, createRegionalMissionBundle } from '../../src/core/generation/RegionalMissionDefaults.js';
import { createBathymetryConditionedCurrentField } from '../../src/core/science/BathymetryConditionedCurrentBuilder.js';
import { computeCurrentFieldScientificDiagnostics } from '../../src/core/science/CurrentFieldScientificDiagnostics.js';
import { createManufacturedCurrentField, evaluateExpectedCurrent, manufacturedCurrentFieldCatalog } from '../../src/core/science/ManufacturedCurrentFieldCatalog.js';
import { createOceanCurrentSampler, sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { sampleScalarFieldContinuous } from '../../src/core/science/VolumetricFieldSampler.js';

export const SCI_VALID_VERSION = 'sci-valid-r1';
export const DEFAULT_EXTENT_METERS = Object.freeze({ east: 12000, north: 8000 });
export const DEFAULT_DEPTH_COORDINATES = Object.freeze([0, 10, 35, 75, 150]);
export const DEFAULT_TIME_COORDINATES = Object.freeze([0, 300, 600, 900]);

export function assertCondition(condition, message, details = null) {
  if (condition) return;
  const error = new Error(message);
  if (details) error.details = details;
  throw error;
}

export function assertFinite(value, label) {
  assertCondition(Number.isFinite(Number(value)), `${label} must be finite.`, { value });
  return Number(value);
}

export function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

export function stats(values = []) {
  const finite = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return { count: 0, min: null, mean: null, max: null, rms: null, p50: null, p95: null };
  const mean = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  const rms = Math.sqrt(finite.reduce((sum, value) => sum + value * value, 0) / finite.length);
  return {
    count: finite.length,
    min: round(finite[0]),
    mean: round(mean),
    max: round(finite.at(-1)),
    rms: round(rms),
    p50: round(finite[Math.min(finite.length - 1, Math.floor(finite.length * 0.5))]),
    p95: round(finite[Math.min(finite.length - 1, Math.floor(finite.length * 0.95))])
  };
}

export function errorStats(errors = []) {
  const absolute = errors.map((value) => Math.abs(Number(value))).filter(Number.isFinite);
  return {
    count: absolute.length,
    l1: absolute.length ? round(absolute.reduce((sum, value) => sum + value, 0) / absolute.length) : null,
    l2: absolute.length ? round(Math.sqrt(absolute.reduce((sum, value) => sum + value * value, 0) / absolute.length)) : null,
    linf: absolute.length ? round(Math.max(...absolute)) : null
  };
}

export function fnv1aDigest(value) {
  const text = typeof value === 'string' ? value : stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function createAxis(count, extentMeters) {
  const n = Math.max(1, Math.round(Number(count) || 1));
  if (n === 1) return [0];
  return Array.from({ length: n }, (_value, index) => round(Number(extentMeters) * index / (n - 1)));
}

export function manufacturedBathymetryCaseCatalog() {
  return [
    {
      id: 'flatBasin',
      label: 'Flat basin',
      exactness: 'bilinearExact',
      thresholdMeters: 1e-9,
      evaluator: () => 120
    },
    {
      id: 'planarSlope',
      label: 'Planar shelf slope',
      exactness: 'bilinearExact',
      thresholdMeters: 1e-9,
      evaluator: ({ eastMeters, northMeters }) => 18 + eastMeters * 0.006 + northMeters * 0.004
    },
    {
      id: 'smoothShelfBreak',
      label: 'Smooth shelf break',
      exactness: 'convergentApproximation',
      thresholdMeters: 3.2,
      evaluator: ({ u, v }) => 24 + 230 * smoothstep(0.34, 0.62, u) + 12 * Math.sin(Math.PI * 2 * v) * smoothstep(0.18, 0.9, u)
    },
    {
      id: 'gaussianSeamount',
      label: 'Gaussian seamount',
      exactness: 'convergentApproximation',
      thresholdMeters: 5.5,
      evaluator: ({ u, v }) => clamp(260 - 130 * gaussian2(u, v, 0.68, 0.42, 0.15, 0.18), 12, 320)
    },
    {
      id: 'submarineCanyon',
      label: 'Submarine canyon',
      exactness: 'convergentApproximation',
      thresholdMeters: 8.0,
      evaluator: ({ u, v }) => 58 + 170 * smoothstep(0.08, 0.95, u) + 85 * gaussian2(u, v, 0.44 + 0.18 * v, 0.56, 0.045, 0.3)
    },
    {
      id: 'sinusoidalRidge',
      label: 'Sinusoidal ridge',
      exactness: 'convergentApproximation',
      thresholdMeters: 2.8,
      evaluator: ({ u, v }) => 130 + 22 * Math.sin(Math.PI * 2 * u) + 16 * Math.cos(Math.PI * 2 * v)
    },
    {
      id: 'conicalIsland',
      label: 'Conical island and wet mask',
      exactness: 'maskAndFinite',
      thresholdMeters: 7.0,
      landEvaluator: ({ u, v }) => Math.hypot((u - 0.48) / 0.12, (v - 0.52) / 0.16) < 0.68,
      evaluator: ({ u, v }) => {
        const r = Math.hypot((u - 0.48) / 0.12, (v - 0.52) / 0.16);
        return r < 0.68 ? 0 : clamp(30 + 155 * Math.min(1, Math.max(0, r - 0.68)), 8, 210);
      }
    },
    {
      id: 'semiEnclosedBasin',
      label: 'Semi-enclosed basin mask',
      exactness: 'maskAndFinite',
      thresholdMeters: 6.0,
      landEvaluator: ({ u, v }) => u < 0.08 || v < 0.08 || v > 0.92 || (u > 0.84 && (v < 0.42 || v > 0.58)),
      evaluator: ({ u, v }) => 46 + 95 * u + 22 * gaussian2(u, v, 0.52, 0.5, 0.24, 0.24)
    }
  ];
}

export function manufacturedBathymetryCaseById(id) {
  const found = manufacturedBathymetryCaseCatalog().find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown manufactured bathymetry case: ${id}`);
  return found;
}

export function createManufacturedBathymetryArtifact(caseId, options = {}) {
  const definition = manufacturedBathymetryCaseById(caseId);
  const width = Math.max(2, Math.round(Number(options.width ?? 49)));
  const height = Math.max(2, Math.round(Number(options.height ?? 37)));
  const extent = options.physicalExtentMeters ?? DEFAULT_EXTENT_METERS;
  const eastAxisMeters = createAxis(width, extent.east);
  const northAxisMeters = createAxis(height, extent.north);
  const bottomDepthMeters = [];
  const landMask = [];
  const wetMask = [];
  for (let y = 0; y < height; y += 1) {
    const depthRow = [];
    const landRow = [];
    const wetRow = [];
    for (let x = 0; x < width; x += 1) {
      const context = normalizedContext(eastAxisMeters[x], northAxisMeters[y], extent);
      const land = definition.landEvaluator?.(context) === true;
      const depth = land ? 0 : Math.max(0, definition.evaluator(context));
      depthRow.push(round(depth));
      landRow.push(land);
      wetRow.push(!land && depth > 0);
    }
    bottomDepthMeters.push(depthRow);
    landMask.push(landRow);
    wetMask.push(wetRow);
  }
  return createBathymetryArtifact({
    id: options.id ?? `manufactured-${caseId}-${width}x${height}`,
    manifestId: options.manifestId ?? `manufactured-${caseId}`,
    seed: options.seed ?? `sci-valid-r1:${caseId}:${width}x${height}`,
    coordinateFrame: 'localEastNorthMeters',
    physicalExtentMeters: extent,
    eastAxisMeters,
    northAxisMeters,
    bottomDepthMeters,
    landMask,
    wetMask,
    sourceMetadata: {
      sourceId: `manufactured-${caseId}`,
      sourceTier: 'manufacturedAnalytical',
      synthetic: true,
      calibratedBathymetry: false,
      operationalNavigationProduct: false
    },
    provenance: {
      generatedBy: 'sci-valid-r1-manufactured-bathymetry',
      generatorVersion: SCI_VALID_VERSION,
      synthetic: true,
      calibratedBathymetry: false,
      operationalNavigationProduct: false
    }
  });
}

export function sampleManufacturedBathymetryCase(caseId, options = {}) {
  const definition = manufacturedBathymetryCaseById(caseId);
  const extent = options.physicalExtentMeters ?? DEFAULT_EXTENT_METERS;
  const artifact = options.artifact ?? createManufacturedBathymetryArtifact(caseId, options);
  const sampler = createBathymetrySampler(artifact);
  const samplePoints = options.samplePoints ?? deterministicSamplePoints(extent, definition, options.sampleCount ?? 81);
  const rows = samplePoints.map((point) => {
    const sample = sampleBathymetry(sampler, point.eastMeters, point.northMeters, { interpolation: 'bilinear' });
    const context = normalizedContext(point.eastMeters, point.northMeters, extent);
    const expectedLand = definition.landEvaluator?.(context) === true;
    const expected = expectedLand ? 0 : definition.evaluator(context);
    return {
      ...point,
      expected: round(expected),
      actual: sample.bottomDepthMeters,
      error: sample.bottomDepthMeters == null ? null : round(sample.bottomDepthMeters - expected),
      expectedLand,
      wet: sample.wet,
      land: sample.land,
      outsideDomain: sample.outsideDomain
    };
  });
  return {
    id: definition.id,
    label: definition.label,
    exactness: definition.exactness,
    thresholdMeters: definition.thresholdMeters,
    artifactSummary: bathymetryArtifactSummary(artifact),
    sampleCount: rows.length,
    error: errorStats(rows.filter((row) => !row.expectedLand).map((row) => row.error)),
    finite: rows.every((row) => Number.isFinite(Number(row.actual)) || row.expectedLand || row.outsideDomain),
    landMaskAgreement: artifact.landMask.every((row, y) => row.every((land, x) => !(land === true && artifact.wetMask[y]?.[x] === true) && (land !== true || Number(artifact.bottomDepthMeters[y]?.[x] ?? 0) === 0))),
    rows
  };
}

export function deterministicSamplePoints(extent = DEFAULT_EXTENT_METERS, definition = {}, count = 81) {
  const side = Math.max(3, Math.round(Math.sqrt(count)));
  const points = [];
  for (let j = 1; j <= side; j += 1) {
    for (let i = 1; i <= side; i += 1) {
      const u = (i - 0.37 + 0.11 * ((j % 3) - 1)) / (side + 0.4);
      const v = (j - 0.41 + 0.07 * ((i % 2) - 0.5)) / (side + 0.35);
      const eastMeters = clamp(u, 0.01, 0.99) * extent.east;
      const northMeters = clamp(v, 0.01, 0.99) * extent.north;
      const context = normalizedContext(eastMeters, northMeters, extent);
      if (definition.landEvaluator?.(context) === true && definition.exactness !== 'maskAndFinite') continue;
      points.push({ eastMeters: round(eastMeters), northMeters: round(northMeters) });
    }
  }
  return points;
}

export function normalizedContext(eastMeters, northMeters, extent = DEFAULT_EXTENT_METERS) {
  const u = clamp(Number(eastMeters) / Math.max(1, Number(extent.east)), 0, 1);
  const v = clamp(Number(northMeters) / Math.max(1, Number(extent.north)), 0, 1);
  return { eastMeters: Number(eastMeters), northMeters: Number(northMeters), u, v };
}

export function bathymetryResolutionConvergence(caseId, resolutions = [17, 33, 65]) {
  const definition = manufacturedBathymetryCaseById(caseId);
  const runs = resolutions.map((size) => {
    const result = sampleManufacturedBathymetryCase(caseId, { width: size, height: Math.max(9, Math.round(size * 0.74)), sampleCount: 144 });
    return { resolution: size, l2: result.error.l2, linf: result.error.linf, thresholdMeters: definition.thresholdMeters };
  });
  const monotoneEnough = runs.every((run, index) => index === 0 || Number(run.l2) <= Number(runs[index - 1].l2) * 1.08 + 1e-9);
  return { caseId, runs, monotoneEnough };
}

export function productionBathymetryEnsemble(options = {}) {
  const seeds = options.seeds ?? ['sci-a', 'sci-b', 'sci-c', 'sci-d'];
  const factories = [
    ['coastalShelf', createCoastalOperationalBathymetry],
    ['shelfCanyon', createShelfCanyonBathymetry],
    ['islandArc', createIslandArcBathymetry],
    ['basinSeamount', createBasinSeamountBathymetry]
  ];
  const records = [];
  for (const seed of seeds) {
    for (const [archetype, factory] of factories) {
      const bathymetry = factory({ seed: `${seed}:${archetype}`, width: 44, height: 30, maxDepthMeters: 320 });
      const artifact = createBathymetryArtifactFromField(bathymetry, {
        id: `${seed}:${archetype}:artifact`,
        physicalExtentMeters: DEFAULT_EXTENT_METERS
      });
      const slopeValues = bathymetrySlopeField(bathymetry).flat().map(Number).filter(Number.isFinite);
      const fieldStats = bathymetryFieldStats(bathymetry);
      records.push({
        seed,
        archetype,
        digest: artifact.artifactDigest,
        manifestDigest: artifact.manifestDigest,
        width: bathymetry.width,
        height: bathymetry.height,
        finite: fieldStats.finite === true,
        minDepthMeters: fieldStats.minDepthMeters,
        meanDepthMeters: fieldStats.meanDepthMeters,
        maxDepthMeters: fieldStats.maxDepthMeters,
        waterCellCount: fieldStats.waterCellCount,
        landCellCount: fieldStats.landCellCount,
        wetFraction: round(fieldStats.waterCellCount / Math.max(1, fieldStats.waterCellCount + fieldStats.landCellCount)),
        slope: stats(slopeValues),
        coastlineSegmentCount: bathymetry.coastlineEdges?.length ?? 0,
        featureIds: bathymetry.featureIds ?? [],
        synthetic: bathymetry.synthetic === true,
        calibratedSurveyData: bathymetry.calibratedSurveyData === true
      });
    }
  }
  return {
    type: 'anchor.science.homegrown-bathymetry-ensemble-summary',
    version: SCI_VALID_VERSION,
    seeds,
    recordCount: records.length,
    duplicateDigestCount: records.length - new Set(records.map((row) => row.digest)).size,
    archetypes: factories.map(([id]) => id),
    stats: {
      meanDepthMeters: stats(records.map((row) => row.meanDepthMeters)),
      maxDepthMeters: stats(records.map((row) => row.maxDepthMeters)),
      wetFraction: stats(records.map((row) => row.wetFraction)),
      coastlineSegmentCount: stats(records.map((row) => row.coastlineSegmentCount)),
      slopeMean: stats(records.map((row) => row.slope.mean))
    },
    records
  };
}

export function createProductionCurrentFixture(options = {}) {
  const level = options.level ?? createRegionalContinentalShelfScenario({ seed: options.seed ?? 'sci-valid-r1-current', resolutionProfile: options.resolutionProfile ?? 'regionalShelfFleet' });
  const grid = options.grid ?? { width: 48, height: 30 };
  const field = createBathymetryConditionedCurrentField({
    level,
    grid,
    depthAxisMeters: options.depthAxisMeters ?? DEFAULT_DEPTH_COORDINATES,
    timeAxisSeconds: options.timeAxisSeconds ?? DEFAULT_TIME_COORDINATES,
    validTimeStartSeconds: 0,
    validTimeEndSeconds: DEFAULT_TIME_COORDINATES.at(-1),
    seed: options.seed ?? 'sci-valid-r1-current'
  });
  return { level, field, sampler: createOceanCurrentSampler(field), diagnostics: computeCurrentFieldScientificDiagnostics(field) };
}

export function findDeepWetCurrentPoint(field = {}, options = {}) {
  const depthAxis = field.depthAxisMeters ?? [0];
  const requestedDepth = Number(options.minBottomDepthMeters ?? depthAxis.at(-1) ?? 0);
  let best = null;
  for (let y = 0; y < (field.northAxisMeters?.length ?? 0); y += 1) {
    for (let x = 0; x < (field.eastAxisMeters?.length ?? 0); x += 1) {
      const bottom = Number(field.bottomDepthMeters?.[y]?.[x] ?? 0);
      const wet = field.wetMask?.[y]?.[x] !== false;
      if (!wet || bottom < requestedDepth) continue;
      const centerPenalty = Math.abs(x - (field.eastAxisMeters.length - 1) / 2) + Math.abs(y - (field.northAxisMeters.length - 1) / 2);
      const score = bottom - centerPenalty * 0.5;
      if (!best || score > best.score) best = { xIndex: x, yIndex: y, eastMeters: field.eastAxisMeters[x], northMeters: field.northAxisMeters[y], bottomDepthMeters: bottom, score };
    }
  }
  assertCondition(Boolean(best), 'Could not find a wet current point deep enough for all requested depth layers.', { requestedDepth });
  return best;
}

export function sampleCurrentByDepth(field, point, timeSeconds = 0) {
  return (field.depthAxisMeters ?? []).map((depthMeters) => sampleOceanCurrent({ field, eastMeters: point.eastMeters, northMeters: point.northMeters, depthMeters, timeSeconds }));
}

export function sampleCurrentByTime(field, point, depthMeters = 0) {
  return (field.timeAxisSeconds ?? []).map((timeSeconds) => sampleOceanCurrent({ field, eastMeters: point.eastMeters, northMeters: point.northMeters, depthMeters, timeSeconds }));
}

export function maxPairwiseVectorDifference(samples = []) {
  let max = 0;
  for (let i = 0; i < samples.length; i += 1) {
    for (let j = i + 1; j < samples.length; j += 1) {
      const du = Number(samples[i].uEastMetersPerSecond) - Number(samples[j].uEastMetersPerSecond);
      const dv = Number(samples[i].vNorthMetersPerSecond) - Number(samples[j].vNorthMetersPerSecond);
      max = Math.max(max, Math.hypot(du, dv));
    }
  }
  return round(max);
}

export function manufacturedCurrentExactness(id, options = {}) {
  const field = createManufacturedCurrentField(id, options);
  const points = options.points ?? currentSamplePoints(field);
  const rows = [];
  for (const point of points) {
    const actual = sampleOceanCurrent({ field, ...point });
    const expected = evaluateExpectedCurrent(field, point.eastMeters, point.northMeters, point.depthMeters, point.timeSeconds);
    rows.push({
      ...point,
      actual: { u: actual.uEastMetersPerSecond, v: actual.vNorthMetersPerSecond },
      expected,
      errorU: round(actual.uEastMetersPerSecond - expected.u, 10),
      errorV: round(actual.vNorthMetersPerSecond - expected.v, 10),
      errorMagnitude: round(Math.hypot(actual.uEastMetersPerSecond - expected.u, actual.vNorthMetersPerSecond - expected.v), 10),
      wet: actual.wet
    });
  }
  return {
    id,
    label: field.label,
    digest: field.digest,
    sourceTier: field.sourceMetadata?.sourceTier,
    depthDependent: field.sourceMetadata?.depthDependent === true,
    timeDependent: field.sourceMetadata?.timeDependent === true,
    error: errorStats(rows.map((row) => row.errorMagnitude)),
    rows
  };
}

export function currentSamplePoints(field = {}) {
  const xs = [0, 1.5, 3.25, Number(field.eastAxisMeters?.at(-1) ?? 4)];
  const ys = [0, 1.25, 2.75, Number(field.northAxisMeters?.at(-1) ?? 4)];
  const zs = [0, 22.5, Number(field.depthAxisMeters?.at(-1) ?? 150)];
  const ts = [0, 450, Number(field.timeAxisSeconds?.at(-1) ?? 1800)];
  const points = [];
  for (const eastMeters of xs) for (const northMeters of ys) for (const depthMeters of zs) for (const timeSeconds of ts) {
    points.push({ eastMeters, northMeters, depthMeters, timeSeconds });
  }
  return points;
}

export function manufacturedCurrentCatalogIds() {
  return manufacturedCurrentFieldCatalog().map((entry) => entry.id);
}

export function createScalarField4d({ width = 8, height = 6, depthCoordinates = DEFAULT_DEPTH_COORDINATES, timeCoordinates = DEFAULT_TIME_COORDINATES, evaluator }) {
  return timeCoordinates.map((timeSeconds) => depthCoordinates.map((depthMeters) => (
    Array.from({ length: height }, (_row, y) => (
      Array.from({ length: width }, (_cell, x) => round(evaluator({ x, y, depthMeters, timeSeconds, width, height })))
    ))
  )));
}

export function scalarFieldMass(field = []) {
  const values = [];
  walkNested(field, (value) => values.push(Number(value)));
  return round(values.filter(Number.isFinite).reduce((sum, value) => sum + value, 0));
}

export function scalarFieldStats(field = []) {
  const values = [];
  walkNested(field, (value) => values.push(Number(value)));
  return stats(values);
}

export function sampleScalarFixture(field, point, options = {}) {
  return sampleScalarFieldContinuous({
    field,
    x: point.x,
    y: point.y,
    depthMeters: point.depthMeters,
    timeSeconds: point.timeSeconds,
    depthCoordinates: options.depthCoordinates ?? DEFAULT_DEPTH_COORDINATES,
    timeCoordinates: options.timeCoordinates ?? DEFAULT_TIME_COORDINATES,
    interpolationProfileId: options.interpolationProfileId ?? 'quadrilinearTimeVolumeV1'
  });
}

export function createHomegrownEnvironmentBaselineFixture() {
  const bathymetry = productionBathymetryEnsemble({ seeds: ['sci-a', 'sci-b', 'sci-c'] });
  const currentFixture = createProductionCurrentFixture({ seed: 'sci-valid-r1-fixture' });
  const point = findDeepWetCurrentPoint(currentFixture.field);
  const depthSamples = sampleCurrentByDepth(currentFixture.field, point, currentFixture.field.timeAxisSeconds[1] ?? 0);
  const timeSamples = sampleCurrentByTime(currentFixture.field, point, currentFixture.field.depthAxisMeters[1] ?? 0);
  const missionBundle = createRegionalMissionBundle({ seed: 'sci-valid-r1-fixture', agentCount: 3 });
  const scalar = createScalarField4d({
    width: 8,
    height: 6,
    evaluator: ({ x, y, depthMeters, timeSeconds }) => 0.2 + 0.04 * x + 0.03 * y + 0.002 * depthMeters + 0.0002 * timeSeconds
  });
  return {
    type: 'anchor.science.homegrown-environment-baseline-fixture',
    version: SCI_VALID_VERSION,
    deterministic: true,
    externalOracleUsed: false,
    calibratedOceanForecast: false,
    generatedBy: 'tools/js/audit_bathymetry_ensemble_statistics.mjs --update-fixture',
    bathymetry: {
      ensembleDigest: fnv1aDigest(bathymetry.records.map((row) => ({ seed: row.seed, archetype: row.archetype, digest: row.digest }))),
      recordCount: bathymetry.recordCount,
      duplicateDigestCount: bathymetry.duplicateDigestCount,
      stats: bathymetry.stats,
      records: bathymetry.records.map((row) => ({
        seed: row.seed,
        archetype: row.archetype,
        digest: row.digest,
        minDepthMeters: row.minDepthMeters,
        meanDepthMeters: row.meanDepthMeters,
        maxDepthMeters: row.maxDepthMeters,
        wetFraction: row.wetFraction,
        coastlineSegmentCount: row.coastlineSegmentCount
      }))
    },
    currents: {
      fieldDigest: currentFixture.field.digest,
      sourceTier: currentFixture.field.sourceMetadata?.sourceTier,
      equationFamily: currentFixture.field.sourceMetadata?.equationFamily,
      depthAxisMeters: currentFixture.field.depthAxisMeters,
      timeAxisSeconds: currentFixture.field.timeAxisSeconds,
      samplePoint: point,
      maxDepthVectorDifference: maxPairwiseVectorDifference(depthSamples),
      maxTemporalVectorDifference: maxPairwiseVectorDifference(timeSamples),
      diagnostics: {
        status: currentFixture.diagnostics.status,
        speedMean: currentFixture.diagnostics.speedMean,
        speedMaximum: currentFixture.diagnostics.speedMaximum,
        divergenceRms: currentFixture.diagnostics.divergenceRms,
        verticalShearRms: currentFixture.diagnostics.verticalShearRms,
        temporalChangeRms: currentFixture.diagnostics.temporalChangeRms,
        landVectorCount: currentFixture.diagnostics.landVectorCount,
        belowBottomVectorCount: currentFixture.diagnostics.belowBottomVectorCount,
        cellwiseDirectionNoiseScore: currentFixture.diagnostics.cellwiseDirectionNoiseScore
      }
    },
    scalarProcesses: {
      manufacturedLinearDigest: fnv1aDigest(scalar),
      stats: scalarFieldStats(scalar),
      sample: sampleScalarFixture(scalar, { x: 2.5, y: 1.5, depthMeters: 35, timeSeconds: 300 }).value
    },
    missionCoupling: {
      compactExportDigest: fnv1aDigest(missionBundle.compactExport),
      agentCount: missionBundle.mission.agents.length,
      levelId: missionBundle.level.levelId,
      missionId: missionBundle.mission.missionId,
      bathymetryArtifactDigest: missionBundle.level.bathymetryArtifact?.artifactDigest ?? null,
      currentVectorDigest: missionBundle.compactExport.fieldDigests?.currentVector ?? null,
      scienceValueDigest: missionBundle.compactExport.fieldDigests?.scienceValue ?? null
    }
  };
}

export function noCalibratedOceanClaims(value) {
  const text = stableStringify(value);
  const forbidden = [/calibrated\s+ocean\s+forecast\s*[:=]\s*true/i, /usesRealHycom\s*[:=]\s*true/i, /usesRealMarineCopernicus\s*[:=]\s*true/i];
  return forbidden.every((pattern) => !pattern.test(text));
}

function walkNested(value, visitor) {
  if (Array.isArray(value)) {
    for (const entry of value) walkNested(entry, visitor);
    return;
  }
  visitor(value);
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp((Number(value) - edge0) / Math.max(1e-9, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function gaussian2(u, v, cx, cy, sx, sy) {
  return Math.exp(-((u - cx) ** 2) / Math.max(1e-9, sx * sx) - ((v - cy) ** 2) / Math.max(1e-9, sy * sy));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

