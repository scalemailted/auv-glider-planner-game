import { buildMissionRouteSegments } from '../planning/MissionRouteSegment.js';
import { SEGMENT_ARRIVAL_BEHAVIORS, SEGMENT_FLIGHT_PROFILE_CHOICES, SEGMENT_SAMPLING_PHASES } from '../planning/SegmentFlightPlan.js';
import { waterColumnLayerMetadata, waterColumnLayerOptions } from '../science/WaterColumnSchema.js';

export const RIGHT_WAYPOINT_SEGMENT_EDITOR_VIEW_MODEL_VERSION = 'right-waypoint-segment-editor-dive-ux-r1';

export function buildRightWaypointSegmentEditorViewModel(options = {}) {
  const state = options.state ?? {};
  const level = options.level ?? state.level ?? null;
  const mission = options.mission ?? state.mission ?? null;
  const plan = options.plan ?? state.plan ?? null;
  const agentId = options.agentId ?? state.selectedAgentId ?? mission?.agents?.[0]?.id ?? null;
  const agentPlan = (plan?.agentPlans ?? []).find((candidate) => candidate.agentId === agentId) ?? null;
  const routeSegments = buildMissionRouteSegments(plan, { level, mission, waterColumnConfig: mission?.waterColumnConfig ?? level?.world?.waterColumnConfig });
  const selectedWaypoint = state.ui?.selectedWaypoint?.agentId === agentId ? state.ui.selectedWaypoint : null;
  const selectedIndex = Number.isInteger(Number(selectedWaypoint?.index)) ? Number(selectedWaypoint.index) : null;
  const draft = state.ui?.selectedSegmentFlightPlanDraft ?? null;
  const waterColumnConfig = mission?.waterColumnConfig ?? mission?.world?.waterColumnConfig ?? level?.world?.waterColumnConfig ?? {};
  const layerIds = waterColumnConfig.depthLayerIds ?? waterColumnConfig.defaultLayerIds ?? ['surface'];
  const targetLayerOptions = waterColumnLayerOptions().filter((layer) => layerIds.includes(layer.id));
  const rows = (agentPlan?.waypoints ?? []).map((waypoint, index) => {
    const segment = routeSegments.find((candidate) => candidate.agentId === agentId && candidate.target?.id === waypoint.id)
      ?? routeSegments.find((candidate) => candidate.agentId === agentId && Number(candidate.sequenceIndex) === index)
      ?? null;
    const selected = selectedIndex === index;
    const rowDraft = selected && draft?.agentId === agentId && draft?.waypointId === waypoint.id ? draft : null;
    const flightPlan = rowDraft?.flightPlan ?? segment?.flightProfile ?? null;
    const validation = rowDraft?.validation ?? (flightPlan?.feasibility ? { status: flightPlan.feasibilityStatus, warnings: flightPlan.warnings ?? [], errors: [] } : null);
    return {
      type: 'anchor.ui.right-waypoint-segment-editor-row',
      version: RIGHT_WAYPOINT_SEGMENT_EDITOR_VIEW_MODEL_VERSION,
      agentId,
      waypoint,
      waypointId: waypoint.id ?? null,
      waypointIndex: index,
      waypointLabel: `W${index + 1}`,
      selected,
      expanded: selected,
      incomingSegmentLabel: incomingSegmentLabel(index),
      incomingFromLabel: index === 0 ? 'Selected Start' : `W${index}`,
      incomingToLabel: `W${index + 1}`,
      segmentId: segment?.id ?? null,
      routeSegment: segment,
      canonicalFlightPlan: segment?.flightProfile ?? null,
      flightPlan,
      draft: rowDraft,
      draftDirty: rowDraft?.dirty === true,
      validation,
      predictionSummary: predictionSummary(segment, flightPlan, { level, mission, waterColumnConfig }),
      warningCount: warningRecords(segment, flightPlan, validation).filter((warning) => warning.severity !== 'error').length,
      errorCount: warningRecords(segment, flightPlan, validation).filter((warning) => warning.severity === 'error').length,
      warnings: warningRecords(segment, flightPlan, validation)
    };
  });
  const selectedRow = rows.find((row) => row.selected) ?? null;
  return {
    type: 'anchor.ui.right-waypoint-segment-editor-view-model',
    version: RIGHT_WAYPOINT_SEGMENT_EDITOR_VIEW_MODEL_VERSION,
    selectedGliderId: agentId,
    selectedWaypointId: selectedRow?.waypointId ?? null,
    selectedWaypointIndex: selectedRow?.waypointIndex ?? null,
    selectedSegmentId: selectedRow?.segmentId ?? null,
    selectedSegmentLabel: selectedRow?.incomingSegmentLabel ?? null,
    routeSegmentCount: routeSegments.filter((segment) => segment.agentId === agentId).length,
    rows,
    profileOptions: SEGMENT_FLIGHT_PROFILE_CHOICES,
    targetLayerOptions,
    samplingPhaseOptions: SEGMENT_SAMPLING_PHASES,
    arrivalBehaviorOptions: SEGMENT_ARRIVAL_BEHAVIORS,
    draftDirty: draft?.dirty === true,
    canonicalOwnership: 'core-planning',
    uiOwnsFlightPlan: false,
    rendererOwnsFlightPlan: false
  };
}

