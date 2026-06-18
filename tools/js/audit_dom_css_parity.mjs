import assert from 'node:assert/strict';
import { readText } from './dom_parity_audit_lib.mjs';

const css = ['css/layout.css', 'css/game.css', 'css/panels.css'].map(readText).join('\n');
const required = ['anchor-route-root', 'anchor-layout-product-hub', 'mission-console-host', 'mission-right-panel-host', 'mission-timeline-strip', 'mission-performance-strip'];
for (const token of required) assert.ok(css.includes(token), `CSS missing ${token}`);
const broadNewRules = css.match(/\n(?:section|button|canvas|h1|aside)\s*\{/g) ?? [];
assert.equal(broadNewRules.length, 0, `Unscoped broad CSS rules found: ${broadNewRules.join(', ')}`);
console.log('audit_dom_css_parity: ok', { required: required.length });
