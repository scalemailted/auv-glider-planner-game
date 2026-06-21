export const MISSION_EDITOR_INTERACTION_INTENT_VERSION = 'mission-editor-interaction-intent-three-r2b';

export const MISSION_EDITOR_INTENT_IDS = Object.freeze([
  'hoverCell',
  'clearHover',
  'applyBrush',
  'startCurrentVector',
  'previewCurrentVector',
  'editCurrentVector',
  'selectObject',
  'setActiveTool',
  'setFrameIndex',
  'requestPreview',
  'requestExport',
  'cancelInteraction'
]);

export function createMissionEditorInteractionIntent(options = {}) {
  const intentId = MISSION_EDITOR_INTENT_IDS.includes(options.intentId) ? options.intentId : 'cancelInteraction';
  return {
    type: 'anchor.editor.interaction-intent',
    version: MISSION_EDITOR_INTERACTION_INTENT_VERSION,
    intentId,
    sourceBackend: options.sourceBackend ?? 'threeMissionEditor',
    pointerType: options.pointerType ?? null,
    pointerId: finiteOrNull(options.pointerId),
    brush: options.brush ?? options.payload?.brush ?? null,
    gridCell: normalizeCell(options.gridCell ?? options.payload?.gridCell),
    startCell: normalizeCell(options.startCell ?? options.payload?.startCell),
    endCell: normalizeCell(options.endCell ?? options.payload?.endCell),
    continuousPoint: normalizeContinuousPoint(options.continuousPoint ?? options.gridCell?.continuousPoint),
    frameIndex: finiteOrNull(options.frameIndex),
    objectId: options.objectId ?? null,
    objectType: options.objectType ?? null,
    sequence: finiteNumber(options.sequence, 0),
    payload: clonePlain(options.payload ?? {}),
    metadata: clonePlain(options.metadata ?? {}),
    boundaryFlags: {
      requiresCanonicalCommand: true,
      rendererOwnsMutation: false,
      rendererStateIsAuthority: false,
      ownsSimulationState: false,
      ownsScoring: false,
      usesNewPlanner: false,
      usesRouteOptimizer: false,
      ...(options.boundaryFlags ?? {})
    }
  };
}

export function validateMissionEditorInteractionIntent(intent = {}) {
  const errors = [];
  const warnings = [];
  if (intent.type !== 'anchor.editor.interaction-intent') errors.push('Mission editor intent type must be anchor.editor.interaction-intent.');
  if (!MISSION_EDITOR_INTENT_IDS.includes(intent.intentId)) errors.push(`Unknown mission editor intent: ${String(intent.intentId ?? '')}.`);
  if (intent.boundaryFlags?.requiresCanonicalCommand !== true) errors.push('Mission editor intents must require canonical command handling.');
  if (intent.boundaryFlags?.rendererOwnsMutation === true || intent.boundaryFlags?.rendererStateIsAuthority === true) errors.push('Mission editor renderer must not own canonical mutation.');
  if (intent.boundaryFlags?.ownsSimulationState) errors.push('Mission editor intent must not own simulation state.');
  if (intent.boundaryFlags?.ownsScoring) errors.push('Mission editor intent must not own scoring.');
  if ((intent.intentId === 'applyBrush' || intent.intentId === 'editCurrentVector') && !intent.gridCell && !intent.endCell) warnings.push('Mutation intent has no target cell.');
  return { valid: errors.length === 0, errors, warnings, summary: missionEditorInteractionIntentSummary(intent) };
}

export function missionEditorInteractionIntentSummary(intent = {}) {
  return {
    type: 'anchor.editor.interaction-intent-summary',
    version: MISSION_EDITOR_INTERACTION_INTENT_VERSION,
    intentId: intent.intentId ?? null,
    sourceBackend: intent.sourceBackend ?? null,
    brush: intent.brush ?? null,
    gridCell: intent.gridCell ? { x: intent.gridCell.x, y: intent.gridCell.y } : null,
    objectType: intent.objectType ?? intent.metadata?.objectType ?? null,
    objectId: intent.objectId ?? intent.metadata?.objectId ?? null,
    requiresCanonicalCommand: intent.boundaryFlags?.requiresCanonicalCommand === true,
    rendererOwnsMutation: intent.boundaryFlags?.rendererOwnsMutation === true,
    rendererStateIsAuthority: intent.boundaryFlags?.rendererStateIsAuthority === true,
    ownsSimulationState: intent.boundaryFlags?.ownsSimulationState === true,
    ownsScoring: intent.boundaryFlags?.ownsScoring === true,
    usesNewPlanner: intent.boundaryFlags?.usesNewPlanner === true
  };
}

function normalizeCell(cell = null) {
  if (!cell) return null;
  const x = Number(cell.x ?? cell.col);
  const y = Number(cell.y ?? cell.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: Math.round(x), y: Math.round(y), col: Math.round(x), row: Math.round(y), continuousPoint: cell.continuousPoint ?? null };
}

function normalizeContinuousPoint(point = null) {
  if (!point) return null;
  const x = Number(point.x ?? point.col);
  const y = Number(point.y ?? point.row);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y, coordinateFrame: point.coordinateFrame ?? 'continuousGridV1', derivedCell: point.derivedCell ?? { x: Math.round(x), y: Math.round(y), col: Math.round(x), row: Math.round(y) } };
}

function finiteNumber(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }
function finiteOrNull(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
function clonePlain(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
