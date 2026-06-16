import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildFlowDemoDiagnostics,
  createDemoTerrain,
  FLOW_DEMO_GRID
} from '../../src/core/demo/FlowFieldDemo.js';
import {
  advectParticle,
  sampleVectorBilinear,
  validateVectorField
} from '../../src/core/demo/flow/FlowFieldMath.js';
import { buildFlowFieldDiagnostics } from '../../src/core/demo/flow/FlowFieldDiagnostics.js';
import {
  FOUNDATIONAL_CA_MODELS,
  spatiotemporalProcessExampleById
} from '../../src/core/demo/sampling/SpatiotemporalProcessExamples.js';
import { evaluateSamplingProcessExampleBehavior } from '../../src/core/demo/sampling/SamplingProcessExampleBehaviorAssertions.js';
import { buildExampleInitialConditionLayers } from '../../src/core/demo/sampling/SamplingProcessInitialConditionEditor.js';
import { buildSamplingProcessDemoArtifactExport } from '../../src/core/demo/sampling/SamplingProcessExportBuilder.js';
import {
  coupledProcessEngineOptions,
  createCoupledProcessInitialState,
  stepCoupledProcessEngine
} from '../../src/core/demo/coupled/CoupledProcessEngineContract.js';
import { computeOracleSamplingObjective } from '../../src/core/demo/coupled/OracleCoupledObjective.js';
import { createGrid } from '../../src/core/demo/coupled/CoupledFieldMath.js';
import { createSamplingPriorityScenario } from '../../src/core/demo/samplingPriority/SamplingPriorityScenarios.js';
import { computeSamplingPriority } from '../../src/core/demo/samplingPriority/SamplingPriorityModel.js';
import { generateCandidateSamplePoints } from '../../src/core/demo/samplingPriority/SamplingPriorityCandidates.js';
import { createFlowCoupledSamplingScenario } from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';
import { computeGliderActionValue } from '../../src/core/demo/flowCoupledSampling/GliderActionValueModel.js';
import { generateGliderActionCandidates } from '../../src/core/demo/flowCoupledSampling/GliderActionCandidates.js';
import { FlowCoupledSamplingDemoScene } from '../../src/game/phaser/scenes/FlowCoupledSamplingDemoScene.js';
import { FlowFieldDemoScene } from '../../src/game/phaser/scenes/FlowFieldDemoScene.js';
import { RoiGeneratorDemoScene } from '../../src/game/phaser/scenes/RoiGeneratorDemoScene.js';
import { CoupledFieldsDemoScene } from '../../src/game/phaser/scenes/CoupledFieldsDemoScene.js';

function assertFiniteNumber(value, label) {
  assert.equal(Number.isFinite(Number(value)), true, `${label} should be finite`);
}

function assertFieldNonEmpty(field, label) {
  assert.ok(Array.isArray(field), `${label} should be a row-major array`);
  assert.ok(field.length > 0 && field[0]?.length > 0, `${label} should have dimensions`);
  assert.ok(field.flat().some((value) => Number(value) > 0 || (typeof value === 'string' && value !== 'inactive' && value !== 'empty')), `${label} should not be empty`);
}

// Process Lab imports, fixtures, behavior checks, export metadata, and debug object.
assert.ok(FOUNDATIONAL_CA_MODELS.length >= 4, 'Process Lab foundational examples import');
for (const id of ['conwayGameOfLife', 'forestFire', 'sirEpidemicCa', 'sandpileAvalanche']) {
  const example = spatiotemporalProcessExampleById(id, 'foundationalCaModels');
  assert.ok(example, `${id} example metadata exists`);
  const initial = buildExampleInitialConditionLayers(example, { fixtureId: 'default' });
  assert.notEqual(initial.validation.status, 'FAIL', `${id} fixture validates`);
  assert.ok(
    Number(initial.validation.metrics.meaningfulCellCount ?? 0) + Number(initial.validation.metrics.activeSourceCellCount ?? 0) > 0,
    `${id} fixture has meaningful cells or source support`
  );
  assertFieldNonEmpty(initial.layers.stateLayer, `${id} state layer`);
}

