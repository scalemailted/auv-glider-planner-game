import {
  clamp01,
  createScalarField,
  fieldStats,
  finiteFieldCheck,
  normalizeField,
  sampleBilinear
} from '../samplingPriority/SamplingPriorityFieldMath.js';
import { sampleVectorBilinear } from '../flow/FlowFieldMath.js';

const EPSILON = 1e-9;

export {
  clamp01,
  createScalarField,
  fieldStats,
  finiteFieldCheck,
  normalizeField,
  sampleBilinear
};

export function distance(a = {}, b = {}) {
  const ax = finiteNumber(a.x ?? a.col, 0);
  const ay = finiteNumber(a.y ?? a.row, 0);
  const bx = finiteNumber(b.x ?? b.col, 0);
  const by = finiteNumber(b.y ?? b.row, 0);
  return round6(Math.hypot(bx - ax, by - ay));
}

export function normalizeVector2(vector = {}) {
  const x = finiteNumber(vector.x ?? vector.u ?? vector[0], 0);
  const y = finiteNumber(vector.y ?? vector.v ?? vector[1], 0);
  const magnitude = Math.hypot(x, y);
  if (magnitude <= EPSILON) return { x: 0, y: 0, u: 0, v: 0, magnitude: 0 };
  return {
    x: x / magnitude,
    y: y / magnitude,
    u: x / magnitude,
    v: y / magnitude,
    magnitude
  };
}

export function dot2(a = {}, b = {}) {
  return round6(componentX(a) * componentX(b) + componentY(a) * componentY(b));
}

export function perpDot2(a = {}, b = {}) {
  return round6(componentX(a) * componentY(b) - componentY(a) * componentX(b));
}

export function cellCenter(col, row) {
  const x = finiteNumber(col, 0);
  const y = finiteNumber(row, 0);
  return { x: x + 0.5, y: y + 0.5, col: Math.round(x), row: Math.round(y) };
}

export function travelDirection(from = {}, to = {}) {
  return normalizeVector2({
    x: finiteNumber(to.x ?? to.col, 0) - finiteNumber(from.x ?? from.col, 0),
    y: finiteNumber(to.y ?? to.row, 0) - finiteNumber(from.y ?? from.row, 0)
  });
}

export function estimateDirectDistanceField(glider = {}, width, height) {
  const w = Math.max(1, Math.round(finiteNumber(width, 1)));
  const h = Math.max(1, Math.round(finiteNumber(height, 1)));
  const origin = gliderPosition(glider);
  return createScalarField(w, h, (col, row) => distance(origin, cellCenter(col, row)));
}

export function estimateArrivalTimeField({
  glider = {},
  speedField = null,
  flowField = null,
  width,
  height
} = {}) {
  const w = Math.max(1, Math.round(finiteNumber(width ?? flowField?.[0]?.length, 1)));
  const h = Math.max(1, Math.round(finiteNumber(height ?? flowField?.length, 1)));
  const origin = gliderPosition(glider);
  const baseSpeed = Math.max(0.05, finiteNumber(glider.speed ?? glider.gliderSpeed, 2));
  const assistScale = Math.max(0, finiteNumber(glider.flowAssistScale, 0.42));
  return createScalarField(w, h, (col, row) => {
    const target = cellCenter(col, row);
    const directDistance = distance(origin, target);
    if (directDistance <= EPSILON) return 0;
    const direction = travelDirection(origin, target);
    const flow = sampleFlowVector(flowField, target.x - 0.5, target.y - 0.5);
    const assist = dot2(flow, direction);
    const speedMultiplier = speedField ? (0.65 + clamp01(sampleBilinear(speedField, col, row))) : 1;
    const effectiveSpeed = Math.max(0.05, baseSpeed * speedMultiplier + assist * assistScale);
    return directDistance / effectiveSpeed;
  });
}

export function estimateCurrentAssistField({
  glider = {},
  flowField = null,
  width,
  height
} = {}) {
  const w = Math.max(1, Math.round(finiteNumber(width ?? flowField?.[0]?.length, 1)));
  const h = Math.max(1, Math.round(finiteNumber(height ?? flowField?.length, 1)));
  const origin = gliderPosition(glider);
  return createScalarField(w, h, (col, row) => {
    const target = cellCenter(col, row);
    const direction = travelDirection(origin, target);
    const flow = sampleFlowVector(flowField, target.x - 0.5, target.y - 0.5);
    return dot2(flow, direction);
  });
}

export function estimateCrossCurrentRiskField({
  glider = {},
  flowField = null,
  width,
  height
} = {}) {
  const w = Math.max(1, Math.round(finiteNumber(width ?? flowField?.[0]?.length, 1)));
  const h = Math.max(1, Math.round(finiteNumber(height ?? flowField?.length, 1)));
  const origin = gliderPosition(glider);
  return createScalarField(w, h, (col, row) => {
    const target = cellCenter(col, row);
    const direction = travelDirection(origin, target);
    const flow = sampleFlowVector(flowField, target.x - 0.5, target.y - 0.5);
    return clamp01(Math.abs(perpDot2(flow, direction)));
  });
}

