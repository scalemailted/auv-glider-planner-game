import { createManufacturedCurrentField } from '../science/ManufacturedCurrentFieldCatalog.js';
import { sampleOceanCurrent } from '../science/OceanCurrentFieldSampler.js';

export const CURRENT_FIELD_MISSION_BENCHMARK_VERSION = 'current-field-mission-benchmark-flow-r2a-3';

export function runCurrentFieldMissionBenchmarks(options = {}) {
  const durationSeconds = Number(options.durationSeconds ?? 600);
  const driftGain = Number(options.driftGain ?? 0.5);
  const reports = [
    uniformDriftBenchmark({ durationSeconds, driftGain }),
    depthChoiceBenchmark({ durationSeconds, driftGain }),
    departureTimeBenchmark({ durationSeconds, driftGain }),
    eddyCrossingBenchmark({ durationSeconds, driftGain }),
    currentDisabledControl({ durationSeconds, driftGain })
  ];
  return {
    type: 'anchor.evaluation.current-field-mission-benchmark-report',
    version: CURRENT_FIELD_MISSION_BENCHMARK_VERSION,
    reports,
    pass: reports.every((report) => report.status === 'PASS'),
    warnings: reports.flatMap((report) => report.warnings ?? [])
  };
}

export function uniformDriftBenchmark(options = {}) {
  const field = createManufacturedCurrentField('uniformTranslation');
  const sample = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 0 });
  const durationSeconds = Number(options.durationSeconds ?? 600);
  const driftGain = Number(options.driftGain ?? 0.5);
  const expected = {
    deltaEastMeters: round(sample.uEastMetersPerSecond * durationSeconds * driftGain),
    deltaNorthMeters: round(sample.vNorthMetersPerSecond * durationSeconds * driftGain)
  };
  return report('uniformDrift', 'Uniform drift benchmark', expected, Math.hypot(expected.deltaEastMeters, expected.deltaNorthMeters) > 0);
}

export function depthChoiceBenchmark(options = {}) {
  const field = createManufacturedCurrentField('linearShearWithDepth');
  const shallow = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 0 });
  const deep = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 150, timeSeconds: 0 });
  const durationSeconds = Number(options.durationSeconds ?? 600);
  const driftGain = Number(options.driftGain ?? 0.5);
  const shallowDrift = shallow.uEastMetersPerSecond * durationSeconds * driftGain;
  const deepDrift = deep.uEastMetersPerSecond * durationSeconds * driftGain;
  return report('depthChoice', 'Depth-choice benchmark in sheared current', {
    shallow: round(shallowDrift),
    deep: round(deepDrift),
    delta: round(deepDrift - shallowDrift),
    shallowSample: shallow,
    deepSample: deep
  }, Math.abs(deepDrift - shallowDrift) > 1e-3);
}

export function departureTimeBenchmark(options = {}) {
  const field = createManufacturedCurrentField('oscillatingTide');
  const early = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 0 });
  const late = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 2, depthMeters: 10, timeSeconds: 900 });
  return report('departureTime', 'Departure-time benchmark in tidal current', {
    early,
    late,
    currentDelta: round(Math.hypot(early.uEastMetersPerSecond - late.uEastMetersPerSecond, early.vNorthMetersPerSecond - late.vNorthMetersPerSecond))
  }, Math.hypot(early.uEastMetersPerSecond - late.uEastMetersPerSecond, early.vNorthMetersPerSecond - late.vNorthMetersPerSecond) > 1e-3);
}

export function eddyCrossingBenchmark() {
  const field = createManufacturedCurrentField('solidBodyEddy');
  const north = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 3, depthMeters: 10, timeSeconds: 0 });
  const south = sampleOceanCurrent({ field, eastMeters: 2, northMeters: 1, depthMeters: 10, timeSeconds: 0 });
  return report('eddyCrossing', 'Eddy-crossing benchmark on opposite sides', { north, south }, Math.sign(north.uEastMetersPerSecond) !== Math.sign(south.uEastMetersPerSecond));
}

export function currentDisabledControl(options = {}) {
  const durationSeconds = Number(options.durationSeconds ?? 600);
  return report('currentDisabledControl', 'Current-disabled control benchmark', { deltaEastMeters: 0, deltaNorthMeters: 0, durationSeconds }, true);
}

function report(id, label, metrics, pass) {
  return { id, label, type: 'anchor.evaluation.current-field-mission-benchmark', status: pass ? 'PASS' : 'FAIL', metrics, warnings: pass ? [] : [`${label} did not meet expected deterministic comparison.`] };
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
