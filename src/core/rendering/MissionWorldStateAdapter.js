import { getPlanningFrame } from '../sim/ChallengeMode.js';
import { getFrameAtTime, getWindowForTime } from '../time/MissionTime.js';
import { sampleCurrentField } from '../currents/CurrentFieldSampler.js';
import { getDeploymentZonesForAgent, getSelectedStart } from '../deployment/DeploymentZones.js';
import { getActivePriorityTargets } from '../sim/PriorityTargets.js';
import { getMobileHazardsAtTime } from '../sim/MobileHazards.js';
import { computePlannedCoverage, computeTravelCostField, getCellRoiDisplayValue, normalizeRoiMode } from '../roi/RoiMode.js';
import { normalizeContinuousScienceTarget } from '../science/ContinuousScienceTarget.js';

export const MISSION_WORLD_STATE_ADAPTER_VERSION = 'mission-world-state-adapter-three-r1-1';

export function missionWorldRenderInputFromWorkspace(scene, options = {}) {
  const state = scene?.app?.state ?? scene?.state ?? {};
  return missionWorldRenderInputFromState(state, {
    ...options,
    phase: 'planning',
    selectedCell: state.ui?.hoverCell ?? null
  });
}

export function missionWorldRenderInputFromSimulation(scene, options = {}) {
  const state = scene?.app?.state ?? scene?.state ?? {};
  return missionWorldRenderInputFromState(state, {
    ...options,
    phase: 'simulation',
    simulationState: options.simulationState ?? (scene?.engine ? { running: scene.engine.running === true, timeSeconds: scene.engine.t ?? 0 } : state.simulationState ?? null),
    motionTrajectory: state.motionTrajectory ?? state.result?.motionTrajectory ?? null
  });
}

export function missionWorldRenderInputFromReplay(replayState = {}, options = {}) {
  const publicState = replayState.publicState ?? replayState.currentState ?? replayState;
  return {
    adapterVersion: MISSION_WORLD_STATE_ADAPTER_VERSION,
    phase: 'replay',
    level: publicState.level ?? replayState.level ?? null,
    mission: publicState.mission ?? replayState.mission ?? null,
    plan: publicState.plan ?? replayState.plan ?? null,
    selectedAgentId: options.selectedAgentId ?? replayState.selectedAgentId ?? publicState.selectedAgentId ?? null,
    selectedWaypointId: options.selectedWaypointId ?? null,
    selectedMarkerId: options.selectedMarkerId ?? null,
    selectedPriorityTargetId: options.selectedPriorityTargetId ?? null,
    selectedScienceTargetId: options.selectedScienceTargetId ?? replayState.selectedScienceTargetId ?? publicState.selectedScienceTargetId ?? null,
    activeTimeSeconds: Number(replayState.timeSeconds ?? publicState.timeSeconds ?? 0) || 0,
    displaySettings: { ...(options.displaySettings ?? {}), rendererBackend: options.rendererBackend ?? 'threeMission3d' },
    visibilityTier: options.visibilityTier ?? 'fair',
    options: { phase: 'replay', warnings: ['Replay adapter uses recorded public replay state only; it does not own replay semantics.'] }
  };
}

