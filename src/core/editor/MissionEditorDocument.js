import { ensureLevelIdentity, shortInstanceId } from '../identity/GameInstanceId.js';
import { buildDefaultMissionForLevel, normalizeLevelForEditor, updateMissionAgents } from './LevelEditOperations.js';

export const MISSION_EDITOR_DOCUMENT_VERSION = 'mission-editor-document-three-r2b';

export function createMissionEditorDocument(source = {}, options = {}) {
  const sourceKind = detectSourceKind(source);
  const rawLevel = sourceKind === 'challenge' ? (source.level ?? source.challenge?.level ?? {}) : (source.level ?? source);
  const level = normalizeLevelForEditor(clonePlain(rawLevel));
  ensureLevelIdentity(level);
  const missionSource = source.mission ?? source.missionDefaults ?? source.level?.missionDefaults ?? level.missionDefaults ?? null;
  const mission = normalizeMissionForEditor(missionSource, level, options.missionConfig ?? {});
  level.missionDefaults = clonePlain(mission);
  level.meta ??= {};
  level.meta.generationConfig ??= {};
  level.meta.generationConfig.currentGenerator ??= {};
  level.meta.generationConfig.currentGenerator.synthetic = true;
  level.meta.generationConfig.currentGenerator.calibratedOceanForecast = false;
  level.meta.generationConfig.currentGenerator.note ??= 'Synthetic ocean-inspired current field for gameplay and planning practice, not validated ocean-model output.';
  level.meta.editorDocument = {
    version: MISSION_EDITOR_DOCUMENT_VERSION,
    sourceKind,
    createdAt: options.createdAt ?? null,
    note: 'Canonical mission editor document. Renderer state is derived from this object, not the authority.'
  };
  return {
    type: 'anchor.editor.mission-document',
    version: MISSION_EDITOR_DOCUMENT_VERSION,
    documentId: options.documentId ?? `editor-${level.levelId ?? shortInstanceId(level)}`,
    sourceKind,
    level,
    mission,
    selection: normalizeSelection(options.selection),
    editorState: {
      activeTool: options.activeTool ?? level.meta?.editorConfig?.brush ?? 'terrain',
      frameIndex: Math.max(0, Number(options.frameIndex ?? level.meta?.editorConfig?.frameIndex ?? 0) || 0),
      frameScope: options.frameScope ?? level.meta?.editorConfig?.frameScope ?? 'current',
      brushRadius: Number(options.brushRadius ?? level.meta?.editorConfig?.radius ?? 1),
      brushIntensity: Number(options.brushIntensity ?? level.meta?.editorConfig?.intensity ?? 0.45),
      currentTool: options.currentTool ?? level.meta?.editorConfig?.currentTool ?? 'directional'
    },
    metadata: {
      schemaVersion: '2.0',
      synthetic: true,
      calibratedOceanForecast: false,
      displayIsDerived: true,
      rendererOwnsState: false,
      hiddenTruthExcludedFromEditorExports: true,
      ...clonePlain(options.metadata ?? {})
    }
  };
}

export function normalizeMissionEditorDocument(document = {}, options = {}) {
  if (document?.type === 'anchor.editor.mission-document') {
    return createMissionEditorDocument({ level: document.level, mission: document.mission, sourceKind: document.sourceKind }, {
      ...options,
      documentId: document.documentId,
      selection: document.selection,
      activeTool: options.activeTool ?? document.editorState?.activeTool,
      frameIndex: options.frameIndex ?? document.editorState?.frameIndex,
      frameScope: options.frameScope ?? document.editorState?.frameScope,
      brushRadius: options.brushRadius ?? document.editorState?.brushRadius,
      brushIntensity: options.brushIntensity ?? document.editorState?.brushIntensity,
      currentTool: options.currentTool ?? document.editorState?.currentTool,
      metadata: { ...(document.metadata ?? {}), ...(options.metadata ?? {}) }
    });
  }
  return createMissionEditorDocument(document, options);
}

export function cloneMissionEditorDocument(document = {}) {
  return normalizeMissionEditorDocument(clonePlain(document));
}

