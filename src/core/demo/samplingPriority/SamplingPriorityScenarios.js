import { createSeededRng } from '../../random/SeededRng.js';
import {
  absFieldDifference,
  clamp01,
  createScalarField,
  distanceToNearestPointField,
  gradientMagnitude,
  normalizeField,
  suppressNearPoints
} from './SamplingPriorityFieldMath.js';

export const SAMPLING_PRIORITY_SCENARIO_IDS = [
  'knownHotspot',
  'uncertainFront',
  'forecastValidation',
  'hiddenPlumeFollowup',
  'bloomBoundary',
  'staleMonitoring',
  'hazardSuppression',
  'mixedMission'
];

export const SAMPLING_PRIORITY_SCENARIO_METADATA = {
  knownHotspot: {
    label: 'Known Hotspot',
    teachingNotes: 'High event intensity and high belief value align with low uncertainty. This teaches exploitation.'
  },
  uncertainFront: {
    label: 'Uncertain Front',
    teachingNotes: 'The front boundary is more informative than the center of the bright region. This teaches boundary sampling.'
  },
  forecastValidation: {
    label: 'Forecast Validation',
    teachingNotes: 'The expected feature may be shifted or wrong. This teaches forecast validation before commitment.'
  },
  hiddenPlumeFollowup: {
    label: 'Hidden Plume Follow-up',
    teachingNotes: 'Weak coherent evidence suggests a missing plume. This teaches confirmatory hidden-event sampling.'
  },
  bloomBoundary: {
    label: 'Bloom Boundary',
    teachingNotes: 'A valuable bloom has an uncertain edge. This teaches boundary plus value tradeoffs.'
  },
  staleMonitoring: {
    label: 'Stale Monitoring',
    teachingNotes: 'Previously sampled monitoring stations regain value as information ages. This teaches revisit value.'
  },
  hazardSuppression: {
    label: 'Hazard Suppression',
    teachingNotes: 'High science value can be suppressed by hazard and accessibility constraints.'
  },
  mixedMission: {
    label: 'Mixed Mission',
    teachingNotes: 'Multiple motives compete: value, uncertainty, boundary mapping, hidden-event suspicion, staleness, hazards, and redundancy.'
  }
};

export function samplingPriorityScenarioOptions() {
  return SAMPLING_PRIORITY_SCENARIO_IDS.map((id) => ({
    id,
    label: samplingPriorityScenarioLabel(id),
    description: SAMPLING_PRIORITY_SCENARIO_METADATA[id]?.teachingNotes ?? ''
  }));
}

export function normalizeSamplingPriorityScenarioId(id) {
  const value = String(id ?? '').trim();
  if (SAMPLING_PRIORITY_SCENARIO_IDS.includes(value)) return value;
  const aliases = {
    hotspot: 'knownHotspot',
    front: 'uncertainFront',
    validation: 'forecastValidation',
    hiddenPlume: 'hiddenPlumeFollowup',
    bloom: 'bloomBoundary',
    stale: 'staleMonitoring',
    hazard: 'hazardSuppression',
    mixed: 'mixedMission'
  };
  return aliases[value] ?? 'uncertainFront';
}

export function samplingPriorityScenarioLabel(id) {
  return SAMPLING_PRIORITY_SCENARIO_METADATA[normalizeSamplingPriorityScenarioId(id)]?.label ?? 'Uncertain Front';
}

