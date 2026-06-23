import { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';
import { currentPresentationCacheSignature, currentSourceTimeFrameSignature } from '../../src/core/rendering/CurrentPresentationState.js';
import { createThreeInstancedCurrentGlyphLayer, updateThreeInstancedCurrentGlyphLayer, threeInstancedCurrentGlyphLayerSummary } from '../../src/game/three/layers/ThreeInstancedCurrentGlyphLayer.js';
import { buildSimulationWorldRenderViewModel } from '../../src/core/rendering/SimulationWorldRenderViewModel.js';
import { augmentMissionWorldWithVolumetricModel } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';
import { sampleOceanCurrent } from '../../src/core/science/OceanCurrentFieldSampler.js';
import { SimulationEngine } from '../../src/core/sim/SimulationEngine.js';
import { currentSecondsToPlanningTimelineTime } from '../../src/core/time/PlanningTimelineTimeBridge.js';

export function createFlowRuntimeR1Fixture(options = {}) {
  const fixture = createNormalGeneratedCurrentScenario({
    seed: options.seed ?? 'flow-runtime-r1-normal-generated',
    waypointCount: options.waypointCount ?? 3,
    agentCount: options.agentCount ?? 3
  });
  fixture.state.ui.waterColumn.currentDisplayMode = options.currentDisplayMode ?? 'stackedDepthField';
  fixture.state.ui.waterColumn.showContextCurrents = options.showContextCurrents ?? true;
  fixture.state.ui.waterColumn.currentVectorDensity = options.currentVectorDensity ?? 'balanced';
  fixture.state.ui.waterColumn.currentMagnitudeScale = options.currentMagnitudeScale ?? 2.8;
  fixture.state.ui.showCurrents = true;
  fixture.state.ui.threeMissionLayers.currentVectors = true;
  return fixture;
}

export function buildPlanningCurrentViewModelAt(fixture, timeSeconds) {
  fixture.state.mode = 'planning';
  fixture.state.planningTime = currentSecondsToPlanningTimelineTime(fixture.level, Number(timeSeconds) || 0, { phase: 'planning' });
  return buildNormalGeneratedCurrentViewModel({ fixture }).viewModel;
}

export function buildSimulationCurrentViewModelAt(fixture, timeSeconds, patch = {}) {
  const displaySettings = {
    rendererBackend: 'threeMission3d',
    showCurrents: true,
    currentVectors: true,
    waterColumn: { ...(fixture.state.ui.waterColumn ?? {}) }
  };
  const flat = buildSimulationWorldRenderViewModel({
    level: fixture.level,
    mission: fixture.mission,
    plan: fixture.plan,
    selectedAgentId: fixture.activeAgentId,
    activeTimeSeconds: Number(timeSeconds) || 0,
    displaySettings,
    simulationStatus: { status: patch.status ?? 'paused', running: patch.running === true, timeSeconds: Number(timeSeconds) || 0 },
    options: {
      phase: 'simulation',
      gliders: patch.gliders ?? [{ ...(fixture.mission.agents?.[0] ?? {}), agentId: fixture.activeAgentId, id: fixture.activeAgentId, x: 2, y: 2, depthMeters: 35, selected: true }],
      routes: fixture.plan.agentPlans
    }
  });
  return augmentMissionWorldWithVolumetricModel(flat, {
    level: fixture.level,
    mission: fixture.mission,
    plan: fixture.plan,
    displaySettings,
    waterColumn: displaySettings.waterColumn
  });
}

export function sourceBracketTimes(viewModel) {
  const axis = (viewModel.waterColumnExplorer?.currentCube?.timeAxisSeconds ?? []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (axis.length < 2) throw new Error('FLOW-RUNTIME-R1 requires at least two current source times.');
  const lower = axis[0];
  const upper = axis[1];
  const span = Math.max(1e-6, upper - lower);
  return {
    lower,
    upper,
    insideA: lower + span * 0.25,
    insideB: lower + span * 0.75,
    boundaryOrLater: axis[Math.min(2, axis.length - 1)]
  };
}

export function activeRenderVector(viewModel) {
  const explorer = viewModel.waterColumnExplorer ?? {};
  const activeLayerId = viewModel.currentActiveLayerId ?? explorer.activeLayerId ?? 'thermocline';
  const activeLayer = (explorer.layers ?? []).find((layer) => layer.id === activeLayerId) ?? explorer.layers?.[0] ?? null;
  return (activeLayer?.currentField?.vectors ?? []).find((vector) => vector.visible !== false && finiteVector(vector))
    ?? activeLayer?.currentField?.vectors?.find(finiteVector)
    ?? null;
}

export function canonicalSampleForRenderVector(viewModel) {
  const vector = activeRenderVector(viewModel);
  const field = viewModel.waterColumnExplorer?.currentCube ?? null;
  if (!vector || !field) return null;
  return sampleOceanCurrent({
    field,
    eastMeters: vector.eastMeters ?? vector.x,
    northMeters: vector.northMeters ?? vector.y,
    depthMeters: vector.depthMeters ?? viewModel.currentActiveDepthMeters ?? 0,
    timeSeconds: viewModel.currentPresentationTimeSeconds ?? viewModel.activeTimeSeconds ?? 0,
    interpolation: 'linear4d'
  });
}

export function currentDelta(a = {}, b = {}) {
  return Math.hypot(
    Number(a.uEastMetersPerSecond ?? a.u ?? 0) - Number(b.uEastMetersPerSecond ?? b.u ?? 0),
    Number(a.vNorthMetersPerSecond ?? a.v ?? 0) - Number(b.vNorthMetersPerSecond ?? b.v ?? 0)
  );
}

export function buildTimelineProbe(options = {}) {
  const fixture = options.fixture ?? createFlowRuntimeR1Fixture(options);
  const seedViewModel = buildPlanningCurrentViewModelAt(fixture, 0);
  const times = sourceBracketTimes(seedViewModel);
  const tA = Number(options.tA ?? times.insideA);
  const tB = Number(options.tB ?? times.insideB);
  const firstVm = buildPlanningCurrentViewModelAt(fixture, tA);
  const repeatedVm = buildPlanningCurrentViewModelAt(fixture, tA);
  const laterVm = buildPlanningCurrentViewModelAt(fixture, tB);
  const layer = createThreeInstancedCurrentGlyphLayer({ name: 'flow-runtime-r1-current-probe' });
  updateThreeInstancedCurrentGlyphLayer(layer, firstVm);
  const first = threeInstancedCurrentGlyphLayerSummary(layer, firstVm);
  updateThreeInstancedCurrentGlyphLayer(layer, repeatedVm);
  const repeated = threeInstancedCurrentGlyphLayerSummary(layer, repeatedVm);
  updateThreeInstancedCurrentGlyphLayer(layer, laterVm);
  const later = threeInstancedCurrentGlyphLayerSummary(layer, laterVm);
  const firstSample = canonicalSampleForRenderVector(firstVm);
  const laterSample = canonicalSampleForRenderVector(laterVm);
  return {
    fixture,
    times,
    tA,
    tB,
    firstVm,
    repeatedVm,
    laterVm,
    first,
    repeated,
    later,
    firstSample,
    laterSample,
    sampleDelta: currentDelta(firstSample, laterSample),
    firstCacheSignature: currentPresentationCacheSignature(firstVm),
    laterCacheSignature: currentPresentationCacheSignature(laterVm),
    firstSourceTimeFrameSignature: currentSourceTimeFrameSignature(firstVm),
    laterSourceTimeFrameSignature: currentSourceTimeFrameSignature(laterVm),
    sameSourceBracket: firstSample?.lowerTimeSeconds === laterSample?.lowerTimeSeconds && firstSample?.upperTimeSeconds === laterSample?.upperTimeSeconds,
    interpolationFractionChanged: firstSample?.timeInterpolationFraction !== laterSample?.timeInterpolationFraction,
    currentFieldDigestStable: firstVm.waterColumnExplorer?.currentFieldSummary?.digest === laterVm.waterColumnExplorer?.currentFieldSummary?.digest,
    cameraOnlySignatureStable: currentPresentationCacheSignature({ ...firstVm, cameraState: { preset: 'waterColumnProfile', manual: true } }) === currentPresentationCacheSignature(firstVm)
  };
}

export function buildSimulationTimeProbe(options = {}) {
  const fixture = options.fixture ?? createFlowRuntimeR1Fixture(options);
  const seedVm = buildPlanningCurrentViewModelAt(fixture, 0);
  const times = sourceBracketTimes(seedVm);
  const timeSeconds = Number(options.timeSeconds ?? times.insideB);
  const viewModel = buildSimulationCurrentViewModelAt(fixture, timeSeconds, { running: options.running === true });
  const sample = canonicalSampleForRenderVector(viewModel);
  return { fixture, times, timeSeconds, viewModel, sample };
}

export function buildCameraInvarianceProbe(options = {}) {
  const probe = buildTimelineProbe(options);
  const layer = createThreeInstancedCurrentGlyphLayer({ name: 'flow-runtime-r1-camera-invariance' });
  updateThreeInstancedCurrentGlyphLayer(layer, probe.firstVm);
  const before = threeInstancedCurrentGlyphLayerSummary(layer, probe.firstVm);
  const cameraOnly = { ...probe.firstVm, cameraState: { preset: 'sideProfile', manual: true, azimuthRadians: 0.4, polarRadians: 1.1 } };
  updateThreeInstancedCurrentGlyphLayer(layer, cameraOnly);
  const after = threeInstancedCurrentGlyphLayerSummary(layer, cameraOnly);
  return { before, after, cacheSignatureStable: currentPresentationCacheSignature(cameraOnly) === currentPresentationCacheSignature(probe.firstVm) };
}

export function buildGliderRenderPhysicsParityProbe(options = {}) {
  const fixture = createFlowRuntimeR1Fixture({ seed: options.seed ?? 'flow-runtime-r1-glider-parity', waypointCount: 3 });
  const engine = new SimulationEngine({ level: fixture.level, mission: fixture.mission, plan: fixture.plan, time: 0 });
  const agent = engine.agents.find((candidate) => candidate.id === fixture.activeAgentId) ?? engine.agents[0];
  const before = { x: agent.x, y: agent.y, depthMeters: agent.depthMeters ?? 0, timeSeconds: engine.t };
  engine.stepOnce();
  const afterAgent = engine.agents.find((candidate) => candidate.id === agent.id) ?? agent;
  const sampled = engine.world.lastVolumetricCurrentSample ?? null;
  const applied = afterAgent.currentVector ?? null;
  const viewModel = buildSimulationCurrentViewModelAt(fixture, before.timeSeconds, {
    gliders: [{ ...(fixture.mission.agents?.[0] ?? {}), agentId: afterAgent.id, id: afterAgent.id, x: before.x, y: before.y, depthMeters: before.depthMeters, selected: true }]
  });
  const rendered = canonicalSampleForRenderVector(viewModel);
  return {
    fixture,
    before,
    engineTimeAfterStep: engine.t,
    applied,
    sampled,
    rendered,
    appliedSampleDelta: currentDelta({ u: applied?.u, v: applied?.v }, sampled),
    renderSampleDelta: currentDelta(rendered, sampled),
    displayChangesPhysics: false,
    rendererOwnsCurrent: false
  };
}

export function finiteVector(vector = {}) {
  return Number.isFinite(Number(vector.uEastMetersPerSecond ?? vector.u))
    && Number.isFinite(Number(vector.vNorthMetersPerSecond ?? vector.v));
}
