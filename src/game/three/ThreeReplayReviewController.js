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
    lastActionType: controller?.lastAction?.type ?? null,
    hasRenderer: Boolean(controller?.renderer),
    session: replayReviewSessionSummary(controller?.session ?? {}),
    viewModel: controller?.viewModel ? replayWorldRenderViewModelSummary(controller.viewModel) : null,
    renderer: controller?.renderer ? threeMissionWorldRendererSummary(controller.renderer) : null,
    validationStatus: validation?.status ?? null,
    validationErrors: validation?.errors ?? [],
    publicSafe: controller?.viewModel?.boundaryFlags?.includesHiddenTruth !== true,
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
