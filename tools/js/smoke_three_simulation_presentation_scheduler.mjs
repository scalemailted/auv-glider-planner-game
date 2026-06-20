import assert from 'node:assert/strict';
import {
  createThreeSimulationPresentationScheduler,
  markSimulationPresentationDirty,
  publishSimulationPresentationSnapshot,
  consumeSimulationPresentationFrame,
  pauseSimulationPresentationScheduler,
  resumeSimulationPresentationScheduler,
  disposeSimulationPresentationScheduler,
  threeSimulationPresentationSchedulerSummary
} from '../../src/game/three/ThreeSimulationPresentationScheduler.js';

const scheduler = createThreeSimulationPresentationScheduler({ now: () => 0, maxHz: 60 });
assert.equal(scheduler.ownsSimulationState, false);
publishSimulationPresentationSnapshot(scheduler, { simulationTimeSeconds: 1, sequence: 1 }, { engineStepCount: 4 });
markSimulationPresentationDirty(scheduler, ['vehiclePose'], 'step-1');
publishSimulationPresentationSnapshot(scheduler, { simulationTimeSeconds: 2, sequence: 2 }, { engineStepCount: 8 });
markSimulationPresentationDirty(scheduler, ['vehiclePose', 'realizedTrajectory'], 'step-2');
let summary = threeSimulationPresentationSchedulerSummary(scheduler);
assert.equal(summary.presentationRequestCount, 2);
assert.equal(summary.coalescedPresentationRequestCount, 1);
let frame = consumeSimulationPresentationFrame(scheduler, 20, { force: true });
assert.equal(frame.shouldPresent, true);
assert.equal(frame.snapshot.sequence, 2);
assert.ok(frame.dirtyCategories.includes('vehiclePose'));
assert.ok(frame.dirtyCategories.includes('realizedTrajectory'));
pauseSimulationPresentationScheduler(scheduler);
markSimulationPresentationDirty(scheduler, ['hud'], 'paused');
frame = consumeSimulationPresentationFrame(scheduler, 40);
assert.equal(frame.shouldPresent, false);
assert.equal(frame.reason, 'paused');
resumeSimulationPresentationScheduler(scheduler);
frame = consumeSimulationPresentationFrame(scheduler, 60, { force: true });
assert.equal(frame.shouldPresent, true);
disposeSimulationPresentationScheduler(scheduler);
summary = threeSimulationPresentationSchedulerSummary(scheduler);
assert.equal(summary.status, 'disposed');
markSimulationPresentationDirty(scheduler, ['hud'], 'disposed');
assert.equal(threeSimulationPresentationSchedulerSummary(scheduler).disposedRequestCount, 1);
console.log('PASS smoke_three_simulation_presentation_scheduler');
