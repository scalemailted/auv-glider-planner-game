import assert from 'node:assert/strict';
import * as currents from '../../packages/currents/src/index.js';

export { assert, currents };

export function createPackageFixtureField(options = {}) {
  const eastAxisMeters = options.eastAxisMeters ?? [0, 10];
  const northAxisMeters = options.northAxisMeters ?? [0, 10];
  const depthAxisMeters = options.depthAxisMeters ?? [0, 100];
  const timeAxisSeconds = options.timeAxisSeconds ?? [0, 100];
  const u = timeAxisSeconds.map((_time, ti) => depthAxisMeters.map((_depth, zi) => northAxisMeters.map((_north, yi) => eastAxisMeters.map((_east, xi) => round(ti * 10 + zi * 4 + yi * 2 + xi)))));
  const v = timeAxisSeconds.map((_time, ti) => depthAxisMeters.map((_depth, zi) => northAxisMeters.map((_north, yi) => eastAxisMeters.map((_east, xi) => round(-0.5 * ti + zi + yi - xi)))));
  return currents.createCurrentField4D({
    id: options.id ?? 'current-package-fixture-field',
    eastAxisMeters,
    northAxisMeters,
    depthAxisMeters,
    timeAxisSeconds,
    temporalBoundaryMode: options.temporalBoundaryMode ?? 'bounded',
    temporalPeriodSeconds: options.temporalPeriodSeconds ?? null,
    validTimeStartSeconds: options.validTimeStartSeconds ?? timeAxisSeconds[0],
    validTimeEndSeconds: options.validTimeEndSeconds ?? timeAxisSeconds.at(-1),
    uEastMetersPerSecond: u,
    vNorthMetersPerSecond: v,
    wetMask: options.wetMask ?? [[true, false], [true, true]],
    bottomDepthMeters: options.bottomDepthMeters ?? [[120, 120], [120, 50]],
    sourceMetadata: {
      sourceTier: options.sourceTier ?? 'manufacturedAnalytical',
      sourceType: 'manufactured',
      sourceId: options.id ?? 'current-package-fixture-field',
      sourceLabel: 'Current package manufactured fixture',
      equationFamily: 'manufactured:currentPackageFixture',
      depthDependent: true,
      timeDependent: true,
      temporalBoundaryMode: options.temporalBoundaryMode ?? 'bounded',
      temporalPeriodSeconds: options.temporalPeriodSeconds ?? null,
      validTimeStartSeconds: options.validTimeStartSeconds ?? timeAxisSeconds[0],
      validTimeEndSeconds: options.validTimeEndSeconds ?? timeAxisSeconds.at(-1),
      usesBathymetryMask: true,
      usesCoastlineBoundary: false,
      usesIsobathSteering: false,
      calibratedForecast: false,
      usesRealHycom: false,
      usesRealMarineCopernicus: false,
      seed: 101
    }
  });
}

export function sampleAt(field, patch = {}) {
  return currents.sampleOceanCurrent({
    field,
    eastMeters: patch.eastMeters ?? 5,
    northMeters: patch.northMeters ?? 5,
    depthMeters: patch.depthMeters ?? 50,
    timeSeconds: patch.timeSeconds ?? 50,
    interpolation: patch.interpolation ?? 'linear4d'
  });
}

export function assertFiniteSample(sample) {
  assert.equal(sample.type, 'anchor.science.ocean-current-sample');
  assert.equal(Number.isFinite(sample.uEastMetersPerSecond), true);
  assert.equal(Number.isFinite(sample.vNorthMetersPerSecond), true);
  assert.equal(Number.isFinite(sample.magnitudeMetersPerSecond), true);
  assert.equal(Number.isFinite(sample.bearingDegrees), true);
}

export function digestValue(value) {
  return `fnv1a32:${fnv(stable(value))}`;
}

export function compactFieldRecord(field, samples = []) {
  const summary = currents.currentFieldSummary(field);
  return {
    id: field.id,
    artifactDigest: field.digest,
    uArrayDigest: digestValue(field.uEastMetersPerSecond),
    vArrayDigest: digestValue(field.vNorthMetersPerSecond),
    wArrayDigest: field.wDownMetersPerSecond ? digestValue(field.wDownMetersPerSecond) : null,
    wetMaskDigest: digestValue(field.wetMask),
    bottomDepthDigest: digestValue(field.bottomDepthMeters),
    sourceMetadataDigest: digestValue(field.sourceMetadata),
    eastAxisCount: field.eastAxisMeters.length,
    northAxisCount: field.northAxisMeters.length,
    depthAxisCount: field.depthAxisMeters.length,
    timeAxisCount: field.timeAxisSeconds.length,
    coordinateFrame: field.coordinateFrame,
    temporalBoundaryMode: field.temporalBoundaryMode,
    temporalPeriodSeconds: field.temporalPeriodSeconds ?? null,
    speedMinimum: summary.speedStatistics?.min ?? null,
    speedMean: summary.speedStatistics?.mean ?? null,
    speedMaximum: summary.speedStatistics?.max ?? null,
    calmCount: summary.calmVectorCount ?? 0,
    landVectorCount: summary.landVectorCount ?? 0,
    belowBottomVectorCount: summary.belowBottomVectorCount ?? 0,
    validationStatus: currents.validateCurrentField4D(field).status,
    diagnosticsStatus: summary.diagnostics?.status ?? null,
    samples
  };
}

export function selectedSamples(field, times = null) {
  const east = field.eastAxisMeters;
  const north = field.northAxisMeters;
  const depth = field.depthAxisMeters;
  const sampleTimes = times ?? field.timeAxisSeconds;
  const points = [
    { eastMeters: east[0], northMeters: north[0], depthMeters: depth[0], label: 'origin-surface' },
    { eastMeters: east[Math.floor((east.length - 1) / 2)], northMeters: north[Math.floor((north.length - 1) / 2)], depthMeters: depth[Math.floor((depth.length - 1) / 2)], label: 'middle-middepth' },
    { eastMeters: east.at(-1), northMeters: north.at(-1), depthMeters: depth.at(-1), label: 'max-deep' }
  ];
  const out = [];
  for (const point of points) {
    for (const timeSeconds of sampleTimes) {
      const sample = currents.sampleOceanCurrent({ field, ...point, timeSeconds, interpolation: 'linear4d' });
      out.push({
        label: point.label,
        eastMeters: point.eastMeters,
        northMeters: point.northMeters,
        depthMeters: point.depthMeters,
        timeSeconds,
        u: sample.uEastMetersPerSecond,
        v: sample.vNorthMetersPerSecond,
        wet: sample.wet,
        belowBottom: sample.belowBottom,
        outsideDomain: sample.outsideDomain,
        lowerTimeSeconds: sample.lowerTimeSeconds,
        upperTimeSeconds: sample.upperTimeSeconds,
        timeFraction: sample.timeInterpolationFraction
      });
    }
  }
  return out;
}

function round(value, digits = 8) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function fnv(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}