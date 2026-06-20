import assert from 'node:assert/strict';
import fs from 'node:fs';

const monitor = fs.readFileSync('src/game/three/ThreeMissionPerformanceMonitor.js', 'utf8');
const renderer = fs.readFileSync('src/game/three/ThreeMissionWorldRenderer.js', 'utf8');
const missionScene = fs.readFileSync('src/game/phaser/scenes/MissionWorkspaceScene.js', 'utf8');
const simulationScene = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const index = fs.readFileSync('index.html', 'utf8');

assert.doesNotMatch(monitor, /SimulationEngine|summarizeScore|finalScore\s*[=:]|\bscore\s*[=:]|hiddenTruth|T_hiddenTruth|document\.|window\./, 'performance monitor owns no simulation, scoring, hidden-truth, or DOM logic');
assert.match(monitor, /frameMilliseconds: new Array\(windowSize\)/, 'performance monitor uses bounded frame storage');
assert.match(renderer, /createThreeMissionPerformanceMonitor/, 'Three renderer owns a monitor instance');
assert.match(renderer, /renderer\.renderer\?\.info/, 'Three renderer samples renderer.info');
assert.match(missionScene, /ANCHOR_THREE_PERFORMANCE_DEBUG/, 'planning scene publishes authoritative performance debug');
assert.match(simulationScene, /ANCHOR_THREE_PERFORMANCE_DEBUG/, 'simulation scene publishes authoritative performance debug');
assert.doesNotMatch(monitor + renderer + missionScene, /new\s+SimulationEngine\(|summarizeScore|finalScore\s*=|navigator\.gpu|WebGPURenderer|new\s+Worker\(/, 'performance instrumentation does not add simulation/scoring/WebGPU/worker behavior');
assert.equal(packageJson.scripts['test:e2e'], 'node tools/js/run_playwright_groups.mjs', 'test:e2e uses the authoritative grouped runner');
assert.equal(packageJson.scripts['test:e2e:monolithic'].startsWith('node ./node_modules/@playwright/test/cli.js test'), true, 'test:e2e:monolithic uses package-local Playwright CLI');
assert.equal(index.includes('src/game/main.js'), true, 'active runtime remains src/game/main.js');
assert.equal(index.includes('src/app/main.js'), false, 'reverted DOM runtime is not active');
console.log(JSON.stringify({ ok: true }));