export function missionWorldRenderInputSummary(input = {}) {
  return {
    type: 'anchor.rendering.mission-world-input-summary',
    version: MISSION_WORLD_STATE_ADAPTER_VERSION,
    phase: input.phase ?? input.options?.phase ?? null,
    levelId: input.level?.levelId ?? null,
    operationalDomainId: input.level?.operationalDomain?.domainId ?? input.level?.world?.operationalDomain?.domainId ?? null,
    resolutionProfileId: input.level?.resolutionProfile?.profileId ?? input.level?.world?.resolutionProfile?.profileId ?? null,
    missionId: input.mission?.missionId ?? null,
    activeTimeSeconds: finiteNumber(input.activeTimeSeconds),
    selectedAgentId: input.selectedAgentId ?? null,
    selectedWaypointId: input.selectedWaypointId ?? null,
    selectedMarkerId: input.selectedMarkerId ?? null,
    selectedPriorityTargetId: input.selectedPriorityTargetId ?? null,
    dropZoneCount: input.options?.dropZones?.length ?? 0,
    gliderCount: input.options?.gliders?.length ?? input.mission?.agents?.length ?? 0,
    waypointCount: (input.options?.waypoints ?? []).length,
    routeCount: input.options?.routes?.length ?? input.plan?.agentPlans?.filter((agentPlan) => agentPlan.waypoints?.length).length ?? 0,
    planningMarkerCount: input.planningMarkers?.length ?? input.plan?.planningMarkers?.length ?? 0,
    priorityTargetCount: input.options?.priorityTargets?.length ?? 0,
    scienceTargetCount: input.options?.scienceTargets?.length ?? input.scienceTargets?.length ?? input.plan?.scienceTargets?.length ?? 0,
    currentVectorCount: input.currentField?.vectors?.length ?? 0,
    hiddenTruthExcluded: input.options?.includesHiddenTruth !== true,
    ownsSimulationState: false,
    ownsPlanning: false,
    ownsScoring: false
  };
}

function missionWorldRenderInputFromState(state = {}, options = {}) {
  const level = state.level ?? options.level ?? null;
  const mission = state.mission ?? options.mission ?? null;
  const plan = state.plan ?? options.plan ?? null;
  const activeTimeSeconds = finiteNumber(options.activeTimeSeconds ?? state.planningTime ?? state.simTime ?? 0);
  const challengeMode = state.challengeMode ?? options.challengeMode ?? 'perfectKnowledge';
  const revealTruth = state.ui?.revealTruth === true && options.allowHiddenTruth === true;
  const frame = options.frame ?? getPlanningFrame(level, activeTimeSeconds, {
    challengeMode,
    revealTruth,
    forecastMemberId: state.ui?.forecastMemberId ?? null
  });
  const grid = level?.world?.grid ?? { width: frame?.roi?.[0]?.length ?? 10, height: frame?.roi?.length ?? 10 };
  const selectedAgentId = options.selectedAgentId ?? state.selectedAgentId ?? mission?.agents?.[0]?.id ?? null;
  const selectedWaypointId = selectedWaypointIdentity(state.ui?.selectedWaypoint);
  const selectedMarkerId = selectedMarkerIdentity(state.ui?.selectedMarker, plan);
  const selectedPriorityTargetId = state.ui?.selectedPriorityTargetId ?? null;
  const selectedScienceTargetId = state.ui?.selectedScienceTargetId ?? null;
  const selectedWindow = state.selectedWindow ?? getWindowForTime(level, activeTimeSeconds);
  const displaySettings = normalizeDisplaySettings(state.ui, options.displaySettings);
  const sampleField = buildSampleField({ level, mission, plan, frame, state, selectedAgentId, selectedWaypoint: state.ui?.selectedWaypoint, activeTimeSeconds, displaySettings });
  const currentField = buildCurrentVectorLayer({ level, frame, grid, activeTimeSeconds, stride: options.currentVectorStride });
  const dropZones = buildDropZones(level, mission);
  const selectedStarts = buildSelectedStarts(mission);
  const gliders = buildGliders({ mission, state, selectedAgentId });
  const waypoints = buildWaypointList(plan);
  const routes = buildRouteList(plan, mission);
  const planningMarkers = (plan?.planningMarkers ?? []).map((marker) => ({ ...marker, executable: false }));
  const scienceTargets = buildScienceTargetList(plan, selectedScienceTargetId);
  const priorityTargets = getActivePriorityTargets(level, activeTimeSeconds).map((target) => ({
    ...target,
    x: target.position?.x,
    y: target.position?.y,
    active: true,
    claimed: Boolean(state.result?.summary?.priorityTargets?.capturedIds?.includes?.(target.id)),
    timeSeconds: activeTimeSeconds
  }));
  const staticHazards = buildStaticHazards(level);
  const mobileHazards = getMobileHazardsAtTime(level, activeTimeSeconds).map((hazard, index) => ({ id: hazard.id ?? `mobile-hazard-${index + 1}`, x: hazard.x, y: hazard.y, radius: hazard.radius ?? 1, value: 1, mobile: true }));
  return {
    adapterVersion: MISSION_WORLD_STATE_ADAPTER_VERSION,
    phase: options.phase ?? state.mode ?? 'planning',
    appState: state,
    level,
    mission,
    plan,
    selectedAgentId,
    selectedWaypointId,
    selectedMarkerId,
    selectedPriorityTargetId,
    selectedScienceTargetId,
    selectedCell: options.selectedCell ?? state.ui?.hoverCell ?? null,
    planningMarkers,
    scienceTargets,
    activeTimeSeconds,
    planningWindow: { index: selectedWindow, startTimeSeconds: selectedWindowStart(level, selectedWindow), durationSeconds: level?.world?.time?.planningWindow ?? null },
    fieldState: { frameSource: frame?.source ?? null, frameTimeSeconds: frame?.t ?? activeTimeSeconds, challengeMode, roiViewMode: displaySettings.roiViewMode },
    currentField,
    sampleField,
    forecastState: frame?.source === 'forecast' ? { values: sampleField.values } : null,
    beliefState: state.beliefState ?? null,
    uncertaintyState: frame?.uncertainty ? { values: frame.uncertainty } : null,
    motionTrajectory: options.motionTrajectory ?? state.motionTrajectory ?? state.result?.motionTrajectory ?? null,
    simulationState: options.simulationState ?? state.simulationState ?? null,
    displaySettings,
    visibilityTier: options.visibilityTier ?? (revealTruth ? 'oracle' : 'fair'),
    options: {
      phase: options.phase ?? state.mode ?? 'planning',
      dropZones,
      selectedStarts,
      gliders,
      waypoints,
      routes,
      planningMarkers,
      scienceTargets,
      priorityTargets,
      hazards: [...staticHazards, ...mobileHazards],
      constraints: level?.layers?.terrain ?? [],
      observations: state.result?.events?.filter?.((event) => event.type === 'sample' || event.type === 'duplicateSample') ?? [],
      surfacingEvents: state.result?.events?.filter?.((event) => /surface/i.test(event.type ?? '')) ?? [],
      includesHiddenTruth: revealTruth === true,
      allowHiddenTruth: revealTruth === true,
      guidance: state.ui?.overlayDebug ?? null
    }
  };
}

