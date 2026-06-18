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
import { HeadlessBundleViewerScene } from '../../src/game/phaser/scenes/HeadlessBundleViewerScene.js';
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
import { createHeadlessSchemaDescriptor, headlessSchemaSummary } from '../../src/core/headless/HeadlessSchemaContract.js';
import { HEADLESS_CANONICAL_FIELDS, createHeadlessFieldDescriptor } from '../../src/core/headless/HeadlessFieldSchema.js';
import { createHeadlessMissionConfig } from '../../src/core/headless/HeadlessMissionSchema.js';
import { createHeadlessEpisode } from '../../src/core/headless/HeadlessEpisodeSchema.js';
import { createHeadlessBundleManifest } from '../../src/core/headless/HeadlessBundleManifest.js';
import { browserHeadlessMappingSummary, exportTypeHeadlessCompatibility } from '../../src/core/headless/BrowserHeadlessSchemaMap.js';
import { buildHeadlessFieldPackDescriptorFromDemoArtifact, validateHeadlessAdapterOutput } from '../../src/core/headless/HeadlessExportAdapter.js';
import { buildHeadlessBundleFromFiles } from '../../src/core/headless/HeadlessBundleLoader.js';
import { validateHeadlessBundle } from '../../src/core/headless/HeadlessBundleValidation.js';
import { buildHeadlessBundleViewModel } from '../../src/core/headless/HeadlessBundleViewModel.js';
import { buildBrowserHeadlessBundleDebugObject, buildBrowserHeadlessBundleSummaryArtifact, buildBrowserHeadlessReplaySummaryArtifact, buildBrowserHeadlessRoundtripSummaryArtifact } from '../../src/core/headless/HeadlessBundleBrowserAdapter.js';
import { verifyReplayIntegrity } from '../../src/core/replay/ReplayIntegrityVerifier.js';
import { createReplayPlaybackState, replayMultiAgentSummary } from '../../src/core/replay/ReplayPlayback.js';
import { headlessBundleViewerPanelHtml } from '../../src/ui/headless/HeadlessBundleViewerPanel.js';
import { validateMissionOutcomeReport } from '../../src/core/scoring/MissionOutcomeReport.js';
import { buildMissionScorecardViewModel } from '../../src/core/scoring/MissionScorecardViewModel.js';
import { missionScorecardPanelHtml } from '../../src/ui/scoring/MissionScorecardPanel.js';
import { createDefaultHeadlessRuntimeConfig, validateHeadlessRuntimeConfig } from '../../src/core/headless/runtime/HeadlessRuntimeConfig.js';
import { createHeadlessGrid, field3dStats as headlessField3dStats } from '../../src/core/headless/runtime/HeadlessGrid.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { simulateHeadlessGliderRoute } from '../../src/core/headless/runtime/HeadlessGlider.js';
import { runHeadlessMission } from '../../src/core/headless/runtime/HeadlessMissionRunner.js';
import { headlessBundleFiles } from '../../src/core/headless/runtime/HeadlessBundleWriter.js';
import { analyzeScienceEvidence, buildScienceDiagnosticsArtifact } from '../../src/core/science/ScienceDiscoveryLifecycle.js';
import { runScienceDiscoveryFixture } from '../../src/core/science/ScienceDiscoveryFixtures.js';
import { normalizeScienceDiagnosisId } from '../../src/core/science/ScienceDiagnosisTypes.js';
import { createBathymetryConfig, validateBathymetryConfig } from '../../src/core/science/BathymetrySchema.js';
import { createCoastalOperationalBathymetry, createSyntheticBathymetryField, validateBathymetryField } from '../../src/core/science/BathymetryFieldModel.js';
import { createBathymetryMesh, validateBathymetryMesh } from '../../src/core/science/BathymetryMeshModel.js';
import { buildOceanWorldGeometry, validateOceanWorldGeometry } from '../../src/core/science/OceanWorldGeometryAdapter.js';
import { HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE } from '../../src/core/headless/HeadlessRoundtripTypes.js';
import { createGliderMotionConfig, validateGliderMotionConfig } from '../../src/core/motion/GliderMotionSchema.js';
import { trajectoryMotionSummary, validateMotionTrajectory } from '../../src/core/motion/GliderTrajectorySimulator.js';
import { validateMissionFeasibilityReport } from '../../src/core/motion/MissionFeasibilityReport.js';
import { validateMotionCostGraph } from '../../src/core/motion/MotionCostGraphBuilder.js';
import { validateMotionCostMatrix } from '../../src/core/motion/MotionCostMatrixExporter.js';
import { detectRendererCapabilities, rendererCapabilitySummary } from '../../src/core/rendering/RendererCapabilityModel.js';
import { createRendererHostConfig, createRendererSceneDescriptor, rendererHostSummary, validateRendererHostConfig } from '../../src/core/rendering/RendererHostContract.js';
import { buildOceanWorldRenderViewModel, oceanWorldRenderViewModelSummary } from '../../src/core/rendering/OceanWorldRenderViewModel.js';
import { buildBathymetryWorldRenderViewModel, bathymetryWorldRenderViewModelSummary } from '../../src/core/rendering/BathymetryWorldRenderViewModel.js';
import { THREE_BATHYMETRY_RENDERER_VERSION, threeBathymetryRendererSummary } from '../../src/game/three/ThreeBathymetryRenderer.js';
import { rendererHostPanelHtml } from '../../src/ui/rendering/RendererHostPanel.js';
import '../../src/labs/widgets/SamplingActionValueWidgets.js';
import { FlowFieldDemoScene } from '../../src/game/phaser/scenes/FlowFieldDemoScene.js';
import { RoiGeneratorDemoScene } from '../../src/game/phaser/scenes/RoiGeneratorDemoScene.js';
import { CoupledFieldsDemoScene } from '../../src/game/phaser/scenes/CoupledFieldsDemoScene.js';
import { MotionPlanningDemoScene } from '../../src/game/phaser/scenes/MotionPlanningDemoScene.js';
import { RendererArchitecturePreviewScene } from '../../src/game/phaser/scenes/RendererArchitecturePreviewScene.js';
import { BathymetryWorldViewScene } from '../../src/game/phaser/scenes/BathymetryWorldViewScene.js';

function assertFiniteNumber(value, label) {
  assert.equal(Number.isFinite(Number(value)), true, `${label} should be finite`);
}

function assertFieldNonEmpty(field, label) {
  assert.ok(Array.isArray(field), `${label} should be a row-major array`);
  assert.ok(field.length > 0 && field[0]?.length > 0, `${label} should have dimensions`);
  assert.ok(field.flat().some((value) => Number(value) > 0 || (typeof value === 'string' && value !== 'inactive' && value !== 'empty')), `${label} should not be empty`);
}


