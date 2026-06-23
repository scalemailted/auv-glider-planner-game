import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overlay = readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
assert.match(overlay, /if \(this\.boundRoots\.has\(root\)\) return;/, 'overlay binds each root once');
assert.match(overlay, /duplicateOverlayControlDispatchCount \+= 1/, 'overlay counts duplicate dispatch attempts');
assert.match(overlay, /lastTimelineActionKey = 'time-slider'/, 'slider records one visible timeline dispatch');
assert.match(overlay, /lastTimelineActionKey = actionKey/, 'button controls record visible timeline dispatch');
console.log('[smoke_planning_timeline_single_dispatch] PASS');