const processExample = spatiotemporalProcessExampleById('conwayGameOfLife', 'foundationalCaModels');
const processInitial = buildExampleInitialConditionLayers(processExample, { fixtureId: 'default' });
const processBehavior = evaluateSamplingProcessExampleBehavior(processExample, { fixtureId: 'default' });
const processField = {
  width: 24,
  height: 16,
  field: processInitial.layers.sourceField,
  eventLikelihoodField: processInitial.layers.sourceField,
  stats: {},
  initialCondition: processInitial.metadata,
  behaviorValidation: processBehavior
};
const processTiming = {
  mode: 'generation-clock',
  generationIndex: 0,
  deterministic: true,
  note: 'smoke export timing metadata'
};
const processArtifact = buildSamplingProcessDemoArtifactExport({
  demoTime: 0,
  field: processField,
  processMode: 'foundationalCaModels',
  patternSource: 'referenceSignature',
  exampleTrack: 'foundationalCaModels',
  exampleProcessId: processExample.id,
  foundationalCaModelId: processExample.id,
  referenceSignatureId: processExample.referenceSignatureId,
  initialCondition: processInitial.metadata,
  behaviorValidation: processBehavior,
  processTiming,
  exportMode: 'currentFrame',
  buildFrameAtTime: (time, index, fieldOverride = processField) => ({
    index,
    timeSeconds: time,
    fields: {
      displayedValue: fieldOverride.field,
      sampleValue: fieldOverride.field,
      sourceField: fieldOverride.eventLikelihoodField
    }
  })
});
assert.equal(processArtifact.type, 'anchor.demo.sampling-process-field', 'Process export type is stable');
assert.equal(processArtifact.processExample.exampleProcessId, 'conwayGameOfLife', 'Process export preserves processExample');
assert.equal(processArtifact.initialCondition.mode, 'curatedSeed', 'Process export preserves initialCondition');
assert.equal(processArtifact.behaviorValidation.status, 'PASS', 'Process export preserves behaviorValidation');
assert.equal(processArtifact.processTiming.mode, processTiming.mode, 'Process export preserves timing metadata');

const processScene = new RoiGeneratorDemoScene();
processScene.init({ processMode: 'foundationalCaModels', exampleProcessId: 'conwayGameOfLife' });
processScene.updateRoiUiDebug();
assert.equal(globalThis.ANCHOR_ROI_UI_DEBUG?.activeExampleProcessId, 'conwayGameOfLife', 'Process debug object tracks active example');
assert.equal(globalThis.ANCHOR_ROI_UI_DEBUG?.activeExampleBehaviorValidationStatus, 'PASS', 'Process debug object tracks behavior QA');

// Flow math, diagnostics, export metadata, and debug object.
const terrain = createDemoTerrain({ mode: 'blendedCoastal', seed: 'model-stack-smoke', grid: FLOW_DEMO_GRID });
const flowDiagnostics = buildFlowDemoDiagnostics({
  fieldMode: 'dynamic',
  primaryPreset: 'uniformDrift',
  terrain,
  directionVariation: 'medium',
  magnitudeVariation: 'medium',
  dynamicComplexity: 'medium',
  evolutionPattern: 'composite',
  evolutionBehavior: 'continuous',
  cycleDuration: 60,
  spatialMotion: 'none',
  spatialMotionSpeed: 1,
  boundaryMode: 'deflectAlongShore'
}, 8, { deterministicSeed: 'model-stack-smoke' });
assertFiniteNumber(flowDiagnostics.speedStats.mean, 'Flow speed mean');
assertFiniteNumber(flowDiagnostics.divergenceStats.mean, 'Flow divergence mean');
assertFiniteNumber(flowDiagnostics.vorticityStats.mean, 'Flow vorticity mean');
assert.equal(flowDiagnostics.invalidVectorCount, 0, 'Flow diagnostics have no invalid vectors');
assert.equal(typeof buildFlowFieldDiagnostics, 'function', 'Flow diagnostics module imports');
assert.equal(typeof sampleVectorBilinear, 'function', 'Flow bilinear sampler imports');
assert.equal(typeof advectParticle, 'function', 'Flow particle advection imports');
assert.equal(validateVectorField([[{ u: 1, v: 0 }]]).valid, true, 'Flow vector validation works');

