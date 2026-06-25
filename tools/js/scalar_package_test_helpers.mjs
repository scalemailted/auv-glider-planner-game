import assert from 'node:assert/strict';
import * as scalarProcesses from '../../packages/scalar-processes/src/index.js';

export { assert, scalarProcesses };

export function createPackageFixtureField(options = {}) {
  const xAxis = options.xAxis ?? [0, 1];
  const yAxis = options.yAxis ?? [0, 1];
  const depthAxisMeters = options.depthAxisMeters ?? [0, 100];
  const timeAxisSeconds = options.timeAxisSeconds ?? [0, 100];
  const scalarValue = timeAxisSeconds.map((timeSeconds) => depthAxisMeters.map((depthMeters) => yAxis.map((_north, yi) => xAxis.map((_east, xi) => round(1 + xi + 2 * yi + 0.03 * depthMeters + 0.004 * timeSeconds)))));
  return scalarProcesses.createScalarField4D({
    id: options.id ?? 'scalar-package-fixture-field',
    xAxis,
    yAxis,
    depthAxisMeters,
    timeAxisSeconds,
    scalarValue,
    sourceMetadata: {
      sourceTier: options.sourceTier ?? 'manufacturedAnalytical',
      sourceType: 'manufactured',
      sourceId: options.id ?? 'scalar-package-fixture-field',
      label: 'Scalar package manufactured fixture',
      processKind: 'manufactured:scalarPackageFixture',
      equationFamily: 'manufactured:scalarPackageFixture',
      generatorBackend: 'scalarPackageTestHelper',
      generatorVersion: 'process-pkg-r1',
      synthetic: true,
      calibratedForecast: false,
      calibratedOceanForecast: false,
      calibratedBiogeochemicalForecast: false,
      depthDependent: true,
      timeDependent: true,
      seed: 202
    }
  });
}

export function sampleAt(field, patch = {}) {
  return scalarProcesses.sampleScalarField4D(field, {
    x: patch.x ?? 0.5,
    y: patch.y ?? 0.5,
    depthMeters: patch.depthMeters ?? 50,
    timeSeconds: patch.timeSeconds ?? 50,
    interpolationProfileId: patch.interpolationProfileId ?? 'quadrilinearTimeVolumeV1'
  });
}

export function assertFiniteSample(sample) {
  assert.equal(sample.type, 'anchor.science.volumetric-field-sample');
  assert.equal(sample.fieldType, 'scalar');
  assert.equal(Number.isFinite(sample.value), true);
  assert.equal(sample.valid, true);
}

export function compactFieldRecord(field, samples = []) {
  const summary = scalarProcesses.scalarField4DSummary(field);
  return {
    id: field.id,
    artifactDigest: field.digest,
    scalarArrayDigest: digestValue(field.scalarValue),
    sourceMetadataDigest: digestValue(field.sourceMetadata),
    xAxisCount: field.xAxis.length,
    yAxisCount: field.yAxis.length,
    depthAxisCount: field.depthAxisMeters.length,
    timeAxisCount: field.timeAxisSeconds.length,
    coordinateFrame: field.coordinateFrame,
    scalarMinimum: summary.scalarStatistics?.min ?? null,
    scalarMean: summary.scalarStatistics?.mean ?? null,
    scalarMaximum: summary.scalarStatistics?.max ?? null,
    depthMeanRange: summary.depthMeanRange ?? null,
    timeMeanRange: summary.timeMeanRange ?? null,
    materiallyDepthVarying: summary.materiallyDepthVarying === true,
    temporallyVarying: summary.temporallyVarying === true,
    validationStatus: scalarProcesses.validateScalarField4D(field).status,
    samples
  };
}

export function selectedSamples(field, times = null) {
  const sampleTimes = times ?? field.timeAxisSeconds;
  const points = [
    { x: 0, y: 0, depthMeters: field.depthAxisMeters[0], label: 'origin-surface' },
    { x: (field.xAxis.length - 1) / 2, y: (field.yAxis.length - 1) / 2, depthMeters: field.depthAxisMeters[Math.floor((field.depthAxisMeters.length - 1) / 2)], label: 'middle-middepth' },
    { x: field.xAxis.length - 1, y: field.yAxis.length - 1, depthMeters: field.depthAxisMeters.at(-1), label: 'max-deep' }
  ];
  const out = [];
  for (const point of points) {
    for (const timeSeconds of sampleTimes) {
      const sample = scalarProcesses.sampleScalarField4D(field, { ...point, timeSeconds });
      out.push({
        label: point.label,
        x: point.x,
        y: point.y,
        depthMeters: point.depthMeters,
        timeSeconds,
        value: sample.value,
        valid: sample.valid,
        exactNode: sample.exactNode,
        weights: sample.interpolationWeights
      });
    }
  }
  return out;
}

export function digestValue(value) {
  return `fnv1a32:${fnv(stable(value))}`;
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