export function createSamplingPriorityScenario(config = {}) {
  const width = Math.max(8, Math.round(Number(config.width ?? config.grid?.width ?? 28) || 28));
  const height = Math.max(8, Math.round(Number(config.height ?? config.grid?.height ?? 18) || 18));
  const seed = String(config.seed ?? 'anchor-sampling-priority-demo');
  const time = Number(config.time ?? config.demoTime ?? 0) || 0;
  const scenarioId = normalizeSamplingPriorityScenarioId(config.scenarioId ?? config.id);
  const rng = createSeededRng(`${seed}:${scenarioId}:sampling-priority`);

  const base = backgroundField(width, height, time, rng);
  let eventIntensityField = base;
  let trueRoiField = base;
  let beliefRoiField = base;
  let expectedUncertaintyField = createScalarField(width, height, 0.25);
  let boundaryStrengthField = gradientMagnitude(base);
  let forecastValidationField = createScalarField(width, height, 0.1);
  let hiddenEventProbabilityField = createScalarField(width, height, 0);
  let stalenessField = createScalarField(width, height, 0.12);
  let hazardField = createScalarField(width, height, 0);
  let accessibleMask = createScalarField(width, height, 1);
  let recentSamples = defaultTransectSamples(width, height, 4);

  if (scenarioId === 'knownHotspot') {
    const hotspot = gaussianPatch(width, height, 0.62, 0.42, 0.16, 1);
    eventIntensityField = normalizeField(addFields(base, scaleField(hotspot, 0.95)));
    trueRoiField = normalizeField(addFields(scaleField(eventIntensityField, 0.85), scaleField(gradientMagnitude(eventIntensityField), 0.15)));
    beliefRoiField = normalizeField(addFields(scaleField(hotspot, 0.9), scaleField(base, 0.2)));
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.14), scaleField(gradientMagnitude(hotspot), 0.12)));
    recentSamples = [];
  }

  if (scenarioId === 'uncertainFront') {
    const truthFront = frontField(width, height, 0.47 + Math.sin(time * 0.015) * 0.03, 0.06, 0.9);
    const beliefFront = frontField(width, height, 0.54, 0.07, 0.82);
    eventIntensityField = normalizeField(addFields(base, truthFront));
    beliefRoiField = normalizeField(addFields(base, beliefFront));
    boundaryStrengthField = normalizeField(addFields(gradientMagnitude(beliefRoiField), frontBand(width, height, 0.52, 0.12, 0.5)));
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.18), boundaryStrengthField));
    forecastValidationField = normalizeField(absFieldDifference(eventIntensityField, beliefRoiField));
    trueRoiField = normalizeField(addFields(scaleField(eventIntensityField, 0.35), scaleField(boundaryStrengthField, 0.75)));
    recentSamples = verticalSamples(width, height, Math.round(width * 0.38), 5);
  }

  if (scenarioId === 'forecastValidation') {
    const truthPatch = gaussianPatch(width, height, 0.38, 0.56, 0.15, 1);
    const forecastPatch = gaussianPatch(width, height, 0.58, 0.48, 0.17, 0.88);
    eventIntensityField = normalizeField(addFields(base, truthPatch));
    trueRoiField = normalizeField(addFields(scaleField(eventIntensityField, 0.7), scaleField(gradientMagnitude(eventIntensityField), 0.2)));
    beliefRoiField = normalizeField(addFields(base, forecastPatch));
    forecastValidationField = normalizeField(addFields(absFieldDifference(truthPatch, forecastPatch), gradientMagnitude(beliefRoiField)));
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.22), scaleField(forecastValidationField, 0.45)));
    boundaryStrengthField = gradientMagnitude(beliefRoiField);
    recentSamples = verticalSamples(width, height, Math.round(width * 0.5), 4);
  }

  if (scenarioId === 'hiddenPlumeFollowup') {
    const forecast = gaussianPatch(width, height, 0.72, 0.3, 0.18, 0.45);
    const plume = plumeField(width, height, 0.2, 0.72, 0.9);
    eventIntensityField = normalizeField(addFields(base, forecast, plume));
    trueRoiField = normalizeField(addFields(scaleField(eventIntensityField, 0.7), scaleField(plume, 0.45)));
    beliefRoiField = normalizeField(addFields(base, forecast));
    hiddenEventProbabilityField = normalizeField(addFields(plume, scaleField(gradientMagnitude(plume), 0.35)));
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.25), scaleField(hiddenEventProbabilityField, 0.55)));
    forecastValidationField = normalizeField(absFieldDifference(eventIntensityField, beliefRoiField));
    boundaryStrengthField = gradientMagnitude(eventIntensityField);
    recentSamples = [
      { x: Math.round(width * 0.2), y: Math.round(height * 0.7), age: 8 },
      { x: Math.round(width * 0.29), y: Math.round(height * 0.64), age: 6 }
    ];
  }

  if (scenarioId === 'bloomBoundary') {
    const bloom = gaussianPatch(width, height, 0.6, 0.58, 0.22, 1);
    const edge = normalizeField(gradientMagnitude(bloom));
    eventIntensityField = normalizeField(addFields(base, bloom));
    trueRoiField = normalizeField(addFields(scaleField(bloom, 0.7), scaleField(edge, 0.55)));
    beliefRoiField = normalizeField(addFields(base, scaleField(gaussianPatch(width, height, 0.58, 0.56, 0.2, 0.86), 0.9)));
    boundaryStrengthField = edge;
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.2), scaleField(edge, 0.65)));
    forecastValidationField = normalizeField(addFields(edge, absFieldDifference(eventIntensityField, beliefRoiField)));
    recentSamples = ringSamples(width, height, 0.6, 0.58, 0.14, 5);
  }

  if (scenarioId === 'staleMonitoring') {
    const monitoringPatch = gaussianPatch(width, height, 0.48, 0.52, 0.22, 0.75);
    eventIntensityField = normalizeField(addFields(base, monitoringPatch));
    trueRoiField = normalizeField(addFields(scaleField(eventIntensityField, 0.55), stationField(width, height, monitoringStations(width, height), 0.55)));
    beliefRoiField = normalizeField(addFields(base, scaleField(monitoringPatch, 0.55)));
    recentSamples = monitoringStations(width, height).map((point, index) => ({ ...point, age: 40 + index * 8 }));
    stalenessField = normalizeField(addFields(stationField(width, height, recentSamples, 0.9), distanceToNearestPointField(recentSamples, width, height)));
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.18), scaleField(stalenessField, 0.58)));
    boundaryStrengthField = gradientMagnitude(beliefRoiField);
    forecastValidationField = normalizeField(addFields(createScalarField(width, height, 0.08), scaleField(stalenessField, 0.3)));
  }

  if (scenarioId === 'hazardSuppression') {
    const valuePatch = gaussianPatch(width, height, 0.55, 0.5, 0.22, 1);
    const hazard = gaussianPatch(width, height, 0.56, 0.5, 0.18, 1);
    eventIntensityField = normalizeField(addFields(base, valuePatch));
    trueRoiField = normalizeField(addFields(scaleField(eventIntensityField, 0.75), scaleField(gradientMagnitude(valuePatch), 0.2)));
    beliefRoiField = normalizeField(addFields(base, valuePatch));
    hazardField = normalizeField(addFields(hazard, islandMask(width, height, 0.78, 0.28, 0.09)));
    accessibleMask = createScalarField(width, height, (x, y) => hazardField[y][x] > 0.78 ? 0 : 1);
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.2), scaleField(valuePatch, 0.24)));
    boundaryStrengthField = gradientMagnitude(beliefRoiField);
    forecastValidationField = createScalarField(width, height, 0.12);
    recentSamples = [{ x: Math.round(width * 0.42), y: Math.round(height * 0.5), age: 2 }];
  }

  if (scenarioId === 'mixedMission') {
    const hotspot = gaussianPatch(width, height, 0.3, 0.36, 0.14, 0.78);
    const front = frontField(width, height, 0.58, 0.07, 0.75);
    const hidden = plumeField(width, height, 0.18, 0.78, 0.65);
    const hazard = gaussianPatch(width, height, 0.34, 0.34, 0.11, 0.8);
    eventIntensityField = normalizeField(addFields(base, hotspot, front, hidden));
    trueRoiField = normalizeField(addFields(scaleField(eventIntensityField, 0.55), scaleField(gradientMagnitude(front), 0.5), scaleField(hidden, 0.25)));
    beliefRoiField = normalizeField(addFields(base, hotspot, front));
    hiddenEventProbabilityField = normalizeField(addFields(hidden, scaleField(gradientMagnitude(hidden), 0.25)));
    boundaryStrengthField = normalizeField(addFields(gradientMagnitude(beliefRoiField), frontBand(width, height, 0.58, 0.1, 0.4)));
    forecastValidationField = normalizeField(absFieldDifference(eventIntensityField, beliefRoiField));
    stalenessField = normalizeField(addFields(stationField(width, height, monitoringStations(width, height), 0.55), createScalarField(width, height, 0.12)));
    hazardField = normalizeField(addFields(hazard, islandMask(width, height, 0.76, 0.25, 0.08)));
    accessibleMask = createScalarField(width, height, (x, y) => hazardField[y][x] > 0.82 ? 0 : 1);
    expectedUncertaintyField = normalizeField(addFields(createScalarField(width, height, 0.18), scaleField(boundaryStrengthField, 0.36), scaleField(hiddenEventProbabilityField, 0.38), scaleField(stalenessField, 0.25)));
    recentSamples = [
      { x: Math.round(width * 0.3), y: Math.round(height * 0.36), age: 2 },
      { x: Math.round(width * 0.54), y: Math.round(height * 0.5), age: 7 },
      { x: Math.round(width * 0.18), y: Math.round(height * 0.78), age: 13 }
    ];
  }

  const recentSamplePenaltyField = normalizeField(suppressNearPoints(createScalarField(width, height, 1), recentSamples, 3).map((row) => row.map((value) => 1 - value)));
  return {
    width,
    height,
    seed,
    time,
    scenarioId,
    scenarioLabel: samplingPriorityScenarioLabel(scenarioId),
    eventIntensityField: normalizeField(eventIntensityField),
    trueRoiField: normalizeField(trueRoiField),
    beliefRoiField: normalizeField(beliefRoiField),
    expectedUncertaintyField: normalizeField(expectedUncertaintyField),
    boundaryStrengthField: normalizeField(boundaryStrengthField),
    forecastValidationField: normalizeField(forecastValidationField),
    hiddenEventProbabilityField: normalizeField(hiddenEventProbabilityField),
    stalenessField: normalizeField(stalenessField),
    hazardField: normalizeField(hazardField),
    recentSamplePenaltyField,
    accessibleMask: normalizeField(accessibleMask),
    recentSamples,
    teachingNotes: SAMPLING_PRIORITY_SCENARIO_METADATA[scenarioId]?.teachingNotes ?? '',
    notA: 'Synthetic educational sampling-selection scenario; not a calibrated ocean forecast, production data-assimilation system, route planner, vehicle controller, or mission scoring engine.'
  };
}

