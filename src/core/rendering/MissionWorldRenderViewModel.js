import { createMissionWorldCoordinateTransform, depthForLayer } from './MissionWorldCoordinates.js';
import { normalizeContinuousScienceTarget } from '../science/ContinuousScienceTarget.js';
import { createLegacyOperationalDomainFromGrid, normalizeOperationalDomainSpec, operationalDomainSummary } from '../domain/OperationalDomainSpec.js';
import { createLegacyResolutionProfileFromGrid, missionResolutionProfileSummary, normalizeMissionResolutionProfile } from '../domain/MissionResolutionProfile.js';
import { createMissionScaleModel, missionScaleModelSummary } from '../domain/MissionScaleModel.js';
import { signedTerrainSurfaceSummary } from '../science/SignedTerrainSurfaceModel.js';

export const MISSION_WORLD_RENDER_VIEW_MODEL_VERSION = 'mission-world-render-view-model-three-r1-1';
export const MISSION_WORLD_SCALAR_LAYER_IDS = Object.freeze(['sampleValue', 'remainingSampleValue', 'samplingPriority', 'forecast', 'belief', 'uncertainty', 'hazard', 'none']);

export function buildMissionWorldRenderViewModel({
  appState = null,
  level = null,
  mission = null,
  plan = null,
  selectedAgentId = null,
  selectedWaypointId = null,
  selectedMarkerId = null,
  selectedPriorityTargetId = null,
  selectedScienceTargetId = null,
  selectedCell = null,
  planningMarkers = null,
  activeTimeSeconds = 0,
  planningWindow = null,
  fieldState = null,
  currentField = null,
  sampleField = null,
  forecastState = null,
  beliefState = null,
  uncertaintyState = null,
  motionTrajectory = null,
  simulationState = null,
  displaySettings = null,
  visibilityTier = 'fair',
  options = {}
} = {}) {
  const grid = normalizeGrid(level?.world?.grid ?? options.grid ?? {});
  const operationalDomain = normalizeRenderOperationalDomain(level, grid);
  const resolutionProfile = normalizeRenderResolutionProfile(level, grid);
  const physicalScaleModel = createMissionScaleModel({
    domain: operationalDomain,
    profile: resolutionProfile,
    glider: { nominalSpeedMetersPerSecond: firstAgentSpeedMetersPerSecond(mission) }
  });
  const verticalExaggeration = finiteNumber(displaySettings?.waterColumn?.verticalExaggeration ?? displaySettings?.verticalExaggeration ?? options.coordinateTransform?.verticalExaggeration, 1.35);
  const transform = createMissionWorldCoordinateTransform({ grid, ...(options.coordinateTransform ?? {}), verticalExaggeration });
  const phase = options.phase ?? appState?.mode ?? simulationState?.phase ?? 'planning';
  const scalarFieldLayer = normalizeScalarFieldLayer({ sampleField, forecastState, beliefState, uncertaintyState, displaySettings, grid, activeTimeSeconds, visibilityTier });
  const vectorFieldLayer = normalizeVectorFieldLayer(currentField, grid, activeTimeSeconds);
  const terrainAuthority = normalizeTerrainAuthority(level);
  const terrain = normalizeTerrain(level, grid);
  const bathymetryArtifactSummary = level?.bathymetryArtifactSummary ?? null;
  const hazards = normalizeCellRecords(options.hazards ?? level?.layers?.hazards, grid, 'hazard');
  const constraints = terrainAuthority.usesSignedTerrainAuthority === true
    ? []
    : normalizeCellRecords(options.constraints ?? level?.layers?.terrain, grid, 'constraint');
  const dropZones = normalizeDropZones(options.dropZones, selectedAgentId, grid);
  const selectedStarts = normalizeSelectedStarts(options.selectedStarts, selectedAgentId);
  const gliders = normalizeGliders(options.gliders ?? mission?.agents, selectedAgentId);
  const waypoints = normalizeWaypoints(options.waypoints ?? plan?.agentPlans, selectedWaypointId);
  const routeAgentPlans = options.routes ?? mergeAgentPlanSelectedStarts(plan?.agentPlans, mission?.agents);
  const routes = normalizeRoutes(routeAgentPlans);
  const markers = normalizePlanningMarkers(planningMarkers ?? options.planningMarkers ?? plan?.planningMarkers, selectedMarkerId);
  const scienceTargets = normalizeScienceTargets(options.scienceTargets ?? plan?.scienceTargets, selectedScienceTargetId);
  const priorityTargets = normalizePriorityTargets(options.priorityTargets, activeTimeSeconds, selectedPriorityTargetId);
  const observations = normalizePoints(options.observations, 'observation');
  const surfacingEvents = normalizePoints(options.surfacingEvents, 'surfacingEvent');
  const warnings = [];
  if (!level) warnings.push('MissionWorldRenderViewModel built without level; using fallback grid.');
  if (!mission) warnings.push('MissionWorldRenderViewModel built without mission; entity lists may be empty.');
  if (scalarFieldLayer.id === 'none') warnings.push('No scalar field layer selected or available.');
  const includesHiddenTruth = Boolean(options.allowHiddenTruth || visibilityTier === 'oracle' || visibilityTier === 'debugAll') && Boolean(options.includesHiddenTruth);
  return scrubHidden({
    type: 'anchor.rendering.mission-world',
    version: MISSION_WORLD_RENDER_VIEW_MODEL_VERSION,
    phase,
    missionId: mission?.missionId ?? plan?.missionId ?? level?.missionId ?? null,
    levelId: level?.levelId ?? plan?.levelId ?? null,
    episodeId: options.episodeId ?? appState?.episodeId ?? simulationState?.episodeId ?? null,
    activeTimeSeconds: finiteNumber(activeTimeSeconds),
    selectedAgentId: selectedAgentId ?? null,
    selectedWaypointId: selectedWaypointId ?? null,
    selectedCell: selectedCell ? { x: finiteNumber(selectedCell.x), y: finiteNumber(selectedCell.y) } : null,
    coordinateSystem: transform,
    operationalDomain,
    operationalDomainSummary: operationalDomainSummary(operationalDomain),
    resolutionProfile,
    resolutionProfileSummary: missionResolutionProfileSummary(resolutionProfile),
    physicalScale: missionScaleModelSummary(physicalScaleModel),
    terrainAuthority,
    grid,
    worldBounds: { minX: -grid.width / 2, maxX: grid.width / 2, minZ: -grid.height / 2, maxZ: grid.height / 2 },
    bathymetry: normalizeBathymetry(level, grid),
    bathymetryArtifactSummary,
    terrain,
    coastline: options.coastline ?? [],
    waterSurface: { id: 'waterSurface', label: 'Water Surface', elevation: 0, visible: displaySettings?.waterSurface !== false },
    depthLayers: normalizeDepthLayers(options.depthLayers),
    scalarFieldLayer,
    scalarFieldLegend: scalarFieldLayer.legend,
    vectorFieldLayer,
    hazards,
    constraints,
    dropZones,
    dropZoneSummary: summarizeDropZones(dropZones),
    selectedStarts,
    gliders,
    waypoints,
    routes,
    planningMarkers: markers,
    scienceTargets,
    priorityTargets,
    observations,
    surfacingEvents,
    guidance: normalizeGuidance(options.guidance),
    selection: { selectedAgentId: selectedAgentId ?? null, selectedWaypointId: selectedWaypointId ?? null, selectedMarkerId: selectedMarkerId ?? null, selectedPriorityTargetId: selectedPriorityTargetId ?? null, selectedScienceTargetId: selectedScienceTargetId ?? null, selectedCell: selectedCell ?? null },
    visibility: normalizeVisibility(displaySettings, visibilityTier),
    planningWindow: planningWindow ? { ...planningWindow } : null,
    fieldState: fieldState ? { ...fieldState } : null,
    motionTrajectory: motionTrajectory ? summarizeMotionTrajectory(motionTrajectory) : null,
    warnings,
    boundaryFlags: {
      ownsSimulationState: false,
      ownsPlanning: false,
      ownsScoring: false,
      ownsReplaySemantics: false,
      includesHiddenTruth,
      usesThreeRenderer: false,
      changesMissionState: false,
      changesOfficialBrowserScoring: false,
      usesWebGPUFluid: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      usesMARL: false
    }
  }, includesHiddenTruth);
}

