import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ANCHOR_PRODUCTION_ROUTES } from '../../src/app/production/AnchorProductionRoute.js';

const shell = readFileSync('src/app/production/AnchorProductionShell.js', 'utf8');
const views = readFileSync('src/app/production/views/RouteViewFactory.js', 'utf8');
assert.match(shell, /role', 'main'|role", "main"|role\", \"main\"/, 'shell must assign a main landmark');
assert.match(shell, /aria-live/, 'shell must create a live region');
assert.match(shell, /prefers-reduced-motion/, 'shell must honor reduced motion');
assert.match(views, /aria-label="[^\"]*Three\.js world"/, 'Three canvas host must have accessible label context');
for (const route of ANCHOR_PRODUCTION_ROUTES) assert.ok(route.defaultFocusSelector, `${route.id} needs focus selector`);
console.log('accessibility structure audit passed');
