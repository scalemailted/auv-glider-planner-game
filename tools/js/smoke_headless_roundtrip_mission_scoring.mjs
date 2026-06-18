import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildHeadlessSolverPacketRoundtrip } from '../../src/core/headless/HeadlessRoundtrip.js';

const packet = JSON.parse(fs.readFileSync('docs/examples/headless_solver_packet.example.json', 'utf8'));
const plan = JSON.parse(fs.readFileSync('docs/examples/headless_solver_plan.example.json', 'utf8'));
const oldRoundtrip = buildHeadlessSolverPacketRoundtrip(packet, plan, { seed: 'score-r1-roundtrip-old', allowInvalidPlan: true });
assert.ok(oldRoundtrip.report.summary, 'old roundtrip works');
const scored = buildHeadlessSolverPacketRoundtrip(packet, plan, { seed: 'score-r1-roundtrip-new', allowInvalidPlan: true, motionAware: true, missionScore: true, scoreProfile: 'balancedMission', regretReference: 'none' });
assert.equal(scored.report.runtime.usesMissionOutcomeScoring, true, 'uses mission outcome scoring');
assert.equal(scored.report.runtime.changesOfficialBrowserScoring, false, 'official scoring unchanged');
assert.equal(scored.report.runtime.usesNewPlanner, false, 'no new planner');
assert.equal(scored.report.runtime.usesMARL, false, 'no MARL');
assert.ok(scored.report.missionOutcomeSummary, 'summary fields present');
assert.ok(scored.report.summary.scoreProfileId, 'score profile id present');
console.log('Headless roundtrip mission scoring smoke passed');