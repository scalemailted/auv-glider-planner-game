import { buildMissionWorldRenderViewModel, missionWorldRenderViewModelSummary, validateMissionWorldRenderViewModel } from './MissionWorldRenderViewModel.js';
import { normalizeMissionEditorDocument, missionEditorDocumentSummary } from '../editor/MissionEditorDocument.js';
import { validateMissionEditorDocument, missionEditorValidationSummary } from '../editor/MissionEditorValidation.js';

export const EDITOR_WORLD_STATE_ADAPTER_VERSION = 'editor-world-state-adapter-three-r2b';

export function editorWorldRenderInputFromDocument(document = {}, options = {}) {
  const doc = normalizeMissionEditorDocument(document, options);
  const level = doc.level;
  const mission = doc.mission;
  const frameIndex = clampInt(options.frameIndex ?? doc.editorState?.frameIndex ?? 0, 0, Math.max(0, (level.layers?.truth?.frames?.length ?? 1) - 1));
  const frame = level.layers.truth.frames[frameIndex] ?? level.layers.truth.frames[0] ?? {};
  const activeTimeSeconds = Number(frame.t ?? options.activeTimeSeconds ?? 0) || 0;
  const displaySettings = normalizeEditorDisplaySettings(options.displaySettings ?? {}, doc);
  return {
    adapterVersion: EDITOR_WORLD_STATE_ADAPTER_VERSION,
    phase: 'editor',
    appState: { mode: 'editor', level, mission, ui: { rendererBackend: 'threeMissionEditor' } },
    level,
    mission,
    plan: options.plan ?? { schemaVersion: '2.0', type: 'anchor.plan', missionId: mission?.missionId ?? null, agentPlans: [] },
    selectedAgentId: options.selectedAgentId ?? mission?.agents?.[0]?.id ?? null,
    selectedWaypointId: null,
    selectedMarkerId: null,
    selectedPriorityTargetId: null,
    selectedScienceTargetId: null,
    selectedCell: doc.selection?.selectedCell ?? options.selectedCell ?? null,
    planningMarkers: [],
    scienceTargets: buildEditorScienceTargets(level),
    activeTimeSeconds,
    planningWindow: { index: frameIndex, startTimeSeconds: activeTimeSeconds, durationSeconds: level.world?.time?.planningWindow ?? null },
    fieldState: { frameSource: 'editorTruth', frameIndex, frameTimeSeconds: activeTimeSeconds, challengeMode: 'editor', roiViewMode: 'absolute' },
    currentField: buildCurrentVectorLayer(level, frame, activeTimeSeconds, options.currentVectorStride),
    sampleField: { id: 'editor-sample-field', values: normalizeGrid(frame.roi, level), timeSeconds: activeTimeSeconds, sourceVisibility: 'publicScenario' },
    forecastState: null,
    beliefState: null,
    uncertaintyState: null,
    motionTrajectory: null,
    simulationState: null,
    displaySettings,
    visibilityTier: 'fair',
    options: {
      phase: 'editor',
      grid: level.world?.grid,
      dropZones: buildDropZones(level),
      selectedStarts: buildSelectedStarts(mission),
      gliders: mission?.agents ?? [],
      waypoints: [],
      routes: [],
      planningMarkers: [],
      scienceTargets: buildEditorScienceTargets(level),
      priorityTargets: [],
      hazards: level.layers?.hazards ?? [],
      constraints: level.layers?.terrain ?? [],
      observations: [],
      surfacingEvents: [],
      includesHiddenTruth: false,
      allowHiddenTruth: false,
      guidance: null,
      depthLayers: options.depthLayers ?? defaultDepthLayers(),
      warnings: ['Editor render input is derived from the canonical mission editor document.']
    },
    editorDocument: doc
  };
}

export function editorWorldRenderInputSummary(input = {}) {
  return {
    type: 'anchor.rendering.editor-world-input-summary',
    version: EDITOR_WORLD_STATE_ADAPTER_VERSION,
    phase: input.phase ?? null,
    levelId: input.level?.levelId ?? null,
    missionId: input.mission?.missionId ?? null,
    selectedCell: input.selectedCell ?? null,
    frameIndex: input.fieldState?.frameIndex ?? 0,
    currentVectorCount: input.currentField?.vectors?.length ?? 0,
    hazardCount: countGridCells(input.level?.layers?.hazards),
    terrainCellCount: countGridCells(input.level?.layers?.terrain),
    dropZoneCount: input.options?.dropZones?.length ?? 0,
    agentCount: input.mission?.agents?.length ?? 0,
    hiddenTruthExcluded: input.options?.includesHiddenTruth !== true,
    rendererOwnsState: false,
    ownsSimulationState: false,
    ownsScoring: false
  };
}

