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
import {
  UNCERTAINTY_SCENARIO_IDS,
  createUncertaintyForecastField
} from '../../src/core/demo/UncertaintyForecastDemo.js';
import { applyObservationSet } from '../../src/core/demo/uncertainty/ObservationModel.js';
import { createSamplingPriorityScenario } from '../../src/core/demo/samplingPriority/SamplingPriorityScenarios.js';
import { computeSamplingPriority } from '../../src/core/demo/samplingPriority/SamplingPriorityModel.js';
import { generateCandidateSamplePoints } from '../../src/core/demo/samplingPriority/SamplingPriorityCandidates.js';
import { createFlowCoupledSamplingScenario } from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingScenarios.js';
import { computeGliderActionValue } from '../../src/core/demo/flowCoupledSampling/GliderActionValueModel.js';
import { generateGliderActionCandidates } from '../../src/core/demo/flowCoupledSampling/GliderActionCandidates.js';
import { UncertaintyForecastDemoScene } from '../../src/game/phaser/scenes/UncertaintyForecastDemoScene.js';
import { SamplingPriorityDemoScene } from '../../src/game/phaser/scenes/SamplingPriorityDemoScene.js';
import { FlowCoupledSamplingDemoScene } from '../../src/game/phaser/scenes/FlowCoupledSamplingDemoScene.js';
import { BenchmarkModeOverviewScene } from '../../src/game/phaser/scenes/BenchmarkModeOverviewScene.js';
import { BENCHMARK_MODE_IDS, createBenchmarkModeConfig, validateBenchmarkModeConfig } from '../../src/core/benchmark/BenchmarkModeContract.js';
import { createBenchmarkEpisodeConfig, validateBenchmarkEpisodeConfig } from '../../src/core/benchmark/BenchmarkEpisodeContract.js';
import { createRouteExecutionRecord, validateRouteExecutionRecord } from '../../src/core/benchmark/BenchmarkRouteExecutionRecord.js';
import { buildBenchmarkRunRecordFromResult } from '../../src/core/benchmark/BenchmarkResultAdapter.js';
import { attachBenchmarkMetadataToLevel, validateBenchmarkMetadata } from '../../src/core/benchmark/BenchmarkMetadata.js';
import { createBenchmarkModeState } from '../../src/core/benchmark/BenchmarkModeState.js';
import { initializePlannerBenchmarkEpisode } from '../../src/core/benchmark/BenchmarkEpisodeRuntime.js';
import { addResultToBenchmarkAttemptSession, createBenchmarkAttemptSession } from '../../src/core/benchmark/BenchmarkAttemptSession.js';
import { buildBenchmarkComparisonViewModel } from '../../src/core/benchmark/BenchmarkComparisonViewModel.js';
import { buildBenchmarkRouteReviewViewModel } from '../../src/core/benchmark/BenchmarkRouteReviewViewModel.js';
import { extractRouteGeometryFromPlan } from '../../src/core/benchmark/BenchmarkRouteGeometryAdapter.js';
import { buildBenchmarkRouteOverlayViewModel } from '../../src/core/benchmark/BenchmarkRouteOverlayViewModel.js';
import { benchmarkDebriefPanelHtml } from '../../src/ui/benchmark/BenchmarkDebriefPanel.js';
import { benchmarkRouteOverlayPanelHtml } from '../../src/ui/benchmark/BenchmarkRouteOverlayPanel.js';
import { buildBenchmarkAttemptSessionExport, buildBenchmarkComparisonExportFromResult, buildBenchmarkRouteOverlayExportFromResult, buildBenchmarkRunRecordExportFromResult } from '../../src/core/io/ResultExporter.js';
import { parseBenchmarkArtifact } from '../../src/core/benchmark/BenchmarkArtifactImport.js';
import { buildBenchmarkImportViewModel } from '../../src/core/benchmark/BenchmarkImportViewModel.js';
import { benchmarkImportPanelHtml } from '../../src/ui/benchmark/BenchmarkImportPanel.js';
import { buildAdaptiveEpisodeSessionExport, buildAdaptiveLaunchConfigExport, buildAdaptiveLegRecordExport, buildAdaptiveManagerPreviewExport, buildAdaptiveNextLegConfigExport, buildAdaptiveObjectiveHistoryExport, buildAdaptiveSessionSummaryExport, buildAdaptiveSurfacingDecisionExport, buildBenchmarkModeConfigExport } from '../../src/core/benchmark/BenchmarkModeExporter.js';
import { ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION, createAdaptiveMissionManagerConfig, validateAdaptiveMissionManagerConfig } from '../../src/core/benchmark/AdaptiveMissionManagerContract.js';
import { computeAdaptiveDiagnosis } from '../../src/core/benchmark/AdaptiveDiagnosisModel.js';
import { selectNextAdaptiveObjective } from '../../src/core/benchmark/AdaptiveObjectivePolicy.js';
import { createAdaptiveMissionManagerState, validateAdaptiveMissionManagerState } from '../../src/core/benchmark/AdaptiveMissionManagerState.js';
import { createAdaptiveSurfacingEvent, validateAdaptiveSurfacingEvent } from '../../src/core/benchmark/AdaptiveSurfacingEvent.js';
import { runAdaptiveManagerFixture } from '../../src/core/benchmark/AdaptiveMissionManagerFixtures.js';
import { adaptiveBenchmarkViewModelSummary, buildAdaptiveBenchmarkViewModel } from '../../src/core/benchmark/AdaptiveBenchmarkViewModel.js';
import { adaptiveBenchmarkPanelHtml } from '../../src/ui/benchmark/AdaptiveBenchmarkPanel.js';
import { initializeAdaptiveBenchmarkEpisode } from '../../src/core/benchmark/AdaptiveBenchmarkRuntime.js';
import { buildAdaptiveEvidenceFromResult } from '../../src/core/benchmark/AdaptiveEvidenceAdapter.js';
import { runAdaptiveSurfacingDecision } from '../../src/core/benchmark/AdaptiveSurfacingLoop.js';
import { createAdaptiveNextLegConfig } from '../../src/core/benchmark/AdaptiveNextLegHandoff.js';
import { appendAdaptiveSurfacingDecision, createAdaptiveEpisodeTrace } from '../../src/core/benchmark/AdaptiveEpisodeTrace.js';
import { adaptiveSurfacingPanelHtml } from '../../src/ui/benchmark/AdaptiveSurfacingPanel.js';
import { createAdaptiveLegRecord } from '../../src/core/benchmark/AdaptiveLegRecord.js';
import { addAdaptiveLegToSession, addAdaptiveNextLegHandoffToSession, createAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodeSession.js';
import { saveAdaptiveEpisodeSession, loadAdaptiveEpisodeSession } from '../../src/core/benchmark/AdaptiveEpisodePersistence.js';
import { buildAdaptiveObjectiveHistoryViewModel } from '../../src/core/benchmark/AdaptiveObjectiveHistoryViewModel.js';
import { adaptiveEpisodeSessionPanelHtml } from '../../src/ui/benchmark/AdaptiveEpisodeSessionPanel.js';
import { classifyAdaptiveEpisodeArtifact, mergeAdaptiveEpisodeArtifacts } from '../../src/core/benchmark/AdaptiveEpisodeImport.js';
import '../../src/labs/widgets/SamplingActionValueWidgets.js';
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

// Uncertainty imports, belief-state metadata, export metadata, and debug object.
assert.ok(UNCERTAINTY_SCENARIO_IDS.includes('hiddenPlume'), 'Uncertainty scenario registry imports');
const uncertaintyBase = createUncertaintyForecastField({ scenarioId: 'hiddenPlume', seed: 'model-stack-smoke' });
const uncertaintyObservations = applyObservationSet({
  truthField: uncertaintyBase.hiddenTruthField,
  forecastField: uncertaintyBase.forecastField,
  uncertaintyField: uncertaintyBase.expectedUncertaintyField,
  scenarioId: 'hiddenPlume',
  pattern: 'clusterFollowup',
  count: 6,
  seed: 'model-stack-smoke',
  sensorNoise: 0.03
});
const uncertaintyField = createUncertaintyForecastField({ scenarioId: 'hiddenPlume', viewMode: 'samplingPriorityPreview', observations: uncertaintyObservations });
assert.equal(uncertaintyField.fieldsFinite, true, 'Uncertainty field generation is finite');
assert.ok(uncertaintyField.diagnostics, 'Uncertainty diagnostics are present');
const uncertaintyScene = new UncertaintyForecastDemoScene();
uncertaintyScene.init({ scenarioId: 'hiddenPlume', viewMode: 'samplingPriorityPreview', observations: uncertaintyObservations, sensorNoise: 0.03 });
const uncertaintyArtifact = uncertaintyScene.buildDemoArtifactExport();
assert.equal(uncertaintyArtifact.type, 'anchor.demo.uncertainty-forecast', 'Uncertainty export type is stable');
assert.ok(uncertaintyArtifact.uncertaintyModel, 'Uncertainty export preserves uncertaintyModel');
assert.ok(uncertaintyArtifact.observationModel, 'Uncertainty export preserves observationModel');
assert.ok(uncertaintyArtifact.beliefState, 'Uncertainty export preserves beliefState');
assert.ok(uncertaintyArtifact.diagnostics, 'Uncertainty export preserves diagnostics');
assert.equal(globalThis.ANCHOR_UNCERTAINTY_DEMO_DEBUG?.usesPlanner, false, 'Uncertainty debug object excludes planner use');

// Sampling Priority imports, global-acquisition metadata, and route/flow boundary.
assert.equal(typeof SamplingPriorityDemoScene, 'function', 'Sampling Priority scene module imports');
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
assert.equal(typeof FlowCoupledSamplingDemoScene, 'function', 'Flow-Coupled Sampling scene module imports');
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
// Benchmark mode architecture skeleton: P0 contracts and boundaries.
assert.equal(typeof BenchmarkModeOverviewScene, 'function', 'Benchmark Mode overview scene module imports');
assert.deepEqual(BENCHMARK_MODE_IDS, ['plannerBenchmark', 'adaptiveBenchmark', 'fullAutonomyBenchmark'], 'P0 benchmark modes exist');
for (const benchmarkMode of BENCHMARK_MODE_IDS) {
  const benchmarkConfig = createBenchmarkModeConfig({ benchmarkMode });
  const benchmarkState = createBenchmarkModeState(benchmarkConfig);
  const benchmarkExport = buildBenchmarkModeConfigExport(benchmarkConfig);
  assert.equal(validateBenchmarkModeConfig(benchmarkConfig).status, 'PASS', `${benchmarkMode} config validates`);
  assert.equal(benchmarkState.debugFlags.usesMARL, false, `${benchmarkMode} does not implement MARL`);
  assert.equal(benchmarkState.debugFlags.usesMissionScoring, false, `${benchmarkMode} does not implement mission scoring`);
  assert.equal(benchmarkState.debugFlags.usesRoutePlanning, false, `${benchmarkMode} does not implement full route planning`);
  assert.ok(benchmarkState.implementedSystems.includes('samplingPriorityDemo'), `${benchmarkMode} references S1 prerequisite system`);
  assert.ok(benchmarkState.implementedSystems.includes('flowCoupledSamplingDemo'), `${benchmarkMode} references S2 prerequisite system`);
  assert.equal(benchmarkExport.type, 'anchor.benchmark.mode-config', `${benchmarkMode} export type`);
}

// P6 Adaptive Benchmark mission-manager contract, preview UI, exports, and boundaries.
const adaptiveConfig = createAdaptiveMissionManagerConfig({ policyId: 'transparentRuleManager' });
assert.equal(validateAdaptiveMissionManagerConfig(adaptiveConfig).status, 'PASS', 'P6 adaptive manager config validates');
assert.equal(adaptiveConfig.objectiveAuthority, 'missionManager', 'P6 adaptive manager owns objective authority');
assert.equal(adaptiveConfig.routeAuthority, 'playerOrSolver', 'P6 adaptive route authority remains player/solver');
const adaptiveState = createAdaptiveMissionManagerState({ episodeId: 'model-stack-p6-episode', policyId: adaptiveConfig.policyId });
assert.equal(validateAdaptiveMissionManagerState(adaptiveState).status, 'PASS', 'P6 adaptive manager state validates');
const adaptiveFixture = runAdaptiveManagerFixture('shiftedFrontForecastError', { episodeId: adaptiveState.episodeId });
assert.equal(adaptiveFixture.diagnosis.primaryDiagnosis, 'likelyForecastError', 'P6 adaptive fixture diagnoses forecast error');
assert.equal(adaptiveFixture.transition.toObjectiveId, 'validateForecast', 'P6 adaptive fixture recommends Validate Forecast');
const adaptiveDiagnosis = computeAdaptiveDiagnosis(adaptiveFixture.evidence, adaptiveConfig);
const adaptiveSelection = selectNextAdaptiveObjective({ diagnosis: adaptiveDiagnosis, currentObjective: adaptiveFixture.initialState.currentObjectiveId, managerConfig: adaptiveConfig, missionContext: { episodeId: adaptiveState.episodeId } });
assert.equal(adaptiveSelection.usesRoutePlanning, false, 'P6 adaptive selection does not plan routes');
assert.equal(adaptiveSelection.usesMissionScoring, false, 'P6 adaptive selection does not score missions');
assert.equal(adaptiveSelection.usesMARL, false, 'P6 adaptive selection excludes MARL');
const adaptiveSurfacing = createAdaptiveSurfacingEvent({ episodeId: adaptiveState.episodeId, samplesUploaded: 4, diagnosisTriggered: true });
assert.equal(validateAdaptiveSurfacingEvent(adaptiveSurfacing).status, 'PASS', 'P6 adaptive surfacing event validates');
const adaptiveViewModel = buildAdaptiveBenchmarkViewModel({
  managerConfig: adaptiveFixture.managerConfig,
  managerState: adaptiveFixture.managerState,
  evidence: adaptiveFixture.evidence,
  diagnosis: adaptiveFixture.diagnosis,
  transition: adaptiveFixture.transition,
  fixture: adaptiveFixture
});
const adaptiveViewSummary = adaptiveBenchmarkViewModelSummary(adaptiveViewModel);
assert.equal(adaptiveViewSummary.usesRoutePlanning, false, 'P6 adaptive view model excludes route planning');
assert.equal(adaptiveViewSummary.usesMissionScoring, false, 'P6 adaptive view model excludes mission scoring');
assert.equal(adaptiveViewSummary.usesMARL, false, 'P6 adaptive view model excludes MARL');
assert.ok(adaptiveBenchmarkPanelHtml(adaptiveViewModel).includes('Mission Manager'), 'P6 adaptive panel renders mission manager');
const adaptivePreviewExport = buildAdaptiveManagerPreviewExport(adaptiveFixture);
assert.equal(adaptivePreviewExport.type, 'anchor.benchmark.adaptive-manager-preview', 'P6 adaptive preview export type');
assert.equal(adaptivePreviewExport.objectiveAuthority, 'missionManager', 'P6 adaptive preview objective authority');
assert.equal(adaptivePreviewExport.routeAuthority, 'playerOrSolver', 'P6 adaptive preview route authority');
assert.equal(adaptivePreviewExport.usesRoutePlanning, false, 'P6 adaptive preview export excludes route planning');
assert.equal(adaptivePreviewExport.usesMissionScoring, false, 'P6 adaptive preview export excludes mission scoring');
assert.equal(adaptivePreviewExport.usesMARL, false, 'P6 adaptive preview export excludes MARL');
assert.equal(typeof ADAPTIVE_MISSION_MANAGER_CONTRACT_VERSION, 'string', 'P6 adaptive contract version exports');
const adaptiveRuntime = initializeAdaptiveBenchmarkEpisode({ episodeId: 'model-stack-p7-episode', adaptiveManagerConfig: adaptiveFixture.managerConfig, adaptiveManagerState: adaptiveFixture.initialState });
assert.equal(adaptiveRuntime.objectiveAuthority, 'missionManager', 'P7 adaptive runtime keeps mission-manager objective authority');
assert.equal(adaptiveRuntime.routeAuthority, 'playerOrSolver', 'P7 adaptive runtime keeps player/solver route authority');
const p7Evidence = buildAdaptiveEvidenceFromResult({
  result: {
    benchmarkMetadata: { benchmarkMode: 'adaptiveBenchmark', episodeId: adaptiveRuntime.episodeId, benchmarkModeConfigVersion: 'benchmark-mode-contract-p0', informationAccessTier: 'beliefOnly', objectiveAuthority: 'missionManager', routeAuthority: 'playerOrSolver', worldModelTier: 'stochasticBelief' },
    summary: { observationCount: 5, recentObservationCount: 3, forecastErrorScore: 0.7 },
    adaptiveEvidence: { hiddenEventConfidence: 0.64 }
  },
  previousManagerState: adaptiveRuntime.adaptiveManagerState
});
const p7Decision = runAdaptiveSurfacingDecision({ runtimeContext: adaptiveRuntime, evidence: p7Evidence, managerConfig: adaptiveRuntime.adaptiveManagerConfig, managerState: adaptiveRuntime.adaptiveManagerState });
assert.equal(p7Decision.routeAuthority, 'playerOrSolver', 'P7 surfacing decision keeps player/solver route authority');
assert.equal(p7Decision.notA.includes('not route planning'), true, 'P7 surfacing decision excludes route planning');
assert.equal(p7Decision.notA.includes('not MARL/RL'), true, 'P7 surfacing decision excludes MARL/RL');
const p7Handoff = createAdaptiveNextLegConfig({ runtimeContext: adaptiveRuntime, surfacingDecision: p7Decision });
assert.equal(p7Handoff.routeAuthority, 'playerOrSolver', 'P7 next-leg handoff keeps route authority');
assert.equal(p7Handoff.waypoints, undefined, 'P7 next-leg handoff does not generate waypoints');
const p7Trace = appendAdaptiveSurfacingDecision(createAdaptiveEpisodeTrace({ runtimeContext: adaptiveRuntime }), p7Decision);
assert.equal(p7Trace.surfacingDecisions.length, 1, 'P7 trace records surfacing decision');
assert.ok(adaptiveSurfacingPanelHtml({ decision: p7Decision, nextLegHandoff: p7Handoff }).includes('Adaptive Benchmark Surfacing Review'), 'P7 adaptive surfacing panel renders');
assert.equal(buildAdaptiveSurfacingDecisionExport(p7Decision).usesNewPlanner, false, 'P7 surfacing export excludes new planner');
assert.equal(buildAdaptiveNextLegConfigExport(p7Handoff).usesMissionScoringRedesign, false, 'P7 handoff export excludes scoring redesign');
assert.equal(buildAdaptiveLaunchConfigExport({ runtimeContext: adaptiveRuntime }).usesMARL, false, 'P7 launch export excludes MARL');
const p8Leg = createAdaptiveLegRecord({ runtimeContext: adaptiveRuntime, legIndex: 0, objectiveId: adaptiveRuntime.activeObjective.id, metrics: { finalScore: 3 } });
let p8Session = addAdaptiveLegToSession(createAdaptiveEpisodeSession({ runtimeContext: adaptiveRuntime }), p8Leg);
p8Session = addAdaptiveNextLegHandoffToSession(p8Session, p7Handoff);
const p8HistoryVm = buildAdaptiveObjectiveHistoryViewModel({ session: p8Session });
assert.equal(p8Session.benchmarkMode, 'adaptiveBenchmark', 'P8 adaptive multi-leg session exists');
assert.equal(buildAdaptiveEpisodeSessionExport(p8Session).usesNewPlanner, false, 'P8 session export excludes new planner');
assert.equal(buildAdaptiveObjectiveHistoryExport(p8HistoryVm).usesMissionScoringRedesign, false, 'P8 objective-history export excludes scoring redesign');
assert.equal(buildAdaptiveLegRecordExport(p8Leg).usesMARL, false, 'P8 leg export excludes MARL');
assert.equal(buildAdaptiveSessionSummaryExport(p8Session).type, 'anchor.benchmark.adaptive-session-summary', 'P8 session summary export exists');
assert.ok(adaptiveEpisodeSessionPanelHtml(p8HistoryVm).includes('Adaptive Episode Session'), 'P8 adaptive session panel renders');
assert.equal(classifyAdaptiveEpisodeArtifact(buildAdaptiveEpisodeSessionExport(p8Session)).supported, true, 'P8 adaptive session import classification works');
assert.equal(mergeAdaptiveEpisodeArtifacts({ session: p8Session, artifacts: [buildAdaptiveEpisodeSessionExport(p8Session)] }).session.benchmarkMode, 'adaptiveBenchmark', 'P8 adaptive session merge works');
const p8FakeStorage = (() => { const data = new Map(); return { get length() { return data.size; }, key(index) { return [...data.keys()][index] ?? null; }, getItem(key) { return data.has(key) ? data.get(key) : null; }, setItem(key, value) { data.set(key, String(value)); }, removeItem(key) { data.delete(key); } }; })();
assert.equal(saveAdaptiveEpisodeSession(p8Session, p8FakeStorage).ok, true, 'P8 adaptive session persistence saves');
assert.equal(loadAdaptiveEpisodeSession(p8Session.episodeId, p8FakeStorage).ok, true, 'P8 adaptive session persistence loads');
// P1 benchmark route-execution contracts and adapter boundaries.
const p1Episode = createBenchmarkEpisodeConfig({ benchmarkMode: 'plannerBenchmark' });
assert.equal(validateBenchmarkEpisodeConfig(p1Episode).status, 'PASS', 'P1 benchmark episode config validates');
const p1RouteRecord = createRouteExecutionRecord({
  benchmarkMode: 'plannerBenchmark',
  episodeId: 'model-stack-smoke-episode',
  attemptSource: 'manualPlayer',
  fairnessLabel: 'Forecast-only',
  validation: { ok: true },
  metrics: { finalScore: 10, energyUsed: 2 }
});
assert.equal(validateRouteExecutionRecord(p1RouteRecord).status, 'PASS', 'P1 route execution record validates');
const p1RunRecord = buildBenchmarkRunRecordFromResult({
  benchmarkModeConfig: { benchmarkMode: 'plannerBenchmark' },
  episodeConfig: p1Episode,
  level: { levelId: 'model-stack-level', meta: { seed: 'model-stack' } },
  mission: { missionId: 'model-stack-mission', agents: [{ id: 'g1' }] },
  plan: { type: 'anchor.plan', agentPlans: [{ agentId: 'g1', waypoints: [{ x: 1, y: 1, t: 1 }] }] },
  result: { summary: { finalScore: 10, sampleScore: 4, energyUsed: 2 } },
  attemptSource: 'manualPlayer'
});
assert.equal(p1RunRecord.type, 'anchor.benchmark.run', 'P1 adapter returns benchmark run record');
const p1LevelWithMetadata = attachBenchmarkMetadataToLevel({ levelId: 'model-stack-level' }, { benchmarkMode: 'plannerBenchmark', episodeId: 'model-stack-smoke-episode' });
assert.equal(validateBenchmarkMetadata(p1LevelWithMetadata.meta.benchmarkMetadata).status, 'PASS', 'P1 metadata validates');
assert.equal(p1RunRecord.diagnostics.doesNotSimulateRoutes, true, 'P1 adapter does not simulate routes');
assert.equal(p1RunRecord.diagnostics.doesNotComputeOfficialScores, true, 'P1 adapter does not compute official scores');

// P2 benchmark execution integration: runtime context, attempt session, debrief export wrappers, and boundaries.
const p2RuntimeContext = initializePlannerBenchmarkEpisode({
  episodeId: 'model-stack-p2-episode',
  levelId: 'model-stack-level',
  missionId: 'model-stack-mission',
  informationAccessTier: 'forecastOnly',
  activeAttemptSource: 'manualPlayer'
});
assert.equal(p2RuntimeContext.benchmarkMode, 'plannerBenchmark', 'P2 benchmark runtime context validates');
assert.equal(p2RuntimeContext.objectiveAuthority, 'fixed', 'P2 keeps objective fixed');
assert.equal(p2RuntimeContext.routeAuthority, 'playerOrSolver', 'P2 keeps player/solver route authority');
let p2AttemptSession = createBenchmarkAttemptSession({ episodeId: p2RuntimeContext.episodeId, benchmarkMode: 'plannerBenchmark' });
p2AttemptSession = addResultToBenchmarkAttemptSession(p2AttemptSession, {
  episodeId: p2RuntimeContext.episodeId,
  attemptSource: 'manualPlayer',
  routeSourceLabel: 'Manual Player Plan',
  fairnessLabel: 'Forecast-only',
  result: { resultId: 'model-stack-p2-result' },
  metrics: { finalScore: 10, sampleScore: 4, energyUsed: 2 }
});
assert.equal(p2AttemptSession.attempts.length, 1, 'P2 attempt session records an attempt');
const p2RunExport = buildBenchmarkRunRecordExportFromResult({
  level: { levelId: 'model-stack-level', meta: { benchmarkMetadata: { benchmarkMode: 'plannerBenchmark', episodeId: p2RuntimeContext.episodeId, informationAccessTier: 'forecastOnly', objectiveAuthority: 'fixed', routeAuthority: 'playerOrSolver', fairnessLabel: 'Forecast-only', worldModelTier: 'flowCoupledAction' } } },
  mission: { missionId: 'model-stack-mission', agents: [{ id: 'g1' }] },
  plan: { type: 'anchor.plan', agentPlans: [{ agentId: 'g1', waypoints: [{ x: 1, y: 1, t: 1 }] }] },
  result: { resultId: 'model-stack-p2-result', source: 'manual', summary: { finalScore: 10, sampleScore: 4, energyUsed: 2 } }
});
assert.equal(p2RunExport.type, 'anchor.benchmark.run-record', 'P2 run-record export wrapper type');
assert.equal(p2RunExport.boundaryFlags.usesExistingSimulation, true, 'P2 uses existing simulation');
assert.equal(p2RunExport.boundaryFlags.usesExistingDebrief, true, 'P2 uses existing debrief');
assert.equal(p2RunExport.boundaryFlags.usesNewPlanner, false, 'P2 does not add a new planner');
assert.equal(p2RunExport.boundaryFlags.usesMissionScoringRedesign, false, 'P2 does not redesign scoring');
const p2BenchmarkExecutionSource = [
  'src/core/benchmark/BenchmarkEpisodeRuntime.js',
  'src/core/benchmark/BenchmarkAttemptSession.js',
  'src/core/io/ResultExporter.js',
  'src/game/phaser/scenes/DebriefScene.js'
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.ok(p2BenchmarkExecutionSource.includes('ANCHOR_BENCHMARK_EXECUTION_DEBUG'), 'P2 source exposes benchmark execution debug marker');
assert.ok(p2BenchmarkExecutionSource.includes('usesExistingSimulation: true'), 'P2 source marks existing simulation');
assert.ok(p2BenchmarkExecutionSource.includes('usesExistingDebrief: true'), 'P2 source marks existing debrief');
assert.ok(p2BenchmarkExecutionSource.includes('usesNewPlanner: false'), 'P2 source excludes new planner');
assert.ok(p2BenchmarkExecutionSource.includes('usesMARL: false'), 'P2 source excludes MARL');

// P3 benchmark comparison UI: pure view models, debrief panel HTML, comparison export, and boundaries.
const p3ComparisonViewModel = buildBenchmarkComparisonViewModel({ attemptSet: p2AttemptSession });
assert.equal(p3ComparisonViewModel.attemptCount, 1, 'P3 comparison view model sees P2 attempt session');
assert.equal(p3ComparisonViewModel.bestAttemptByScore?.attemptSource, 'manualPlayer', 'P3 comparison ranks manual attempt');
const p3RouteReviewViewModel = buildBenchmarkRouteReviewViewModel({
  routeExecutionRecord: p1RouteRecord,
  plan: { type: 'anchor.plan', agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ x: 1, y: 1, t: 1, segmentEnergy: 2 }] }] },
  result: { summary: { finalScore: 10, sampleScore: 4, energyUsed: 2 } }
});
assert.equal(p3RouteReviewViewModel.segmentCards.length, 1, 'P3 route review creates segment cards');
const p3PanelHtml = benchmarkDebriefPanelHtml({ ...p3ComparisonViewModel, routeReview: p3RouteReviewViewModel, exportState: { comparison: true } });
assert.ok(p3PanelHtml.includes('Planner Benchmark'), 'P3 debrief panel renders Planner Benchmark');
assert.ok(p3PanelHtml.includes('Attempt Comparison'), 'P3 debrief panel renders attempt comparison');
assert.ok(p3PanelHtml.includes('Route Review'), 'P3 debrief panel renders route review');
const p3ComparisonExport = buildBenchmarkComparisonExportFromResult({
  level: { levelId: 'model-stack-level', meta: { benchmarkMetadata: { benchmarkMode: 'plannerBenchmark', episodeId: p2RuntimeContext.episodeId, informationAccessTier: 'forecastOnly', objectiveAuthority: 'fixed', routeAuthority: 'playerOrSolver', fairnessLabel: 'Forecast-only', worldModelTier: 'flowCoupledAction' } } },
  mission: { missionId: 'model-stack-mission', agents: [{ id: 'g1' }] },
  plan: { type: 'anchor.plan', agentPlans: [{ agentId: 'g1', waypoints: [{ x: 1, y: 1, t: 1 }] }] },
  result: { resultId: 'model-stack-p3-result', source: 'manual', summary: { finalScore: 10, sampleScore: 4, energyUsed: 2 } },
  attemptSession: p2AttemptSession
});
assert.equal(p3ComparisonExport.type, 'anchor.benchmark.comparison', 'P3 comparison export type');
assert.equal(p3ComparisonExport.usesNewPlanner, false, 'P3 does not add a new planner');
assert.equal(p3ComparisonExport.usesMissionScoringRedesign, false, 'P3 does not redesign scoring');
assert.equal(p3ComparisonExport.usesMARL, false, 'P3 does not add MARL');
const p4RouteGeometry = extractRouteGeometryFromPlan({
  type: 'anchor.plan',
  planId: 'model-stack-p4-plan',
  agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ x: 1, y: 1, t: 1, segmentEnergy: 2 }, { x: 3, y: 2, t: 2, crossCurrent: 0.8, hazardPenalty: 1 }] }]
});
const p4OverlayViewModel = buildBenchmarkRouteOverlayViewModel({
  routeGeometry: p4RouteGeometry,
  routeReviewViewModel: p3RouteReviewViewModel,
  comparisonViewModel: p3ComparisonViewModel,
  selectedOverlayLayer: 'hazards'
});
assert.equal(p4OverlayViewModel.selectedOverlayLayer, 'hazards', 'P4 route overlay layer is selectable');
assert.equal(p4OverlayViewModel.usesNewPlanner, false, 'P4 route overlay does not add a new planner');
assert.equal(p4OverlayViewModel.usesMissionScoringRedesign, false, 'P4 route overlay does not redesign scoring');
assert.equal(p4OverlayViewModel.usesMARL, false, 'P4 route overlay excludes MARL');
const p4OverlayHtml = benchmarkRouteOverlayPanelHtml(p4OverlayViewModel);
assert.ok(p4OverlayHtml.includes('Route Overlay'), 'P4 route overlay panel renders');
assert.ok(p4OverlayHtml.includes('does not compute a new path'), 'P4 panel states no-new-path boundary');
const p4DebriefHtml = benchmarkDebriefPanelHtml({ ...p3ComparisonViewModel, routeReview: p3RouteReviewViewModel, routeOverlay: p4OverlayViewModel, exportState: { comparison: true, routeOverlay: true } });
assert.ok(p4DebriefHtml.includes('Export Route Overlay'), 'P4 debrief panel includes route overlay export');
const p4OverlayExport = buildBenchmarkRouteOverlayExportFromResult({
  level: { levelId: 'model-stack-level', meta: { benchmarkMetadata: { benchmarkMode: 'plannerBenchmark', episodeId: p2RuntimeContext.episodeId, informationAccessTier: 'forecastOnly', objectiveAuthority: 'fixed', routeAuthority: 'playerOrSolver', fairnessLabel: 'Forecast-only', worldModelTier: 'flowCoupledAction' } } },
  mission: { missionId: 'model-stack-mission', agents: [{ id: 'g1' }] },
  plan: { type: 'anchor.plan', agentPlans: [{ agentId: 'g1', selectedStart: { x: 0, y: 0 }, waypoints: [{ x: 1, y: 1, t: 1, segmentEnergy: 2 }] }] },
  result: { resultId: 'model-stack-p4-result', source: 'manual', summary: { finalScore: 10, sampleScore: 4, energyUsed: 2 } },
  selectedOverlayLayer: 'energyCost'
});
assert.equal(p4OverlayExport.type, 'anchor.benchmark.route-overlay', 'P4 route overlay export type');
assert.equal(p4OverlayExport.selectedOverlayLayer, 'energyCost', 'P4 route overlay export preserves selected layer');
assert.equal(p4OverlayExport.usesNewPlanner, false, 'P4 export excludes new planner');
assert.equal(p4OverlayExport.usesMissionScoringRedesign, false, 'P4 export excludes scoring redesign');
assert.equal(p4OverlayExport.usesMARL, false, 'P4 export excludes MARL');
const p5AttemptSessionExport = buildBenchmarkAttemptSessionExport({
  attemptSession: p2AttemptSession,
  comparisonViewModel: p3ComparisonViewModel,
  routeOverlayViewModel: p4OverlayViewModel
});
assert.equal(p5AttemptSessionExport.type, 'anchor.benchmark.attempt-session', 'P5 attempt-session export type');
assert.equal(p5AttemptSessionExport.usesNewPlanner, false, 'P5 attempt session export excludes new planner');
assert.equal(p5AttemptSessionExport.usesMissionScoringRedesign, false, 'P5 attempt session export excludes scoring redesign');
assert.equal(p5AttemptSessionExport.usesMARL, false, 'P5 attempt session export excludes MARL');
const p5ParsedAttemptSession = parseBenchmarkArtifact(p5AttemptSessionExport);
assert.equal(p5ParsedAttemptSession.valid, true, 'P5 attempt-session export parses through import parser');
const p5ImportViewModel = buildBenchmarkImportViewModel({
  currentEpisode: { episodeId: p2RuntimeContext.episodeId, benchmarkMode: 'plannerBenchmark' },
  currentSession: p2AttemptSession,
  importedArtifacts: p5ParsedAttemptSession.artifacts,
  persistedSessions: [{ episodeId: p2RuntimeContext.episodeId, benchmarkMode: 'plannerBenchmark', attemptCount: 1, routeGeometryCount: 0, savedAt: '2026-06-16T00:00:00.000Z' }]
});
assert.equal(p5ImportViewModel.compatibleImportCount, 1, 'P5 import view model marks matching session compatible');
const p5ImportPanelHtml = benchmarkImportPanelHtml(p5ImportViewModel);
assert.ok(p5ImportPanelHtml.includes('Attempt sessions let you compare multiple plans'), 'P5 import panel states attempt-session purpose');
assert.ok(p5ImportPanelHtml.includes('P5 does not recompute scores'), 'P5 import panel states no-recompute boundary');
assert.ok(p5ImportPanelHtml.includes('Local persistence stores compact attempt summaries'), 'P5 import panel states compact persistence boundary');
const p5BenchmarkSource = [
  'src/core/benchmark/BenchmarkArtifactImport.js',
  'src/core/benchmark/BenchmarkAttemptPersistence.js',
  'src/core/benchmark/BenchmarkImportViewModel.js',
  'src/ui/benchmark/BenchmarkImportPanel.js',
  'src/game/phaser/scenes/DebriefScene.js'
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.ok(p5BenchmarkSource.includes('hasAttemptPersistence'), 'P5 source exposes attempt persistence debug field');
assert.ok(p5BenchmarkSource.includes('importedArtifactCount'), 'P5 source exposes import count debug field');
assert.ok(p5BenchmarkSource.includes('availableBenchmarkImportTypes'), 'P5 source exposes import type debug field');
const p1BenchmarkContractSource = [
  'src/core/benchmark/BenchmarkEpisodeContract.js',
  'src/core/benchmark/BenchmarkRouteExecutionRecord.js',
  'src/core/benchmark/BenchmarkResultAdapter.js',
  'src/core/benchmark/BenchmarkLaunchBridge.js',
  'src/game/phaser/scenes/BenchmarkModeOverviewScene.js'
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.equal(/implements? (a )?new route planner/i.test(p1BenchmarkContractSource), false, 'P1 does not claim a new route planner');
// Learning Lab bridge and Mission Console menu guards.
const learningLabSource = fs.readFileSync('labs/sampling-priority-to-glider-action-value.html', 'utf8');
assert.ok(learningLabSource.includes('A_global'), 'Learning Lab contains A_global');
assert.ok(learningLabSource.includes('Q_glider'), 'Learning Lab contains Q_glider');
assert.ok(learningLabSource.includes('Event intensity is not sampling priority'), 'Learning Lab states event-intensity boundary');
assert.ok(learningLabSource.includes('Action value is not route planning'), 'Learning Lab states route-planning boundary');
const missionConsoleSource = fs.readFileSync('src/ui/MissionConsole.js', 'utf8');
const missionConsoleChecks = [
  ['Flow Fields Demo', ['Flow Fields Demo']],
  ['Coupled Fields Demo', ['Coupled Fields Demo']],
  ['Uncertainty / Forecast Demo', ['Uncertainty / Forecast Demo']],
  ['Sampling Priority Demo', ['Sampling Priority Demo']],
  ['Flow-Coupled Sampling Demo', ['Flow-Coupled Sampling Demo']],
  ['Planner Benchmark', ['Planner Benchmark']],
  ['Adaptive Benchmark', ['Adaptive Benchmark']],
  ['Full Autonomy Benchmark', ['Full Autonomy Benchmark']],
  ['Process Lab / Sampling Process Lab', ['Process Lab', 'Sampling Process Lab', 'Spatiotemporal Sampling Process Lab', 'SAMPLING_PROCESS_LAB_MENU_LABEL']]
];
missionConsoleChecks.forEach(([name, labels]) => {
  assert.ok(labels.some((label) => missionConsoleSource.includes(label)), `Mission Console contains ${name}`);
});
assert.ok(missionConsoleSource.includes('RoiGeneratorDemoScene'), 'Mission Console binds Process Lab to RoiGeneratorDemoScene');

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
  'docs/uncertainty_forecast_demo.md',
  'docs/sampling_priority_demo.md',
  'docs/flow_coupled_sampling_demo.md',
  'docs/model_stack_integration_notes.md',
  'docs/benchmark_modes.md',
  'docs/adaptive_benchmark_mission_manager.md',
  'src/core/benchmark/BenchmarkAttemptRegistry.js',
  'src/core/benchmark/BenchmarkMetadata.js',
  'src/core/benchmark/BenchmarkResultAdapter.js',
  'src/core/benchmark/BenchmarkRouteExecutionRecord.js',
  'src/core/benchmark/BenchmarkEpisodeContract.js',
  'docs/benchmark_route_execution_contract.md',
  'docs/planner_benchmark_execution.md',
  'docs/planner_benchmark_attempt_comparison.md',
  'docs/planner_benchmark_route_overlay.md',
  'docs/planner_benchmark_attempt_import_persistence.md',
  'labs/sampling-priority-to-glider-action-value.html',
  'src/core/demo/FlowFieldDemo.js',
  'src/core/demo/flow/FlowFieldDiagnostics.js',
  'src/core/demo/coupled/AnalyticScalarProcessEngines.js',
  'src/core/demo/coupled/OracleCoupledObjective.js',
  'src/core/demo/UncertaintyForecastDemo.js',
  'src/core/demo/uncertainty/UncertaintyFieldMath.js',
  'src/core/demo/samplingPriority/SamplingPriorityModel.js',
  'src/core/demo/flowCoupledSampling/GliderActionValueModel.js',
  'src/core/benchmark/BenchmarkModeContract.js',
  'src/core/benchmark/BenchmarkModeExporter.js',
  'src/core/benchmark/AdaptiveMissionManagerContract.js',
  'src/core/benchmark/AdaptiveDiagnosisModel.js',
  'src/core/benchmark/AdaptiveObjectivePolicy.js',
  'src/core/benchmark/AdaptiveMissionManagerState.js',
  'src/core/benchmark/AdaptiveSurfacingEvent.js',
  'src/core/benchmark/AdaptiveMissionManagerFixtures.js',
  'src/core/benchmark/AdaptiveBenchmarkViewModel.js',
  'src/core/benchmark/AdaptiveBenchmarkRuntime.js',
  'src/core/benchmark/AdaptiveEvidenceAdapter.js',
  'src/core/benchmark/AdaptiveSurfacingLoop.js',
  'src/core/benchmark/AdaptiveNextLegHandoff.js',
  'src/core/benchmark/AdaptiveEpisodeTrace.js',
  'src/ui/benchmark/AdaptiveBenchmarkPanel.js',
  'src/core/benchmark/AdaptiveEpisodeSession.js',
  'src/core/benchmark/AdaptiveLegRecord.js',
  'src/core/benchmark/AdaptiveEpisodePersistence.js',
  'src/core/benchmark/AdaptiveObjectiveHistoryViewModel.js',
  'src/ui/benchmark/AdaptiveEpisodeSessionPanel.js',
  'src/core/benchmark/AdaptiveEpisodeImport.js',
  'src/ui/benchmark/AdaptiveSurfacingPanel.js',
  'src/core/benchmark/BenchmarkEpisodeRuntime.js',
  'src/core/benchmark/BenchmarkAttemptSession.js',
  'src/core/benchmark/BenchmarkAttemptSourceMapping.js',
  'src/core/benchmark/BenchmarkComparisonViewModel.js',
  'src/core/benchmark/BenchmarkRouteReviewViewModel.js',
  'src/ui/benchmark/BenchmarkDebriefPanel.js',
  'src/ui/benchmark/BenchmarkRouteOverlayPanel.js',
  'src/core/benchmark/BenchmarkRouteGeometryAdapter.js',
  'src/core/benchmark/BenchmarkRouteOverlayViewModel.js',
  'src/core/benchmark/BenchmarkArtifactImport.js',
  'src/core/benchmark/BenchmarkAttemptPersistence.js',
  'src/core/benchmark/BenchmarkImportViewModel.js',
  'src/ui/benchmark/BenchmarkImportPanel.js',
  'src/core/io/ResultExporter.js',
  'src/game/phaser/scenes/BenchmarkModeOverviewScene.js',
  'src/game/phaser/scenes/DebriefScene.js',
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
