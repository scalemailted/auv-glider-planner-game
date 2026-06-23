import { generateScenarioFromConfig } from '../../src/core/generation/ScenarioConfig.js';
import { getDeploymentZonesForAgent, getSelectedStart, setSelectedStart } from '../../src/core/deployment/DeploymentZones.js';
import { normalizePlan } from '../../src/core/planning/WaypointPlan.js';
import { canPlaceWaypoint } from '../../src/core/planning/WaypointPlacementGuard.js';
import { missionWorldRenderInputFromWorkspace } from '../../src/core/rendering/MissionWorldStateAdapter.js';
import { buildMissionWorldRenderViewModel } from '../../src/core/rendering/MissionWorldRenderViewModel.js';
import { augmentMissionWorldWithVolumetricModel, volumetricCurrentDebugPayload } from '../../src/core/rendering/VolumetricMissionWorldViewModel.js';
import { buildCurrentPresentationDebug } from '../../src/core/rendering/CurrentPresentationState.js';

export function createNormalGeneratedCurrentScenario(options = {}) {
  const { level, mission } = generateScenarioFromConfig({
    mode: 'perfectKnowledge',
    operationalDomainProfileId: options.operationalDomainProfileId ?? 'regionalFleetArea',
    seed: options.seed ?? 'flow-r2a4-normal-generated',
    challengeId: options.challengeId ?? 'CHALLENGE-flow-r2a4-normal-generated',
    agentCount: options.agentCount ?? 3
  });
  const activeAgentId = options.activeAgentId ?? mission.agents?.[0]?.id;
  if (!activeAgentId) throw new Error('Generated mission did not include an active glider.');
  const plan = createSingleActiveGliderPlan(level, mission, { activeAgentId, waypointCount: options.waypointCount ?? 2 });
  const state = createProductionCurrentState({ level, mission, plan, activeAgentId });
  return { level, mission, plan, state, activeAgentId };
}

export function createProductionCurrentState({ level, mission, plan, activeAgentId, phase = 'planning' } = {}) {
  return {
    level,
    mission,
    plan,
    mode: phase,
    selectedAgentId: activeAgentId ?? mission?.agents?.[0]?.id ?? null,
    challengeMode: 'perfectKnowledge',
    experienceMode: 'challenge',
    planningTime: 0,
    simTime: 0,
    ui: {
      rendererBackend: 'threeMission3d',
      legacyPhaserMissionRendererEnabled: false,
      showCurrents: true,
      threeMissionLayers: { currentVectors: true },
      waterColumn: {
        qualityProfile: 'balanced',
        activeDepthLayerId: 'thermocline',
        selectedTargetDepthLayerId: 'deep',
        selectedDiveProfileId: 'sawtoothProfile',
        currentDisplayMode: 'activeSlice',
        currentLayerMode: 'followSelectedGlider',
        currentVectorDensity: 'balanced',
        currentMagnitudeScale: 1.8,
        currentColorMode: 'speed',
        showContextCurrents: false,
        verticalDisplayMode: 'physicalDepth',
        verticalExaggeration: 1.6
      }
    }
  };
}

export function createSingleActiveGliderPlan(level, mission, options = {}) {
  const activeAgentId = options.activeAgentId ?? mission?.agents?.[0]?.id;
  const activeAgent = mission?.agents?.find((agent) => agent.id === activeAgentId);
  if (!activeAgent) throw new Error(`No active glider found for ${activeAgentId ?? 'unknown'}.`);
  const selectedStart = firstFinitePoint(
    getSelectedStart(activeAgent),
    activeAgent.start,
    activeAgent.deployment?.selectedStart,
    getDeploymentZonesForAgent(level, mission, activeAgentId)?.[0]?.cells?.[0]
  );
  if (!isFinitePoint(selectedStart)) throw new Error(`Active glider ${activeAgentId} has no finite selected start.`);

  const rawPlan = {
    schemaVersion: '2.0',
    type: 'anchor.plan',
    coordinateProfileId: 'continuousGridV1',
    fieldSamplingProfileId: 'continuousTrilinearV1',
    levelId: level?.levelId ?? null,
    missionId: mission?.missionId ?? null,
    meta: { name: 'FLOW-R2A.4 single active glider route' },
    agentPlans: (mission?.agents ?? []).map((agent) => ({
      agentId: agent.id,
      selectedStart: firstFinitePoint(getSelectedStart(agent), agent.start, agent.deployment?.selectedStart, getDeploymentZonesForAgent(level, mission, agent.id)?.[0]?.cells?.[0]) ?? null,
      diveProfileId: agent.id === activeAgentId ? 'sawtoothProfile' : (agent.diveProfileId ?? 'surfaceOnly'),
      targetDepthLayerId: agent.id === activeAgentId ? 'deep' : (agent.targetDepthLayerId ?? 'surface'),
      waypoints: []
    }))
  };
  const plan = normalizePlan(rawPlan, level, mission);
  const startSelection = setSelectedStart(level, mission, plan, activeAgentId, selectedStart);
  if (!startSelection.valid) throw new Error(`Active glider deployment start rejected: ${startSelection.message}`);
  const state = createProductionCurrentState({ level, mission, plan, activeAgentId });
  const agentPlan = plan.agentPlans.find((candidate) => candidate.agentId === activeAgentId);
  const targets = findExecutableTargets(state, activeAgentId, selectedStart, options.waypointCount ?? 2);
  for (const [index, target] of targets.entries()) {
    const placement = canPlaceWaypoint(state, activeAgentId, { ...target, action: 'sample' });
    const segmentTravelTime = Number(placement.estimate?.segment?.estimatedTravelTime ?? placement.estimate?.segment?.eta ?? 60);
    const arrivalTime = Number(placement.estimate?.arrivalTime ?? ((agentPlan.waypoints.at(-1)?.estimatedArrivalTime ?? 0) + segmentTravelTime));
    agentPlan.waypoints.push({
      id: `flow-r2a4-wp-${index + 1}`,
      x: target.x,
      y: target.y,
      action: 'sample',
      t: arrivalTime,
      estimatedArrivalTime: arrivalTime,
      segmentTravelTime,
      diveProfileId: 'sawtoothProfile',
      targetDepthLayerId: index % 2 === 0 ? 'thermocline' : 'deep',
      validationRadius: 0.65
    });
  }
  return normalizePlan(plan, level, mission);
}

