import assert from 'node:assert/strict';

import { adaptiveSurfacingEventSummary, createAdaptiveSurfacingEvent, createCommunicationWindowRecord, validateAdaptiveSurfacingEvent, validateCommunicationWindowRecord } from '../../src/core/benchmark/AdaptiveSurfacingEvent.js';

const communicationWindow = createCommunicationWindowRecord({ windowId: 'adaptive-window', startTime: 100, durationSeconds: 240, objectiveUpdateAllowed: true });
assert.equal(validateCommunicationWindowRecord(communicationWindow).status, 'PASS', 'communication window record validates');

const event = createAdaptiveSurfacingEvent({
  episodeId: 'adaptive-surfacing-smoke',
  time: 100,
  gliderId: 'g1',
  position: { x: 3, y: 4 },
  samplesUploaded: 6,
  observationsReceived: 6,
  communicationWindow,
  diagnosisTriggered: true,
  objectiveUpdateAllowed: true
});
assert.equal(validateAdaptiveSurfacingEvent(event).status, 'PASS', 'surfacing event validates');
assert.equal(event.diagnosisTriggered, true, 'diagnosisTriggered flag works');
assert.equal(adaptiveSurfacingEventSummary(event).communicationWindowId, 'adaptive-window', 'event summary is stable');

console.log('smoke_adaptive_surfacing_event: ok');