export function missionWorldRenderViewModelSummary(viewModel = {}) {
  return {
    type: 'anchor.rendering.mission-world-summary',
    version: MISSION_WORLD_RENDER_VIEW_MODEL_VERSION,
    phase: viewModel.phase ?? null,
    missionId: viewModel.missionId ?? null,
    levelId: viewModel.levelId ?? null,
    operationalDomainId: viewModel.operationalDomain?.domainId ?? null,
    resolutionProfileId: viewModel.resolutionProfile?.profileId ?? null,
    domainWidthKm: viewModel.operationalDomainSummary?.widthKm ?? null,
    domainHeightKm: viewModel.operationalDomainSummary?.heightKm ?? null,
    planningCellWidthMeters: viewModel.physicalScale?.planningCellWidthMeters ?? null,
    planningCellHeightMeters: viewModel.physicalScale?.planningCellHeightMeters ?? null,
    terrainAuthorityMode: viewModel.terrainAuthority?.terrainAuthorityMode ?? null,
    terrainSourceDigest: viewModel.terrainAuthority?.terrainSourceDigest ?? null,
    landWaterSourceDigest: viewModel.terrainAuthority?.landWaterSourceDigest ?? null,
    coastlineSourceDigest: viewModel.terrainAuthority?.coastlineSourceDigest ?? null,
    bottomBoundarySourceDigest: viewModel.terrainAuthority?.bottomBoundarySourceDigest ?? null,
    bathymetryPackageVersion: viewModel.bathymetryArtifactSummary?.bathymetryPackageVersion ?? null,
    bathymetryManifestDigest: viewModel.bathymetryArtifactSummary?.manifestDigest ?? null,
    bathymetryArtifactDigest: viewModel.bathymetryArtifactSummary?.artifactDigest ?? null,
    bathymetryCoordinateFrame: viewModel.bathymetryArtifactSummary?.coordinateFrame ?? null,
    bathymetryAxisCounts: viewModel.bathymetryArtifactSummary ? { east: viewModel.bathymetryArtifactSummary.eastCount, north: viewModel.bathymetryArtifactSummary.northCount } : null,
    bathymetryWetCellCount: viewModel.bathymetryArtifactSummary?.wetCellCount ?? null,
    bathymetryLandCellCount: viewModel.bathymetryArtifactSummary?.landCellCount ?? null,
    bathymetryValidationStatus: viewModel.bathymetryArtifactSummary?.validationStatus ?? null,
    usesSignedTerrainAuthority: viewModel.terrainAuthority?.usesSignedTerrainAuthority === true,
    activeTimeSeconds: finiteNumber(viewModel.activeTimeSeconds),
    selectedAgentId: viewModel.selectedAgentId ?? null,
    selectedWaypointId: viewModel.selectedWaypointId ?? null,
    terrainCellCount: countCells(viewModel.terrain?.cells),
    scalarFieldCellCount: countScalarCells(viewModel.scalarFieldLayer),
    currentVectorCount: viewModel.vectorFieldLayer?.vectors?.length ?? 0,
    hazardCount: viewModel.hazards?.length ?? 0,
    constraintCount: viewModel.constraints?.length ?? 0,
    dropZoneCount: viewModel.dropZones?.length ?? 0,
    dropZoneCellCount: viewModel.dropZoneSummary?.dropZoneCellCount ?? 0,
    availableDropZoneCellCount: viewModel.dropZoneSummary?.availableDropZoneCellCount ?? 0,
    selectedStartCount: viewModel.dropZoneSummary?.selectedStartCount ?? 0,
    missingDropZoneWarnings: viewModel.dropZoneSummary?.missingDropZoneWarnings ?? [],
    gliderCount: viewModel.gliders?.length ?? 0,
    waypointCount: viewModel.waypoints?.length ?? 0,
    routeCount: viewModel.routes?.length ?? 0,
    planningMarkerCount: viewModel.planningMarkers?.length ?? 0,
    scienceTargetCount: viewModel.scienceTargets?.length ?? 0,
    priorityTargetCount: viewModel.priorityTargets?.filter((target) => target.active !== false)?.length ?? 0,
    observationCount: viewModel.observations?.length ?? 0,
    surfacingEventCount: viewModel.surfacingEvents?.length ?? 0,
    includesHiddenTruth: viewModel.boundaryFlags?.includesHiddenTruth === true,
    ownsSimulationState: viewModel.boundaryFlags?.ownsSimulationState === true,
    ownsPlanning: viewModel.boundaryFlags?.ownsPlanning === true,
    ownsScoring: viewModel.boundaryFlags?.ownsScoring === true,
    ownsReplaySemantics: viewModel.boundaryFlags?.ownsReplaySemantics === true,
    warnings: [...(viewModel.warnings ?? [])]
  };
}

