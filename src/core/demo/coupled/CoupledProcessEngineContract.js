import {
  ANALYTIC_SCALAR_PROCESS_ENGINE_IDS,
  analyticScalarProcessEngineMetadata,
  createAnalyticScalarProcessInitialState,
  normalizeAnalyticEngineId,
  stepAnalyticScalarProcessEngine
} from './AnalyticScalarProcessEngines.js';

export const COUPLED_PROCESS_ENGINE_VERSION = 'coupled-process-engine-contract-v1';

export const COUPLED_PROCESS_ENGINE_IDS = Object.freeze({
  CA_GRID_PROCESS_BASELINE: 'caGridProcessBaseline',
  GAUSSIAN_PATCH_MOVING_HOTSPOT: 'gaussianPatchMovingHotspot',
  SOURCE_DIFFUSION_DECAY: 'sourceDiffusionDecay',
  ADVECTION_DIFFUSION_DECAY: 'advectionDiffusionDecay',
  GROWTH_DIFFUSION_DECAY: 'growthDiffusionDecay',
  FRONT_BOUNDARY_APPROXIMATION: 'frontBoundaryApproximation'
});

export const DEFAULT_COUPLED_PROCESS_ENGINE_ID = COUPLED_PROCESS_ENGINE_IDS.ADVECTION_DIFFUSION_DECAY;

export function normalizeCoupledProcessEngineId(id) {
  return normalizeAnalyticEngineId(id ?? DEFAULT_COUPLED_PROCESS_ENGINE_ID);
}

export function coupledProcessEngineById(id) {
  return analyticScalarProcessEngineMetadata(normalizeCoupledProcessEngineId(id));
}

export function coupledProcessEngineOptions() {
  return ANALYTIC_SCALAR_PROCESS_ENGINE_IDS.map((id) => {
    const engine = coupledProcessEngineById(id);
    return {
      id: engine.id,
      label: engine.label,
      claimLevel: engine.claimLevel,
      description: engine.description,
      equation: engine.equation,
      inWords: engine.inWords,
      notA: engine.notA,
      teachingUse: engine.teachingUse
    };
  });
}

export function createCoupledProcessInitialState(config = {}) {
  return createAnalyticScalarProcessInitialState({
    ...config,
    engineId: normalizeCoupledProcessEngineId(config.engineId)
  });
}

export function stepCoupledProcessEngine(context = {}) {
  const state = context.state ?? createCoupledProcessInitialState(context);
  const result = stepAnalyticScalarProcessEngine({
    ...context,
    engineId: normalizeCoupledProcessEngineId(context.engineId ?? state.engineId),
    state
  });
  const validation = validateCoupledProcessEngineResult(result);
  return {
    ...result,
    validation
  };
}

export function validateCoupledProcessEngineResult(result = {}) {
  const checks = [];
  const field = result.scalarField ?? result.processField;
  const width = Math.max(1, Math.round(Number(result.width ?? field?.[0]?.length ?? 1)));
  const height = Math.max(1, Math.round(Number(result.height ?? field?.length ?? 1)));
  checks.push(check(Boolean(result.engineId), 'engine-id-present', 'Engine id is present.'));
  checks.push(check(Boolean(result.metadata?.equation), 'engine-equation-present', 'Engine equation metadata is present.'));
  checks.push(check(Array.isArray(field), 'scalar-field-array', 'Scalar field is a row-major array.'));
  checks.push(check(field?.length === height, 'scalar-field-height', 'Scalar field height matches result metadata.'));
  checks.push(check(field?.every?.((row) => Array.isArray(row) && row.length === width), 'scalar-field-width', 'Scalar field width matches result metadata.'));
  checks.push(check(fieldFinite(field), 'scalar-field-finite', 'Scalar field values are finite.'));
  checks.push(check(fieldBounded(field), 'scalar-field-bounded', 'Scalar field values are bounded in [0,1].'));
  const failed = checks.filter((entry) => entry.status === 'FAIL');
  return {
    status: failed.length ? 'FAIL' : 'PASS',
    checks
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

function check(ok, id, message) {
  return {
    id,
    status: ok ? 'PASS' : 'FAIL',
    message
  };
}
