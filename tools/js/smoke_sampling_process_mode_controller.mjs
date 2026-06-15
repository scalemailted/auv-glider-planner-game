import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE,
  SAMPLING_PROCESS_VISIBLE_MODES,
  normalizeSamplingProcessMode,
  normalizeVisibleSamplingProcessMode,
  samplingProcessWorkflowModes
} from '../../src/core/demo/sampling/SamplingProcessTerminology.js';
import {
  buildCustomComposerPatch,
  buildDiagnosticsEntryPatch,
  buildPatternSourcePatch,
  buildProcessPaintEntryPatch,
  buildRandomRuleLabEntryPatch,
  buildSamplingProcessModePatch,
  samplingProcessModeInvariants,
  validateSamplingProcessModeState
} from '../../src/core/demo/sampling/SamplingProcessModeController.js';
import { createBlankSamplingProcessPaintModel } from '../../src/core/demo/sampling/SamplingProcessPaintModel.js';

const controllerPath = new URL('../../src/core/demo/sampling/SamplingProcessModeController.js', import.meta.url);

const context = {
  referenceSignatureId: 'stationaryTemporalBursts',
  selectedCell: { col: 2, row: 1 },
  displayMode: 'nodeStates',
  randomRuleSeed: 'mode-controller-smoke',
  randomRuleMode: 'exploratoryMixedRules',
  randomRuleGroupCount: 3,
  randomRuleActiveFraction: 0.2,
  blankPaintModel: createBlankSamplingProcessPaintModel({ width: 4, height: 3 })
};

assert.equal(typeof buildSamplingProcessModePatch, 'function', 'buildSamplingProcessModePatch should export');

const reference = buildSamplingProcessModePatch(context, 'foundationalCaModels');
assert.equal(reference.processMode, 'foundationalCaModels', 'foundational patch should set processMode');
assert.equal(reference.patternSource, 'referenceSignature', 'foundational patch should set patternSource=referenceSignature');
assert.equal(reference.rightPanelMode, 'recipeSignature', 'foundational patch should use recipe panel');
assert.equal(reference.displayMode, 'processTransitionView', 'foundational patch should use semantic transition display');
assert.equal(reference.paused, false, 'foundational patch should not inherit paused');
assert.equal(reference.processPaintRunStarted, false, 'foundational patch should clear Process Paint run state');
assert.equal(validateSamplingProcessModeState(reference).status, 'PASS', 'foundational patch should validate');
const ocean = buildSamplingProcessModePatch(context, 'oceanProcessAnalogs');
assert.equal(ocean.processMode, 'oceanProcessAnalogs', 'ocean patch should set processMode');
assert.equal(ocean.exampleTrack, 'oceanRelevantProcessAnalogs', 'ocean patch should set ocean track');
assert.equal(ocean.displayMode, 'processRuleMetric', 'ocean patch should use semantic rule-metric display');
assert.equal(validateSamplingProcessModeState(ocean).status, 'PASS', 'ocean patch should validate');

const custom = buildSamplingProcessModePatch(context, 'customComposer');
assert.equal(custom.processMode, 'customComposer', 'custom patch should set processMode');
assert.equal(custom.patternSource, 'custom', 'custom patch should set patternSource=custom');
assert.equal(custom.referenceSignatureId, 'none', 'custom patch should clear reference signature');
assert.equal(custom.updateRuleHint, null, 'custom patch should clear updateRuleHint');
assert.equal(custom.displayMode, SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE, 'custom patch should use shared default display');
assert.equal(custom.paused, false, 'custom patch should not inherit paused');
assert.equal(custom.processPaintRunStarted, false, 'custom patch should clear Process Paint run state');
assert.equal(validateSamplingProcessModeState(custom).status, 'PASS', 'custom patch should validate');

