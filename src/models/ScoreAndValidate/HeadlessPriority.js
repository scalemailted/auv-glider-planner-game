const HeadlessGrid = require('./HeadlessGrid.js')
DEFAULT_WEIGHTS = Object.freeze({
  value: 0.35,
  uncertainty: 0.25,
  boundary: 0.18,
  unknown: 0.22,
  staleness: 0.12,
  hazard: 0.35,
  mask: 1
});

 function computeHeadlessPriorityComponents(fieldPack, config = {}) {
  const fields = fieldPack?.fields ?? {};
  const grid = fieldPack?.grid ?? config.grid;
  return {
    value: fields.mu_belief ?? HeadlessGrid.createScalarField3d(grid, 0),
    uncertainty: fields.U_uncertainty ?? HeadlessGrid.createScalarField3d(grid, 0),
    boundary: fields.boundaryStrength ?? HeadlessGrid.createScalarField3d(grid, 0),
    unknown: fields.P_unknown ?? HeadlessGrid.createScalarField3d(grid, 0),
    staleness: fields.staleness ?? HeadlessGrid.createScalarField3d(grid, 0),
    hazard: fields.hazard ?? HeadlessGrid.createScalarField3d(grid, 0),
    inaccessiblePenalty: fields.constraintMask ?? HeadlessGrid.createScalarField3d(grid, 0),
    excludesRouteTravelCost: true
  };
}

 function computeHeadlessSamplingPriority(fieldPack, config = {}) {
  const grid = fieldPack?.grid ?? config.grid;
  const components = computeHeadlessPriorityComponents(fieldPack, config);
  const weights = normalizeWeights(config.priorityWeights ?? config.weights);
  const raw = HeadlessGrid.createScalarField3d(grid, 0);
  for (let z = 0; z < raw.length; z += 1) {
    for (let y = 0; y < raw[z].length; y += 1) {
      for (let x = 0; x < raw[z][y].length; x += 1) {
        raw[z][y][x] = (
          weights.value * HeadlessGrid.sampleNearest3d(components.value, x, y, z)
          + weights.uncertainty * HeadlessGrid.sampleNearest3d(components.uncertainty, x, y, z)
          + weights.boundary * HeadlessGrid.sampleNearest3d(components.boundary, x, y, z)
          + weights.unknown * HeadlessGrid.sampleNearest3d(components.unknown, x, y, z)
          + weights.staleness * HeadlessGrid.sampleNearest3d(components.staleness, x, y, z)
          - weights.hazard * HeadlessGrid.sampleNearest3d(components.hazard, x, y, z)
          - weights.mask * HeadlessGrid.sampleNearest3d(components.inaccessiblePenalty, x, y, z)
        );
      }
    }
  }
  return HeadlessGrid.normalizeField3d(raw).map((layer, z) => layer.map((row, y) => row.map((value, x) => (
    HeadlessGrid.sampleNearest3d(components.inaccessiblePenalty, x, y, z) >= 0.5 ? 0 : HeadlessGrid.clamp01(value)
  ))));
}

 function headlessPrioritySummary(priorityField, components = {}) {
  const stats = HeadlessGrid.field3dStats(priorityField);
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

module.exports = {computeHeadlessPriorityComponents, computeHeadlessSamplingPriority, headlessPrioritySummary}