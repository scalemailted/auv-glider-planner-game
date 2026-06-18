import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditMissionScorePublicSafety, sanitizeMissionOutcomeReportForPublicExport } from '../../src/core/scoring/MissionScorePublicSafety.js';

const report = JSON.parse(fs.readFileSync('docs/examples/headless_mission_outcome_report.example.json', 'utf8'));
assert.equal(auditMissionScorePublicSafety(report).valid, true, 'public report passes');
const unsafe = { ...report, hiddenFields: [[1, 2]], T_hiddenTruth: [[3]], changesOfficialBrowserScoring: true };
const audited = auditMissionScorePublicSafety(unsafe);
assert.equal(audited.valid, false, 'hidden arrays rejected');
const sanitized = sanitizeMissionOutcomeReportForPublicExport(unsafe);
assert.equal('hiddenFields' in sanitized, false, 'hidden fields removed');
assert.equal('T_hiddenTruth' in sanitized, false, 'raw oracle tensor removed');
assert.equal(sanitized.changesOfficialBrowserScoring, false, 'official scoring reset false');
const labelled = { type: 'anchor.benchmark.mission-outcome-report', publicSafe: true, refereeOnlyDerived: true, dataSource: 'refereeOnlyDerived' };
assert.equal(auditMissionScorePublicSafety(labelled).valid, true, 'referee scalar label allowed');
console.log('Mission score public safety smoke passed');