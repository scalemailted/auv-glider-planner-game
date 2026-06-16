import { createSeededRng } from '../../random/SeededRng.js';
import { clamp01, createScalarField, normalizeField } from './UncertaintyFieldMath.js';

export const UNCERTAINTY_SCENARIOS = [
  'accurateForecast',
  'shiftedFront',
  'weakenedHotspot',
  'hiddenPlume',
  'hiddenBloomLayer',
  'noisyFalseAlarm',
  'staleMonitoringField'
];

export const UNCERTAINTY_SCENARIO_METADATA = {
  accurateForecast: {
    label: 'Accurate Forecast',
    expectedDiagnosis: 'agreesWithForecast',
    defaultObservationPath: 'crossSectionTransect',
    notes: 'Truth mostly matches forecast, so samples mainly reduce expected-state uncertainty.'
  },
  shiftedFront: {
    label: 'Shifted Front',
    expectedDiagnosis: 'likelyForecastError',
    defaultObservationPath: 'boundaryProbe',
    notes: 'A forecasted front exists, but observations show it is displaced.'
  },
  weakenedHotspot: {
    label: 'Weakened Hotspot',
    expectedDiagnosis: 'likelyForecastError',
    defaultObservationPath: 'clusterFollowup',
    notes: 'A forecasted hotspot exists, but its intensity is misestimated.'
  },
  hiddenPlume: {
    label: 'Hidden Plume',
    expectedDiagnosis: 'possibleHiddenEvent',
    defaultObservationPath: 'clusterFollowup',
    notes: 'A coherent anomaly exists in truth but is absent from the forecast layer.'
  },
  hiddenBloomLayer: {
    label: 'Hidden Bloom Layer',
    expectedDiagnosis: 'possibleHiddenEvent',
    defaultObservationPath: 'sparseRandom',
    notes: 'A broad bloom-like patch is hidden from the expected state until repeated samples support it.'
  },
  noisyFalseAlarm: {
    label: 'Noisy False Alarm',
    expectedDiagnosis: 'likelyNoiseOrFalseAlarm',
    defaultObservationPath: 'singlePoint',
    defaultSensorNoise: 0.28,
    notes: 'A surprising isolated sample should not be treated as a coherent hidden event.'
  },
  staleMonitoringField: {
    label: 'Stale Monitoring Field',
    expectedDiagnosis: 'insufficientEvidence',
    defaultObservationPath: 'diagonalTransect',
    notes: 'Uncertainty grows where observations are old, teaching revisit and freshness value.'
  }
};

export function normalizeScenarioId(id) {
  const value = String(id ?? '').trim();
  if (UNCERTAINTY_SCENARIOS.includes(value)) return value;
  const legacyMap = {
    perfectForecast: 'accurateForecast',
    noisyForecast: 'noisyFalseAlarm',
    biasedForecast: 'weakenedHotspot',
    regionalBias: 'shiftedFront',
    driftingForecast: 'shiftedFront',
    delayedForecast: 'shiftedFront',
    hiddenTruthMismatch: 'hiddenPlume',
    clusteredUncertainty: 'hiddenPlume',
    sparseUnknownTargets: 'hiddenBloomLayer',
    unobservedRegions: 'staleMonitoringField',
    patchyUncertainty: 'staleMonitoringField',
    boundaryFront: 'shiftedFront',
    gaussianRegion: 'weakenedHotspot',
    uniformUncertainty: 'accurateForecast'
  };
  return legacyMap[value] ?? 'shiftedFront';
}

export function uncertaintyScenarioLabel(id) {
  return UNCERTAINTY_SCENARIO_METADATA[normalizeScenarioId(id)]?.label ?? 'Shifted Front';
}

