import assert from 'node:assert/strict';
import {
  COUPLED_PROCESS_ENGINE_IDS,
  coupledProcessEngineById,
  createCoupledProcessInitialState,
  stepCoupledProcessEngine
} from '../../src/core/demo/coupled/CoupledProcessEngineContract.js';
import { runCoupledEngineValidationFixture } from '../../src/core/demo/coupled/CoupledProcessValidation.js';
import { centroidOfMass, createGrid, fieldStats, gradientMagnitude } from '../../src/core/demo/coupled/CoupledFieldMath.js';

const engineIds = Object.values(COUPLED_PROCESS_ENGINE_IDS);

for (const engineId of engineIds) {
  const metadata = coupledProcessEngineById(engineId);
  assert.ok(metadata.equation, `${engineId} has equation metadata`);
  assert.ok(metadata.inWords, `${engineId} has plain-language metadata`);
  assert.ok(metadata.notA, `${engineId} has scientific boundary metadata`);

  const state = createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: `smoke:${engineId}` });
  const result = stepCoupledProcessEngine({ engineId, state, dt: 0.5, flowSampler: () => ({ u: 0, v: 0 }) });
  assert.equal(result.validation.status, 'PASS', `${engineId} returns a valid scalar field`);
  assert.ok(result.scalarField.flat().every((value) => Number.isFinite(value) && value >= 0 && value <= 1), `${engineId} field is finite and bounded`);

  const repeatA = stepCoupledProcessEngine({
    engineId,
    state: createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: `smoke-repeat:${engineId}` }),
    dt: 0.5,
    flowSampler: () => ({ u: 0, v: 0 })
  });
  const repeatB = stepCoupledProcessEngine({
    engineId,
    state: createCoupledProcessInitialState({ engineId, width: 18, height: 12, seed: `smoke-repeat:${engineId}` }),
    dt: 0.5,
    flowSampler: () => ({ u: 0, v: 0 })
  });
  assert.deepEqual(repeatA.scalarField, repeatB.scalarField, `${engineId} is deterministic by seed`);

  const fixture = runCoupledEngineValidationFixture(engineId);
  assert.equal(fixture.status, 'PASS', `${engineId} validation fixture passes`);
}

const advectiveInitial = createCoupledProcessInitialState({ engineId: 'advectionDiffusionDecay', width: 18, height: 12, seed: 'smoke-advection' });
const zeroBefore = centroidOfMass(advectiveInitial.scalarField);
const zeroResult = stepCoupledProcessEngine({
  engineId: 'advectionDiffusionDecay',
  state: advectiveInitial,
  dt: 0.75,
  flowSampler: () => ({ u: 0, v: 0 }),
  parameters: { diffusion: 0, decay: 0, sourceStrength: 0, flowScale: 0.2 }
});
const zeroAfter = centroidOfMass(zeroResult.scalarField);
assert.ok(Math.hypot(zeroAfter.x - zeroBefore.x, zeroAfter.y - zeroBefore.y) < 0.02, 'zero-flow advection preserves centroid');

const eastInitial = createCoupledProcessInitialState({ engineId: 'advectionDiffusionDecay', width: 18, height: 12, seed: 'smoke-east' });
const eastBefore = centroidOfMass(eastInitial.scalarField);
const eastResult = stepCoupledProcessEngine({
  engineId: 'advectionDiffusionDecay',
  state: eastInitial,
  dt: 0.75,
  flowSampler: () => ({ u: 0.16, v: 0 }),
  parameters: { diffusion: 0, decay: 0, sourceStrength: 0, flowScale: 0.22 }
});
assert.ok(centroidOfMass(eastResult.scalarField).x > eastBefore.x, 'uniform east flow moves centroid east');

const spike = createGrid(18, 12, (col, row) => (col === 9 && row === 6 ? 1 : 0));
const gradBefore = fieldStats(gradientMagnitude(spike)).mean;
const diffusionState = createCoupledProcessInitialState({
  engineId: 'sourceDiffusionDecay',
  width: 18,
  height: 12,
  scalarField: spike,
  parameters: { diffusion: 0.25, decay: 0, sourceStrength: 0 }
});
const diffusionResult = stepCoupledProcessEngine({ engineId: 'sourceDiffusionDecay', state: diffusionState, dt: 0.6 });
assert.ok(fieldStats(gradientMagnitude(diffusionResult.scalarField)).mean < gradBefore, 'diffusion reduces gradient');

const massField = createGrid(18, 12, 0.4);
const decayState = createCoupledProcessInitialState({
  engineId: 'sourceDiffusionDecay',
  width: 18,
  height: 12,
  scalarField: massField,
  parameters: { diffusion: 0, decay: 0.25, sourceStrength: 0 }
});
assert.ok(fieldStats(stepCoupledProcessEngine({ engineId: 'sourceDiffusionDecay', state: decayState, dt: 1 }).scalarField).total < fieldStats(massField).total, 'decay reduces mass');

const sourceState = createCoupledProcessInitialState({
  engineId: 'sourceDiffusionDecay',
  width: 18,
  height: 12,
  scalarField: createGrid(18, 12, 0),
  parameters: { diffusion: 0, decay: 0, sourceStrength: 0.3 }
});
assert.ok(fieldStats(stepCoupledProcessEngine({ engineId: 'sourceDiffusionDecay', state: sourceState, dt: 1 }).scalarField).total > 0, 'source increases mass');

console.log('Coupled process engines smoke passed');