const paint = buildSamplingProcessModePatch(context, 'processPaint');
assert.equal(paint.processMode, 'processPaint', 'paint patch should set processMode');
assert.equal(paint.patternSource, 'custom', 'paint patch should set custom pattern source');
assert.equal(paint.paused, true, 'paint patch should enter paused editing state');
assert.equal(paint.rightPanelMode, 'paintTools', 'paint patch should use paint tools panel');
assert.equal(paint.displayMode, 'nodeStates', 'paint patch should use nodeStates display');
assert.equal(paint.processPaintRunStarted, false, 'paint patch should clear run state');
assert.equal(paint.paintStartMode, 'blankCanvas', 'paint patch should start blank');
assert.equal(validateSamplingProcessModeState(paint).status, 'PASS', 'paint patch should validate');

const random = buildSamplingProcessModePatch(context, 'randomRuleLab');
assert.equal(random.processMode, 'randomRuleLab', 'random patch should set processMode');
assert.equal(random.patternSource, 'custom', 'random patch should set custom pattern source');
assert.notEqual(random.rightPanelMode, 'paintTools', 'random patch should not use paint tools');
assert.equal(random.displayMode, SAMPLING_PROCESS_DEFAULT_DISPLAY_MODE, 'random patch should use shared default display');
assert.equal(random.paused, false, 'random patch should not inherit paused');
assert.equal(random.processPaintRunStarted, false, 'random patch should clear run state');
assert.equal(validateSamplingProcessModeState(random).status, 'PASS', 'random patch should validate');

const diagnostics = buildSamplingProcessModePatch(context, 'diagnosticsGraphInspection');
assert.equal(diagnostics.processMode, context.processMode ?? 'foundationalCaModels', 'diagnostics patch should preserve active visible workflow mode');
assert.equal(diagnostics.rightPanelMode, 'diagnostics', 'diagnostics patch should use diagnostics panel');
assert.equal(diagnostics.displayMode, 'diagnosticsOverlay', 'diagnostics patch should default to diagnostics overlay');
assert.equal(diagnostics.processPaintRunStarted, false, 'diagnostics patch should clear run state');
assert.equal(validateSamplingProcessModeState(diagnostics).status, 'PASS', 'diagnostics patch should validate');

assert.equal(buildPatternSourcePatch(context, 'custom').processMode, 'customComposer', 'custom pattern source should enter custom composer');
assert.equal(buildCustomComposerPatch(context).referenceSignatureId, 'none', 'custom composer helper should clear reference signature');
assert.equal(buildProcessPaintEntryPatch(context).rightPanelMode, 'paintTools', 'paint entry helper should use paint tools');
assert.notEqual(buildRandomRuleLabEntryPatch(context).rightPanelMode, 'paintTools', 'random helper should not use paint tools');
assert.equal(buildDiagnosticsEntryPatch({ ...context, preserveDisplayMode: true, displayMode: 'stateTransitions' }).displayMode, 'diagnosticsOverlay', 'diagnostics helper should request diagnostics overlay');
assert.equal(samplingProcessModeInvariants('processPaint').rightPanelMode, 'paintTools', 'mode invariants should expose paint tools for Process Paint');
assert.deepEqual(samplingProcessWorkflowModes(), SAMPLING_PROCESS_VISIBLE_MODES, 'workflow mode helper should mirror visible mode list');
assert.equal(normalizeSamplingProcessMode('diagnostics'), 'diagnosticsGraphInspection', 'diagnostics alias should remain internally accepted');
assert.equal(normalizeVisibleSamplingProcessMode('diagnosticsGraphInspection'), 'foundationalCaModels', 'visible normalizer should not expose diagnostics as a workflow');

const source = await readFile(controllerPath, 'utf8');
assert.equal(source.includes('RoiGeneratorDemoScene'), false, 'mode controller should not import or reference the scene');
assert.equal(/\bPhaser\b/.test(source), false, 'mode controller should not depend on Phaser globals');
assert.equal(/\bdocument\b|\bwindow\b/.test(source), false, 'mode controller should not depend on DOM globals');
assert.equal(/scene\.restart|rebuildField|renderConsole|renderCellInspector|downloadJSON/.test(source), false, 'mode controller should not own scene lifecycle or export side effects');

console.log('smoke_sampling_process_mode_controller: ok');
