import assert from 'node:assert/strict';
import { createMissionEditorFixture } from './mission_editor_fixture.mjs';
import { createMissionEditorCommand } from '../../src/core/editor/MissionEditorCommand.js';
import { applyMissionEditorSessionCommand, createMissionEditorSession, missionEditorSessionSummary, resetMissionEditorSession } from '../../src/core/editor/MissionEditorSession.js';

const { document } = createMissionEditorFixture();
const session = createMissionEditorSession(document, { sessionId: 'three-r2b-session-smoke' });
const accepted = applyMissionEditorSessionCommand(session, createMissionEditorCommand('addObjective', { gridCell: { x: 4, y: 4 } }));
assert.equal(accepted.accepted, true, accepted.message);
const rejected = applyMissionEditorSessionCommand(session, createMissionEditorCommand('paintLand', { gridCell: { x: -5, y: 1 } }));
assert.equal(rejected.accepted, false, 'invalid command rejected');
const summary = missionEditorSessionSummary(session);
assert.equal(summary.commandCount, 2);
assert.equal(summary.acceptedCommandCount, 1);
assert.equal(summary.rejectedCommandCount, 1);
assert.equal(summary.rendererOwnsState, false);
resetMissionEditorSession(session);
assert.equal(missionEditorSessionSummary(session).acceptedCommandCount, 0, 'reset clears history');
console.log('smoke_mission_editor_session: PASS', JSON.stringify(summary));
