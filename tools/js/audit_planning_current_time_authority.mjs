import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const overlay = readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
const bridge = readFileSync('src/core/time/PlanningTimelineTimeBridge.js', 'utf8');
const currentState = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');
const volumetric = readFileSync('src/core/rendering/VolumetricMissionWorldViewModel.js', 'utf8');

assert.match(overlay, /data-action="time-slider"/, 'visible timeline slider exists');
for (const action of ['time-start', 'window-prev', 'window-next', 'time-end']) {
  assert.match(overlay, new RegExp(`data-action="${action}"`), `visible ${action} control exists`);
}
assert.match(overlay, /lastTimelineActionKey/, 'overlay records visible timeline dispatch');
assert.match(scene, /handlers\.time = \(time\) => this\.setPlanningTime\(time\)/, 'visible slider handler reaches setPlanningTime');
assert.match(scene, /handlers\.frame = \(frameIndex\) => this\.setTimelineFrame\(frameIndex\)/, 'visible frame buttons reach setTimelineFrame');
assert.match(scene, /markMissionCurrentPresentationDirty\(\['scalarField', 'waterColumn', 'routeStatus'\]\)/, 'timeline handlers dirty current presentation');
assert.match(scene, /ANCHOR_PLANNING_TIMELINE_DEBUG/, 'Planning timeline debug object is published');
assert.match(scene, /ANCHOR_PLANNING_CURRENT_TRANSACTION_DEBUG/, 'Planning current transaction debug object is published');
assert.match(bridge, /missionTimelineUnitMultiplier/, 'time bridge owns Planning unit conversion');
assert.match(volumetric, /planningTimelineBridgeSummary/, 'volumetric view model consumes bridge before current sampling');
assert.match(currentState, /currentPresentationTimeAuthority/, 'current presentation debug exposes time authority');
assert.doesNotMatch(volumetric, /Date\.now\(\)|performance\.now\(\)/, 'current sampling bridge does not use wall-clock time');
console.log('[audit_planning_current_time_authority] PASS');
