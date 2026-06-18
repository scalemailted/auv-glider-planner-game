import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildMissionScorecardViewModel } from '../../src/core/scoring/MissionScorecardViewModel.js';
import { missionScorecardPanelHtml } from '../../src/ui/scoring/MissionScorecardPanel.js';

const report = JSON.parse(fs.readFileSync('docs/examples/headless_mission_outcome_report.example.json', 'utf8'));
const vm = buildMissionScorecardViewModel({ missionOutcomeReport: { ...report, regretSummary: null, explanations: { ...report.explanations, strongestOutcome: '<unsafe>' } } });
const html = missionScorecardPanelHtml(vm);
for (const text of ['Mission Outcome Scorecard', 'Science', 'Feasibility', 'Efficiency', 'Safety', 'Data Coverage', 'This is the SCORE-R1 shadow benchmark score']) assert.ok(html.includes(text), text);
assert.ok(html.includes('No compatible regret reference was available.'), 'missing regret copy');
assert.ok(html.includes('&lt;unsafe&gt;'), 'unsafe strings escaped');
console.log('Mission scorecard panel smoke passed');