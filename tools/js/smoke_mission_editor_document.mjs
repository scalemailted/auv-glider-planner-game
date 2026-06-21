import assert from 'node:assert/strict';
import { createMissionEditorFixture } from './mission_editor_fixture.mjs';
import { missionEditorDocumentForExport, missionEditorDocumentSummary, missionEditorDocumentDigest } from '../../src/core/editor/MissionEditorDocument.js';
import { validateMissionEditorDocument } from '../../src/core/editor/MissionEditorValidation.js';

const { document } = createMissionEditorFixture();
const summary = missionEditorDocumentSummary(document);
assert.equal(summary.rendererOwnsState, false);
assert.equal(summary.calibratedOceanForecast, false);
assert.ok(summary.gridWidth >= 8 && summary.gridHeight >= 8, 'editor document has normalized grid dimensions');
const validation = validateMissionEditorDocument(document);
assert.equal(validation.valid, true, validation.issues.map((issue) => issue.message).join('\n'));
const exported = missionEditorDocumentForExport(document, { exportedAt: '2026-06-21T00:00:00.000Z' });
assert.equal(exported.type, 'anchor.level');
assert.equal(exported.meta.threeMissionEditor.rendererOwnsState, false);
assert.equal(exported.meta.threeMissionEditor.calibratedOceanForecast, false);
assert.ok(missionEditorDocumentDigest(document).startsWith('fnv1a32:'));
console.log('smoke_mission_editor_document: PASS', JSON.stringify({ levelId: summary.levelId, digest: summary.digest }));