export function buildNormalGeneratedCurrentViewModel(options = {}) {
  const fixture = options.fixture ?? createNormalGeneratedCurrentScenario(options);
  const input = missionWorldRenderInputFromWorkspace({ app: { state: fixture.state } }, {
    phase: options.phase ?? 'planning',
    displaySettings: {
      rendererBackend: 'threeMission3d',
      qualityProfile: 'balanced'
    }
  });
  const flat = buildMissionWorldRenderViewModel(input);
  const viewModel = augmentMissionWorldWithVolumetricModel(flat, {
    level: fixture.level,
    mission: fixture.mission,
    plan: fixture.plan,
    displaySettings: input.displaySettings,
    waterColumn: fixture.state.ui.waterColumn
  });
  const rendererSummary = options.rendererSummary ?? {
    sourceVectorSampleCount: viewModel.currentVectorSampleCount,
    finiteVectorSampleCount: viewModel.currentVectorValidCount,
    nonzeroVectorSampleCount: viewModel.currentVectorValidCount,
    visibleVectorInstanceCount: Math.max(1, viewModel.currentVectorValidCount),
    glyphInstanceCount: Math.max(1, viewModel.currentVectorValidCount),
    glyphDrawCallCount: viewModel.currentVectorValidCount > 0 ? 1 : 0
  };
  const currentDebug = volumetricCurrentDebugPayload(viewModel, rendererSummary);
  const presentationDebug = buildCurrentPresentationDebug({
    phase: options.phase ?? 'planning',
    runtimeShell: options.runtimeShell ?? 'default',
    viewModel,
    rendererSummary,
    currentDebug,
    ui: fixture.state.ui,
    layerVisibility: { currentVectors: true },
    search: options.search ?? ''
  });
  return { ...fixture, input, flat, viewModel, rendererSummary, currentDebug, presentationDebug };
}

export function summarizeIdleAgents(plan, activeAgentId) {
  return (plan?.agentPlans ?? [])
    .filter((agentPlan) => agentPlan.agentId !== activeAgentId)
    .map((agentPlan) => ({ agentId: agentPlan.agentId, waypointCount: agentPlan.waypoints?.length ?? 0 }));
}

function findExecutableTargets(state, activeAgentId, selectedStart, count) {
  const level = state.level;
  const grid = level?.world?.grid ?? {};
  const targets = [];
  const skipped = [];
  const candidates = [];
  for (let y = 0; y < Number(grid.height ?? 0); y += 1) {
    for (let x = 0; x < Number(grid.width ?? 0); x += 1) {
      if (level.layers?.terrain?.[y]?.[x]) continue;
      const distance = Math.hypot(x - Number(selectedStart.x), y - Number(selectedStart.y));
      if (distance < 2 || distance > 10) continue;
      candidates.push({ x: x + 0.35, y: y + 0.35, distance });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const candidate of candidates) {
    const placement = canPlaceWaypoint(state, activeAgentId, { x: candidate.x, y: candidate.y, action: 'sample' });
    if (!placement.allowed) {
      skipped.push(`${Math.round(candidate.x)},${Math.round(candidate.y)}:${placement.reason}`);
      continue;
    }
    if (targets.some((target) => Math.hypot(target.x - candidate.x, target.y - candidate.y) < 1.25)) continue;
    targets.push({ x: candidate.x, y: candidate.y });
    const agentPlan = state.plan.agentPlans.find((plan) => plan.agentId === activeAgentId);
    agentPlan.waypoints.push({
      id: `flow-r2a4-probe-${targets.length}`,
      x: candidate.x,
      y: candidate.y,
      action: 'sample',
      estimatedArrivalTime: Number(placement.estimate?.arrivalTime ?? targets.length * 60),
      t: Number(placement.estimate?.arrivalTime ?? targets.length * 60),
      segmentTravelTime: Number(placement.estimate?.segment?.estimatedTravelTime ?? 60)
    });
    if (targets.length >= count) break;
  }
  const agentPlan = state.plan.agentPlans.find((plan) => plan.agentId === activeAgentId);
  agentPlan.waypoints.length = 0;
  if (targets.length < count) {
    throw new Error(`Could not find ${count} executable targets for ${activeAgentId}. Skipped: ${skipped.slice(0, 12).join('; ')}`);
  }
  return targets;
}

function firstFinitePoint(...points) {
  return points.find((point) => isFinitePoint(point)) ?? null;
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
