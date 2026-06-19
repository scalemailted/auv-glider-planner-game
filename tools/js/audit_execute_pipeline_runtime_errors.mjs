import fs from 'node:fs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const collector = fs.readFileSync('tests/e2e/helpers/BrowserErrorCollector.js', 'utf8');
const e2e = fs.readFileSync('tests/e2e/smoke.spec.js', 'utf8');
const simulation = fs.readFileSync('src/game/phaser/scenes/SimulationScene.js', 'utf8');
assert(collector.includes("page.on('pageerror'"), 'BrowserErrorCollector must fail page errors');
assert(collector.includes("requestfailed"), 'BrowserErrorCollector must track failed module requests');
assert(e2e.includes('attachBrowserErrorCollector'), 'E2E smoke must attach browser error collector');
assert(simulation.includes('launchInitializationError') || simulation.includes('Simulation launch payload failed'), 'SimulationScene must surface launch initialization failures');
assert(simulation.includes('rendererMounted'), 'Execution transaction must include rendererMounted stage');
assert(simulation.includes('engineInitialized'), 'Execution transaction must include engineInitialized stage');
console.log('audit_execute_pipeline_runtime_errors passed');