export function validateMissionWorldRenderViewModel(viewModel = {}) {
  const errors = [];
  const warnings = [];
  if (viewModel.type !== 'anchor.rendering.mission-world') errors.push('Mission world view model type must be anchor.rendering.mission-world.');
  if (!viewModel.grid?.width || !viewModel.grid?.height) errors.push('Mission world view model requires grid width and height.');
  if (viewModel.boundaryFlags?.ownsSimulationState) errors.push('Mission renderer view model must not own simulation state.');
  if (viewModel.boundaryFlags?.ownsPlanning) errors.push('Mission renderer view model must not own planning.');
  if (viewModel.boundaryFlags?.ownsScoring) errors.push('Mission renderer view model must not own scoring.');
  if (viewModel.boundaryFlags?.ownsReplaySemantics) errors.push('Mission renderer view model must not own replay semantics.');
  if (viewModel.boundaryFlags?.includesHiddenTruth && viewModel.visibility?.visibilityTier === 'fair') errors.push('Fair mission render view model must not include hidden truth.');
  if (!Array.isArray(viewModel.gliders)) warnings.push('Mission world view model has no glider array.');
  if (!Array.isArray(viewModel.routes)) warnings.push('Mission world view model has no route array.');
  if (!Array.isArray(viewModel.scienceTargets)) warnings.push('Mission world view model has no scienceTargets array.');
  return { valid: errors.length === 0, errors, warnings: [...warnings, ...(viewModel.warnings ?? [])], summary: missionWorldRenderViewModelSummary(viewModel) };
}

function normalizeGrid(grid = {}) {
  return { width: Math.max(1, Math.round(Number(grid.width) || 10)), height: Math.max(1, Math.round(Number(grid.height) || 10)) };
}

function normalizeRenderOperationalDomain(level, grid) {
  const source = level?.operationalDomain ?? level?.world?.operationalDomain ?? level?.meta?.operationalDomain ?? null;
  if (source) return normalizeOperationalDomainSpec(source);
  return createLegacyOperationalDomainFromGrid(level?.world?.grid ?? grid);
}

function normalizeRenderResolutionProfile(level, grid) {
  const source = level?.resolutionProfile ?? level?.world?.resolutionProfile ?? level?.meta?.resolutionProfile ?? null;
  if (source) return normalizeMissionResolutionProfile(source);
  return createLegacyResolutionProfileFromGrid(level?.world?.grid ?? grid);
}

