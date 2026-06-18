import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  'src/core/scoring/MissionScoringSchema.js',
  'src/core/scoring/MissionScoreComponents.js',
  'src/core/scoring/MissionScoreProfiles.js',
  'src/core/scoring/MissionOutcomeMetricAdapter.js',
  'src/core/scoring/MissionScoreNormalizer.js',
  'src/core/scoring/MissionScoreAggregator.js',
  'src/core/scoring/MissionRegretModel.js',
  'src/core/scoring/MissionOutcomeReport.js',
  'src/core/scoring/MissionScorePublicSafety.js',
  'src/core/scoring/MissionScorecardViewModel.js'
];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  assert.equal(/from ['"].*(phaser|three|ui|scenes)/i.test(text), false, `${file} stays renderer/UI independent`);
  assert.equal(/A\*|Dijkstra|RRT|MPC|route optimizer|MARL implementation|Python simulator/i.test(text), false, `${file} avoids planner/runtime drift claims`);
}
const report = fs.readFileSync('docs/examples/headless_mission_outcome_report.example.json', 'utf8');
const bundle = fs.readFileSync('docs/examples/headless_mission_score_bundle.example.json', 'utf8');
for (const text of [report, bundle]) {
  assert.equal(/"changesOfficialBrowserScoring"\s*:\s*true/.test(text), false, 'no official score replacement');
  assert.equal(/"usesRouteOptimizer"\s*:\s*true/.test(text), false, 'no route optimizer');
  assert.equal(/"usesMARL"\s*:\s*true/.test(text), false, 'no MARL');
  assert.equal(/T_hiddenTruth|"hiddenFields"\s*:|raw hidden truth/i.test(text), false, 'no hidden arrays');
}
const regret = JSON.parse(fs.readFileSync('docs/examples/headless_regret_report.example.json', 'utf8'));
assert.ok((regret.notA ?? []).includes('not proof of optimality'), 'regret preserves not optimal proof boundary');
assert.equal(fs.existsSync(path.join('tools', 'python', 'oceanbox')), false, 'no Python simulator package added');
console.log('Mission scoring boundary audit passed');