export function rightWaypointSegmentEditorDebugPayload(viewModel = {}, commandState = {}) {
  const selected = (viewModel.rows ?? []).find((row) => row.selected) ?? null;
  const flightPlan = selected?.flightPlan ?? null;
  const draft = selected?.draft ?? null;
  const prediction = selected?.predictionSummary ?? null;
  const warnings = selected?.warnings ?? [];
  return {
    version: RIGHT_WAYPOINT_SEGMENT_EDITOR_VIEW_MODEL_VERSION,
    selectedGliderId: viewModel.selectedGliderId ?? null,
    selectedWaypointId: selected?.waypointId ?? null,
    selectedSegmentId: selected?.segmentId ?? null,
    selectedSegmentFromId: selected?.routeSegment?.source?.id ?? null,
    selectedSegmentToId: selected?.routeSegment?.target?.id ?? null,
    selectedSegmentLabel: selected?.incomingSegmentLabel ?? null,
    canonicalFlightPlan: selected?.canonicalFlightPlan ?? null,
    draftFlightPlan: draft?.flightPlan ?? null,
    draftDirty: draft?.dirty === true,
    draftValidationStatus: draft?.validation?.status ?? selected?.validation?.status ?? null,
    lastCommand: commandState.lastCommand ?? null,
    commandDispatchCount: Number(commandState.commandDispatchCount ?? 0),
    duplicateDispatchCount: Number(commandState.duplicateDispatchCount ?? 0),
    profilePreset: flightPlan?.profileId ?? null,
    targetDepthLayerId: flightPlan?.targetDepthLayerId ?? null,
    targetDepthMeters: flightPlan?.targetDepthMeters ?? null,
    maxImmersionMeters: flightPlan?.maximumImmersionMeters ?? null,
    yoCycles: flightPlan?.cycleCount ?? null,
    sampleIntervalSeconds: flightPlan?.sampleIntervalSeconds ?? null,
    samplingPhase: flightPlan?.samplingPhase ?? null,
    arrivalBehavior: flightPlan?.arrivalBehavior ?? null,
    predictionSummary: prediction,
    warningCount: selected?.warningCount ?? 0,
    errorCount: selected?.errorCount ?? 0,
    rightPanelExpandedWaypointId: selected?.waypointId ?? null,
    rightPanelEditorVisible: Boolean(selected),
    canonicalOwnership: 'core-planning',
    uiOwnsFlightPlan: false,
    rendererOwnsFlightPlan: false,
    warnings,
    failures: warnings.filter((warning) => warning.severity === 'error').map((warning) => warning.message)
  };
}

function incomingSegmentLabel(index) {
  return index === 0 ? 'Selected Start -> W1' : `W${index} -> W${index + 1}`;
}