function firstAgentSpeedMetersPerSecond(mission = null) {
  const agent = mission?.agents?.[0] ?? null;
  return finiteNumber(agent?.nominalSpeedMetersPerSecond ?? agent?.speedMetersPerSecond ?? agent?.maxSpeed, 0.35);
}

function normalizeScalarFieldLayer({ sampleField, forecastState, beliefState, uncertaintyState, displaySettings, grid, activeTimeSeconds, visibilityTier }) {
  const requested = displaySettings?.scalarFieldId ?? (displaySettings?.showROI === false ? 'none' : displaySettings?.roiViewMode === 'remaining' ? 'remainingSampleValue' : 'sampleValue');
  const source = requested === 'forecast' ? forecastState?.values
    : requested === 'belief' ? beliefState?.values
      : requested === 'uncertainty' ? uncertaintyState?.values
        : requested === 'hazard' ? displaySettings?.hazardValues
          : sampleField?.values ?? sampleField;
  if (requested === 'none' || !Array.isArray(source)) {
    return { id: 'none', label: 'No Scalar Field', values: [], width: grid.width, height: grid.height, min: 0, max: 0, meaningfulZero: true, opacity: 0, colorScaleId: 'none', sourceVisibility: 'publicScenario', legend: { label: 'None' } };
  }
  const values = cloneGridValues(source, grid, null);
  const stats = fieldStats(values);
  const id = MISSION_WORLD_SCALAR_LAYER_IDS.includes(requested) ? requested : 'sampleValue';
  return {
    id,
    label: scalarLabel(id),
    values,
    width: grid.width,
    height: grid.height,
    depthLayerId: displaySettings?.depthLayerId ?? 'surface',
    timeSeconds: finiteNumber(activeTimeSeconds),
    min: stats.min,
    max: stats.max,
    meaningfulZero: true,
    opacity: finiteNumber(displaySettings?.scalarOpacity, 0.72),
    colorScaleId: id === 'uncertainty' ? 'uncertainty-magenta' : id === 'hazard' ? 'hazard-red' : 'mission-sample-cyan-gold',
    sourceVisibility: visibilityTier === 'oracle' ? 'oracle' : 'publicScenario',
    legend: { id, label: scalarLabel(id), min: stats.min, max: stats.max, colorScaleId: id === 'uncertainty' ? 'uncertainty-magenta' : 'mission-sample-cyan-gold' }
  };
}

function normalizeVectorFieldLayer(currentField, grid, activeTimeSeconds) {
  const vectors = Array.isArray(currentField?.vectors) ? currentField.vectors.map((vector, index) => ({
    id: vector.id ?? `current-${index}`,
    x: finiteNumber(vector.x),
    y: finiteNumber(vector.y),
    z: finiteNumber(vector.z, 0),
    u: finiteNumber(vector.u),
    v: finiteNumber(vector.v),
    magnitude: finiteNumber(vector.magnitude, Math.hypot(Number(vector.u) || 0, Number(vector.v) || 0)),
    timeSeconds: finiteNumber(vector.timeSeconds, activeTimeSeconds),
    sourceVisibility: vector.sourceVisibility ?? 'publicScenario'
  })) : [];
  return { id: 'currentVectors', label: 'Current Vectors', width: grid.width, height: grid.height, timeSeconds: finiteNumber(activeTimeSeconds), vectors, sourceVisibility: 'publicScenario' };
}

function normalizeTerrainAuthority(level = null) {
  if (level?.signedTerrainSurface) return signedTerrainSurfaceSummary(level.signedTerrainSurface);
  if (level?.terrainAuthority) return { ...level.terrainAuthority };
  const digest = level?.bathymetry?.signedTerrainSurfaceDigest ?? level?.bathymetry?.sourceDigest ?? null;
  return {
    terrainAuthorityMode: digest ? 'signedElevationV1' : 'legacyGridCompatibility',
    terrainSourceDigest: digest,
    landWaterSourceDigest: digest,
    coastlineSourceDigest: digest,
    bottomBoundarySourceDigest: digest,
    usesSignedTerrainAuthority: Boolean(digest),
    usesLegacyLandTileGenerator: false,
    usesPerCellLandMeshes: false,
    landTileMeshCount: 0
  };
}

function normalizeTerrain(level, grid) {
  const source = level?.layers?.terrain ?? level?.bathymetry?.landMask ?? level?.bathymetry?.landSeaMask ?? [];
  const values = cloneGridValues(source, grid, 0).map((row, y) => row.map((value, x) => {
    const raw = source?.[y]?.[x];
    if (raw === true || raw === 'land') return 1;
    if (raw === false || raw === 'water') return 0;
    return Number(value) > 0 ? 1 : 0;
  }));
  const cells = [];
  for (let y = 0; y < grid.height; y += 1) for (let x = 0; x < grid.width; x += 1) if (values[y]?.[x]) cells.push({ id: `terrain-${x}-${y}`, x, y, value: 1, kind: 'land' });
  return { id: 'terrain', label: 'Terrain / Land Mask', values, cells, sourceVisibility: 'publicScenario' };
}

