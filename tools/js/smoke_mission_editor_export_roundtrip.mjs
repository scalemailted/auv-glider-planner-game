import assert from 'node:assert/strict';
import { createMissionEditorFixture } from './mission_editor_fixture.mjs';
import { createMissionEditorCommand, applyMissionEditorCommand } from '../../src/core/editor/MissionEditorCommand.js';
import { createMissionEditorDocument, missionEditorDocumentDigest, missionEditorDocumentForExport } from '../../src/core/editor/MissionEditorDocument.js';
import { validateMissionEditorDocument } from '../../src/core/editor/MissionEditorValidation.js';

const { document } = createMissionEditorFixture();
const edited = applyMissionEditorCommand(document, createMissionEditorCommand('addHazard', { gridCell: { x: 3, y: 3 } }));
assert.equal(edited.accepted, true, edited.message);
const exportedLevel = missionEditorDocumentForExport(edited.document, { exportedAt: '2026-06-21T00:00:00.000Z' });
const reimported = createMissionEditorDocument({ level: exportedLevel, mission: exportedLevel.missionDefaults });
const report = validateMissionEditorDocument(reimported);
assert.equal(report.valid, true, report.issues.map((issue) => issue.message).join('\n'));
assert.equal(exportedLevel.meta.threeMissionEditor.rendererOwnsState, false);
assert.equal(reimported.level.layers.hazards[3][3], 1, 'edited hazard survives export/reimport');
assert.equal(missionEditorDocumentDigest(reimported).startsWith('fnv1a32:'), true);
console.log('smoke_mission_editor_export_roundtrip: PASS', JSON.stringify({ levelId: exportedLevel.levelId, status: report.status }));
