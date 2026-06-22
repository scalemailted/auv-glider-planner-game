import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveAnchorProductionRuntime } from '../../src/app/production/AnchorRuntimeSelector.js';

const current = resolveAnchorProductionRuntime({ search: '' }, null);
assert.equal(current.resolvedRuntime, 'phaser', 'default resolves to Phaser shell');
const next = resolveAnchorProductionRuntime({ search: '?runtimeShell=next' }, null);
assert.equal(next.resolvedRuntime, 'next', 'query gate resolves to next shell');
const invalid = resolveAnchorProductionRuntime({ search: '?runtimeShell=bogus' }, null);
assert.equal(invalid.resolvedRuntime, 'phaser', 'invalid runtime falls back to default');
assert.ok(invalid.fallbackReason, 'invalid runtime reports fallback reason');
const main = readFileSync('src/game/main.js', 'utf8');
assert.match(main, /AnchorProductionBootstrap\.js/, 'main dynamically references next bootstrap');
assert.match(main, /PhaserProductionBootstrap\.js/, 'main dynamically references default bootstrap');
const nextBootstrap = readFileSync('src/app/production/AnchorProductionBootstrap.js', 'utf8');
assert.doesNotMatch(nextBootstrap, /PhaserProductionBootstrap|vendor\/phaser|new\s+Phaser\.Game/, 'next bootstrap must not statically load Phaser');
console.log('runtime selector smoke passed');
