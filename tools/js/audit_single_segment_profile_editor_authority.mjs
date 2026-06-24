import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rightPanel = readFileSync('src/ui/RightWaypointPanel.js', 'utf8');
assert.equal(rightPanel.includes('updateWaypoint('), false, 'right panel must not call updateWaypoint directly');
assert.equal(rightPanel.includes('buildRightWaypointSegmentEditorViewModel'), true);
assert.equal(rightPanel.includes('data-segment-apply'), true);
console.log('audit_single_segment_profile_editor_authority: ok');
