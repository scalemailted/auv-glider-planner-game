import {
  assignSamplingProcessCell,
  clearSamplingProcessPaintModel,
  clearSamplingProcessCell,
  createBlankSamplingProcessPaintModel,
  createSamplingProcessPaintModel,
  samplingProcessLayersFromPaint,
  validateSamplingProcessPaintModel
} from '../../src/core/demo/sampling/SamplingProcessPaintModel.js';
import { randomizeSamplingProcessAllocation } from '../../src/core/demo/sampling/SamplingProcessRandomizer.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const blank = createBlankSamplingProcessPaintModel({ width: 4, height: 3 });
const blankLayers = samplingProcessLayersFromPaint(blank);
assert(blankLayers.stateLayer.every((row) => row.every((value) => value === 'inactive')), 'blank canvas should start inactive');
assert(blankLayers.ruleLayer.every((row) => row.every((value) => value === null)), 'blank canvas should start with inherited rule slots');
assert(blankLayers.groupLayer.every((row) => row.every((value) => value === 0)), 'blank canvas should start with group 0');
assert(blankLayers.sourceField.every((row) => row.every((value) => value === 0)), 'blank canvas should start with source values at 0');

const model = createSamplingProcessPaintModel({ width: 4, height: 3 });
assignSamplingProcessCell(model, { col: 2, row: 1 }, {
  state: 'active',
  ruleId: 'propagatingFront',
  groupId: 7,
  sourceValue: 0.85
});

let validation = validateSamplingProcessPaintModel(model);
assert(validation.status === 'PASS', `paint model should validate, got ${validation.status}`);
assert(validation.paintedCellCount === 1, 'painted cell count mismatch');
assert(validation.groupCount === 1, 'group definition should be created');

const layers = samplingProcessLayersFromPaint(model);
assert(layers.stateLayer[1][2] === 'active', 'stateLayer assignment missing');
assert(layers.ruleLayer[1][2] === 'propagatingFront', 'ruleLayer assignment missing');
assert(layers.groupLayer[1][2] === 7, 'groupLayer assignment missing');
assert(layers.sourceField[1][2] === 0.85, 'sourceField assignment missing');

clearSamplingProcessCell(model, { col: 2, row: 1 });
validation = validateSamplingProcessPaintModel(model);
assert(validation.paintedCellCount === 0, 'clear cell failed');

const cleared = clearSamplingProcessPaintModel(model, { width: 4, height: 3 });
const clearedLayers = samplingProcessLayersFromPaint(cleared);
assert(clearedLayers.stateLayer[1][2] === 'inactive', 'clear canvas should reset state layer');
assert(clearedLayers.ruleLayer[1][2] === null, 'clear canvas should reset rule layer to inherited');
assert(clearedLayers.groupLayer[1][2] === 0, 'clear canvas should reset group layer');
assert(clearedLayers.sourceField[1][2] === 0, 'clear canvas should reset source field');

const randomA = randomizeSamplingProcessAllocation({ seed: 'paint-smoke', width: 4, height: 3, groupCount: 3, activeFraction: 0.4 });
const randomB = randomizeSamplingProcessAllocation({ seed: 'paint-smoke', width: 4, height: 3, groupCount: 3, activeFraction: 0.4 });
assert(JSON.stringify(randomA.model) === JSON.stringify(randomB.model), 'randomized canvas should be deterministic for same seed/settings');

const exportPayload = {
  patternMode: 'processPaint',
  status: 'Custom Exploratory',
  fields: layers,
  ruleAllocation: model,
  groupDefinitions: model.groups,
  paintSettings: {
    brushSize: 1,
    selectedState: 'active',
    selectedRuleId: 'propagatingFront',
    selectedGroupId: 7,
    selectedSourceValue: 0.85
  }
};
assert(exportPayload.fields.stateLayer[1][2] === 'active', 'export payload should include stateLayer');
assert(exportPayload.fields.ruleLayer[1][2] === 'propagatingFront', 'export payload should include ruleLayer');
assert(exportPayload.fields.groupLayer[1][2] === 7, 'export payload should include groupLayer');
assert(exportPayload.fields.sourceField[1][2] === 0.85, 'export payload should include sourceField');

assignSamplingProcessCell(model, { col: 0, row: 0 }, {
  state: 'inactive',
  ruleId: 'inert',
  groupId: 7,
  sourceValue: 0.2
});
const inertLayers = samplingProcessLayersFromPaint(model);
assert(inertLayers.ruleLayer[0][0] === 'inert', 'explicit inert should be preserved as a cell override');

if (failures.length) {
  console.error('Sampling process paint model smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sampling process paint model smoke passed');