function normalizeDisplaySettings(ui = {}, patch = {}) {
  return {
    rendererBackend: ui.rendererBackend ?? 'legacyPhaser2d',
    cameraPreset: ui.threeMissionCameraPreset ?? 'obliqueMission',
    scalarFieldId: patch.scalarFieldId ?? ui.scalarFieldId ?? (ui.roiViewMode === 'remaining' ? 'remainingSampleValue' : 'sampleValue'),
    roiViewMode: normalizeRoiMode(ui.roiViewMode),
    showROI: ui.showROI !== false,
    showCurrents: ui.showCurrents !== false,
    showHazards: ui.showHazards !== false,
    showTerrain: ui.showTerrain !== false,
    showPlanningMarkers: ui.showPlanningMarkers !== false,
    showPriorityStars: ui.showPriorityStars !== false,
    bathymetry: ui.threeMissionLayers?.bathymetry !== false,
    waterSurface: ui.threeMissionLayers?.waterSurface !== false,
    depthLayers: ui.threeMissionLayers?.depthLayers !== false,
    dropZones: ui.threeMissionLayers?.dropZones !== false,
    gliders: ui.threeMissionLayers?.gliders !== false,
    waypoints: ui.threeMissionLayers?.waypoints !== false,
    routes: ui.threeMissionLayers?.routes !== false,
    planningMarkers: ui.threeMissionLayers?.planningMarkers !== false,
    priorityTargets: ui.threeMissionLayers?.priorityTargets !== false,
    samplingTargets: ui.threeMissionLayers?.samplingTargets !== false,
    scalarOpacity: patch.scalarOpacity ?? 0.72,
    ...(patch ?? {}),
    waterColumn: {
      verticalDisplayMode: ui.waterColumn?.verticalDisplayMode ?? patch.waterColumn?.verticalDisplayMode ?? 'physicalDepth',
      activeDepthLayerId: ui.waterColumn?.activeDepthLayerId ?? patch.waterColumn?.activeDepthLayerId ?? 'thermocline',
      hiddenLayerIds: ui.waterColumn?.hiddenLayerIds ?? patch.waterColumn?.hiddenLayerIds ?? [],
      visibleLayerIds: ui.waterColumn?.visibleLayerIds ?? patch.waterColumn?.visibleLayerIds ?? null,
      globalOpacity: ui.waterColumn?.globalOpacity ?? patch.waterColumn?.globalOpacity ?? 0.26,
      activeLayerEmphasis: ui.waterColumn?.activeLayerEmphasis ?? patch.waterColumn?.activeLayerEmphasis ?? 1.85,
      selectedScalarFieldId: ui.waterColumn?.selectedScalarFieldId ?? patch.waterColumn?.selectedScalarFieldId ?? patch.scalarFieldId ?? 'sampleValue',
      currentDisplayMode: ui.waterColumn?.currentDisplayMode ?? patch.waterColumn?.currentDisplayMode ?? 'activeLayerOnly',
      fieldDisplayMode: ui.waterColumn?.fieldDisplayMode ?? patch.waterColumn?.fieldDisplayMode ?? (ui.waterColumn?.showFieldOnAllLayers === true || patch.waterColumn?.showFieldOnAllLayers === true ? 'allLayers' : 'activeLayerOnly'),
      showFieldOnAllLayers: ui.waterColumn?.showFieldOnAllLayers === true || patch.waterColumn?.showFieldOnAllLayers === true,
      qualityProfile: ui.waterColumn?.qualityProfile ?? ui.threeMissionQualityProfile ?? patch.waterColumn?.qualityProfile ?? patch.qualityProfile ?? 'balanced',
      selectedDiveProfileId: ui.waterColumn?.selectedDiveProfileId ?? patch.waterColumn?.selectedDiveProfileId ?? null,
      selectedTargetDepthLayerId: ui.waterColumn?.selectedTargetDepthLayerId ?? patch.waterColumn?.selectedTargetDepthLayerId ?? null,
      maximumDiveDepthMeters: ui.waterColumn?.maximumDiveDepthMeters ?? patch.waterColumn?.maximumDiveDepthMeters ?? null,
      cycleCount: ui.waterColumn?.cycleCount ?? patch.waterColumn?.cycleCount ?? null,
      sampleIntervalSeconds: ui.waterColumn?.sampleIntervalSeconds ?? patch.waterColumn?.sampleIntervalSeconds ?? null,
      verticalExaggeration: ui.waterColumn?.verticalExaggeration ?? patch.waterColumn?.verticalExaggeration ?? 1
    }
  };
}