function backgroundField(width, height, time, rng) {
  const c1x = 0.35 + (rng() - 0.5) * 0.08;
  const c1y = 0.46 + (rng() - 0.5) * 0.08;
  return normalizeField(createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    return 0.08
      + 0.18 * gaussian(nx, ny, c1x, c1y, 0.24)
      + 0.08 * Math.sin((nx * 1.6 + ny * 0.9 + time * 0.006) * Math.PI)
      + 0.05 * nx;
  }));
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
    const centerline = sourceY - 0.28 * (nx - sourceX);
    const along = clamp01((nx - sourceX + 0.14) / 0.72);
    const cross = Math.abs(ny - centerline);
    return strength * Math.exp(-(cross ** 2) / (2 * 0.055 ** 2)) * Math.exp(-along * 0.7) * smoothstep(-0.06, 0.18, nx - sourceX + 0.05);
  });
}

function frontField(width, height, centerX, sharpness, strength) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const curve = centerX + Math.sin(ny * Math.PI * 1.35) * 0.045;
    return strength * smoothstep(curve - sharpness, curve + sharpness, nx);
  });
}

function frontBand(width, height, centerX, radius, strength) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    const curve = centerX + Math.sin(ny * Math.PI * 1.35) * 0.045;
    return strength * Math.exp(-((nx - curve) ** 2) / (2 * radius ** 2));
  });
}

