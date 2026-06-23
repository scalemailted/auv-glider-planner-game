import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routeViewFactory = readFileSync('src/app/production/views/RouteViewFactory.js', 'utf8');
const workspace = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const simulation = readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');

assert.match(routeViewFactory, /augmentMissionWorldWithVolumetricModel/, 'next shell augments flat view models with volumetric current state');
assert.match(routeViewFactory, /volumetricCurrentDebugPayload/, 'next shell publishes volumetric current debug');
assert.match(routeViewFactory, /buildCurrentPresentationDebug/, 'next shell uses shared current presentation debug builder');
assert.match(routeViewFactory, /runtimeShell:\s*'next'/, 'next shell debug identifies its runtime shell');
assert.match(workspace, /runtimeShell:\s*'default'/, 'default planning shell debug identifies its runtime shell');
assert.match(simulation, /runtimeShell:\s*'default'/, 'default simulation shell debug identifies its runtime shell');

console.log('audit_current_runtime_shell_parity: ok');