// P9 science diagnosis modules: forecast correction vs hidden-event hypothesis lifecycle.
assert.equal(normalizeScienceDiagnosisId('likelyForecastError'), 'forecastIntensityError', 'P9 science diagnosis aliases normalize');
const p9ScienceUpdate = analyzeScienceEvidence({
  observations: [
    { observationId: 'p9-a', timeSeconds: 0, x: 4, y: 4, observedValue: 1.2, forecastValue: 0.2, sensorNoiseStd: 0.1 },
    { observationId: 'p9-b', timeSeconds: 120, x: 4.2, y: 4.1, observedValue: 1.25, forecastValue: 0.2, sensorNoiseStd: 0.1 },
    { observationId: 'p9-c', timeSeconds: 240, x: 3.8, y: 4.1, observedValue: 1.18, forecastValue: 0.2, sensorNoiseStd: 0.1 }
  ],
  context: { episodeId: 'model-stack-p9-science', forecastCanExplain: false, eventFamily: 'hiddenPlume' }
});
assert.equal(p9ScienceUpdate.type, 'anchor.science.discovery-update', 'P9 science discovery modules import and run');
assert.equal(p9ScienceUpdate.primaryDiagnosis, 'likelyHiddenEvent', 'P9 hidden-event diagnosis is distinct from forecast correction');
const p9ScienceDiagnostics = buildScienceDiagnosticsArtifact(p9ScienceUpdate, { episodeId: 'model-stack-p9-science' });
assert.equal(p9ScienceDiagnostics.type, 'anchor.headless.science-diagnostics', 'P9 headless science diagnostics artifact builds');
assert.equal(JSON.stringify(p9ScienceDiagnostics).includes('T_hiddenTruth'), false, 'P9 science diagnostics do not expose hidden truth field IDs');
assert.equal(runScienceDiscoveryFixture('forecastIntensityError').passed, true, 'P9 science fixtures pass');
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