function islandMask(width, height, cx, cy, radius) {
  return createScalarField(width, height, (x, y) => {
    const nx = width > 1 ? x / (width - 1) : 0;
    const ny = height > 1 ? y / (height - 1) : 0;
    return gaussian(nx, ny, cx, cy, radius);
  });
}

function stationField(width, height, points, strength) {
  return createScalarField(width, height, (x, y) => {
    let value = 0;
    for (const point of points) {
      const ageFactor = clamp01((Number(point.age ?? 10) || 10) / 60);
      value += strength * (0.45 + ageFactor * 0.55) * Math.exp(-(((x - point.x) ** 2 + (y - point.y) ** 2) / (2 * 2.2 ** 2)));
    }
    return value;
  });
}

function monitoringStations(width, height) {
  return [
    { x: Math.round(width * 0.24), y: Math.round(height * 0.28) },
    { x: Math.round(width * 0.45), y: Math.round(height * 0.52) },
    { x: Math.round(width * 0.66), y: Math.round(height * 0.36) },
    { x: Math.round(width * 0.72), y: Math.round(height * 0.72) }
  ];
}

function defaultTransectSamples(width, height, count) {
  return Array.from({ length: count }, (_entry, index) => ({
    x: Math.round(width * (0.22 + index * 0.12)),
    y: Math.round(height * 0.5),
    age: 2 + index
  }));
}

function verticalSamples(width, height, x, count) {
  return Array.from({ length: count }, (_entry, index) => ({
    x: Math.max(0, Math.min(width - 1, x)),
    y: Math.round((height - 1) * (0.15 + (index / Math.max(1, count - 1)) * 0.7)),
    age: 3 + index
  }));
}

function ringSamples(width, height, cx, cy, radius, count) {
  return Array.from({ length: count }, (_entry, index) => {
    const angle = (index / count) * Math.PI * 2;
    return {
      x: Math.round((cx + Math.cos(angle) * radius) * (width - 1)),
      y: Math.round((cy + Math.sin(angle) * radius) * (height - 1)),
      age: 4 + index
    };
  });
}

function addFields(...fields) {
  const height = Math.max(...fields.map((field) => Array.isArray(field) ? field.length : 0), 1);
  const width = Math.max(...fields.map((field) => Array.isArray(field?.[0]) ? field[0].length : 0), 1);
  return createScalarField(width, height, (x, y) => fields.reduce((sum, field) => sum + Number(field?.[y]?.[x] ?? 0), 0));
}

function scaleField(field, scale) {
  return createScalarField(field?.[0]?.length ?? 1, field?.length ?? 1, (x, y) => Number(field?.[y]?.[x] ?? 0) * scale);
}

function gaussian(x, y, cx, cy, radius) {
  return Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * Math.max(0.0001, radius) ** 2)));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}
