import { randomizeSamplingProcessAllocation } from '../../src/core/demo/sampling/SamplingProcessRandomizer.js';
import { samplingProcessLayersFromPaint, validateSamplingProcessPaintModel } from '../../src/core/demo/sampling/SamplingProcessPaintModel.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const first = randomizeSamplingProcessAllocation({ seed: 'same-seed', width: 6, height: 4, groupCount: 3, activeFraction: 0.25 });
const second = randomizeSamplingProcessAllocation({ seed: 'same-seed', width: 6, height: 4, groupCount: 3, activeFraction: 0.25 });
const different = randomizeSamplingProcessAllocation({ seed: 'different-seed', width: 6, height: 4, groupCount: 3, activeFraction: 0.25 });

assert(JSON.stringify(first.model.cells) === JSON.stringify(second.model.cells), 'same seed should reproduce cells');
assert(JSON.stringify(first.model.cells) !== JSON.stringify(different.model.cells), 'different seed should change allocation');
assert(first.statusLabel === 'Custom Exploratory', 'mixed randomization should be custom exploratory');
assert(validateSamplingProcessPaintModel(first.model).status === 'PASS', 'random model should validate');

const layers = samplingProcessLayersFromPaint(first.model);
assert(layers.stateLayer.length === 4, 'random stateLayer height mismatch');
assert(layers.ruleLayer[0].length === 6, 'random ruleLayer width mismatch');

const scientific = randomizeSamplingProcessAllocation({ seed: 'science', mode: 'scientificRandomization' });
assert(scientific.statusLabel === 'Pattern-Modified', 'scientific randomization status mismatch');

if (failures.length) {
  console.error('Sampling process randomizer smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sampling process randomizer smoke passed');
