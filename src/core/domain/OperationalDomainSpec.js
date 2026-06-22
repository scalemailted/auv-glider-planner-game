export const OPERATIONAL_DOMAIN_SPEC_VERSION = 'operational-domain-spec-world-r1';

export const SYNTHETIC_REGIONAL_DOMAIN_PRESET = Object.freeze({
  domainId: 'synthetic-regional-shelf-80x50km',
  label: 'Synthetic Regional Shelf Training Domain',
  coordinateFrame: 'localTangentPlaneMetersV1',
  horizontal: {
    minEastMeters: 0,
    maxEastMeters: 80000,
    minNorthMeters: 0,
    maxNorthMeters: 50000,
    units: 'meters'
  },
  vertical: {
    surfaceMeters: 0,
    minDepthMeters: 0,
    maxDepthMeters: 1000,
    positive: 'down',
    units: 'meters'
  },
  time: {
    startSeconds: 0,
    durationSeconds: 48 * 60 * 60,
    dtSeconds: 300
  },
  source: {
    kind: 'syntheticEducational',
    synthetic: true,
    realData: false,
    calibrated: false,
    operationalForecast: false,
    description: 'Procedural shelf/basin teaching domain; not a real ocean forecast or survey product.'
  }
});

export function createOperationalDomainSpec(options = {}) {
  return normalizeOperationalDomainSpec({
    ...SYNTHETIC_REGIONAL_DOMAIN_PRESET,
    ...options,
    horizontal: {
      ...SYNTHETIC_REGIONAL_DOMAIN_PRESET.horizontal,
      ...(options.horizontal ?? {})
    },
    vertical: {
      ...SYNTHETIC_REGIONAL_DOMAIN_PRESET.vertical,
      ...(options.vertical ?? {})
    },
    time: {
      ...SYNTHETIC_REGIONAL_DOMAIN_PRESET.time,
      ...(options.time ?? {})
    },
    source: {
      ...SYNTHETIC_REGIONAL_DOMAIN_PRESET.source,
      ...(options.source ?? {})
    }
  });
}

export function createLegacyOperationalDomainFromGrid(grid = {}, options = {}) {
  const width = Math.max(1, finite(grid.width, options.width ?? 1));
  const height = Math.max(1, finite(grid.height, options.height ?? 1));
  const cellSizeMeters = Math.max(1, finite(grid.cellSizeMeters ?? options.cellSizeMeters, 100));
  return normalizeOperationalDomainSpec({
    domainId: options.domainId ?? `legacy-grid-${Math.round(width)}x${Math.round(height)}`,
    label: options.label ?? 'Legacy Grid-Derived Mission Domain',
    coordinateFrame: 'localTangentPlaneMetersV1',
    horizontal: {
      minEastMeters: 0,
      maxEastMeters: width * cellSizeMeters,
      minNorthMeters: 0,
      maxNorthMeters: height * cellSizeMeters,
      units: 'meters'
    },
    vertical: {
      surfaceMeters: 0,
      minDepthMeters: 0,
      maxDepthMeters: Math.max(1, finite(options.maxDepthMeters, 250)),
      positive: 'down',
      units: 'meters'
    },
    time: {
      startSeconds: finite(options.startSeconds, 0),
      durationSeconds: finite(options.durationSeconds, 0),
      dtSeconds: finite(options.dtSeconds, 1)
    },
    source: {
      kind: 'legacyGridCompatibility',
      synthetic: true,
      realData: false,
      calibrated: false,
      operationalForecast: false,
      description: 'Compatibility domain inferred from the legacy planning grid and cell size.'
    },
    compatibility: {
      sourceGrid: { width, height, cellSizeMeters },
      legacyGridCellIsPhysicalProxy: true
    }
  });
}