const flowScene = new FlowFieldDemoScene();
flowScene.init({
  fieldMode: 'dynamic',
  preset: 'uniformDrift',
  terrainMode: 'blendedCoastal',
  terrainSeed: 'model-stack-smoke',
  exportMode: 'currentFrame'
});
flowScene.refreshFlowDiagnostics();
assert.equal(globalThis.ANCHOR_FLOW_DEMO_DEBUG?.preset, 'uniformDrift', 'Flow debug object tracks preset');
assert.ok(globalThis.ANCHOR_FLOW_DEMO_DEBUG?.flowFieldDiagnostics, 'Flow debug object exposes diagnostics');
const flowArtifact = flowScene.buildDemoArtifactExport();
assert.equal(flowArtifact.type, 'anchor.demo.flow-field', 'Flow export type is stable');
assert.ok(flowArtifact.flowFieldModel, 'Flow export preserves flowFieldModel');
assert.ok(flowArtifact.flowFieldDiagnostics, 'Flow export preserves flowFieldDiagnostics');
assert.ok(flowArtifact.frames?.[0]?.flowFieldDiagnostics, 'Flow export frame preserves diagnostics');
assert.ok(flowArtifact.flowFieldModel.notA, 'Flow model preserves claim boundary');

// Coupled engine imports, oracle metadata, export metadata, and debug object.
const coupledOptions = coupledProcessEngineOptions();
assert.ok(coupledOptions.length >= 4, 'Coupled engine options import');
const coupledState = createCoupledProcessInitialState({ engineId: 'advectionDiffusionDecay', width: 18, height: 12, seed: 'model-stack-smoke' });
const coupledResult = stepCoupledProcessEngine({
  engineId: 'advectionDiffusionDecay',
  state: coupledState,
  dt: 0.5,
  flowSampler: () => ({ u: 0.08, v: 0.02 })
});
assert.equal(coupledResult.validation.status, 'PASS', 'Coupled engine result validates');
assertFieldNonEmpty(coupledResult.scalarField, 'Coupled scalar field');

const processForObjective = createGrid(12, 8, (col, row) => Math.exp(-(((col - 6) ** 2 + (row - 4) ** 2) / 12)));
const oracleObjective = computeOracleSamplingObjective({
  processField: processForObjective,
  futureProcessField: processForObjective,
  constraintMask: createGrid(12, 8, 1)
});
assert.equal(oracleObjective.metadata.deterministic, true, 'Oracle objective metadata marks deterministic');
assert.equal(oracleObjective.metadata.usesBelief, false, 'Oracle objective excludes belief');
assert.equal(oracleObjective.metadata.usesUncertainty, false, 'Oracle objective excludes uncertainty');
assert.equal(oracleObjective.metadata.usesHiddenTruth, false, 'Oracle objective excludes hidden truth');

const coupledScene = new CoupledFieldsDemoScene();
coupledScene.init({ processEngineId: 'advectionDiffusionDecay', exportMode: 'currentFrame' });
assert.equal(globalThis.ANCHOR_COUPLED_DEMO_DEBUG?.engineId, 'advectionDiffusionDecay', 'Coupled debug object tracks engine');
assert.equal(globalThis.ANCHOR_COUPLED_DEMO_DEBUG?.usesUncertainty, false, 'Coupled debug object excludes uncertainty');
const coupledArtifact = coupledScene.buildDemoArtifactExport();
assert.equal(coupledArtifact.type, 'anchor.demo.coupled-fields', 'Coupled export type is stable');
assert.ok(coupledArtifact.coupledProcessEngine, 'Coupled export preserves coupledProcessEngine');
assert.ok(coupledArtifact.oracleObjective, 'Coupled export preserves oracleObjective');
assert.equal(coupledArtifact.oracleObjective.usesBelief, false, 'Coupled export oracle metadata excludes belief');
assert.ok(coupledArtifact.frames?.[0]?.fields?.coupledProcess?.processField, 'Coupled frame exports process field layer');
assert.ok(coupledArtifact.frames?.[0]?.fields?.coupledProcess?.futureProcessField, 'Coupled frame exports future process layer');
assert.ok(coupledArtifact.frames?.[0]?.fields?.coupledProcess?.flowU, 'Coupled frame exports flow U layer');
assert.ok(coupledArtifact.frames?.[0]?.fields?.coupledProcess?.constraintMask, 'Coupled frame exports constraint layer');
assert.ok(coupledArtifact.frames?.[0]?.fields?.coupledProcess?.oracleObjectiveField, 'Coupled frame exports objective layer');

