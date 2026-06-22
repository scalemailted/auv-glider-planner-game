import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'test-results', 'three-r3a-owner-review');
const required = ['qa-summary.json', '01-next-shell-product-hub.png', '02-next-shell-setup.png', '03-next-shell-briefing.png', '04-next-shell-planning.png', '05-next-shell-simulation.png', '06-next-shell-debrief.png', '07-next-shell-replay.png', '08-next-shell-editor.png', '09-next-shell-editor-preview.png', '10-next-shell-headless-viewer.png', '11-next-shell-legacy-lab.png', '12-next-shell-main-menu-cleanup.png', '13-next-shell-compact-layout.png', '14-next-shell-keyboard-focus.png', '15-next-shell-reduced-motion.png'];
for (const name of required) assert.ok(existsSync(path.join(root, name)), `missing R3A owner artifact: ${name}`);
const summary = JSON.parse(readFileSync(path.join(root, 'qa-summary.json'), 'utf8'));
assert.equal(summary.status, 'PASS', 'R3A owner QA summary status must pass');
assert.equal(summary.runtimeSelection?.resolvedRuntime, 'next', 'R3A owner QA must use next shell');
assert.ok(summary.performanceSummary?.average <= 50, 'average frame interval must meet R3A gate');
assert.ok(summary.performanceSummary?.p95 <= 100, 'p95 frame interval must meet R3A gate');
assert.ok(summary.performanceSummary?.fps >= 20, 'rendered FPS must meet R3A gate');
console.log('R3A owner review artifacts audit passed');
