import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rightPanel = readFileSync('src/ui/RightWaypointPanel.js', 'utf8');
for (const forbidden of ['.waypoints[', 'waypoint.segmentProfile', 'plan.waypoints', 'updateWaypoint(']) {
  assert.equal(rightPanel.includes(forbidden), false, `right panel contains direct mutation pattern ${forbidden}`);
}
console.log('audit_no_direct_plan_mutation_from_right_panel: ok');
