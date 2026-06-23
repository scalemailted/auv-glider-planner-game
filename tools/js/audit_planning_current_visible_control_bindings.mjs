import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overlay = readFileSync('src/ui/HtmlMissionWorkspaceOverlay.js', 'utf8');
const controls = ['time-slider', 'time-start', 'window-prev', 'window-next', 'time-end'];
for (const control of controls) assert.match(overlay, new RegExp(`data-action="${control}"`), `missing visible control ${control}`);
assert.match(overlay, /slider\?\.addEventListener\('input'/, 'timeline input has a real input listener');
assert.match(overlay, /root\.addEventListener\('click'/, 'timeline buttons use real click dispatch');
assert.match(overlay, /overlayControlBindCount \+= 1/, 'bind count is recorded');
assert.match(overlay, /overlayControlDispatchCount \+= 1/, 'dispatch count is recorded');
console.log('[audit_planning_current_visible_control_bindings] PASS');