export function buildEditorWorldRenderViewModel(document = {}, options = {}) {
  const input = editorWorldRenderInputFromDocument(document, options);
  const validation = validateMissionEditorDocument(input.editorDocument);
  const viewModel = buildMissionWorldRenderViewModel(input);
  viewModel.type = 'anchor.rendering.editor-world';
  viewModel.version = EDITOR_WORLD_RENDER_VIEW_MODEL_VERSION;
  viewModel.phase = 'editor';
  viewModel.editor = {
    document: missionEditorDocumentSummary(input.editorDocument),
    validation: missionEditorValidationSummary(validation),
    activeTool: input.editorDocument.editorState?.activeTool ?? null,
    frameIndex: input.fieldState?.frameIndex ?? 0,
    frameScope: input.editorDocument.editorState?.frameScope ?? 'current',
    brushRadius: input.editorDocument.editorState?.brushRadius ?? 1,
    brushIntensity: input.editorDocument.editorState?.brushIntensity ?? 0.45,
    currentTool: input.editorDocument.editorState?.currentTool ?? 'directional',
    authority: 'canonicalMissionEditorDocument'
  };
  viewModel.interactionViewModel = {
    mode: 'editorBrush',
    activeTool: viewModel.editor.activeTool,
    selectedCell: viewModel.selectedCell,
    deploymentSelectionActive: false,
    editorBrushRadius: viewModel.editor.brushRadius,
    editorFrameIndex: viewModel.editor.frameIndex,
    rendererOwnsState: false
  };
  viewModel.displaySettings = {
    ...(viewModel.displaySettings ?? {}),
    rendererBackend: 'threeMissionEditor'
  };
  viewModel.visibility = { ...(viewModel.visibility ?? {}), rendererBackend: 'threeMissionEditor' };
  viewModel.warnings = [
    ...(viewModel.warnings ?? []),
    ...validation.warnings.map((issue) => issue.message)
  ];
  viewModel.boundaryFlags = {
    ...(viewModel.boundaryFlags ?? {}),
    usesThreeRenderer: true,
    rendererOwnsEditorState: false,
    editorDocumentIsAuthority: true,
    changesMissionState: false,
    ownsSimulationState: false,
    ownsPlanning: false,
    ownsScoring: false,
    ownsReplaySemantics: false,
    changesOfficialBrowserScoring: false,
    usesWebGPUFluid: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false,
    includesHiddenTruth: false
  };
  viewModel.presentationDirtyCategories = options.dirtyCategories ?? ['bathymetry', 'waterColumn', 'scalarField', 'currentVectors', 'vehiclePose', 'plannedRoute', 'selection', 'samplingTargets', 'routeStatus'];
  return viewModel;
}

export const EDITOR_WORLD_RENDER_VIEW_MODEL_VERSION = 'editor-world-render-view-model-three-r2b';

export function editorWorldRenderViewModelSummary(viewModel = {}) {
  return {
    type: 'anchor.rendering.editor-world-summary',
    version: EDITOR_WORLD_RENDER_VIEW_MODEL_VERSION,
    missionWorld: missionWorldRenderViewModelSummary(viewModel),
    editor: viewModel.editor ?? null,
    validationStatus: viewModel.editor?.validation?.status ?? null,
    activeTool: viewModel.editor?.activeTool ?? null,
    frameIndex: viewModel.editor?.frameIndex ?? null,
    rendererBackend: viewModel.displaySettings?.rendererBackend ?? null,
    usesThreeRenderer: viewModel.boundaryFlags?.usesThreeRenderer === true,
    rendererOwnsEditorState: viewModel.boundaryFlags?.rendererOwnsEditorState === true,
    editorDocumentIsAuthority: viewModel.boundaryFlags?.editorDocumentIsAuthority === true,
    ownsSimulationState: viewModel.boundaryFlags?.ownsSimulationState === true,
    ownsScoring: viewModel.boundaryFlags?.ownsScoring === true,
    hiddenTruthExcluded: viewModel.boundaryFlags?.includesHiddenTruth !== true
  };
}

export function validateEditorWorldRenderViewModel(viewModel = {}) {
  const base = validateMissionWorldRenderViewModel({ ...viewModel, type: 'anchor.rendering.mission-world' });
  const errors = [...base.errors];
  const warnings = [...base.warnings];
  if (viewModel.type !== 'anchor.rendering.editor-world') errors.push('Editor view model type must be anchor.rendering.editor-world.');
  if (viewModel.phase !== 'editor') errors.push('Editor view model phase must be editor.');
  if (viewModel.boundaryFlags?.rendererOwnsEditorState) errors.push('Editor renderer must not own editor state.');
  if (viewModel.boundaryFlags?.editorDocumentIsAuthority !== true) errors.push('Editor view model must identify the canonical document as authority.');
  if (viewModel.boundaryFlags?.includesHiddenTruth) errors.push('Editor view model must not include hidden truth.');
  return { valid: errors.length === 0, errors, warnings, summary: editorWorldRenderViewModelSummary(viewModel) };
}

