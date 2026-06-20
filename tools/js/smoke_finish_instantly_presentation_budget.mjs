import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const scene = await readFile('src/game/phaser/scenes/SimulationScene.js', 'utf8');
const finishStart = scene.indexOf('async runUntilCompleteAsync');
const finishEnd = scene.indexOf('recordDebriefRequested', finishStart);
const finish = scene.slice(finishStart, finishEnd);
assert.match(finish, /publishLatestSimulationSnapshot\('finishChunk'\)/, 'finish publishes latest canonical chunks');
assert.match(finish, /consumeScheduledPresentationFrame\(\{ force: true, reason: 'finishProgress'/, 'finish consumes coalesced presentation frames');
assert.match(finish, /finishEngineMilliseconds/, 'finish tracks engine cost separately');
assert.match(scene, /finishPresentationMilliseconds/, 'finish tracks presentation cost separately');
assert.doesNotMatch(finish, /this\.refresh\(\);\s*await yieldToBrowser/, 'finish no longer refreshes every chunk directly');
console.log('PASS smoke_finish_instantly_presentation_budget');