function buildSampleField({ level, mission, plan, frame, state, selectedAgentId, selectedWaypoint, activeTimeSeconds, displaySettings }) {
  const grid = level?.world?.grid ?? { width: frame?.roi?.[0]?.length ?? 0, height: frame?.roi?.length ?? 0 };
  const mode = normalizeRoiMode(displaySettings.roiViewMode);
  const coverage = mode === 'remaining' ? computePlannedCoverage(plan, mission, level) : null;
  const travelCostField = mode === 'travelCost'
    ? computeTravelCostField({ level, mission, plan, frame, selectedAgentId, selectedWaypoint, planningAnchor: state.ui?.planningAnchor, t: activeTimeSeconds })
    : null;
  const values = Array.from({ length: grid.height ?? 0 }, (_, y) => Array.from({ length: grid.width ?? 0 }, (_, x) => {
    if (level?.layers?.terrain?.[y]?.[x]) return null;
    const display = getCellRoiDisplayValue({
      cell: frame?.roi?.[y]?.[x] ?? 0,
      x,
      y,
      t: activeTimeSeconds,
      mode,
      plan,
      mission,
      level,
      frame,
      coverage,
      selectedAgentId,
      selectedWaypoint,
      planningAnchor: state.ui?.planningAnchor,
      travelCostField
    });
    return Number.isFinite(Number(display?.value)) ? Number(display.value) : 0;
  }));
  return { id: mode === 'remaining' ? 'remainingSampleValue' : 'sampleValue', values, timeSeconds: activeTimeSeconds, sourceVisibility: frame?.source === 'truth' && state.challengeMode === 'forecast' ? 'oracle' : 'publicScenario' };
}

