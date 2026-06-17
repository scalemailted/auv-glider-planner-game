import assert from 'node:assert/strict';

import { computeMotionFeasibilityDiagnostics, motionDiagnosticsSummary } from '../../src/core/motion/MotionDiagnostics.js';

const trace = {
  plannedWaypoints: [{ x: 0, y: 0 }, { x: 3, y: 0 }],
  realizedTrack: [
    { x: 0.5, y: 0.1, trackError: 0.1, energyUsedIncrement: 0.2, currentAssist: 0.1, crossCurrent: 0.02, hazard: 0, constraint: 0 },
    { x: 2.8, y: 0.2, trackError: 0.2, energyUsedIncrement: 0.3, currentAssist: 0.2, crossCurrent: 0.03, hazard: 0.4, constraint: 0 }
  ],
  sampledObservations: [{}, {}],
  plannedVsRealized: { arrivalStatus: 'arrived' }
};
const diagnostics = computeMotionFeasibilityDiagnostics(trace);
assert.equal(Number.isFinite(diagnostics.trackErrorMean), true, 'track error mean finite');
assert.equal(Number.isFinite(diagnostics.energyUsed), true, 'energy used finite');
assert.equal(diagnostics.arrivalStatus, 'arrived', 'arrival status preserved');
const summary = motionDiagnosticsSummary(diagnostics);
assert.equal(summary.sampleCoverageCount, 2, 'sample coverage summarized');
assert.equal(summary.usesWebGPUFluid, false, 'diagnostic summary does not claim WebGPU');
assert.equal(summary.officialBrowserScoring, false, 'diagnostic summary does not claim official browser scoring');

console.log('Motion diagnostics smoke passed', { energyUsed: summary.energyUsed });
