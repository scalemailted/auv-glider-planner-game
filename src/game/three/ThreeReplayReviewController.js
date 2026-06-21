import { buildReplayWorldRenderViewModel, replayWorldRenderViewModelSummary, validateReplayWorldRenderViewModel } from '../../core/rendering/ReplayWorldRenderViewModel.js';
import { createReplayReviewSession, reduceReplayReviewSession, replayReviewSessionSummary } from '../../core/replay/ReplayReviewSession.js';
import {
  updateThreeMissionWorldRenderer,
  threeMissionWorldRendererSummary,
  resetThreeMissionWorldRendererPerformance
} from './ThreeMissionWorldRenderer.js';

export const THREE_REPLAY_REVIEW_CONTROLLER_VERSION = 'three-replay-review-controller-r2a';

export function createThreeReplayReviewController({ renderer = null, source = null, session = null, options = {} } = {}) {
  const resolvedSession = session ?? createReplayReviewSession(source ?? {}, options);
  const viewModel = buildReplayWorldRenderViewModel(resolvedSession, options);
  const controller = {
    type: 'anchor.renderer.three-replay-review-controller',
    version: THREE_REPLAY_REVIEW_CONTROLLER_VERSION,
    renderer,
    source: source ?? resolvedSession.source,
    session: resolvedSession,
    viewModel,
    lastAction: { type: 'init' },
    updateCount: 0,
    replayViewModelBuildCount: 1,
    replayViewModelCacheHitCount: 0,
    replayStaticGeometryBuildCount: 0,
    replayDynamicGeometryBuildCount: 0,
    replayGeometryFullRebuildCount: 0,
    replayGeometryIncrementalUpdateCount: 0,
    disposed: false,
    boundaryFlags: {
      ownsSimulation: false,
      ownsPlanning: false,
      ownsScoring: false,
      ownsReplaySemantics: false,
      usesHiddenTruthResimulation: false,
      usesAuthoritativeHiddenStateReplay: false,
      changesOfficialBrowserScoring: false,
      rendererAuthoritativeForReplay: false
    }
  };
  pushReplayViewModelToRenderer(controller, 'init');
  return controller;
}

export function updateThreeReplayReviewController(controller = null, action = {}) {
  if (!controller || controller.disposed) return controller;
  controller.session = reduceReplayReviewSession(controller.session, action);
  controller.viewModel = buildReplayWorldRenderViewModel(controller.session, action.options ?? {});
  controller.lastAction = action;
  controller.updateCount = Number(controller.updateCount ?? 0) + 1;
  controller.replayViewModelBuildCount = Number(controller.replayViewModelBuildCount ?? 0) + 1;
  controller.replayDynamicGeometryBuildCount = Number(controller.replayDynamicGeometryBuildCount ?? 0) + 1;
  controller.replayGeometryIncrementalUpdateCount = Number(controller.replayGeometryIncrementalUpdateCount ?? 0) + 1;
  pushReplayViewModelToRenderer(controller, action.type ?? 'update');
  return controller;
}

export function disposeThreeReplayReviewController(controller = null) {
  if (!controller) return null;
  controller.disposed = true;
  controller.renderer = null;
  controller.viewModel = null;
  return controller;
}

export function resetThreeReplayReviewPerformance(controller = null) {
  if (controller?.renderer) resetThreeMissionWorldRendererPerformance(controller.renderer);
  return controller;
}

export function threeReplayReviewControllerSummary(controller = {}) {
  const validation = controller?.viewModel ? validateReplayWorldRenderViewModel(controller.viewModel) : null;
  return {
    type: 'anchor.renderer.three-replay-review-controller-summary',
    version: THREE_REPLAY_REVIEW_CONTROLLER_VERSION,
    disposed: controller?.disposed === true,
    updateCount: Number(controller?.updateCount ?? 0),
    replayViewModelBuildCount: Number(controller?.replayViewModelBuildCount ?? 0),
    replayViewModelCacheHitCount: Number(controller?.replayViewModelCacheHitCount ?? 0),
    replayStaticGeometryBuildCount: Number(controller?.replayStaticGeometryBuildCount ?? 0),
    replayDynamicGeometryBuildCount: Number(controller?.replayDynamicGeometryBuildCount ?? 0),
    replayGeometryFullRebuildCount: Number(controller?.replayGeometryFullRebuildCount ?? 0),
    replayGeometryIncrementalUpdateCount: Number(controller?.replayGeometryIncrementalUpdateCount ?? 0),
    lastActionType: controller?.lastAction?.type ?? null,
    hasRenderer: Boolean(controller?.renderer),
    session: replayReviewSessionSummary(controller?.session ?? {}),
    viewModel: controller?.viewModel ? replayWorldRenderViewModelSummary(controller.viewModel) : null,
    renderer: controller?.renderer ? threeMissionWorldRendererSummary(controller.renderer) : null,
    validationStatus: validation?.status ?? null,
    validationErrors: validation?.errors ?? [],
    publicSafe: controller?.viewModel?.boundaryFlags?.includesHiddenTruth !== true,
    usesSharedReplayReducer: true,
    replayOwnsSimulation: false,
    replayOwnsScoring: false,
    rendererOwnsReplaySemantics: false,
    includesHiddenTruth: false,
    ownsSimulation: false,
    ownsPlanning: false,
    ownsScoring: false,
    ownsReplaySemantics: false,
    usesHiddenTruthResimulation: false,
    usesAuthoritativeHiddenStateReplay: false,
    changesOfficialBrowserScoring: false,
    usesNewPlanner: false,
    usesRouteOptimizer: false,
    usesMARL: false
  };
}

function pushReplayViewModelToRenderer(controller, reason = 'update') {
  if (!controller?.renderer || !controller.viewModel) return;
  updateThreeMissionWorldRenderer(controller.renderer, {
    ...controller.viewModel,
    presentationDirtyCategories: controller.viewModel.presentationDirtyCategories ?? ['vehiclePose', 'realizedTrajectory', 'observations', 'surfacingEvents', 'routeStatus', 'simulationStatus'],
    replayPresentationReason: reason
  });
}