// Sampling Priority imports, global-acquisition metadata, and route/flow boundary.
const samplingPriorityScenario = createSamplingPriorityScenario({ scenarioId: 'mixedMission', seed: 'model-stack-smoke' });
const samplingPriority = computeSamplingPriority({ scenario: samplingPriorityScenario, methodId: 'balancedMission' });
const samplingCandidates = generateCandidateSamplePoints({
  priorityField: samplingPriority.priorityField,
  components: samplingPriority.components,
  method: 'balancedMission',
  candidateMode: 'diverseTopK',
  candidateCount: 5,
  minDistance: 3,
  accessibleMask: samplingPriorityScenario.accessibleMask,
  recentSamples: samplingPriorityScenario.recentSamples
});
assert.equal(samplingPriority.usesFlowCoupling, false, 'Sampling Priority excludes flow coupling');
assert.equal(samplingPriority.usesRoutePlanning, false, 'Sampling Priority excludes route planning');
assert.equal(samplingPriority.usesProductionGp, false, 'Sampling Priority excludes production GP');
assert.equal(samplingPriority.usesProductionGmrf, false, 'Sampling Priority excludes production GMRF');
assert.ok(samplingPriority.components.beliefRoi, 'Sampling Priority depends conceptually on belief ROI');
assert.ok(samplingPriority.components.expectedUncertainty, 'Sampling Priority depends conceptually on uncertainty');
assert.ok(samplingCandidates.length > 0, 'Sampling Priority generates candidate sample points');
assert.notDeepEqual(samplingPriority.priorityField, samplingPriority.components.eventIntensity, 'Sampling Priority is not identical to event intensity');

