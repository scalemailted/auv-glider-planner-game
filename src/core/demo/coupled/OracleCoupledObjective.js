import {
  clamp01,
  combineWeightedFields,
  createGrid,
  fieldDifference,
  fieldStats,
  gradientMagnitude,
  maskField,
  normalizeField,
  normalizeShape
} from './CoupledFieldMath.js';

export const ORACLE_COUPLED_OBJECTIVE_VERSION = 'oracle-coupled-objective-v1';

export const DEFAULT_ORACLE_OBJECTIVE_WEIGHTS = Object.freeze({
  value: 0.42,
  gradient: 0.18,
  boundary: 0.14,
  future: 0.2,
  sourceProximity: 0.08,
  constraint: 0.55,
  hazard: 0.25
});

export const ORACLE_OBJECTIVE_FORMULA = 'S* = w_value*C + w_gradient*|grad C| + w_boundary*B + w_future*C_future + w_source*sourceProximity - w_constraint*constraintPenalty - w_hazard*hazardPenalty';

export function computeObjectiveComponents({
  processField,
  futureProcessField = null,
  flowField = null,
  constraintMask = null,
  terrainMask = null,
  hazardField = null,
  gradientStrength = null,
  boundaryStrength = null,
  sourceProximity = null,
  objectiveWeights = {},
  dx = 1,
  dy = 1
} = {}) {
  const processValue = normalizeShape(processField);
  const height = processValue.length;
  const width = processValue[0]?.length ?? 1;
  const weights = normalizeWeights(objectiveWeights);
  const future = futureProcessField ? normalizeShape(futureProcessField, width, height) : processValue;
  const gradient = gradientStrength ? normalizeShape(gradientStrength, width, height) : gradientMagnitude(processValue);
  const boundary = boundaryStrength ? normalizeShape(boundaryStrength, width, height) : gradient;
  const source = sourceProximity ? normalizeShape(sourceProximity, width, height) : createGrid(width, height, 0);
  const constraint = constraintPenaltyFromMasks({ constraintMask, terrainMask, width, height });
  const hazard = hazardField ? normalizeShape(hazardField, width, height) : createGrid(width, height, 0);
  const positive = combineWeightedFields([
    { field: processValue, weight: weights.value },
    { field: gradient, weight: weights.gradient },
    { field: boundary, weight: weights.boundary },
    { field: future, weight: weights.future },
    { field: source, weight: weights.sourceProximity }
  ]);
  const rawObjective = createGrid(width, height, (col, row) => clamp01(
    positive[row][col]
    - weights.constraint * constraint[row][col]
    - weights.hazard * hazard[row][col]
  ));
  const usableMask = constraintMask ? normalizeShape(constraintMask, width, height, 1) : terrainMask ? invertMask(terrainMask, width, height) : createGrid(width, height, 1);
  const objectiveField = maskField(rawObjective, usableMask);
  return {
    version: ORACLE_COUPLED_OBJECTIVE_VERSION,
    formula: ORACLE_OBJECTIVE_FORMULA,
    weights,
    dx,
    dy,
    deterministic: true,
    usesBelief: false,
    usesUncertainty: false,
    usesHiddenTruth: false,
    note: 'Oracle objective uses known deterministic process, flow, and constraints.',
    processValue,
    gradientStrength: gradient,
    boundaryStrength: boundary,
    nearFutureValue: future,
    sourceProximity: source,
    constraintPenalty: constraint,
    hazardPenalty: hazard,
    flowField: flowField ?? null,
    rawObjective,
    objectiveField,
    objectiveDifference: normalizeField(fieldDifference(objectiveField, processValue))
  };
}

export function computeOracleSamplingObjective(options = {}) {
  // Oracle objective uses known fields only. It does not use belief, uncertainty, hidden truth, or information gain.
  const components = computeObjectiveComponents(options);
  const stats = fieldStats(components.objectiveField);
  return {
    version: ORACLE_COUPLED_OBJECTIVE_VERSION,
    field: components.objectiveField,
    objectiveField: components.objectiveField,
    formula: components.formula,
    weights: components.weights,
    components,
    stats,
    metadata: {
      deterministic: true,
      oracle: true,
      usesBelief: false,
      usesUncertainty: false,
      usesHiddenTruth: false,
      note: components.note
    }
  };
}

function normalizeWeights(weights = {}) {
  return {
    ...DEFAULT_ORACLE_OBJECTIVE_WEIGHTS,
    ...Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, nonnegative(value, DEFAULT_ORACLE_OBJECTIVE_WEIGHTS[key] ?? 0)]))
  };
}

function constraintPenaltyFromMasks({ constraintMask, terrainMask, width, height }) {
  const constraint = constraintMask ? normalizeShape(constraintMask, width, height, 1) : null;
  const terrain = terrainMask ? normalizeShape(terrainMask, width, height, 0) : null;
  return createGrid(width, height, (col, row) => {
    const constraintBlocked = constraint ? 1 - clamp01(constraint[row][col]) : 0;
    const terrainBlocked = terrain ? clamp01(terrain[row][col]) : 0;
    return clamp01(Math.max(constraintBlocked, terrainBlocked));
  });
}

function invertMask(mask, width, height) {
  const source = normalizeShape(mask, width, height, 0);
  return createGrid(width, height, (col, row) => 1 - clamp01(source[row][col]));
}

function nonnegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}
