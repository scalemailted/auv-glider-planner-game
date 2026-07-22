 const ENVIRONMENT_STATUS = Object.freeze({
  PASS: 'PASS',
  WARN: 'WARN',
  FAIL: 'FAIL',
  NOT_APPLICABLE: 'NOT_APPLICABLE'
});

 function stableDigest(value, prefix = 'fnv1a32') {
  return `${prefix}:${fnv(stable(value))}`;
}

 function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

 function createEnvironmentValidationReport({ errors = [], warnings = [], checks = [] } = {}) {
  const status = errors.length ? ENVIRONMENT_STATUS.FAIL : warnings.length ? ENVIRONMENT_STATUS.WARN : ENVIRONMENT_STATUS.PASS;
  return {
    type: 'anchor.environment.validation-report',
    version: 'environment-validation-env-pkg-r1',
    valid: errors.length === 0,
    status,
    errors: errors.map(String),
    warnings: warnings.map(String),
    checks
  };
}

 function normalizeClaimBoundary(value = {}) {
  return {
    synthetic: value.synthetic !== false,
    scientificallyConstrained: value.scientificallyConstrained !== false,
    calibratedOceanProduct: value.calibratedOceanProduct === true,
    operationalForecast: value.operationalForecast === true,
    certifiedForNavigation: value.certifiedForNavigation === true,
    imported: value.imported === true,
    attribution: value.attribution ?? null,
    warning: value.warning ?? 'Synthetic benchmark-oriented environment. Not an operational ocean forecast or certified navigation product.'
  };
}

 function normalizeOperationalDomain(value = {}, fallback = {}) {
  const source = value?.horizontal || value?.vertical || value?.time ? value : fallback;
  const horizontal = source?.horizontal ?? source ?? {};
  const vertical = source?.vertical ?? {};
  const time = source?.time ?? {};
  const widthMeters = finite(horizontal.widthMeters ?? horizontal.east ?? horizontal.maxEastMeters, fallback?.horizontal?.widthMeters ?? fallback?.widthMeters ?? 1);
  const heightMeters = finite(horizontal.heightMeters ?? horizontal.north ?? horizontal.maxNorthMeters, fallback?.horizontal?.heightMeters ?? fallback?.heightMeters ?? 1);
  const maxDepthMeters = finite(vertical.maxDepthMeters ?? source?.maxDepthMeters, fallback?.vertical?.maxDepthMeters ?? fallback?.maxDepthMeters ?? 0);
  const durationSeconds = finite(time.durationSeconds ?? source?.durationSeconds, fallback?.time?.durationSeconds ?? fallback?.durationSeconds ?? 0);
  return {
    id: source?.id ?? source?.domainId ?? fallback?.id ?? fallback?.domainId ?? 'environment-domain',
    coordinateFrame: source?.coordinateFrame ?? fallback?.coordinateFrame ?? 'localEastNorthDown',
    horizontal: {
      minEastMeters: finite(horizontal.minEastMeters, 0),
      minNorthMeters: finite(horizontal.minNorthMeters, 0),
      widthMeters: Math.max(1, round(widthMeters)),
      heightMeters: Math.max(1, round(heightMeters))
    },
    vertical: {
      minDepthMeters: Math.max(0, round(finite(vertical.minDepthMeters, 0))),
      maxDepthMeters: Math.max(0, round(maxDepthMeters))
    },
    time: {
      startSeconds: round(finite(time.startSeconds, 0)),
      durationSeconds: Math.max(0, round(durationSeconds)),
      dtSeconds: Math.max(0, round(finite(time.dtSeconds, fallback?.time?.dtSeconds ?? 0)))
    },
    units: {
      horizontal: 'meters east/north',
      depth: 'meters positive down',
      time: 'seconds'
    }
  };
}

 function domainFromAxes({ eastAxisMeters = [], northAxisMeters = [], depthAxisMeters = [], timeAxisSeconds = [], coordinateFrame = 'localEastNorthDown' } = {}) {
  const east = axisExtent(eastAxisMeters);
  const north = axisExtent(northAxisMeters);
  const depth = axisExtent(depthAxisMeters);
  const time = axisExtent(timeAxisSeconds);
  return normalizeOperationalDomain({
    coordinateFrame,
    horizontal: { minEastMeters: east.min, minNorthMeters: north.min, widthMeters: east.span || 1, heightMeters: north.span || 1 },
    vertical: { minDepthMeters: depth.min, maxDepthMeters: depth.max },
    time: { startSeconds: time.min, durationSeconds: time.span }
  });
}

 function axisExtent(axis = []) {
  const values = (Array.isArray(axis) ? axis : []).map(Number).filter(Number.isFinite);
  if (!values.length) return { min: 0, max: 0, span: 0, count: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, span: max - min, count: values.length };
}

 function fieldDigestOf(value = {}) {
  return value.artifactDigest ?? value.digest ?? value.manifestDigest ?? null;
}

 function arrayify(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

 function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

 function round(value, digits = 6) {
  const n = Number(value);
  return Number.isFinite(n) ? Number(n.toFixed(digits)) : null;
}

 function axisToIndex(axis = [], value = 0) {
  const values = Array.isArray(axis) && axis.length ? axis.map(Number) : [0];
  if (values.length <= 1) return 0;
  const min = Number(values[0]);
  const max = Number(values.at(-1));
  const clamped = Math.max(min, Math.min(max, Number(value)));
  const span = Math.max(1e-12, max - min);
  return ((clamped - min) / span) * (values.length - 1);
}

function fnv(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

module.exports = {ENVIRONMENT_STATUS, stableDigest, stable, createEnvironmentValidationReport, normalizeClaimBoundary, normalizeOperationalDomain, domainFromAxes, axisExtent, fieldDigestOf, arrayify, finite, round, axisToIndex}