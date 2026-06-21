import { updateThreeMissionWorldRenderer, resizeThreeMissionWorldRenderer, threeMissionWorldRendererSummary } from './ThreeMissionWorldRenderer.js';
import { createThreeMissionHitTestContext, hitTestThreeMissionWorld } from './ThreeMissionHitTest.js';
import { commandFromEditorIntent } from '../../core/editor/MissionEditorCommand.js';
import { createMissionEditorInteractionIntent, missionEditorInteractionIntentSummary, validateMissionEditorInteractionIntent } from '../../core/editor/MissionEditorInteractionIntent.js';
import { applyMissionEditorSessionCommand, createMissionEditorSession, missionEditorSessionSummary, replaceMissionEditorSessionDocument } from '../../core/editor/MissionEditorSession.js';
import { buildEditorWorldRenderViewModel, editorWorldRenderViewModelSummary, validateEditorWorldRenderViewModel } from '../../core/rendering/EditorWorldRenderViewModel.js';

export const THREE_MISSION_EDITOR_CONTROLLER_VERSION = 'three-mission-editor-controller-three-r2b';
const CLICK_THRESHOLD_PX = 6;

export function createThreeMissionEditorController({ renderer, session = null, document = null, getBrushConfig = null, onDocumentChange = null, onIntent = null, options = {} } = {}) {
  if (!renderer?.renderer?.domElement) throw new Error('createThreeMissionEditorController requires a Three mission renderer.');
  const controller = {
    type: 'anchor.renderer.three-mission-editor-controller',
    version: THREE_MISSION_EDITOR_CONTROLLER_VERSION,
    renderer,
    session: session ?? createMissionEditorSession(document ?? {}),
    getBrushConfig: getBrushConfig ?? (() => ({})),
    onDocumentChange,
    onIntent,
    enabled: options.enabled !== false,
    disposed: false,
    sequence: 0,
    listeners: [],
    pointerDown: null,
    activeViewModel: null,
    lastIntent: null,
    lastCommandResult: null,
    lastValidation: null,
    rejectedIntentCount: 0,
    handledIntentCount: 0,
    editorViewModelBuildCount: 0,
    editorGeometryIncrementalUpdateCount: 0,
    resourceLifecycle: { activeRendererCount: 1, activeControllerCount: 1, activeDomListenerCount: 0, disposedRendererCount: 0, staleCanvasCount: 0 }
  };
  const element = renderer.renderer.domElement;
  addListener(controller, element, 'pointerdown', (event) => onPointerDown(controller, event));
  addListener(controller, element, 'pointerup', (event) => onPointerUp(controller, event));
  addListener(controller, element, 'pointercancel', () => { controller.pointerDown = null; });
  addListener(controller, element, 'contextmenu', (event) => event.preventDefault?.());
  updateThreeMissionEditorController(controller, controller.session.document, { reason: 'initial' });
  publishThreeMissionEditorDebug(controller);
  return controller;
}

export function updateThreeMissionEditorController(controller, document = null, options = {}) {
  if (!controller || controller.disposed) return controller;
  if (document) replaceMissionEditorSessionDocument(controller.session, document);
  const viewModel = buildEditorWorldRenderViewModel(controller.session.document, {
    frameIndex: controller.session.document?.editorState?.frameIndex,
    displaySettings: options.displaySettings ?? { rendererBackend: 'threeMissionEditor' },
    dirtyCategories: options.dirtyCategories ?? null
  });
  controller.editorViewModelBuildCount += 1;
  controller.activeViewModel = viewModel;
  controller.lastValidation = validateEditorWorldRenderViewModel(viewModel);
  updateThreeMissionWorldRenderer(controller.renderer, viewModel);
  controller.editorGeometryIncrementalUpdateCount += 1;
  publishThreeMissionEditorDebug(controller, { lastUpdateReason: options.reason ?? 'refresh' });
  return controller;
}

