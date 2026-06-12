import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  buildSamplingProcessLayersForField,
  buildSamplingProcessPaintField,
  fieldStats,
  processPaintNodeGrid
} from '../../src/core/demo/sampling/SamplingProcessPaintFieldAdapter.js';
import {
  assignSamplingProcessCell,
  createBlankSamplingProcessPaintModel,
  createSamplingProcessPaintModel
} from '../../src/core/demo/sampling/SamplingProcessPaintModel.js';

const adapterPath = new URL('../../src/core/demo/sampling/SamplingProcessPaintFieldAdapter.js', import.meta.url);

function baseField(width = 4, height = 3) {
  return {
    width,
    height,
    time: 0,
    displayMode: 'sampleValue',
    field: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
    sampleValueField: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
    eventLikelihoodField: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
    sourceField: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
    likelihoodField: {},
    graphField: {},
    activityDiagnostics: {}
  };
}

function flatValues(field) {
  return field.flat().map(Number);
}

function assertNormalizedFinite(field, label) {
  for (const value of flatValues(field)) {
    assert.equal(Number.isFinite(value), true, `${label} should contain finite values`);
    assert.equal(value >= 0 && value <= 1, true, `${label} values should be normalized`);
  }
}

const blankModel = createBlankSamplingProcessPaintModel({ width: 4, height: 3 });
const blankLayers = buildSamplingProcessLayersForField({
  field: baseField(),
  paintModel: blankModel,
  processMode: 'processPaint'
});
const blank = buildSamplingProcessPaintField({
  baseField: baseField(),
  processLayers: blankLayers,
  paintModel: blankModel,
  seed: 'paint-field-adapter-smoke',
  demoTime: 0,
  processPaintRunStarted: false,
  paused: true,
  paintStartMode: 'blankCanvas',
  displayMode: 'nodeStates'
});

assert.equal(typeof buildSamplingProcessPaintField, 'function', 'buildSamplingProcessPaintField should export');
assert.equal(typeof processPaintNodeGrid, 'function', 'processPaintNodeGrid should export');
assert.equal(blank.field.width, 4, 'blank field width should be preserved');
assert.equal(blank.field.height, 3, 'blank field height should be preserved');
assert.equal(blank.field.displayMode, 'nodeStates', 'display mode override should apply');
assert.equal(blank.field.stateLayer, undefined, 'state layer should remain graph-scoped, not top-level');
assert.deepEqual([...new Set(blank.field.graphField.stateField.flat())], ['inactive'], 'blank graph state should be inactive');
assert.equal(Math.max(...flatValues(blank.field.samplingValueField)), 0, 'blank sampling field should have zero values');
assert.equal(Math.max(...flatValues(blank.field.sampleValueField)), 0, 'legacy sampleValueField alias should match blank values');
assert.equal(Math.max(...flatValues(blank.field.eventLikelihoodField)), 0, 'legacy eventLikelihoodField alias should match blank source');
assert.equal(Math.max(...flatValues(blank.field.sourceField)), 0, 'sourceField should match blank source');
assert.equal(Array.isArray(blank.field.transitionLayer), true, 'transitionLayer should exist');
assert.equal(Array.isArray(blank.field.roiRoleLayer), true, 'roiRoleLayer should exist');
assert.equal(Array.isArray(blank.field.processMessages), true, 'processMessages should exist');
assert.equal(Array.isArray(blank.field.graphField.nodeGrid), true, 'graph nodeGrid should exist');
assert.equal(Array.isArray(blank.field.graphField.ruleField), true, 'graph ruleField should exist');
assert.equal(Array.isArray(blank.field.graphField.resolvedRuleField), true, 'graph resolvedRuleField should exist');
assert.equal(typeof blank.field.graphField.diagnostics, 'object', 'graph diagnostics should exist');
assertNormalizedFinite(blank.field.samplingValueField, 'blank samplingValueField');

const paintedModel = createSamplingProcessPaintModel({ width: 4, height: 3 });
assignSamplingProcessCell(paintedModel, { col: 2, row: 1 }, {
  state: 'active',
  ruleId: 'propagatingFront',
  groupId: 3,
  sourceValue: 0.9
});
const painted = buildSamplingProcessPaintField({
  baseField: baseField(),
  paintModel: paintedModel,
  seed: 'paint-field-adapter-smoke',
  demoTime: 0,
  processPaintRunStarted: false,
  paused: true,
  paintStartMode: 'blankCanvas',
  displayMode: 'nodeStates'
});
const cell = painted.field.graphField.nodeGrid[1][2];
assert.equal(painted.field.graphField.stateField[1][2], 'active', 'painted active cell should appear in graph state');
assert.equal(cell.state, 'active', 'painted active cell should appear in node grid');
assert.equal(cell.ruleId, 'propagatingFront', 'painted rule should resolve in node grid');
assert.equal(cell.groupId, 3, 'painted group should appear in node grid');
assert.equal(painted.field.sourceField[1][2], 0.9, 'painted source should appear in sourceField');
assert.equal(painted.field.eventLikelihoodField[1][2], 0.9, 'painted source should appear in legacy eventLikelihoodField alias');
assert.equal(painted.field.samplingValueField, painted.field.sampleValueField, 'sampleValueField legacy alias should reference samplingValueField');
assert.equal(painted.field.graphField.activationField, painted.field.samplingValueField, 'activationField should reference samplingValueField');
assert.equal(painted.field.graphField.diagnostics.activeNodeCount, 1, 'graph diagnostics should count active node');
assert.equal(painted.field.activityDiagnostics.processPaint.paintedCellCount, 1, 'activity diagnostics should count painted cell');
assert.equal(fieldStats(painted.field.samplingValueField).max > 0, true, 'painted field should produce nonzero sampling values');
assertNormalizedFinite(painted.field.samplingValueField, 'painted samplingValueField');
assertNormalizedFinite(painted.field.sourceField, 'painted sourceField');

const source = await readFile(adapterPath, 'utf8');
assert.equal(source.includes('RoiGeneratorDemoScene'), false, 'adapter should not import or reference RoiGeneratorDemoScene');
assert.equal(/\bPhaser\b/.test(source), false, 'adapter should not depend on Phaser globals');
assert.equal(/\bdocument\b|\bwindow\b/.test(source), false, 'adapter should not depend on DOM globals');

console.log('smoke_sampling_process_paint_field_adapter: ok');
