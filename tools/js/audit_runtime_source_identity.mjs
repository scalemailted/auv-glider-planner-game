import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const currentState = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');
const scene = readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
assert.match(currentState, /branchOrBuildLabel/, 'current debug exposes branch/build label');
assert.match(currentState, /sourceHead/, 'current debug exposes source head');
assert.match(currentState, /sourceRootMode/, 'current debug exposes source root mode');
assert.match(currentState, /currentRuntimeVersion/, 'current debug exposes current runtime version');
assert.match(scene, /entryPoint: 'index\.html -> src\/game\/main\.js'/, 'Planning timeline debug exposes production entry point');
console.log('[audit_runtime_source_identity] PASS');
