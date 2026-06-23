import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const state = readFileSync('src/core/rendering/CurrentPresentationState.js', 'utf8');
const volumetric = readFileSync('src/core/rendering/VolumetricMissionWorldViewModel.js', 'utf8');

assert.match(state, /get\('currentDisplay'\)\s*===\s*'safe'/, 'safe current display is only activated by explicit query value');
assert.match(state, /currentVectorsVisible/, 'shared current visibility helper exists');
assert.match(volumetric, /isExplicitCurrentSafeMode/, 'volumetric debug uses shared explicit safe-mode detection');
assert.equal(/localStorage|sessionStorage/.test(state), false, 'safe current display is not persisted through browser storage');
assert.equal(/currentDisplay[^\n]+safe[^\n]+\?\?/.test(state), false, 'safe mode is not a default fallback');

console.log('audit_current_safe_mode_persistence: ok');

