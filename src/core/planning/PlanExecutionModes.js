export const PLAN_EXECUTION_MODES = [
  'openLoop',
  'timedOpenLoop',
  'surfaceUpdateBundle',
  'policy',
  'contingencyTable'
];

export const PLAN_ANCHOR_MODES = [
  'selectedStart',
  'expectedSurfacePosition',
  'actualSurfacePosition',
  'fixedCoordinate'
];

export function normalizeExecutionMode(mode) {
  return PLAN_EXECUTION_MODES.includes(mode) ? mode : 'openLoop';
}

export function isExecutablePlanMode(mode) {
  return ['openLoop', 'timedOpenLoop', 'surfaceUpdateBundle'].includes(normalizeExecutionMode(mode));
}

export function isScaffoldOnlyPlanMode(mode) {
  return ['policy', 'contingencyTable'].includes(normalizeExecutionMode(mode));
}

export function normalizePlannerMetadata(planner = {}) {
  return {
    name: planner.name ?? 'Imported External Plan',
    type: planner.type ?? planner.source ?? 'importedSolver',
    usesForecast: planner.usesForecast !== false,
    usesTruth: Boolean(planner.usesTruth),
    usesOracle: Boolean(planner.usesOracle),
    source: planner.source ?? 'external',
    model: planner.model ?? null,
    version: planner.version ?? null
  };
}
