import assert from 'node:assert/strict';
import { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';
import { currentSourceTimeFrameSignature } from '../../src/core/rendering/CurrentPresentationState.js';

const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-runtime-r1-1-visible-planning-smoke', waypointCount: 3, agentCount: 3 });
fixture.state.mode = 'planning';
fixture.state.ui.showCurrents = true;
fixture.state.ui.threeMissionLayers.currentVectors = true;
fixture.state.ui.waterColumn.currentDisplayMode = 'stackedDepthField';
fixture.state.ui.waterColumn.showContextCurrents = true;
fixture.state.ui.waterColumn.currentVectorDensity = 'balanced';

function viewAtPlanningHour(hour) {
  fixture.state.planningTime = hour;
  const viewModel = buildNormalGeneratedCurrentViewModel({ fixture }).viewModel;
  const sample = viewModel.waterColumnExplorer?.selectedCurrentProfile?.samplesByDepth?.[0] ?? null;
  return {
    hour,
    viewModel,
    sample,
    signature: currentSourceTimeFrameSignature(viewModel),
    currentPresentationTimeSeconds: viewModel.currentPresentationTimeSeconds,
    missionTimelineTimeSeconds: viewModel.missionTimelineTimeSeconds,
    bridge: viewModel.planningTimelineTimeBridge
  };
}

const frames = [0, 8, 16, 24].map(viewAtPlanningHour);
for (const frame of frames) {
  assert.equal(frame.bridge?.conversionApplied, true, 'Planning-hour bridge applies conversion');
  assert.equal(frame.currentPresentationTimeSeconds, frame.hour * 3600, 'Planning hours convert to current seconds');
  assert.equal(frame.missionTimelineTimeSeconds, frame.currentPresentationTimeSeconds, 'mission timeline seconds match current presentation seconds');
  assert.equal(frame.sample?.currentSampleTimeSeconds, frame.currentPresentationTimeSeconds, 'sampler receives current presentation seconds');
  assert.equal(Number.isFinite(Number(frame.sample?.uEastMetersPerSecond)), true, 'sample U is finite');
  assert.equal(Number.isFinite(Number(frame.sample?.vNorthMetersPerSecond)), true, 'sample V is finite');
}
assert.notEqual(frames[0].signature, frames[1].signature, 'current source signature changes after visible Next-size time advance');
assert.notEqual(frames[1].signature, frames[2].signature, 'current source signature changes across consecutive Planning frames');
assert.equal(frames[0].viewModel.activeTimeSeconds, 0, 'base active Planning time remains mission timeline units');
assert.equal(frames[1].viewModel.activeTimeSeconds, 8, 'heatmap/planning base time remains hours');
console.log('[smoke_visible_planning_timeline_current_binding] PASS', frames.map((frame) => ({ hour: frame.hour, currentSeconds: frame.currentPresentationTimeSeconds, signature: frame.signature })));
