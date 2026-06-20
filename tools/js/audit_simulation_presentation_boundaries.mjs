import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scheduler = await readFile('src/game/three/ThreeSimulationPresentationScheduler.js', 'utf8');
const scene = await readFile('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const pkg = JSON.parse((await readFile('package.json', 'utf8')).replace(/^\\uFEFF/, ''));
assert.doesNotMatch(scheduler, /from ['\"][^'\"]*(SimulationEngine|Scoring|WaypointPlan|Planner)[^'\"]*['\"]/, 'scheduler imports no canonical engine/planner/scoring modules');
assert.match(scheduler, /ownsSimulationState: false/, 'scheduler declares no simulation ownership');
assert.match(scene, /this\.engine\.step\(/, 'SimulationScene still owns canonical engine stepping');
assert.match(scene, /updateThreeMissionWorldRenderer\(renderer, viewModel\)/, 'renderer consumes snapshots/view models only');
const dependencies = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
assert.equal(Object.keys(dependencies).some((name) => /webgpu|fluid|planner/i.test(name)), false, 'no new WebGPU/fluid/planner dependency is introduced');
assert.doesNotMatch(scene, /qualityProfile[\s\S]*this\.engine\.step/, 'quality profile does not gate canonical stepping');
assert.doesNotMatch(scene, /hiddenTruth|T_hiddenTruth/, 'simulation presentation code does not expose hidden truth');
console.log('PASS audit_simulation_presentation_boundaries');