function buildCurrentVectorLayer({ level, frame, grid, activeTimeSeconds, stride = null }) {
  const width = Number(grid?.width ?? 0);
  const height = Number(grid?.height ?? 0);
  const step = Math.max(1, Number(stride ?? (width * height >= 1600 ? 3 : width * height >= 625 ? 2 : 1)) || 1);
  const vectors = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const vector = sampleCurrentField({ frame, grid: { width, height }, level, terrain: level?.layers?.terrain, x, y });
      if (Number(vector.magnitude ?? Math.hypot(vector.u, vector.v)) < 0.02) continue;
      vectors.push({ id: `current-${x}-${y}`, x, y, z: 0, u: round(vector.u), v: round(vector.v), magnitude: round(vector.magnitude ?? Math.hypot(vector.u, vector.v)), timeSeconds: activeTimeSeconds, sourceVisibility: 'publicScenario' });
    }
  }
  return { id: 'currentVectors', vectors, timeSeconds: activeTimeSeconds };
}

function buildDropZones(level, mission) {
  const byId = new Map();
  for (const agent of mission?.agents ?? []) {
    for (const zone of getDeploymentZonesForAgent(level, mission, agent.id)) {
      const current = byId.get(zone.id) ?? {
        ...zone,
        id: zone.id,
        label: zone.label ?? zone.id,
        agentIds: [],
        allowedAgentIds: [],
        selectedStart: null,
        selectedCell: null,
        selectedAgentId: null,
        status: 'available',
        visible: true,
        source: 'DeploymentZones.getDeploymentZonesForAgent'
      };
      if (!current.allowedAgentIds.includes(agent.id)) current.allowedAgentIds.push(agent.id);
      if (!current.agentIds.includes(agent.id)) current.agentIds.push(agent.id);
      const selected = getSelectedStart(agent);
      if (selected && zone.cells?.some((cell) => cell.x === selected.x && cell.y === selected.y)) {
        current.selectedStart = { ...selected, agentId: agent.id };
        current.selectedCell = { x: selected.x, y: selected.y };
        current.selectedAgentId = agent.id;
        current.status = 'selected';
      }
      byId.set(zone.id, current);
    }
  }
  return [...byId.values()].map((zone) => ({
    ...zone,
    center: zone.center ?? centerOfCells(zone.cells ?? []),
    boundary: zone.boundary ?? boundaryFromCells(zone.cells ?? []),
    validCellCount: (zone.cells ?? []).length
  }));
}

function centerOfCells(cells = []) {
  if (!cells.length) return null;
  const sum = cells.reduce((acc, cell) => ({ x: acc.x + Number(cell.x), y: acc.y + Number(cell.y) }), { x: 0, y: 0 });
  return { x: Number((sum.x / cells.length).toFixed(3)), y: Number((sum.y / cells.length).toFixed(3)) };
}

function boundaryFromCells(cells = []) {
  if (!cells.length) return [];
  const xs = cells.map((cell) => Number(cell.x));
  const ys = cells.map((cell) => Number(cell.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) + 1;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) + 1;
  return [{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }];
}

function buildSelectedStarts(mission) {
  return (mission?.agents ?? []).map((agent) => {
    const start = getSelectedStart(agent) ?? agent.start;
    if (!start) return null;
    return { id: `${agent.id}-selected-start`, agentId: agent.id, x: start.x, y: start.y, label: agent.label ?? agent.id };
  }).filter(Boolean);
}