function normalizeBathymetry(level, grid) {
  const source = level?.bathymetry?.depthMeters ?? level?.world?.bathymetry?.depthMeters ?? level?.layers?.depthMeters ?? level?.layers?.depth ?? [];
  const depthValues = cloneGridValues(source, grid, 0).map((row) => row.map((value) => Math.max(0, finiteNumber(value))));
  return {
    id: 'bathymetry',
    label: 'Bathymetry',
    depthValues,
    width: grid.width,
    height: grid.height,
    sourceDigest: level?.bathymetry?.sourceDigest ?? level?.bathymetry?.sourceMetadata?.sourceId ?? null,
    sourceMetadata: level?.bathymetry?.sourceMetadata ?? null,
    terrainFeatures: level?.bathymetry?.terrainFeatures ?? [],
    sourceVisibility: 'publicScenario'
  };
}

function normalizeDepthLayers(input = null) {
  const raw = Array.isArray(input) && input.length ? input : ['surface', 'thermocline', 'deep'].map((id) => ({ id, label: labelize(id), depthMeters: depthForLayer(id), visible: true }));
  return raw.map((layer) => ({ id: layer.id, label: layer.label ?? labelize(layer.id), depthMeters: finiteNumber(layer.depthMeters, depthForLayer(layer.id)), visible: layer.visible !== false, opacity: finiteNumber(layer.opacity, 0.18) }));
}

function normalizeCellRecords(input, grid, kind) {
  if (Array.isArray(input) && input.length && typeof input[0] === 'object' && !Array.isArray(input[0])) {
    return input.map((record, index) => ({ id: record.id ?? `${kind}-${index}`, x: finiteNumber(record.x), y: finiteNumber(record.y), radius: finiteNumber(record.radius, 0.5), value: finiteNumber(record.value, 1), kind, visible: record.visible !== false }));
  }
  const values = cloneGridValues(input ?? [], grid, 0);
  const records = [];
  for (let y = 0; y < grid.height; y += 1) for (let x = 0; x < grid.width; x += 1) if (Number(values[y]?.[x] ?? 0) > 0) records.push({ id: `${kind}-${x}-${y}`, x, y, value: Number(values[y][x]), kind, visible: true });
  return records;
}

function normalizeDropZones(zones = [], selectedAgentId = null, grid = {}) {
  return (zones ?? []).map((zone, index) => {
    const warnings = [];
    const seen = new Set();
    const cells = cloneArray(zone.cells).map((cell) => ({ x: Math.round(Number(cell.x)), y: Math.round(Number(cell.y)) }))
      .filter((cell) => {
        if (!Number.isFinite(cell.x) || !Number.isFinite(cell.y)) { warnings.push('Drop zone ' + (zone.id ?? index) + ' has a non-finite cell.'); return false; }
        if (cell.x < 0 || cell.y < 0 || cell.x >= grid.width || cell.y >= grid.height) { warnings.push('Drop zone ' + (zone.id ?? index) + ' has an out-of-bounds cell ' + cell.x + ',' + cell.y + '.'); return false; }
        const key = cell.x + ',' + cell.y;
        if (seen.has(key)) { warnings.push('Drop zone ' + (zone.id ?? index) + ' has duplicate cell ' + key + '.'); return false; }
        seen.add(key);
        return true;
      });
    const agentIds = [...(zone.agentIds ?? zone.allowedAgentIds ?? [])];
    const selectedStart = zone.selectedStart ?? zone.selectedCell ?? null;
    const selectedCell = selectedStart ? { x: Math.round(Number(selectedStart.x)), y: Math.round(Number(selectedStart.y)) } : null;
    const selected = agentIds.includes(selectedAgentId) || zone.selectedAgentId === selectedAgentId;
    const status = zone.status ?? (zone.valid === false ? 'invalid' : selectedCell ? 'selected' : selected ? 'available' : 'unavailable');
    return {
      id: zone.id ?? 'drop-zone-' + (index + 1),
      label: zone.label ?? zone.id ?? 'Drop Zone ' + (index + 1),
      agentIds,
      allowedAgentIds: [...(zone.allowedAgentIds ?? agentIds)],
      cells,
      boundary: cloneArray(zone.boundary).length ? cloneArray(zone.boundary) : boundaryFromCells(cells),
      center: zone.center ?? centerOfCells(cells),
      validCellCount: cells.length,
      selectedStart: selectedStart ? { ...selectedStart } : null,
      selectedCell,
      selectedAgentId: zone.selectedAgentId ?? selectedStart?.agentId ?? null,
      status,
      visible: zone.visible !== false,
      source: zone.source ?? 'unknown',
      valid: zone.valid !== false && status !== 'invalid',
      selected,
      warnings
    };
  });
}

function summarizeDropZones(dropZones = []) {
  return {
    dropZoneCount: dropZones.length,
    dropZoneCellCount: dropZones.reduce((sum, zone) => sum + (zone.cells?.length ?? 0), 0),
    availableDropZoneCellCount: dropZones.reduce((sum, zone) => sum + (zone.status === 'available' || zone.status === 'selected' ? zone.cells?.length ?? 0 : 0), 0),
    selectedStartCount: dropZones.filter((zone) => zone.selectedCell || zone.selectedStart).length,
    missingDropZoneWarnings: dropZones.flatMap((zone) => zone.warnings ?? [])
  };
}

