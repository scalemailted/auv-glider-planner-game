import {
  ROI_DEMO_DISPLAY_MODES,
  ROI_DEMO_MESSAGE_TYPES,
  ROI_DEMO_NODE_STATES,
  ROI_DEMO_ROI_MEANING_LAYERS,
  normalizeRoiDemoDisplayMode,
  normalizeRoiDemoViewFilters,
  roiDemoDisplayModeNeedsViewFilters,
  roiDisplayModeCaption,
  roiDisplayModeLabel
} from '../../src/core/demo/DemoRoiFields.js';

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

for (const mode of ['graphTopology', 'graphMessages', 'stateTransitions', 'roiMeaning']) {
  assert(ROI_DEMO_DISPLAY_MODES.includes(mode), `missing display mode ${mode}`);
  assert(normalizeRoiDemoDisplayMode(mode) === mode, `normalizer rejected ${mode}`);
  assert(roiDemoDisplayModeNeedsViewFilters(mode), `${mode} should expose view filters`);
  assert(roiDisplayModeLabel(mode) !== 'Sample Value', `${mode} label not registered`);
  assert(roiDisplayModeCaption(mode).length > 20, `${mode} caption too short`);
}

assert(normalizeRoiDemoDisplayMode('topology') === 'graphTopology', 'topology alias mismatch');
assert(normalizeRoiDemoDisplayMode('transitions') === 'stateTransitions', 'transitions alias mismatch');
assert(normalizeRoiDemoDisplayMode('meaning') === 'roiMeaning', 'meaning alias mismatch');

const filters = normalizeRoiDemoViewFilters({
  nodeStates: { inactive: true, active: false },
  messageTypes: { activation: false, drift: true },
  messageStrengthThreshold: 2,
  maxMessages: 999,
  sameCommunity: false,
  roiMeaningLayer: 'nearFuture'
});

assert(filters.nodeStates.inactive === true, 'inactive node filter should be settable');
assert(filters.nodeStates.active === false, 'active node filter should be settable');
assert(filters.messageTypes.activation === false, 'activation message type should be settable');
assert(filters.messageTypes.drift === true, 'drift message type should remain enabled');
assert(filters.messageStrengthThreshold === 1, 'threshold should clamp to 1');
assert(filters.maxMessages === 500, 'maxMessages should clamp to 500');
assert(filters.sameCommunity === false, 'sameCommunity should be settable');
assert(filters.roiMeaningLayer === 'nearFuture', 'ROI meaning layer should normalize');

for (const state of ['active', 'cooling', 'recovering', 'susceptible', 'consumed']) {
  assert(ROI_DEMO_NODE_STATES.includes(state), `missing node state filter ${state}`);
}

for (const type of ['activation', 'inhibition', 'recovery', 'drift']) {
  assert(ROI_DEMO_MESSAGE_TYPES.includes(type), `missing message type filter ${type}`);
}

for (const layer of ['current', 'nearFuture', 'depleted', 'transitionBoundary']) {
  assert(ROI_DEMO_ROI_MEANING_LAYERS.includes(layer), `missing ROI meaning layer ${layer}`);
}

if (failures.length) {
  console.error('ROI view-filter smoke failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ROI view-filter smoke passed (${ROI_DEMO_DISPLAY_MODES.length} display modes, ${ROI_DEMO_MESSAGE_TYPES.length} message filters)`);
