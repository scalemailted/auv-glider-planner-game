export const SAMPLING_PROCESS_TICK_RATES = Object.freeze([0.25, 0.5, 1, 2, 4, 8]);
export const DEFAULT_SAMPLING_PROCESS_TICK_RATE = 1;
export const SAMPLING_PROCESS_FRAME_SEMANTICS = 'discrete-generations-v1';
export const DISCRETE_PROCESS_MODES = Object.freeze([
  'foundationalCaModels',
  'oceanProcessAnalogs',
  'processPaint',
  'randomRuleLab'
]);

export function normalizeProcessTickRate(value = DEFAULT_SAMPLING_PROCESS_TICK_RATE) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_SAMPLING_PROCESS_TICK_RATE;
  return SAMPLING_PROCESS_TICK_RATES.includes(number) ? number : DEFAULT_SAMPLING_PROCESS_TICK_RATE;
}

export function processTickIntervalSeconds(value = DEFAULT_SAMPLING_PROCESS_TICK_RATE) {
  return 1 / normalizeProcessTickRate(value);
}

export function isDiscreteSamplingProcessMode(mode) {
  return DISCRETE_PROCESS_MODES.includes(mode);
}

export function createProcessTimingState(overrides = {}) {
  const tickRate = normalizeProcessTickRate(overrides.tickRate ?? overrides.processTickRate);
  return {
    generationIndex: Math.max(0, Math.round(Number(overrides.generationIndex ?? overrides.processGenerationIndex ?? 0) || 0)),
    tickRate,
    tickIntervalSeconds: processTickIntervalSeconds(tickRate),
    tickAccumulator: Math.max(0, Number(overrides.tickAccumulator ?? overrides.processTickAccumulator ?? 0) || 0),
    lastProcessStepTime: Number.isFinite(Number(overrides.lastProcessStepTime)) ? Number(overrides.lastProcessStepTime) : null,
    frameSemantics: SAMPLING_PROCESS_FRAME_SEMANTICS
  };
}

export function advanceProcessClock(state = {}, deltaSeconds = 0, { paused = false, maxCatchUpTicks = 4 } = {}) {
  const current = createProcessTimingState(state);
  if (paused) return { ...current, ticksToAdvance: 0 };
  const delta = Math.max(0, Number(deltaSeconds) || 0);
  const accumulator = current.tickAccumulator + delta;
  const rawTicks = Math.floor(accumulator / current.tickIntervalSeconds);
  const ticksToAdvance = Math.max(0, Math.min(Math.max(1, maxCatchUpTicks), rawTicks));
  return {
    ...current,
    tickAccumulator: accumulator - ticksToAdvance * current.tickIntervalSeconds,
    ticksToAdvance,
    lastProcessStepTime: ticksToAdvance > 0 ? Number(((current.lastProcessStepTime ?? 0) + delta).toFixed(4)) : current.lastProcessStepTime
  };
}

export function stepProcessGenerationState(state = {}, count = 1) {
  const current = createProcessTimingState(state);
  const steps = Math.max(0, Math.round(Number(count) || 0));
  return {
    ...current,
    generationIndex: current.generationIndex + steps,
    tickAccumulator: 0,
    lastProcessStepTime: current.lastProcessStepTime
  };
}

export function processTimingExportBlock(state = {}) {
  const timing = createProcessTimingState(state);
  return {
    generationIndex: timing.generationIndex,
    tickRate: timing.tickRate,
    tickIntervalSeconds: timing.tickIntervalSeconds,
    frameSemantics: SAMPLING_PROCESS_FRAME_SEMANTICS
  };
}