function centerOfCells(cells = []) {
  if (!cells.length) return null;
  const sum = cells.reduce((acc, cell) => ({ x: acc.x + Number(cell.x), y: acc.y + Number(cell.y) }), { x: 0, y: 0 });
  return { x: round(sum.x / cells.length), y: round(sum.y / cells.length) };
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

function normalizeSelectedStarts(starts = [], selectedAgentId = null) {
  return (starts ?? []).filter(Boolean).map((start, index) => ({ id: start.id ?? `selected-start-${index + 1}`, agentId: start.agentId ?? null, x: finiteNumber(start.x), y: finiteNumber(start.y), z: finiteNumber(start.z, 0), selected: start.agentId === selectedAgentId, label: start.label ?? 'DEPLOY' }));
}

function normalizeGliders(gliders = [], selectedAgentId = null) {
  return (gliders ?? []).map((agent, index) => ({ agentId: agent.agentId ?? agent.id ?? `agent-${index + 1}`, x: finiteNumber(agent.x ?? agent.start?.x ?? agent.selectedStart?.x ?? agent.deployment?.selectedStart?.x), y: finiteNumber(agent.y ?? agent.start?.y ?? agent.selectedStart?.y ?? agent.deployment?.selectedStart?.y), z: finiteNumber(agent.z, -finiteNumber(agent.depthMeters, 0)), depthMeters: finiteNumber(agent.depthMeters, 0), headingRadians: finiteNumber(agent.headingRadians ?? agent.heading, 0), energyFraction: clamp01((agent.energyFraction ?? agent.batteryFraction ?? agent.battery ?? 100) / (Number(agent.energyFraction ?? agent.batteryFraction) <= 1 ? 1 : 100)), status: agent.status ?? 'ready', selected: (agent.agentId ?? agent.id) === selectedAgentId, colorKey: agent.colorKey ?? agent.color ?? `agent-${index + 1}`, visible: agent.visible !== false }));
}

function normalizeWaypoints(agentPlans = [], selectedWaypointId = null) {
  const raw = agentPlans ?? [];
  const normalizeWaypointRecord = (waypoint, agentId, index) => {
    const waypointId = waypoint.waypointId ?? waypoint.id ?? `${agentId}-waypoint-${Number(waypoint.index ?? index) + 1}`;
    const x = finiteNumber(waypoint.x);
    const y = finiteNumber(waypoint.y);
    return {
      waypointId,
      agentId,
      index: Number.isFinite(Number(waypoint.index)) ? Number(waypoint.index) : index,
      x,
      y,
      z: 0,
      depthMeters: 0,
      depthLayerId: 'surface',
      surfaceAnchor: true,
      validationRadius: finiteNumber(waypoint.validationRadius ?? waypoint.radius, 0.5),
      diveProfileId: waypoint.diveProfileId ?? null,
      targetDepthLayerId: waypoint.targetDepthLayerId ?? waypoint.depthLayerId ?? waypoint.depthLayer ?? null,
      requestedMaximumDepthMeters: finiteOrNull(waypoint.maximumDiveDepthMeters ?? waypoint.maximumDepthMeters),
      sampleIntervalSeconds: finiteOrNull(waypoint.sampleIntervalSeconds),
      action: waypoint.action ?? 'sample',
      status: waypoint.status ?? 'planned',
      selected: waypointId === selectedWaypointId || selectedWaypointId === `${agentId}:${Number.isFinite(Number(waypoint.index)) ? Number(waypoint.index) : index}`,
      plannedTimeSeconds: finiteOrNull(waypoint.t ?? waypoint.plannedTimeSeconds),
      visible: waypoint.visible !== false,
      scienceTargetIds: Array.isArray(waypoint.scienceTargetIds) ? [...waypoint.scienceTargetIds] : []
    };
  };
  if (raw.length && !Array.isArray(raw[0]?.waypoints) && raw[0]?.agentId) {
    return raw.map((waypoint, index) => normalizeWaypointRecord(waypoint, waypoint.agentId, index));
  }
  return raw.flatMap((agentPlan) => (agentPlan.waypoints ?? []).map((waypoint, index) => normalizeWaypointRecord(waypoint, agentPlan.agentId, index)));
}
function mergeAgentPlanSelectedStarts(agentPlans = [], agents = []) {
  if (!Array.isArray(agentPlans)) return agentPlans;
  const agentsById = new Map((agents ?? []).map((agent) => [agent.id ?? agent.agentId, agent]));
  return agentPlans.map((agentPlan) => {
    if (!agentPlan || agentPlan.selectedStart || agentPlan.start || agentPlan.deployment?.selectedStart) return agentPlan;
    const agent = agentsById.get(agentPlan.agentId);
    const selectedStart = agent?.deployment?.selectedStart ?? agent?.selectedStart ?? agent?.start ?? null;
    if (!isFinitePoint(selectedStart)) return agentPlan;
    return { ...agentPlan, selectedStart: { x: finiteNumber(selectedStart.x), y: finiteNumber(selectedStart.y) } };
  });
}

function isFinitePoint(point) {
  return Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y));
}
function normalizeRoutes(agentPlans = []) {
  const raw = agentPlans ?? [];
  const normalizeRoutePoint = (point, agentId, index, options = {}) => {
    const waypointId = point.waypointId ?? point.id ?? `${agentId}-route-point-${index + 1}`;
    const x = finiteNumber(point.x);
    const y = finiteNumber(point.y);
    return {
      id: waypointId,
      waypointId,
      agentId,
      x,
      y,
      z: 0,
      depthMeters: 0,
      depthLayerId: 'surface',
      surfaceAnchor: true,
      index,
      routeBoundary: options.routeBoundary ?? (index === 0 ? 'start' : 'waypoint'),
      validationRadius: finiteNumber(point.validationRadius ?? point.radius, 0.5),
      diveProfileId: point.diveProfileId ?? options.diveProfileId ?? null,
      targetDepthLayerId: point.targetDepthLayerId ?? point.depthLayerId ?? point.depthLayer ?? options.targetDepthLayerId ?? null,
      maximumDiveDepthMeters: finiteOrNull(point.maximumDiveDepthMeters ?? point.maximumDepthMeters ?? point.requestedMaximumDepthMeters),
      sampleIntervalSeconds: finiteOrNull(point.sampleIntervalSeconds),
      cycleCount: finiteOrNull(point.cycleCount),
      action: point.action ?? null,
      plannedTimeSeconds: finiteOrNull(point.t ?? point.plannedTimeSeconds),
      scienceTargetIds: Array.isArray(point.scienceTargetIds) ? [...point.scienceTargetIds] : []
    };
  };
  if (raw.length && Array.isArray(raw[0]?.points)) {
    return raw.map((route, routeIndex) => ({
      id: route.id ?? `${route.agentId ?? 'agent'}-planned-route-${routeIndex + 1}`,
      agentId: route.agentId ?? null,
      status: route.status ?? 'planned',
      diveProfileId: route.diveProfileId ?? null,
      targetDepthLayerId: route.targetDepthLayerId ?? null,
      points: (route.points ?? []).map((point, index) => normalizeRoutePoint(point, route.agentId ?? null, index, route))
    })).filter((route) => route.points.length > 0);
  }
  return raw.map((agentPlan) => {
    const points = [];
    const start = agentPlan.selectedStart ?? agentPlan.start ?? agentPlan.deployment?.selectedStart ?? null;
    if (start && Number.isFinite(Number(start.x)) && Number.isFinite(Number(start.y))) {
      points.push(normalizeRoutePoint({ ...start, id: `${agentPlan.agentId}-surface-start`, waypointId: `${agentPlan.agentId}-surface-start` }, agentPlan.agentId, 0, { routeBoundary: 'deploymentStart', diveProfileId: agentPlan.diveProfileId, targetDepthLayerId: agentPlan.targetDepthLayerId }));
    }
    for (const waypoint of (agentPlan.waypoints ?? [])) {
      points.push(normalizeRoutePoint(waypoint, agentPlan.agentId, points.length, { routeBoundary: 'waypoint', diveProfileId: agentPlan.diveProfileId, targetDepthLayerId: agentPlan.targetDepthLayerId }));
    }
    return { id: `${agentPlan.agentId}-planned-route`, agentId: agentPlan.agentId, status: agentPlan.status ?? 'planned', diveProfileId: agentPlan.diveProfileId ?? null, targetDepthLayerId: agentPlan.targetDepthLayerId ?? null, points };
  }).filter((route) => route.points.length > 0);
}
function normalizePlanningMarkers(markers = [], selectedMarkerId = null) {
  return (markers ?? []).map((marker, index) => {
    const markerId = marker.markerId ?? marker.id ?? `planning-marker-${index + 1}`;
    return { markerId, x: finiteNumber(marker.x), y: finiteNumber(marker.y), z: finiteNumber(marker.z, -finiteNumber(marker.depthMeters, 0)), plannedTimeSeconds: finiteNumber(marker.t ?? marker.plannedTimeSeconds), label: marker.label ?? 'Planning Marker', visible: marker.visible !== false, executable: false, agentId: marker.agentId ?? null, status: marker.status ?? marker.timingStatus ?? 'annotation', selected: markerId === selectedMarkerId || selectedMarkerId === `${marker.agentId ?? ''}:${index}` || selectedMarkerId === String(index) };
  });
}