function buildGliders({ mission, state, selectedAgentId }) {
  return (mission?.agents ?? []).map((agent) => {
    const surfaced = (state.surfacedAgents ?? []).find((candidate) => candidate.id === agent.id);
    const start = surfaced ?? getSelectedStart(agent) ?? agent.start ?? agent.deployment?.selectedStart ?? { x: 0, y: 0 };
    return { ...agent, agentId: agent.id, x: start.x, y: start.y, depthMeters: surfaced?.depthMeters ?? 0, status: surfaced ? 'surfaced' : 'ready', selected: agent.id === selectedAgentId };
  });
}

function buildWaypointList(plan) {
  return (plan?.agentPlans ?? []).flatMap((agentPlan) => (agentPlan.waypoints ?? []).map((waypoint, index) => ({ ...waypoint, agentId: agentPlan.agentId, index })));
}

function buildScienceTargetList(plan, selectedScienceTargetId = null) {
  return (plan?.scienceTargets ?? []).map((target) => {
    const normalized = normalizeContinuousScienceTarget(target);
    return {
      ...normalized,
      targetId: normalized.id,
      x: normalized.position.x,
      y: normalized.position.y,
      depthMeters: normalized.position.depthMeters,
      z: -normalized.position.depthMeters,
      selected: normalized.id === selectedScienceTargetId,
      executable: false,
      navigationAuthority: false,
      scoreAuthority: false
    };
  });
}

function buildRouteList(plan, mission = null) {
  return (plan?.agentPlans ?? [])
    .filter((agentPlan) => (agentPlan.waypoints ?? []).length)
    .map((agentPlan) => {
      const agent = (mission?.agents ?? []).find((candidate) => candidate.id === agentPlan.agentId || candidate.agentId === agentPlan.agentId);
      const selectedStart = agentPlan.selectedStart ?? agentPlan.start ?? agentPlan.deployment?.selectedStart ?? getSelectedStart(agent) ?? agent?.start ?? null;
      const startPoint = isFiniteCell(selectedStart)
        ? [{ id: `${agentPlan.agentId}-surface-start`, waypointId: `${agentPlan.agentId}-surface-start`, x: Number(selectedStart.x), y: Number(selectedStart.y), routeBoundary: 'deploymentStart' }]
        : [];
      return { id: `${agentPlan.agentId}-planned-route`, agentId: agentPlan.agentId, points: [...startPoint, ...(agentPlan.waypoints ?? [])], status: 'planned' };
    });
}

function isFiniteCell(cell) {
  return Number.isFinite(Number(cell?.x)) && Number.isFinite(Number(cell?.y));
}

function buildStaticHazards(level) {
  const hazards = [];
  const grid = level?.world?.grid ?? { width: 0, height: 0 };
  for (let y = 0; y < (grid.height ?? 0); y += 1) {
    for (let x = 0; x < (grid.width ?? 0); x += 1) {
      if (Number(level?.layers?.hazards?.[y]?.[x] ?? 0) > 0) hazards.push({ id: `hazard-${x}-${y}`, x, y, value: Number(level.layers.hazards[y][x]), radius: 0.5 });
    }
  }
  return hazards;
}

function selectedMarkerIdentity(selectedMarker, plan) {
  if (!selectedMarker) return null;
  if (selectedMarker.markerId) return selectedMarker.markerId;
  const index = Number(selectedMarker.index);
  if (Number.isInteger(index)) {
    const marker = plan?.planningMarkers?.[index];
    return marker?.markerId ?? marker?.id ?? String(index);
  }
  return null;
}

function selectedWaypointIdentity(selectedWaypoint) {
  if (!selectedWaypoint) return null;
  if (selectedWaypoint.waypointId) return selectedWaypoint.waypointId;
  if (selectedWaypoint.agentId && Number.isFinite(Number(selectedWaypoint.index))) return `${selectedWaypoint.agentId}:${Number(selectedWaypoint.index)}`;
  return null;
}

function selectedWindowStart(level, windowIndex) {
  const duration = Number(level?.world?.time?.planningWindow ?? level?.world?.time?.dt ?? 1) || 1;
  return Math.max(0, Number(windowIndex ?? 0) * duration);
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function round(value, digits = 4) {
  return Number(Number(value).toFixed(digits));
}
