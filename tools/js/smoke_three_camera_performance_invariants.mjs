import assert from 'node:assert/strict';
import { createThreePerformanceDebugPayload } from '../../src/game/three/ThreeMissionPerformanceMonitor.js';

const debug = createThreePerformanceDebugPayload({
  rendererSummary: {
    disposed: false,
    activeRafCount: 1,
    sceneObjectCount: 120,
    geometryCount: 40,
    materialCount: 22,
    textureCount: 8,
    rendererCalls: 36,
    performanceSummary: { enabled: true, sampleCount: 12, averageFrameMilliseconds: 16, p95FrameMilliseconds: 20, p99FrameMilliseconds: 24, warnings: [] },
    cameraController: { cameraOrbitChangeCount: 20, cameraPanChangeCount: 20, cameraZoomChangeCount: 20 },
    performanceCounters: { rendererUpdate: 2 }
  },
  missionViewModelBuildCount: 3,
  predictedTrajectoryBuildCount: 2,
  fieldTextureUpdateCount: 1,
  currentBufferUpdateCount: 1,
  routeGeometryUpdateCount: 1,
  samplingTargetGeometryUpdateCount: 1,
  missionConsoleRenderCount: 4,
  rightPanelRenderCount: 4,
  timelineRenderCount: 4,
  modelBuildCountDuringCameraGesture: 0,
  predictionBuildCountDuringCameraGesture: 0,
  textureUpdateCountDuringCameraGesture: 0,
  panelRenderCountDuringCameraGesture: 0,
  timelineRenderCountDuringCameraGesture: 0
});
assert.equal(debug.activeRendererCount, 1, 'planning/simulation debug reports one active renderer');
assert.equal(debug.activeRafCount, 1, 'planning/simulation debug reports one active RAF');
assert.equal(debug.cameraGestureCount, 60, 'camera gestures increment camera counters');
assert.equal(debug.modelBuildCountDuringCameraGesture, 0, 'camera gestures do not rebuild model');
assert.equal(debug.predictionBuildCountDuringCameraGesture, 0, 'camera gestures do not rebuild predictions');
assert.equal(debug.textureUpdateCountDuringCameraGesture, 0, 'camera gestures do not update field textures');
assert.equal(debug.panelRenderCountDuringCameraGesture, 0, 'camera gestures do not rerender panels');
assert.equal(debug.timelineRenderCountDuringCameraGesture, 0, 'camera gestures do not rerender timeline');
assert.equal(debug.status, 'ok', 'zero forbidden work reports ok status');

const warning = createThreePerformanceDebugPayload({ rendererSummary: { disposed: false, activeRafCount: 1 }, modelBuildCountDuringCameraGesture: 1 });
assert.equal(warning.status, 'warning', 'forbidden camera-gesture work reports warning status');
console.log(JSON.stringify({ ok: true, debug }));