function normalizeEditorDisplaySettings(displaySettings = {}, doc = {}) {
  return {
    rendererBackend: 'threeMissionEditor',
    cameraPreset: displaySettings.cameraPreset ?? 'obliqueMission',
    scalarFieldId: displaySettings.scalarFieldId ?? 'sampleValue',
    roiViewMode: 'absolute',
    showROI: displaySettings.showROI !== false,
    showCurrents: displaySettings.showCurrents !== false,
    showHazards: displaySettings.showHazards !== false,
    showTerrain: displaySettings.showTerrain !== false,
    bathymetry: displaySettings.bathymetry !== false,
    waterSurface: displaySettings.waterSurface !== false,
    depthLayers: displaySettings.depthLayers !== false,
    dropZones: displaySettings.dropZones !== false,
    gliders: displaySettings.gliders !== false,
    waypoints: false,
    routes: false,
    planningMarkers: false,
    priorityTargets: false,
    samplingTargets: true,
    scalarOpacity: Number(displaySettings.scalarOpacity ?? 0.72),
    waterColumn: {
      verticalDisplayMode: displaySettings.waterColumn?.verticalDisplayMode ?? 'physicalDepth',
      activeDepthLayerId: displaySettings.waterColumn?.activeDepthLayerId ?? 'surface',
      hiddenLayerIds: displaySettings.waterColumn?.hiddenLayerIds ?? [],
      visibleLayerIds: displaySettings.waterColumn?.visibleLayerIds ?? null,
      globalOpacity: displaySettings.waterColumn?.globalOpacity ?? 0.22,
      activeLayerEmphasis: displaySettings.waterColumn?.activeLayerEmphasis ?? 1.5,
      selectedScalarFieldId: displaySettings.waterColumn?.selectedScalarFieldId ?? 'sampleValue',
      currentDisplayMode: displaySettings.waterColumn?.currentDisplayMode ?? 'activeLayerOnly',
      fieldDisplayMode: displaySettings.waterColumn?.fieldDisplayMode ?? 'activeLayerOnly',
      showFieldOnAllLayers: displaySettings.waterColumn?.showFieldOnAllLayers === true,
      qualityProfile: displaySettings.waterColumn?.qualityProfile ?? displaySettings.qualityProfile ?? 'balanced',
      verticalExaggeration: displaySettings.waterColumn?.verticalExaggeration ?? 1.2,
      selectedDiveProfileId: null,
      selectedTargetDepthLayerId: null,
      maximumDiveDepthMeters: doc.mission?.agents?.[0]?.maxDepthMeters ?? null,
      cycleCount: null,
      sampleIntervalSeconds: null
    }
  };
}

function buildCurrentVectorLayer(level, frame, activeTimeSeconds, stride = null) {
  const grid = level.world?.grid ?? {};
  const width = Number(grid.width ?? 0);
  const height = Number(grid.height ?? 0);
  const current = frame.current ?? [];
  const step = Math.max(1, Number(stride ?? Math.ceil(Math.max(width, height) / 14)) || 1);
  const vectors = [];
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const vector = current[y]?.[x] ?? [0, 0];
    const u = Number(vector[0] ?? 0);
    const v = Number(vector[1] ?? 0);
    vectors.push({ id: `editor-current-${x}-${y}`, x, y, z: 0, u, v, magnitude: Math.hypot(u, v), timeSeconds: activeTimeSeconds, sourceVisibility: 'publicScenario' });
  }
  return { id: 'editorCurrentVectors', vectors, timeSeconds: activeTimeSeconds, sourceVisibility: 'publicScenario' };
}

function normalizeGrid(values, level) {
  const width = Number(level.world?.grid?.width ?? 0);
  const height = Number(level.world?.grid?.height ?? 0);
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
    const value = Number(values?.[y]?.[x] ?? 0);
    return Number.isFinite(value) ? value : 0;
  }));
}

function buildDropZones(level) {
  return (level.zones ?? [])
    .filter((zone) => zone.type === 'deployment' || zone.kind === 'deployment')
    .map((zone, index) => ({ id: zone.id ?? `drop-zone-${index + 1}`, label: zone.label ?? zone.id ?? `Drop Zone ${index + 1}`, cells: zone.cells ?? [], type: 'deployment' }));
}

function buildSelectedStarts(mission) {
  return (mission?.agents ?? []).map((agent) => ({ agentId: agent.id, start: agent.start ?? agent.deployment?.selectedStart ?? null })).filter((entry) => entry.start);
}

function buildEditorScienceTargets(level) {
  return (level.samplingTargets ?? []).map((target, index) => ({
    id: target.id ?? `editor-sampling-target-${index + 1}`,
    label: target.label ?? 'Editor sampling target',
    x: Number(target.x ?? 0),
    y: Number(target.y ?? 0),
    depthLayerId: target.depthLayerId ?? 'surface',
    selected: false,
    executable: false,
    sourceVisibility: 'publicScenario'
  }));
}

function defaultDepthLayers() {
  return [
    { id: 'surface', label: 'Surface', depthMeters: 0, visible: true },
    { id: 'thermocline', label: 'Thermocline', depthMeters: 40, visible: true },
    { id: 'deep', label: 'Deep', depthMeters: 90, visible: true }
  ];
}

function countGridCells(grid) {
  if (!Array.isArray(grid)) return 0;
  let count = 0;
  for (const row of grid) for (const value of row ?? []) if (Number(value ?? 0) > 0) count += 1;
  return count;
}

function clampInt(value, min, max) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
}

