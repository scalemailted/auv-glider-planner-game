import { createSamplingProcessPaintModel } from '../../src/core/demo/sampling/SamplingProcessPaintModel.js';
import { frameFromLayers, runSamplingProcessFrames, stepSamplingProcess } from '../../src/core/demo/sampling/SamplingProcessEvolution.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const field = (width, height, value) => Array.from({ length: height }, () => Array.from({ length: width }, () => value));
const params = (width, height) => Array.from({ length: height }, () => Array.from({ length: width }, () => ({})));

function baseLayers(width = 5, height = 3, state = 'susceptible', rule = null, group = 1, source = 0.5) {
  return {
    width,
    height,
    stateLayer: field(width, height, state),
    ruleLayer: field(width, height, rule),
    groupLayer: field(width, height, group),
    sourceField: field(width, height, source),
    parameterLayer: params(width, height)
  };
}

{
  const layers = baseLayers();
  layers.stateLayer[1][1] = 'active';
  const first = stepSamplingProcess({ ...layers, groupDefinitions: { 1: { id: 1, ruleId: 'propagatingFront' } }, seed: 'inheritance-smoke', time: 0 });
  const second = stepSamplingProcess({ ...layers, groupDefinitions: { 1: { id: 1, ruleId: 'propagatingFront' } }, seed: 'inheritance-smoke', time: 0 });
  assert(JSON.stringify(first.stateLayer) === JSON.stringify(second.stateLayer), 'step should be deterministic');
  assert(first.stateLayer[1][1] === 'cooling', 'active front cell should cool');
  assert(first.stateLayer[1][2] === 'active', 'group-inherited front should activate susceptible neighbor');
  assert(first.ruleLayer[1][2] === null, 'cell rule layer should preserve inherited slot');
  assert(first.resolvedRuleLayer[1][2] === 'propagatingFront', 'resolved rule layer should show inherited group rule');
  assert(first.diagnostics.ruleInheritanceCounts.inheritedGroupRule > 0, 'diagnostics should count inherited group rules');
  assert(first.processMessages.length > 0, 'front should emit process messages');
  assert(first.transitionLayer[1][2].ruleId === 'propagatingFront', 'transition should include canonical rule id');
}

{
  const layers = baseLayers();
  layers.stateLayer[1][1] = 'active';
  layers.ruleLayer[1][2] = 'inert';
  const result = stepSamplingProcess({ ...layers, groupDefinitions: { 1: { id: 1, ruleId: 'propagatingFront' } }, seed: 'explicit-inert-smoke' });
  assert(result.stateLayer[1][2] === 'susceptible', 'explicit inert should override inherited group rule');
  assert(result.resolvedRuleLayer[1][2] === 'inert', 'explicit inert should resolve to inert');
  assert(result.diagnostics.ruleInheritanceCounts.explicitInert === 1, 'explicit inert should be counted');
}

{
  const layers = baseLayers(3, 2);
  layers.ruleLayer[0][0] = 'unknownRule';
  const result = stepSamplingProcess({ ...layers, groupDefinitions: { 1: { id: 1, ruleId: 'propagatingFront' } }, seed: 'unknown-rule-smoke' });
  assert(result.resolvedRuleLayer[0][0] === 'inert', 'unknown rule should safely fall back to inert');
  assert((result.diagnostics.warnings ?? []).some((warning) => warning.includes('Unknown rule unknownRule')), 'unknown rule should report a warning');
}

{
  const layers = baseLayers(4, 2, 'inactive', 'directedTransport', 1, 0.2);
  layers.stateLayer[0][0] = 'active';
  const result = stepSamplingProcess({ ...layers, seed: 'transport-east-smoke' });
  assert(result.stateLayer[0][0] === 'trailing', 'directed transport source should become trailing');
  assert(result.stateLayer[0][1] === 'active', 'directed transport target should remain active after scan loop');
  assert(result.diagnostics.proposedWriteCount === 1, 'transport should propose one write');
  assert(result.diagnostics.resolvedWriteCount === 1, 'transport write should resolve');
}

{
  const layers = baseLayers(4, 1, 'inactive', 'directedTransport', 1, 0.2);
  layers.stateLayer[0][0] = 'active';
  layers.stateLayer[0][2] = 'active';
  layers.parameterLayer[0][2] = { direction: 'west' };
  const result = stepSamplingProcess({ ...layers, seed: 'transport-collision-smoke' });
  assert(result.stateLayer[0][1] === 'active', 'transport collision target should receive deterministic winning write');
  assert(result.diagnostics.conflictCount === 1, 'transport collision should count one conflict');
}

{
  const moving = baseLayers(3, 1, 'empty', 'congestionWave', 1, 0.2);
  moving.stateLayer[0][0] = 'moving';
  const moved = stepSamplingProcess({ ...moving, seed: 'congestion-move-smoke' });
  assert(moved.stateLayer[0][0] === 'empty', 'open congestion source should become empty');
  assert(moved.stateLayer[0][1] === 'moving', 'open congestion target should become moving');
  const blockedLayers = baseLayers(3, 1, 'empty', 'congestionWave', 1, 0.2);
  blockedLayers.stateLayer[0][0] = 'moving';
  blockedLayers.stateLayer[0][1] = 'moving';
  const blocked = stepSamplingProcess({ ...blockedLayers, seed: 'congestion-blocked-smoke' });
  assert(blocked.stateLayer[0][0] === 'congested', 'blocked moving cell should become congested');
}

