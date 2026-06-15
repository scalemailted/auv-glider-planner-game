import {
  createCoupledProcessInitialState,
  coupledProcessEngineById,
  stepCoupledProcessEngine,
  validateCoupledProcessEngineResult
} from './CoupledProcessEngineContract.js';
import { computeOracleSamplingObjective } from './OracleCoupledObjective.js';
import {
  centroidOfMass,
  createGrid,
  fieldDifference,
  fieldStats,
  gradientMagnitude
} from './CoupledFieldMath.js';

export const COUPLED_PROCESS_VALIDATION_VERSION = 'coupled-process-validation-v1';

export function validateAnalyticEngineStep(result = {}) {
  return validateCoupledProcessEngineResult(result);
}

export function validateCoupledOracleObjective(result = {}) {
  const field = result.objectiveField ?? result.field;
  const checks = [];
  checks.push(check(Array.isArray(field), 'objective-field-array', 'Objective field is a row-major array.'));
  checks.push(check(field?.every?.((row) => Array.isArray(row)), 'objective-field-rows', 'Objective field rows are arrays.'));
  checks.push(check(fieldFinite(field), 'objective-field-finite', 'Objective values are finite.'));
  checks.push(check(fieldBounded(field), 'objective-field-bounded', 'Objective values are bounded in [0,1].'));
  checks.push(check(result.metadata?.deterministic === true, 'objective-deterministic', 'Objective metadata marks deterministic oracle behavior.'));
  checks.push(check(result.metadata?.usesBelief === false && result.metadata?.usesUncertainty === false, 'objective-no-belief-uncertainty', 'Objective does not claim belief or uncertainty use.'));
  return validationResult(checks);
}

export function runCoupledEngineValidationFixture(engineId = 'advectionDiffusionDecay') {
  const engine = coupledProcessEngineById(engineId);
  const checks = [];
  const metrics = {};
  checks.push(check(Boolean(engine?.equation && engine?.inWords && engine?.notA), 'engine-metadata-complete', 'Engine has equation, plain-language explanation, and boundary metadata.'));

  const zeroFlow = () => ({ u: 0, v: 0 });
  const uniformEast = () => ({ u: 0.15, v: 0 });
  const initial = createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: `validation:${engineId}` });
  const first = stepCoupledProcessEngine({ engineId, state: initial, flowSampler: zeroFlow, dt: 0.5, time: 0 });
  const validation = validateAnalyticEngineStep(first);
  checks.push(...validation.checks);

  const repeatA = stepCoupledProcessEngine({
    engineId,
    state: createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: `validation:${engineId}` }),
    flowSampler: zeroFlow,
    dt: 0.5,
    time: 0
  });
  const repeatB = stepCoupledProcessEngine({
    engineId,
    state: createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: `validation:${engineId}` }),
    flowSampler: zeroFlow,
    dt: 0.5,
    time: 0
  });
  const repeatDelta = fieldStats(fieldDifference(repeatA.scalarField, repeatB.scalarField)).mean;
  metrics.repeatDelta = repeatDelta;
  checks.push(check(repeatDelta < 1e-9, 'deterministic-repeatable', 'Deterministic seed produces repeatable output.'));

  if (engine.id === 'advectionDiffusionDecay') {
    const zeroInitial = createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: 'validation:zero-flow' });
    const zeroCentroidBefore = centroidOfMass(zeroInitial.scalarField);
    const zeroStep = stepCoupledProcessEngine({
      engineId,
      state: zeroInitial,
      flowSampler: zeroFlow,
      dt: 0.5,
      time: 0,
      parameters: { diffusion: 0, decay: 0, sourceStrength: 0, flowScale: 0.18 }
    });
    const zeroCentroidAfter = centroidOfMass(zeroStep.scalarField);
    const zeroShift = Math.hypot(zeroCentroidAfter.x - zeroCentroidBefore.x, zeroCentroidAfter.y - zeroCentroidBefore.y);
    metrics.zeroFlowCentroidShift = zeroShift;
    checks.push(check(zeroShift < 0.015, 'zero-flow-centroid-stable', 'Zero-flow advection does not move centroid significantly.'));

    const eastInitial = createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: 'validation:east-flow' });
    const eastBefore = centroidOfMass(eastInitial.scalarField);
    const eastStep = stepCoupledProcessEngine({
      engineId,
      state: eastInitial,
      flowSampler: uniformEast,
      dt: 0.75,
      time: 0,
      parameters: { diffusion: 0, decay: 0, sourceStrength: 0, flowScale: 0.22 }
    });
    const eastAfter = centroidOfMass(eastStep.scalarField);
    metrics.uniformFlowDeltaX = eastAfter.x - eastBefore.x;
    checks.push(check(eastAfter.x > eastBefore.x, 'uniform-flow-moves-east', 'Uniform east flow moves centroid in the expected direction.'));
  }

  const diffusionCheck = diffusionReducesGradient();
  metrics.diffusionGradientBefore = diffusionCheck.before;
  metrics.diffusionGradientAfter = diffusionCheck.after;
  checks.push(check(diffusionCheck.after < diffusionCheck.before, 'diffusion-reduces-gradient', 'Diffusion reduces sharp gradients over time.'));

  const decayCheck = decayReducesMass();
  metrics.decayMassBefore = decayCheck.before;
  metrics.decayMassAfter = decayCheck.after;
  checks.push(check(decayCheck.after < decayCheck.before, 'decay-reduces-mass', 'Decay reduces total mass when no source is present.'));

  const sourceCheck = sourceIncreasesMass();
  metrics.sourceMassBefore = sourceCheck.before;
  metrics.sourceMassAfter = sourceCheck.after;
  checks.push(check(sourceCheck.after > sourceCheck.before, 'source-increases-mass', 'Source increases scalar mass near the source.'));

  const objectiveCheck = objectiveValidationFixture(first.scalarField, first.futureProcessField ?? first.scalarField, first.gradientStrength);
  metrics.objectiveDeltaFromProcess = objectiveCheck.delta;
  checks.push(...objectiveCheck.checks);

  return {
    version: COUPLED_PROCESS_VALIDATION_VERSION,
    engineId: engine.id,
    engineLabel: engine.label,
    status: validationResult(checks).status,
    checks,
    metrics
  };
}

