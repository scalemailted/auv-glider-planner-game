export const PHYSICAL_SAMPLING_FOOTPRINT_VERSION = 'physical-sampling-footprint-world-r1';

export function createPhysicalSamplingFootprint(options = {}) {
  const radiusMeters = Math.max(0.1, finite(options.radiusMeters, 250));
  const depthHalfSpanMeters = Math.max(0, finite(options.depthHalfSpanMeters ?? options.verticalHalfSpanMeters, 5));
  return {
    type: 'anchor.science.physical-sampling-footprint',
    version: PHYSICAL_SAMPLING_FOOTPRINT_VERSION,
    radiusMeters,
    diameterMeters: round(radiusMeters * 2),
    areaSquareMeters: round(Math.PI * radiusMeters * radiusMeters),
    areaSquareKm: round(Math.PI * radiusMeters * radiusMeters / 1_000_000, 6),
    depthHalfSpanMeters,
    depthIntervalMeters: round(depthHalfSpanMeters * 2),
    shape: options.shape ?? 'cylindricalApproximation',
    syntheticTeachingModel: true,
    calibratedSensorModel: false,
    ownsScoring: false
  };
}

export function samplingFootprintCoverageFraction(footprint = {}, domain = {}) {
  const fp = footprint.type === 'anchor.science.physical-sampling-footprint' ? footprint : createPhysicalSamplingFootprint(footprint);
  const area = Math.max(1, Number(domain.horizontal?.widthMeters ?? 1) * Number(domain.horizontal?.heightMeters ?? 1));
  return round(fp.areaSquareMeters / area, 8);
}

export function validatePhysicalSamplingFootprint(footprint = {}) {
  const fp = footprint.type === 'anchor.science.physical-sampling-footprint' ? footprint : createPhysicalSamplingFootprint(footprint);
  const errors = [];
  if (fp.radiusMeters <= 0) errors.push('Sampling footprint radiusMeters must be positive.');
  if (fp.calibratedSensorModel === true) errors.push('WORLD-R1 footprint must not claim calibrated sensor status.');
  if (fp.ownsScoring === true) errors.push('Sampling footprint must not own scoring.');
  return { valid: errors.length === 0, errors, footprint: fp };
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