export function normalizeOperationalDomainSpec(input = {}, options = {}) {
  if ((!input || Object.keys(input).length === 0) && options.grid) {
    return createLegacyOperationalDomainFromGrid(options.grid, options);
  }
  const source = input ?? {};
  const horizontal = source.horizontal ?? {};
  const vertical = source.vertical ?? {};
  const time = source.time ?? {};
  const minEastMeters = finite(horizontal.minEastMeters, 0);
  const maxEastMeters = Math.max(minEastMeters + 1, finite(horizontal.maxEastMeters ?? horizontal.widthMeters, SYNTHETIC_REGIONAL_DOMAIN_PRESET.horizontal.maxEastMeters));
  const minNorthMeters = finite(horizontal.minNorthMeters, 0);
  const maxNorthMeters = Math.max(minNorthMeters + 1, finite(horizontal.maxNorthMeters ?? horizontal.heightMeters, SYNTHETIC_REGIONAL_DOMAIN_PRESET.horizontal.maxNorthMeters));
  const maxDepthMeters = Math.max(1, finite(vertical.maxDepthMeters, SYNTHETIC_REGIONAL_DOMAIN_PRESET.vertical.maxDepthMeters));
  const normalized = {
    type: 'anchor.world.operational-domain',
    schemaVersion: '1.0',
    version: source.version ?? OPERATIONAL_DOMAIN_SPEC_VERSION,
    domainId: source.domainId ?? source.id ?? SYNTHETIC_REGIONAL_DOMAIN_PRESET.domainId,
    label: source.label ?? source.name ?? SYNTHETIC_REGIONAL_DOMAIN_PRESET.label,
    coordinateFrame: source.coordinateFrame ?? 'localTangentPlaneMetersV1',
    origin: {
      label: source.origin?.label ?? 'local tangent origin',
      eastMeters: finite(source.origin?.eastMeters, minEastMeters),
      northMeters: finite(source.origin?.northMeters, minNorthMeters),
      depthMeters: finite(source.origin?.depthMeters, 0)
    },
    horizontal: {
      minEastMeters,
      maxEastMeters,
      minNorthMeters,
      maxNorthMeters,
      widthMeters: round(maxEastMeters - minEastMeters),
      heightMeters: round(maxNorthMeters - minNorthMeters),
      units: horizontal.units ?? 'meters',
      eastPositive: 'east/right',
      northPositive: 'north/up'
    },
    vertical: {
      surfaceMeters: finite(vertical.surfaceMeters, 0),
      minDepthMeters: Math.max(0, finite(vertical.minDepthMeters, 0)),
      maxDepthMeters,
      positive: vertical.positive ?? 'down',
      units: vertical.units ?? 'meters'
    },
    time: {
      startSeconds: finite(time.startSeconds, 0),
      durationSeconds: Math.max(0, finite(time.durationSeconds, SYNTHETIC_REGIONAL_DOMAIN_PRESET.time.durationSeconds)),
      dtSeconds: Math.max(0.001, finite(time.dtSeconds, SYNTHETIC_REGIONAL_DOMAIN_PRESET.time.dtSeconds))
    },
    source: {
      kind: source.source?.kind ?? 'syntheticEducational',
      synthetic: source.source?.synthetic !== false,
      realData: source.source?.realData === true,
      calibrated: source.source?.calibrated === true,
      operationalForecast: source.source?.operationalForecast === true,
      description: source.source?.description ?? SYNTHETIC_REGIONAL_DOMAIN_PRESET.source.description
    },
    boundaryClaims: {
      syntheticEducationalDomain: source.source?.synthetic !== false,
      calibratedOceanForecast: false,
      calibratedSurveyProduct: false,
      operationalNavigationProduct: false,
      realWorldCoordinatesClaimed: source.source?.realData === true,
      rendererOwnsDomain: false,
      plannerOwnsDomain: false,
      scoringOwnsDomain: false,
      notes: 'Operational domain dimensions are model coordinates for teaching scenarios unless an explicit future real-data source marks otherwise.'
    },
    compatibility: {
      ...(source.compatibility ?? {}),
      legacyGridCellIsPhysicalProxy: source.compatibility?.legacyGridCellIsPhysicalProxy === true
    }
  };
  if (normalized.source.realData || normalized.source.calibrated || normalized.source.operationalForecast) {
    normalized.boundaryClaims.calibratedOceanForecast = false;
    normalized.boundaryClaims.calibratedSurveyProduct = false;
    normalized.boundaryClaims.operationalNavigationProduct = false;
  }
  return normalized;
}

export function validateOperationalDomainSpec(domain = {}) {
  const normalized = normalizeOperationalDomainSpec(domain);
  const errors = [];
  const warnings = [];
  if (normalized.type !== 'anchor.world.operational-domain') errors.push('Operational domain type must be anchor.world.operational-domain.');
  if (normalized.coordinateFrame !== 'localTangentPlaneMetersV1') warnings.push('Only localTangentPlaneMetersV1 is currently supported by browser/headless parity checks.');
  if (normalized.horizontal.widthMeters <= 0 || normalized.horizontal.heightMeters <= 0) errors.push('Operational domain horizontal extents must be positive.');
  if (normalized.vertical.maxDepthMeters <= normalized.vertical.minDepthMeters) errors.push('Operational domain maxDepthMeters must exceed minDepthMeters.');
  if (normalized.source.calibrated === true || normalized.source.operationalForecast === true) {
    errors.push('WORLD-R1 domains must not claim calibrated or operational forecast status.');
  }
  if (normalized.source.synthetic !== true) warnings.push('Domain is not explicitly marked synthetic; current fixtures should be synthetic educational models.');
  return { valid: errors.length === 0, status: errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS', errors, warnings, domain: normalized };
}

export function operationalDomainSummary(domain = {}) {
  const normalized = normalizeOperationalDomainSpec(domain);
  return {
    type: 'anchor.world.operational-domain-summary',
    version: OPERATIONAL_DOMAIN_SPEC_VERSION,
    domainId: normalized.domainId,
    label: normalized.label,
    coordinateFrame: normalized.coordinateFrame,
    widthKm: round(normalized.horizontal.widthMeters / 1000, 3),
    heightKm: round(normalized.horizontal.heightMeters / 1000, 3),
    maxDepthMeters: normalized.vertical.maxDepthMeters,
    durationHours: round(normalized.time.durationSeconds / 3600, 3),
    dtSeconds: normalized.time.dtSeconds,
    synthetic: normalized.source.synthetic === true,
    calibratedOceanForecast: false,
    operationalNavigationProduct: false,
    digest: operationalDomainDigest(normalized)
  };
}

export function operationalDomainDigest(domain = {}) {
  return `fnv1a-${fnv1aHex(stableStringify(normalizeOperationalDomainSpec(domain)))}`;
}

export function isSyntheticEducationalDomain(domain = {}) {
  const normalized = normalizeOperationalDomainSpec(domain);
  return normalized.source.synthetic === true
    && normalized.source.calibrated !== true
    && normalized.source.operationalForecast !== true
    && normalized.boundaryClaims.calibratedOceanForecast !== true;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function fnv1aHex(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}
