import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync('src/ui/RightWaypointPanel.js', 'utf8');
assert.equal((panel.match(/data-segment-apply/g) ?? []).length >= 2, true, 'segment apply controls should render and bind');
assert.equal(panel.includes('addEventListener'), true, 'right panel should bind events through listeners');
assert.equal(panel.includes('onclick='), false, 'right panel must not use inline onclick handlers');
assert.equal(panel.includes('data-agent-tab'), true, 'glider tab buttons need a dedicated selector');
assert.equal(panel.includes("querySelectorAll('[data-agent-tab]')"), true, 'agent tab binding must target only glider tab buttons');
assert.equal(panel.includes("querySelectorAll('[data-agent]')"), false, 'agent tab binding must not attach to every command control with data-agent');
for (const hook of ['data-segment-draft-field', 'data-segment-apply', 'data-segment-cancel', 'data-segment-reset', 'data-segment-apply-remaining', 'data-segment-set-default']) {
  assert.equal(panel.includes(hook), true, `${hook} binding is missing`);
}
console.log('audit_right_panel_event_binding: ok');
