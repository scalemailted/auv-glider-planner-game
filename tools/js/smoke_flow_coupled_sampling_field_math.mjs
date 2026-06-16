import assert from 'node:assert/strict';

import {
  createScalarField,
  estimateArrivalTimeField,
  estimateCrossCurrentRiskField,
  estimateCurrentAssistField,
  estimateDirectDistanceField,
  estimateEnergyCostField,
  estimateReachableMask,
  fieldStats,
  finiteFieldCheck
} from '../../src/core/demo/flowCoupledSampling/FlowCoupledSamplingFieldMath.js';

const glider = { id: 'glider-a', x: 0.5, y: 1.5, speed: 1, timeBudget: 4, energyBudget: 0.75 };
const alignedFlow = [
  [{ u: 1, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 0 }],
  [{ u: 1, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 0 }],
  [{ u: 1, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 0 }]
];
const opposingFlow = alignedFlow.map((row) => row.map(() => ({ u: -1, v: 0 })));
const crossFlow = alignedFlow.map((row) => row.map(() => ({ u: 0, v: 1 })));

const alignedAssist = estimateCurrentAssistField({ glider, flowField: alignedFlow, width: 3, height: 3 });
const opposingAssist = estimateCurrentAssistField({ glider, flowField: opposingFlow, width: 3, height: 3 });
const crossRisk = estimateCrossCurrentRiskField({ glider, flowField: crossFlow, width: 3, height: 3 });
assert.ok(alignedAssist[1][2] > 0, 'current assist is positive for aligned flow');
assert.ok(opposingAssist[1][2] < 0, 'current assist is negative for opposing flow');
assert.ok(crossRisk[1][2] > 0.7, 'cross-current risk is nonzero for perpendicular flow');

const distanceField = estimateDirectDistanceField(glider, 3, 3);
const arrival = estimateArrivalTimeField({ glider, flowField: alignedFlow, width: 3, height: 3 });
assert.equal(finiteFieldCheck(arrival).ok, true, 'arrival time field is finite');
assert.ok(fieldStats(arrival).max >= 0, 'arrival time stats are finite');

const energyAligned = estimateEnergyCostField({
  distanceField,
  currentAssistField: alignedAssist,
  crossCurrentRiskField: estimateCrossCurrentRiskField({ glider, flowField: alignedFlow, width: 3, height: 3 })
});
const energyOpposed = estimateEnergyCostField({
  distanceField,
  currentAssistField: opposingAssist,
  crossCurrentRiskField: crossRisk
});
assert.ok(energyAligned[1][2] < energyOpposed[1][2], 'energy cost increases with opposition/cross-current');
assert.ok(energyAligned[1][2] > energyAligned[1][0], 'energy cost increases with distance');

const accessibleMask = createScalarField(3, 3, 1);
accessibleMask[1][2] = 0;
const reachable = estimateReachableMask({
  arrivalTimeField: arrival,
  energyCostField: energyAligned,
  glider,
  timeBudget: 4,
  energyBudget: 0.75,
  accessibleMask
});
assert.equal(reachable[1][2], 0, 'inaccessible mask suppresses reachable cells');

const tightReachable = estimateReachableMask({
  arrivalTimeField: arrival,
  energyCostField: energyAligned,
  glider,
  timeBudget: 0.1,
  energyBudget: 0.75,
  accessibleMask: createScalarField(3, 3, 1)
});
assert.equal(tightReachable[1][2], 0, 'reachable mask respects time budget');

console.log('smoke_flow_coupled_sampling_field_math: ok');
