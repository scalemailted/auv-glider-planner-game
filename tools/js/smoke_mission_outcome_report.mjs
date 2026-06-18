import assert from 'node:assert/strict';
import fs from 'node:fs';
import { missionOutcomeReportSummary, validateMissionOutcomeReport } from '../../src/core/scoring/MissionOutcomeReport.js';

const report = JSON.parse(fs.readFileSync('docs/examples/headless_mission_outcome_report.example.json', 'utf8'));
const summary = missionOutcomeReportSummary(report);
assert.equal(validateMissionOutcomeReport(report).valid, true, 'report validates');
assert.equal(summary.present, true, 'report present');
assert.ok(Number.isFinite(summary.compositeScore), 'composite present');
assert.ok(Number.isFinite(summary.scienceScore), 'science present');
assert.ok(Number.isFinite(summary.feasibilityScore), 'feasibility present');
assert.ok(Number.isFinite(summary.efficiencyScore), 'efficiency present');
assert.ok(Number.isFinite(summary.safetyScore), 'safety present');
assert.ok(Number.isFinite(summary.coverageFraction), 'coverage present');
assert.ok(report.explanations?.strongestOutcome, 'explanations present');
assert.equal(report.changesOfficialBrowserScoring, false, 'official scoring unchanged');
assert.equal(JSON.stringify(report).includes('T_hiddenTruth'), false, 'no hidden truth payload');
console.log('Mission outcome report smoke passed');