export function createUncertaintyScenarioDefinition(config = {}) {
  const width = Math.max(4, Math.round(Number(config.width ?? config.grid?.width ?? 24) || 24));
  const height = Math.max(4, Math.round(Number(config.height ?? config.grid?.height ?? 16) || 16));
  const seed = String(config.seed ?? 'anchor-uncertainty-demo');
  const time = Number(config.time ?? config.demoTime ?? 0) || 0;
  const scenarioId = normalizeScenarioId(config.scenarioId ?? config.id ?? config.forecastModel ?? config.uncertaintyPattern);
  const rng = createSeededRng(`${seed}:${scenarioId}:scenario`);
  const base = baseBackgroundField(width, height, time, rng);
  const noise = deterministicNoiseField(width, height, `${seed}:${scenarioId}:noise`, 0.018);

  let hiddenTruthField = base;
  let forecastField = base;
  let priorUncertaintyField = createScalarField(width, height, 0.34);
  let hiddenEventTruthField = createScalarField(width, height, 0);
  let stalenessField = createScalarField(width, height, 0.2);

  if (scenarioId === 'accurateForecast') {
    hiddenTruthField = normalizeField(addFields(base, gaussianPatch(width, height, 0.62, 0.42, 0.16, 0.28), noise));
    forecastField = normalizeField(addFields(base, gaussianPatch(width, height, 0.62, 0.42, 0.17, 0.26)));
    priorUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.22), gradientRidge(width, height, 0.15)));
  }

  if (scenarioId === 'shiftedFront') {
    hiddenTruthField = normalizeField(addFields(frontField(width, height, 0.44 + Math.sin(time * 0.02) * 0.03, 0.07, 0.78), gaussianPatch(width, height, 0.73, 0.68, 0.18, 0.2)));
    forecastField = normalizeField(addFields(frontField(width, height, 0.58, 0.07, 0.72), gaussianPatch(width, height, 0.74, 0.68, 0.19, 0.2)));
    priorUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.25), frontBand(width, height, 0.52, 0.12, 0.45)));
  }

  if (scenarioId === 'weakenedHotspot') {
    hiddenTruthField = normalizeField(addFields(base, gaussianPatch(width, height, 0.62, 0.38, 0.16, 0.72)));
    forecastField = normalizeField(addFields(base, gaussianPatch(width, height, 0.62, 0.38, 0.17, 0.32)));
    priorUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.24), gaussianPatch(width, height, 0.62, 0.38, 0.23, 0.34)));
  }

  if (scenarioId === 'hiddenPlume') {
    const plume = plumeField(width, height, 0.28, 0.72, 0.7);
    hiddenEventTruthField = plume;
    forecastField = normalizeField(addFields(base, gaussianPatch(width, height, 0.72, 0.28, 0.18, 0.18)));
    hiddenTruthField = normalizeField(addFields(forecastField, plume));
    priorUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.32), gaussianPatch(width, height, 0.3, 0.7, 0.24, 0.22)));
  }

  if (scenarioId === 'hiddenBloomLayer') {
    const bloom = gaussianPatch(width, height, 0.7, 0.66, 0.22, 0.62);
    hiddenEventTruthField = bloom;
    forecastField = normalizeField(addFields(base, frontField(width, height, 0.38, 0.12, 0.2)));
    hiddenTruthField = normalizeField(addFields(forecastField, bloom));
    priorUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.36), gaussianPatch(width, height, 0.7, 0.66, 0.3, 0.2)));
  }

  if (scenarioId === 'noisyFalseAlarm') {
    hiddenTruthField = normalizeField(addFields(base, gaussianPatch(width, height, 0.55, 0.46, 0.17, 0.24)));
    forecastField = normalizeField(addFields(base, gaussianPatch(width, height, 0.55, 0.46, 0.17, 0.23)));
    priorUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.3), deterministicNoiseField(width, height, `${seed}:false-alarm:u`, 0.05)));
  }

  if (scenarioId === 'staleMonitoringField') {
    const stale = createScalarField(width, height, (x, y) => {
      const nx = width > 1 ? x / (width - 1) : 0;
      const ny = height > 1 ? y / (height - 1) : 0;
      const lastTrack = Math.min(Math.abs(ny - nx), Math.abs(ny - (1 - nx)));
      return clamp01(0.12 + lastTrack * 1.5 + Math.min(0.35, time * 0.006));
    });
    stalenessField = stale;
    hiddenTruthField = normalizeField(addFields(base, gaussianPatch(width, height, 0.45, 0.52, 0.2, 0.35)));
    forecastField = normalizeField(addFields(base, gaussianPatch(width, height, 0.43, 0.52, 0.22, 0.3)));
    priorUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.18), stale));
  }

  return {
    scenarioId,
    scenarioLabel: uncertaintyScenarioLabel(scenarioId),
    width,
    height,
    time,
    seed,
    hiddenTruthField,
    forecastField,
    priorUncertaintyField,
    hiddenEventTruthField,
    stalenessField,
    metadata: {
      scenarioId,
      scenarioLabel: uncertaintyScenarioLabel(scenarioId),
      expectedDiagnosis: UNCERTAINTY_SCENARIO_METADATA[scenarioId]?.expectedDiagnosis,
      recommendedObservationPath: UNCERTAINTY_SCENARIO_METADATA[scenarioId]?.defaultObservationPath,
      recommendedTeachingNotes: UNCERTAINTY_SCENARIO_METADATA[scenarioId]?.notes,
      claimLevel: 'synthetic_educational',
      notA: 'Not a calibrated ocean forecast, production data-assimilation system, GP solver, GMRF solver, or route planner.'
    }
  };
}