export function handleThreeMissionEditorIntent(controller, intentOptions = {}) {
  if (!controller || controller.disposed || controller.enabled === false) return rejectedIntent(controller, intentOptions, 'Mission editor controller is not active.');
  const intent = intentOptions?.type === 'anchor.editor.interaction-intent'
    ? intentOptions
    : createMissionEditorInteractionIntent({ sequence: ++controller.sequence, ...intentOptions });
  controller.lastIntent = intent;
  controller.handledIntentCount += 1;
  controller.onIntent?.(intent);
  const validation = validateMissionEditorInteractionIntent(intent);
  if (!validation.valid) return rejectedIntent(controller, intent, validation.errors[0] ?? 'Invalid editor interaction intent.');
  if (intent.intentId === 'hoverCell' || intent.intentId === 'clearHover') {
    controller.session.document.selection = { ...(controller.session.document.selection ?? {}), selectedCell: intent.gridCell ?? null };
    updateThreeMissionEditorController(controller, null, { reason: intent.intentId, dirtyCategories: ['selection'] });
    return controller.lastCommandResult;
  }
  const config = controller.getBrushConfig?.() ?? {};
  const command = commandFromEditorIntent(intent, { brush: intent.brush ?? config.brush, config });
  const result = applyMissionEditorSessionCommand(controller.session, command);
  controller.lastCommandResult = result;
  if (!result.accepted) controller.rejectedIntentCount += 1;
  controller.onDocumentChange?.(controller.session.document, result);
  updateThreeMissionEditorController(controller, null, { reason: result.accepted ? 'commandAccepted' : 'commandRejected' });
  return result;
}

export function resizeThreeMissionEditorController(controller, width, height) {
  if (!controller || controller.disposed) return controller;
  resizeThreeMissionWorldRenderer(controller.renderer, width, height);
  publishThreeMissionEditorDebug(controller, { lastUpdateReason: 'resize' });
  return controller;
}

export function threeMissionEditorControllerSummary(controller = {}) {
  const rendererSummary = threeMissionWorldRendererSummary(controller.renderer ?? {});
  return {
    type: 'anchor.renderer.three-mission-editor-controller-summary',
    version: THREE_MISSION_EDITOR_CONTROLLER_VERSION,
    enabled: controller.enabled === true,
    disposed: controller.disposed === true,
    handledIntentCount: Number(controller.handledIntentCount ?? 0),
    rejectedIntentCount: Number(controller.rejectedIntentCount ?? 0),
    lastIntent: missionEditorInteractionIntentSummary(controller.lastIntent ?? {}),
    lastCommandType: controller.lastCommandResult?.command?.commandType ?? null,
    lastCommandAccepted: controller.lastCommandResult?.accepted ?? null,
    session: missionEditorSessionSummary(controller.session ?? {}),
    viewModel: editorWorldRenderViewModelSummary(controller.activeViewModel ?? controller.renderer?.viewModel ?? {}),
    renderer: rendererSummary,
    listenerCount: controller.listeners?.length ?? 0,
    editorViewModelBuildCount: Number(controller.editorViewModelBuildCount ?? 0),
    editorGeometryIncrementalUpdateCount: Number(controller.editorGeometryIncrementalUpdateCount ?? 0),
    normalEditorUsesThree: true,
    usesLegacyPhaserWorldRenderer: false,
    rendererOwnsEditorState: false,
    editorDocumentIsAuthority: true,
    ownsSimulationState: false,
    ownsScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    hiddenTruthExcluded: true,
    resourceLifecycle: summarizeResources(controller, rendererSummary)
  };
}

export function publishThreeMissionEditorDebug(controller, patch = {}) {
  const summary = threeMissionEditorControllerSummary(controller ?? {});
  const payload = { ...summary, ...patch };
  globalThis.ANCHOR_MISSION_EDITOR_DEBUG = payload;
  return payload;
}

export function disposeThreeMissionEditorController(controller) {
  if (!controller || controller.disposed) return;
  for (const { target, type, listener, options } of controller.listeners ?? []) target?.removeEventListener?.(type, listener, options);
  controller.listeners = [];
  controller.pointerDown = null;
  controller.disposed = true;
  publishThreeMissionEditorDebug(controller, {
    activeRendererCount: 0,
    activeControllerCount: 0,
    activeDomListenerCount: 0,
    resourceLifecycle: { activeRendererCount: 0, activeControllerCount: 0, activeDomListenerCount: 0, disposedControllerCount: 1, staleCanvasCount: 0 }
  });
}

function onPointerDown(controller, event) {
  if (!controller.enabled || controller.disposed) return;
  if (Number(event.button ?? 0) !== 0) return;
  const hit = hitTest(controller, event, { preferGrid: true });
  controller.pointerDown = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, hit };
  event.preventDefault?.();
}