// Flow-coupled sampling imports, S1 bridge semantics, export metadata, and boundary flags.
const flowCoupledScenario = createFlowCoupledSamplingScenario({ scenarioId: 'mixedFlowMission', seed: 'model-stack-smoke' });
const flowCoupledAction = computeGliderActionValue({ scenario: flowCoupledScenario, methodId: 'balancedActionValue' });
const flowCoupledCandidates = generateGliderActionCandidates({
  actionValueField: flowCoupledAction.actionValueField,
  components: flowCoupledAction.components,
  glider: flowCoupledAction.components.glider,
  candidateMode: 'reachableTopK',
  candidateCount: 5,
  minDistance: 3,
  accessibleMask: flowCoupledAction.components.accessibleMask,
  reachableMask: flowCoupledAction.components.reachableMask
});
assert.equal(flowCoupledAction.usesFlowCoupling, true, 'Flow-Coupled Sampling declares flow coupling');
assert.equal(flowCoupledAction.usesRoutePlanning, false, 'Flow-Coupled Sampling excludes route planning');
assert.equal(flowCoupledAction.usesMissionScoring, false, 'Flow-Coupled Sampling excludes mission scoring');
assert.ok(flowCoupledAction.components.globalPriority, 'Flow-Coupled Sampling consumes a global priority field');
assert.notDeepEqual(flowCoupledAction.actionValueField, flowCoupledAction.components.globalPriority, 'Q_glider differs from A_global after vehicle costs');
assert.ok(flowCoupledCandidates.length > 0, 'Flow-Coupled Sampling generates candidate direct targets');
assert.equal(samplingPriority.usesFlowCoupling, false, 'S1 remains vehicle-independent after S2 import');
const flowCoupledScene = new FlowCoupledSamplingDemoScene();
flowCoupledScene.init({ scenarioId: 'currentOpposedTarget', methodId: 'balancedActionValue', exportMode: 'currentFrame' });
assert.equal(globalThis.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.usesFlowCoupling, true, 'Flow-Coupled debug object marks flow coupling');
assert.equal(globalThis.ANCHOR_FLOW_COUPLED_SAMPLING_DEMO_DEBUG?.usesRoutePlanning, false, 'Flow-Coupled debug object excludes route planning');
const flowCoupledArtifact = flowCoupledScene.buildDemoArtifactExport();
assert.equal(flowCoupledArtifact.type, 'anchor.demo.flow-coupled-sampling', 'Flow-Coupled export type is stable');
assert.ok(flowCoupledArtifact.flowCoupledSamplingModel, 'Flow-Coupled export preserves model metadata');
assert.ok(flowCoupledArtifact.gliderActionContext, 'Flow-Coupled export preserves glider action context');
assert.ok(flowCoupledArtifact.candidateTargets?.length > 0, 'Flow-Coupled export preserves candidate targets');
assert.equal(flowCoupledArtifact.actionValueDiagnostics.usesRoutePlanning, false, 'Flow-Coupled diagnostics exclude route planning');
// Claim-boundary guard: calibrated forecast claims must be explicitly negated/bounded.
const claimFiles = [
  'README.md',
  'HOWPLAY.md',
  'docs/sample_fields_demo.md',
  'docs/flow_fields_demo.md',
  'docs/coupled_fields_demo.md',
  'docs/export_formats.md',
  'docs/testing.md',
  'docs/development_versions.md',
  'src/core/demo/FlowFieldDemo.js',
  'src/core/demo/flow/FlowFieldDiagnostics.js',
  'src/core/demo/coupled/AnalyticScalarProcessEngines.js',
  'src/core/demo/coupled/OracleCoupledObjective.js',
  'src/core/demo/sampling/SpatiotemporalProcessExamples.js',
  'src/game/phaser/scenes/CoupledFieldsDemoScene.js',
  'src/game/phaser/scenes/FlowFieldDemoScene.js'
];
const riskyClaimPattern = /((calibrated|validated|operational|HYCOM-quality|HYCOM|ROMS|Delft3D)[^\n.]{0,80}\b(forecast|model|data|output)\b)|(\b(forecast|model|data|output)\b[^\n.]{0,80}(calibrated|validated|operational|HYCOM-quality|HYCOM|ROMS|Delft3D))|real HYCOM data|actual HYCOM data/i;
const boundaryPattern = /\bnot\b|\bno\b|notA|not-a|boundar|synthetic|inspired|teaching|scaffold|optional|claim level/i;
const claimViolations = [];
for (const file of claimFiles) {
  const text = fs.readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, index) => {
    if (riskyClaimPattern.test(line) && !boundaryPattern.test(line)) {
      claimViolations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}
assert.deepEqual(claimViolations, [], `Unbounded calibrated-forecast claims found:\n${claimViolations.join('\n')}`);

// Right-panel language guard for the integration audit.
const processPanelSource = fs.readFileSync('src/ui/sampling/SamplingProcessRightPanel.js', 'utf8');
assert.ok(processPanelSource.includes('What colors mean'), 'Process right panel explains colors');
assert.ok(processPanelSource.includes('what this is not'), 'Process right panel explains claim boundary');
const flowSceneSource = fs.readFileSync('src/game/phaser/scenes/FlowFieldDemoScene.js', 'utf8');
assert.ok(flowSceneSource.includes('Current Vector'), 'Flow right panel identifies active vector model');
assert.ok(flowSceneSource.includes('Topology / Boundary'), 'Flow right panel explains terrain/boundary meaning');
const coupledSceneSource = fs.readFileSync('src/game/phaser/scenes/CoupledFieldsDemoScene.js', 'utf8');
assert.ok(coupledSceneSource.includes('What Colors Mean'), 'Coupled right panel explains colors');
assert.ok(coupledSceneSource.includes('uses uncertainty'), 'Coupled right panel states uncertainty boundary');

console.log('Model stack integration smoke passed');