function baseBackgroundField(width, height, time, rng) {
  const c1x = 0.35 + (rng() - 0.5) * 0.08;
  const c1y = 0.45 + (rng() - 0.5) * 0.08;
  const c2x = 0.75 + Math.sin(time * 0.015) * 0.02;
  const c2y = 0.26 + Math.cos(time * 0.012) * 0.02;
  return normalizeField(createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    return 0.08 + 0.28 * gaussian(nx, ny, c1x, c1y, 0.22) + 0.16 * gaussian(nx, ny, c2x, c2y, 0.16) + 0.06 * nx;
  }));
}

function deterministicNoiseField(width, height, seed, amplitude) {
  return createScalarField(width, height, (x, y) => {
    const rng = createSeededRng(`${seed}:${x}:${y}`);
    return (rng() - 0.5) * amplitude;
  });
}

function gaussianPatch(width, height, cx, cy, radius, strength) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    return strength * gaussian(nx, ny, cx, cy, radius);
  });
}

function plumeField(width, height, sourceX, sourceY, strength) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const centerline = sourceY - 0.35 * (nx - sourceX);
    const along = clamp01((nx - sourceX + 0.22) / 0.72);
    const cross = Math.abs(ny - centerline);
    return strength * Math.exp(-(cross ** 2) / (2 * 0.055 ** 2)) * Math.exp(-along * 0.65) * smoothstep(-0.05, 0.2, nx - sourceX + 0.08);
  });
}

function frontField(width, height, centerX, sharpness, strength) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const curve = centerX + Math.sin(ny * Math.PI * 1.4) * 0.045;
    return strength * smoothstep(curve - sharpness, curve + sharpness, nx);
  });
}

function frontBand(width, height, centerX, radius, strength) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    return strength * Math.exp(-((nx - centerX) ** 2) / (2 * radius ** 2));
  });
}

function gradientRidge(width, height, strength) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    return strength * (0.5 + 0.5 * Math.sin((nx + ny) * Math.PI));
  });
}

function addFields(...fields) {
  const height = Math.max(...fields.map((field) => Array.isArray(field) ? field.length : 0), 1);
  const width = Math.max(...fields.map((field) => Array.isArray(field?.[0]) ? field[0].length : 0), 1);
  return createScalarField(width, height, (x, y) => fields.reduce((sum, field) => sum + Number(field?.[y]?.[x] ?? 0), 0));
}

function gaussian(x, y, cx, cy, radius) {
  return Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * Math.max(0.0001, radius) ** 2)));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}