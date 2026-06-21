import { createMissionWorldInteractionResult } from '../rendering/MissionWorldInteractionResult.js';
import { applyEditorCellBrush, editCurrentVector, normalizeLevelForEditor, updateLevelTime, updateMissionAgents } from './LevelEditOperations.js';
import { cloneMissionEditorDocument, missionEditorDocumentDigest, normalizeMissionEditorDocument } from './MissionEditorDocument.js';
import { validateMissionEditorDocument } from './MissionEditorValidation.js';

export const MISSION_EDITOR_COMMAND_VERSION = 'mission-editor-command-three-r2b';

export const MISSION_EDITOR_COMMAND_TYPES = Object.freeze([
  'paintLand',
  'paintWater',
  'setBlockedCell',
  'clearBlockedCell',
  'addDropZone',
  'addHazard',
  'addObjective',
  'addSamplingTarget',
  'setGliderStart',
  'editCurrentVector',
  'setDomainSize',
  'setScenarioSeed',
  'setMissionDuration',
  'replaceDocument',
  'resetDocument',
  'setWaterColumnConfig',
  'setCurrentField',
  'setEditorState'
]);

export function createMissionEditorCommand(type, payload = {}, options = {}) {
  const commandType = MISSION_EDITOR_COMMAND_TYPES.includes(type) ? type : 'setEditorState';
  return {
    type: 'anchor.editor.command',
    version: MISSION_EDITOR_COMMAND_VERSION,
    commandType,
    commandId: options.commandId ?? `${commandType}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    payload: clonePlain(payload),
    source: options.source ?? 'editorUiIntent',
    createdAt: options.createdAt ?? null,
    boundaryFlags: {
      rendererOwnsMutation: false,
      requiresCanonicalDocument: true,
      ownsSimulationState: false,
      ownsScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      ...(options.boundaryFlags ?? {})
    }
  };
}

export function commandFromEditorIntent(intent = {}, options = {}) {
  const gridCell = intent.gridCell ?? intent.payload?.gridCell ?? null;
  const brush = intent.brush ?? intent.payload?.brush ?? options.brush ?? 'terrain';
  const commandType = intent.intentId === 'editCurrentVector' || brush === 'current'
    ? 'editCurrentVector'
    : brushToCommandType(brush);
  return createMissionEditorCommand(commandType, {
    ...clonePlain(intent.payload ?? {}),
    gridCell,
    startCell: intent.startCell ?? intent.payload?.startCell ?? gridCell,
    endCell: intent.endCell ?? intent.payload?.endCell ?? gridCell,
    brush,
    config: { ...(options.config ?? {}), ...(intent.config ?? intent.payload?.config ?? {}) }
  }, { source: intent.sourceBackend ?? 'threeMissionEditor' });
}

export function applyMissionEditorCommand(document = {}, command = {}) {
  const before = normalizeMissionEditorDocument(document);
  const beforeDigest = missionEditorDocumentDigest(before);
  const next = cloneMissionEditorDocument(before);
  const normalizedCommand = command?.type === 'anchor.editor.command' ? command : createMissionEditorCommand(command.commandType ?? command.type, command.payload ?? command);
  const payload = normalizedCommand.payload ?? {};
  const result = executeCommand(next, normalizedCommand.commandType, payload);
  const validation = validateMissionEditorDocument(next);
  const afterDigest = missionEditorDocumentDigest(next);
  const changed = beforeDigest !== afterDigest;
  const accepted = result.accepted !== false && validation.valid;
  return {
    type: 'anchor.editor.command-result',
    version: MISSION_EDITOR_COMMAND_VERSION,
    command: normalizedCommand,
    document: accepted ? next : before,
    accepted,
    changedCanonicalDocument: accepted && changed,
    beforeDigest,
    afterDigest: accepted ? afterDigest : beforeDigest,
    validation: accepted ? validation : validateMissionEditorDocument(before),
    interactionResult: createMissionWorldInteractionResult({
      intentId: normalizedCommand.commandType,
      status: accepted ? (changed ? 'accepted' : 'noChange') : 'rejected',
      changedCanonicalState: accepted && changed,
      committedGridCell: payload.gridCell ?? payload.endCell ?? null,
      warnings: accepted ? validation.warnings.map((issue) => issue.message) : [result.message ?? validation.errors?.[0]?.message ?? 'Editor command rejected.'],
      userMessage: accepted ? (result.message ?? 'Editor command applied.') : (result.message ?? validation.errors?.[0]?.message ?? 'Editor command rejected.'),
      boundaryFlags: { ownsPlanning: false, ownsSimulation: false, ownsScoring: false, changesOfficialBrowserScoring: false, usesNewPlanner: false, usesRouteOptimizer: false }
    }),
    message: result.message ?? (accepted ? 'Editor command applied.' : 'Editor command rejected.'),
    boundaryFlags: {
      rendererOwnsMutation: false,
      rendererStateIsAuthority: false,
      ownsSimulationState: false,
      ownsScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false
    }
  };
}

function executeCommand(document, commandType, payload = {}) {
  normalizeLevelForEditor(document.level);
  document.mission = updateMissionAgents(document.mission, document.level, {});
  document.editorState = { ...(document.editorState ?? {}) };
  const config = normalizeCommandConfig(document, payload);
  if (commandType === 'replaceDocument') {
    const replacement = normalizeMissionEditorDocument(payload.document ?? payload);
    Object.assign(document, replacement);
    return ok('Editor document replaced.');
  }
  if (commandType === 'resetDocument') return ok('Reset command accepted by session.');
  if (commandType === 'setEditorState') {
    document.editorState = { ...document.editorState, ...clonePlain(payload.editorState ?? payload) };
    return ok('Editor state updated.');
  }
  if (commandType === 'setDomainSize') {
    const width = clampInt(payload.width, 8, 64, document.level.world.grid.width);
    const height = clampInt(payload.height, 8, 64, document.level.world.grid.height);
    if (width === document.level.world.grid.width && height === document.level.world.grid.height) return ok('Domain size unchanged.');
    document.level.world.grid = { ...document.level.world.grid, width, height };
    normalizeLevelForEditor(document.level);
    return ok(`Domain resized to ${width} x ${height}.`);
  }
  if (commandType === 'setScenarioSeed') {
    document.level.meta ??= {};
    document.level.meta.seed = String(payload.seed ?? document.level.meta.seed ?? 'editor');
    return ok('Scenario seed updated.');
  }
  if (commandType === 'setMissionDuration') {
    updateLevelTime(document.level, payload);
    return ok('Mission duration/time settings updated.');
  }
  if (commandType === 'setWaterColumnConfig') {
    document.level.waterColumn ??= {};
    document.level.waterColumn = { ...document.level.waterColumn, ...clonePlain(payload.waterColumn ?? payload) };
    return ok('Water-column configuration updated.');
  }
  if (commandType === 'setCurrentField') {
    const frames = payload.frames ?? payload.truth?.frames ?? null;
    if (!Array.isArray(frames) || !frames.length) return reject('Current field command requires frames.');
    document.level.layers.truth.frames = frames.map((frame) => ({ ...clonePlain(frame) }));
    normalizeLevelForEditor(document.level);
    return ok('Current field frames replaced.');
  }
  if (commandType === 'editCurrentVector') {
    const applied = editCurrentVector(document.level, payload.startCell ?? payload.gridCell, payload.endCell ?? payload.gridCell, config);
    document.editorState.activeTool = 'current';
    document.editorState.currentTool = config.currentTool;
    return applied ? ok('Current vector edit applied.') : reject('Current vector edit was outside the editable grid.');
  }
  const cell = payload.gridCell ?? payload.cell ?? payload;
  if (!cellInBounds(document.level, cell)) return reject('Editor command target is outside the editable grid.');
  const brush = commandTypeToBrush(commandType, payload.brush);
  const applied = applyEditorCellBrush(document.level, document.mission, Math.round(Number(cell.x)), Math.round(Number(cell.y)), brush, config);
  if (commandType === 'addObjective') addObjectiveRecord(document.level, cell, payload);
  if (commandType === 'addSamplingTarget') addSamplingTargetRecord(document.level, cell, payload);
  document.level.missionDefaults = clonePlain(document.mission);
  document.editorState.activeTool = payload.brush ?? brush;
  document.editorState.frameIndex = config.frameIndex;
  document.editorState.frameScope = config.frameScope;
  document.editorState.brushRadius = config.radius;
  document.editorState.brushIntensity = config.intensity;
  return applied ? ok(`${labelize(commandType)} applied at (${Math.round(Number(cell.x))}, ${Math.round(Number(cell.y))}).`) : reject(`${labelize(commandType)} could not be applied at that cell.`);
}

function brushToCommandType(brush) {
  if (brush === 'terrain') return 'paintLand';
  if (brush === 'clear' || brush === 'shallow' || brush === 'depth') return 'paintWater';
  if (brush === 'hazard') return 'addHazard';
  if (brush === 'roi') return 'addObjective';
  if (brush === 'deploymentZone') return 'addDropZone';
  if (brush === 'agentStart') return 'setGliderStart';
  if (brush === 'base') return 'addDropZone';
  return 'setEditorState';
}

function commandTypeToBrush(commandType, brush) {
  if (brush) return brush;
  if (commandType === 'paintLand' || commandType === 'setBlockedCell') return 'terrain';
  if (commandType === 'paintWater' || commandType === 'clearBlockedCell') return 'clear';
  if (commandType === 'addHazard') return 'hazard';
  if (commandType === 'addObjective') return 'roi';
  if (commandType === 'addSamplingTarget') return 'roi';
  if (commandType === 'addDropZone') return 'deploymentZone';
  if (commandType === 'setGliderStart') return 'agentStart';
  return 'clear';
}

function normalizeCommandConfig(document, payload = {}) {
  const state = document.editorState ?? {};
  const config = payload.config ?? {};
  return {
    frameIndex: clampInt(config.frameIndex ?? payload.frameIndex ?? state.frameIndex ?? 0, 0, Math.max(0, (document.level.layers?.truth?.frames?.length ?? 1) - 1), 0),
    frameScope: config.frameScope ?? payload.frameScope ?? state.frameScope ?? 'current',
    currentTool: config.currentTool ?? payload.currentTool ?? state.currentTool ?? 'directional',
    radius: clampNumber(config.radius ?? payload.radius ?? state.brushRadius ?? 1, 1, 8),
    intensity: clampNumber(config.intensity ?? payload.intensity ?? state.brushIntensity ?? 0.45, 0.1, 5),
    vectorStrength: clampNumber(config.vectorStrength ?? config.intensity ?? payload.intensity ?? state.brushIntensity ?? 0.45, 0.1, 5),
    agentId: config.agentId ?? payload.agentId ?? document.mission?.agents?.[0]?.id ?? null,
    refreshForecast: config.refreshForecast === true || payload.refreshForecast === true
  };
}

function addObjectiveRecord(level, cell, payload = {}) {
  level.objectives ??= [];
  const x = Math.round(Number(cell.x));
  const y = Math.round(Number(cell.y));
  const id = payload.id ?? `editor_objective_${x}_${y}`;
  if (!level.objectives.some((objective) => objective.id === id)) level.objectives.push({ id, type: 'roiCell', x, y, label: payload.label ?? 'Editor ROI objective' });
}

function addSamplingTargetRecord(level, cell, payload = {}) {
  level.samplingTargets ??= [];
  const x = Math.round(Number(cell.x));
  const y = Math.round(Number(cell.y));
  const id = payload.id ?? `editor_sampling_target_${x}_${y}`;
  if (!level.samplingTargets.some((target) => target.id === id)) level.samplingTargets.push({ id, x, y, depthLayerId: payload.depthLayerId ?? 'surface', label: payload.label ?? 'Editor sampling target' });
}

function cellInBounds(level, cell) {
  const width = Number(level?.world?.grid?.width ?? 0);
  const height = Number(level?.world?.grid?.height ?? 0);
  const x = Number(cell?.x ?? cell?.col);
  const y = Number(cell?.y ?? cell?.row);
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x < width && y < height;
}

function ok(message) { return { accepted: true, message }; }
function reject(message) { return { accepted: false, message }; }
function clonePlain(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function clampNumber(value, min, max) { const number = Number(value); return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min; }
function clampInt(value, min, max, fallback = min) { const number = Math.round(Number(value)); return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback; }
function labelize(value) { return String(value).replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()); }
