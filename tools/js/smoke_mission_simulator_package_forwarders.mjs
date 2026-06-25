import assert from 'node:assert/strict';
import * as pkg from '../../packages/mission-simulator/src/index.js';
import * as continuous from '../../src/core/sim/ContinuousGliderState.js';
import * as rules from '../../src/core/sim/MissionRules.js';
import * as endConditions from '../../src/core/sim/EndConditions.js';
import * as dive from '../../src/core/sim/GliderDiveStateMachine.js';
import * as effective from '../../src/core/motion/EffectiveDiveProfileResolver.js';

assert.equal(continuous.normalizeContinuousGliderState, pkg.normalizeContinuousGliderState);
assert.equal(rules.normalizeSamplingRules, pkg.normalizeSamplingRules);
assert.equal(endConditions.evaluateEndCondition, pkg.evaluateEndCondition);
assert.equal(dive.advanceGliderDiveStateMachine, pkg.advanceGliderDiveStateMachine);
assert.equal(effective.resolveEffectiveDiveProfile, pkg.resolveEffectiveDiveProfile);
const outcome = dive.advanceGliderDiveStateMachine({ agentId: 'g1' }, { dt: 1, segmentProgress: 0.5, waterColumnConfig: { depthLayerIds: ['surface', 'thermocline', 'deep'] }, diveProfileId: 'sawtoothProfile', targetDepthLayerId: 'deep', localBathymetryMeters: 200 });
assert.equal(outcome.model.modelType, 'educationalGliderDiveKinematics');
assert.equal(outcome.model.operationallyCalibrated, false);
console.log('smoke_mission_simulator_package_forwarders: ok', { depth: outcome.state.position.depthMeters });