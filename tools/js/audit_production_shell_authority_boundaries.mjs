import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const scanned = [...walk('src/app/production')].filter((file) => !file.endsWith('LegacyLearningLabHost.js'));
const combined = scanned.map((file) => `${file}\n${readFileSync(file, 'utf8')}`).join('\n');
assert.doesNotMatch(combined, /new\s+SimulationEngine/, 'next shell must not duplicate SimulationEngine');
assert.doesNotMatch(combined, /temporalGreedySolver|BaselineSolvers|usesNewPlanner:\s*true/, 'next shell must not add a planner');
assert.doesNotMatch(combined, /ReplayPlaybackReducer|replayPlaybackReducer\(/, 'next shell must not duplicate replay reducer');
assert.doesNotMatch(combined, /finalScore\s*=|scoreMission|calculateScore/, 'next shell must not create a new scoring implementation');
assert.match(combined, /usesCanonicalPlanning:\s*true/, 'debug must state canonical Planning reuse');
assert.match(combined, /usesCanonicalSimulation:\s*true/, 'debug must state canonical Simulation reuse');
assert.match(combined, /usesCanonicalReplayReducer:\s*true/, 'debug must state canonical Replay reducer reuse');
assert.match(combined, /usesCanonicalEditorSession:\s*true/, 'debug must state canonical editor reuse');
console.log('production shell authority boundary audit passed');
function* walk(dir) { for (const name of readdirSync(dir)) { const full = path.join(dir, name); if (statSync(full).isDirectory()) yield* walk(full); else if (full.endsWith('.js')) yield full; } }