export function updateMissionEditorDocumentFromScene(document, scene) {
  const next = normalizeMissionEditorDocument(document);
  if (scene?.level) next.level = normalizeLevelForEditor(scene.level);
  if (scene?.mission) next.mission = updateMissionAgents(scene.mission, next.level, {});
  next.level.missionDefaults = clonePlain(next.mission);
  next.editorState = {
    ...(next.editorState ?? {}),
    activeTool: scene?.brush ?? next.editorState?.activeTool ?? 'terrain',
    frameIndex: Math.max(0, Number(scene?.frameIndex ?? next.editorState?.frameIndex ?? 0) || 0),
    frameScope: scene?.readBrushConfig?.().frameScope ?? next.editorState?.frameScope ?? 'current',
    brushRadius: Number(scene?.editorToolState?.radius ?? next.editorState?.brushRadius ?? 1),
    brushIntensity: Number(scene?.editorToolState?.intensity ?? next.editorState?.brushIntensity ?? 0.45),
    currentTool: scene?.readBrushConfig?.().currentTool ?? next.editorState?.currentTool ?? 'directional'
  };
  return next;
}

export function missionEditorDocumentForExport(document = {}, options = {}) {
  const normalized = normalizeMissionEditorDocument(document);
  const level = normalizeLevelForEditor(clonePlain(normalized.level));
  level.missionDefaults = clonePlain(normalized.mission);
  level.meta ??= {};
  level.meta.editorConfig = {
    ...(level.meta.editorConfig ?? {}),
    brush: normalized.editorState.activeTool,
    frameIndex: normalized.editorState.frameIndex,
    frameScope: normalized.editorState.frameScope,
    radius: normalized.editorState.brushRadius,
    intensity: normalized.editorState.brushIntensity,
    currentTool: normalized.editorState.currentTool,
    authority: 'anchor.editor.mission-document'
  };
  level.meta.threeMissionEditor = {
    version: MISSION_EDITOR_DOCUMENT_VERSION,
    exportedAt: options.exportedAt ?? null,
    rendererOwnsState: false,
    calibratedOceanForecast: false,
    syntheticGameplayField: true
  };
  return level;
}

export function missionEditorDocumentDigest(document = {}) {
  const normalized = normalizeMissionEditorDocument(document);
  return stableDigest({ level: normalized.level, mission: normalized.mission });
}

export function missionEditorDocumentSummary(document = {}) {
  const normalized = normalizeMissionEditorDocument(document);
  const grid = normalized.level?.world?.grid ?? {};
  return {
    type: 'anchor.editor.mission-document-summary',
    version: MISSION_EDITOR_DOCUMENT_VERSION,
    documentId: normalized.documentId,
    sourceKind: normalized.sourceKind,
    levelId: normalized.level?.levelId ?? null,
    missionId: normalized.mission?.missionId ?? null,
    gridWidth: Number(grid.width ?? 0),
    gridHeight: Number(grid.height ?? 0),
    agentCount: normalized.mission?.agents?.length ?? 0,
    frameCount: normalized.level?.layers?.truth?.frames?.length ?? 0,
    activeTool: normalized.editorState?.activeTool ?? null,
    frameIndex: normalized.editorState?.frameIndex ?? 0,
    digest: missionEditorDocumentDigest(normalized),
    rendererOwnsState: false,
    synthetic: normalized.metadata?.synthetic !== false,
    calibratedOceanForecast: normalized.metadata?.calibratedOceanForecast === true
  };
}

function normalizeMissionForEditor(rawMission, level, config = {}) {
  const mission = rawMission ? clonePlain(rawMission) : buildDefaultMissionForLevel(level, config);
  mission.schemaVersion ??= '2.0';
  mission.type = 'anchor.mission';
  mission.missionId ??= config.missionId ?? 'custom_editor_mission';
  mission.meta ??= { name: 'Custom Editor Mission' };
  return updateMissionAgents(mission, level, config);
}

function normalizeSelection(selection = {}) {
  return {
    selectedCell: selection?.selectedCell ? { x: Number(selection.selectedCell.x), y: Number(selection.selectedCell.y) } : null,
    selectedAgentId: selection?.selectedAgentId ?? null,
    selectedObjectId: selection?.selectedObjectId ?? null,
    selectedObjectType: selection?.selectedObjectType ?? null
  };
}

function detectSourceKind(source = {}) {
  if (source?.sourceKind) return source.sourceKind;
  if (source?.type === 'anchor.challenge' || source?.challenge?.type === 'anchor.challenge') return 'challenge';
  if (source?.type === 'anchor.editor.mission-document') return 'editorDocument';
  if (source?.type === 'anchor.level' || source?.world?.grid) return 'level';
  return 'unknown';
}

function clonePlain(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableDigest(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

