import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
assert.match(scene, /handlers\.time = \(time\) => this\.setPlanningTime\(time\)/, 'visible slider handler delegates to setPlanningTime');
assert.match(scene, /handlers\.frame = \(frameIndex\) => this\.setTimelineFrame\(frameIndex\)/, 'visible frame controls delegate to setTimelineFrame');
assert.match(scene, /setPlanningTime\(time\)[\s\S]*markMissionCurrentPresentationDirty/, 'setPlanningTime dirties current presentation');
assert.match(scene, /setTimelineFrame\(frameIndex\)[\s\S]*markMissionCurrentPresentationDirty/, 'setTimelineFrame dirties current presentation');
assert.match(scene, /refreshMap\.three/, 'refreshMap records renderer refresh transaction stage');
console.log('[audit_planning_timeline_handler_parity] PASS');