function normalizeScienceTargets(targets = [], selectedScienceTargetId = null) {
  return (targets ?? []).map((target) => {
    const normalized = normalizeContinuousScienceTarget(target);
    return {
      ...normalized,
      targetId: normalized.id,
      x: finiteNumber(normalized.position.x),
      y: finiteNumber(normalized.position.y),
      z: -finiteNumber(normalized.position.depthMeters),
      depthMeters: finiteNumber(normalized.position.depthMeters),
      depthLayerId: normalized.depthLayerId ?? null,
      selected: normalized.id === selectedScienceTargetId,
      visible: normalized.visible !== false,
      executable: false,
      navigationAuthority: false,
      scoreAuthority: false
    };
  });
}

function normalizePriorityTargets(targets = [], activeTimeSeconds = 0, selectedPriorityTargetId = null) {
  return (targets ?? []).map((target, index) => {
    const targetId = target.targetId ?? target.id ?? `priority-target-${index + 1}`;
    return { targetId, x: finiteNumber(target.x ?? target.position?.x), y: finiteNumber(target.y ?? target.position?.y), z: finiteNumber(target.z, -finiteNumber(target.depthMeters, 0)), value: finiteNumber(target.value, 1), active: target.active !== false, claimed: Boolean(target.claimed ?? target.captured), expiresAtSeconds: finiteOrNull(target.expiresAtSeconds ?? target.endTime), objectiveId: target.objectiveId ?? null, visible: target.visible !== false, timeSeconds: finiteNumber(target.timeSeconds ?? activeTimeSeconds), selected: targetId === selectedPriorityTargetId };
  });
}

