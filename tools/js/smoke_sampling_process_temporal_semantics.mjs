import {
  SAMPLING_PROCESS_TICK_RATES,
  DEFAULT_SAMPLING_PROCESS_TICK_RATE,
  SAMPLING_PROCESS_FRAME_SEMANTICS,
  advanceProcessClock,
  createProcessTimingState,
  isDiscreteSamplingProcessMode,
  processTimingExportBlock,
  stepProcessGenerationState
} from '../../src/core/demo/sampling/SamplingProcessTiming.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(DEFAULT_SAMPLING_PROCESS_TICK_RATE === 1, 'default tick rate should be 1 generation per second');
for (const rate of [0.25, 0.5, 1, 2, 4, 8]) {
  assert(SAMPLING_PROCESS_TICK_RATES.includes(rate), `missing tick rate ${rate}`);
}
assert(!SAMPLING_PROCESS_TICK_RATES.includes(60), 'tick rates should not include render-frame-like 60 gen/s');

let state = createProcessTimingState({ processTickRate: 1 });
const stepped = stepProcessGenerationState(state, 1);
assert(stepped.generationIndex === 1, 'Step Generation should increment generation exactly once');

const paused = advanceProcessClock(state, 10, { paused: true });
assert(paused.ticksToAdvance === 0, 'paused clock should not advance');
assert(paused.generationIndex === 0, 'paused clock should preserve generation index');

state = createProcessTimingState({ processTickRate: 1 });
let generation = 0;
for (let frame = 0; frame < 60; frame += 1) {
  const next = advanceProcessClock(state, 1 / 60, { paused: false });
  generation += next.ticksToAdvance;
  state = createProcessTimingState({ ...next, generationIndex: generation });
}
assert(generation === 1, `60 render frames at 1 gen/s should produce 1 generation, got ${generation}`);

const catchUp = advanceProcessClock(createProcessTimingState({ processTickRate: 1 }), 10, { paused: false, maxCatchUpTicks: 4 });
assert(catchUp.ticksToAdvance === 4, 'large deltas should cap catch-up ticks');

assert(isDiscreteSamplingProcessMode('foundationalCaModels'), 'foundational CA mode should use discrete process clock');
assert(isDiscreteSamplingProcessMode('oceanProcessAnalogs'), 'ocean analog mode should use discrete process clock');
assert(isDiscreteSamplingProcessMode('processPaint'), 'Process Paint should use discrete process clock');
assert(!isDiscreteSamplingProcessMode('customComposer'), 'custom composer should preserve legacy dynamic behavior');

const exported = processTimingExportBlock({ generationIndex: 7, tickRate: 2 });
assert(exported.generationIndex === 7, 'export metadata should include generationIndex');
assert(exported.tickRate === 2, 'export metadata should include tickRate');
assert(exported.tickIntervalSeconds === 0.5, 'export metadata should include tick interval');
assert(exported.frameSemantics === SAMPLING_PROCESS_FRAME_SEMANTICS, 'export metadata should include discrete frame semantics');

if (failures.length) {
  console.error('Sampling process temporal semantics smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sampling process temporal semantics smoke passed');