const h0Descriptor = createHeadlessSchemaDescriptor();
const h0Summary = headlessSchemaSummary(h0Descriptor);
assert.equal(h0Summary.implementsPythonPackage, false, 'H0 does not claim a Python package');
assert.equal(h0Summary.implementsNewSimulator, false, 'H0 does not claim a new simulator');
assert.equal(h0Summary.implementsNewPlanner, false, 'H0 does not claim a new planner');
assert.equal(h0Summary.implementsMARL, false, 'H0 does not claim MARL/RL implementation');
assert.ok(HEADLESS_CANONICAL_FIELDS.some((field) => field.id === 'A_global'), 'H0 canonical A_global field exists');
assert.ok(HEADLESS_CANONICAL_FIELDS.some((field) => field.id === 'Q_glider'), 'H0 canonical Q_glider field exists');
assert.equal(createHeadlessFieldDescriptor({ id: 'T_hiddenTruth' }).visibilityTier, 'hiddenTruth', 'H0 protects hidden truth by default');
const h0Mission = createHeadlessMissionConfig({ missionId: 'h0-smoke-mission', world: { width: 4, height: 4 }, gliders: [{ id: 'g1', start: { x: 0, y: 0 } }], objectives: [{ id: 'reconnaissanceSurvey' }] });
assert.equal(h0Mission.type, 'anchor.headless.mission-config', 'H0 mission schema exists');
const h0Episode = createHeadlessEpisode({ episodeId: 'h0-smoke-episode', benchmarkMode: 'plannerBenchmark', actions: [{ gliderId: 'g1', target: { x: 1, y: 1 } }] });
assert.equal(h0Episode.type, 'anchor.headless.episode', 'H0 episode schema exists');
const h0Manifest = createHeadlessBundleManifest({ files: [{ path: 'manifest.json', role: 'manifest' }] });
assert.equal(h0Manifest.type, 'anchor.headless.manifest', 'H0 bundle manifest schema exists');
const h0MapSummary = browserHeadlessMappingSummary();
assert.deepEqual(h0MapSummary.unmappedRequiredP8Types, [], 'H0 maps required P8 types');
assert.equal(exportTypeHeadlessCompatibility('anchor.solverPacket').headlessType, 'anchor.headless.mission-config', 'H0 maps solver packet');
assert.equal(exportTypeHeadlessCompatibility('anchor.headless.solver-roundtrip-report').headlessType, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'H3.1 maps canonical solver roundtrip report');
assert.equal(exportTypeHeadlessCompatibility('anchor.headless.roundtrip-report').headlessType, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'H3.1 maps legacy roundtrip report alias');
assert.equal(exportTypeHeadlessCompatibility('anchor.headless.solver-roundtrip-bundle').headlessType, HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE, 'H3.1 maps solver roundtrip bundle');
const h0FieldPack = buildHeadlessFieldPackDescriptorFromDemoArtifact({ type: 'anchor.demo.flow-field', grid: { width: 2, height: 2 }, fields: { current: [[[0, 0]]] } });
assert.equal(validateHeadlessAdapterOutput(h0FieldPack).valid, true, 'H0 adapter output validates');
const h1Config = createDefaultHeadlessRuntimeConfig({ seed: 'model-stack-h1-smoke', width: 12, height: 8 });
assert.equal(validateHeadlessRuntimeConfig(h1Config).status, 'PASS', 'H1 runtime config validates');
assert.deepEqual(createHeadlessGrid(h1Config).shape, [3, 8, 12], 'H1 grid uses field[z][row][col] shape');
const h1FieldPack = createHeadlessFieldPack(h1Config);
assert.equal(h1FieldPack.type, 'anchor.headless.field-pack', 'H1 field pack exists');
assert.equal(h1FieldPack.fieldVisibility.T_hiddenTruth, 'hiddenTruth', 'H1 protects hidden truth visibility');
assert.equal(headlessField3dStats(h1FieldPack.fields.A_global).invalidCount, 0, 'H1 A_global is finite');
const h1RouteResult = simulateHeadlessGliderRoute({
  fieldPack: h1FieldPack,
  glider: h1Config.missionConfig.gliders[0],
  waypoints: h1Config.plan.waypoints,
  missionConfig: { ...h1Config.missionConfig, sensorNoise: h1Config.sensorNoise, planningRules: { stepDistance: h1Config.stepDistance } },
  seed: h1Config.seed
});
assert.ok(h1RouteResult.observations.length > 0, 'H1 glider simulation produces observations');
const h1Episode = runHeadlessMission(h1Config);
assert.equal(h1Episode.type, 'anchor.headless.episode', 'H1 mission runner returns an episode');
assert.equal(h1Episode.diagnostics.implementsNewPlanner, false, 'H1 does not claim a new planner');
assert.equal(h1Episode.diagnostics.implementsMARL, false, 'H1 does not claim MARL/RL');
assert.equal(h1Episode.diagnostics.calibratedOceanForecast, false, 'H1 does not claim calibrated ocean forecasting');
assert.equal(h1Episode.waterColumnSummary?.type, 'anchor.headless.water-column-summary', 'P11 water-column summary attaches to headless episodes');
assert.equal(h1Episode.depthLayerPrioritySummary?.type, 'anchor.headless.depth-layer-priority-summary', 'P11 depth-layer priority summary attaches to headless episodes');
assert.equal(h1Episode.waterColumnSummary?.usesFull3DPlanning, false, 'P11 does not claim full 3D planning');
const motionR1Config = createGliderMotionConfig({ enabled: true, motionAware: true, motionModelId: 'depthLayerKinematic', gliderSpeed: 1, controlStepSeconds: 45 });
assert.equal(validateGliderMotionConfig(motionR1Config).status, 'PASS', 'MOTION-R1 glider motion config validates');
assert.equal(motionR1Config.usesWebGPUFluid, false, 'MOTION-R1 config does not claim WebGPU fluid execution');
assert.equal(motionR1Config.usesNewPlanner, false, 'MOTION-R1 config does not claim a route planner');
const motionR1Episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({
  seed: 'model-stack-motion-r1-smoke',
  width: 12,
  height: 8,
  motionAware: true,
  motionModelId: 'depthLayerKinematic',
  gliderSpeed: 1,
  controlStepSeconds: 45,
  driftGain: 1
}));
assert.equal(motionR1Episode.diagnostics.usesMotionDynamics, true, 'MOTION-R1 headless runtime can run motion-aware execution');
assert.equal(motionR1Episode.diagnostics.usesWebGPUFluid, false, 'MOTION-R1 headless runtime does not claim WebGPU');
assert.equal(validateMotionTrajectory(motionR1Episode.motionTrajectory).status, 'PASS', 'MOTION-R1 trajectory validates');
assert.equal(validateMissionFeasibilityReport(motionR1Episode.missionFeasibilityReport).status, 'PASS', 'MOTION-R1 mission feasibility report validates');
assert.equal(motionR1Episode.missionFeasibilityReport?.usesNewPlanner, false, 'MOTION-R1 mission feasibility report does not claim a planner');
const motionR1Summary = trajectoryMotionSummary(motionR1Episode.motionTrajectory);
assert.equal(motionR1Summary.present, true, 'MOTION-R1 trajectory summary is present');
assertFiniteNumber(motionR1Summary.meanTrackError, 'MOTION-R1 mean track error');
const motionR1Files = headlessBundleFiles(motionR1Episode, { includeHiddenTruth: false, combinedJson: true });
assert.ok(motionR1Files['motion_trajectory.json'], 'MOTION-R1 bundle includes motion_trajectory.json');
assert.ok(motionR1Files['motion_diagnostics.json'], 'MOTION-R1 bundle includes motion_diagnostics.json');
assert.ok(motionR1Files['mission_feasibility_report.json'], 'MOTION-R1 bundle includes mission_feasibility_report.json');
const motionR1Bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: motionR1Files['bundle.json'] }]);
assert.equal(motionR1Bundle.motionTrajectory?.type, 'anchor.motion.trajectory', 'MOTION-R1 bundle loader preserves motion trajectory');
const motionR1ViewModel = buildHeadlessBundleViewModel(motionR1Bundle);
assert.equal(motionR1ViewModel.motionSummary.usesMotionDynamics, true, 'MOTION-R1 viewer model exposes motion dynamics');
assert.equal(motionR1ViewModel.motionSummary.usesWebGPUFluid, false, 'MOTION-R1 viewer model keeps WebGPU boundary');
assert.equal(motionR1ViewModel.missionFeasibilitySummary.present, true, 'MOTION-R1 viewer model exposes mission feasibility report');
const motionR1PanelHtml = headlessBundleViewerPanelHtml(motionR1ViewModel);
assert.ok(motionR1PanelHtml.includes('Motion Dynamics'), 'MOTION-R1 viewer panel renders motion section');
assert.ok(motionR1PanelHtml.includes('Mission Feasibility'), 'MOTION-R1 viewer panel renders mission feasibility section');
assert.ok(motionR1PanelHtml.includes('not a new route planner'), 'MOTION-R1 viewer panel states planner boundary');
const simR1Episode = runHeadlessMission(createDefaultHeadlessRuntimeConfig({
  seed: 'model-stack-sim-r1-smoke',
  width: 12,
  height: 8,
  costGraphEnabled: true,
  costGraphGridStep: 4,
  costGraphMaxNodes: 24,
  costMatrixFormat: 'sparse'
}));
assert.equal(simR1Episode.diagnostics.usesMotionCostGraph, true, 'SIM-R1 headless runtime can emit a motion cost graph');
assert.equal(validateMotionCostGraph(simR1Episode.motionCostGraph).status, 'PASS', 'SIM-R1 motion cost graph validates');
assert.equal(validateMotionCostMatrix(simR1Episode.motionCostMatrix).status, 'PASS', 'SIM-R1 motion cost matrix validates');
assert.ok(simR1Episode.motionCostGraphSummary.edgeCount > 0, 'SIM-R1 graph has directed edges');
assert.ok(simR1Episode.motionCostMatrixSummary.finiteCostCount > 0, 'SIM-R1 matrix has finite costs');
assert.equal(simR1Episode.motionCostGraphSummary.usesRouteOptimizer, false, 'SIM-R1 graph does not claim route optimization');
const simR1Files = headlessBundleFiles(simR1Episode, { includeHiddenTruth: false, combinedJson: true });
assert.ok(simR1Files['motion_cost_graph.json'], 'SIM-R1 bundle includes motion_cost_graph.json');
assert.ok(simR1Files['motion_cost_matrix.json'], 'SIM-R1 bundle includes motion_cost_matrix.json');
assert.equal(simR1Files['bundle.json'].includes('T_hiddenTruth'), false, 'SIM-R1 public bundle omits hidden truth');
const simR1Bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: simR1Files['bundle.json'] }]);
const simR1ViewModel = buildHeadlessBundleViewModel(simR1Bundle);
assert.equal(simR1ViewModel.motionCostGraphSummary.present, true, 'SIM-R1 viewer model exposes motion cost graph');
const simR1PanelHtml = headlessBundleViewerPanelHtml(simR1ViewModel);
assert.ok(simR1PanelHtml.includes('Motion Cost Graph'), 'SIM-R1 viewer panel renders motion cost graph section');
assert.ok(simR1PanelHtml.includes('do not choose a route'), 'SIM-R1 viewer panel states no route-choice boundary');
const motionR1Scene = new MotionPlanningDemoScene();
motionR1Scene.init({ motionModelId: 'depthLayerKinematic', currentStrength: 1, crossCurrentStrength: 1, gliderSpeed: 1 });
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesMotionDynamics, true, 'MOTION-R1 demo debug marks motion dynamics');
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.usesWebGPUFluid, false, 'MOTION-R1 demo debug keeps WebGPU boundary');
assert.equal(globalThis.ANCHOR_MOTION_PLANNING_DEMO_DEBUG?.notTopLevelMode, true, 'MOTION-R1 demo debug marks Simulation Lab sandbox placement');