function onPointerUp(controller, event) {
  if (!controller.enabled || controller.disposed) return;
  const down = controller.pointerDown;
  controller.pointerDown = null;
  if (!down || down.pointerId !== event.pointerId) return;
  const movement = Math.hypot(event.clientX - down.x, event.clientY - down.y);
  if (movement > CLICK_THRESHOLD_PX) return;
  const hit = hitTest(controller, event, { preferGrid: true });
  const config = controller.getBrushConfig?.() ?? {};
  const brush = config.brush ?? controller.session?.document?.editorState?.activeTool ?? 'terrain';
  const gridCell = hit.gridCell ?? down.hit?.gridCell;
  if (!gridCell) return;
  const intentId = brush === 'current' ? 'editCurrentVector' : 'applyBrush';
  handleThreeMissionEditorIntent(controller, {
    intentId,
    sourceBackend: 'threeMissionEditor',
    pointerType: event.pointerType,
    pointerId: event.pointerId,
    brush,
    gridCell,
    startCell: down.hit?.gridCell ?? gridCell,
    endCell: gridCell,
    continuousPoint: normalizeEditorContinuousPoint(hit.continuousPoint ?? gridCell.continuousPoint, gridCell),
    payload: { brush, gridCell, startCell: down.hit?.gridCell ?? gridCell, endCell: gridCell, config },
    metadata: { objectType: hit.objectType ?? 'gridCell', objectId: hit.objectId ?? `${gridCell.x}-${gridCell.y}`, hitCategory: hit.category ?? 'grid' }
  });
  event.preventDefault?.();
}

function hitTest(controller, event, options = {}) {
  try {
    const context = createThreeMissionHitTestContext({ renderer: controller.renderer, camera: controller.renderer?.camera, domElement: controller.renderer?.renderer?.domElement, viewModel: controller.activeViewModel ?? controller.renderer?.viewModel });
    return hitTestThreeMissionWorld(context, event, options);
  } catch {
    return { category: 'grid', objectType: 'gridCell', objectId: null, gridCell: fallbackCellFromPointer(controller, event), worldPoint: null };
  }
}

function normalizeEditorContinuousPoint(point = null, gridCell = null) {
  if (point?.derivedCell) return point;
  const x = Number(point?.x ?? point?.continuousX ?? gridCell?.continuousX ?? gridCell?.x);
  const y = Number(point?.y ?? point?.continuousY ?? gridCell?.continuousY ?? gridCell?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const cellX = Math.round(Number(gridCell?.x ?? x));
  const cellY = Math.round(Number(gridCell?.y ?? y));
  return {
    x,
    y,
    coordinateFrame: point?.coordinateFrame ?? 'continuousGridV1',
    derivedCell: { x: cellX, y: cellY, col: cellX, row: cellY }
  };
}
function fallbackCellFromPointer(controller, event) {
  const rect = controller.renderer?.renderer?.domElement?.getBoundingClientRect?.();
  const grid = controller.activeViewModel?.grid ?? controller.renderer?.viewModel?.grid ?? { width: 1, height: 1 };
  if (!rect) return null;
  const x = Math.max(0, Math.min(Number(grid.width ?? 1) - 1, Math.floor(((event.clientX - rect.left) / Math.max(1, rect.width)) * Number(grid.width ?? 1))));
  const y = Math.max(0, Math.min(Number(grid.height ?? 1) - 1, Math.floor(((event.clientY - rect.top) / Math.max(1, rect.height)) * Number(grid.height ?? 1))));
  return { x, y, col: x, row: y };
}

function addListener(controller, target, type, listener, options) {
  target.addEventListener(type, listener, options);
  controller.listeners.push({ target, type, listener, options });
  controller.resourceLifecycle.activeDomListenerCount = controller.listeners.length;
}

function rejectedIntent(controller, intent, message) {
  if (controller) controller.rejectedIntentCount = Number(controller.rejectedIntentCount ?? 0) + 1;
  return {
    type: 'anchor.editor.command-result',
    version: THREE_MISSION_EDITOR_CONTROLLER_VERSION,
    accepted: false,
    changedCanonicalDocument: false,
    command: null,
    document: controller?.session?.document ?? null,
    message,
    intent
  };
}

function summarizeResources(controller, rendererSummary = {}) {
  const active = controller?.disposed ? 0 : 1;
  return {
    activeRendererCount: controller?.disposed ? 0 : Number(rendererSummary.activeRendererCount ?? 1),
    activeControllerCount: active,
    activeDomListenerCount: controller?.disposed ? 0 : Number(controller?.listeners?.length ?? 0),
    activeRafCount: controller?.disposed ? 0 : Number(rendererSummary.activeRafCount ?? 0),
    activeCameraControllerCount: controller?.disposed ? 0 : 1,
    staleCanvasCount: controller?.disposed ? 0 : Number(globalThis.document?.querySelectorAll?.('.three-mission-world-canvas')?.length ?? 0)
  };
}