function diffusionReducesGradient() {
  const field = createGrid(18, 12, (col, row) => (col === 9 && row === 6 ? 1 : 0));
  const before = fieldStats(gradientMagnitude(field)).mean;
  const initial = createCoupledProcessInitialState({
    engineId: 'sourceDiffusionDecay',
    width: 18,
    height: 12,
    scalarField: field,
    parameters: { diffusion: 0.25, decay: 0, sourceStrength: 0 }
  });
  const result = stepCoupledProcessEngine({ engineId: 'sourceDiffusionDecay', state: initial, dt: 0.6, time: 0 });
  const after = fieldStats(gradientMagnitude(result.scalarField)).mean;
  return { before, after };
}

function decayReducesMass() {
  const field = createGrid(18, 12, 0.4);
  const before = fieldStats(field).total;
  const initial = createCoupledProcessInitialState({
    engineId: 'sourceDiffusionDecay',
    width: 18,
    height: 12,
    scalarField: field,
    parameters: { diffusion: 0, decay: 0.25, sourceStrength: 0 }
  });
  const result = stepCoupledProcessEngine({ engineId: 'sourceDiffusionDecay', state: initial, dt: 1, time: 0 });
  const after = fieldStats(result.scalarField).total;
  return { before, after };
}

function sourceIncreasesMass() {
  const field = createGrid(18, 12, 0);
  const before = fieldStats(field).total;
  const initial = createCoupledProcessInitialState({
    engineId: 'sourceDiffusionDecay',
    width: 18,
    height: 12,
    scalarField: field,
    parameters: { diffusion: 0, decay: 0, sourceStrength: 0.3, sourceRadius: 0.12 }
  });
  const result = stepCoupledProcessEngine({ engineId: 'sourceDiffusionDecay', state: initial, dt: 1, time: 0 });
  const after = fieldStats(result.scalarField).total;
  return { before, after };
}

function objectiveValidationFixture(processField, futureProcessField, gradientStrength) {
  const width = processField?.[0]?.length ?? 18;
  const height = processField?.length ?? 12;
  const constraintMask = createGrid(width, height, (col) => (col < 3 ? 0 : 1));
  const objective = computeOracleSamplingObjective({
    processField,
    futureProcessField,
    gradientStrength,
    boundaryStrength: gradientStrength,
    constraintMask,
    objectiveWeights: { gradient: 0.4, future: 0.25, constraint: 0.8 }
  });
  const objectiveValidation = validateCoupledOracleObjective(objective);
  const maskedMax = Math.max(...objective.field.map((row) => row.slice(0, 3)).flat());
  const delta = fieldStats(fieldDifference(objective.field, processField)).mean;
  return {
    delta,
    checks: [
      ...objectiveValidation.checks,
      check(maskedMax < 1e-9, 'constraint-suppresses-objective', 'Constraint mask suppresses objective in blocked cells.'),
      check(delta > 1e-4, 'objective-not-identical-process', 'Objective differs from process intensity when gradient/future/constraints are active.')
    ]
  };
}

function validationResult(checks) {
  if (checks.some((entry) => entry.status === 'FAIL')) return { status: 'FAIL', checks };
  if (checks.some((entry) => entry.status === 'WARN')) return { status: 'WARN', checks };
  return { status: 'PASS', checks };
}

function check(ok, id, message, level = 'FAIL') {
  return {
    id,
    status: ok ? 'PASS' : level,
    message
  };
}

function fieldFinite(field) {
  return Array.isArray(field) && field.every((row) => Array.isArray(row) && row.every((value) => Number.isFinite(Number(value))));
}

function fieldBounded(field) {
  return Array.isArray(field) && field.every((row) => Array.isArray(row) && row.every((value) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= -1e-9 && number <= 1 + 1e-9;
  }));
}
