import assert from 'node:assert/strict';
import { createNormalGeneratedCurrentScenario, buildNormalGeneratedCurrentViewModel } from './flow_r2a4_production_helpers.mjs';
import { buildCurrentPresentationDebug } from '../../src/core/rendering/CurrentPresentationState.js';

const fixture = createNormalGeneratedCurrentScenario({ seed: 'flow-runtime-r1-1-transaction-smoke', waypointCount: 3, agentCount: 3 });
fixture.state.mode = 'planning';
fixture.state.ui.showCurrents = true;
fixture.state.ui.waterColumn.currentDisplayMode = 'stackedDepthField';
fixture.state.planningTime = 8;
const { viewModel } = buildNormalGeneratedCurrentViewModel({ fixture });
const currentDebug = { ...viewModel.currentVisualization, ...viewModel.waterColumnExplorer?.selectedCurrentProfile?.samplesByDepth?.[0], sourceVectorSampleCount: viewModel.currentVectorSampleCount ?? 1, finiteVectorSampleCount: viewModel.currentVectorValidCount ?? 1, visibleVectorInstanceCount: 1, glyphInstanceCount: 1 };
const debug = buildCurrentPresentationDebug({ phase: 'planning', viewModel, currentDebug, rendererSummary: { currentDirectionBufferUploadCount: 1, currentMatrixBufferUploadCount: 1, glyphInstanceCount: 1, currentDataDigest: 'smoke' }, ui: fixture.state.ui, layerVisibility: { currentVectors: true } });
assert.equal(debug.currentPresentationTimeSeconds, 28800, 'transaction current time follows visible Planning time in seconds');
assert.equal(debug.timelineBindingPass, true, 'timeline binding passes');
assert.equal(debug.samplerTimePass, true, 'sampler binding passes');
assert.equal(debug.directDebugTimeMutationUsed, false, 'debug reports no direct time mutation');
console.log('[smoke_planning_timeline_current_transaction] PASS', { currentPresentationTimeSeconds: debug.currentPresentationTimeSeconds, sourceTimeFrameSignature: debug.sourceTimeFrameSignature });