export function estimateEnergyCostField({
  distanceField,
  currentAssistField,
  crossCurrentRiskField,
  options = {}
} = {}) {
  const height = Math.max(
    Array.isArray(distanceField) ? distanceField.length : 0,
    Array.isArray(currentAssistField) ? currentAssistField.length : 0,
    Array.isArray(crossCurrentRiskField) ? crossCurrentRiskField.length : 0,
    1
  );
  const width = Math.max(
    Array.isArray(distanceField?.[0]) ? distanceField[0].length : 0,
    Array.isArray(currentAssistField?.[0]) ? currentAssistField[0].length : 0,
    Array.isArray(crossCurrentRiskField?.[0]) ? crossCurrentRiskField[0].length : 0,
    1
  );
  const normalizedDistance = normalizeField(distanceField);
  const distanceWeight = finiteNumber(options.distanceWeight, 0.62);
  const oppositionWeight = finiteNumber(options.oppositionWeight, 0.34);
  const crossWeight = finiteNumber(options.crossWeight, 0.28);
  const assistCredit = finiteNumber(options.assistCredit, 0.16);
  const baseCost = finiteNumber(options.baseCost, 0.04);
  return normalizeField(createScalarField(width, height, (col, row) => {
    const assist = valueAt(currentAssistField, col, row);
    const opposition = Math.max(0, -assist);
    const positiveAssist = Math.max(0, assist);
    return baseCost
      + distanceWeight * valueAt(normalizedDistance, col, row)
      + oppositionWeight * opposition
      + crossWeight * valueAt(crossCurrentRiskField, col, row)
      - assistCredit * positiveAssist;
  }));
}

export function estimateReachableMask({
  arrivalTimeField,
  energyCostField,
  glider = {},
  timeBudget = null,
  energyBudget = null,
  accessibleMask = null
} = {}) {
  const height = Math.max(
    Array.isArray(arrivalTimeField) ? arrivalTimeField.length : 0,
    Array.isArray(energyCostField) ? energyCostField.length : 0,
    Array.isArray(accessibleMask) ? accessibleMask.length : 0,
    1
  );
  const width = Math.max(
    Array.isArray(arrivalTimeField?.[0]) ? arrivalTimeField[0].length : 0,
    Array.isArray(energyCostField?.[0]) ? energyCostField[0].length : 0,
    Array.isArray(accessibleMask?.[0]) ? accessibleMask[0].length : 0,
    1
  );
  const maxTime = Math.max(0, finiteNumber(timeBudget ?? glider.timeBudget ?? glider.missionWindow, 12));
  const maxEnergy = Math.max(0, finiteNumber(energyBudget ?? glider.energyBudget, 0.82));
  return createScalarField(width, height, (col, row) => {
    const accessible = valueAt(accessibleMask, col, row, 1) > 0.5;
    const inTime = valueAt(arrivalTimeField, col, row, Infinity) <= maxTime + EPSILON;
    const inEnergy = valueAt(energyCostField, col, row, Infinity) <= maxEnergy + EPSILON;
    return accessible && inTime && inEnergy ? 1 : 0;
  });
}

export function combineActionValueComponents(components = {}, weights = {}) {
  const fields = Object.entries(components).filter(([, field]) => Array.isArray(field));
  const height = Math.max(...fields.map(([, field]) => field.length), 1);
  const width = Math.max(...fields.map(([, field]) => Array.isArray(field?.[0]) ? field[0].length : 0), 1);
  const raw = createScalarField(width, height, (col, row) => fields.reduce((sum, [key, field]) => {
    const weight = finiteNumber(weights[key], 0);
    return sum + weight * valueAt(field, col, row);
  }, 0));
  return normalizeField(raw);
}

function gliderPosition(glider = {}) {
  if (glider.position) return gliderPosition(glider.position);
  return {
    x: finiteNumber(glider.x ?? glider.col, 0),
    y: finiteNumber(glider.y ?? glider.row, 0)
  };
}

function sampleFlowVector(flowField, x, y) {
  const sample = sampleVectorBilinear(flowField, x, y);
  return {
    x: finiteNumber(sample.u ?? sample.x, 0),
    y: finiteNumber(sample.v ?? sample.y, 0),
    u: finiteNumber(sample.u ?? sample.x, 0),
    v: finiteNumber(sample.v ?? sample.y, 0)
  };
}

function componentX(vector = {}) {
  return finiteNumber(vector.x ?? vector.u ?? vector[0], 0);
}

function componentY(vector = {}) {
  return finiteNumber(vector.y ?? vector.v ?? vector[1], 0);
}

function valueAt(field, col, row, fallback = 0) {
  const value = Number(field?.[row]?.[col]);
  return Number.isFinite(value) ? value : fallback;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function round6(value) {
  return Number((Number(value) || 0).toFixed(6));
}
