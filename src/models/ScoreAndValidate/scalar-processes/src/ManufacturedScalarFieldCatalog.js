const ScalarField4D = require('./ScalarField4D.js')
const MANUFACTURED_SCALAR_FIELD_CATALOG_VERSION = 'manufactured-scalar-field-catalog-process-pkg-r1';

const DEFAULT_DEPTH_AXIS_METERS = Object.freeze([0, 10, 35, 75, 150]);
const DEFAULT_TIME_AXIS_SECONDS = Object.freeze([0, 300, 600, 900]);

 function manufacturedScalarFieldCatalog() {
  return [
    definition('linearDepthTime', 'Multilinear depth-time scalar', 'manufacturedAnalytical', ({ x, y, depthMeters, timeSeconds }) => 1.2 + 0.07 * x + 0.11 * y + 0.003 * depthMeters + 0.0004 * timeSeconds),
    definition('uniformControl', 'Uniform scalar control', 'manufacturedAnalytical', () => 0.42),
    definition('decayingPatch', 'Decaying scalar patch', 'manufacturedAnalytical', ({ x, y, depthMeters, timeSeconds }) => (1 + 0.04 * x + 0.02 * y + 0.001 * depthMeters) * Math.exp(-timeSeconds / 1800)),
    definition('sourcePatch', 'Increasing source patch', 'manufacturedAnalytical', ({ x, y, depthMeters, timeSeconds }) => 0.1 + 0.6 * (1 - Math.exp(-timeSeconds / 600)) * Math.exp(-((x - 5) ** 2 + (y - 3) ** 2) / 3) * Math.exp(-depthMeters / 180)),
    definition('gaussianDiffusionProxy', 'Gaussian diffusion proxy', 'manufacturedAnalytical', ({ x, y, depthMeters, timeSeconds }) => {
      const variance = 2.5 + timeSeconds / 300;
      const dx = x - 3.5;
      const dy = y - 2.5;
      return Math.exp(-(dx * dx + dy * dy) / variance) * Math.exp(-depthMeters / 220) / variance;
    })
  ];
}

 function manufacturedScalarFieldDefinition(id) {
  const found = manufacturedScalarFieldCatalog().find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown manufactured scalar field: ${id}`);
  return found;
}

 function evaluateManufacturedScalar(definitionOrId, point = {}) {
  const item = typeof definitionOrId === 'string' ? manufacturedScalarFieldDefinition(definitionOrId) : definitionOrId;
  return round(item.evaluator({
    x: Number(point.x ?? 0),
    y: Number(point.y ?? 0),
    depthMeters: Number(point.depthMeters ?? 0),
    timeSeconds: Number(point.timeSeconds ?? 0),
    width: Number(point.width ?? 8),
    height: Number(point.height ?? 6)
  }));
}

 function createManufacturedScalarField(id = 'linearDepthTime', options = {}) {
  const item = manufacturedScalarFieldDefinition(id);
  const width = Math.max(1, Math.round(Number(options.width ?? 8)));
  const height = Math.max(1, Math.round(Number(options.height ?? 6)));
  const depthAxisMeters = options.depthAxisMeters ?? options.depthCoordinates ?? DEFAULT_DEPTH_AXIS_METERS;
  const timeAxisSeconds = options.timeAxisSeconds ?? options.timeCoordinates ?? DEFAULT_TIME_AXIS_SECONDS;
  const scalarValue = timeAxisSeconds.map((timeSeconds) => depthAxisMeters.map((depthMeters) => (
    Array.from({ length: height }, (_row, y) => Array.from({ length: width }, (_cell, x) => round(item.evaluator({ x, y, depthMeters, timeSeconds, width, height }))))
  )));
  return ScalarField4D.createScalarField4D({
    id: options.id ?? `manufactured-${id}-${width}x${height}`,
    label: options.label ?? item.label,
    width,
    height,
    depthAxisMeters,
    timeAxisSeconds,
    scalarValue,
    seed: options.seed ?? `process-pkg-r1:${id}`,
    sourceMetadata: {
      sourceId: `manufactured-${id}`,
      fieldId: options.id ?? `manufactured-${id}`,
      label: item.label,
      sourceTier: item.sourceTier,
      processKind: id,
      equationFamily: id,
      generatorBackend: 'manufacturedScalarFieldCatalog',
      generatorVersion: MANUFACTURED_SCALAR_FIELD_CATALOG_VERSION,
      synthetic: true,
      calibratedForecast: false,
      calibratedOceanForecast: false,
      calibratedBiogeochemicalForecast: false,
      depthDependent: true,
      timeDependent: true
    }
  });
}

function definition(id, label, sourceTier, evaluator) {
  return Object.freeze({ id, label, sourceTier, evaluator });
}

function round(value, digits = 6) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : null;
}

module.exports = {manufacturedScalarFieldCatalog, manufacturedScalarFieldDefinition, evaluateManufacturedScalar, createManufacturedScalarField}