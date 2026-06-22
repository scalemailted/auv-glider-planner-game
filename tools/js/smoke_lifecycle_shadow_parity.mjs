import assert from 'node:assert/strict';
import { createAnchorProductionLifecycle, dispatchAnchorLifecycleCommand, anchorProductionLifecycleSummary } from '../../src/app/production/AnchorProductionLifecycle.js';
import { createAnchorProductionSessionStore } from '../../src/app/production/AnchorProductionSessionStore.js';

const store = createAnchorProductionSessionStore();
const lifecycle = createAnchorProductionLifecycle({ sessionStore: store });
const commands = ['openMissionSetup', 'loadMission', 'startPlanning', 'executeMission', 'finishMission', 'openReplayReview', 'returnFromReplay', 'returnToMainMenu', 'openEditor', 'previewEditorMission', 'returnToEditor', 'returnToMainMenu'];
for (const command of commands) assert.equal(dispatchAnchorLifecycleCommand(lifecycle, command).accepted, true, `${command} accepted`);
const summary = anchorProductionLifecycleSummary(lifecycle);
assert.equal(summary.activeRoute, 'productHub', 'shadow sequence returns to Product Hub');
assert.ok(summary.sessionSummary.planDigest, 'shadow lifecycle carries session digest');
console.log('lifecycle shadow parity smoke passed');
