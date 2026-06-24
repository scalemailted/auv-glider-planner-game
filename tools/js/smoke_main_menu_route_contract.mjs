import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mainMenu = await readFile('src/game/phaser/scenes/MainMenuScene.js', 'utf8');
const readiness = await readFile('src/app/production/AnchorAppBootReadiness.js', 'utf8');
const helper = await readFile('tests/e2e/helpers/AnchorRuntimeReadyHarness.js', 'utf8');

assert.ok(mainMenu.includes("markAnchorRouteReady('main-menu'"), 'MainMenuScene marks the main-menu route ready');
assert.ok(mainMenu.includes('root.onclick ='), 'MainMenuScene binds hub input before route readiness');
assert.ok(mainMenu.indexOf('root.onclick =') < mainMenu.indexOf("markAnchorRouteReady('main-menu'"), 'input handlers are attached before route ready');
assert.ok(readiness.includes('data-anchor-app-ready'), 'readiness contract emits DOM app-ready attribute');
assert.ok(readiness.includes('data-anchor-route'), 'readiness contract emits DOM route attribute');
assert.ok(readiness.includes('anchor:app-ready'), 'readiness contract dispatches app-ready event');
assert.ok(helper.includes('waitForAnchorRoute'), 'Playwright helper waits for route readiness');
assert.ok(helper.includes('[data-anchor-app-ready="true"][data-anchor-route="${expectedRoute}"]'), 'helper verifies DOM route marker');
console.log('PASS smoke_main_menu_route_contract');