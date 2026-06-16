import { clamp01, createScalarField3d, field3dStats, normalizeField3d, sampleNearest3d } from './HeadlessGrid.js';

const DEFAULT_WEIGHTS = Object.freeze({
  value: 0.35,
  uncertainty: 0.25,
  boundary: 0.18,
  unknown: 0.22,
  staleness: 0.12,
  hazard: 0.35,
  mask: 1
});

export function computeHeadlessPriorityComponents(fieldPack, config = {}) {
  const fields = fieldPack?.fields ?? {};
  const grid = fieldPack?.grid ?? config.grid;
  return {
    value: fields.mu_belief ?? createScalarField3d(grid, 0),
    uncertainty: fields.U_uncertainty ?? createScalarField3d(grid, 0),
    boundary: fields.boundaryStrength ?? createScalarField3d(grid, 0),
    unknown: fields.P_unknown ?? createScalarField3d(grid, 0),
    staleness: fields.staleness ?? createScalarField3d(grid, 0),
    hazard: fields.hazard ?? createScalarField3d(grid, 0),
    inaccessiblePenalty: fields.constraintMask ?? createScalarField3d(grid, 0),
    excludesRouteTravelCost: true
  };
}

export function computeHeadlessSamplingPriority(fieldPack, config = {}) {
  const grid = fieldPack?.grid ?? config.grid;
  const components = computeHeadlessPriorityComponents(fieldPack, config);
  const weights = normalizeWeights(config.priorityWeights ?? config.weights);
  const raw = createScalarField3d(grid, 0);
  for (let z = 0; z < raw.length; z += 1) {
    for (let y = 0; y < raw[z].length; y += 1) {
      for (let x = 0; x < raw[z][y].length; x += 1) {
        raw[z][y][x] = (
          weights.value * sampleNearest3d(components.value, x, y, z)
          + weights.uncertainty * sampleNearest3d(components.uncertainty, x, y, z)
          + weights.boundary * sampleNearest3d(components.boundary, x, y, z)
          + weights.unknown * sampleNearest3d(components.unknown, x, y, z)
          + weights.staleness * sampleNearest3d(components.staleness, x, y, z)
          - weights.hazard * sampleNearest3d(components.hazard, x, y, z)
          - weights.mask * sampleNearest3d(components.inaccessiblePenalty, x, y, z)
        );
      }
    }
  }
  return normalizeField3d(raw).map((layer, z) => layer.map((row, y) => row.map((value, x) => (
    sampleNearest3d(components.inaccessiblePenalty, x, y, z) >= 0.5 ? 0 : clamp01(value)
  ))));
}

export function headlessPrioritySummary(priorityField, components = {}) {
  const stats = field3dStats(priorityField);
  return {
    type: 'anchor.headless.priority-summary',
    finite: stats.invalidCount === 0 && stats.finiteCount > 0,
    min: stats.min,
    max: stats.max,
    mean: stats.mean,
    excludesRouteTravelCost: components.excludesRouteTravelCost !== false,
    componentIds: Object.keys(components).filter((key) => key !== 'excludesRouteTravelCost'),
    note: 'A_global is a sampling priority field only; it does not include route travel cost or path optimization.'
  };
}

function normalizeWeights(weights = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_WEIGHTS).map(([key, fallback]) => [key, finiteNumber(weights[key], fallback)]));
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