{
  const model = createSamplingProcessPaintModel({
    width: 5,
    height: 3,
    assignments: {
      cells: {
        '1,1': { state: 'active', ruleId: 'frontPropagation', groupId: 1, sourceValue: 1 },
        '2,1': { state: 'susceptible', ruleId: 'inherit', groupId: 1, sourceValue: 0.25 }
      },
      groups: {
        1: { id: 1, ruleId: 'frontPropagation' }
      }
    }
  });
  const frames = runSamplingProcessFrames({ initialPaintModel: model, frameCount: 3, duration: 2, seed: 'frame-smoke' });
  assert(frames.length === 3, 'frame count mismatch');
  assert(frames[0].stateLayer[1][1] === 'active', 'frame 0 should be initial painted state');
  assert(frames[0].diagnostics.frameSemantics === 'initial-frame-then-steps-v1', 'frame semantics diagnostic missing');
  assert(frames[0].diagnostics.transitionCount === 0, 'frame 0 should not count evolution transitions');
  assert(frames[1].stateLayer[1][1] === 'cooling', 'frame 1 should be first update');
  assert(JSON.stringify(frames[0].stateLayer) !== JSON.stringify(frames[1].stateLayer), 'frame 0 and frame 1 should not duplicate evolved state');
}

{
  const blocked = baseLayers();
  blocked.stateLayer[1][1] = 'active';
  const highThreshold = stepSamplingProcess({ ...blocked, groupDefinitions: { 1: { id: 1, ruleId: 'propagatingFront', parameters: { threshold: 0.9 } } } });
  const lowThreshold = stepSamplingProcess({ ...blocked, groupDefinitions: { 1: { id: 1, ruleId: 'propagatingFront', parameters: { threshold: 0.3 } } } });
  assert(highThreshold.stateLayer[1][2] === 'susceptible', 'high front threshold should block spread');
  assert(lowThreshold.stateLayer[1][2] === 'active', 'low front threshold should allow spread');

  const north = baseLayers(3, 3, 'inactive', 'directedTransport', 1, 0.2);
  north.stateLayer[1][1] = 'active';
  north.parameterLayer[1][1] = { direction: 'north' };
  const northResult = stepSamplingProcess({ ...north });
  assert(northResult.stateLayer[0][1] === 'active', 'directedTransport direction parameter should change movement');

  const birth = baseLayers(3, 3, 'inactive', 'localBirthDeath', 1, 0.2);
  birth.stateLayer[0][0] = 'active';
  birth.stateLayer[0][1] = 'active';
  birth.parameterLayer[1][1] = { birthNeighbors: 2 };
  const birthResult = stepSamplingProcess({ ...birth });
  assert(birthResult.stateLayer[1][1] === 'active', 'localBirthDeath birthNeighbors parameter should change update');
}

{
  const frontFrame = frameFromLayers({
    ...baseLayers(3, 1, 'susceptible', 'propagatingFront', 1, 0.4),
    stateLayer: [['active', 'susceptible', 'consumed']]
  });
  assert(frontFrame.roiRoleLayer[0][0] === 'currentROI', 'front active should be current ROI');
  assert(frontFrame.roiRoleLayer[0][1] === 'nearFutureROI', 'front susceptible next to active should be near-future ROI');
  assert(frontFrame.roiRoleLayer[0][2] === 'depleted', 'front consumed should be depleted');

  const waveFrame = frameFromLayers({
    ...baseLayers(3, 1, 'resting', 'excitableWave', 1, 0.4),
    stateLayer: [['active', 'susceptible', 'refractory']]
  });
  assert(waveFrame.roiRoleLayer[0][0] === 'currentROI', 'wave active should be current ROI');
  assert(waveFrame.roiRoleLayer[0][1] === 'nearFutureROI', 'wave susceptible next to active should be near-future ROI');
  assert(waveFrame.roiRoleLayer[0][2] === 'recovery', 'wave refractory should be recovery');

  const rulesToCheck = [
    ['localBirthDeath', 'active', 'currentROI'],
    ['diffusiveSpread', 'active', 'currentROI'],
    ['directedTransport', 'active', 'currentROI'],
    ['thresholdCascade', 'active', 'currentROI'],
    ['freshnessRecovery', 'stale', 'currentROI'],
    ['structuredSignal', 'signal', 'currentROI']
  ];
  for (const [ruleId, state, expectedRole] of rulesToCheck) {
    const frame = frameFromLayers({ ...baseLayers(1, 1, state, ruleId, 1, 0.8) });
    assert(frame.roiRoleLayer[0][0] === expectedRole, `${ruleId} ${state} should map to ${expectedRole}`);
    const value = frame.samplingValueField[0][0];
    assert(value >= 0 && value <= 1, `${ruleId} sampling value should be normalized`);
  }
}

if (failures.length) {
  console.error('Sampling process evolution smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Sampling process evolution smoke passed');