function normalizePoints(points = [], kind = 'point') {
  return (points ?? []).map((point, index) => ({ id: point.id ?? `${kind}-${index + 1}`, x: finiteNumber(point.x), y: finiteNumber(point.y), z: finiteNumber(point.z, -finiteNumber(point.depthMeters, 0)), timeSeconds: finiteOrNull(point.t ?? point.timeSeconds), kind, visible: point.visible !== false }));
}

function normalizeGuidance(guidance = null) {
  if (!guidance) return { visible: false };
  return { ...guidance, ownsPlanning: false, ownsSimulationState: false };
}

function normalizeVisibility(displaySettings = {}, visibilityTier = 'fair') {
  return {
    visibilityTier,
    bathymetry: displaySettings?.bathymetry !== false,
    waterSurface: displaySettings?.waterSurface !== false,
    depthLayers: displaySettings?.depthLayers !== false,
    scalarField: displaySettings?.showROI !== false && displaySettings?.scalarField !== false,
    currentVectors: displaySettings?.showCurrents !== false,
    hazards: displaySettings?.showHazards !== false,
    constraints: displaySettings?.showTerrain !== false,
    dropZones: displaySettings?.dropZones !== false,
    gliders: displaySettings?.gliders !== false,
    waypoints: displaySettings?.waypoints !== false,
    routes: displaySettings?.routes !== false,
    planningMarkers: displaySettings?.showPlanningMarkers !== false,
    priorityTargets: displaySettings?.showPriorityStars !== false,
    samplingTargets: displaySettings?.samplingTargets !== false
  };
}

function summarizeMotionTrajectory(trajectory = {}) {
  return { pointCount: trajectory.points?.length ?? trajectory.realizedTrack?.length ?? 0, observationCount: trajectory.sampledObservations?.length ?? 0 };
}

function scrubHidden(viewModel, allowHidden = false) {
  if (allowHidden) return viewModel;
  if (containsHiddenPayload(viewModel)) {
    const copy = JSON.parse(JSON.stringify(viewModel));
    copy.warnings ??= [];
    copy.warnings.push('Hidden-truth-like keys were scrubbed from mission render view model.');
    return scrubObject(copy);
  }
  return viewModel;
}

function containsHiddenPayload(value) {
  if (Array.isArray(value)) return value.some(containsHiddenPayload);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => isHiddenPayloadKey(key) || containsHiddenPayload(child));
}

function isHiddenPayloadKey(key) {
  return /^(T_hiddenTruth|hiddenTruth|trueRoi|oracleState|debugAll)$/i.test(key)
    || /(^|[-_])(T_hiddenTruth|hiddenTruth|trueRoi|oracleState|debugAll)([-_]|$)/i.test(key);
}

function scrubObject(value) {
  if (Array.isArray(value)) return value.map(scrubObject);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (isHiddenPayloadKey(key)) continue;
    out[key] = scrubObject(child);
  }
  if (out.boundaryFlags) out.boundaryFlags.includesHiddenTruth = false;
  return out;
}

function cloneGridValues(input, grid, fallback = null) {
  return Array.from({ length: grid.height }, (_, y) => Array.from({ length: grid.width }, (_, x) => normalizeCellValue(input?.[y]?.[x], fallback)));
}

function normalizeCellValue(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (Array.isArray(value)) return value.map((entry) => finiteNumber(entry, 0));
  if (typeof value === 'object') return finiteNumber(value.value ?? value.expectedValue ?? value.probability, fallback ?? 0);
  return fallback;
}

function fieldStats(values = []) {
  const finite = values.flat().filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!finite.length) return { min: 0, max: 0 };
  return { min: round(Math.min(...finite)), max: round(Math.max(...finite)) };
}

function countScalarCells(layer = {}) {
  return (layer.values ?? []).flat().filter((value) => value != null && Number.isFinite(Number(value))).length;
}

function countCells(cells = []) {
  return Array.isArray(cells) ? cells.length : 0;
}

function scalarLabel(id) {
  return ({ sampleValue: 'Sample Value', remainingSampleValue: 'Remaining Sample Value', samplingPriority: 'Sampling Priority', forecast: 'Forecast', belief: 'Belief', uncertainty: 'Uncertainty', hazard: 'Hazard', none: 'None' })[id] ?? labelize(id);
}

function labelize(value) {
  return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function cloneArray(value) {
  return Array.isArray(value) ? value.map((entry) => entry && typeof entry === 'object' ? { ...entry } : entry) : [];
}

function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function finiteOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function round(value, digits = 6) {
  return Number(Number(value).toFixed(digits));
}