// GFX-ARCH-R1 renderer boundary: capability model, host contract, public view model, and preview scene.
const gfxCaps = detectRendererCapabilities({
  supportsCanvas2D: true,
  supportsWebGL: true,
  supportsWebGPU: false,
  supportsThree: false,
  phaserAvailable: true,
  preferredBackend: 'threeWebGL'
});
const gfxCapsSummary = rendererCapabilitySummary(gfxCaps);
assert.equal(gfxCapsSummary.webgpuProgressiveEnhancement, true, 'GFX-ARCH-R1 marks WebGPU as progressive enhancement');
assert.equal(gfxCapsSummary.ownsSimulationState, false, 'GFX-ARCH-R1 renderer capabilities do not own simulation state');
assert.equal(gfxCapsSummary.ownsScoring, false, 'GFX-ARCH-R1 renderer capabilities do not own scoring');
assert.equal(gfxCapsSummary.ownsPlanning, false, 'GFX-ARCH-R1 renderer capabilities do not own planning');
assert.equal(gfxCapsSummary.usesWebGPUFluid, false, 'GFX-ARCH-R1 renderer capabilities do not implement WebGPU fluid');
assert.equal(gfxCapsSummary.usesMARL, false, 'GFX-ARCH-R1 renderer capabilities exclude MARL/RL');
const gfxSceneDescriptor = createRendererSceneDescriptor({
  id: 'future-ocean-world-renderer',
  label: 'Future Ocean World Renderer',
  rendererBackend: gfxCaps.preferredBackend,
  fallbackBackend: gfxCaps.fallbackBackend,
  purpose: 'Future bathymetry, depth-layer, planned-vs-realized trajectory renderer.',
  optionalCapabilities: ['webgl', 'webgpu', 'three'],
  consumesViewModelTypes: ['anchor.rendering.ocean-world-view-model']
});
const gfxHostConfig = createRendererHostConfig({
  id: 'anchor-browser-renderer-host',
  label: 'ANCHOR Browser Renderer Host',
  capabilities: gfxCaps,
  scenes: [gfxSceneDescriptor]
});
assert.equal(validateRendererHostConfig(gfxHostConfig).status, 'PASS', 'GFX-ARCH-R1 renderer host validates');
assert.equal(rendererHostSummary(gfxHostConfig).sceneCount, 1, 'GFX-ARCH-R1 renderer host registers one descriptor');
const gfxOceanViewModel = buildOceanWorldRenderViewModel({
  missionConfig: { world: { grid: { width: 12, height: 8 } }, waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] } },
  waterColumnSummary: { waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] }, verticalCoverage: 'broad', publicSafe: true },
  bathymetrySummary: { minDepthMeters: 8, maxDepthMeters: 120, meanDepthMeters: 52, source: 'synthetic-smoke' },
  motionTrajectory: {
    plannedWaypoints: [{ id: 'wp-1', x: 1, y: 6, depthLayerId: 'surface' }, { id: 'wp-2', x: 5, y: 4, depthLayerId: 'thermocline' }],
    realizedTrack: [{ id: 'track-1', x: 1, y: 6, depthLayerId: 'surface' }, { id: 'track-2', x: 4.6, y: 4.3, depthLayerId: 'thermocline' }],
    sampledObservations: [{ id: 'sample-1', x: 4.6, y: 4.3, depthLayerId: 'thermocline', value: 0.72 }],
    T_hiddenTruth: [[1, 2, 3]]
  }
});
const gfxOceanSummary = oceanWorldRenderViewModelSummary(gfxOceanViewModel);
assert.equal(gfxOceanSummary.depthLayerCount, 3, 'GFX-ARCH-R1 ocean view model exposes depth layers');
assert.equal(gfxOceanSummary.ownsSimulationState, false, 'GFX-ARCH-R1 ocean view model does not own simulation state');
assert.equal(gfxOceanSummary.ownsScoring, false, 'GFX-ARCH-R1 ocean view model does not own scoring');
assert.equal(gfxOceanSummary.ownsPlanning, false, 'GFX-ARCH-R1 ocean view model does not own planning');
assert.equal(gfxOceanSummary.usesWebGPUFluid, false, 'GFX-ARCH-R1 ocean view model excludes WebGPU fluid');
assert.equal(JSON.stringify(gfxOceanViewModel).includes('T_hiddenTruth'), false, 'GFX-ARCH-R1 ocean view model omits hidden truth identifiers');
const envBathymetryConfig = createBathymetryConfig({ width: 12, height: 8, defaultViewMode: 'obliqueBathymetry' });
assert.equal(validateBathymetryConfig(envBathymetryConfig).status, 'PASS', 'ENV-R1 bathymetry config validates');
const envBathymetry = createSyntheticBathymetryField({ ...envBathymetryConfig, seed: 'model-stack-env-r1' });
assert.equal(validateBathymetryField(envBathymetry).valid, true, 'ENV-R1 synthetic bathymetry validates');
const envMesh = createBathymetryMesh({ bathymetry: envBathymetry, waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] } });
assert.equal(validateBathymetryMesh(envMesh).valid, true, 'ENV-R1 bathymetry mesh validates');
const envGeometry = buildOceanWorldGeometry({
  missionConfig: { world: { width: 12, height: 8, waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] }, bathymetryConfig: envBathymetryConfig } },
  bathymetry: envBathymetry,
  waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] },
  observations: [{ observationId: 'env-obs-1', x: 4, y: 4, depthLayerId: 'thermocline', depthMeters: 35, observedValue: 0.6 }],
  tracks: [{ x: 1, y: 6, depthLayerId: 'surface', depthMeters: 0 }, { x: 4, y: 4, depthLayerId: 'thermocline', depthMeters: 35 }],
  plan: { waypoints: [{ x: 1, y: 6 }, { x: 4, y: 4, depthLayerId: 'thermocline' }] }
});
assert.equal(validateOceanWorldGeometry(envGeometry).valid, true, 'ENV-R1 ocean world geometry validates');
const envOceanViewModel = buildOceanWorldRenderViewModel({
  missionConfig: { world: { grid: { width: 12, height: 8 } }, waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] } },
  oceanWorldGeometry: envGeometry,
  bathymetrySummary: envGeometry.bathymetrySummary,
  waterColumnSummary: { waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] }, publicSafe: true }
});
const envOceanSummary = oceanWorldRenderViewModelSummary(envOceanViewModel);
assert.equal(envOceanSummary.usesFull3DPlanning, false, 'ENV-R1 render view model excludes full 3D planning');
assert.equal(envOceanSummary.usesHydrodynamicSolver, false, 'ENV-R1 render view model excludes hydrodynamic solver');
assert.equal(envOceanSummary.usesTerrainFlowAsOceanCurrent, false, 'ENV-R1 render view model preserves current boundary');
assert.ok(envOceanViewModel.depthLayerPlanes.length >= 3, 'ENV-R1 render view model exposes depth-layer planes');
const gfxR2Bathymetry = createCoastalOperationalBathymetry({ seed: 'model-stack-gfx-r2', width: 18, height: 12 });
const gfxR2BathymetryViewModel = buildBathymetryWorldRenderViewModel({
  bathymetry: gfxR2Bathymetry,
  waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] },
  plan: { waypoints: [{ x: 2, y: 9 }, { x: 9, y: 5, depthLayerId: 'thermocline', depthMeters: 35 }] },
  observations: [{ observationId: 'gfx-r2-obs-1', x: 9, y: 5, depthLayerId: 'thermocline', depthMeters: 35, observedValue: 0.7 }]
});
const gfxR2BathymetrySummary = bathymetryWorldRenderViewModelSummary(gfxR2BathymetryViewModel);
assert.ok(gfxR2BathymetrySummary.terrainVertexCount > 0, 'GFX-R2 bathymetry view model exposes terrain mesh');
assert.ok(gfxR2BathymetrySummary.coastlineEdgeCount > 0, 'GFX-R2 bathymetry view model exposes coastline edges');
assert.equal(gfxR2BathymetrySummary.ownsSimulationState, false, 'GFX-R2 bathymetry view model excludes simulation ownership');
assert.equal(gfxR2BathymetrySummary.ownsScoring, false, 'GFX-R2 bathymetry view model excludes scoring ownership');
assert.equal(gfxR2BathymetrySummary.ownsPlanning, false, 'GFX-R2 bathymetry view model excludes planning ownership');
assert.equal(typeof THREE_BATHYMETRY_RENDERER_VERSION, 'string', 'GFX-R2 Three bathymetry renderer imports');
const gfxR2RendererSummary = threeBathymetryRendererSummary({ threeAvailable: true, groups: {}, viewModel: gfxR2BathymetryViewModel, layerVisibility: {}, cameraState: {} });
assert.equal(gfxR2RendererSummary.renderer, 'three', 'GFX-R2 renderer summary marks Three renderer');
assert.equal(gfxR2RendererSummary.usesFull3DPlanning, false, 'GFX-R2 renderer excludes full 3D planning');
assert.equal(gfxR2RendererSummary.usesWebGPUFluid, false, 'GFX-R2 renderer excludes WebGPU fluid');
assert.equal(gfxR2RendererSummary.usesEnable3D, false, 'GFX-R2 renderer excludes Enable3D');
const envScene = new BathymetryWorldViewScene();
assert.equal(envScene.scene?.key ?? 'BathymetryWorldViewScene', 'BathymetryWorldViewScene', 'ENV-R1 BathymetryWorldViewScene imports');
const envSceneSource = fs.readFileSync('src/game/phaser/scenes/BathymetryWorldViewScene.js', 'utf8');
assert.ok(envSceneSource.includes('ANCHOR_BATHYMETRY_VIEW_DEBUG'), 'ENV-R1 debug object exists');
assert.ok(envSceneSource.includes('usesHydrodynamicSolver: false'), 'ENV-R1 debug object preserves hydrodynamic boundary');
assert.ok(envSceneSource.includes('usesThreeRenderer: true'), 'GFX-R2 debug object marks Three renderer');
const gfxPanelHtml = rendererHostPanelHtml({
  capabilities: gfxCapsSummary,
  hostSummary: rendererHostSummary(gfxHostConfig),
  oceanWorldSummary: gfxOceanSummary
});
assert.ok(gfxPanelHtml.includes('Renderer Boundary'), 'GFX-ARCH-R1 panel renders renderer boundary');
assert.ok(gfxPanelHtml.includes('Phaser shell remains active'), 'GFX-ARCH-R1 panel states Phaser shell boundary');
assert.ok(gfxPanelHtml.includes('WebGPU is progressive enhancement'), 'GFX-ARCH-R1 panel states WebGPU is progressive enhancement');
assert.ok(gfxPanelHtml.includes('Renderer does not own scoring, planning, or simulation'), 'GFX-ARCH-R1 panel states authority boundary');
const gfxScene = new RendererArchitecturePreviewScene();
gfxScene.buildPreviewModel({ globals: {}, preferredBackend: 'threeWebGL' });
gfxScene.refreshDebugObject(true);
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG?.phaserShellActive, true, 'GFX-ARCH-R1 debug object marks Phaser shell active');
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG?.ownsSimulationState, false, 'GFX-ARCH-R1 debug object excludes simulation ownership');
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG?.ownsScoring, false, 'GFX-ARCH-R1 debug object excludes scoring ownership');
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG?.ownsPlanning, false, 'GFX-ARCH-R1 debug object excludes planning ownership');
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG?.usesWebGPUFluid, false, 'GFX-ARCH-R1 debug object excludes WebGPU fluid');
assert.equal(globalThis.ANCHOR_RENDERER_ARCH_DEBUG?.usesMARL, false, 'GFX-ARCH-R1 debug object excludes MARL/RL');
const h1Files = headlessBundleFiles(h1Episode, { includeHiddenTruth: false });
assert.equal(Object.hasOwn(h1Files, 'hidden_fields.json'), false, 'H1 can omit hidden truth bundle file');
assert.equal(h1Files['visible_fields.json'].includes('T_hiddenTruth'), false, 'H1 visible fields omit hidden truth');
assert.equal(h1Episode.scienceDiagnostics?.type, 'anchor.headless.science-diagnostics', 'P9 science diagnostics attach to H1 headless episodes');
assert.equal(h1Files['science_diagnostics.json'].includes('T_hiddenTruth'), false, 'P9 science diagnostics export omits hidden truth field IDs');
assert.ok(h1Files['water_column_summary.json'], 'P11 bundle includes water_column_summary.json');
assert.ok(h1Files['depth_layer_priority.json'], 'P11 bundle includes depth_layer_priority.json');
assert.ok(h1Files['bathymetry_summary.json'], 'ENV-R1 bundle includes bathymetry_summary.json');
assert.ok(h1Files['mission_geometry_summary.json'], 'ENV-R1 bundle includes mission_geometry_summary.json');
const h1RuntimeSourceFiles = [
  'src/core/headless/runtime/HeadlessRuntimeConfig.js',
  'src/core/headless/runtime/HeadlessGrid.js',
  'src/core/headless/runtime/HeadlessFields.js',
  'src/core/headless/runtime/HeadlessFlow.js',
  'src/core/headless/runtime/HeadlessGlider.js',
  'src/core/headless/runtime/HeadlessObservation.js',
  'src/core/headless/runtime/HeadlessBeliefUpdate.js',
  'src/core/headless/runtime/HeadlessPriority.js',
  'src/core/headless/runtime/HeadlessScoring.js',
  'src/core/headless/runtime/HeadlessMissionRunner.js',
  'src/core/headless/runtime/HeadlessBundleWriter.js',
  'src/core/science/BathymetrySchema.js',
  'src/core/science/BathymetryFieldModel.js',
  'src/core/science/BathymetryMeshModel.js',
  'src/core/science/OceanWorldGeometryAdapter.js',
  'src/core/motion/GliderMotionSchema.js',
  'src/core/motion/MotionEnvironmentSampler.js',
  'src/core/motion/GliderDynamicsModel.js',
  'src/core/motion/PlanControlAdapter.js',
  'src/core/motion/MotionDiagnostics.js',
  'src/core/motion/GliderTrajectorySimulator.js',
  'src/core/motion/MissionFeasibilityReport.js',
  'src/core/motion/MotionCostGraphSchema.js',
  'src/core/motion/MotionCostGraphNodes.js',
  'src/core/motion/MotionCostGraphNeighbors.js',
  'src/core/motion/MotionEdgeCostEstimator.js',
  'src/core/motion/MotionCostGraphBuilder.js',
  'src/core/motion/MotionCostMatrixExporter.js',
  'src/core/motion/MotionCostGraphPublicSafety.js',
  'tools/js/headless_oceanbox.mjs'
];
const h1RuntimeSource = h1RuntimeSourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
assert.equal(/Phaser|localStorage|src[\\/]game[\\/]phaser|src[\\/]ui[\\/]|\bwindow\b|\bdocument\b/.test(h1RuntimeSource), false, 'H1 runtime avoids browser, Phaser, DOM, UI, and localStorage imports');
assert.equal(/implementsPythonSimulator:\s*true|implementsNewPlanner:\s*true|implementsMARL:\s*true/i.test(h1RuntimeSource), false, 'H1 runtime avoids Python/new-planner/MARL claims');
const h2Files = headlessBundleFiles(h1Episode, { includeHiddenTruth: false, combinedJson: true });
assert.ok(h2Files['bundle.json'], 'H2 combined bundle export includes bundle.json');
const h2Bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', text: h2Files['bundle.json'] }]);
assert.equal(h2Bundle.failures.length, 0, 'H2 combined bundle loads without loader failures');
const h2Validation = validateHeadlessBundle(h2Bundle);
assert.notEqual(h2Validation.status, 'FAIL', 'H2 bundle validation does not fail');
assert.equal(h2Validation.summary.hiddenFieldExported, false, 'H2 public bundle omits hidden fields');
const h2ViewModel = buildHeadlessBundleViewModel(h2Bundle);
assert.ok(h2ViewModel.fieldCards.length > 0, 'H2 bundle view-model exposes field cards');
const h2BrowserArtifact = buildBrowserHeadlessBundleSummaryArtifact(h2Bundle);
assert.equal(h2BrowserArtifact.type, 'anchor.browser.headless-bundle-summary', 'H2 browser summary artifact type');
assert.equal(h2BrowserArtifact.scoreSummary.headlessScoreIsOfficialBrowserScore, false, 'H2 browser summary keeps scoring boundary');
const h2Debug = buildBrowserHeadlessBundleDebugObject(h2Bundle);
assert.equal(h2Debug.usesPythonSimulator, false, 'H2 debug object excludes Python simulator');
assert.equal(h2Debug.usesNodeHeadlessRuntime, true, 'H2 debug object marks Node headless runtime');
assert.equal(h2Debug.hasWaterColumnSummary, true, 'P11 debug object exposes water-column summary');
assert.deepEqual(h2Debug.waterColumnLayerIds, ['surface', 'thermocline', 'deep'], 'P11 debug object exposes default depth layers');
assert.equal(h2Debug.usesFull3DPlanning, false, 'P11 debug object excludes full 3D planning');
const h2PanelHtml = headlessBundleViewerPanelHtml(h2ViewModel);
assert.ok(h2PanelHtml.includes('Headless Bundle Viewer'), 'H2 viewer panel renders title');
assert.ok(h2PanelHtml.includes('Water Column'), 'P11 viewer panel renders water-column section');
assert.ok(h2PanelHtml.includes('Depth-Layer Priority'), 'P11 viewer panel renders depth-layer priority section');
assert.ok(h2PanelHtml.includes('Browser ANCHOR remains the official visual referee'), 'H2 viewer panel states browser referee boundary');
assert.equal(typeof HeadlessBundleViewerScene, 'function', 'H2 viewer scene imports');
const h41ReplayFixture = JSON.parse(fs.readFileSync('docs/examples/headless_replay_multi_agent.example.json', 'utf8'));
const h41ReplayBundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: h41ReplayFixture }]);
const h41ReplayReport = verifyReplayIntegrity(h41ReplayBundle);
assert.equal(h41ReplayReport.status, 'PASS', 'H4.1 replay integrity verifier passes multi-agent public fixture');
const h41ReplayPlayback = createReplayPlaybackState(h41ReplayBundle);
assert.equal(replayMultiAgentSummary(h41ReplayPlayback).agentCount, 2, 'H4.1 replay playback exposes two public agents');
const h41ReplaySummary = buildBrowserHeadlessReplaySummaryArtifact(h41ReplayBundle);
assert.equal(h41ReplaySummary.type, 'anchor.browser.headless-replay-summary', 'H4.1 browser replay summary export type is stable');
assert.equal(h41ReplaySummary.usesHiddenTruthResimulation, false, 'H4.1 replay summary does not claim hidden-truth resimulation');
const h31RoundtripBundlePayload = JSON.parse(fs.readFileSync('docs/examples/headless_solver_roundtrip_bundle.example.json', 'utf8'));
const h31RoundtripBundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: h31RoundtripBundlePayload }]);
assert.equal(h31RoundtripBundle.type, HEADLESS_SOLVER_ROUNDTRIP_BUNDLE_TYPE, 'H3.1 roundtrip fixture bundle type loads');
assert.equal(h31RoundtripBundle.roundtripReport.type, HEADLESS_SOLVER_ROUNDTRIP_REPORT_TYPE, 'H3.1 roundtrip fixture report type loads');
const h31RoundtripSummary = buildBrowserHeadlessRoundtripSummaryArtifact(h31RoundtripBundle);
assert.equal(h31RoundtripSummary.type, 'anchor.browser.headless-roundtrip-summary', 'H3.1 browser roundtrip summary type');
assert.equal(h31RoundtripSummary.usesPythonSimulator, false, 'H3.1 browser roundtrip summary excludes Python simulator');
assert.equal(h31RoundtripSummary.usesNewPlanner, false, 'H3.1 browser roundtrip summary excludes new planner');
assert.equal(h31RoundtripSummary.waterColumnSummary?.present, true, 'P11 roundtrip browser summary exposes water-column context');
assert.equal(h31RoundtripSummary.waterColumnSummary?.usesFull3DPlanning, false, 'P11 roundtrip summary excludes full 3D planning');
assert.equal(JSON.stringify(h31RoundtripSummary).includes('T_hiddenTruth'), false, 'H3.1 browser roundtrip summary omits hidden truth ids');
const scoreR1BundlePayload = JSON.parse(fs.readFileSync('docs/examples/headless_mission_score_bundle.example.json', 'utf8'));
const scoreR1Bundle = buildHeadlessBundleFromFiles([{ fileName: 'bundle.json', payload: scoreR1BundlePayload }]);
assert.deepEqual(scoreR1Bundle.failures, [], 'SCORE-R1 mission score fixture loads without failures');
assert.equal(validateMissionOutcomeReport(scoreR1Bundle.missionOutcomeReport).valid, true, 'SCORE-R1 mission outcome report validates');
const scoreR1ViewModel = buildHeadlessBundleViewModel(scoreR1Bundle);
assert.equal(scoreR1ViewModel.missionScorecard?.present, true, 'SCORE-R1 bundle view-model exposes scorecard');
const scoreR1PanelHtml = headlessBundleViewerPanelHtml(scoreR1ViewModel);
assert.ok(scoreR1PanelHtml.includes('Mission Outcome Scorecard'), 'SCORE-R1 viewer panel renders scorecard');
assert.ok(scoreR1PanelHtml.includes('This is a shadow benchmark evaluation, not the current official browser score.'), 'SCORE-R1 viewer keeps official-score boundary');
const scoreR1DebriefHtml = missionScorecardPanelHtml(buildMissionScorecardViewModel({ missionOutcomeReport: scoreR1Bundle.missionOutcomeReport, regretReport: scoreR1Bundle.regretReport }));
assert.ok(scoreR1DebriefHtml.includes('Composite Outcome Score'), 'SCORE-R1 debrief scorecard renders composite score');
const scoreR1Debug = buildBrowserHeadlessBundleDebugObject(scoreR1Bundle);
assert.equal(scoreR1Debug.hasMissionOutcomeReport, true, 'SCORE-R1 debug object marks mission outcome report');
assert.equal(scoreR1Debug.usesMissionOutcomeScoring, true, 'SCORE-R1 debug object marks shadow scoring');
assert.equal(scoreR1Debug.changesOfficialBrowserScoring, false, 'SCORE-R1 debug object preserves official scoring boundary');
assert.equal(scoreR1Debug.usesNewPlanner, false, 'SCORE-R1 debug object excludes new planner');
assert.equal(scoreR1Debug.usesRouteOptimizer, false, 'SCORE-R1 debug object excludes route optimizer');
assert.equal(scoreR1Debug.usesMARL, false, 'SCORE-R1 debug object excludes MARL');
assert.equal(exportTypeHeadlessCompatibility('anchor.benchmark.mission-outcome-report').compatibility, 'ready', 'SCORE-R1 mission outcome report maps to headless schema');
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
// UI-R1 product hub shell guard.
const mainMenuSource = fs.readFileSync('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const phaserGameSource = fs.readFileSync('src/game/phaser/PhaserGame.js', 'utf8');
assert.ok(phaserGameSource.includes('MainMenuScene'), 'UI-R1 MainMenuScene is registered');
assert.ok(mainMenuSource.includes('ANCHOR_MAIN_MENU_DEBUG'), 'UI-R1 hub debug object exists');
assert.ok(mainMenuSource.includes('Challenge Mode'), 'UI-R1 hub includes Challenge Mode');
assert.ok(mainMenuSource.includes('Simulation Lab'), 'UI-R1 hub includes Simulation Lab');
assert.ok(mainMenuSource.includes('Learning Labs'), 'UI-R1 hub includes Learning Labs');
assert.ok(mainMenuSource.includes('changesSimulationBehavior: false'), 'UI-R1 does not change simulation behavior');
assert.ok(mainMenuSource.includes('changesScoring: false'), 'UI-R1 does not change scoring');
assert.ok(mainMenuSource.includes('usesNewPlanner: false'), 'UI-R1 does not add a planner');
assert.ok(mainMenuSource.includes('usesMARL: false'), 'UI-R1 excludes MARL');
// Learning Lab bridge and Mission Console menu guards.
const learningLabSource = fs.readFileSync('labs/sampling-priority-to-glider-action-value.html', 'utf8');
assert.ok(learningLabSource.includes('A_global'), 'Learning Lab contains A_global');
assert.ok(learningLabSource.includes('Q_glider'), 'Learning Lab contains Q_glider');
assert.ok(learningLabSource.includes('Event intensity is not sampling priority'), 'Learning Lab states event-intensity boundary');
assert.ok(learningLabSource.includes('Action value is not route planning'), 'Learning Lab states route-planning boundary');
const missionConsoleSource = fs.readFileSync('src/ui/MissionConsole.js', 'utf8');
const benchmarkOverviewSource = fs.readFileSync('src/game/phaser/scenes/BenchmarkModeOverviewScene.js', 'utf8');
const benchmarkContractSource = fs.readFileSync('src/core/benchmark/BenchmarkModeContract.js', 'utf8');
const missionConsoleChecks = [
  ['Flow Fields Demo', ['Flow Fields Demo']],
  ['Coupled Fields Demo', ['Coupled Fields Demo']],
  ['Uncertainty / Forecast Demo', ['Uncertainty / Forecast Demo']],
  ['Sampling Priority Demo', ['Sampling Priority Demo']],
  ['Flow-Coupled Sampling Demo', ['Flow-Coupled Sampling Demo']],
  ['Process Lab / Sampling Process Lab', ['Process Lab', 'Sampling Process Lab', 'Spatiotemporal Sampling Process Lab', 'SAMPLING_PROCESS_LAB_MENU_LABEL']]
];
missionConsoleChecks.forEach(([name, labels]) => {
  assert.ok(labels.some((label) => missionConsoleSource.includes(label)), `Mission Console contains active-scene controls for ${name}`);
});
['Planner Benchmark', 'Adaptive Benchmark', 'Full Autonomy Benchmark'].forEach((label) => {
  assert.ok(mainMenuSource.includes(label), `Main Menu hub contains ${label}`);
  assert.ok(benchmarkContractSource.includes(label), `Benchmark mode contract contains ${label}`);
});
assert.ok(benchmarkOverviewSource.includes('createBenchmarkModeConfig'), 'Benchmark overview uses benchmark mode config');
assert.ok(missionConsoleSource.includes('Choose Challenge Mode, Simulation Lab, or Learning Labs from the main viewport.'), 'Mission Console idle state is compact under UI-R1');
assert.ok(mainMenuSource.includes('RoiGeneratorDemoScene'), 'Main Menu hub binds Process Lab to RoiGeneratorDemoScene');
assert.ok(mainMenuSource.includes('HeadlessBundleViewerScene'), 'Main Menu hub binds H2 viewer to HeadlessBundleViewerScene');


// DOCS-GDD-R1 canonical game design source of truth.
const gddPath = 'docs/game_design_scientific_auv_planning.md';
assert.equal(fs.existsSync(gddPath), true, 'DOCS-GDD-R1 canonical game design document exists');
const gddSource = fs.readFileSync(gddPath, 'utf8');
assert.ok(gddSource.includes('Blind Discovery / Hidden-State Mode'), 'DOCS-GDD-R1 covers Blind Discovery visibility mode');
assert.ok(gddSource.includes('Motion Planning vs Path Planning'), 'DOCS-GDD-R1 covers motion/path-planning boundary');
assert.ok(gddSource.includes('2.5D Water-Column Model'), 'DOCS-GDD-R1 covers 2.5D water-column gameplay');
assert.ok(gddSource.includes('not a Python simulator'), 'DOCS-GDD-R1 preserves Python simulator boundary');
assert.ok(gddSource.includes('not MARL/RL training'), 'DOCS-GDD-R1 preserves MARL/RL boundary');
assert.ok(gddSource.toLowerCase().includes('best path is not the shortest path'), 'DOCS-GDD-R1 preserves core gameplay lesson');
// DOCS-SIM-R1 mission feasibility target spec.
const missionFeasibilityPath = 'docs/mission_feasibility_simulator_requirements.md';
assert.equal(fs.existsSync(missionFeasibilityPath), true, 'DOCS-SIM-R1 mission feasibility requirements document exists');
const missionFeasibilitySource = fs.readFileSync(missionFeasibilityPath, 'utf8');
assert.ok(missionFeasibilitySource.includes('4D current'), 'DOCS-SIM-R1 covers 4D current target');
assert.ok(missionFeasibilitySource.includes('cost graph'), 'DOCS-SIM-R1 covers cost graph target');
assert.ok(missionFeasibilitySource.includes('adjacency matrix'), 'DOCS-SIM-R1 covers adjacency matrix target');
const motionCostGraphDocPath = 'docs/motion_cost_graph_and_adjacency_matrix.md';
assert.equal(fs.existsSync(motionCostGraphDocPath), true, 'SIM-R1 motion cost graph documentation exists');
const motionCostGraphDoc = fs.readFileSync(motionCostGraphDocPath, 'utf8');
assert.ok(motionCostGraphDoc.includes('anchor.benchmark.feasibility-cost-graph'), 'SIM-R1 docs cover graph artifact type');
assert.ok(motionCostGraphDoc.includes('anchor.headless.motion-cost-matrix'), 'SIM-R1 docs cover matrix artifact type');
assert.ok(motionCostGraphDoc.includes('does not choose a route'), 'SIM-R1 docs state no-route-choice boundary');
assert.ok(missionFeasibilitySource.includes('not a Python simulator'), 'DOCS-SIM-R1 preserves Python simulator boundary');
assert.ok(missionFeasibilitySource.includes('not MARL/RL'), 'DOCS-SIM-R1 preserves MARL/RL boundary');
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
  'docs/game_design_scientific_auv_planning.md',
  'docs/mission_feasibility_simulator_requirements.md',
  'docs/motion_cost_graph_and_adjacency_matrix.md',
  'docs/uncertainty_forecast_demo.md',
  'docs/sampling_priority_demo.md',
  'docs/flow_coupled_sampling_demo.md',
  'docs/model_stack_integration_notes.md',
  'docs/headless_node_oceanbox_runtime.md',
  'docs/headless_colab_oceanbox_schema_alignment.md',
  'docs/headless_colab_bundle_manifest.md',
  'docs/headless_bundle_loader.md',
  'src/core/headless/HeadlessCsv.js',
  'src/core/headless/HeadlessBundleLoader.js',
  'src/core/headless/HeadlessBundleValidation.js',
  'src/core/headless/HeadlessBundleViewModel.js',
  'src/core/headless/HeadlessBundleBrowserAdapter.js',
  'src/ui/headless/HeadlessBundleViewerPanel.js',
  'src/game/phaser/scenes/HeadlessBundleViewerScene.js',
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
  'src/game/phaser/scenes/FlowFieldDemoScene.js',
  'src/game/phaser/scenes/MotionPlanningDemoScene.js',
  'src/game/phaser/scenes/BathymetryWorldViewScene.js',
  'src/game/phaser/renderers/BathymetryWorldRenderer.js',
  'src/core/rendering/RendererCapabilityModel.js',
  'src/core/rendering/RendererHostContract.js',
  'src/core/rendering/OceanWorldRenderViewModel.js',
  'src/ui/rendering/RendererHostPanel.js',
  'src/game/phaser/scenes/RendererArchitecturePreviewScene.js',
  'docs/renderer_architecture_and_webgpu_strategy.md',
  'docs/bathymetric_world_view.md'
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