function predictionSummary(segment = null, flightPlan = null, context = {}) {
  const fallback = fallbackPredictionSummary(segment, flightPlan);
  if (!segment || !flightPlan) return fallback;
  try {
    const agent = (context.mission?.agents ?? []).find((candidate) => String(candidate.id ?? candidate.agentId) === String(segment.agentId));
    const planned = buildPlannedDiveSegmentViewModel({
      level: context.level,
      waterColumnConfig: context.waterColumnConfig,
      startWaypoint: endpointPoint(segment.source, 'segment-start'),
      targetWaypoint: endpointPoint(segment.target, 'segment-target'),
      segmentId: segment.id,
      routeSegmentId: segment.id,
      agentId: segment.agentId,
      segmentIndex: segment.sequenceIndex,
      segmentFlightPlan: flightPlan,
      diveProfileId: flightPlan.profileId,
      targetDepthLayerId: flightPlan.targetDepthLayerId,
      requestedMaximumDepthMeters: flightPlan.maximumImmersionMeters ?? flightPlan.targetDepthMeters,
      sampleIntervalSeconds: flightPlan.sampleIntervalSeconds,
      cycleCount: flightPlan.cycleCount,
      horizontalSpeedMetersPerSecond: agent?.maxSpeed ?? agent?.speed,
      vehicleDepthRatingMeters: agent?.maxDepthMeters ?? agent?.depthRatingMeters,
      verticalSpeedMetersPerSecond: context.mission?.physics?.verticalSpeedMetersPerSecond,
      requiredBottomClearanceMeters: context.mission?.physics?.minimumBottomClearanceMeters
    });
    return {
      source: 'plannedDiveSegmentViewModel',
      plannedDiveSegmentId: planned.segmentId ?? null,
      estimatedSegmentDurationSeconds: planned.expectedDuration ?? null,
      estimatedArrivalTimeSeconds: null,
      estimatedEnergy: planned.expectedEnergy ?? planned.feasibility?.energyEstimate ?? null,
      expectedSampleCount: planned.expectedScience?.predictedSampleCount ?? planned.predictedSamples?.length ?? null,
      predictedMaximumDepthMeters: planned.achievableMaximumDepthMeters ?? fallback.predictedMaximumDepthMeters,
      predictedLayerCrossings: planned.layerCrossings?.length ?? null,
      predictedSurfacingOffset: planned.predictedSurfacingOffset ?? null,
      minimumSeabedClearanceMeters: planned.bottomClearance?.minimumClearanceMeters ?? fallback.minimumSeabedClearanceMeters,
      currentExposure: planned.predictedCurrentCorrectedPath?.length ? 'canonical current-corrected planned path' : 'canonical planned dive path',
      targetCoverage: planned.expectedTargetCoverage?.status ?? 'prediction only',
      feasibility: planned.feasibility?.status ?? flightPlan?.feasibilityStatus ?? fallback.feasibility,
      warningCodes: planned.warningCodes ?? [],
      boundaryFlags: {
        derivedFromCanonicalDiveModel: planned.boundaryFlags?.derivedFromCanonicalDiveModel === true,
        ownsPlanning: planned.boundaryFlags?.ownsPlanning === true,
        ownsSimulation: planned.boundaryFlags?.ownsSimulation === true,
        ownsScoring: planned.boundaryFlags?.ownsScoring === true
      }
    };
  } catch (error) {
    return { ...fallback, source: 'flightPlanFeasibilityFallback', warningCodes: ['PLANNED_DIVE_PREDICTION_UNAVAILABLE'], predictionError: error?.message ?? String(error) };
  }
}

function fallbackPredictionSummary(segment = null, flightPlan = null) {
  const feasibility = flightPlan?.feasibility ?? segment?.feasibility ?? {};
  const targetDepth = Number(flightPlan?.targetDepthMeters ?? waterColumnLayerMetadata(flightPlan?.targetDepthLayerId).nominalDepthMeters ?? 0);
  const maximumDepth = Number(flightPlan?.maximumImmersionMeters ?? targetDepth);
  return {
    source: 'segmentFlightPlanFeasibility',
    estimatedSegmentDurationSeconds: null,
    estimatedArrivalTimeSeconds: null,
    estimatedEnergy: feasibility.energyEstimate ?? null,
    expectedSampleCount: null,
    predictedMaximumDepthMeters: feasibility.achievableMaximumDepthMeters ?? maximumDepth,
    predictedLayerCrossings: Array.isArray(feasibility.reachableLayerIds) ? feasibility.reachableLayerIds.length : null,
    predictedSurfacingOffset: null,
    minimumSeabedClearanceMeters: feasibility.minimumBottomClearanceMeters ?? null,
    currentExposure: 'canonical route prediction',
    targetCoverage: 'prediction only',
    feasibility: feasibility.status ?? flightPlan?.feasibilityStatus ?? 'unknown',
    warningCodes: []
  };
}

function endpointPoint(endpoint = {}, fallbackId = 'endpoint') {
  return {
    id: endpoint.id ?? fallbackId,
    waypointId: endpoint.id ?? fallbackId,
    x: endpoint.point?.x ?? endpoint.x,
    y: endpoint.point?.y ?? endpoint.y
  };
}

function warningRecords(segment = null, flightPlan = null, validation = null) {
  const warnings = [];
  for (const message of validation?.errors ?? []) warnings.push({ severity: 'error', message: String(message) });
  for (const message of validation?.warnings ?? []) warnings.push({ severity: 'warning', message: String(message) });
  for (const message of flightPlan?.warnings ?? []) warnings.push({ severity: 'warning', message: String(message) });
  for (const message of segment?.warnings ?? []) warnings.push({ severity: 'advisory', message: String(message) });
  const unique = new Map();
  for (const warning of warnings) unique.set(`${warning.severity}:${warning.message}`, warning);
  return [...unique.values()];
}
