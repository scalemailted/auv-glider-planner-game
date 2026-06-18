import assert from 'node:assert/strict';

import { createHeadlessGrid } from '../../src/core/headless/runtime/HeadlessGrid.js';
import { createHeadlessFieldPack } from '../../src/core/headless/runtime/HeadlessFields.js';
import { simulateGliderMotionTrajectory } from '../../src/core/motion/GliderTrajectorySimulator.js';
import {
  buildMissionFeasibilityReport,
  missionFeasibilityReportSummary,
  validateMissionFeasibilityReport
} from '../../src/core/motion/MissionFeasibilityReport.js';

const grid = createHeadlessGrid({ width: 12, height: 8, depthLayers: ['surface', 'thermocline', 'deep'] });
const fieldPack = createHeadlessFieldPack({ grid, seed: 'mission-feasibility-report-smoke' });
const plan = {
  missionId: 'mission-feasibility-smoke-mission',
  planId: 'mission-feasibility-smoke-plan',
  gliderId: 'glider_01',
  waypoints: [
    { x: 1, y: 1, depthLayerId: 'surface' },
    { x: 6, y: 2, depthLayerId: 'thermocline' },
    { x: 10, y: 6, depthLayerId: 'deep' }
  ],
  desiredSpeedThroughWater: 1,
  sampleIntervalSeconds: 60,
  surfaceAtEnd: true
};
const motionTrajectory = simulateGliderMotionTrajectory({
  fieldPack,
  glider: { id: 'glider_01', start: { x: 1, y: 1 }, energyBudget: 50 },
  plan,
  motionConfig: { motionModelId: 'depthLayerKinematic', controlStepSeconds: 30, driftGain: 1, energyBudget: 50 },
  options: { maxSteps: 80, durationSeconds: 1800, seed: 'mission-feasibility-report-smoke' }
});
const report = buildMissionFeasibilityReport({
  motionTrajectory,
  plan,
  motionConfig: { motionModelId: 'depthLayerKinematic', energyBudget: 50 },
  environmentSummary: motionTrajectory.motionDiagnostics?.environmentSummary ?? null,
  scienceSummary: { observationCount: motionTrajectory.sampledObservations.length },
  options: { missionId: plan.missionId, gliderId: plan.gliderId, surfaceAtEnd: true }
});
const validation = validateMissionFeasibilityReport(report);
const summary = missionFeasibilityReportSummary(report);

assert.equal(report.type, 'anchor.benchmark.mission-feasibility-report', 'report type');
assert.equal(validation.status, 'PASS', `report validates: ${validation.errors.join('; ')}`);
assert.equal(Number.isFinite(report.missionDurationSeconds), true, 'mission duration finite');
assert.equal(Number.isFinite(report.plannedDistance), true, 'planned distance finite');
assert.equal(Number.isFinite(report.realizedDistance), true, 'realized distance finite');
assert.equal(Number.isFinite(report.energyUsed), true, 'energy used finite');
assert.ok(report.notA.includes('not operational certification'), 'notA includes no operational certification');
assert.ok(report.notA.includes('not SeaExplorer-specific validated simulator'), 'notA includes no SeaExplorer-specific validation');
assert.ok(report.notA.includes('not route planner'), 'notA includes no route planner');
assert.ok(report.notA.includes('not MARL/RL'), 'notA includes no MARL/RL');
assert.equal(report.usesNewPlanner, false, 'report does not claim a new planner');
assert.equal(report.usesWebGPUFluid, false, 'report does not claim WebGPU');
assert.equal(report.usesSeaExplorerValidatedModel, false, 'report does not claim SeaExplorer validation');
assert.equal(report.usesOperationalCertification, false, 'report does not claim operational certification');
assert.equal(report.browserOfficialScoring, false, 'report does not replace browser scoring');
assert.equal(summary.present, true, 'summary present');
assert.equal(summary.usesMARL, false, 'summary does not claim MARL/RL');

console.log('Mission feasibility report smoke passed', {
  status: report.feasibilityStatus,
  duration: report.missionDurationSeconds,
  energyUsed: report.energyUsed
});
