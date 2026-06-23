import assert from 'node:assert/strict';
import { buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';

const planning = buildNormalGeneratedCurrentViewModel({ seed: 'flow-r2a4-scene-transition', phase: 'planning' });
planning.state.mode = 'simulation';
planning.state.simTime = 30;
const simulation = buildNormalGeneratedCurrentViewModel({ fixture: planning, phase: 'simulation' });

assert.equal(planning.presentationDebug.phase, 'planning');
assert.equal(simulation.presentationDebug.phase, 'simulation');
assert.equal(planning.presentationDebug.currentPresentationEnabled, true, 'planning current presentation enabled');
assert.equal(simulation.presentationDebug.currentPresentationEnabled, true, 'simulation current presentation enabled');
assert.equal(planning.presentationDebug.sourceVectorSampleCount > 0, true, 'planning has current samples');
assert.equal(simulation.presentationDebug.sourceVectorSampleCount > 0, true, 'simulation has current samples');
assert.equal(planning.presentationDebug.safeModeExplicit, false);
assert.equal(simulation.presentationDebug.safeModeExplicit, false);
assert.equal(planning.presentationDebug.cacheSignature.includes('activeSlice'), true, 'planning signature includes display mode');
assert.equal(simulation.presentationDebug.cacheSignature.includes('activeSlice'), true, 'simulation signature includes display mode');

console.log('smoke_current_scene_transition_persistence: ok');
